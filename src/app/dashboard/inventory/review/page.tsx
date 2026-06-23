"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { approveItemAction } from "../items/[item_code]/actions";
import { addAuditEntry } from "@/lib/audit-data";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

export default function ReviewInboxPage() {
  const [items, setItems] = useState<any[]>([]);
  const [toast, setToast] = useState("");

  function notify(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function load() {
    const { data } = await supabase
      .from("erp_items")
      .select("item_code, original_name, approved_name, pricing_status, review_reason, last_modified_at, final_selling_price_cents")
      .eq("pricing_status", "بحاجة مراجعة")
      .order("last_modified_at", { ascending: false });
    setItems(data || []);
  }

  useEffect(() => { load(); }, []);

  async function approve(item_code: string) {
    const fd = new FormData(); fd.append("item_code", item_code);
    try { await approveItemAction(fd); notify("تم الاعتماد ✓"); load(); }
    catch (e: any) { notify(e.message); }
  }

  async function reject(item_code: string) {
    await supabase.from("erp_items").update({ pricing_status: "قيد العمل", review_reason: null }).eq("item_code", item_code);
    await addAuditEntry({ user: "system", action: "رفض مراجعة", item_code });
    notify("أُعيد إلى قيد العمل"); load();
  }

  async function postpone(item_code: string) {
    await supabase.from("erp_items").update({ pricing_status: "مؤجّل" }).eq("item_code", item_code);
    await addAuditEntry({ user: "system", action: "تأجيل", item_code });
    notify("تم التأجيل"); load();
  }

  return (
    <div className="legacy-wrapper" dir="rtl">
      {toast && <div className="toast">{toast}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Link href="/dashboard/inventory" className="btn"><ArrowRight size={14} /></Link>
        <h3 className="section-title" style={{ margin: 0 }}>قائمة المراجعة ({items.length})</h3>
      </div>
      {items.length === 0 ? (
        <p style={{ color: "var(--color-text-tertiary)", padding: 20, textAlign: "center" }}>لا توجد أصناف تحتاج مراجعة</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>الكود</th><th>الصنف</th><th>سبب المراجعة</th>
              <th className="num">السعر</th><th>التاريخ</th><th style={{ width: 120 }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.item_code}>
                <td><Link href={`/dashboard/inventory/items/${encodeURIComponent(item.item_code)}`} className="code ltr">{item.item_code}</Link></td>
                <td>{item.approved_name || item.original_name}</td>
                <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{item.review_reason || "—"}</td>
                <td className="num">{item.final_selling_price_cents ? (item.final_selling_price_cents / 100).toFixed(2) : "—"}</td>
                <td style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {item.last_modified_at ? new Date(item.last_modified_at).toLocaleDateString("ar") : "—"}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn" title="اعتماد" onClick={() => approve(item.item_code)} style={{ color: "#1D9E75", padding: "3px 7px" }}><CheckCircle size={14} /></button>
                    <button className="btn" title="رفض" onClick={() => reject(item.item_code)} style={{ color: "#dc2626", padding: "3px 7px" }}><XCircle size={14} /></button>
                    <button className="btn" title="تأجيل" onClick={() => postpone(item.item_code)} style={{ color: "#7c3aed", padding: "3px 7px" }}><Clock size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
