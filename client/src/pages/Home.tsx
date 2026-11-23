import { Link } from "wouter";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Blocks, ShieldCheck, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import StorefrontLayout from "@/components/StorefrontLayout";
import ProductCard, { type StoreProduct } from "@/components/ProductCard";

function ProductShelf({ title, label, data, isLoading }: { title: string; label: string; data: StoreProduct[]; isLoading: boolean }) {
  const { isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return <section className="section-block container"><div className="section-heading"><div><span className="eyebrow">{label}</span><h2>{title}</h2></div><Link className="text-link" href="/products">{isArabic ? "عرض الجميع" : "View all"}<Arrow size={15} /></Link></div>
    {isLoading ? <div className="product-grid">{[0, 1, 2].map(item => <div className="skeleton-card" key={item} />)}</div> : data.length ? <div className="product-grid">{data.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="empty-strip"><span>{isArabic ? "لا توجد منتجات منشورة في هذا القسم بعد." : "There are no published products here yet."}</span><Link href="/admin/login">{isArabic ? "دخول الإدارة" : "Admin sign in"}<ArrowUpRight size={15} /></Link></div>}
  </section>;
}

export default function Home() {
  const { isArabic } = useLanguage();
  const settings = trpc.storefront.settings.useQuery();
  const categories = trpc.storefront.categories.useQuery();
  const featured = trpc.storefront.products.useQuery({ featured: true, sort: "newest" });
  const latest = trpc.storefront.products.useQuery({ sort: "newest" });
  const popular = trpc.storefront.products.useQuery({ sort: "popular" });
  const isMaintenance = settings.data?.maintenance;
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  if (isMaintenance) return <StorefrontLayout><div className="maintenance-screen container"><div className="eyebrow">VLKR / TEMPORARY PAUSE</div><span className="maintenance-orbit"><Blocks size={28} /></span><h1>{isArabic ? "نعيد ترتيب التفاصيل." : "We are refining the details."}</h1><p>{isArabic ? settings.data?.maintenanceMessageAr : settings.data?.maintenanceMessageEn}</p><Link className="button button-secondary" href="/admin/login">{isArabic ? "دخول الإدارة" : "Admin sign in"}<Arrow size={16} /></Link></div></StorefrontLayout>;
  return <StorefrontLayout>
    <section className="hero container">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" />{isArabic ? "مكتبة رقمية منتقاة" : "A curated digital shelf"}<span>NO. 01 / VLKR</span></div>
        <h1>{isArabic ? <>أدوات رقمية،<br /><em>بلا تعقيد.</em></> : <>Digital tools,<br /><em>without the noise.</em></>}</h1>
        <p className="hero-description">{isArabic ? (settings.data?.descriptionAr || "اكتشف أدوات وخدمات رقمية واضحة التفاصيل، مع طلب مباشر وتواصل سهل.") : (settings.data?.descriptionEn || "Discover digital tools and services with clear details, simple ordering, and direct support.")}</p>
        <div className="hero-actions"><Link href="/products" className="button button-primary">{isArabic ? "استكشف المنتجات" : "Explore products"}<Arrow size={17} /></Link><a href="#collections" className="button button-quiet">{isArabic ? "استكشف الأقسام" : "Browse categories"}<ArrowDown size={16} /></a></div>
        <div className="hero-proof"><div><ShieldCheck size={16} /><span>{isArabic ? "تفاصيل واضحة قبل الطلب" : "Clear details before ordering"}</span></div><div><Sparkles size={16} /><span>{isArabic ? "قائمة منتجات قابلة للتحديث" : "A catalog that stays current"}</span></div></div>
      </div>
      <div className="hero-panel"><div className="hero-panel-top"><span>VALKOR / 2026</span><span>VLKR—STORE</span></div><div className="hero-mark">{settings.data?.avatarUrl ? <img src={settings.data.avatarUrl} alt="صورة Valkor" /> : <div className="hero-initials"><span className="hero-initials-main">𝑽</span><span> DIGITAL MARKETPLACE</span></div>}</div><div className="hero-panel-bottom"><div><span className="eyebrow">{isArabic ? "الوصول" : "ACCESS"}</span><strong>{isArabic ? "منتجات رقمية مختارة" : "Digital essentials"}</strong></div><Link href="/products" aria-label={isArabic ? "تصفح المنتجات" : "Browse products"}><Arrow size={18} /></Link></div><div className="hero-index">01—04</div></div>
    </section>
    <section id="collections" className="category-band"><div className="container"><div className="section-heading"><div><span className="eyebrow">01 / COLLECTIONS</span><h2>{isArabic ? "تصفّح حسب اهتمامك" : "Browse by interest"}</h2></div><span className="section-note">{isArabic ? "أقسام يمكن تحديثها من الإدارة" : "Categories managed from admin"}</span></div>
      <div className="category-list">{(categories.data ?? []).map((category, index) => <Link href={`/categories/${category.slug}`} key={category.id} className="category-tile"><span className="category-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{isArabic ? category.nameAr : category.nameEn}</strong><small>{isArabic ? "استكشف المجموعة" : "Explore collection"}</small></div><Arrow size={17} /></Link>)}{!categories.isLoading && !categories.data?.length && <div className="empty-strip">{isArabic ? "سيظهر تصفح الأقسام بعد تهيئة قاعدة البيانات." : "Categories will appear after the database is configured."}</div>}</div>
    </div></section>
    <ProductShelf title={isArabic ? "اختيارات Valkor" : "Valkor picks"} label="02 / FEATURED" data={featured.data ?? []} isLoading={featured.isLoading} />
    <section className="manifesto container"><div className="manifesto-number">VLKR<br />/ 03</div><div className="manifesto-copy"><span className="eyebrow">{isArabic ? "طريقة أوضح للشراء" : "A clearer way to order"}</span><h2>{isArabic ? <>نعرض التفاصيل.<br /><em>وأنت تقرر.</em></> : <>We show the details.<br /><em>You decide.</em></>}</h2></div><p>{isArabic ? "تعرّف على المواصفات والسعر والتوفر قبل الطلب. تُسجّل الطلبات في المتجر أولًا، ثم تنتقل لمتابعة التواصل عبر واتساب." : "Review specifications, price, and availability before ordering. Orders are saved in the store first, then followed up via WhatsApp."}</p></section>
    <ProductShelf title={isArabic ? "وصل حديثًا" : "Recently added"} label="03 / LATEST" data={latest.data ?? []} isLoading={latest.isLoading} />
    <ProductShelf title={isArabic ? "الأكثر طلبًا" : "Most ordered"} label="04 / POPULAR" data={popular.data ?? []} isLoading={popular.isLoading} />
  </StorefrontLayout>;
}
