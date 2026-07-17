"""
bot_worker.py  —  Discord bot worker for one DM rotation.

CLI args:
  --token        Bot token
  --campaign-id  Campaign ID in DB
  --bot-run-id   BotRun ID in DB
  --guild-id     Target guild (numeric ID)
  --quota        Max DMs to send before stopping
  --delay        Seconds between DMs (float)
  --skip-leave   If set, bot does not leave the guild after finishing

Env vars:
  DATABASE_URL   PostgreSQL connection string
  DM_MESSAGE     JSON payload string (content / embed / buttons)
"""

import argparse
import asyncio
import os
import sys
import json
import datetime

import discord
import psycopg2
import psycopg2.extras

# ── CLI args ───────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--token",       required=True)
parser.add_argument("--campaign-id", required=True, type=int)
parser.add_argument("--bot-run-id",  required=True, type=int)
parser.add_argument("--guild-id",    required=True, type=int)
parser.add_argument("--quota",       required=True, type=int)
parser.add_argument("--delay",       required=True, type=float)
parser.add_argument("--skip-leave",  action="store_true", default=False)
args = parser.parse_args()


def log(msg):
    print(msg, flush=True)


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def emit_progress(sent, failed, skipped):
    payload = {"sent": sent, "failed": failed, "skipped": skipped}
    print(f"[PROGRESS] {json.dumps(payload)}", flush=True)


# ── DB helpers ─────────────────────────────────────────────────────────────

def claim_members(conn, campaign_id: int, bot_run_id: int, quota: int):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE campaign_members
            SET status = 'in_progress', bot_run_id = %s
            WHERE id IN (
                SELECT id FROM campaign_members
                WHERE campaign_id = %s AND status = 'pending'
                ORDER BY id
                LIMIT %s
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, user_id, username
        """, (bot_run_id, campaign_id, quota))
        rows = cur.fetchall()
        conn.commit()
    return rows


def mark_member(conn, member_id: int, status: str):
    with conn.cursor() as cur:
        cur.execute("UPDATE campaign_members SET status = %s WHERE id = %s", (status, member_id))
        conn.commit()


def finish_run(conn, bot_run_id: int, sent: int, failed: int, skipped: int):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE bot_runs SET status = 'completed', sent = %s, failed = %s, skipped = %s,
                completed_at = %s WHERE id = %s
        """, (sent, failed, skipped, datetime.datetime.utcnow().isoformat(), bot_run_id))
        conn.commit()


def start_run(conn, bot_run_id: int):
    with conn.cursor() as cur:
        cur.execute("UPDATE bot_runs SET status = 'running', started_at = %s WHERE id = %s",
                    (datetime.datetime.utcnow().isoformat(), bot_run_id))
        conn.commit()


# ── Build discord.py embed + view from JSON payload ────────────────────────

def parse_dm_payload(raw: str):
    """Returns (content, embed, view) from DM_MESSAGE env var."""
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw, None, None  # plain text fallback

    if isinstance(payload, str):
        return payload, None, None

    content = payload.get("content") or None
    embed   = None
    view    = None

    if "embed" in payload:
        e = payload["embed"]

        color_raw = e.get("color", 0x5865F2)
        color_int = color_raw if isinstance(color_raw, int) else int(str(color_raw).replace("#", ""), 16)

        emb = discord.Embed(color=color_int)
        if e.get("title"):       emb.title       = e["title"]
        if e.get("url"):         emb.url         = e["url"]
        if e.get("description"): emb.description = e["description"]
        if e.get("timestamp"):   emb.timestamp   = datetime.datetime.utcnow()

        author = e.get("author") or {}
        if author.get("name"):
            emb.set_author(
                name=author["name"],
                url=author.get("url") or discord.utils.MISSING,
                icon_url=author.get("icon_url") or discord.utils.MISSING,
            )

        footer = e.get("footer") or {}
        if footer.get("text"):
            emb.set_footer(
                text=footer["text"],
                icon_url=footer.get("icon_url") or discord.utils.MISSING,
            )

        if e.get("image"):     emb.set_image(url=e["image"])
        if e.get("thumbnail"): emb.set_thumbnail(url=e["thumbnail"])

        for field in (e.get("fields") or []):
            emb.add_field(
                name=field.get("name", "\u200b"),
                value=field.get("value", "\u200b"),
                inline=field.get("inline", False),
            )

        embed = emb

    buttons = payload.get("buttons") or []
    if buttons:
        view = discord.ui.View()
        for btn in buttons[:5]:
            if btn.get("label") and btn.get("url"):
                view.add_item(discord.ui.Button(
                    label=btn["label"][:80],
                    url=btn["url"],
                    style=discord.ButtonStyle.link,
                ))

    return content, embed, view


# ── Discord bot ────────────────────────────────────────────────────────────

