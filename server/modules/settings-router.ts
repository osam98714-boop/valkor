import { asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { communityListings, currencies, socialLinks } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import { readSettings, recordAudit, requireDb, saveSetting } from "./common";

const themeIds = ["gold-light", "gold-dark", "electric-dark", "crimson-dark"] as const;
const urlSchema = z.string().trim().url().max(1024).refine(value => value.startsWith("https://"), "يجب أن يبدأ الرابط بـ https://");
export const settingsAdminRouter = router({
  all: adminProcedure("settings.write").query(async () => {
    const [settings, db] = await Promise.all([readSettings(), requireDb()]);
    const currencyRows = await db.select().from(currencies).orderBy(desc(currencies.isDefault), asc(currencies.name));
    return { settings, currencies: currencyRows };
  }),
  update: adminProcedure("settings.write").input(z.object({ values: z.record(z.string().max(100), z.string().max(4000)) })).mutation(async ({ input, ctx }) => {
    const allowed: Record<string, (value: string) => boolean> = {
      store_name: value => value.trim().length >= 2 && value.length <= 120,
      store_description_ar: value => value.length <= 2000,
      store_description_en: value => value.length <= 2000,
      whatsapp_number: value => /^[+\d\s().-]{6,32}$/.test(value),
      avatar_url: value => value === "" || (value.startsWith("/manus-storage/") && value.length <= 1024),
      default_language: value => ["ar", "en"].includes(value),
      default_theme: value => (themeIds as readonly string[]).includes(value),
      maintenance_message_ar: value => value.length <= 1200,
      maintenance_message_en: value => value.length <= 1200,
      default_currency: value => value.length <= 16,
      maintenance_enabled: value => ["true", "false"].includes(value),
    };
    for (const [key, value] of Object.entries(input.values)) {
      if (!allowed[key] || !allowed[key](value)) throw new TRPCError({ code: "BAD_REQUEST", message: `قيمة الإعداد ${key} غير صالحة` });
      if (key === "maintenance_enabled" && value === "true" && !ctx.admin.enabled) throw new TRPCError({ code: "FORBIDDEN" });
    }
    for (const [key, value] of Object.entries(input.values)) await saveSetting(key, value, ctx.admin.id);
    await recordAudit(ctx.admin, "update", "settings", undefined, Object.keys(input.values).join(","));
    return { success: true };
  }),
  currencies: adminProcedure("currencies.write").query(async () => (await requireDb()).select().from(currencies).orderBy(desc(currencies.isDefault), asc(currencies.name))),
  saveCurrency: adminProcedure("currencies.write").input(z.object({ id: z.number().int().positive().optional(), code: z.string().trim().toUpperCase().min(1).max(16).regex(/^[A-Z0-9_-]+$/), name: z.string().trim().min(1).max(100), symbol: z.string().trim().max(24), displayFormat: z.string().trim().min(1).max(80), exchangeRate: z.string().regex(/^\d+(\.\d{1,6})?$/), isDefault: z.boolean(), enabled: z.boolean() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    if (Number(input.exchangeRate) <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "سعر التحويل يجب أن يكون أكبر من صفر" });
    if (input.isDefault) await db.update(currencies).set({ isDefault: false });
    const values = { code: input.code, name: input.name, symbol: input.symbol, displayFormat: input.displayFormat, exchangeRate: input.exchangeRate, isDefault: input.isDefault, enabled: input.enabled };
    if (input.id) await db.update(currencies).set(values).where(eq(currencies.id, input.id));
    else await db.insert(currencies).values(values);
    if (input.isDefault) await saveSetting("default_currency", input.code, ctx.admin.id);
    await recordAudit(ctx.admin, input.id ? "update" : "create", "currency", input.id, `code=${input.code};default=${input.isDefault}`);
    return { success: true };
  }),
  deleteCurrency: adminProcedure("currencies.write").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [currency] = await db.select().from(currencies).where(eq(currencies.id, input.id)).limit(1);
    if (!currency) return { success: true };
    if (currency.isDefault) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "اختر عملة افتراضية أخرى قبل حذف هذه العملة" });
    await db.delete(currencies).where(eq(currencies.id, input.id));
    await recordAudit(ctx.admin, "delete", "currency", input.id, `code=${currency.code}`);
    return { success: true };
  }),
  socialLinks: adminProcedure("content.write").query(async () => (await requireDb()).select().from(socialLinks).orderBy(asc(socialLinks.sortOrder))),
  saveSocialLink: adminProcedure("content.write").input(z.object({ id: z.number().int().positive().optional(), label: z.string().trim().min(2).max(120), url: urlSchema, platform: z.string().trim().min(2).max(40), location: z.enum(["footer", "menu", "contact"]), sortOrder: z.number().int().min(0).max(10000), visible: z.boolean() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const values = { label: input.label, url: input.url, platform: input.platform, location: input.location, sortOrder: input.sortOrder, visible: input.visible };
    if (input.id) await db.update(socialLinks).set(values).where(eq(socialLinks.id, input.id)); else await db.insert(socialLinks).values(values);
    await recordAudit(ctx.admin, input.id ? "update" : "create", "social_link", input.id, input.url);
    return { success: true };
  }),
  deleteSocialLink: adminProcedure("content.write").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    await (await requireDb()).delete(socialLinks).where(eq(socialLinks.id, input.id));
    await recordAudit(ctx.admin, "delete", "social_link", input.id);
    return { success: true };
  }),
  communities: adminProcedure("communities.write").query(async () => (await requireDb()).select().from(communityListings).orderBy(desc(communityListings.createdAt))),
  saveCommunity: adminProcedure("communities.write").input(z.object({ id: z.number().int().positive().optional(), kind: z.enum(["group", "channel"]), nameAr: z.string().trim().min(2).max(200), nameEn: z.string().trim().min(2).max(200), imageUrl: z.string().max(1024).nullable().optional(), descriptionAr: z.string().max(5000).optional(), descriptionEn: z.string().max(5000).optional(), deliveryInfo: z.string().max(5000).optional(), price: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/), currencyCode: z.string().max(16).nullable().optional(), available: z.boolean(), published: z.boolean() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    if (input.published && !input.currencyCode) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "حدد العملة قبل نشر العنصر" });
    const values = { kind: input.kind, nameAr: input.nameAr, nameEn: input.nameEn, imageUrl: input.imageUrl ?? null, descriptionAr: input.descriptionAr ?? null, descriptionEn: input.descriptionEn ?? null, deliveryInfo: input.deliveryInfo ?? null, price: input.price, currencyCode: input.currencyCode ?? null, available: input.available, published: input.published, createdBy: ctx.admin.id };
    if (input.id) await db.update(communityListings).set(values).where(eq(communityListings.id, input.id)); else await db.insert(communityListings).values(values);
    await recordAudit(ctx.admin, input.id ? "update" : "create", "community_listing", input.id, input.kind);
    return { success: true };
  }),
  deleteCommunity: adminProcedure("communities.write").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    await (await requireDb()).delete(communityListings).where(eq(communityListings.id, input.id));
    await recordAudit(ctx.admin, "delete", "community_listing", input.id);
    return { success: true };
  }),
});
