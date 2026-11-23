import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { categories, orderItems, products } from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { router } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import { recordAudit, requireDb } from "./common";

const status = z.enum(["available", "unavailable", "sold_out", "maintenance", "hidden"]);
const productInput = z.object({
  sku: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_-]+$/),
  slug: z.string().trim().max(180).optional(),
  nameAr: z.string().trim().min(2).max(200), nameEn: z.string().trim().min(2).max(200),
  categoryId: z.number().int().positive().nullable().optional(),
  imageUrl: z.string().max(1024).nullable().optional(), extraImages: z.array(z.string().max(1024)).max(12).optional(),
  shortDescriptionAr: z.string().max(1500).optional(), shortDescriptionEn: z.string().max(1500).optional(),
  descriptionAr: z.string().max(12000).optional(), descriptionEn: z.string().max(12000).optional(),
  specifications: z.string().max(12000).optional(), features: z.string().max(12000).optional(), usageInstructions: z.string().max(12000).optional(),
  price: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/), currencyCode: z.string().trim().max(16).nullable().optional(),
  status, quantity: z.number().int().min(0).max(1000000), trackInventory: z.boolean(), featured: z.boolean(), published: z.boolean(),
  policyConfirmed: z.boolean().optional(),
});

const blockedProductIntent = [
  /steal.{0,20}(password|credential|account|token|otp)/i, /phish|spyware|keylogg|credential.?steal/i,
  /سرق.{0,20}(حساب|كلمة.?مرور|رمز|تحقق)/i, /تصيد|تجسس|سرقة.?الحساب|سرقة.?كلمات.?المرور/,
  /اخترق.{0,20}(حساب|جهاز|هاتف|شبكة).{0,20}(بدون|دون).{0,10}تصريح/,
];
function assertAllowed(input: { nameAr: string; nameEn: string; descriptionAr?: string; descriptionEn?: string; specifications?: string; features?: string; usageInstructions?: string; published: boolean; policyConfirmed?: boolean }) {
  const text = [input.nameAr, input.nameEn, input.descriptionAr, input.descriptionEn, input.specifications, input.features, input.usageInstructions].filter(Boolean).join("\n");
  if (input.published && blockedProductIntent.some(pattern => pattern.test(text))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "رُفض النشر لأن الوصف يشير إلى سرقة أو تجسس أو تصيد أو اختراق غير مصرح. يسمح فقط بالاستخدامات القانونية والمصرح بها." });
  }
  if (input.published && /cyber|security|اختبار اختراق|penetration test|استغلال ثغرة/i.test(text) && !input.policyConfirmed) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "أكد أن المنتج مخصص للحماية أو الاختبار المصرح به قبل نشره" });
  }
}
function generatedSlug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 160) || `product-${randomUUID().slice(0, 12)}`;
}

