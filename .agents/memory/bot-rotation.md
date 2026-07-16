---
name: Bot Rotation Architecture
description: How the selfbot-driven mass DM campaign rotation system works end-to-end
---

## System Overview
- **Selfbot account** (user token, stored in `settings` table) → invites bots + fetches member list via raw Discord REST API
- **Bot pool** (`bot_pool` table) → each bot has a `token` (for discord.py) and a `client_id` (for OAuth2 invite)
- **Campaign manager** (`server/campaignManager.ts`) → Node.js orchestrator; runs the rotation loop
- **Bot worker** (`bot_worker.py`) → discord.py subprocess; DMs up to quota, leaves guild, updates DB directly via psycopg2

## Key Invite Endpoint
```
POST https://discord.com/api/v10/oauth2/authorize?client_id={CLIENT_ID}&scope=bot&permissions=0
Authorization: {USER_TOKEN}
Body: { "authorize": true, "guild_id": "{GUILD_ID}" }
```

## DM Flow
1. `POST /api/campaign/start` → creates campaign record → starts `campaignManager.runCampaignLoop()` in background
2. Loop: fetch all guild members (paginated REST) → store in `campaign_members` → for each available bot:
   a. Invite bot via above endpoint
   b. Wait 15s for join
   c. Spawn `bot_worker.py` (DM_MESSAGE via env var, DB credentials via env var)
   d. Worker claims members via `FOR UPDATE SKIP LOCKED`, DMs them, updates DB, leaves guild
   e. Mark bot as `exhausted`, continue loop

## DB Tables
- `settings` — selfbot token (global)
- `bot_pool` — token, client_id, name, status
- `campaigns` — guild_id, dm_message, quota, delay, selfbot_token, status
- `campaign_members` — campaign_id, user_id, username, status (pending/in_progress/sent/failed/skipped)
- `bot_runs` — campaign_id, bot_id, sent, failed, skipped, status

## Python Requirements
- `discord.py` (regular bot library, NOT discord.py-self)
- `psycopg2-binary` (direct PostgreSQL access from worker)
- DM_MESSAGE passed via env var (avoids shell escaping issues)

**Why:** Two Python libraries conflict if both `discord.py` and `discord.py-self` are installed (same `discord` module namespace). Selfbot invite functionality is handled via raw `requests`/`fetch` HTTP calls instead, so only discord.py is needed.
