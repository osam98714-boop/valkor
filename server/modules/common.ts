import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { auditLogs, storeSettings } from "../../drizzle/schema";
import { getDb } from "../db";
import type { AdminAccount } from "../../drizzle/schema";

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "قاعدة البيانات غير متاحة؛ لم تُحفظ أي تغييرات" });
  return db;
}

export async function readSettings() {
  const db = await getDb();
  if (!db) return {} as Record<string, string>;
  const rows = await db.select().from(storeSettings);
  return Object.fromEntries(rows.map(row => [row.settingKey, row.value]));
}

export async function readSetting(key: string, fallback = "") {
  const db = await getDb();
  if (!db) return fallback;
  const [row] = await db.select({ value: storeSettings.value }).from(storeSettings).where(eq(storeSettings.settingKey, key)).limit(1);
  return row?.value ?? fallback;
}

export async function saveSetting(key: string, value: string, adminId: number) {
  const db = await requireDb();
  const [existing] = await db.select({ id: storeSettings.id }).from(storeSettings).where(eq(storeSettings.settingKey, key)).limit(1);
  if (existing) await db.update(storeSettings).set({ value, updatedBy: adminId }).where(eq(storeSettings.id, existing.id));
  else await db.insert(storeSettings).values({ settingKey: key, value, updatedBy: adminId });
}

export async function recordAudit(admin: AdminAccount, action: string, entity: string, entityId?: string | number, details?: string) {
  const db = await requireDb();
  await db.insert(auditLogs).values({
    adminId: admin.id,
    adminUsername: admin.username,
    action: action.slice(0, 80),
    entity: entity.slice(0, 80),
    entityId: entityId == null ? null : String(entityId).slice(0, 80),
    details: details?.slice(0, 4000) ?? null,
  });
}
