
import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import * as store from "./storage";
import { campaignManager } from "./campaignManager";
import { insertBotPoolSchema } from "@shared/schema";

const campaignStartInput = z.object({
  serverInput: z.string().min(1, "Server ID or invite link required"),
  dmMessage:   z.string().min(1, "Message required"),
  botQuota:    z.number().int().min(1).max(10000).default(500),
  delay:       z.number().int().min(1).max(60).default(3),
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Settings ──────────────────────────────────────────────────────────
  app.get("/api/settings", async (_req, res) => {
    const s = await store.getSettings();
    res.json({ selfbotToken: s?.selfbotToken ?? "" });
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { selfbotToken } = z.object({ selfbotToken: z.string().min(1) }).parse(req.body);
      await store.saveSelfbotToken(selfbotToken);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ── Bot Pool ──────────────────────────────────────────────────────────
  app.get("/api/bots", async (_req, res) => {
    const bots = await store.getBots();
    // Never send tokens to the client
    res.json(bots.map(b => ({ id: b.id, clientId: b.clientId, name: b.name, status: b.status })));
  });

  app.post("/api/bots", async (req, res) => {
    try {
      const data = insertBotPoolSchema.parse(req.body);
      const bot = await store.addBot(data);
      res.json({ id: bot.id, clientId: bot.clientId, name: bot.name, status: bot.status });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/bots/:id", async (req, res) => {
    await store.removeBot(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/bots/reset", async (_req, res) => {
    await store.resetBotStatuses();
    res.json({ ok: true });
  });

  // ── Campaign ──────────────────────────────────────────────────────────
  app.post("/api/campaign/start", async (req, res) => {
    try {
      const { serverInput, dmMessage, botQuota, delay } = campaignStartInput.parse(req.body);
      const campaignId = await campaignManager.startCampaign(serverInput, dmMessage, botQuota, delay);
      res.json({ campaignId, status: "initializing" });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/campaign/stop", (_req, res) => {
    campaignManager.stopCampaign();
    res.json({ ok: true });
  });

  app.get("/api/campaign/active", async (_req, res) => {
    const campaign = await store.getActiveCampaign();
    if (!campaign) return res.json(null);
    const stats = await store.getCampaignMemberStats(campaign.id);
    const runs  = await store.getBotRuns(campaign.id);
    res.json({ ...campaign, stats, runs });
  });

  app.get("/api/campaign/:id/stats", async (req, res) => {
    const stats = await store.getCampaignMemberStats(Number(req.params.id));
    res.json(stats);
  });

  app.get("/api/campaign/:id/runs", async (req, res) => {
    const runs = await store.getBotRuns(Number(req.params.id));
    res.json(runs);
  });

  // ── Logs ──────────────────────────────────────────────────────────────
  app.get("/api/logs", (_req, res) => {
    res.json(campaignManager.getLogs());
  });

  return httpServer;
}
