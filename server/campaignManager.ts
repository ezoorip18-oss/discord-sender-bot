
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import * as storage from "./storage";
import type { Campaign, BotPool } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "error" | "success";
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Campaign Manager ───────────────────────────────────────────────────────
class CampaignManager {
  private logs: LogEntry[] = [];
  private MAX_LOGS = 300;
  private currentProcess: ChildProcess | null = null;
  private activeCampaignId: number | null = null;
  private stopping = false;

  addLog(message: string, type: LogEntry["type"] = "info") {
    this.logs.unshift({ timestamp: new Date().toISOString(), message, type });
    if (this.logs.length > this.MAX_LOGS) this.logs.pop();
  }

  getLogs() { return this.logs; }
  getActiveCampaignId() { return this.activeCampaignId; }
  isRunning() { return this.activeCampaignId !== null && !this.stopping; }

  // ── Discord REST helpers (using selfbot/user token) ──────────────────────
  private async discordGet(path: string, token: string) {
    const r = await fetch(`https://discord.com/api/v10${path}`, {
      headers: { Authorization: token },
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`Discord GET ${path} → ${r.status}: ${body}`);
    }
    return r.json();
  }

  private async resolveGuild(serverInput: string, token: string): Promise<{ guildId: string; guildName: string }> {
    const raw = serverInput.trim();
    if (/^\d+$/.test(raw)) {
      const g: any = await this.discordGet(`/guilds/${raw}`, token);
      return { guildId: raw, guildName: g.name ?? "Unknown" };
    }
    const code = raw.split("?")[0].replace(/\/$/, "").split("/").pop()!;
    const inv: any = await this.discordGet(`/invites/${code}`, token);
    return { guildId: inv.guild.id, guildName: inv.guild.name };
  }

  private async fetchAllMembers(guildId: string, token: string) {
    const members: Array<{ userId: string; username: string }> = [];
    let after = "0";
    while (true) {
      const batch: any[] = await this.discordGet(
        `/guilds/${guildId}/members?limit=1000&after=${after}`,
        token
      );
      if (!batch.length) break;
      for (const m of batch) {
        if (!m.user?.bot) {
          members.push({ userId: m.user.id, username: m.user.username ?? m.user.id });
        }
      }
      after = batch[batch.length - 1].user.id;
      if (batch.length < 1000) break;
      await sleep(500); // avoid rate limits
    }
    return members;
  }

