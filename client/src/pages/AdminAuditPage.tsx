import { useState } from "react";
import { CheckSquare, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminSectionShell from "./AdminSectionShell";

export default function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const query = trpc.adminAudit.list.useQuery({ q: search || undefined, limit: 200 });
  const me = trpc.adminAuth.me.useQuery();
  const canDelete = me.data?.permissions.includes("audit.delete") ?? false;

  const remove = trpc.adminAudit.deleteSelected.useMutation({
    onSuccess: async result => {
      setSelectedIds([]);
      await query.refetch();
      toast.success(`تم حذف ${result.deletedCount} سجل محدد؛ أُضيف أثر تدقيق للعملية`);
    },
    onError: error => toast.error(error.message),
  });

  const rows = query.data ?? [];
  const allVisibleSelected = rows.length > 0 && rows.every(row => selectedIds.includes(row.id));
  const toggleOne = (id: number) => setSelectedIds(current => current.includes(id) ? current.filter(selected => selected !== id) : [...current, id]);
  const toggleVisible = () => setSelectedIds(allVisibleSelected ? [] : rows.map(row => row.id));
  const deleteSelected = () => {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    if (window.confirm(`حذف ${count} سجلًا محددًا من سجل العمليات؟ سيبقى سجل جديد يوثق هوية المدير وعدد السجلات المحذوفة ومعرفاتها. لا يمكن التراجع.`)) {
      remove.mutate({ ids: selectedIds, confirmed: true });
    }
  };

  return (
    <AdminSectionShell title="سجل العمليات">
      <div className="admin-panel audit-retention-note">
        <strong>الحذف انتقائي وليس مسحًا شاملًا.</strong>
        <span>كل حذف يضيف سجل تدقيق جديدًا يبيّن من نفّذه وعدد السجلات ومعرفاتها، حتى تبقى للعملية آثار قابلة للمراجعة.</span>
      </div>
      <div className="admin-toolbar">
        <input className="admin-input" placeholder="بحث في السجل" value={search} onChange={event => { setSearch(event.target.value); setSelectedIds([]); }} />
        {canDelete && <>
          <button className="button button-secondary" disabled={!rows.length} onClick={toggleVisible}>
            {allVisibleSelected ? <CheckSquare size={15} /> : <Square size={15} />}
            {allVisibleSelected ? "إلغاء تحديد النتائج" : "تحديد النتائج الظاهرة"}
          </button>
          <button className="button button-danger" disabled={!selectedIds.length || remove.isPending} onClick={deleteSelected}>
            <Trash2 size={15} />{remove.isPending ? "جارٍ الحذف…" : `حذف المحدد (${selectedIds.length})`}
          </button>
        </>}
      </div>
      {!canDelete && <p className="section-note">يمكنك استعراض السجل والبحث فيه. حذف السجلات يتطلب الإذن المستقل audit.delete.</p>}
      {query.isLoading ? <div className="loading-line">جارٍ تحميل سجل العمليات…</div> : query.error ? <div className="error-card">{query.error.message}</div> : !rows.length ? <div className="empty-strip">لا توجد سجلات مطابقة.</div> : (
        <div className="admin-table">
          <div className="admin-row admin-row-head admin-audit-row"><span>تحديد</span><span>العملية والكيان</span><span>المدير</span><span>الوقت</span><span>التفاصيل</span></div>
          {rows.map(row => (
            <div className="admin-row admin-audit-row" key={row.id}>
              <span>{canDelete ? <input type="checkbox" aria-label={`تحديد سجل ${row.id}`} checked={selectedIds.includes(row.id)} onChange={() => toggleOne(row.id)} /> : `#${row.id}`}</span>
              <div><strong>{row.action}</strong><small>{row.entity} {row.entityId}</small></div>
              <span>{row.adminUsername}</span>
              <span>{new Date(row.createdAt).toLocaleString()}</span>
              <span className="audit-details">{row.details || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </AdminSectionShell>
  );
}
