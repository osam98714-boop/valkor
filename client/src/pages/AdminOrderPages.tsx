import { useState } from "react";
import { Copy, Eye, Trash2 } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminSectionShell from "./AdminSectionShell";

type OrderStatus = "new" | "pending_payment" | "paid" | "in_progress" | "delivered" | "cancelled";
const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: "new", label: "جديد" },
  { value: "pending_payment", label: "بانتظار الدفع" },
  { value: "paid", label: "تم الدفع" },
  { value: "in_progress", label: "جارٍ التنفيذ" },
  { value: "delivered", label: "تم التسليم" },
  { value: "cancelled", label: "ملغي" },
];

function askToDeleteOrder(orderNo: string, status: string) {
  const restock = status === "new" || status === "pending_payment"
    ? "سيُعاد المخزون للمنتجات المتتبعة إذا كانت حالة الطلب جديدة أو بانتظار الدفع. "
    : "لن يُعاد المخزون لهذا الطلب بحسب حالته. ";
  return window.confirm(`حذف الطلب ${orderNo} نهائيًا؟ ${restock}سيُحذف معه سجل البنود، ويُسجل إجراء الحذف في سجل العمليات. لا يمكن التراجع.`);
}

export function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const query = trpc.adminOrders.list.useQuery({ q: search || undefined, status: status || undefined });
  const me = trpc.adminAuth.me.useQuery();
  const utils = trpc.useUtils();
  const canWrite = me.data?.permissions.includes("orders.write") ?? false;
  const canDelete = me.data?.permissions.includes("orders.delete") ?? false;

  const update = trpc.adminOrders.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.adminOrders.list.invalidate(), utils.adminOrders.stats.invalidate()]);
      toast.success("تم تحديث حالة الطلب");
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.adminOrders.remove.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.adminOrders.list.invalidate(),
        utils.adminOrders.stats.invalidate(),
        utils.adminCustomers.list.invalidate(),
      ]);
      toast.success(`تم حذف الطلب ${result.orderNo}`);
    },
    onError: error => toast.error(error.message),
  });

  return (
    <AdminSectionShell title="الطلبات">
      <div className="admin-toolbar">
        <input className="admin-input" placeholder="بحث برقم الطلب أو الاسم أو الهاتف" value={search} onChange={event => setSearch(event.target.value)} />
        <select className="admin-input" value={status} onChange={event => setStatus(event.target.value as OrderStatus | "")}>
          <option value="">كل الحالات</option>
          {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      {query.isLoading ? <div className="loading-line">جارٍ تحميل الطلبات…</div> : query.error ? <div className="error-card">{query.error.message}</div> : !query.data?.length ? <div className="empty-strip">لا توجد طلبات مطابقة.</div> : (
        <div className="admin-table">
          <div className="admin-row admin-row-head admin-order-row"><span>رقم الطلب</span><span>العميل</span><span>الإجمالي</span><span>الحالة</span><span>إجراءات</span></div>
          {query.data.map(order => (
            <div className="admin-row admin-order-row" key={order.id}>
              <Link href={`/admin/orders/${order.id}`}><strong>{order.orderNo}</strong><small>{new Date(order.createdAt).toLocaleString()}</small></Link>
              <div><strong>{order.customer.name}</strong><small>{order.customer.phone} · {order.items.length} عنصر</small></div>
              <span>{order.total} {order.currencyCode}</span>
              {canWrite ? (
                <select aria-label={`حالة ${order.orderNo}`} value={order.status} disabled={update.isPending} onChange={event => update.mutate({ id: order.id, status: event.target.value as OrderStatus })}>
                  {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : <span>{statusOptions.find(option => option.value === order.status)?.label ?? order.status}</span>}
              <div className="admin-row-actions">
                <Link className="button button-secondary" href={`/admin/orders/${order.id}`} aria-label={`تفاصيل ${order.orderNo}`}><Eye size={14} /> التفاصيل</Link>
                {canDelete && <button className="danger-link" aria-label={`حذف ${order.orderNo}`} disabled={remove.isPending} onClick={() => {
                  if (askToDeleteOrder(order.orderNo, order.status)) remove.mutate({ id: order.id, confirmed: true });
                }}><Trash2 size={15} /> حذف</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {canDelete && <p className="section-note">حذف الطلب نهائي؛ يحتفظ سجل العمليات بأثر الحذف، وتُحذف بنود الطلب التابعة معه تلقائيًا.</p>}
    </AdminSectionShell>
  );
}

export function AdminOrderDetailPage() {
  const [, params] = useRoute("/admin/orders/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);
  const query = trpc.adminOrders.detail.useQuery({ id }, { enabled: Number.isInteger(id) && id > 0 });
  const me = trpc.adminAuth.me.useQuery();
  const utils = trpc.useUtils();
  const canWrite = me.data?.permissions.includes("orders.write") ?? false;
  const canDelete = me.data?.permissions.includes("orders.delete") ?? false;

  const update = trpc.adminOrders.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.adminOrders.detail.invalidate({ id }), utils.adminOrders.list.invalidate(), utils.adminOrders.stats.invalidate()]);
      toast.success("تم تحديث حالة الطلب");
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.adminOrders.remove.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.adminOrders.list.invalidate(), utils.adminOrders.stats.invalidate(), utils.adminCustomers.list.invalidate()]);
      toast.success(`تم حذف الطلب ${result.orderNo}`);
      navigate("/admin/orders");
    },
    onError: error => toast.error(error.message),
  });

  const order = query.data;
  const copy = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText([
        order.orderNo,
        order.customer.name,
        order.customer.phone,
        `Telegram: ${order.customer.telegramId ?? ""}`,
        ...order.items.map(item => `${item.nameSnapshot} × ${item.quantity} / ${item.unitPrice} ${item.currencyCode}\n${item.specificationsSnapshot ?? ""}`),
        `${order.total} ${order.currencyCode}`,
      ].join("\n"));
      toast.success("تم نسخ بيانات الطلب");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <AdminSectionShell title={order ? `الطلب ${order.orderNo}` : "تفاصيل الطلب"}>
      {query.isLoading ? <div className="loading-line">جارٍ تحميل الطلب…</div> : query.error ? <div className="error-card">{query.error.message}</div> : !order ? <div className="error-card">الطلب غير موجود أو لا يمكن عرضه.</div> : (
        <div className="admin-panel">
          <div className="admin-toolbar admin-order-actions">
            <button className="button button-secondary" onClick={copy}><Copy size={14} /> نسخ تفاصيل الطلب</button>
            {canDelete && <button className="button button-danger" disabled={remove.isPending} onClick={() => {
              if (askToDeleteOrder(order.orderNo, order.status)) remove.mutate({ id: order.id, confirmed: true });
            }}><Trash2 size={15} /> {remove.isPending ? "جارٍ الحذف…" : "حذف الطلب نهائيًا"}</button>}
          </div>
          <h2>بيانات العميل</h2>
          <p>{order.customer.name} · {order.customer.phone}</p>
          <p>Telegram ID: {order.customer.telegramId || "غير متوفر"}</p>
          <h2>المنتجات والبنود</h2>
          {order.items.map(item => (
            <div className="admin-row" key={item.id}>
              <strong>{item.nameSnapshot}</strong><span>{item.skuSnapshot}</span><span>الكمية: {item.quantity}</span><span>{item.unitPrice} {item.currencyCode}</span><pre>{item.specificationsSnapshot}</pre>
            </div>
          ))}
          <div className="summary-line summary-total"><span>الإجمالي</span><strong>{order.total} {order.currencyName} ({order.currencyCode})</strong></div>
          <div className="field admin-order-status-field">
            <label htmlFor="order-status">حالة الطلب</label>
            {canWrite ? (
              <select id="order-status" className="admin-input" value={order.status} disabled={update.isPending} onChange={event => update.mutate({ id: order.id, status: event.target.value as OrderStatus })}>
                {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : <span>{statusOptions.find(option => option.value === order.status)?.label ?? order.status}</span>}
          </div>
          {canDelete && <p className="section-note">سيؤدي الحذف إلى حذف سجل الطلب وبنوده. عند حذف طلب جديد أو بانتظار الدفع، يعيد الخادم المخزون المتتبع في المعاملة نفسها.</p>}
        </div>
      )}
    </AdminSectionShell>
  );
}
