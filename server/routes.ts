
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

  // Initialize bot state from DB on startup
  const config = await storage.getConfig();
  if (config && config.isRunning) {
    botManager.start(config.token, config.channelId, config.message, config.cooldown);
  }

  app.get(api.config.get.path, async (req, res) => {
    const config = await storage.getConfig();
    if (!config) {
      // Return defaults or 404. Let's return a default object structure if none exists
      // so frontend doesn't crash, but with empty values.
      // Or actually, just 404 is fine as per route spec, frontend handles it.
      return res.status(404).json({ message: "No configuration found" });
    }
    // Sync running state with manager
    const actualRunning = botManager.isRunning();
    if (config.isRunning !== actualRunning) {
      await storage.updateStatus(actualRunning);
      config.isRunning = actualRunning;
    }
    res.json(config);
  });

  app.post(api.config.update.path, async (req, res) => {
    try {
      const input = api.config.update.input.parse(req.body);
      const config = await storage.updateConfig(input);
      
      // If running, restart with new config
      if (botManager.isRunning()) {
        botManager.stop();
        botManager.start(config.token, config.channelId, config.message, config.cooldown);
        await storage.updateStatus(true);
      }
      
      res.json(config);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.config.toggle.path, async (req, res) => {
    const { isRunning } = req.body;
    const config = await storage.getConfig();
    
    if (!config) {
      return res.status(400).json({ message: "Configure the bot first" });
    }

    if (isRunning) {
      botManager.start(config.token, config.channelId, config.message, config.cooldown);
      await storage.updateStatus(true, new Date().toISOString());
      res.json({ isRunning: true, status: "Started" });
    } else {
      botManager.stop();
      await storage.updateStatus(false);
      res.json({ isRunning: false, status: "Stopped" });
    }
  });

  app.get(api.logs.list.path, (req, res) => {
    res.json(botManager.getLogs());
  });

  return httpServer;
}
