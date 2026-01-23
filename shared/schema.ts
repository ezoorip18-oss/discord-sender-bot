
import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const botConfig = pgTable("bot_config", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(), // Storing token in DB for MVP dashboard access
  channelId: text("channel_id").notNull(),
  message: text("message").notNull(),
  cooldown: integer("cooldown").default(60).notNull(), // in minutes
  isRunning: boolean("is_running").default(false).notNull(),
  lastRun: text("last_run"),
});

export const insertBotConfigSchema = createInsertSchema(botConfig).omit({ 
  id: true,
  lastRun: true 
});

export type BotConfig = typeof botConfig.$inferSelect;
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;

export type UpdateBotConfig = Partial<InsertBotConfig>;
