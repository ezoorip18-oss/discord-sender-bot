
"""
bot_worker.py  —  Discord bot worker for one DM rotation.

Receives:
  --token        Bot token
  --campaign-id  Campaign ID in DB
  --bot-run-id   BotRun ID in DB
  --guild-id     Target guild (numeric ID)
  --quota        Max DMs to send before stopping
  --delay        Seconds between DMs (float)

Flow:
  1. Connect to Discord
  2. Verify it's in the guild (retry up to 30s)
  3. Claim pending members from DB (atomic UPDATE … FOR UPDATE SKIP LOCKED)
  4. Send DMs, update DB per-member
  5. Leave guild
  6. Exit
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
    """Atomically claim up to `quota` pending members; returns list of (id, user_id, username)."""
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
        cur.execute(
            "UPDATE campaign_members SET status = %s WHERE id = %s",
            (status, member_id)
        )
        conn.commit()


def finish_run(conn, bot_run_id: int, sent: int, failed: int, skipped: int):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE bot_runs
            SET status = 'completed', sent = %s, failed = %s, skipped = %s,
                completed_at = %s
            WHERE id = %s
        """, (sent, failed, skipped, datetime.datetime.utcnow().isoformat(), bot_run_id))
        conn.commit()


def start_run(conn, bot_run_id: int):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE bot_runs SET status = 'running', started_at = %s WHERE id = %s
        """, (datetime.datetime.utcnow().isoformat(), bot_run_id))
        conn.commit()


# ── Discord bot ────────────────────────────────────────────────────────────

class WorkerBot(discord.Client):
    def __init__(self, campaign_id, bot_run_id, guild_id, quota, delay):
        intents = discord.Intents.default()
        intents.members = True
        intents.guilds = True
        super().__init__(intents=intents)
        self.campaign_id = campaign_id
        self.bot_run_id  = bot_run_id
        self.guild_id    = guild_id
        self.quota       = quota
        self.delay       = delay

    async def on_ready(self):
        log(f"[Worker] Logged in as {self.user} (ID: {self.user.id})")
        await self.run_campaign()

    async def get_guild_with_retry(self):
        for attempt in range(6):  # up to 30 seconds
            guild = self.get_guild(self.guild_id)
            if guild:
                return guild
            log(f"[Worker] Not in guild yet, retrying ({attempt+1}/6)...")
            await asyncio.sleep(5)
        return None

    async def run_campaign(self):
        guild = await self.get_guild_with_retry()
        if not guild:
            log(f"[Worker] ERROR: Bot is not in guild {self.guild_id}. Was it invited?")
            await self.close()
            return

        log(f"[Worker] In guild: {guild.name} ({guild.id})")

        conn = get_db()
        try:
            start_run(conn, self.bot_run_id)
            members = claim_members(conn, self.campaign_id, self.bot_run_id, self.quota)
            log(f"[Worker] Claimed {len(members)} members to process.")

            sent = failed = skipped = 0

            for (member_id, user_id, username) in members:
                # Fetch the Discord user
                try:
                    user = await self.fetch_user(int(user_id))
                except Exception as e:
                    log(f"[Worker] Could not fetch user {user_id}: {e}")
                    mark_member(conn, member_id, "failed")
                    failed += 1
                    emit_progress(sent, failed, skipped)
                    continue

                # Skip bots
                if user.bot:
                    mark_member(conn, member_id, "skipped")
                    skipped += 1
                    emit_progress(sent, failed, skipped)
                    continue

                # Send DM
                try:
                    await user.send(self._dm_message)
                    mark_member(conn, member_id, "sent")
                    sent += 1
                    log(f"[Worker] DM sent to {user} [{sent}s/{failed}e/{skipped}sk]")
                    emit_progress(sent, failed, skipped)
                    await asyncio.sleep(self.delay)
                except discord.Forbidden:
                    mark_member(conn, member_id, "failed")
                    failed += 1
                    log(f"[Worker] Cannot DM {user} (blocked/DMs off)")
                    emit_progress(sent, failed, skipped)
                except discord.HTTPException as e:
                    mark_member(conn, member_id, "failed")
                    failed += 1
                    log(f"[Worker] HTTP error for {user}: {e}")
                    emit_progress(sent, failed, skipped)
                    if e.status == 429:
                        wait = getattr(e, "retry_after", 30)
                        log(f"[Worker] Rate limited — waiting {wait}s")
                        await asyncio.sleep(wait)
                except Exception as e:
                    mark_member(conn, member_id, "failed")
                    failed += 1
                    log(f"[Worker] Error DMing {user}: {e}")
                    emit_progress(sent, failed, skipped)

            finish_run(conn, self.bot_run_id, sent, failed, skipped)
            log(f"[Worker] Run complete: {sent} sent / {failed} failed / {skipped} skipped")

        finally:
            conn.close()

        # Leave the guild
        try:
            await guild.leave()
            log(f"[Worker] Left guild {guild.name}")
        except Exception as e:
            log(f"[Worker] Could not leave guild: {e}")

        await self.close()

    # The DM message is injected by the manager via env var to avoid shell-escaping issues
    @property
    def _dm_message(self):
        return os.environ.get("DM_MESSAGE", "")


try:
    bot = WorkerBot(
        campaign_id=args.campaign_id,
        bot_run_id=args.bot_run_id,
        guild_id=args.guild_id,
        quota=args.quota,
        delay=args.delay,
    )
    bot.run(args.token)
except Exception as e:
    log(f"Fatal error: {e}")
    sys.exit(1)
