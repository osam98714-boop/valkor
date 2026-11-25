import { useState } from "react";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminSectionShell from "./AdminSectionShell";

type CategoryForm = {
  id?: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  navLabelAr: string;
  navLabelEn: string;
  sortOrder: number;
  visible: boolean;
};

const emptyForm = (): CategoryForm => ({
  slug: "",
  nameAr: "",
  nameEn: "",
  navLabelAr: "",
  navLabelEn: "",
  sortOrder: 0,
  visible: true,
});

export default function AdminCategoriesPage() {
  const query = trpc.adminCatalog.listCategories.useQuery();
  const me = trpc.adminAuth.me.useQuery();
  const canReadProducts = me.data?.permissions.includes("products.read") ?? false;
  const products = trpc.adminCatalog.listProducts.useQuery({ includeHidden: true }, { enabled: canReadProducts });
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const canWrite = me.data?.permissions.includes("categories.write") ?? false;

  const save = trpc.adminCatalog.saveCategory.useMutation({
    onSuccess: async () => {
      await query.refetch();
      toast.success(form.id ? "تم تحديث القسم" : "تمت إضافة القسم");
      setForm(emptyForm());
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.adminCatalog.deleteCategory.useMutation({
    onSuccess: async () => {
      await query.refetch();
      toast.success("تم حذف القسم");
    },
    onError: error => toast.error(error.message),
  });

  const beginEdit = (category: NonNullable<typeof query.data>[number]) => {
    setForm({
      id: category.id,
      slug: category.slug,
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      navLabelAr: category.navLabelAr ?? "",
      navLabelEn: category.navLabelEn ?? "",
      sortOrder: category.sortOrder,
      visible: category.visible,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate({ ...form });
  };

  return (
    <AdminSectionShell title="أقسام المنتجات">
      <div className="admin-panel">
        <p>هذه الأقسام تغذي تصفح الصفحة الرئيسية وقائمة المتجر. عدّل الاسم، تسمية القائمة، ترتيب العرض أو الظهور؛ ستنعكس التغييرات في المتجر دون تعديل الكود.</p>
      </div>

      {canWrite && (
        <form className="form-card admin-form-grid admin-category-form" onSubmit={submit}>
          <h2>{form.id ? "تعديل القسم" : "إضافة قسم جديد"}</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="category-name-ar">الاسم العربي</label>
              <input id="category-name-ar" required maxLength={160} value={form.nameAr} onChange={event => setForm(current => ({ ...current, nameAr: event.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="category-name-en">Name in English</label>
              <input id="category-name-en" required maxLength={160} value={form.nameEn} onChange={event => setForm(current => ({ ...current, nameEn: event.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="category-slug">الرابط المختصر (أحرف لاتينية وأرقام وشرطة)</label>
              <input id="category-slug" required pattern="[a-z0-9-]+" maxLength={100} value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value.toLowerCase() }))} />
            </div>
            <div className="field">
              <label htmlFor="category-order">ترتيب الظهور</label>
              <input id="category-order" type="number" min={0} max={10000} value={form.sortOrder} onChange={event => setForm(current => ({ ...current, sortOrder: Number(event.target.value) }))} />
            </div>
            <div className="field">
              <label htmlFor="category-nav-ar">تسمية القائمة بالعربية (اختياري)</label>
              <input id="category-nav-ar" maxLength={160} value={form.navLabelAr} onChange={event => setForm(current => ({ ...current, navLabelAr: event.target.value }))} placeholder="يُستخدم الاسم العربي إن تُرك فارغًا" />
            </div>
            <div className="field">
              <label htmlFor="category-nav-en">Navigation label in English (optional)</label>
              <input id="category-nav-en" maxLength={160} value={form.navLabelEn} onChange={event => setForm(current => ({ ...current, navLabelEn: event.target.value }))} placeholder="Uses the English name when blank" />
            </div>
          </div>
          <div className="admin-checks">
            <label><input type="checkbox" checked={form.visible} onChange={event => setForm(current => ({ ...current, visible: event.target.checked }))} /> إظهار القسم في المتجر</label>
          </div>
          <div className="admin-toolbar">
            <button className="button button-primary" disabled={save.isPending}>
              {save.isPending ? "جارٍ الحفظ…" : form.id ? "حفظ تعديلات القسم" : <><Plus size={15} /> إضافة القسم</>}
            </button>
            {form.id && <button type="button" className="button button-secondary" onClick={() => setForm(emptyForm())}><RotateCcw size={15} /> إلغاء التعديل</button>}
          </div>
        </form>
      )}

      {!canWrite && <div className="alert-box">يمكنك استعراض الأقسام، لكن يلزم إذن categories.write لإضافتها أو تعديلها أو حذفها.</div>}

      <section className="admin-panel">
        <div className="section-heading">
          <div><span className="eyebrow">STORE CATEGORIES</span><h2>الأقسام الحالية</h2></div>
          <span className="section-note">{query.data?.length ?? 0} قسم</span>
        </div>
        {query.isLoading ? <p>جارٍ تحميل الأقسام…</p> : query.error ? <div className="error-card">{query.error.message}</div> : !query.data?.length ? <div className="empty-strip">لا توجد أقسام بعد. أضف قسمًا ليظهر في التصفح عندما يكون مرئيًا.</div> : (
          <div className="admin-table admin-category-table">
            <div className="admin-row admin-row-head admin-category-row"><span>القسم</span><span>الرابط وتسميات القائمة</span><span>المنتجات</span><span>الترتيب</span><span>الحالة</span><span>إجراء</span></div>
            {query.data.map(category => {
              const productCount = products.data?.filter(product => product.categoryId === category.id).length ?? 0;
              return (
                <div className="admin-row admin-category-row" key={category.id}>
                  <div><strong>{category.nameAr}</strong><small>{category.nameEn}</small></div>
                  <div><code>{category.slug}</code><small>{category.navLabelAr || category.nameAr} · {category.navLabelEn || category.nameEn}</small></div>
                  <span>{canReadProducts ? productCount : "—"}</span>
                  <span>{category.sortOrder}</span>
                  <span>{category.visible ? "ظاهر" : "مخفي"}</span>
                  <div className="admin-row-actions">
                    {canWrite && <button className="button button-secondary" onClick={() => beginEdit(category)}><Pencil size={14} /> تعديل</button>}
                    {canWrite && <button className="danger-link" aria-label={`حذف ${category.nameAr}`} onClick={() => {
                      if (window.confirm(`حذف القسم «${category.nameAr}»؟ لا يمكن حذف قسم ما زالت منتجاته مرتبطة به.`)) remove.mutate({ id: category.id });
                    }}><Trash2 size={14} /> حذف</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AdminSectionShell>
  );
}
