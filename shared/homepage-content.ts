import { z } from "zod";

const localizedCopySchema = z.object({
  ar: z.string().max(1200),
  en: z.string().max(1200),
});

const orderedSectionSchema = z.object({
  visible: z.boolean(),
  order: z.number().int().min(0).max(1000),
  eyebrow: localizedCopySchema,
  title: localizedCopySchema,
});

export const homepageContentSchema = z.object({
  announcement: localizedCopySchema,
  hero: z.object({
    eyebrow: localizedCopySchema,
    titleLead: localizedCopySchema,
    titleEmphasis: localizedCopySchema,
    description: localizedCopySchema,
    primaryCta: localizedCopySchema,
    secondaryCta: localizedCopySchema,
    proofOne: localizedCopySchema,
    proofTwo: localizedCopySchema,
    panelEyebrow: localizedCopySchema,
    panelTitle: localizedCopySchema,
  }),
  sections: z.object({
    categories: orderedSectionSchema.extend({ note: localizedCopySchema }),
    featured: orderedSectionSchema,
    manifesto: z.object({
      visible: z.boolean(),
      order: z.number().int().min(0).max(1000),
      eyebrow: localizedCopySchema,
      titleLead: localizedCopySchema,
      titleEmphasis: localizedCopySchema,
      body: localizedCopySchema,
    }),
    latest: orderedSectionSchema,
    popular: orderedSectionSchema,
  }),
});

export type HomepageContent = z.infer<typeof homepageContentSchema>;
export type LocalizedCopy = z.infer<typeof localizedCopySchema>;
export type OrderedHomepageSection = z.infer<typeof orderedSectionSchema>;

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  announcement: {
    ar: "تجربة رقمية موثوقة، من البداية للنهاية",
    en: "A clearer way to discover digital tools",
  },
  hero: {
    eyebrow: { ar: "مكتبة رقمية منتقاة", en: "A curated digital shelf" },
    titleLead: { ar: "أدوات رقمية،", en: "Digital tools," },
    titleEmphasis: { ar: "بلا تعقيد.", en: "without the noise." },
    description: {
      ar: "اكتشف أدوات وخدمات رقمية واضحة التفاصيل، مع طلب مباشر وتواصل سهل.",
      en: "Discover digital tools and services with clear details, simple ordering, and direct support.",
    },
    primaryCta: { ar: "استكشف المنتجات", en: "Explore products" },
    secondaryCta: { ar: "استكشف الأقسام", en: "Browse categories" },
    proofOne: { ar: "تفاصيل واضحة قبل الطلب", en: "Clear details before ordering" },
    proofTwo: { ar: "قائمة منتجات قابلة للتحديث", en: "A catalog that stays current" },
    panelEyebrow: { ar: "الوصول", en: "ACCESS" },
    panelTitle: { ar: "منتجات رقمية مختارة", en: "Digital essentials" },
  },
  sections: {
    categories: {
      visible: true,
      order: 10,
      eyebrow: { ar: "01 / COLLECTIONS", en: "01 / COLLECTIONS" },
      title: { ar: "تصفّح حسب اهتمامك", en: "Browse by interest" },
      note: { ar: "أقسام يمكن تحديثها من الإدارة", en: "Categories managed from admin" },
    },
    featured: {
      visible: true,
      order: 20,
      eyebrow: { ar: "02 / FEATURED", en: "02 / FEATURED" },
      title: { ar: "اختيارات Valkor", en: "Valkor picks" },
    },
    manifesto: {
      visible: true,
      order: 30,
      eyebrow: { ar: "طريقة أوضح للشراء", en: "A clearer way to order" },
      titleLead: { ar: "نعرض التفاصيل.", en: "We show the details." },
      titleEmphasis: { ar: "وأنت تقرر.", en: "You decide." },
      body: {
        ar: "تعرّف على المواصفات والسعر والتوفر قبل الطلب. تُسجّل الطلبات في المتجر أولًا، ثم تنتقل لمتابعة التواصل عبر واتساب.",
        en: "Review specifications, price, and availability before ordering. Orders are saved in the store first, then followed up via WhatsApp.",
      },
    },
    latest: {
      visible: true,
      order: 40,
      eyebrow: { ar: "03 / LATEST", en: "03 / LATEST" },
      title: { ar: "وصل حديثًا", en: "Recently added" },
    },
    popular: {
      visible: true,
      order: 50,
      eyebrow: { ar: "04 / POPULAR", en: "04 / POPULAR" },
      title: { ar: "الأكثر طلبًا", en: "Most ordered" },
    },
  },
};

export function parseHomepageContent(value: unknown): HomepageContent {
  let candidate = value;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value);
    } catch {
      return DEFAULT_HOMEPAGE_CONTENT;
    }
  }
  const result = homepageContentSchema.safeParse(candidate);
  return result.success ? result.data : DEFAULT_HOMEPAGE_CONTENT;
}
