
import argparse
import discord
import asyncio
import sys
import datetime

# Configure arguments
parser = argparse.ArgumentParser(description='Discord Selfbot')
parser.add_argument('--token', required=True, help='User Token')
parser.add_argument('--channel', required=True, help='Channel ID')
parser.add_argument('--message', required=True, help='Message content')
parser.add_argument('--interval', required=True, type=int, help='Interval in seconds')

args = parser.parse_args()

# Selfbot client
class SelfBot(discord.Client):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.target_channel_id = int(kwargs.get('channel_id'))
        self.message_content = kwargs.get('message_content')
        self.interval = kwargs.get('interval')
        self.bg_task = None

    async def setup_hook(self):
        self.bg_task = self.loop.create_task(self.my_background_task())

    async def on_ready(self):
        print(f'Logged in as {self.user} (ID: {self.user.id})')
        sys.stdout.flush()

    async def my_background_task(self):
        await self.wait_until_ready()
        channel = self.get_channel(self.target_channel_id)
        
        if not channel:
            # Try fetching if not in cache (though for selfbots, usually it is if in guild)
            try:
                channel = await self.fetch_channel(self.target_channel_id)
            except Exception as e:
                print(f"Error fetching channel: {e}")
                sys.stdout.flush()
                return

        print(f"Starting loop. Channel: {channel.name} ({channel.id})")
        sys.stdout.flush()

        while not self.is_closed():
            try:
                await channel.send(self.message_content)
                print(f"Message sent at {datetime.datetime.now()}")
                sys.stdout.flush()
                await asyncio.sleep(self.interval)
            except Exception as e:
                print(f"Error sending message: {e}")
                sys.stdout.flush()
                await asyncio.sleep(60) # Retry after 1 min on error

client = SelfBot(channel_id=args.channel, message_content=args.message, interval=args.interval)

try:
    client.run(args.token)
except Exception as e:
    print(f"Fatal error: {e}")
    sys.stdout.flush()
