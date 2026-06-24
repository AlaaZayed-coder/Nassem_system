"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { STATUSES, PRICING_METHODS } from "@/lib/pricing-service";
import { saveItemFullAction, approveItemAction, lockItemAction, unlockItemAction, submitForReviewAction } from "./actions";
import { getPriceHistory } from "@/lib/audit-data";
import {
  ArrowRight, Lock, Unlock, CheckCircle, Send,
  ChevronDown, ChevronUp, ChevronRight, History, ChevronLeft, Tag, Calculator, AlertCircle, Save
} from "lucide-react";
import Link from "next/link";

function toCents(val: string) { return val ? Math.round(Number(val) * 100) : null; }
function fromCents(c: any) { return c != null ? (c / 100).toFixed(2) : ""; }

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = decodeURIComponent(params.item_code as string);

  const [item, setItem] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [adjacents, setAdjacents] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"ok" | "err">("ok");
  const [showDoor, setShowDoor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }
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
    supabase.from("erp_categories").select("*").eq("type", "main").order("name")
      .then(({ data }) => setCategories(data || []));
    getPriceHistory(code).then(setPriceHistory);

    // Load prev/next
    supabase.from("erp_items").select("item_code").order("item_code").then(({ data }) => {
      if (!data) return;
      const idx = data.findIndex((r: any) => r.item_code === code);
      setAdjacents({
        prev: idx > 0 ? data[idx - 1].item_code : null,
        next: idx < data.length - 1 ? data[idx + 1].item_code : null,
      });
    });
  }, [code, loadItem]);

  if (!item) return (
    <div className="legacy-wrapper" dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
      <span style={{ color: "var(--color-text-tertiary)" }}>جاري التحميل…</span>
    </div>
  );

  const locked = item.price_locked;
  const mainCats = categories.filter(c => c.is_active !== false);

  // Auto-calculate suggested price
  function handleCostChange(val: string) {
    const c = toCents(val);
    const m = form.profit_margin_percent || 0;
    const sug = c != null ? Math.round(Math.round(c * (1 + m / 100)) / 100) * 100 : null;
    setForm((f: any) => ({ ...f, cost_price_cents: c, suggested_selling_price_cents: sug }));
  }
  function handleMarginChange(val: string) {
    const m = Number(val) || 0;
    const c = form.cost_price_cents;
    const sug = c != null ? Math.round(Math.round(c * (1 + m / 100)) / 100) * 100 : null;
    setForm((f: any) => ({ ...f, profit_margin_percent: m, suggested_selling_price_cents: sug }));
  }

  async function handleSave() {
    if (locked) { notify("السعر مقفول. افكّه أولاً للتعديل.", "err"); return; }
    setSaving(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v != null) fd.append(k, String(v)); });
    fd.set("door_pricing_enabled", showDoor ? "1" : "0");
    try { await saveItemFullAction(fd); await loadItem(); notify("تم الحفظ ✓"); }
    catch (e: any) { notify(e.message, "err"); }
    setSaving(false);
  }

  async function handleSaveAndNext() {
    await handleSave();
    if (adjacents.next) router.push(`/dashboard/inventory/items/${encodeURIComponent(adjacents.next)}`);
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

  const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
    "معتمد":         { bg: "#EAF3DE", color: "#3B6D11" },
    "قيد العمل":     { bg: "#E6F1FB", color: "#185FA5" },
    "بحاجة مراجعة": { bg: "#FAEEDA", color: "#854F0B" },
    "غير مسعّر":    { bg: "#F1EFE8", color: "#5F5E5A" },
    "مؤجّل":        { bg: "#EEEDFE", color: "#534AB7" },
  };
  const badge = STATUS_BADGE[item.pricing_status] || STATUS_BADGE["غير مسعّر"];

  return (
    <div className="legacy-wrapper" dir="rtl" style={{ maxWidth: 720 }}>
      {toast && (
        <div className="toast" style={{ background: toastType === "err" ? "#E05252" : "#1D9E75" }}>{toast}</div>
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <Link href="/dashboard/inventory/items" className="btn btn-ghost" style={{ padding: "4px 6px" }}>
            <ArrowRight size={16} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--color-text-tertiary)" }} dir="ltr">{code}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: badge.bg, color: badge.color }}>
                {item.pricing_status}
              </span>
              {locked && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: "#FFE4E4", color: "#E05252", display: "flex", alignItems: "center", gap: 3 }}>
                  <Lock size={10} /> مقفول
                </span>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>
              {item.approved_name || item.original_name}
            </div>
          </div>
        </div>

        {/* Prev/Next */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {adjacents.prev && (
            <Link href={`/dashboard/inventory/items/${encodeURIComponent(adjacents.prev)}`} className="btn btn-ghost" title="الصنف السابق">
              <ChevronRight size={15} />
            </Link>
          )}
          {adjacents.next && (
            <Link href={`/dashboard/inventory/items/${encodeURIComponent(adjacents.next)}`} className="btn btn-ghost" title="الصنف التالي">
              <ChevronLeft size={15} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Section 1: التصنيف والاسم ── */}
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", marginBottom: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 7 }}>
          <Tag size={13} color="var(--brand)" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>التصنيف والاسم</span>
        </div>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Category + Unit in one row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <label className="field-label">التصنيف الرئيسي</label>
              <select className="field-input" value={form.main_category || ""} disabled={locked}
                onChange={e => set("main_category", e.target.value)}>
                <option value="">— بدون تصنيف —</option>
                {mainCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">الوحدة</label>
              <input className="field-input" value={form.unit_of_measure || ""} disabled={locked}
                style={{ width: 80 }}
                onChange={e => set("unit_of_measure", e.target.value)} />
            </div>
          </div>

          {/* Original name (read-only) */}
          <div>
            <label className="field-label">الاسم الأصلي (من ERP)</label>
            <div style={{ padding: "7px 10px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-sm)", fontSize: 13, color: "var(--color-text-secondary)" }}>
              {item.original_name}
            </div>
          </div>

          {/* Approved name */}
          <div>
            <label className="field-label">الاسم المعتمد</label>
            <textarea className="field-input" rows={2} value={form.approved_name || ""} disabled={locked}
              placeholder="اكتب الاسم المعتمد هنا..."
              onChange={e => set("approved_name", e.target.value)}
              style={{ resize: "vertical", minHeight: 44, lineHeight: 1.5 }} />
          </div>

          {/* Door pricing toggle */}
          <div
            onClick={() => { if (!locked) setShowDoor(d => !d); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              cursor: locked ? "default" : "pointer", userSelect: "none",
              padding: "7px 10px",
              border: `0.5px solid ${showDoor ? "var(--brand)" : "var(--color-border-tertiary)"}`,
              borderRadius: "var(--border-radius-sm)",
              background: showDoor ? "rgba(29,158,117,0.05)" : "transparent",
            }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `2px solid ${showDoor ? "var(--brand)" : "var(--color-border-secondary)"}`,
              background: showDoor ? "var(--brand)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {showDoor && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ fontSize: 13, color: showDoor ? "var(--brand)" : "var(--color-text-secondary)", fontWeight: showDoor ? 600 : 400 }}>
              تسعير الباب بالمتر المربع / التركيب
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 2: التكلفة والسعر ── */}
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", marginBottom: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 7 }}>
          <Calculator size={13} color="var(--brand)" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>التكلفة والسعر</span>
        </div>
        <div style={{ padding: 14 }}>

          {/* طريقة التسعير */}
          <div style={{ marginBottom: 12 }}>
            <label className="field-label">طريقة التسعير</label>
            <select className="field-input" value={form.pricing_method || "تكلفة + هامش"} disabled={locked}
              onChange={e => set("pricing_method", e.target.value)} style={{ maxWidth: 220 }}>
              {PRICING_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {/* Cost + Margin + Suggested in one row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label className="field-label">التكلفة (₪)</label>
              <input className="field-input" type="number" step="0.01" dir="ltr" disabled={locked}
                value={fromCents(form.cost_price_cents)}
                onChange={e => handleCostChange(e.target.value)} />
            </div>
            <div>
              <label className="field-label">هامش الربح %</label>
              <input className="field-input" type="number" step="0.1" dir="ltr" disabled={locked}
                value={form.profit_margin_percent ?? ""}
                onChange={e => handleMarginChange(e.target.value)} />
            </div>
            <div>
              <label className="field-label">السعر المقترح (₪)</label>
              <div style={{
                padding: "7px 10px", border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-sm)", background: "var(--color-background-secondary)",
                fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#378ADD",
                textAlign: "left", direction: "ltr", minHeight: 34,
              }}>
                {form.suggested_selling_price_cents != null ? fromCents(form.suggested_selling_price_cents) : "—"}
              </div>
            </div>
          </div>

          {/* Final price — prominent */}
          <div style={{ background: "rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: "var(--border-radius-md)", padding: "10px 14px" }}>
            <label className="field-label" style={{ color: "#1D9E75", fontWeight: 600 }}>السعر النهائي للبيع (₪)</label>
            <input type="number" step="0.01" dir="ltr" disabled={locked}
              value={fromCents(form.final_selling_price_cents)}
              onChange={e => set("final_selling_price_cents", toCents(e.target.value))}
              style={{ width: "100%", border: "1px solid rgba(29,158,117,0.4)", borderRadius: "var(--border-radius-sm)", padding: "8px 12px", fontSize: 18, fontWeight: 700, fontFamily: "monospace", background: "#fff", outline: "none", textAlign: "left" }} />
          </div>

          {/* Supplier */}
          <div style={{ marginTop: 10 }}>
            <label className="field-label">المورّد</label>
            <input className="field-input" value={form.supplier || ""} disabled={locked}
              placeholder="اسم المورّد..."
              onChange={e => set("supplier", e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Section 3: تسعير الأبواب (conditional) ── */}
      {showDoor && (
        <div style={{ border: "0.5px solid #B5D4F4", borderRadius: "var(--border-radius-md)", marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "#EFF6FF", borderBottom: "0.5px solid #B5D4F4", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#185FA5" }}>تسعير الأبواب والتركيب</span>
          </div>
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
                <input className="field-input" type="number" step="0.001" dir="ltr" disabled={locked}
                  value={form.width || ""} onChange={e => set("width", e.target.value)} />
              </div>
              <div>
                <label className="field-label">الارتفاع (م)</label>
                <input className="field-input" type="number" step="0.001" dir="ltr" disabled={locked}
                  value={form.height || ""} onChange={e => set("height", e.target.value)} />
              </div>
              <div>
                <label className="field-label">سعر المتر المربع (₪)</label>
                <input className="field-input" type="number" step="0.01" dir="ltr" disabled={locked}
                  value={fromCents(form.price_per_m2_cents)}
                  onChange={e => set("price_per_m2_cents", toCents(e.target.value))} />
              </div>
            </>}
            <div>
              <label className="field-label">سعر بدون تركيب (₪)</label>
              <input className="field-input" type="number" step="0.01" dir="ltr"
                disabled={locked || (form.door_unit_type === "متر مربع" && !form.manual_price_override)}
                value={fromCents(form.price_without_installation_cents)}
                onChange={e => set("price_without_installation_cents", toCents(e.target.value))} />
            </div>
            <div>
              <label className="field-label">رسوم التركيب (₪)</label>
              <input className="field-input" type="number" step="0.01" dir="ltr" disabled={locked}
                value={fromCents(form.installation_fee_cents)}
                onChange={e => set("installation_fee_cents", toCents(e.target.value) || 0)} />
            </div>
            <div>
              <label className="field-label">نوع رسوم التركيب</label>
              <select className="field-input" value={form.installation_type || "لكل قطعة"} disabled={locked}
                onChange={e => set("installation_type", e.target.value)}>
                {["لكل قطعة","لكل متر مربع"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">سعر مع تركيب (₪)</label>
              <input className="field-input" type="number" step="0.01" dir="ltr"
                disabled={locked || !form.manual_price_override}
                value={fromCents(form.price_with_installation_cents)}
                onChange={e => set("price_with_installation_cents", toCents(e.target.value))} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.manual_price_override} disabled={locked}
                onChange={e => set("manual_price_override", e.target.checked)}
                style={{ accentColor: "var(--brand)" }} />
              <span className="field-label" style={{ margin: 0 }}>تحديد يدوي للأسعار</span>
            </label>
            <div style={{ gridColumn: "1/-1" }}>
              <label className="field-label">ملاحظات التركيب</label>
              <input className="field-input" value={form.installation_notes || ""} disabled={locked}
                onChange={e => set("installation_notes", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Section 4: الحالة والملاحظات ── */}
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", marginBottom: 80, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 7 }}>
          <AlertCircle size={13} color="var(--brand)" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>الحالة والملاحظات</span>
        </div>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label className="field-label">حالة التسعير</label>
            <select className="field-input" value={form.pricing_status || "غير مسعّر"} disabled={locked}
              onChange={e => set("pricing_status", e.target.value)} style={{ maxWidth: 200 }}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">ملاحظات</label>
            <textarea className="field-input" rows={3} value={form.notes || ""} disabled={locked}
              placeholder="أي ملاحظة على هذا الصنف..."
              onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Price history ── */}
      <div style={{ marginBottom: 80 }}>
        <button className="btn" style={{ width: "100%", justifyContent: "space-between" }}
          onClick={() => setShowHistory(h => !h)}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <History size={14} /> سجل الأسعار ({priceHistory.length})
          </span>
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
                  <td dir="ltr" style={{ fontFamily: "monospace", fontSize: 11 }}>{new Date(h.changed_at).toLocaleDateString("ar")}</td>
                  <td dir="ltr" style={{ fontFamily: "monospace" }}>{fromCents(h.old_price_cents)}</td>
                  <td dir="ltr" style={{ fontFamily: "monospace", color: "#1D9E75" }}>{fromCents(h.new_price_cents)}</td>
                  <td>{h.changed_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Sticky bottom action bar ── */}
      {!locked && (
        <div style={{
          position: "fixed", bottom: 0, left: 180, right: 0,
          padding: "10px 24px", background: "var(--color-background-primary)",
          borderTop: "0.5px solid var(--color-border-tertiary)",
          display: "flex", alignItems: "center", gap: 8,
          zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)"
        }}>
          <button className="btn btn-primary" onClick={handleApprove} style={{ gap: 6 }}
            disabled={item.pricing_status === "معتمد"}>
            <CheckCircle size={15} /> اعتماد السعر
          </button>
          <button className="btn" onClick={handleSave} disabled={saving} style={{ gap: 6 }}>
            <Save size={14} /> {saving ? "جاري الحفظ…" : "حفظ مسودة"}
          </button>
          {adjacents.next && (
            <button className="btn" onClick={handleSaveAndNext} disabled={saving} style={{ gap: 6 }}>
              <ChevronLeft size={14} /> حفظ والتالي
            </button>
          )}
          <button className="btn btn-review" onClick={() => setShowReview(true)} style={{ gap: 6 }}
            disabled={item.pricing_status === "بحاجة مراجعة"}>
            <Send size={14} /> بحاجة مراجعة
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={handleLock} style={{ gap: 6 }}>
            <Lock size={14} /> قفل
          </button>
        </div>
      )}

      {locked && (
        <div style={{
          position: "fixed", bottom: 0, left: 180, right: 0,
          padding: "10px 24px", background: "#FFF5F5",
          borderTop: "0.5px solid #FFC8C8",
          display: "flex", alignItems: "center", gap: 8, zIndex: 100
        }}>
          <Lock size={14} color="#E05252" />
          <span style={{ fontSize: 13, color: "#E05252", fontWeight: 600 }}>السعر مقفول</span>
          <button className="btn" onClick={() => setShowUnlock(true)} style={{ gap: 6, marginRight: 8 }}>
            <Unlock size={14} /> فك القفل
          </button>
        </div>
      )}

      {/* ── Unlock modal ── */}
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

      {/* ── Review modal ── */}
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
    </div>
  );
}
