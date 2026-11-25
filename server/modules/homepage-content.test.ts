import { describe, expect, it } from "vitest";
import { DEFAULT_HOMEPAGE_CONTENT, homepageContentSchema, parseHomepageContent } from "../../shared/homepage-content";

describe("homepage content", () => {
  it("accepts the complete defaults and returns bilingual hero copy", () => {
    expect(homepageContentSchema.safeParse(DEFAULT_HOMEPAGE_CONTENT).success).toBe(true);
    expect(parseHomepageContent(DEFAULT_HOMEPAGE_CONTENT).hero.titleLead).toEqual({ ar: "أدوات رقمية،", en: "Digital tools," });
  });

  it("parses a stored JSON string", () => {
    const stored = JSON.stringify({ ...DEFAULT_HOMEPAGE_CONTENT, announcement: { ar: "إعلان جديد", en: "New announcement" } });
    expect(parseHomepageContent(stored).announcement).toEqual({ ar: "إعلان جديد", en: "New announcement" });
  });

  it("falls back to complete defaults for invalid or incomplete stored data", () => {
    expect(parseHomepageContent("not-json")).toEqual(DEFAULT_HOMEPAGE_CONTENT);
    expect(parseHomepageContent({ announcement: { ar: "ناقص", en: "incomplete" } })).toEqual(DEFAULT_HOMEPAGE_CONTENT);
    expect(homepageContentSchema.safeParse({ ...DEFAULT_HOMEPAGE_CONTENT, sections: { ...DEFAULT_HOMEPAGE_CONTENT.sections, featured: { ...DEFAULT_HOMEPAGE_CONTENT.sections.featured, order: 1001 } } }).success).toBe(false);
  });
});
