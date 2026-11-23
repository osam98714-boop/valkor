import { eq } from "drizzle-orm";
import { categories, currencies, storeSettings } from "../drizzle/schema";
import { getDb } from "../server/db";

const seedCategories = [
  ["whatsapp-bots", "بوتات واتساب", "WhatsApp Bots"],
  ["technical-tools", "أدوات تقنية", "Technical Tools"],
  ["digital-services", "خدمات رقمية", "Digital Services"],
  ["learning-guides", "شروحات تعليمية", "Learning Guides"],
  ["groups-channels", "جروبات وقنوات", "Groups & Channels"],
  ["other-products", "منتجات أخرى", "Other Products"],
] as const;

const seedSettings: Record<string, string> = {
  store_name: "Valkor",
  store_description_ar: "منتجات رقمية وأدوات تقنية وخدمات متخصصة.",
  store_description_en: "Digital products, technical tools, and specialist services.",
  whatsapp_number: "962771111377",
  default_language: "ar",
  default_theme: "gold-light",
  avatar_url: "",
  maintenance_enabled: "false",
  maintenance_message_ar: "المتجر قيد الصيانة حاليًا. نعود إليكم قريبًا.",
  maintenance_message_en: "The store is under maintenance. Please check back soon.",
};

const db = await getDb();
if (!db) throw new Error("DATABASE_URL غير متاح؛ تعذر تهيئة بيانات المتجر");
for (let index = 0; index < seedCategories.length; index++) {
  const [slug, nameAr, nameEn] = seedCategories[index];
  const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!existing) await db.insert(categories).values({ slug, nameAr, nameEn, sortOrder: index + 1, visible: true });
}
const [existingCurrency] = await db.select({ id: currencies.id }).from(currencies).where(eq(currencies.code, "JOD")).limit(1);
if (!existingCurrency) await db.insert(currencies).values({ code: "JOD", name: "Jordanian Dinar", symbol: "د.أ", displayFormat: "amount symbol", exchangeRate: "1", isDefault: true, enabled: true });
const [defaultCurrency] = await db.select({ id: currencies.id }).from(currencies).where(eq(currencies.isDefault, true)).limit(1);
if (defaultCurrency) {
  const [savedDefault] = await db.select({ id: storeSettings.id }).from(storeSettings).where(eq(storeSettings.settingKey, "default_currency")).limit(1);
  if (!savedDefault) await db.insert(storeSettings).values({ settingKey: "default_currency", value: "JOD" });
}

for (const [settingKey, value] of Object.entries(seedSettings)) {
  const [existing] = await db.select({ id: storeSettings.id }).from(storeSettings).where(eq(storeSettings.settingKey, settingKey)).limit(1);
  if (!existing) await db.insert(storeSettings).values({ settingKey, value });
}
console.log("تهيئة الأقسام والإعدادات الافتراضية اكتملت؛ لم تُنشأ منتجات أو طلبات تجريبية.");
process.exit(0);
