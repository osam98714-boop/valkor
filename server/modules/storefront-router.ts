import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { categories, communityListings, currencies, customers, orderItems, orders, products, socialLinks, storeSettings } from "../../drizzle/schema";
import { getDb } from "../db";
import { publicProcedure, router } from "../_core/trpc";

const orderLineInput = z.union([
  z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) }),
  z.object({ communityId: z.number().int().positive(), quantity: z.literal(1) }),
]);
const orderInput = z.object({
  customerName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(6).max(32).regex(/^[+\d\s().-]+$/),
  telegramId: z.string().trim().max(100).optional().default(""),
  items: z.array(orderLineInput).min(1).max(30),
});

function cents(value: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "قيمة سعر غير صالحة" });
  return Math.round(amount * 100);
}
function money(value: number) { return (value / 100).toFixed(2); }

async function publicSettings() {
  const db = await getDb();
  if (!db) return { maintenance: true, maintenanceMessageAr: "قاعدة البيانات غير مهيأة بعد.", maintenanceMessageEn: "The store database is not configured yet.", storeName: "Valkor", descriptionAr: "", descriptionEn: "", whatsappNumber: "", avatarUrl: "", theme: "gold-light", defaultLanguage: "ar", defaultCurrency: "" };
  const rows = await db.select().from(storeSettings);
  const map = Object.fromEntries(rows.map(row => [row.settingKey, row.value]));
  return {
    maintenance: map.maintenance_enabled === "true",
    maintenanceMessageAr: map.maintenance_message_ar ?? "المتجر قيد الصيانة حاليًا.",
    maintenanceMessageEn: map.maintenance_message_en ?? "The store is under maintenance.",
    storeName: map.store_name ?? "Valkor",
    descriptionAr: map.store_description_ar ?? "",
    descriptionEn: map.store_description_en ?? "",
    whatsappNumber: map.whatsapp_number ?? "",
    avatarUrl: map.avatar_url ?? "",
    theme: map.default_theme ?? "gold-light",
    defaultLanguage: map.default_language ?? "ar",
    defaultCurrency: map.default_currency ?? "",
  };
}

