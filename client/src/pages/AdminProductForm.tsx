import { useEffect, useState, type ChangeEvent } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";

type ProductStatus = "available" | "unavailable" | "sold_out" | "maintenance" | "hidden";
type ProductFormState = {
  sku: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  imageUrl: string;
  extraImages: string[];
  shortDescriptionAr: string;
  shortDescriptionEn: string;
  descriptionAr: string;
  descriptionEn: string;
  specifications: string;
  features: string;
  usageInstructions: string;
  price: string;
  currencyCode: string;
  status: ProductStatus;
  quantity: number | string;
  trackInventory: boolean;
  featured: boolean;
  published: boolean;
  policyConfirmed: boolean;
};

type ProductRecord = NonNullable<inferRouterOutputs<AppRouter>["adminCatalog"]["productById"]>;

const defaultForm: ProductFormState = {
  sku: "",
  slug: "",
  nameAr: "",
  nameEn: "",
  categoryId: "",
  imageUrl: "",
  extraImages: [],
  shortDescriptionAr: "",
  shortDescriptionEn: "",
  descriptionAr: "",
  descriptionEn: "",
  specifications: "",
  features: "",
  usageInstructions: "",
  price: "",
  currencyCode: "JOD",
  status: "available",
  quantity: 0,
  trackInventory: false,
  featured: false,
  published: false,
  policyConfirmed: false,
};

const imageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
type ProductImageType = (typeof imageTypes)[number];
const maxImageBytes = 5 * 1024 * 1024;
const maxExtraImages = 12;

function normalizeProduct(product?: ProductRecord): ProductFormState {
  if (!product) return { ...defaultForm };
  return {
    ...defaultForm,
    ...product,
    categoryId: product.categoryId ? String(product.categoryId) : "",
    imageUrl: product.imageUrl ?? "",
    extraImages: Array.isArray(product.extraImages) ? product.extraImages : [],
    shortDescriptionAr: product.shortDescriptionAr ?? "",
    shortDescriptionEn: product.shortDescriptionEn ?? "",
    descriptionAr: product.descriptionAr ?? "",
    descriptionEn: product.descriptionEn ?? "",
    specifications: product.specifications ?? "",
    features: product.features ?? "",
    usageInstructions: product.usageInstructions ?? "",
    currencyCode: product.currencyCode ?? "JOD",
    policyConfirmed: false,
  };
}

function fileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const encoded = String(reader.result ?? "").split(",")[1];
      if (encoded) resolve(encoded);
      else reject(new Error("تعذرت قراءة ملف الصورة"));
    };
    reader.onerror = () => reject(new Error("تعذرت قراءة ملف الصورة"));
    reader.readAsDataURL(file);
  });
}

