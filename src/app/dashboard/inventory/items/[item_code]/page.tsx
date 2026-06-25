"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PRICING_METHODS } from "@/lib/pricing-service";
import { saveItemFullAction, lockItemAction, unlockItemAction, freezeItemAction, unfreezeItemAction } from "./actions";
import { deleteLegacyItem, fetchUnifiedCategories } from "../../legacy-actions";
import { getPriceHistory } from "@/lib/audit-data";
import {
  ArrowRight, Lock, Unlock, CheckCircle, Send,
  ChevronDown, ChevronUp, ChevronRight, History, ChevronLeft, Tag, Calculator, FileText, Wrench, Snowflake, Trash2,
} from "lucide-react";
import Link from "next/link";

function toCents(val: string) { return val ? Math.round(Number(val) * 100) : null; }
function fromCents(c: any) { return c != null ? (c / 100).toFixed(2) : ""; }

const SECTION: React.CSSProperties = {
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: "var(--border-radius-lg, 10px)",
  marginBottom: 10,
  overflow: "hidden",
  background: "var(--color-background-primary)",
};
const SECTION_HEAD: React.CSSProperties = {
  padding: "10px 16px",
  background: "var(--color-background-secondary)",
  borderBottom: "0.5px solid var(--color-border-tertiary)",
  display: "flex",
  alignItems: "center",
  gap: 7,
};
const SECTION_BODY: React.CSSProperties = { padding: "14px 16px" };

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
  const [showHistory, setShowHistory] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [costInput, setCostInput] = useState("");
  const [marginInput, setMarginInput] = useState("");
  const [finalInput, setFinalInput] = useState("");

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }
  function notify(msg: string, type: "ok" | "err" = "ok") {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(""), 3500);
  }

  const loadItem = useCallback(async () => {
    const { data } = await supabase.from("erp_items").select("*").eq("item_code", code).single();
    if (data) {
      setItem(data);
      setForm({
        ...data,
        price_without_installation: data.price_without_installation_cents != null ? (data.price_without_installation_cents / 100).toFixed(2) : "",
        price_with_installation: data.price_with_installation_cents != null ? (data.price_with_installation_cents / 100).toFixed(2) : "",
      });
      setCostInput(data.cost_price_cents != null ? (data.cost_price_cents / 100).toFixed(2) : "");
      setMarginInput(data.profit_margin_percent != null ? String(data.profit_margin_percent) : "");
      setFinalInput(data.final_selling_price_cents != null ? (data.final_selling_price_cents / 100).toFixed(2) : "");
    }
  }, [code]);

  useEffect(() => {
    loadItem();
    fetchUnifiedCategories().then(setCategories);
    getPriceHistory(code).then(setPriceHistory);
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
  const mainCats = (categories as any[]).filter(c => c.is_active !== false);
  const showInstallation = (form.main_category || "").match(/أبواب|مواتير/);

  function commitCost(val: string) {
    const c = val ? Math.round(Number(val) * 100) : null;
    const m = form.profit_margin_percent || 0;
    const sug = c != null ? Math.round(c * (1 + m / 100) / 100) * 100 : null;
    setForm((f: any) => ({ ...f, cost_price_cents: c, suggested_selling_price_cents: sug }));
  }
  function commitMargin(val: string) {
    const m = Number(val) || 0;
    const c = form.cost_price_cents;
    const sug = c != null ? Math.round(c * (1 + m / 100) / 100) * 100 : null;
    setForm((f: any) => ({ ...f, profit_margin_percent: m, suggested_selling_price_cents: sug }));
  }

  async function handleSave(statusOverride?: string) {
    if (locked) { notify("السعر مقفول. افكّه أولاً للتعديل.", "err"); return; }
    setSaving(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v != null) fd.append(k, String(v)); });
    fd.set("door_pricing_enabled", "0");
    if (statusOverride) fd.set("pricing_status", statusOverride);
    try {
      await saveItemFullAction(fd);
      await loadItem();
      notify(statusOverride === "معتمد" ? "تم الاعتماد ✓" : statusOverride === "قيد المراجعة" ? "أُرسل للمراجعة ✓" : "تم الحفظ ✓");
    } catch (e: any) { notify(e.message, "err"); }
    setSaving(false);
  }

  async function handleNext() {
    await handleSave();
    if (adjacents.next) router.push(`/dashboard/inventory/items/${encodeURIComponent(adjacents.next)}`);
  }

  async function handleLock() {
    const fd = new FormData(); fd.append("item_code", code);
    await lockItemAction(fd); await loadItem(); notify("تم قفل السعر");
  }

  async function handleFreeze() {
    const fd = new FormData(); fd.append("item_code", code);
    await freezeItemAction(fd); await loadItem(); notify("تم تجميد الصنف ❄️");
  }

  async function handleUnfreeze() {
    const fd = new FormData(); fd.append("item_code", code);
    await unfreezeItemAction(fd); await loadItem(); notify("تم إلغاء التجميد ✓");
  }

  async function handleDelete() {
    if (!confirm(`هل تريد حذف الصنف "${item.original_name}" نهائياً؟ لا يمكن التراجع.`)) return;
    try {
      await deleteLegacyItem(code);
      router.push("/dashboard/inventory/items");
    } catch (e: any) { notify(e.message, "err"); }
  }

  const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
    "معتمد":         { bg: "#EAF3DE", color: "#3B6D11" },
    "قيد المراجعة":  { bg: "#E6F1FB", color: "#185FA5" },
    "بحاجة مراجعة": { bg: "#FAEEDA", color: "#854F0B" },
    "غير مسعّر":    { bg: "#F1EFE8", color: "#5F5E5A" },
    "مؤجّل":        { bg: "#EEEDFE", color: "#534AB7" },
  };
  const badge = STATUS_BADGE[item.pricing_status] || STATUS_BADGE["غير مسعّر"];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: "var(--border-radius-sm, 6px)",
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-primary)",
    fontSize: 13, color: "var(--color-text-primary)",
    boxSizing: "border-box", outline: "none",
  };

  return (
    <div className="legacy-wrapper" dir="rtl" style={{ maxWidth: 720 }}>
      {toast && (
        <div className="toast" style={{ background: toastType === "err" ? "#E05252" : "#1D9E75" }}>{toast}</div>
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/dashboard/inventory/items" className="btn btn-ghost" style={{ padding: "5px 8px" }}>
            <ArrowRight size={16} />
          </Link>
          <div>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 2 }}
              dir="ltr">{code}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 17, color: "var(--color-text-primary)" }}>
                {item.approved_name || item.original_name}
              </span>
              <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, fontWeight: 600, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
                {item.pricing_status}
              </span>
              {locked && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: "#FFE4E4", color: "#E05252", display: "flex", alignItems: "center", gap: 3 }}>
                  <Lock size={10} /> مقفول
                </span>
              )}
              {item.is_frozen && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: "#EEF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", gap: 3 }}>
                  <Snowflake size={10} /> مجمّد
                </span>
              )}
            </div>
          </div>
        </div>
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
      <div style={SECTION}>
        <div style={SECTION_HEAD}>
          <Tag size={14} color="#1D9E75" />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>التصنيف والاسم</span>
        </div>
        <div style={{ ...SECTION_BODY, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* تصنيف + زر إضافة تصنيف */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>التصنيف الرئيسي</label>
              <select style={inputStyle} value={form.main_category || ""} disabled={locked}
                onChange={e => set("main_category", e.target.value)}>
                <option value="">— بدون تصنيف —</option>
                {mainCats.map((c: any) => <option key={c.id ?? c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <a href="/dashboard/inventory/categories"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: "var(--border-radius-sm, 6px)", border: "0.5px dashed #1D9E75", background: "#F0FDF4", color: "#1D9E75", fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
              + تصنيف جديد
            </a>
          </div>

          {/* الاسم الأصلي — pill للقراءة */}
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>الاسم الأصلي (ERP)</label>
            <div style={{
              padding: "7px 12px", background: "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-sm, 6px)",
              fontSize: 13, color: "var(--color-text-secondary)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Lock size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
              {item.original_name}
            </div>
          </div>

          {/* ملحق الاسم + الاسم المعتمد + الوحدة */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>ملحق الاسم</label>
              <input style={inputStyle} value={form.name_suffix || ""} disabled={locked}
                placeholder="مثال: كبير، 6م..."
                onChange={e => set("name_suffix", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>الاسم المعتمد</label>
              <input style={inputStyle} value={form.approved_name || ""} disabled={locked}
                placeholder="الاسم النهائي للعرض..."
                onChange={e => set("approved_name", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>الوحدة</label>
              <select style={inputStyle} value={form.unit_of_measure || "قطعة"} disabled={locked}
                onChange={e => set("unit_of_measure", e.target.value)}>
                <option value="قطعة">قطعة</option>
                <option value="متر">متر</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: التكلفة والسعر ── */}
      <div style={SECTION}>
        <div style={SECTION_HEAD}>
          <Calculator size={14} color="#1D9E75" />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>التكلفة والسعر</span>
        </div>
        <div style={{ ...SECTION_BODY, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* طريقة التسعير */}
          <div style={{ maxWidth: 220 }}>
            <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>طريقة التسعير</label>
            <select style={inputStyle} value={form.pricing_method || "تكلفة + هامش"} disabled={locked}
              onChange={e => set("pricing_method", e.target.value)}>
              {PRICING_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {/* تكلفة + هامش + مقترح */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>التكلفة (₪)</label>
              <input style={{ ...inputStyle, fontFamily: "monospace" }} type="text" inputMode="decimal" dir="ltr" disabled={locked}
                value={costInput}
                onChange={e => setCostInput(e.target.value)}
                onBlur={e => commitCost(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>هامش الربح %</label>
              <input style={{ ...inputStyle, fontFamily: "monospace" }} type="text" inputMode="decimal" dir="ltr" disabled={locked}
                value={marginInput}
                onChange={e => setMarginInput(e.target.value)}
                onBlur={e => commitMargin(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>السعر المقترح (₪)</label>
              <div style={{
                padding: "7px 10px", borderRadius: "var(--border-radius-sm, 6px)",
                border: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-secondary)",
                fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#185FA5",
                minHeight: 34, direction: "ltr",
              }}>
                {form.suggested_selling_price_cents != null ? fromCents(form.suggested_selling_price_cents) : "—"}
              </div>
            </div>
          </div>

          {/* السعر النهائي — بارز */}
          <div style={{ background: "#EAF3DE", border: "0.5px solid #C0DD97", borderRadius: "var(--border-radius-sm, 6px)", padding: "12px 16px" }}>
            <label style={{ fontSize: 11, color: "#3B6D11", fontWeight: 600, display: "block", marginBottom: 6 }}>السعر النهائي للبيع (₪)</label>
            <input type="text" inputMode="decimal" dir="ltr" disabled={locked}
              value={finalInput}
              onChange={e => setFinalInput(e.target.value)}
              onBlur={e => {
                const c = e.target.value ? Math.round(Number(e.target.value) * 100) : null;
                set("final_selling_price_cents", c);
              }}
              style={{
                width: "100%", padding: "9px 14px",
                border: "1px solid #C0DD97", borderRadius: "var(--border-radius-sm, 6px)",
                background: "#fff", fontSize: 20, fontWeight: 600,
                fontFamily: "monospace", color: "#27500A",
                boxSizing: "border-box", outline: "none",
              }} />
          </div>

          {/* سعر التركيب — يظهر فقط لأبواب/مواتير */}
          {showInstallation && (
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12, marginTop: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Wrench size={13} color="#7C5ABF" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#5A3FA0" }}>سعر التركيب</span>
                <span style={{ fontSize: 11, color: "#9B7DD4" }}>({form.main_category})</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>بدون تركيب (₪)</label>
                  <input style={{ ...inputStyle, fontFamily: "monospace" }} type="number" step="0.01" dir="ltr" disabled={locked}
                    value={form.price_without_installation || ""}
                    onChange={e => set("price_without_installation", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>مع تركيب (₪)</label>
                  <input style={{ ...inputStyle, fontFamily: "monospace" }} type="number" step="0.01" dir="ltr" disabled={locked}
                    value={form.price_with_installation || ""}
                    onChange={e => set("price_with_installation", e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 4: الملاحظات ── */}
      <div style={SECTION}>
        <div style={SECTION_HEAD}>
          <FileText size={14} color="#1D9E75" />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>ملاحظات</span>
        </div>
        <div style={SECTION_BODY}>
          <textarea
            value={form.notes || ""} disabled={locked}
            placeholder="أي ملاحظة على هذا الصنف..."
            rows={2}
            onChange={e => set("notes", e.target.value)}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
        </div>
      </div>

      {/* ── شريط الإجراءات — مضمّن كآخر كارد ── */}
      {!locked && (
        <div style={{ ...SECTION, marginBottom: 12 }}>
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <button disabled={saving} onClick={() => handleSave("قيد المراجعة")} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 8, border: "none", cursor: saving ? "not-allowed" : "pointer",
              background: "#E6F1FB", color: "#0C447C", fontWeight: 600, fontSize: 13,
              opacity: saving ? 0.6 : 1,
            }}>
              <Send size={14} /> قيد المراجعة
            </button>

            <button disabled={saving} onClick={() => handleSave("معتمد")} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: saving ? "not-allowed" : "pointer",
              background: "#1D9E75", color: "#fff", fontWeight: 600, fontSize: 13,
              opacity: saving ? 0.6 : 1,
            }}>
              <CheckCircle size={14} /> معتمد
            </button>

            {adjacents.next && (
              <button disabled={saving} onClick={handleNext} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 600, fontSize: 13,
                border: "0.5px solid var(--color-border-secondary)",
                background: "transparent", color: "var(--color-text-secondary)",
                opacity: saving ? 0.6 : 1,
              }}>
                {saving ? "جاري…" : "التالي"} <ChevronLeft size={14} />
              </button>
            )}

            <div style={{ flex: 1 }} />

            {/* زر التجميد */}
            {item.is_frozen ? (
              <button onClick={handleUnfreeze} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8,
                border: "0.5px solid #93C5FD",
                background: "#EEF6FF", color: "#1D4ED8",
                fontSize: 12, cursor: "pointer", fontWeight: 600,
              }}>
                <Snowflake size={13} /> إلغاء التجميد
              </button>
            ) : (
              <button onClick={handleFreeze} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8,
                border: "0.5px solid var(--color-border-tertiary)",
                background: "transparent", color: "var(--color-text-tertiary)",
                fontSize: 12, cursor: "pointer",
              }}>
                <Snowflake size={13} /> تجميد
              </button>
            )}

            <button onClick={handleLock} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 8,
              border: "0.5px solid var(--color-border-tertiary)",
              background: "transparent", color: "var(--color-text-tertiary)",
              fontSize: 12, cursor: "pointer",
            }}>
              <Lock size={13} /> قفل
            </button>

            <button onClick={handleDelete} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 8,
              border: "0.5px solid #FCA5A5",
              background: "#FEF2F2", color: "#DC2626",
              fontSize: 12, cursor: "pointer",
            }}>
              <Trash2 size={13} /> حذف
            </button>
          </div>
        </div>
      )}

      {locked && (
        <div style={{ ...SECTION, border: "0.5px solid #FFC8C8", marginBottom: 12 }}>
          <div style={{ padding: "12px 16px", background: "#FFF5F5", display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={14} color="#E05252" />
            <span style={{ fontSize: 13, color: "#E05252", fontWeight: 600 }}>السعر مقفول</span>
            <button className="btn" onClick={() => setShowUnlock(true)} style={{ gap: 6, marginRight: 8 }}>
              <Unlock size={14} /> فك القفل
            </button>
          </div>
        </div>
      )}

      {/* ── سجل الأسعار ── */}
      <div style={{ marginBottom: 24 }}>
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

    </div>
  );
}
