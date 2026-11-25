import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  CircleDollarSign,
  ExternalLink,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Tags,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type Permission = string;
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
};
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "المحتوى والكتالوج",
    items: [
      { href: "/admin/products", label: "المنتجات", icon: Package, permission: "products.read" },
      { href: "/admin/categories", label: "أقسام المنتجات", icon: Tags, permission: "categories.read" },
      { href: "/admin/homepage", label: "محتوى الصفحة الرئيسية", icon: LayoutDashboard, permission: "homepage.write" },
      { href: "/admin/communities", label: "الجروبات والقنوات", icon: Users, permission: "communities.write" },
      { href: "/admin/links", label: "روابط التواصل", icon: ExternalLink, permission: "content.write" },
    ],
  },
  {
    label: "الطلبات والعملاء",
    items: [
      { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart, permission: "orders.read" },
      { href: "/admin/customers", label: "العملاء", icon: Users, permission: "customers.read" },
      { href: "/admin/currencies", label: "العملات والأسعار", icon: CircleDollarSign, permission: "currencies.write" },
    ],
  },
  {
    label: "إعدادات المتجر",
    items: [
      { href: "/admin/store", label: "إعدادات المتجر", icon: Settings, permission: "settings.write" },
      { href: "/admin/theme", label: "الثيمات", icon: Settings, permission: "settings.write" },
      { href: "/admin/maintenance", label: "وضع الصيانة", icon: Settings, permission: "settings.write" },
    ],
  },
  {
    label: "الإدارة والأمان",
    items: [
      { href: "/admin/admins", label: "المديرون والصلاحيات", icon: Shield, permission: "admins.write" },
      { href: "/admin/audit", label: "سجل العمليات", icon: History, permission: "audit.read" },
    ],
  },
];

export default function AdminSectionShell({ title, children }: { title: string; children: ReactNode }) {
  const [, navigate] = useLocation();
  const me = trpc.adminAuth.me.useQuery();
  const logout = trpc.adminAuth.logout.useMutation({ onSuccess: () => navigate("/admin/login") });

  useEffect(() => {
    if (!me.isLoading && !me.data) navigate("/admin/login");
  }, [me.isLoading, me.data, navigate]);

  if (me.isLoading || !me.data) return <div className="loading-line">جارٍ التحقق من صلاحية الدخول…</div>;
  const permissions = new Set(me.data.permissions);

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/admin" className="wordmark">
          <span className="wordmark-script">𝑽𝒂𝒍𝒌𝒐𝒓</span>
          <span className="wordmark-code">ADMIN</span>
        </Link>
        <div className="admin-side-caption">إدارة المتجر</div>
        <Link href="/admin" className="admin-nav-link">
          <LayoutDashboard size={16} />لوحة التحكم
        </Link>
        {navGroups.map(group => {
          const items = group.items.filter(item => permissions.has(item.permission));
          if (!items.length) return null;
          return (
            <div className="admin-nav-group" key={group.label}>
              <div className="admin-nav-group-label">{group.label}</div>
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <Link href={item.href} className="admin-nav-link" key={item.href}>
                    <Icon size={16} />{item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
        <button className="admin-nav-link" onClick={() => logout.mutate()} disabled={logout.isPending}>
          <LogOut size={16} />تسجيل الخروج
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <div>
            <span className="eyebrow">VLKR / CONTROL PANEL</span>
            <h1>{title}</h1>
          </div>
          <Link href="/" className="button button-secondary">عرض المتجر</Link>
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
