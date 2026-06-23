"use client";
import { useEffect, useState } from "react";
import { getAuditLog } from "@/lib/audit-data";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filters, setFilters] = useState({ item_code: "", user: "", action: "" });

  useEffect(() => {
    getAuditLog(filters).then(setLogs);
  }, [filters]);

  return (
    <div className="legacy-wrapper" dir="rtl">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Link href="/" className="btn"><ArrowRight size={14} /></Link>
        <h3 className="section-title" style={{ margin: 0 }}>سجل التدقيق</h3>
      </div>

      <div className="toolbar">
        <div className="search-field">
          <Search size={14} />
          <input placeholder="كود الصنف" value={filters.item_code}
            onChange={e => setFilters(f => ({ ...f, item_code: e.target.value }))} />
        </div>
        <div className="search-field">
          <Search size={14} />
          <input placeholder="المستخدم" value={filters.user}
            onChange={e => setFilters(f => ({ ...f, user: e.target.value }))} />
        </div>
        <div className="search-field">
          <Search size={14} />
          <input placeholder="الإجراء" value={filters.action}
            onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} />
        </div>
      </div>

      <table className="tbl">
        <thead>
          <tr><th>التاريخ</th><th>المستخدم</th><th>الإجراء</th><th>كود الصنف</th><th>الحقل</th><th>القيمة القديمة</th><th>القيمة الجديدة</th><th>ملاحظة</th></tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td className="ltr" style={{ fontSize: 11 }}>{new Date(log.ts).toLocaleString("ar")}</td>
              <td>{log.user || "—"}</td>
              <td><span className="badge bg-blue-50 text-blue-700">{log.action}</span></td>
              <td>
                {log.item_code
                  ? <Link href={`/dashboard/inventory/items/${encodeURIComponent(log.item_code)}`} className="code ltr">{log.item_code}</Link>
                  : "—"}
              </td>
              <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{log.field || "—"}</td>
              <td style={{ fontSize: 12 }}>{log.old_value || "—"}</td>
              <td style={{ fontSize: 12 }}>{log.new_value || "—"}</td>
              <td style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{log.note || ""}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", padding: 20, color: "var(--color-text-tertiary)" }}>لا توجد سجلات</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
