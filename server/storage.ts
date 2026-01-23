
import { db } from "./db";
import { botConfig, type BotConfig, type InsertBotConfig, type UpdateBotConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getConfig(): Promise<BotConfig | undefined>;
  updateConfig(config: InsertBotConfig): Promise<BotConfig>;
  updateStatus(isRunning: boolean, lastRun?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getConfig(): Promise<BotConfig | undefined> {
    const configs = await db.select().from(botConfig).limit(1);
    return configs[0];
  }

  async updateConfig(insertConfig: InsertBotConfig): Promise<BotConfig> {
    const existing = await this.getConfig();
    if (existing) {
      const [updated] = await db.update(botConfig)
        .set(insertConfig)
        .where(eq(botConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(botConfig).values(insertConfig).returning();
      return created;
    }
  }

  async updateStatus(isRunning: boolean, lastRun?: string): Promise<void> {
    const existing = await this.getConfig();
    if (existing) {
      await db.update(botConfig)
        .set({ isRunning, ...(lastRun ? { lastRun } : {}) })
        .where(eq(botConfig.id, existing.id));
    }
  }
}

export const storage = new DatabaseStorage();
