
import argparse
import discord
import asyncio
import sys
import json
import datetime

parser = argparse.ArgumentParser(description='Discord Selfbot - Mass DM')
parser.add_argument('--token', required=True, help='User Token')
parser.add_argument('--server', required=True, help='Server/Guild ID')
parser.add_argument('--dm-message', required=True, help='DM message content')
parser.add_argument('--delay', type=float, default=3.0, help='Delay between DMs in seconds')

args = parser.parse_args()


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


class MassDMBot(discord.Client):
    def __init__(self, guild_id, dm_message, delay, *a, **kw):
        super().__init__(*a, **kw)
        self.target_guild_id = int(guild_id)
        self.dm_message = dm_message
        self.delay = delay

    async def on_ready(self):
        print(f'[MassDM] Logged in as {self.user} (ID: {self.user.id})')
        sys.stdout.flush()
        await self.run_mass_dm()

    async def run_mass_dm(self):
        guild = self.get_guild(self.target_guild_id)
        if not guild:
            try:
                guild = await self.fetch_guild(self.target_guild_id)
            except Exception as e:
                print(f'[MassDM] Error fetching guild: {e}')
                sys.stdout.flush()
                await self.close()
                return

        guild_name = guild.name
        guild_id = guild.id
        print(f'[MassDM] Target guild: {guild_name} ({guild_id})')
        sys.stdout.flush()

        try:
            members = [m async for m in guild.fetch_members(limit=None)]
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
        guild_id=args.server,
        dm_message=args.dm_message,
        delay=args.delay,
    )
    client.run(args.token)
except Exception as e:
    print(f'Fatal error: {e}')
    sys.stdout.flush()
