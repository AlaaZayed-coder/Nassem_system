"use client";

import { useEffect, useState } from "react";
import {
  fetchLegacyCategories, fetchLegacyDashboardStats,
  updateLegacyCategory, addLegacyCategory,
  renameLegacyCategory, addLegacyItem, deleteLegacyCategory,
} from "../legacy-actions";
import { Plus, Pencil, Check, X, ChevronLeft, Package, Trash2 } from "lucide-react";

type Cat = { id: string; name: string; type: string; is_active: boolean };
type StatRow = { category: string; total: number; approved: number; unpriced: number };

const CARD_COLORS = ["#1D9E75","#378ADD","#EF9F27","#E05252","#7C5ABF","#1D9E75","#378ADD","#EF9F27","#E05252","#7C5ABF","#888780"];

export default function CategoriesPage() {
  const [cats, setCats]   = useState<Cat[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [toast, setToast] = useState({ msg: "", ok: true });

  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat]   = useState(false);

  const [editingName, setEditingName]   = useState<string | null>(null); // category name being edited
  const [editingValue, setEditingValue] = useState("");
  const [savingEdit, setSavingEdit]     = useState(false);

  const [addItemCat, setAddItemCat] = useState<string | null>(null);
  const [itemForm, setItemForm]     = useState({ item_code: "", original_name: "", name_suffix: "", unit_of_measure: "قطعة" });
  const [savingItem, setSavingItem] = useState(false);

  const load = () =>
    Promise.all([fetchLegacyCategories(), fetchLegacyDashboardStats()]).then(([c, d]) => {
      setCats(c);
      setStats(d.categories || []);
    });

  useEffect(() => { load(); }, []);

  function notify(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 3500);
  }

  // resolve cat record by name
  function catByName(name: string) {
    return cats.find(c => c.name === name) || null;
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      await addLegacyCategory({ name: newCatName.trim(), type: "main" });
      notify("تمت إضافة التصنيف ✓");
      setNewCatName(""); setShowAddCat(false); load();
    } catch (e: any) { notify(e.message, false); }
    setSavingCat(false);
  }

  async function saveEdit(oldName: string) {
    if (!editingValue.trim() || !oldName) return;
    setSavingEdit(true);
    const cat = catByName(oldName);
    try {
      if (cat) {
        await renameLegacyCategory(cat.id, editingValue.trim());
      } else {
        // category exists only in items — just rename via SQL update on items
        // We use addLegacyCategory first, then bulk rename
        await addLegacyCategory({ name: editingValue.trim(), type: "main" });
        // update items
        const { supabase } = await import("@/lib/supabase");
        await supabase.from("erp_items").update({ main_category: editingValue.trim() }).eq("main_category", oldName);
      }
      notify("تم تعديل اسم التصنيف ✓");
      setEditingName(null); load();
    } catch (e: any) { notify(e.message, false); }
    setSavingEdit(false);
  }

  async function handleDeleteCategory(name: string) {
    const row = stats.find(s => s.category === name);
    if (row && row.total > 0) {
      notify(`لا يمكن الحذف — يوجد ${row.total} صنف مرتبط. أعد تصنيفها أولاً.`, false);
      return;
    }
    if (!confirm(`هل تريد حذف تصنيف "${name}" نهائياً؟`)) return;
    const cat = catByName(name);
    if (cat) {
      try { await deleteLegacyCategory(cat.id); notify("تم الحذف ✓"); load(); }
      catch (e: any) { notify(e.message, false); }
    }
  }

  async function handleAddItem() {
    if (!itemForm.item_code.trim() || !itemForm.original_name.trim() || !addItemCat) return;
    setSavingItem(true);
    try {
      await addLegacyItem({ ...itemForm, main_category: addItemCat });
      notify(`تمت إضافة الصنف "${itemForm.original_name}" ✓`);
      setItemForm({ item_code: "", original_name: "", name_suffix: "", unit_of_measure: "قطعة" });
      setAddItemCat(null); load();
    } catch (e: any) { notify(e.message, false); }
    setSavingItem(false);
  }

  // Sort: by total descending, push "بدون تصنيف" to end
  const sorted = [...stats].sort((a, b) => {
    if (a.category === "بدون تصنيف") return 1;
    if (b.category === "بدون تصنيف") return -1;
    return b.total - a.total;
  });

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: 6,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-primary)",
    fontSize: 13, boxSizing: "border-box",
  };

  return (
    <div className="legacy-wrapper" dir="rtl">
      {toast.msg && (
        <div className="toast" style={{ background: toast.ok ? "#1D9E75" : "#E05252" }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 className="section-title" style={{ margin: 0 }}>
          التصنيفات
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 400, marginRight: 8 }}>
            ({sorted.filter(s => s.category !== "بدون تصنيف").length} تصنيف)
          </span>
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"
            onClick={() => window.location.href = "/dashboard/inventory/items?no_category=1"}>
            أصناف بدون تصنيف
          </button>
          <button onClick={() => { setShowAddCat(true); setNewCatName(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> تصنيف جديد
          </button>
        </div>
      </div>

      {/* Category cards — from actual item data */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, marginBottom: 20 }}>
        {sorted.map((s, i) => {
          const isNoCat  = s.category === "بدون تصنيف";
          const pct      = s.total ? Math.round((s.approved || 0) / s.total * 100) : 0;
          const col      = isNoCat ? "#888780" : CARD_COLORS[i % (CARD_COLORS.length - 1)];
          const isEditing = editingName === s.category;
          const hasCatRecord = !!catByName(s.category);

          return (
            <div key={s.category} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, background: "var(--color-background-primary)", overflow: "hidden" }}>
              {/* Card header */}
              <div style={{ background: col, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                {isEditing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    <input autoFocus value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(s.category); if (e.key === "Escape") setEditingName(null); }}
                      style={{ ...inputSt, fontSize: 12, padding: "4px 8px", flex: 1, color: "#fff", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.5)" }} />
                    <button onClick={() => saveEdit(s.category)} disabled={savingEdit}
                      style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#fff" }}>
                      {savingEdit ? "…" : <Check size={14} />}
                    </button>
                    <button onClick={() => setEditingName(null)}
                      style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#fff" }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.category}</span>
                    {!isNoCat && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => { setEditingName(s.category); setEditingValue(s.category); }} title="تعديل"
                          style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: "#fff" }}>
                          <Pencil size={12} />
                        </button>
                        {hasCatRecord && s.total === 0 && (
                          <button onClick={() => handleDeleteCategory(s.category)} title="حذف"
                            style={{ background: "rgba(255,0,0,0.3)", border: "none", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: "#fff" }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Card body */}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)" }}>{s.total.toLocaleString("en")}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>صنف</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
                  معتمد {s.approved || 0} · غير مسعّر {s.unpriced || 0}
                </div>
                <div style={{ height: 5, background: "var(--color-border-tertiary)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", background: col, width: `${pct}%`, borderRadius: 4 }} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => window.location.href =
                      isNoCat
                        ? "/dashboard/inventory/items?no_category=1"
                        : `/dashboard/inventory/items?main_category=${encodeURIComponent(s.category)}`}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 0", borderRadius: 6, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                    <ChevronLeft size={12} /> عرض الأصناف
                  </button>
                  {!isNoCat && (
                    <button
                      onClick={() => { setAddItemCat(s.category); setItemForm({ item_code: "", original_name: "", name_suffix: "", unit_of_measure: "قطعة" }); }}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 0", borderRadius: 6, border: "none", background: col + "22", fontSize: 11, fontWeight: 600, color: col, cursor: "pointer" }}>
                      <Plus size={12} /> إضافة صنف
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ Modal: تصنيف جديد ══ */}
      {showAddCat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowAddCat(false)}>
          <div onClick={e => e.stopPropagation()} dir="rtl"
            style={{ background: "var(--color-background-primary)", borderRadius: 12, width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>إضافة تصنيف جديد</span>
              <button onClick={() => setShowAddCat(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>اسم التصنيف *</label>
                <input autoFocus style={inputSt} value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddCategory()}
                  placeholder="مثال: أبواب ومستلزماتها" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAddCategory} disabled={savingCat || !newCatName.trim()}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: savingCat || !newCatName.trim() ? "#ccc" : "#1D9E75", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {savingCat ? "جاري الحفظ…" : "حفظ التصنيف"}
                </button>
                <button onClick={() => setShowAddCat(false)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "transparent", fontSize: 13, cursor: "pointer" }}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: إضافة صنف ══ */}
      {addItemCat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setAddItemCat(null)}>
          <div onClick={e => e.stopPropagation()} dir="rtl"
            style={{ background: "var(--color-background-primary)", borderRadius: 12, width: "100%", maxWidth: 460, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Package size={16} color="#1D9E75" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>إضافة صنف جديد</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>التصنيف: {addItemCat}</div>
                </div>
              </div>
              <button onClick={() => setAddItemCat(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>كود الصنف *</label>
                  <input style={inputSt} value={itemForm.item_code}
                    onChange={e => setItemForm(f => ({ ...f, item_code: e.target.value }))}
                    placeholder="مثال: M10" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>الوحدة</label>
                  <select style={inputSt} value={itemForm.unit_of_measure}
                    onChange={e => setItemForm(f => ({ ...f, unit_of_measure: e.target.value }))}>
                    <option value="قطعة">قطعة</option>
                    <option value="متر">متر</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>اسم الصنف *</label>
                <input style={inputSt} value={itemForm.original_name}
                  onChange={e => setItemForm(f => ({ ...f, original_name: e.target.value }))}
                  placeholder="الاسم الأصلي" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>ملحق الاسم</label>
                <input style={inputSt} value={itemForm.name_suffix}
                  onChange={e => setItemForm(f => ({ ...f, name_suffix: e.target.value }))}
                  placeholder="اختياري" />
              </div>
              <div style={{ background: "var(--color-background-secondary)", borderRadius: 6, padding: "8px 12px", display: "flex", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>سيُضاف إلى:</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1D9E75" }}>{addItemCat}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAddItem}
                  disabled={savingItem || !itemForm.item_code.trim() || !itemForm.original_name.trim()}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: savingItem || !itemForm.item_code.trim() || !itemForm.original_name.trim() ? "#ccc" : "#1D9E75", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {savingItem ? "جاري الحفظ…" : "إضافة الصنف"}
                </button>
                <button onClick={() => setAddItemCat(null)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "transparent", fontSize: 13, cursor: "pointer" }}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