export const catalogAdminRouter = router({
  listProducts: adminProcedure("products.read").input(z.object({ q: z.string().trim().max(100).optional(), includeHidden: z.boolean().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const filters = [];
    if (!input?.includeHidden) filters.push(eq(products.published, true));
    if (input?.q) { const p = `%${input.q}%`; filters.push(or(like(products.nameAr, p), like(products.nameEn, p), like(products.sku, p))!); }
    return filters.length ? db.select().from(products).where(and(...filters)).orderBy(asc(products.createdAt)) : db.select().from(products).orderBy(asc(products.createdAt));
  }),
  productById: adminProcedure("products.read").input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
    return row ?? null;
  }),
  saveProduct: adminProcedure("products.write").input(productInput.extend({ id: z.number().int().positive().optional() })).mutation(async ({ input, ctx }) => {
    assertAllowed(input);
    const db = await requireDb();
    if (input.published && !input.currencyCode) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "حدد عملة للمنتج قبل نشره" });
    if (input.published && input.status === "available" && input.trackInventory && input.quantity < 1) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يمكن نشر منتج متوفر بمخزون صفري" });
    if (input.categoryId) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId)).limit(1);
      if (!category) throw new TRPCError({ code: "BAD_REQUEST", message: "القسم المحدد غير موجود" });
    }
    const sku = input.sku.trim();
    const slug = (input.slug?.trim() || generatedSlug(input.nameEn || sku)).slice(0, 180);
    const values = {
      sku, slug, nameAr: input.nameAr, nameEn: input.nameEn, categoryId: input.categoryId ?? null,
      imageUrl: input.imageUrl || null, extraImages: input.extraImages ?? [],
      shortDescriptionAr: input.shortDescriptionAr || null, shortDescriptionEn: input.shortDescriptionEn || null,
      descriptionAr: input.descriptionAr || null, descriptionEn: input.descriptionEn || null,
      specifications: input.specifications || null, features: input.features || null, usageInstructions: input.usageInstructions || null,
      price: input.price, currencyCode: input.currencyCode || null, status: input.status, quantity: input.quantity,
      trackInventory: input.trackInventory, featured: input.featured, published: input.published,
      updatedBy: ctx.admin.id,
    };
    if (input.id) {
      const [old] = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
      if (!old) throw new TRPCError({ code: "NOT_FOUND", message: "المنتج غير موجود" });
      await db.update(products).set(values).where(eq(products.id, input.id));
      await recordAudit(ctx.admin, "update", "product", input.id, `sku=${sku};published=${input.published}`);
      const [updated] = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
      return updated;
    }
    const [duplicate] = await db.select({ id: products.id }).from(products).where(or(eq(products.sku, sku), eq(products.slug, slug))).limit(1);
    if (duplicate) throw new TRPCError({ code: "CONFLICT", message: "رقم المنتج أو رابطه مستخدم مسبقًا" });
    await db.insert(products).values({ ...values, createdBy: ctx.admin.id });
    const [created] = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
    if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء المنتج" });
    await recordAudit(ctx.admin, "create", "product", created.id, `sku=${sku};published=${input.published}`);
    return created;
  }),
  deleteProduct: adminProcedure("products.delete").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [existing] = await db.select({ id: products.id, sku: products.sku }).from(products).where(eq(products.id, input.id)).limit(1);
    if (!existing) return { success: true };
    await db.delete(products).where(eq(products.id, input.id));
    await recordAudit(ctx.admin, "delete", "product", input.id, `sku=${existing.sku}`);
    return { success: true };
  }),
  uploadImage: adminProcedure("products.write").input(z.object({ fileName: z.string().max(180), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataBase64: z.string().max(7_000_000) })).mutation(async ({ input }) => {
    const data = Buffer.from(input.dataBase64, "base64");
    if (!data.length || data.length > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "حجم الصورة يجب ألا يتجاوز 5MB" });
    const valid = input.contentType === "image/png" ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : input.contentType === "image/jpeg" ? data[0] === 0xff && data[1] === 0xd8 && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9
      : data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
    if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "محتوى الملف لا يطابق نوع الصورة" });
    const extension = input.contentType === "image/jpeg" ? "jpg" : input.contentType.split("/")[1];
    const stored = await storagePut(`valkor/products/${randomUUID()}.${extension}`, data, input.contentType);
    return { url: stored.url, key: stored.key };
  }),
  listCategories: adminProcedure("products.read").query(async () => (await requireDb()).select().from(categories).orderBy(asc(categories.sortOrder))),
  saveCategory: adminProcedure("categories.write").input(z.object({ id: z.number().int().positive().optional(), slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/), nameAr: z.string().trim().min(2).max(160), nameEn: z.string().trim().min(2).max(160), navLabelAr: z.string().max(160).optional(), navLabelEn: z.string().max(160).optional(), sortOrder: z.number().int().min(0).max(10000), visible: z.boolean() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const values = { slug: input.slug, nameAr: input.nameAr, nameEn: input.nameEn, navLabelAr: input.navLabelAr || null, navLabelEn: input.navLabelEn || null, sortOrder: input.sortOrder, visible: input.visible };
    if (input.id) await db.update(categories).set(values).where(eq(categories.id, input.id));
    else await db.insert(categories).values(values);
    await recordAudit(ctx.admin, input.id ? "update" : "create", "category", input.id, `slug=${input.slug}`);
    return { success: true };
  }),
  deleteCategory: adminProcedure("categories.write").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [hasProducts] = await db.select({ id: products.id }).from(products).where(eq(products.categoryId, input.id)).limit(1);
    if (hasProducts) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "انقل المنتجات إلى قسم آخر أو احذفها أولًا" });
    await db.delete(categories).where(eq(categories.id, input.id));
    await recordAudit(ctx.admin, "delete", "category", input.id);
    return { success: true };
  }),
});
