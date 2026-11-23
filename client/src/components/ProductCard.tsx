import { Link } from "wouter";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type Outputs = inferRouterOutputs<AppRouter>;
export type StoreProduct = Outputs["storefront"]["products"][number];
export function formatMoney(value: string | number, symbol = "") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)}${symbol ? ` ${symbol}` : ""}`;
}
export default function ProductCard({ product, index = 0 }: { product: StoreProduct; index?: number }) {
  const { add } = useCart();
  const { isArabic } = useLanguage();
  const name = isArabic ? product.nameAr : product.nameEn;
  const description = (isArabic ? product.shortDescriptionAr : product.shortDescriptionEn) || (isArabic ? "تفاصيل المنتج ومواصفاته متاحة داخل الصفحة." : "Open the product page for details and specifications.");
  const addCart = () => {
    add({ productId: product.id, slug: product.slug, sku: product.sku, nameAr: product.nameAr, nameEn: product.nameEn, price: String(product.price), currencyCode: product.currencyCode, imageUrl: product.imageUrl, quantity: 1, trackInventory: product.trackInventory, availableQuantity: product.quantity });
    toast.success(isArabic ? "أُضيف المنتج إلى السلة" : "Added to cart");
  };
  return <article className="product-card" style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}>
    <Link href={`/products/${product.slug}`} className="product-art" aria-label={name}>
      {product.imageUrl ? <img src={product.imageUrl} alt={name} loading="lazy" /> : <div className="product-art-empty"><span>VLKR / {product.sku}</span><strong>{String(index + 1).padStart(2, "0")}</strong></div>}
      <span className="product-status">{isArabic ? "متوفر" : "Available"}</span>
    </Link>
    <div className="product-info"><div className="product-sku">{product.sku}</div><Link href={`/products/${product.slug}`} className="product-title">{name}</Link><p>{description}</p><div className="product-card-bottom"><span className="product-price">{formatMoney(product.price, product.currencyCode || "")}</span><button className="quick-add" onClick={addCart} aria-label={isArabic ? "إضافة للسلة" : "Add to cart"}><ShoppingBag size={16} /></button><Link className="product-open" href={`/products/${product.slug}`} aria-label={isArabic ? "عرض المنتج" : "View product"}><ArrowUpRight size={16} /></Link></div></div>
  </article>;
}