export const storefrontRouter = router({
  settings: publicProcedure.query(() => publicSettings()),
  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(categories).where(eq(categories.visible, true)).orderBy(asc(categories.sortOrder), asc(categories.nameAr));
  }),
  products: publicProcedure.input(z.object({
    categorySlug: z.string().optional(), q: z.string().trim().max(100).optional(), featured: z.boolean().optional(),
    sort: z.enum(["newest", "popular", "price_asc", "price_desc"]).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const filters = [eq(products.published, true), eq(products.status, "available")];
    if (input?.categorySlug) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.slug, input.categorySlug), eq(categories.visible, true))).limit(1);
      if (!category) return [];
      filters.push(eq(products.categoryId, category.id));
    }
    if (input?.featured) filters.push(eq(products.featured, true));
    if (input?.q) {
      const pattern = `%${input.q}%`;
      filters.push(or(like(products.nameAr, pattern), like(products.nameEn, pattern), like(products.shortDescriptionAr, pattern), like(products.shortDescriptionEn, pattern))!);
    }
    const orderBy = input?.sort === "popular" ? desc(products.orderCount)
      : input?.sort === "price_asc" ? asc(products.price)
      : input?.sort === "price_desc" ? desc(products.price)
      : desc(products.createdAt);
    return db.select().from(products).where(and(...filters)).orderBy(orderBy).limit(100);
  }),
  product: publicProcedure.input(z.object({ slug: z.string().min(1).max(180) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const [product] = await db.select().from(products).where(and(eq(products.slug, input.slug), eq(products.published, true))).limit(1);
    return product ?? null;
  }),
  currencies: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(currencies).where(eq(currencies.enabled, true)).orderBy(desc(currencies.isDefault), asc(currencies.name));
  }),
  communities: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(communityListings).where(and(eq(communityListings.published, true), eq(communityListings.available, true))).orderBy(desc(communityListings.createdAt));
  }),
  socialLinks: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(socialLinks).where(eq(socialLinks.visible, true)).orderBy(asc(socialLinks.sortOrder));
  }),
  createOrder: publicProcedure.input(orderInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "قاعدة البيانات غير مهيأة؛ لم يُسجّل الطلب" });
    const settingsRows = await db.select().from(storeSettings).where(inArray(storeSettings.settingKey, ["maintenance_enabled", "whatsapp_number"]));
    const settingMap = Object.fromEntries(settingsRows.map(row => [row.settingKey, row.value]));
    if (settingMap.maintenance_enabled === "true") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "الشراء متوقف مؤقتًا بسبب الصيانة" });
    const [currency] = await db.select().from(currencies).where(and(eq(currencies.isDefault, true), eq(currencies.enabled, true))).limit(1);
    if (!currency) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لم يحدد المدير عملة افتراضية بعد؛ لم يُسجّل الطلب" });
    const productIds = input.items.flatMap(item => "productId" in item ? [item.productId] : []);
    const communityIds = input.items.flatMap(item => "communityId" in item ? [item.communityId] : []);
    if (new Set(productIds).size !== productIds.length || new Set(communityIds).size !== communityIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "لا تكرر العنصر في الطلب" });
    const orderNo = `VLKR-${randomInt(0, 1_000_000).toString().padStart(6, "0")}`;
    const created = await db.transaction(async tx => {
      const productRows = productIds.length ? await tx.select().from(products).where(inArray(products.id, productIds)).for("update") : [];
      const communityRows = communityIds.length ? await tx.select().from(communityListings).where(inArray(communityListings.id, communityIds)).for("update") : [];
      if (productRows.length !== productIds.length || communityRows.length !== communityIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "أحد العناصر لم يعد موجودًا" });
      const byProduct = new Map(productRows.map(row => [row.id, row]));
      const byCommunity = new Map(communityRows.map(row => [row.id, row]));
      let totalCents = 0;
      const prepared = input.items.map(item => {
        if ("productId" in item) {
          const product = byProduct.get(item.productId)!;
          if (!product.published || product.status !== "available") throw new TRPCError({ code: "PRECONDITION_FAILED", message: `المنتج ${product.nameAr} غير متوفر` });
          const productCurrency = product.currencyCode || currency.code;
          if (productCurrency !== currency.code) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `عملة المنتج ${product.nameAr} لا تطابق العملة الافتراضية` });
          if (product.trackInventory && product.quantity < item.quantity) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `الكمية المتاحة من ${product.nameAr} أقل من المطلوب` });
          const unitCents = cents(product.price); totalCents += unitCents * item.quantity;
          return { kind: "product" as const, product, community: null, quantity: item.quantity, unitCents, sku: product.sku, name: product.nameAr, specifications: product.specifications ?? "" };
        }
        const community = byCommunity.get(item.communityId)!;
        if (!community.published || !community.available) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `العنصر ${community.nameAr} غير متوفر` });
        if ((community.currencyCode || currency.code) !== currency.code) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `عملة العنصر ${community.nameAr} لا تطابق العملة الافتراضية` });
        const unitCents = cents(community.price); totalCents += unitCents;
        return { kind: "community" as const, product: null, community, quantity: 1, unitCents, sku: `VLKR-${community.kind.toUpperCase()}-${community.id}`, name: community.nameAr, specifications: [community.deliveryInfo, community.descriptionAr].filter(Boolean).join("\n") };
      });
      const phone = input.phone.replace(/[\s().-]/g, "");
      const [existingCustomer] = await tx.select().from(customers).where(eq(customers.phone, phone)).limit(1);
      let customerId: number;
      if (existingCustomer) { customerId = existingCustomer.id; await tx.update(customers).set({ name: input.customerName, telegramId: input.telegramId || null }).where(eq(customers.id, customerId)); }
      else {
        await tx.insert(customers).values({ name: input.customerName, phone, telegramId: input.telegramId || null });
        const [newCustomer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.phone, phone)).limit(1);
        if (!newCustomer) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر حفظ بيانات العميل" }); customerId = newCustomer.id;
      }
      await tx.insert(orders).values({ orderNo, customerId, status: "new", currencyCode: currency.code, currencyName: currency.name, currencySymbol: currency.symbol, subtotal: money(totalCents), total: money(totalCents) });
      const [order] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
      if (!order) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء الطلب" });
      await tx.insert(orderItems).values(prepared.map(line => ({ orderId: order.id, productId: line.product?.id ?? null, skuSnapshot: line.sku, nameSnapshot: line.name, specificationsSnapshot: line.specifications, quantity: line.quantity, unitPrice: money(line.unitCents), currencyCode: currency.code })));
      for (const line of prepared) if (line.product) {
        const product = line.product;
        await tx.update(products).set({ ...(product.trackInventory ? { quantity: product.quantity - line.quantity } : {}), orderCount: product.orderCount + line.quantity }).where(eq(products.id, product.id));
      }
      return { orderNo, total: money(totalCents), currency, prepared, phone };
    });
    const detailLines = created.prepared.map(line => `${line.name} (${line.sku}) — الكمية: ${line.quantity} — السعر: ${money(line.unitCents)} × ${line.quantity} ${created.currency.symbol}\nالتفاصيل: ${line.specifications || "غير مضافة"}`).join("\n\n");
    const message = ["السلام عليكم، أريد إتمام طلبي من متجر Valkor.", "", "الاختصار: VLKR", `رقم الطلب: ${created.orderNo}`, `اسمي: ${input.customerName}`, `رقم الهاتف: ${created.phone}`, `Telegram ID: ${input.telegramId || "غير متوفر"}`, "", "المنتجات المطلوبة:", detailLines, "", `الإجمالي: ${created.total}`, `العملة: ${created.currency.name} (${created.currency.code})`, "", "يرجى إتمام الطلب."].join("\n");
    const whatsappPhone = (settingMap.whatsapp_number || "").replace(/\D/g, "");
    return { orderNo: created.orderNo, total: created.total, currencyName: created.currency.name, currencySymbol: created.currency.symbol, message, whatsappUrl: whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}` : null };
  }),
});