class WorkerBot(discord.Client):
    def __init__(self, campaign_id, bot_run_id, guild_id, quota, delay, skip_leave=False):
        intents = discord.Intents.default()
        intents.members = True
        intents.guilds  = True
        super().__init__(intents=intents)
        self.campaign_id = campaign_id
        self.bot_run_id  = bot_run_id
        self.guild_id    = guild_id
        self.quota       = quota
        self.delay       = delay
        self.skip_leave  = skip_leave

    async def on_ready(self):
        log(f"[Worker] Logged in as {self.user} (ID: {self.user.id})")
        await self.run_campaign()

    async def get_guild_with_retry(self):
        for attempt in range(6):
            guild = self.get_guild(self.guild_id)
            if guild:
                return guild
            log(f"[Worker] Not in guild yet, retrying ({attempt+1}/6)…")
            await asyncio.sleep(5)
        return None

    async def fetch_and_store_members(self, conn, guild):
        """Fetch all human members via gateway and store in DB (only if not already done)."""
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM campaign_members WHERE campaign_id = %s", (self.campaign_id,))
            existing = cur.fetchone()[0]

        if existing > 0:
            log(f"[Worker] Members already in DB ({existing}), skipping fetch.")
            return existing

        log(f"[Worker] Fetching all members from {guild.name}… (requires Server Members Intent)")
        rows = []
        try:
            async for member in guild.fetch_members(limit=None):
                if not member.bot:
                    rows.append((self.campaign_id, str(member.id), member.name or str(member.id), "pending"))
        except discord.Forbidden:
            log("[Worker] ERROR: Missing Server Members Intent — enable it in the Developer Portal.")
            return 0
        except Exception as exc:
            log(f"[Worker] ERROR fetching members: {exc}")
            return 0

        if not rows:
            log("[Worker] No human members found.")
            return 0

        with conn.cursor() as cur:
            psycopg2.extras.execute_values(cur, """
                INSERT INTO campaign_members (campaign_id, user_id, username, status)
                VALUES %s ON CONFLICT DO NOTHING
            """, rows)
            conn.commit()

        with conn.cursor() as cur:
            cur.execute("UPDATE campaigns SET total_members = %s WHERE id = %s", (len(rows), self.campaign_id))
            conn.commit()

        log(f"[Worker] Stored {len(rows)} members in DB.")
        return len(rows)

    async def run_campaign(self):
        guild = await self.get_guild_with_retry()
        if not guild:
            log(f"[Worker] ERROR: Bot is not in guild {self.guild_id}.")
            await self.close()
            return

        log(f"[Worker] In guild: {guild.name} ({guild.id})")

        conn = get_db()
        try:
            start_run(conn, self.bot_run_id)

            member_count = await self.fetch_and_store_members(conn, guild)
            if member_count == 0:
                log("[Worker] No members to DM. Exiting.")
                finish_run(conn, self.bot_run_id, 0, 0, 0)
                await self.close()
                return

            members = claim_members(conn, self.campaign_id, self.bot_run_id, self.quota)
            log(f"[Worker] Claimed {len(members)} members.")

            sent = failed = skipped = 0
            dm_raw = os.environ.get("DM_MESSAGE", "")

            for (member_id, user_id, username) in members:
                try:
                    user = await self.fetch_user(int(user_id))
                except Exception as exc:
                    log(f"[Worker] Could not fetch user {user_id}: {exc}")
                    mark_member(conn, member_id, "failed")
                    failed += 1
                    emit_progress(sent, failed, skipped)
                    continue

                if user.bot:
                    mark_member(conn, member_id, "skipped")
                    skipped += 1
                    emit_progress(sent, failed, skipped)
                    continue

                try:
                    personalised = dm_raw.replace("{mention}", f"<@{user_id}>") \
                                        .replace("{username}", str(user))
                    content, embed, view = parse_dm_payload(personalised)

                    await user.send(content=content, embed=embed, view=view)
                    mark_member(conn, member_id, "sent")
                    sent += 1
                    log(f"[Worker] ✓ DM → {user}  [{sent}s/{failed}e/{skipped}sk]")
                    emit_progress(sent, failed, skipped)
                    await asyncio.sleep(self.delay)

                except discord.Forbidden:
                    mark_member(conn, member_id, "failed")
                    failed += 1
                    log(f"[Worker] ✗ Cannot DM {user} (DMs off/blocked)")
                    emit_progress(sent, failed, skipped)

                except discord.HTTPException as exc:
                    mark_member(conn, member_id, "failed")
                    failed += 1
                    log(f"[Worker] HTTP error for {user}: {exc}")
                    emit_progress(sent, failed, skipped)
                    if exc.status == 429:
                        wait = getattr(exc, "retry_after", 30)
                        log(f"[Worker] Rate limited — waiting {wait}s")
                        await asyncio.sleep(wait)

                except Exception as exc:
                    mark_member(conn, member_id, "failed")
                    failed += 1
                    log(f"[Worker] Error DMing {user}: {exc}")
                    emit_progress(sent, failed, skipped)

            finish_run(conn, self.bot_run_id, sent, failed, skipped)
            log(f"[Worker] Run complete: {sent} sent / {failed} failed / {skipped} skipped")

        finally:
            conn.close()

        if self.skip_leave:
            log(f"[Worker] Skip-leave mode — staying in guild {guild.name}")
        else:
            try:
                await guild.leave()
                log(f"[Worker] Left guild {guild.name}")
            except Exception as exc:
                log(f"[Worker] Could not leave guild: {exc}")

        await self.close()


try:
    bot = WorkerBot(
        campaign_id=args.campaign_id,
        bot_run_id=args.bot_run_id,
        guild_id=args.guild_id,
        quota=args.quota,
        delay=args.delay,
        skip_leave=args.skip_leave,
    )
    bot.run(args.token)
except Exception as exc:
    log(f"Fatal error: {exc}")
    sys.exit(1)
