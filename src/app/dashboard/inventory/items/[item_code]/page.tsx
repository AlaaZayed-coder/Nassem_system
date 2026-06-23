"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { centsToMoney, STATUSES, PRICING_METHODS } from "@/lib/pricing-service";
import { saveItemFullAction, approveItemAction, lockItemAction, unlockItemAction, submitForReviewAction } from "./actions";
import { getPriceHistory } from "@/lib/audit-data";
import {
  ArrowRight, Lock, Unlock, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, History, Send
} from "lucide-react";
import Link from "next/link";

function money(cents: any) { return cents != null ? Number(centsToMoney(cents)).toFixed(2) : ""; }

const STATUS_COLORS: Record<string, string> = {
  "معتمد": "bg-green-100 text-green-800",
  "قيد العمل": "bg-blue-100 text-blue-800",
  "بحاجة مراجعة": "bg-yellow-100 text-yellow-800",
  "غير مسعّر": "bg-slate-100 text-slate-600",
  "مؤجّل": "bg-purple-100 text-purple-700",
};

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = decodeURIComponent(params.item_code as string);

  const [item, setItem] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"ok" | "err">("ok");
  const [showDoor, setShowDoor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [form, setForm] = useState<any>({});

  function notify(msg: string, type: "ok" | "err" = "ok") {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(""), 3500);
  }

  const loadItem = useCallback(async () => {
    const { data } = await supabase.from("erp_items").select("*").eq("item_code", code).single();
    if (data) { setItem(data); setForm(data); setShowDoor(!!data.door_pricing_enabled); }
  }, [code]);

  useEffect(() => {
    loadItem();
    supabase.from("erp_categories").select("*").order("name").then(({ data }) => setCategories(data || []));
    getPriceHistory(code).then(setPriceHistory);
  }, [code, loadItem]);

  if (!item) return <div className="p-8 text-slate-400" dir="rtl">جاري التحميل…</div>;

  const locked = item.price_locked;
  const mainCats = categories.filter(c => !c.parent_id && c.is_active !== false);

  async function handleSave() {
    if (locked) { notify("السعر مقفول. افكّه أولاً للتعديل.", "err"); return; }
    setSaving(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v != null) fd.append(k, String(v)); });
    fd.set("door_pricing_enabled", showDoor ? "1" : "0");
    try {
      await saveItemFullAction(fd);
      await loadItem();
      notify("تم الحفظ بنجاح");
    } catch (e: any) { notify(e.message, "err"); }
    setSaving(false);
  }

  async function handleApprove() {
    const fd = new FormData(); fd.append("item_code", code);
    try { await approveItemAction(fd); await loadItem(); notify("تم الاعتماد ✓"); }
    catch (e: any) { notify(e.message, "err"); }
  }

  async function handleLock() {
    const fd = new FormData(); fd.append("item_code", code);
    await lockItemAction(fd); await loadItem(); notify("تم قفل السعر");
  }

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  return (
    <div className="legacy-wrapper" dir="rtl">
      {toast && (
        <div className={`toast ${toastType === "err" ? "bg-red-500" : "bg-green-600"}`}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Link href="/dashboard/inventory/items" className="btn"><ArrowRight size={14} /></Link>
        <div className="flex-1">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="code ltr" style={{ fontSize: 13 }}>{code}</span>
            <span className={`badge ${STATUS_COLORS[item.pricing_status] || "bg-slate-100 text-slate-600"}`}>
              {item.pricing_status}
            </span>
            {locked && <span className="badge bg-red-100 text-red-700 flex items-center gap-1"><Lock size={11} />مقفول</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
            {item.approved_name || item.original_name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!locked && item.pricing_status !== "معتمد" && (
            <button className="btn btn-primary" onClick={handleApprove}>
              <CheckCircle size={14} /> اعتماد
            </button>
          )}
          {!locked
            ? <button className="btn" onClick={handleLock}><Lock size={14} /> قفل</button>
            : <button className="btn" onClick={() => setShowUnlock(true)}><Unlock size={14} /> فك القفل</button>
          }
          {!locked && item.pricing_status !== "بحاجة مراجعة" && (
            <button className="btn" onClick={() => setShowReview(true)}><Send size={14} /> إرسال للمراجعة</button>
          )}
        </div>
      </div>

      {/* Unlock modal */}
      {showUnlock && (
        <div className="modal-overlay">
          <div className="modal-sheet" style={{ maxWidth: 380 }}>
            <h3 style={{ marginBottom: 12 }}>فك قفل السعر</h3>
            <label className="field-label">سبب فك القفل</label>
            <input className="field-input" id="unlock-reason" placeholder="اكتب السبب…" />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={async () => {
                const reason = (document.getElementById("unlock-reason") as HTMLInputElement).value;
                const fd = new FormData(); fd.append("item_code", code); fd.append("unlock_reason", reason);
                await unlockItemAction(fd); await loadItem(); setShowUnlock(false); notify("تم فك القفل");
              }}>تأكيد</button>
              <button className="btn" onClick={() => setShowUnlock(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {showReview && (
        <div className="modal-overlay">
          <div className="modal-sheet" style={{ maxWidth: 380 }}>
            <h3 style={{ marginBottom: 12 }}>إرسال للمراجعة</h3>
            <label className="field-label">سبب المراجعة</label>
            <input className="field-input" id="review-reason" placeholder="اكتب السبب…" />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={async () => {
                const reason = (document.getElementById("review-reason") as HTMLInputElement).value;
                const fd = new FormData(); fd.append("item_code", code); fd.append("review_reason", reason);
                await submitForReviewAction(fd); await loadItem(); setShowReview(false); notify("تم الإرسال");
              }}>إرسال</button>
              <button className="btn" onClick={() => setShowReview(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Right col: Item info */}
        <div>
          <h4 className="section-title" style={{ fontSize: 13, marginBottom: 8 }}>بيانات الصنف</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <label className="field-label">الاسم الأصلي</label>
              <input className="field-input" value={form.original_name || ""} disabled={locked}
                onChange={e => set("original_name", e.target.value)} />
            </div>
            <div>
              <label className="field-label">الاسم المقترح</label>
              <input className="field-input" value={form.proposed_name || ""} disabled={locked}
                onChange={e => set("proposed_name", e.target.value)} />
            </div>
            <div>
              <label className="field-label">الاسم المعتمد</label>
              <input className="field-input" value={form.approved_name || ""} disabled={locked}
                onChange={e => set("approved_name", e.target.value)} />
            </div>
            <div>
              <label className="field-label">حالة الاسم</label>
              <select className="field-input" value={form.name_status || "لا يوجد"} disabled={locked}
                onChange={e => set("name_status", e.target.value)}>
                {["لا يوجد","مقترح","معتمد"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">الوحدة</label>
              <input className="field-input" value={form.unit_of_measure || ""} disabled={locked}
                onChange={e => set("unit_of_measure", e.target.value)} />
            </div>
            <div>
              <label className="field-label">التصنيف الرئيسي</label>
              <select className="field-input" value={form.main_category || ""} disabled={locked}
                onChange={e => set("main_category", e.target.value)}>
                <option value="">— بدون تصنيف —</option>
                {mainCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">ملاحظات</label>
              <textarea className="field-input" rows={2} value={form.notes || ""} disabled={locked}
                onChange={e => set("notes", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Left col: Pricing */}
        <div>
          <h4 className="section-title" style={{ fontSize: 13, marginBottom: 8 }}>التسعير</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <label className="field-label">طريقة التسعير</label>
              <select className="field-input" value={form.pricing_method || "تكلفة + هامش"} disabled={locked}
                onChange={e => set("pricing_method", e.target.value)}>
                {PRICING_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">حالة التسعير</label>
              <select className="field-input" value={form.pricing_status || "غير مسعّر"} disabled={locked}
                onChange={e => set("pricing_status", e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">سعر التكلفة (شيكل)</label>
              <input className="field-input ltr" type="number" step="0.01" dir="ltr" disabled={locked}
                value={form.cost_price_cents != null ? (form.cost_price_cents / 100).toFixed(2) : ""}
                onChange={e => {
                  const c = e.target.value ? Math.round(Number(e.target.value) * 100) : null;
                  const m = form.profit_margin_percent || 0;
                  const sug = c != null ? Math.round(Math.round(c * (1 + m / 100)) / 100) * 100 : null;
                  setForm((f: any) => ({ ...f, cost_price_cents: c, suggested_selling_price_cents: sug }));
                }} />
            </div>
            <div>
              <label className="field-label">هامش الربح %</label>
              <input className="field-input ltr" type="number" step="0.1" dir="ltr" disabled={locked}
                value={form.profit_margin_percent ?? ""}
                onChange={e => {
                  const m = Number(e.target.value) || 0;
                  const c = form.cost_price_cents;
                  const sug = c != null ? Math.round(Math.round(c * (1 + m / 100)) / 100) * 100 : null;
                  setForm((f: any) => ({ ...f, profit_margin_percent: m, suggested_selling_price_cents: sug }));
                }} />
            </div>
            <div>
              <label className="field-label">السعر المقترح (محسوب)</label>
              <input className="field-input ltr" dir="ltr" readOnly disabled
                value={form.suggested_selling_price_cents != null ? (form.suggested_selling_price_cents / 100).toFixed(2) : ""}
                style={{ background: "#f5f5f2", color: "#888" }} />
            </div>
            <div>
              <label className="field-label">السعر النهائي (شيكل)</label>
              <input className="field-input ltr" type="number" step="0.01" dir="ltr" disabled={locked}
                value={form.final_selling_price_cents != null ? (form.final_selling_price_cents / 100).toFixed(2) : ""}
                onChange={e => set("final_selling_price_cents", e.target.value ? Math.round(Number(e.target.value) * 100) : null)} />
            </div>
            <div>
              <label className="field-label">المورّد</label>
              <input className="field-input" value={form.supplier || ""} disabled={locked}
                onChange={e => set("supplier", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Door pricing */}
      <div style={{ marginTop: 16, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: showDoor ? "#f0f9ff" : "#fafaf8", cursor: "pointer" }}
          onClick={() => { if (!locked) setShowDoor(d => !d); }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>تسعير الأبواب والتركيب</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label className="chip" onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={showDoor} disabled={locked}
                onChange={e => setShowDoor(e.target.checked)} style={{ marginLeft: 4 }} />
              تفعيل
            </label>
            {showDoor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
        {showDoor && (
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="field-label">نوع الوحدة</label>
              <select className="field-input" value={form.door_unit_type || "قطعة"} disabled={locked}
                onChange={e => set("door_unit_type", e.target.value)}>
                {["قطعة","متر مربع","يدوي"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            {form.door_unit_type === "متر مربع" && <>
              <div>
                <label className="field-label">العرض (م)</label>
                <input className="field-input ltr" type="number" step="0.001" dir="ltr" disabled={locked}
                  value={form.width || ""} onChange={e => set("width", e.target.value)} />
              </div>
              <div>
                <label className="field-label">الارتفاع (م)</label>
                <input className="field-input ltr" type="number" step="0.001" dir="ltr" disabled={locked}
                  value={form.height || ""} onChange={e => set("height", e.target.value)} />
              </div>
              <div>
                <label className="field-label">سعر المتر المربع</label>
                <input className="field-input ltr" type="number" step="0.01" dir="ltr" disabled={locked}
                  value={form.price_per_m2_cents != null ? (form.price_per_m2_cents / 100).toFixed(2) : ""}
                  onChange={e => set("price_per_m2_cents", e.target.value ? Math.round(Number(e.target.value) * 100) : null)} />
              </div>
            </>}
            <div>
              <label className="field-label">سعر بدون تركيب</label>
              <input className="field-input ltr" type="number" step="0.01" dir="ltr"
                disabled={locked || (form.door_unit_type === "متر مربع" && !form.manual_price_override)}
                value={form.price_without_installation_cents != null ? (form.price_without_installation_cents / 100).toFixed(2) : ""}
                onChange={e => set("price_without_installation_cents", e.target.value ? Math.round(Number(e.target.value) * 100) : null)} />
            </div>
            <div>
              <label className="field-label">رسوم التركيب</label>
              <input className="field-input ltr" type="number" step="0.01" dir="ltr" disabled={locked}
                value={form.installation_fee_cents != null ? (form.installation_fee_cents / 100).toFixed(2) : ""}
                onChange={e => set("installation_fee_cents", e.target.value ? Math.round(Number(e.target.value) * 100) : 0)} />
            </div>
            <div>
              <label className="field-label">نوع رسوم التركيب</label>
              <select className="field-input" value={form.installation_type || "لكل قطعة"} disabled={locked}
                onChange={e => set("installation_type", e.target.value)}>
                {["لكل قطعة","لكل متر مربع"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">سعر مع تركيب</label>
              <input className="field-input ltr" type="number" step="0.01" dir="ltr"
                disabled={locked || !form.manual_price_override}
                value={form.price_with_installation_cents != null ? (form.price_with_installation_cents / 100).toFixed(2) : ""}
                onChange={e => set("price_with_installation_cents", e.target.value ? Math.round(Number(e.target.value) * 100) : null)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" id="manual-override" checked={!!form.manual_price_override} disabled={locked}
                onChange={e => set("manual_price_override", e.target.checked)} />
              <label htmlFor="manual-override" className="field-label" style={{ margin: 0 }}>تحديد يدوي للأسعار</label>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label className="field-label">ملاحظات التركيب</label>
              <input className="field-input" value={form.installation_notes || ""} disabled={locked}
                onChange={e => set("installation_notes", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      {!locked && (
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
          </button>
        </div>
      )}

      {/* Price history */}
      <div style={{ marginTop: 16 }}>
        <button className="btn" style={{ width: "100%", justifyContent: "space-between" }}
          onClick={() => setShowHistory(h => !h)}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><History size={14} />سجل الأسعار ({priceHistory.length})</span>
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showHistory && priceHistory.length > 0 && (
          <table className="tbl" style={{ marginTop: 6 }}>
            <thead>
              <tr><th>التاريخ</th><th>السعر القديم</th><th>السعر الجديد</th><th>بواسطة</th></tr>
            </thead>
            <tbody>
              {priceHistory.map((h: any) => (
                <tr key={h.id}>
                  <td className="ltr">{new Date(h.changed_at).toLocaleDateString("ar")}</td>
                  <td className="num">{money(h.old_price_cents)}</td>
                  <td className="num">{money(h.new_price_cents)}</td>
                  <td>{h.changed_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