export default function AdminProductForm({ id, initial }: { id?: number; initial?: ProductRecord }) {
  const [, navigate] = useLocation();
  const [form, setForm] = useState<ProductFormState>(() => normalizeProduct(initial));
  const [uploadingImages, setUploadingImages] = useState(false);
  const categories = trpc.adminCatalog.listCategories.useQuery();
  const utils = trpc.useUtils();
  const upload = trpc.adminCatalog.uploadImage.useMutation();
  const save = trpc.adminCatalog.saveProduct.useMutation({
    onSuccess: async saved => {
      await Promise.all([
        utils.adminCatalog.listProducts.invalidate(),
        utils.adminCatalog.productById.invalidate({ id: saved.id }),
        utils.storefront.products.invalidate(),
        utils.storefront.product.invalidate({ slug: saved.slug }),
      ]);
      toast.success(id ? "تم تحديث المنتج" : "تم حفظ المنتج في قاعدة البيانات");
      if (!id) navigate(`/admin/products/${saved.id}`);
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    setForm(normalizeProduct(initial));
  }, [initial]);

  const setField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const uploadFile = async (file: File): Promise<string> => {
    if (!imageTypes.includes(file.type as ProductImageType)) {
      throw new Error("الصيغ المسموحة JPEG وPNG وWebP فقط");
    }
    if (file.size > maxImageBytes) {
      throw new Error("حجم الصورة يجب ألا يتجاوز 5MB");
    }
    const result = await upload.mutateAsync({
      fileName: file.name,
      contentType: file.type as ProductImageType,
      dataBase64: await fileAsBase64(file),
    });
    return result.url;
  };

  const changeMainImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setUploadingImages(true);
    try {
      setField("imageUrl", await uploadFile(file));
      toast.success("تم رفع الصورة الرئيسية");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الصورة");
    } finally {
      setUploadingImages(false);
    }
  };

  const addExtraImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    if (form.extraImages.length + files.length > maxExtraImages) {
      toast.error(`الحد الأعلى ${maxExtraImages} صورة إضافية`);
      return;
    }
    setUploadingImages(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        const url = await uploadFile(file);
        setForm(current => ({ ...current, extraImages: [...current.extraImages, url] }));
        uploaded += 1;
      }
      if (uploaded) toast.success(`تم رفع ${uploaded} صورة إضافية`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع إحدى الصور");
    } finally {
      setUploadingImages(false);
    }
  };

  const changeExtraImageUrls = (value: string) => {
    const urls = value.split("\n").map(url => url.trim()).filter(Boolean);
    if (urls.length > maxExtraImages) toast.error(`الحد الأعلى ${maxExtraImages} صورة إضافية`);
    setField("extraImages", urls.slice(0, maxExtraImages));
  };

  const removeExtraImage = (url: string) => {
    setField("extraImages", form.extraImages.filter(item => item !== url));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.extraImages.length > maxExtraImages) {
      toast.error(`الحد الأعلى ${maxExtraImages} صورة إضافية`);
      return;
    }
    save.mutate({
      ...form,
      id,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      imageUrl: form.imageUrl || null,
      extraImages: form.extraImages,
      quantity: Number(form.quantity),
      slug: form.slug || undefined,
    });
  };

  return (
    <form className="form-card admin-form-grid" onSubmit={submit}>
      <section className="admin-form-section">
        <h2>الهوية والوصف</h2>
        <div className="form-grid">
          <div className="field">
            <label>رقم تعريف فريد (SKU)</label>
            <input required value={form.sku} onChange={event => setField("sku", event.target.value)} />
          </div>
          <div className="field">
            <label>رابط المنتج (Slug)</label>
            <input value={form.slug} onChange={event => setField("slug", event.target.value)} placeholder="يُنشأ تلقائيًا عند تركه فارغًا" />
          </div>
          <div className="field">
            <label>الاسم بالعربية</label>
            <input required value={form.nameAr} onChange={event => setField("nameAr", event.target.value)} />
          </div>
          <div className="field">
            <label>Name (English)</label>
            <input required value={form.nameEn} onChange={event => setField("nameEn", event.target.value)} />
          </div>
          <div className="field">
            <label>القسم</label>
            <select value={form.categoryId} onChange={event => setField("categoryId", event.target.value)}>
              <option value="">بدون قسم</option>
              {(categories.data ?? []).map(category => <option key={category.id} value={category.id}>{category.nameAr}</option>)}
            </select>
          </div>
          <div className="field">
            <label>وصف مختصر عربي</label>
            <input value={form.shortDescriptionAr} onChange={event => setField("shortDescriptionAr", event.target.value)} />
          </div>
          <div className="field span-2">
            <label>وصف مختصر English</label>
            <input value={form.shortDescriptionEn} onChange={event => setField("shortDescriptionEn", event.target.value)} />
          </div>
          <div className="field">
            <label>الوصف الكامل عربي</label>
            <textarea value={form.descriptionAr} onChange={event => setField("descriptionAr", event.target.value)} />
          </div>
          <div className="field">
            <label>Full description (English)</label>
            <textarea value={form.descriptionEn} onChange={event => setField("descriptionEn", event.target.value)} />
          </div>
          <div className="field">
            <label>المواصفات</label>
            <textarea value={form.specifications} onChange={event => setField("specifications", event.target.value)} />
          </div>
          <div className="field">
            <label>المميزات</label>
            <textarea value={form.features} onChange={event => setField("features", event.target.value)} />
          </div>
          <div className="field span-2">
            <label>طريقة الاستخدام</label>
            <textarea value={form.usageInstructions} onChange={event => setField("usageInstructions", event.target.value)} />
          </div>
        </div>
      </section>

      <section className="admin-form-section">
        <h2>السعر والصور والنشر</h2>
        <div className="form-grid">
          <div className="field">
            <label>السعر</label>
            <input required inputMode="decimal" value={form.price} onChange={event => setField("price", event.target.value)} />
          </div>
          <div className="field">
            <label>رمز العملة</label>
            <input required value={form.currencyCode} onChange={event => setField("currencyCode", event.target.value)} />
          </div>
          <div className="field">
            <label>حالة المنتج</label>
            <select value={form.status} onChange={event => setField("status", event.target.value as ProductStatus)}>
              <option value="available">متوفر</option>
              <option value="unavailable">غير متوفر</option>
              <option value="sold_out">نفدت الكمية</option>
              <option value="maintenance">تحت الصيانة</option>
              <option value="hidden">مخفي</option>
            </select>
          </div>
          <div className="field">
            <label>الكمية المتاحة</label>
            <input type="number" min="0" value={form.quantity} onChange={event => setField("quantity", event.target.value)} />
          </div>
          <div className="field">
            <label>الصورة الرئيسية <span className="optional-label">(اختياري)</span></label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={changeMainImage} disabled={uploadingImages} />
            {form.imageUrl && (
              <div className="product-image-preview-item">
                <img className="admin-image-preview" src={form.imageUrl} alt="معاينة الصورة الرئيسية" />
                <button type="button" className="danger-link" onClick={() => setField("imageUrl", "")} aria-label="إزالة الصورة الرئيسية">
                  <Trash2 size={14} /> إزالة الصورة
                </button>
              </div>
            )}
          </div>
          <div className="field">
            <label>رفع صور إضافية <span className="optional-label">(اختياري، حتى 12 صورة)</span></label>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addExtraImages} disabled={uploadingImages || form.extraImages.length >= maxExtraImages} />
            <span className="section-note">JPEG أو PNG أو WebP، بحد أقصى 5MB للصورة.</span>
          </div>
          <div className="field span-2">
            <label>روابط الصور الإضافية (اختياري، رابط واحد لكل سطر)</label>
            <textarea value={form.extraImages.join("\n")} onChange={event => changeExtraImageUrls(event.target.value)} />
            {form.extraImages.length > 0 && (
              <div className="product-image-preview-grid">
                {form.extraImages.map((url, index) => (
                  <div className="product-image-preview-item" key={`${url}-${index}`}>
                    <img className="admin-image-preview" src={url} alt={`معاينة الصورة الإضافية ${index + 1}`} />
                    <button type="button" className="danger-link" onClick={() => removeExtraImage(url)} aria-label={`إزالة الصورة الإضافية ${index + 1}`}>
                      <Trash2 size={14} /> إزالة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="section-note">
          لبيع قطعة واحدة فقط: فعّل «تتبع المخزون» واجعل الكمية 1. بعد حفظ أول طلب ستصبح الكمية صفرًا، وتتحول الحالة إلى «نفدت الكمية»، ويختفي المنتج من المتجر ويبقى متاحًا للتحرير من الإدارة.
        </div>
        <div className="section-note">إزالة الصورة من هذا النموذج تحذف مرجعها من المنتج فقط، ولا تؤكد حذف الملف من التخزين.</div>
        <div className="admin-checks">
          <label><input type="checkbox" checked={form.trackInventory} onChange={event => setField("trackInventory", event.target.checked)} /> تتبع المخزون</label>
          <label><input type="checkbox" checked={form.featured} onChange={event => setField("featured", event.target.checked)} /> منتج مميز</label>
          <label><input type="checkbox" checked={form.published} onChange={event => setField("published", event.target.checked)} /> نشر المنتج</label>
          <label><input type="checkbox" checked={form.policyConfirmed} onChange={event => setField("policyConfirmed", event.target.checked)} /> أؤكد أن الاستخدام قانوني ومصرح به، ولا يتضمن سرقة أو تصيدًا أو تجسسًا أو اختراقًا غير مصرح</label>
        </div>
        <div className="admin-toolbar">
          <button className="button button-primary" disabled={save.isPending || uploadingImages}>
            {save.isPending ? "جارٍ الحفظ…" : id ? "حفظ التعديلات" : "حفظ المنتج"}
          </button>
          <button type="button" className="button button-secondary" onClick={() => navigate("/admin/products")}>إلغاء</button>
          {uploadingImages && <span className="section-note">جارٍ رفع الصور إلى التخزين الدائم…</span>}
        </div>
      </section>
    </form>
  );
}
