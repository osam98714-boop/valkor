import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Globe2, Menu, ShoppingBag, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { DEFAULT_HOMEPAGE_CONTENT } from "../../../shared/homepage-content";

type Props = { children: React.ReactNode; compact?: boolean };
type StoreMenuItem = { label: string; href: string; external?: boolean };
export default function StorefrontLayout({ children, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [path] = useLocation();
  const { language, setLanguage, isArabic } = useLanguage();
  const { setTheme } = useTheme();
  const { totalItems } = useCart();
  const settings = trpc.storefront.settings.useQuery(undefined, { staleTime: 30_000 });
  const categories = trpc.storefront.categories.useQuery(undefined, { staleTime: 30_000 });
  const links = trpc.storefront.socialLinks.useQuery(undefined, { staleTime: 30_000 });

  useEffect(() => {
    if (settings.data?.theme) setTheme(settings.data.theme as Parameters<typeof setTheme>[0]);
    try {
      if (!localStorage.getItem("valkor-language") && (settings.data?.defaultLanguage === "ar" || settings.data?.defaultLanguage === "en")) setLanguage(settings.data.defaultLanguage);
    } catch { /* storage can be unavailable */ }
  }, [settings.data?.theme, settings.data?.defaultLanguage, setLanguage, setTheme]);

  const homeContent = settings.data?.homepageContent ?? DEFAULT_HOMEPAGE_CONTENT;
  const categoryLinks = (categories.data ?? []).map(category => ({
    label: isArabic ? (category.navLabelAr || category.nameAr) : (category.navLabelEn || category.nameEn),
    href: `/categories/${category.slug}`,
  }));
  const menuLinks = (links.data ?? []).filter(link => link.location === "menu");
  const footerLinks = (links.data ?? []).filter(link => link.location === "footer" || link.location === "contact");
  const menu: StoreMenuItem[] = [
    { label: isArabic ? "الرئيسية" : "Home", href: "/" },
    { label: isArabic ? "جميع المنتجات" : "All products", href: "/products" },
    ...categoryLinks,
    { label: isArabic ? "الجروبات والقنوات" : "Groups and channels", href: "/communities" },
    ...menuLinks.map(link => ({ label: link.label, href: link.url, external: true })),
    { label: isArabic ? "تواصل معنا" : "Contact", href: "#contact" },
    { label: isArabic ? "الإعدادات" : "Settings", href: "/admin/settings" },
  ];
  const maintenance = settings.data?.maintenance ?? false;
  const DirectionArrow = isArabic ? ArrowLeft : ArrowRight;
  const desktopCategories = (categories.data ?? []).slice(0, 3);

  return <div className="store-app">
    <div className="announce-bar"><span className={`status-dot ${maintenance ? "is-maintenance" : ""}`} />{maintenance ? (isArabic ? "المتجر في وضع الصيانة" : "Store maintenance") : (isArabic ? homeContent.announcement.ar : homeContent.announcement.en)}<span className="announce-code">VLKR / DIGITAL GOODS</span></div>
    <header className="site-header container">
      <button className="icon-button menu-trigger" aria-label={isArabic ? "فتح القائمة" : "Open menu"} onClick={() => setOpen(true)}><Menu size={21} /></button>
      <Link href="/" className="wordmark" aria-label="Valkor home"><span className="wordmark-script">𝑽𝒂𝒍𝒌𝒐𝒓</span><span className="wordmark-code">VLKR</span></Link>
      {!compact && <nav className="desktop-nav" aria-label={isArabic ? "التنقل" : "Navigation"}>
        <Link href="/products" className={path === "/products" ? "is-active" : ""}>{isArabic ? "المنتجات" : "Products"}</Link>
        {desktopCategories.map(category => <Link key={category.id} href={`/categories/${category.slug}`} className={path === `/categories/${category.slug}` ? "is-active" : ""}>{isArabic ? (category.navLabelAr || category.nameAr) : (category.navLabelEn || category.nameEn)}</Link>)}
        <Link href="/communities" className={path === "/communities" ? "is-active" : ""}>{isArabic ? "الجروبات والقنوات" : "Communities"}</Link>
      </nav>}
      <div className="header-actions">
        <button className="locale-button" onClick={() => setLanguage(language === "ar" ? "en" : "ar")} title={isArabic ? "Switch language" : "تغيير اللغة"}><Globe2 size={16} /><span>{language === "ar" ? "EN" : "ع"}</span></button>
        <Link href="/cart" className="cart-link" aria-label={isArabic ? "سلة المشتريات" : "Shopping cart"}><ShoppingBag size={19} /><span>{isArabic ? "السلة" : "Cart"}</span><b>{totalItems}</b></Link>
      </div>
    </header>
    {open && <div className="drawer-scrim" onClick={() => setOpen(false)}>
      <aside className="nav-drawer" onClick={event => event.stopPropagation()}>
        <div className="drawer-head"><Link href="/" onClick={() => setOpen(false)} className="wordmark"><span className="wordmark-script">𝑽𝒂𝒍𝒌𝒐𝒓</span><span className="wordmark-code">VLKR</span></Link><button className="icon-button" aria-label="Close" onClick={() => setOpen(false)}><X size={20} /></button></div>
        <div className="drawer-caption">{isArabic ? "اكتشف Valkor" : "Explore Valkor"}</div>
        <nav className="drawer-links">{menu.map((item, index) => item.external ? <a key={`${item.href}-${index}`} href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}<DirectionArrow size={15} /></a> : <Link key={`${item.href}-${index}`} href={item.href} onClick={() => setOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}<DirectionArrow size={15} /></Link>)}</nav>
        <div className="drawer-foot"><span className={`status-dot ${maintenance ? "is-maintenance" : ""}`} />{maintenance ? (isArabic ? "الصيانة مفعّلة" : "Maintenance active") : (isArabic ? "المتجر متاح" : "Store available")}</div>
      </aside>
    </div>}
    <main>{children}</main>
    <footer id="contact" className="site-footer">
      <div className="container footer-grid">
        <div><Link href="/" className="wordmark"><span className="wordmark-script">𝑽𝒂𝒍𝒌𝒐𝒓</span><span className="wordmark-code">VLKR</span></Link><p>{isArabic ? (settings.data?.descriptionAr || "منتجات رقمية وأدوات تقنية وخدمات متخصصة.") : (settings.data?.descriptionEn || "Digital products, technical tools, and specialist services.")}</p></div>
        <div><div className="eyebrow">{isArabic ? "تواصل" : "CONNECT"}</div><div className="footer-links">{footerLinks.map(link => <a key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.label}<DirectionArrow size={14} /></a>)}{!footerLinks.length && <span className="muted-copy">{isArabic ? "ستظهر روابط التواصل هنا عند إضافتها من الإدارة." : "Contact links will appear here when added in admin."}</span>}</div></div>
        <div className="footer-meta"><span>VALKOR STORE</span><span>VLKR-{new Date().getFullYear()}</span><Link href="/admin/login">{isArabic ? "دخول الإدارة" : "Admin"}</Link></div>
      </div>
    </footer>
  </div>;
}
