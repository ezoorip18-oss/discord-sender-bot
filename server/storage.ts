
import { db } from "./db";
import {
  botConfig, botPool, campaigns, campaignMembers, botRuns, settings, templates,
  type BotPool, type InsertBotPool,
  type Campaign, type InsertCampaign,
  type CampaignMember, type BotRun, type Settings, type Template,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

// ── Legacy (kept for DB compat) ───────────────────────────────────────────
export interface IStorage {
  getConfig(): Promise<any>;
  updateConfig(config: any): Promise<any>;
  updateStatus(isRunning: boolean, lastRun?: string): Promise<void>;
}
export class DatabaseStorage implements IStorage {
  async getConfig() { const r = await db.select().from(botConfig).limit(1); return r[0]; }
  async updateConfig(c: any) {
    const ex = await this.getConfig();
    if (ex) { const [u] = await db.update(botConfig).set(c).where(eq(botConfig.id, ex.id)).returning(); return u; }
    const [cr] = await db.insert(botConfig).values(c).returning(); return cr;
  }
  async updateStatus(isRunning: boolean, lastRun?: string) {
    const ex = await this.getConfig();
    if (ex) await db.update(botConfig).set({ isRunning, ...(lastRun ? { lastRun } : {}) }).where(eq(botConfig.id, ex.id));
  }
}
export const storage = new DatabaseStorage();

// ── Settings ──────────────────────────────────────────────────────────────
export async function getSettings(): Promise<Settings | undefined> {
  const rows = await db.select().from(settings).limit(1);
  return rows[0];
}
export async function saveSelfbotToken(token: string): Promise<void> {
  const trimmed = token.trim();
  const existing = await getSettings();
  if (existing) {
    await db.update(settings).set({ selfbotToken: trimmed }).where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({ selfbotToken: trimmed });
  }
}

// ── Bot Pool ──────────────────────────────────────────────────────────────
export async function getBots(): Promise<BotPool[]> {
  return db.select().from(botPool).orderBy(botPool.id);
}
export async function addBot(data: InsertBotPool): Promise<BotPool> {
  const [row] = await db.insert(botPool).values({ ...data, status: "available" }).returning();
  return row;
}
export async function removeBot(id: number): Promise<void> {
  await db.delete(botPool).where(eq(botPool.id, id));
}
export async function getNextAvailableBot(): Promise<BotPool | undefined> {
  const rows = await db.select().from(botPool)
    .where(eq(botPool.status, "available"))
    .orderBy(botPool.id)
    .limit(1);
  return rows[0];
}
export async function updateBotStatus(id: number, status: string): Promise<void> {
  await db.update(botPool).set({ status }).where(eq(botPool.id, id));
}
// Reset exhausted/working bots back to available
export async function resetBotStatuses(): Promise<void> {
  await db.update(botPool).set({ status: "available" });
}

// ── Templates ─────────────────────────────────────────────────────────────
export async function getTemplates(): Promise<Template[]> {
  return db.select().from(templates).orderBy(templates.id);
}
export async function saveTemplate(name: string, payload: string): Promise<Template> {
  const [row] = await db.insert(templates).values({
    name, payload, createdAt: new Date().toISOString(),
  }).returning();
  return row;
}
export async function deleteTemplate(id: number): Promise<void> {
  await db.delete(templates).where(eq(templates.id, id));
}

// ── Campaigns ─────────────────────────────────────────────────────────────
export async function createCampaign(data: Omit<InsertCampaign, never>): Promise<Campaign> {
  const [row] = await db.insert(campaigns).values({
    ...data,
    status: "initializing",
    createdAt: new Date().toISOString(),
  }).returning();
  return row;
}
export async function getCampaign(id: number): Promise<Campaign | undefined> {
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0];
}
export async function getActiveCampaign(): Promise<Campaign | undefined> {
  const rows = await db.select().from(campaigns)
    .where(sql`status IN ('initializing','running','paused')`)
    .orderBy(campaigns.id)
    .limit(1);
  return rows[0];
}
export async function updateCampaignStatus(
  id: number, status: string,
  extra?: { guildName?: string; totalMembers?: number }
): Promise<void> {
  await db.update(campaigns)
    .set({ status, ...(extra?.guildName ? { guildName: extra.guildName } : {}), ...(extra?.totalMembers !== undefined ? { totalMembers: extra.totalMembers } : {}) })
    .where(eq(campaigns.id, id));
}

// ── Campaign Members ──────────────────────────────────────────────────────
export async function storeCampaignMembers(
  campaignId: number,
  members: Array<{ userId: string; username: string }>
): Promise<void> {
  if (members.length === 0) return;
  // Batch insert in chunks of 500
  const CHUNK = 500;
  for (let i = 0; i < members.length; i += CHUNK) {
    const chunk = members.slice(i, i + CHUNK);
    await db.insert(campaignMembers).values(
      chunk.map(m => ({ campaignId, userId: m.userId, username: m.username, status: "pending" }))
    ).onConflictDoNothing();
  }
}
export async function getPendingCount(campaignId: number): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)::int` })
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.status, "pending")));
  return rows[0]?.count ?? 0;
}
export async function getCampaignMemberStats(campaignId: number) {
  const rows = await db.select({
    status: campaignMembers.status,
    count: sql<number>`count(*)::int`,
  })
    .from(campaignMembers)
    .where(eq(campaignMembers.campaignId, campaignId))
    .groupBy(campaignMembers.status);

  const result = { sent: 0, failed: 0, skipped: 0, pending: 0, in_progress: 0, total: 0 };
  for (const r of rows) {
    const k = r.status as keyof typeof result;
    if (k in result) result[k] = r.count;
    result.total += r.count;
  }
  return result;
}

// ── Bot Runs ──────────────────────────────────────────────────────────────
export async function createBotRun(campaignId: number, botId: number, botName: string): Promise<BotRun> {
  const [row] = await db.insert(botRuns).values({
    campaignId, botId, botName,
    sent: 0, failed: 0, skipped: 0,
    status: "pending",
  }).returning();
  return row;
}
export async function getBotRuns(campaignId: number): Promise<BotRun[]> {
  return db.select().from(botRuns)
    .where(eq(botRuns.campaignId, campaignId))
    .orderBy(botRuns.id);
}
