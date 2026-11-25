import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DEFAULT_HOMEPAGE_CONTENT, type HomepageContent, type LocalizedCopy } from "../../../shared/homepage-content";
import AdminSectionShell from "./AdminSectionShell";

type LanguageKey = "ar" | "en";
const languages: { key: LanguageKey; label: string }[] = [
  { key: "ar", label: "العربية" },
  { key: "en", label: "English" },
];

export default function AdminHomepageContent() {
  const query = trpc.adminSettings.homepageContent.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const save = trpc.adminSettings.saveHomepageContent.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.adminSettings.homepageContent.invalidate(),
        utils.storefront.settings.invalidate(),
      ]);
      toast.success("تم حفظ محتوى الصفحة الرئيسية");
    },
    onError: error => toast.error(error.message),
  });

  const setAtPath = (path: string[], value: string | boolean | number) => {
    setForm(current => {
      const next = structuredClone(current) as unknown as Record<string, unknown>;
      let target = next;
      for (const key of path.slice(0, -1)) target = target[key] as Record<string, unknown>;
      target[path[path.length - 1]] = value;
      return next as unknown as HomepageContent;
    });
  };

  const copyField = (label: string, path: string[], copy: LocalizedCopy) => (
    <div className="admin-copy-field" key={path.join("-")}>
      {languages.map(language => (
        <div className="field" key={language.key}>
          <label>{label} · {language.label}</label>
          <textarea
            dir={language.key === "ar" ? "rtl" : "ltr"}
            value={copy[language.key]}
            maxLength={1200}
            onChange={event => setAtPath([...path, language.key], event.target.value)}
          />
        </div>
      ))}
    </div>
  );

  const sectionControls = (sectionPath: string[], visible: boolean, order: number) => (
    <div className="admin-section-controls">
      <label><input type="checkbox" checked={visible} onChange={event => setAtPath([...sectionPath, "visible"], event.target.checked)} /> إظهار القسم في المتجر</label>
      <label>ترتيب الظهور بعد البطل <input type="number" min={0} max={1000} value={order} onChange={event => setAtPath([...sectionPath, "order"], Number(event.target.value))} /></label>
    </div>
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(form);
  };

  return (
    <AdminSectionShell title="محتوى الصفحة الرئيسية">
      <div className="admin-panel">
        <p>عدّل النصوص العربية والإنجليزية، وأخفِ أو رتّب أقسام الصفحة الرئيسية. إعدادات المحتوى تُحفظ في مخزن إعدادات المتجر الحالي؛ لا يلزم إنشاء جداول أو تشغيل migration.</p>
      </div>
      {query.isLoading ? <div className="loading-line">جارٍ تحميل المحتوى…</div> : query.error ? <div className="error-card">{query.error.message}</div> : (
        <form className="admin-home-content-form" onSubmit={submit}>
          <section className="admin-panel admin-home-content-section">
            <span className="eyebrow">ANNOUNCEMENT</span>
            <h2>شريط الإعلان</h2>
            {copyField("نص الشريط", ["announcement"], form.announcement)}
          </section>

          <section className="admin-panel admin-home-content-section">
            <span className="eyebrow">HERO / 01</span>
            <h2>الواجهة الرئيسية (Hero)</h2>
            <p className="section-note">المنطقة الأولى أعلى الصفحة؛ يمكن تحرير العنوان والوصف والأزرار ورسائل الثقة وبطاقة الهوية.</p>
            {copyField("السطر التعريفي", ["hero", "eyebrow"], form.hero.eyebrow)}
            {copyField("مقدمة العنوان", ["hero", "titleLead"], form.hero.titleLead)}
            {copyField("العبارة البارزة", ["hero", "titleEmphasis"], form.hero.titleEmphasis)}
            {copyField("الوصف", ["hero", "description"], form.hero.description)}
            {copyField("زر المنتجات", ["hero", "primaryCta"], form.hero.primaryCta)}
            {copyField("زر الأقسام", ["hero", "secondaryCta"], form.hero.secondaryCta)}
            {copyField("رسالة الثقة الأولى", ["hero", "proofOne"], form.hero.proofOne)}
            {copyField("رسالة الثقة الثانية", ["hero", "proofTwo"], form.hero.proofTwo)}
            {copyField("عنوان بطاقة المتجر", ["hero", "panelEyebrow"], form.hero.panelEyebrow)}
            {copyField("نص بطاقة المتجر", ["hero", "panelTitle"], form.hero.panelTitle)}
          </section>

          <section className="admin-panel admin-home-content-section">
            <span className="eyebrow">COLLECTIONS</span>
            <h2>قسم التصنيفات</h2>
            {sectionControls(["sections", "categories"], form.sections.categories.visible, form.sections.categories.order)}
            {copyField("العنوان الصغير", ["sections", "categories", "eyebrow"], form.sections.categories.eyebrow)}
            {copyField("عنوان القسم", ["sections", "categories", "title"], form.sections.categories.title)}
            {copyField("ملاحظة القسم", ["sections", "categories", "note"], form.sections.categories.note)}
          </section>

          <section className="admin-panel admin-home-content-section">
            <span className="eyebrow">FEATURED PRODUCTS</span>
            <h2>رف المنتجات المميزة</h2>
            {sectionControls(["sections", "featured"], form.sections.featured.visible, form.sections.featured.order)}
            {copyField("العنوان الصغير", ["sections", "featured", "eyebrow"], form.sections.featured.eyebrow)}
            {copyField("عنوان الرف", ["sections", "featured", "title"], form.sections.featured.title)}
          </section>

          <section className="admin-panel admin-home-content-section">
            <span className="eyebrow">MANIFESTO</span>
            <h2>المنطقة التعريفية</h2>
            {sectionControls(["sections", "manifesto"], form.sections.manifesto.visible, form.sections.manifesto.order)}
            {copyField("العنوان الصغير", ["sections", "manifesto", "eyebrow"], form.sections.manifesto.eyebrow)}
            {copyField("مقدمة العنوان", ["sections", "manifesto", "titleLead"], form.sections.manifesto.titleLead)}
            {copyField("العبارة البارزة", ["sections", "manifesto", "titleEmphasis"], form.sections.manifesto.titleEmphasis)}
            {copyField("النص التعريفي", ["sections", "manifesto", "body"], form.sections.manifesto.body)}
          </section>

          <section className="admin-panel admin-home-content-section">
            <span className="eyebrow">LATEST PRODUCTS</span>
            <h2>رف وصل حديثًا</h2>
            {sectionControls(["sections", "latest"], form.sections.latest.visible, form.sections.latest.order)}
            {copyField("العنوان الصغير", ["sections", "latest", "eyebrow"], form.sections.latest.eyebrow)}
            {copyField("عنوان الرف", ["sections", "latest", "title"], form.sections.latest.title)}
          </section>

          <section className="admin-panel admin-home-content-section">
            <span className="eyebrow">POPULAR PRODUCTS</span>
            <h2>رف الأكثر طلبًا</h2>
            {sectionControls(["sections", "popular"], form.sections.popular.visible, form.sections.popular.order)}
            {copyField("العنوان الصغير", ["sections", "popular", "eyebrow"], form.sections.popular.eyebrow)}
            {copyField("عنوان الرف", ["sections", "popular", "title"], form.sections.popular.title)}
          </section>

          <div className="admin-toolbar">
            <button className="button button-primary" disabled={save.isPending || query.isLoading}>
              <Save size={16} />{save.isPending ? "جارٍ الحفظ…" : "حفظ محتوى الصفحة"}
            </button>
          </div>
        </form>
      )}
    </AdminSectionShell>
  );
}
