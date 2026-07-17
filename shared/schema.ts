
import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Legacy table (kept for DB compatibility) ──────────────────────────────
export const botConfig = pgTable("bot_config", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  channelId: text("channel_id").notNull(),
  message: text("message").notNull(),
  cooldown: integer("cooldown").default(60).notNull(),
  isRunning: boolean("is_running").default(false).notNull(),
  lastRun: text("last_run"),
});

// ── Bot Pool ──────────────────────────────────────────────────────────────
export const botPool = pgTable("bot_pool", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  clientId: text("client_id").notNull(),
  name: text("name").default("").notNull(),
  status: text("status").default("available").notNull(), // 'available' | 'working' | 'exhausted'
});

export const insertBotPoolSchema = createInsertSchema(botPool).omit({ id: true, status: true });
export type BotPool = typeof botPool.$inferSelect;
export type InsertBotPool = z.infer<typeof insertBotPoolSchema>;

// ── Campaigns ─────────────────────────────────────────────────────────────
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  guildName: text("guild_name").default("").notNull(),
  dmMessage: text("dm_message").notNull(),
  botQuota: integer("bot_quota").default(500).notNull(),
  delay: integer("delay").default(3).notNull(), // seconds between DMs
  selfbotToken: text("selfbot_token").notNull(),
  status: text("status").default("pending").notNull(), // 'pending'|'initializing'|'running'|'paused'|'completed'|'stopped'
  totalMembers: integer("total_members").default(0).notNull(),
  createdAt: text("created_at"),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, status: true, totalMembers: true, createdAt: true, guildName: true });
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

// ── Campaign Members ──────────────────────────────────────────────────────
export const campaignMembers = pgTable("campaign_members", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").default("").notNull(),
  status: text("status").default("pending").notNull(), // 'pending'|'in_progress'|'sent'|'failed'|'skipped'
  botRunId: integer("bot_run_id"),
});

export type CampaignMember = typeof campaignMembers.$inferSelect;

// ── Bot Runs ──────────────────────────────────────────────────────────────
export const botRuns = pgTable("bot_runs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  botId: integer("bot_id").notNull(),
  botName: text("bot_name").default("").notNull(),
  sent: integer("sent").default(0).notNull(),
  failed: integer("failed").default(0).notNull(),
  skipped: integer("skipped").default(0).notNull(),
  status: text("status").default("pending").notNull(), // 'pending'|'running'|'completed'|'stopped'
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});

export type BotRun = typeof botRuns.$inferSelect;

// ── Settings ───────────────────────────────────────────────────────────────
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  selfbotToken: text("selfbot_token").default("").notNull(),
  capsolverKey: text("capsolver_key").default("").notNull(),
});

export type Settings = typeof settings.$inferSelect;

// ── Embed Templates ────────────────────────────────────────────────────────
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  payload: text("payload").notNull(), // JSON string (embed + buttons payload)
  createdAt: text("created_at"),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true, createdAt: true });
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
