
import argparse
import discord
import asyncio
import sys
import datetime

# Configure arguments
parser = argparse.ArgumentParser(description='Discord Selfbot')
parser.add_argument('--token', required=True, help='User Token')
parser.add_argument('--mode', default='auto_send', choices=['auto_send', 'mass_dm'], help='Bot mode')

# auto_send args
parser.add_argument('--channel', help='Channel ID (auto_send mode)')
parser.add_argument('--message', help='Message content (auto_send mode)')
parser.add_argument('--interval', type=int, help='Interval in seconds (auto_send mode)')

# mass_dm args
parser.add_argument('--server', help='Server/Guild ID (mass_dm mode)')
parser.add_argument('--dm-message', help='DM message content (mass_dm mode)')
parser.add_argument('--delay', type=float, default=3.0, help='Delay between DMs in seconds (mass_dm mode)')

args = parser.parse_args()


# ──────────────────────────────────────────────
#  AUTO SEND MODE
# ──────────────────────────────────────────────
class AutoSendBot(discord.Client):
    def __init__(self, channel_id, message_content, interval, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.target_channel_id = int(channel_id)
        self.message_content = message_content
        self.interval = interval
        self.bg_task = None

    async def setup_hook(self):
        self.bg_task = self.loop.create_task(self.my_background_task())

    async def on_ready(self):
        print(f'[AutoSend] Logged in as {self.user} (ID: {self.user.id})')
        sys.stdout.flush()

    async def my_background_task(self):
        await self.wait_until_ready()
        channel = self.get_channel(self.target_channel_id)

        if not channel:
            try:
                channel = await self.fetch_channel(self.target_channel_id)
            except Exception as e:
                print(f'[AutoSend] Error fetching channel: {e}')
                sys.stdout.flush()
                return

        print(f'[AutoSend] Starting loop. Channel: {channel.name} ({channel.id})')
        sys.stdout.flush()

        while not self.is_closed():
            try:
                await channel.send(self.message_content)
                print(f'[AutoSend] Message sent at {datetime.datetime.now()}')
                sys.stdout.flush()
                await asyncio.sleep(self.interval)
            except Exception as e:
                print(f'[AutoSend] Error sending message: {e}')
                sys.stdout.flush()
                await asyncio.sleep(60)


# ──────────────────────────────────────────────
#  MASS DM MODE
# ──────────────────────────────────────────────
class MassDMBot(discord.Client):
    def __init__(self, guild_id, dm_message, delay, *args, **kwargs):
        super().__init__(*args, **kwargs)
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

        print(f'[MassDM] Target guild: {guild.name} ({guild.id})')
        sys.stdout.flush()

        # Fetch all members (requires members intent)
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
            # Skip bots and self
            if member.bot or member.id == self.user.id:
                skipped += 1
                continue

            try:
                await member.send(self.dm_message)
                sent += 1
                print(f'[MassDM] DM sent to {member} ({member.id}) [{sent} sent / {failed} failed]')
                sys.stdout.flush()
                await asyncio.sleep(self.delay)
            except discord.Forbidden:
                failed += 1
                print(f'[MassDM] Cannot DM {member} (DMs closed or not friends)')
                sys.stdout.flush()
            except discord.HTTPException as e:
                failed += 1
                print(f'[MassDM] HTTP error DMing {member}: {e}')
                sys.stdout.flush()
                if e.status == 429:
                    # Rate limited — wait longer
                    retry_after = e.retry_after if hasattr(e, 'retry_after') else 30
                    print(f'[MassDM] Rate limited. Waiting {retry_after}s...')
                    sys.stdout.flush()
                    await asyncio.sleep(retry_after)
            except Exception as e:
                failed += 1
                print(f'[MassDM] Error DMing {member}: {e}')
                sys.stdout.flush()

        print(f'[MassDM] Campaign complete. Sent: {sent} | Failed: {failed} | Skipped (bots/self): {skipped}')
        sys.stdout.flush()
        await self.close()


# ──────────────────────────────────────────────
#  ENTRY POINT
# ──────────────────────────────────────────────
try:
    if args.mode == 'mass_dm':
        if not args.server or not args.dm_message:
            print('ERROR: --server and --dm-message are required for mass_dm mode')
            sys.stdout.flush()
            sys.exit(1)
        client = MassDMBot(
            guild_id=args.server,
            dm_message=args.dm_message,
            delay=args.delay
        )
        client.run(args.token)
    else:
        if not args.channel or not args.message or args.interval is None:
            print('ERROR: --channel, --message, and --interval are required for auto_send mode')
            sys.stdout.flush()
            sys.exit(1)
        client = AutoSendBot(
            channel_id=args.channel,
            message_content=args.message,
            interval=args.interval
        )
        client.run(args.token)
except Exception as e:
    print(f'Fatal error: {e}')
    sys.stdout.flush()
