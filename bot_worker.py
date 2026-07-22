"""
bot_worker.py  —  Discord bot worker for one DM rotation (with Nopecha hCaptcha support).
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

# ── Nopecha Captcha Solver ─────────────────────────────────────────────────
try:
    import nopecha
except ImportError:
    nopecha = None
    print("[WARN] nopecha not installed. Captcha solving disabled. Run: pip install nopecha", flush=True)


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


# ── DB helpers (unchanged) ─────────────────────────────────────────────────
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


# ── Parse DM Payload (unchanged) ───────────────────────────────────────────
def parse_dm_payload(raw: str):
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw, None, None

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
            emb.set_author(name=author["name"], url=author.get("url") or discord.utils.MISSING, icon_url=author.get("icon_url") or discord.utils.MISSING)

        footer = e.get("footer") or {}
        if footer.get("text"):
            emb.set_footer(text=footer["text"], icon_url=footer.get("icon_url") or discord.utils.MISSING)

        if e.get("image"):     emb.set_image(url=e["image"])
        if e.get("thumbnail"): emb.set_thumbnail(url=e["thumbnail"])

        for field in (e.get("fields") or []):
            emb.add_field(name=field.get("name", "\u200b"), value=field.get("value", "\u200b"), inline=field.get("inline", False))

        embed = emb

    buttons = payload.get("buttons") or []
    if buttons:
        view = discord.ui.View()
        for btn in buttons[:5]:
            if btn.get("label") and btn.get("url"):
                view.add_item(discord.ui.Button(label=btn["label"][:80], url=btn["url"], style=discord.ButtonStyle.link))

    return content, embed, view


# ── Nopecha hCaptcha Solver ────────────────────────────────────────────────
def solve_captcha_with_nopecha(rqdata: str = None, proxy: str = None) -> str | None:
    if not nopecha:
        log("[Captcha] nopecha library not available")
        return None

    try:
        nopecha.api_key = os.environ.get("NOPECHA_API_KEY")
        if not nopecha.api_key:
            log("[Captcha] NOPECHA_API_KEY not set")
            return None

        log("[Captcha] Solving Discord hCaptcha via Nopecha...")

        solution = nopecha.Token.solve(
            type="hcaptcha",
            sitekey="a9b5fb07-92ff-493f-86fe-352a2803b3df",  # Discord's common sitekey
            url="https://discord.com",
            data={"rqdata": rqdata} if rqdata else None,
            proxy=proxy
        )

        token = solution.get("data") if isinstance(solution, dict) else solution
        if token:
            log(f"[Captcha] ✓ Solved! Token: {token[:50]}...")
            return token
        return None
    except Exception as e:
        log(f"[Captcha] Nopecha failed: {e}")
        return None


# ── Main Bot Class ─────────────────────────────────────────────────────────
class WorkerBot(discord.Client):
    # ... (rest of the class is the same as before, with improved captcha handling in run_campaign)

    async def run_campaign(self):
        # ... (guild setup, member claiming, etc. same as before)

        for (member_id, user_id, username) in members:
            # ... fetch user, etc.

            try:
                # send DM code
                await user.send(...)
                # success
            except discord.HTTPException as exc:
                if "captcha" in str(exc).lower() or exc.status in (429, 403):
                    log("[Captcha] hCaptcha detected - solving with Nopecha")
                    rqdata = getattr(exc, 'rqdata', None) or getattr(exc, 'captcha_rqdata', None)
                    token = solve_captcha_with_nopecha(rqdata=rqdata, proxy=os.environ.get("NOPECHA_PROXY"))

                    if token:
                        await asyncio.sleep(5)
                        try:
                            await user.send(...)  # retry
                            # mark as sent
                        except:
                            pass

# Run the bot
try:
    bot = WorkerBot(...)
    bot.run(args.token)
except Exception as exc:
    log(f"Fatal error: {exc}")
    sys.exit(1)
