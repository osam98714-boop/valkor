import { Fragment, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Blocks, ShieldCheck, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import StorefrontLayout from "@/components/StorefrontLayout";
import ProductCard, { type StoreProduct } from "@/components/ProductCard";
import { DEFAULT_HOMEPAGE_CONTENT, type LocalizedCopy, type OrderedHomepageSection, type HomepageContent } from "../../../shared/homepage-content";

const text = (copy: LocalizedCopy, isArabic: boolean) => isArabic ? copy.ar : copy.en;

type ShelfSection = HomepageContent["sections"]["featured"];
function ProductShelf({ section, data, isLoading, isArabic }: { section: ShelfSection; data: StoreProduct[]; isLoading: boolean; isArabic: boolean }) {
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <section className="section-block container">
      <div className="section-heading">
        <div><span className="eyebrow">{text(section.eyebrow, isArabic)}</span><h2>{text(section.title, isArabic)}</h2></div>
        <Link className="text-link" href="/products">{isArabic ? "عرض الجميع" : "View all"}<Arrow size={15} /></Link>
      </div>
      {isLoading ? <div className="product-grid">{[0, 1, 2].map(item => <div className="skeleton-card" key={item} />)}</div> : data.length ? <div className="product-grid">{data.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="empty-strip"><span>{isArabic ? "لا توجد منتجات منشورة في هذا القسم بعد." : "There are no published products here yet."}</span><Link href="/admin/login">{isArabic ? "دخول الإدارة" : "Admin sign in"}<ArrowUpRight size={15} /></Link></div>}
    </section>
  );
}

export default function Home() {
  const { isArabic } = useLanguage();
  const settings = trpc.storefront.settings.useQuery();
  const categories = trpc.storefront.categories.useQuery();
  const featured = trpc.storefront.products.useQuery({ featured: true, sort: "newest" });
  const latest = trpc.storefront.products.useQuery({ sort: "newest" });
  const popular = trpc.storefront.products.useQuery({ sort: "popular" });
  const isMaintenance = settings.data?.maintenance;
  const home = settings.data?.homepageContent ?? DEFAULT_HOMEPAGE_CONTENT;
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const categorySection = home.sections.categories;
  const manifesto = home.sections.manifesto;

  if (isMaintenance) return <StorefrontLayout><div className="maintenance-screen container"><div className="eyebrow">VLKR / TEMPORARY PAUSE</div><span className="maintenance-orbit"><Blocks size={28} /></span><h1>{isArabic ? "نعيد ترتيب التفاصيل." : "We are refining the details."}</h1><p>{isArabic ? settings.data?.maintenanceMessageAr : settings.data?.maintenanceMessageEn}</p><Link className="button button-secondary" href="/admin/login">{isArabic ? "دخول الإدارة" : "Admin sign in"}<Arrow size={16} /></Link></div></StorefrontLayout>;

  const sections: { id: string; order: number; visible: boolean; node: ReactNode }[] = [
    {
      id: "categories",
      order: categorySection.order,
      visible: categorySection.visible,
      node: <section id="collections" className="category-band"><div className="container"><div className="section-heading"><div><span className="eyebrow">{text(categorySection.eyebrow, isArabic)}</span><h2>{text(categorySection.title, isArabic)}</h2></div><span className="section-note">{text(categorySection.note, isArabic)}</span></div>
        <div className="category-list">{(categories.data ?? []).map((category, index) => <Link href={`/categories/${category.slug}`} key={category.id} className="category-tile"><span className="category-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{isArabic ? category.nameAr : category.nameEn}</strong><small>{isArabic ? "استكشف المجموعة" : "Explore collection"}</small></div><Arrow size={17} /></Link>)}{!categories.isLoading && !categories.data?.length && <div className="empty-strip">{isArabic ? "سيظهر تصفح الأقسام بعد تهيئة قاعدة البيانات." : "Categories will appear after the database is configured."}</div>}</div>
      </div></section>,
    },
    {
      id: "featured",
      order: home.sections.featured.order,
      visible: home.sections.featured.visible,
      node: <ProductShelf section={home.sections.featured} data={featured.data ?? []} isLoading={featured.isLoading} isArabic={isArabic} />,
    },
    {
      id: "manifesto",
      order: manifesto.order,
      visible: manifesto.visible,
      node: <section className="manifesto container"><div className="manifesto-number">VLKR<br />/ 03</div><div className="manifesto-copy"><span className="eyebrow">{text(manifesto.eyebrow, isArabic)}</span><h2>{text(manifesto.titleLead, isArabic)}<br /><em>{text(manifesto.titleEmphasis, isArabic)}</em></h2></div><p>{text(manifesto.body, isArabic)}</p></section>,
    },
    {
      id: "latest",
      order: home.sections.latest.order,
      visible: home.sections.latest.visible,
      node: <ProductShelf section={home.sections.latest} data={latest.data ?? []} isLoading={latest.isLoading} isArabic={isArabic} />,
    },
    {
      id: "popular",
      order: home.sections.popular.order,
      visible: home.sections.popular.visible,
      node: <ProductShelf section={home.sections.popular} data={popular.data ?? []} isLoading={popular.isLoading} isArabic={isArabic} />,
    },
  ];

  return <StorefrontLayout>
    <section className="hero container">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" />{text(home.hero.eyebrow, isArabic)}<span>NO. 01 / VLKR</span></div>
        <h1>{text(home.hero.titleLead, isArabic)}<br /><em>{text(home.hero.titleEmphasis, isArabic)}</em></h1>
        <p className="hero-description">{text(home.hero.description, isArabic)}</p>
        <div className="hero-actions"><Link href="/products" className="button button-primary">{text(home.hero.primaryCta, isArabic)}<Arrow size={17} /></Link>{categorySection.visible && <a href="#collections" className="button button-quiet">{text(home.hero.secondaryCta, isArabic)}<ArrowDown size={16} /></a>}</div>
        <div className="hero-proof"><div><ShieldCheck size={16} /><span>{text(home.hero.proofOne, isArabic)}</span></div><div><Sparkles size={16} /><span>{text(home.hero.proofTwo, isArabic)}</span></div></div>
      </div>
      <div className="hero-panel"><div className="hero-panel-top"><span>VALKOR / 2026</span><span>VLKR—STORE</span></div><div className="hero-mark">{settings.data?.avatarUrl ? <img src={settings.data.avatarUrl} alt="صورة Valkor" /> : <div className="hero-initials"><span className="hero-initials-main">𝑽</span><span> DIGITAL MARKETPLACE</span></div>}</div><div className="hero-panel-bottom"><div><span className="eyebrow">{text(home.hero.panelEyebrow, isArabic)}</span><strong>{text(home.hero.panelTitle, isArabic)}</strong></div><Link href="/products" aria-label={isArabic ? "تصفح المنتجات" : "Browse products"}><Arrow size={18} /></Link></div><div className="hero-index">01—04</div></div>
    </section>
    {sections.filter(section => section.visible).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map(section => <Fragment key={section.id}>{section.node}</Fragment>)}
  </StorefrontLayout>;
}
