
import { z } from "zod";
import { insertBotPoolSchema, insertCampaignSchema } from "./schema";

export const api = {
  // Settings (selfbot token)
  settings: {
    get:  { method: "GET"  as const, path: "/api/settings" },
    save: { method: "POST" as const, path: "/api/settings",
      input: z.object({ selfbotToken: z.string().min(1, "Selfbot token required") }) },
  },

  // Bot pool
  bots: {
    list:   { method: "GET"    as const, path: "/api/bots" },
    add:    { method: "POST"   as const, path: "/api/bots", input: insertBotPoolSchema },
    remove: { method: "DELETE" as const, path: "/api/bots/:id" },
  },

  // Campaigns
  campaign: {
    start: {
      method: "POST" as const, path: "/api/campaign/start",
      input: insertCampaignSchema,
    },
    stop:   { method: "POST" as const, path: "/api/campaign/stop" },
    active: { method: "GET"  as const, path: "/api/campaign/active" },
    stats:  { method: "GET"  as const, path: "/api/campaign/:id/stats" },
    runs:   { method: "GET"  as const, path: "/api/campaign/:id/runs" },
  },

  // Logs
  logs: {
    list: { method: "GET" as const, path: "/api/logs" },
  },
};
