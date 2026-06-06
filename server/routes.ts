
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { botManager } from "./botManager";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Token ──────────────────────────────────────────────
  app.get(api.token.get.path, async (req, res) => {
    const config = await storage.getConfig();
    res.json({ token: config?.token ?? "" });
  });

  app.post(api.token.save.path, async (req, res) => {
    try {
      const { token } = api.token.save.input.parse(req.body);
      const existing = await storage.getConfig();
      if (existing) {
        await storage.updateConfig({
          token,
          channelId: existing.channelId,
          message: existing.message,
          cooldown: existing.cooldown,
          isRunning: existing.isRunning,
        });
      } else {
        await storage.updateConfig({
          token,
          channelId: "",
          message: "",
          cooldown: 60,
          isRunning: false,
        });
      }
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Mass DM ────────────────────────────────────────────
  app.post(api.massDm.start.path, async (req, res) => {
    try {
      const input = api.massDm.start.input.parse(req.body);

      if (botManager.isRunning()) {
        return res.status(409).json({ message: "A mass DM campaign is already running" });
      }

      const config = await storage.getConfig();
      if (!config || !config.token) {
        return res.status(400).json({ message: "Bot token not configured. Set it above first." });
      }

      const started = botManager.startMassDm(
        config.token,
        input.serverId,
        input.message,
        input.delay,
      );

      if (!started) {
        return res.status(409).json({ message: "Failed to start mass DM campaign" });
      }

      res.json({ status: "Mass DM campaign started" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.massDm.stop.path, (req, res) => {
    botManager.stopMassDm();
    res.json({ status: "Mass DM campaign stopped" });
  });

  app.get(api.massDm.status.path, (req, res) => {
    res.json({ isRunning: botManager.isRunning() });
  });

  app.get(api.massDm.stats.path, (req, res) => {
    res.json(botManager.getMassDmStats());
  });

  // ── Logs ───────────────────────────────────────────────
  app.get(api.logs.list.path, (req, res) => {
    res.json(botManager.getLogs());
  });

  return httpServer;
}
