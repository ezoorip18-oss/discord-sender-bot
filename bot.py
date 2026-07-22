import argparse
import discord
import asyncio
import sys
import json
import os

parser = argparse.ArgumentParser(description='Discord Bot - Mass DM')
parser.add_argument('--token', required=True, help='Bot Token')
parser.add_argument('--server', required=True, help='Guild ID or invite code')
parser.add_argument('--dm-message', required=True, help='DM message content')
parser.add_argument('--delay', type=float, default=3.0, help='Delay between DMs in seconds')
args = parser.parse_args()


# ── Nopecha Captcha Solver ─────────────────────────────────────────────────
try:
    import nopecha
except ImportError:
    nopecha = None
    print("[WARN] nopecha not installed. Install with: pip install nopecha", flush=True)


def emit_stats(guild_name, guild_id, sent, failed, skipped, complete=False):
    payload = {
        "guild_name": guild_name,
        "guild_id": str(guild_id),
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
        "total": sent + failed + skipped,
        "complete": complete,
    }
    print(f"[STATS_JSON] {json.dumps(payload)}")
    sys.stdout.flush()


def solve_captcha_with_nopecha(rqdata: str = None):
    """Solve hCaptcha using Nopecha"""
    if not nopecha:
        print("[Captcha] nopecha library not available", flush=True)
        return None

    try:
        nopecha.api_key = os.environ.get("NOPECHA_API_KEY")
        if not nopecha.api_key:
            print("[Captcha] NOPECHA_API_KEY not set in environment", flush=True)
            return None

        print("[Captcha] Solving hCaptcha with Nopecha...", flush=True)

        solution = nopecha.Token.solve(
            type="hcaptcha",
            sitekey="a9b5fb07-92ff-493f-86fe-352a2803b3df",  # Discord common sitekey
            url="https://discord.com",
            data={"rqdata": rqdata} if rqdata else None
        )

        token = solution.get("data") if isinstance(solution, dict) else solution
        if token:
            print(f"[Captcha] ✓ Solved successfully!", flush=True)
            return token
        else:
            print("[Captcha] ✗ No token received", flush=True)
            return None
    except Exception as e:
        print(f"[Captcha] Nopecha error: {e}", flush=True)
        return None


class MassDMBot(discord.Client):
    def __init__(self, server_input, dm_message, delay):
        intents = discord.Intents.default()
        intents.members = True      # Privileged intent — must be ON in Dev Portal
        intents.guilds = True
        super().__init__(intents=intents)
        self.server_input = server_input.strip()
        self.dm_message = dm_message
        self.delay = delay

    async def on_ready(self):
        print(f'[MassDM] Logged in as {self.user} (ID: {self.user.id})')
        sys.stdout.flush()
        await self.run_mass_dm()

    async def resolve_guild(self):
        """Return a Guild from a numeric ID or an invite code/URL."""
        raw = self.server_input
        if raw.isdigit():
            guild = self.get_guild(int(raw))
            if not guild:
                try:
                    guild = await self.fetch_guild(int(raw))
                except Exception as e:
                    print(f'[MassDM] Error fetching guild by ID: {e}')
                    sys.stdout.flush()
                    return None
            return guild

        # Invite code / URL
        code = raw.split("?")[0].rstrip("/").split("/")[-1]
        print(f'[MassDM] Resolving invite code: {code}')
        sys.stdout.flush()
        try:
            invite = await self.fetch_invite(code)
            guild_id = invite.guild.id
            print(f'[MassDM] Invite resolved → {invite.guild.name} ({guild_id})')
            sys.stdout.flush()
            guild = self.get_guild(guild_id)
            if not guild:
                guild = await self.fetch_guild(guild_id)
            return guild
        except Exception as e:
            print(f'[MassDM] Error resolving invite "{code}": {e}')
            sys.stdout.flush()
            return None

    async def run_mass_dm(self):
        guild = await self.resolve_guild()
        if not guild:
            print('[MassDM] Could not resolve guild. Make sure the bot is in the server.')
            sys.stdout.flush()
            await self.close()
            return

        guild_name = guild.name
        guild_id = guild.id
        print(f'[MassDM] Target guild: {guild_name} ({guild_id})')
        sys.stdout.flush()

        try:
            members = [m async for m in guild.fetch_members(limit=None)]
        except discord.Forbidden:
            print('[MassDM] Cannot fetch members — enable Server Members Intent in the Discord Developer Portal.')
            sys.stdout.flush()
            await self.close()
            return
        except Exception as e:
            print(f'[MassDM] Error fetching members: {e}')
            sys.stdout.flush()
            await self.close()
            return

        print(f'[MassDM] Found {len(members)} members. Starting DM campaign...')
        sys.stdout.flush()

        sent = 0
        failed = 0
        skipped = 0

        for member in members:
            if member.bot or member.id == self.user.id:
                skipped += 1
                emit_stats(guild_name, guild_id, sent, failed, skipped)
                continue

            try:
                await member.send(self.dm_message)
                sent += 1
                print(f'[MassDM] Sent to {member} [{sent}s/{failed}e/{skipped}sk]')
                sys.stdout.flush()
                emit_stats(guild_name, guild_id, sent, failed, skipped)
                await asyncio.sleep(self.delay)

            except discord.Forbidden:
                failed += 1
                print(f'[MassDM] Cannot DM {member} (DMs closed)')
                sys.stdout.flush()
                emit_stats(guild_name, guild_id, sent, failed, skipped)

            except discord.HTTPException as e:
                failed += 1
                print(f'[MassDM] HTTP error DMing {member}: {e}')
                sys.stdout.flush()
                emit_stats(guild_name, guild_id, sent, failed, skipped)

                # Nopecha hCaptcha Handling
                if "captcha" in str(e).lower() or e.status in (429, 403):
                    print("[Captcha] hCaptcha / Rate limit detected - attempting solve...", flush=True)
                    rqdata = getattr(e, 'rqdata', None) or getattr(e, 'captcha_rqdata', None)
                    token = solve_captcha_with_nopecha(rqdata)

                    if token:
                        print("[Captcha] Retry DM after solve...", flush=True)
                        await asyncio.sleep(5)
                        try:
                            await member.send(self.dm_message)
                            sent += 1
                            failed -= 1
                            print(f'[MassDM] ✓ Recovered DM to {member} after captcha', flush=True)
                            emit_stats(guild_name, guild_id, sent, failed, skipped)
                        except Exception as retry_e:
                            print(f'[MassDM] Retry failed: {retry_e}', flush=True)

                if e.status == 429:
                    retry_after = getattr(e, 'retry_after', 30)
                    print(f'[MassDM] Rate limited. Waiting {retry_after}s...')
                    sys.stdout.flush()
                    await asyncio.sleep(retry_after)

            except Exception as e:
                failed += 1
                print(f'[MassDM] Error DMing {member}: {e}')
                sys.stdout.flush()
                emit_stats(guild_name, guild_id, sent, failed, skipped)

        emit_stats(guild_name, guild_id, sent, failed, skipped, complete=True)
        print(f'[MassDM] Campaign complete. Sent: {sent} | Failed: {failed} | Skipped: {skipped}')
        sys.stdout.flush()
        await self.close()


try:
    client = MassDMBot(
        server_input=args.server,
        dm_message=args.dm_message,
        delay=args.delay,
    )
    client.run(args.token)
except Exception as e:
    print(f'Fatal error: {e}')
    sys.stdout.flush()