  private async inviteBot(clientId: string, guildId: string, token: string) {
    const r = await fetch(
      `https://discord.com/api/v10/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=0`,
      {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ authorize: true, guild_id: guildId }),
      }
    );
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`Invite failed for client ${clientId}: ${r.status} ${body}`);
    }
  }

  // ── Bot worker subprocess ─────────────────────────────────────────────────
  private spawnWorker(
    botToken: string,
    campaignId: number,
    botRunId: number,
    guildId: string,
    quota: number,
    delay: number,
    dmMessage: string,
    dbUrl: string,
    skipLeave = false,
  ): Promise<number | null> {
    return new Promise((resolve) => {
      const workerPath = path.resolve(process.cwd(), "bot_worker.py");
      const args = [
        workerPath,
        "--token",       botToken,
        "--campaign-id", String(campaignId),
        "--bot-run-id",  String(botRunId),
        "--guild-id",    String(guildId),
        "--quota",       String(quota),
        "--delay",       String(delay),
      ];
      if (skipLeave) args.push("--skip-leave");
      const proc = spawn("python3", args, {
        env: { ...process.env, DM_MESSAGE: dmMessage, DATABASE_URL: dbUrl },
      });

      this.currentProcess = proc;

      proc.stdout?.on("data", (d) => {
        const lines = d.toString().split("\n");
        for (const line of lines) {
          const t = line.trim();
          if (!t || t.startsWith("[PROGRESS]")) continue;
          const type: LogEntry["type"] = t.includes("complete") || t.includes("complete")
            ? "success"
            : t.toLowerCase().includes("error") || t.toLowerCase().includes("fatal")
            ? "error"
            : "info";
          this.addLog(t, type);
        }
      });
      proc.stderr?.on("data", (d) => {
        const t = d.toString().trim();
        if (t) this.addLog(t, "error");
      });
      proc.on("close", (code) => {
        this.currentProcess = null;
        resolve(code);
      });
      proc.on("error", (err) => {
        this.addLog(`Worker process error: ${err.message}`, "error");
        this.currentProcess = null;
        resolve(null);
      });
    });
  }

  // ── Campaign start (main entry point) ─────────────────────────────────────
  async startCampaign(
    serverInput: string,
    dmMessage: string,
    botQuota: number,
    delay: number,
    skipInvite = false,
  ): Promise<number> {
    if (this.activeCampaignId !== null) throw new Error("A campaign is already running");

    const s = await storage.getSettings();
    if (!s?.selfbotToken) throw new Error("Selfbot token not configured in Setup");

    const selfbotToken = s.selfbotToken.trim();

    // Validate token first
    this.addLog("Validating selfbot token...", "info");
    try {
      const me: any = await this.discordGet("/users/@me", selfbotToken);
      this.addLog(`Authenticated as: ${me.username}#${me.discriminator ?? "0"}`, "success");
    } catch (err: any) {
      throw new Error(`Invalid selfbot token — Discord rejected it: ${err.message}. Re-paste your token in the Setup tab.`);
    }

    // Resolve guild
    this.addLog("Resolving server...", "info");
    const { guildId, guildName } = await this.resolveGuild(serverInput, selfbotToken);
    this.addLog(`Target: ${guildName} (${guildId})`, "info");

    // Create campaign record
    const campaign = await storage.createCampaign({
      guildId,
      dmMessage,
      botQuota,
      delay,
      selfbotToken,
    });
    await storage.updateCampaignStatus(campaign.id, "initializing", { guildName });

    this.activeCampaignId = campaign.id;
    this.stopping = false;

    // Run the full campaign in background
    this.runCampaignLoop(campaign.id, guildId, guildName, selfbotToken, dmMessage, botQuota, delay, skipInvite);

    return campaign.id;
  }

  private async runCampaignLoop(
    campaignId: number,
    guildId: string,
    guildName: string,
    selfbotToken: string,
    dmMessage: string,
    botQuota: number,
    delay: number,
    skipInvite = false,
  ) {
    try {
      // Members are fetched by the first bot worker after it joins the guild.
      // (Discord blocks GET /guilds/{id}/members for user tokens via REST.)
      await storage.updateCampaignStatus(campaignId, "running");
      this.addLog("Starting bot rotation — first bot will fetch the member list after joining.", "info");

      // Bot rotation loop
      let rotationNum = 0;
      while (!this.stopping) {
        const pending = await storage.getPendingCount(campaignId);
        // Only treat pending=0 as "complete" after at least one bot has run
        // (before first bot runs, members haven't been fetched yet)
        if (pending === 0 && rotationNum > 0) {
          this.addLog("All members processed. Campaign complete!", "success");
          await storage.updateCampaignStatus(campaignId, "completed");
          break;
        }

        const bot = await storage.getNextAvailableBot();
        if (!bot) {
          this.addLog("No available bots in pool. Campaign paused — add more bots to resume.", "error");
          await storage.updateCampaignStatus(campaignId, "paused");
          break;
        }

        rotationNum++;
        this.addLog(`--- Rotation #${rotationNum}: Bot "${bot.name || bot.clientId}" (${pending} pending) ---`, "info");

        // Mark bot as working
        await storage.updateBotStatus(bot.id, "working");

        // Create run record
        const run = await storage.createBotRun(campaignId, bot.id, bot.name || bot.clientId);

        // Invite bot to server (skip if bots are already in server)
        if (skipInvite) {
          this.addLog(`Bots-already-in-server mode — skipping invite for ${bot.name || bot.clientId}.`, "info");
        } else {
          try {
            this.addLog(`Inviting bot ${bot.name || bot.clientId} to ${guildName}...`, "info");
            await this.inviteBot(bot.clientId, guildId, selfbotToken);
            this.addLog(`Bot invited. Waiting 15s for join...`, "info");
            await sleep(15000); // wait for bot to join the guild
          } catch (err: any) {
            this.addLog(`Failed to invite bot: ${err.message}`, "error");
            await storage.updateBotStatus(bot.id, "available");
            continue;
          }
        }

        if (this.stopping) break;

        // Spawn worker
        const dbUrl = process.env.DATABASE_URL!;
        const exitCode = await this.spawnWorker(
          bot.token, campaignId, run.id, guildId, botQuota, delay, dmMessage, dbUrl, skipInvite
        );
        this.addLog(`Bot run #${rotationNum} finished (exit code ${exitCode})`, exitCode === 0 ? "success" : "error");

        // Mark bot as exhausted (used once)
        await storage.updateBotStatus(bot.id, "exhausted");
      }
    } catch (err: any) {
      this.addLog(`Campaign error: ${err.message}`, "error");
      await storage.updateCampaignStatus(campaignId, "stopped");
    } finally {
      this.activeCampaignId = null;
      this.stopping = false;
    }
  }

  stopCampaign() {
    this.stopping = true;
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
    if (this.activeCampaignId !== null) {
      storage.updateCampaignStatus(this.activeCampaignId, "stopped");
      this.activeCampaignId = null;
    }
    this.addLog("Campaign stopped by user.", "info");
  }
}

export const campaignManager = new CampaignManager();
