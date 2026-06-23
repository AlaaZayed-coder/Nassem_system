"use client";

import { useState, useTransition, useMemo } from "react";
import { Warehouse, InventoryItem } from "@/lib/inventory-data";
import { formatCurrency } from "@/lib/format";
import { submitStockMovementAction, submitStockTransferAction } from "../actions";
import { ArrowRightLeft, Plus, Minus, Search, X, Check, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  warehouses: Warehouse[];
  items: InventoryItem[];
  stats: {
    totalCostValue: number;
    totalSellingValue: number;
    totalQtyAll: number;
    warehouseCount: number;
    itemCount: number;
  };
};

type Tab = "overview" | "movement" | "stocktake";

const PAGE_SIZE = 50;

export function WarehouseClient({ warehouses, items, stats }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="legacy-wrapper" dir="rtl">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 className="section-title" style={{ margin: 0 }}>إدارة المخزون</h3>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        <div style={{ background: "var(--brand)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8 }}>تكلفة المخزون</div>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace" }} dir="ltr">{formatCurrency(stats.totalCostValue)}</div>
        </div>
        <div style={{ background: "#1D9E75", borderRadius: "var(--border-radius-md)", padding: "10px 14px", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8 }}>القيمة البيعية</div>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace" }} dir="ltr">{formatCurrency(stats.totalSellingValue)}</div>
        </div>
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", background: "var(--color-background-primary)" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>إجمالي الوحدات</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.totalQtyAll.toLocaleString("en")}</div>
        </div>
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", background: "var(--color-background-primary)" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>عدد الأصناف</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.itemCount.toLocaleString("en")}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 0 }}>
        {([
          { key: "overview",   label: "نظرة عامة" },
          { key: "movement",   label: "إدخال / إخراج" },
          { key: "stocktake",  label: "جرد المخزون" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--brand)" : "2px solid transparent",
              background: "none",
              color: tab === t.key ? "var(--brand)" : "var(--color-text-secondary)",
              cursor: "pointer",
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview"  && <OverviewTab  warehouses={warehouses} items={items} />}
      {tab === "movement"  && <MovementTab  warehouses={warehouses} items={items} />}
      {tab === "stocktake" && <StocktakeTab warehouses={warehouses} items={items} />}

    </div>
  );
}

/* ────────────── TAB 1: نظرة عامة ────────────── */
function OverviewTab({ warehouses, items }: { warehouses: Warehouse[]; items: InventoryItem[] }) {
  const [search, setSearch] = useState("");
  const [wFilter, setWFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => items.filter(item => {
    const name = (item.approved_name || item.original_name || "").toLowerCase();
    const code = item.item_code.toLowerCase();
    const q = search.toLowerCase();
    if (q && !name.includes(q) && !code.includes(q)) return false;
    if (wFilter !== "ALL") {
      if ((item.inventory[wFilter] || 0) <= 0) return false;
    }
    return true;
  }), [items, search, wFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "5px 10px", background: "var(--color-background-primary)" }}>
          <Search size={13} color="var(--color-text-tertiary)" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث برمز الصنف أو اسمه..." style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 13 }} />
        </div>
        <select value={wFilter} onChange={e => { setWFilter(e.target.value); setPage(1); }}
          style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "5px 10px", background: "var(--color-background-primary)", fontSize: 13 }}>
          <option value="ALL">جميع المستودعات</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>رمز الصنف</th>
              <th>اسم الصنف</th>
              <th>الوحدة</th>
              {warehouses.map(w => <th key={w.id} style={{ textAlign: "center" }}>{w.name}</th>)}
              <th style={{ textAlign: "center" }}>الإجمالي</th>
              <th style={{ textAlign: "center" }}>التكلفة</th>
              <th style={{ textAlign: "center" }}>سعر البيع</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(item => {
              const total = Object.values(item.inventory).reduce((a, b) => a + b, 0);
              return (
                <tr key={item.item_code}>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }} dir="ltr">{item.item_code}</td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.approved_name || item.original_name}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{item.unit_of_measure || "وحدة"}</td>
                  {warehouses.map(w => (
                    <td key={w.id} style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 600,
                      color: (item.inventory[w.id] || 0) > 0 ? "var(--brand)" : "var(--color-text-tertiary)" }}>
                      {item.inventory[w.id] || 0}
                    </td>
                  ))}
                  <td style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 700,
                    color: total > 0 ? "#1D9E75" : "var(--color-text-tertiary)" }}>
                    {total}
                  </td>
                  <td style={{ textAlign: "center", fontFamily: "monospace", fontSize: 12 }} dir="ltr">
                    {formatCurrency(item.cost_price_cents / 100)}
                  </td>
                  <td style={{ textAlign: "center", fontFamily: "monospace", fontSize: 12 }} dir="ltr">
                    {formatCurrency(item.final_selling_price_cents / 100)}
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr><td colSpan={7 + warehouses.length} style={{ textAlign: "center", padding: 20, color: "var(--color-text-tertiary)" }}>
                لا توجد أصناف
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronRight size={14} />
          </button>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {page} / {totalPages} ({filtered.length.toLocaleString("en")} صنف)
          </span>
          <button className="btn btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronLeft size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ────────────── TAB 2: إدخال / إخراج ────────────── */
function MovementTab({ warehouses, items }: { warehouses: Warehouse[]; items: InventoryItem[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [mode, setMode] = useState<"IN" | "OUT" | "ADJUST" | "TRANSFER">("IN");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id || warehouses[0]?.id || "");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState("");

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return items.filter(i =>
      i.item_code.toLowerCase().includes(q) ||
      (i.approved_name || i.original_name || "").toLowerCase().includes(q)
    ).slice(0, 10);
  }, [search, items]);

  function reset() {
    setSelected(null);
    setSearch("");
    setQty("");
    setNotes("");
  }

  function submit() {
    if (!selected || !qty) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("item_code", selected.item_code);
        if (mode === "TRANSFER") {
          fd.append("from_warehouse_id", warehouseId);
          fd.append("to_warehouse_id", toWarehouseId);
          fd.append("quantity", qty);
          fd.append("notes", notes);
          await submitStockTransferAction(fd);
        } else {
          fd.append("warehouse_id", warehouseId);
          fd.append("movement_type", mode);
          fd.append("quantity", qty);
          fd.append("notes", notes);
          await submitStockMovementAction(fd);
        }
        setToast("✓ تم بنجاح");
        setTimeout(() => setToast(""), 3000);
        reset();
      } catch (e: any) {
        setToast("خطأ: " + e.message);
        setTimeout(() => setToast(""), 4000);
      }
    });
  }

  return (
    <div style={{ maxWidth: 560 }}>
      {toast && <div className="toast">{toast}</div>}

      {/* Step 1: Search item */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
          ١. ابحث عن الصنف
        </label>
        {selected ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "0.5px solid var(--brand)", borderRadius: "var(--border-radius-md)", padding: "8px 12px", background: "var(--color-background-primary)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.approved_name || selected.original_name}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "monospace" }} dir="ltr">{selected.item_code}</div>
            </div>
            <button onClick={reset} className="btn btn-ghost"><X size={14} /></button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "7px 10px", background: "var(--color-background-primary)" }}>
              <Search size={13} color="var(--color-text-tertiary)" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="اكتب رمز الصنف أو اسمه..." autoFocus
                style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 13 }} />
            </div>
            {results.length > 0 && (
              <div style={{ position: "absolute", top: "100%", right: 0, left: 0, zIndex: 20, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                {results.map(item => (
                  <div key={item.item_code} onClick={() => { setSelected(item); setSearch(""); }}
                    style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.approved_name || item.original_name}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "monospace" }} dir="ltr">{item.item_code}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <>
          {/* Step 2: Mode */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              ٢. نوع الحركة
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {([
                { v: "IN",       label: "إدخال (+)",   color: "#1D9E75" },
                { v: "OUT",      label: "إخراج (−)",   color: "#E05252" },
                { v: "ADJUST",   label: "جرد (=)",     color: "#378ADD" },
                { v: "TRANSFER", label: "نقل ←→",      color: "#7C5ABF" },
              ] as { v: typeof mode; label: string; color: string }[]).map(m => (
                <button key={m.v} onClick={() => setMode(m.v)}
                  style={{
                    flex: 1, padding: "7px 4px", fontSize: 12, fontWeight: 600,
                    border: `0.5px solid ${mode === m.v ? m.color : "var(--color-border-secondary)"}`,
                    borderRadius: "var(--border-radius-md)",
                    background: mode === m.v ? m.color : "var(--color-background-primary)",
                    color: mode === m.v ? "#fff" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Warehouse */}
          <div style={{ marginBottom: 14, display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                {mode === "TRANSFER" ? "٣. من مستودع" : "٣. المستودع"}
              </label>
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
                style={{ width: "100%", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "7px 10px", background: "var(--color-background-primary)", fontSize: 13 }}>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} (متوفر: {selected.inventory[w.id] || 0})</option>
                ))}
              </select>
            </div>
            {mode === "TRANSFER" && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                  إلى مستودع
                </label>
                <select value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)}
                  style={{ width: "100%", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "7px 10px", background: "var(--color-background-primary)", fontSize: 13 }}>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Step 4: Quantity */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              ٤. الكمية
            </label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              min="0" step="0.01" placeholder="0" dir="ltr"
              style={{ width: "100%", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px", background: "var(--color-background-primary)", fontSize: 16, fontFamily: "monospace", textAlign: "left" }} />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              ملاحظات (اختياري)
            </label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="مثال: استلام بضاعة جديدة..."
              style={{ width: "100%", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "7px 10px", background: "var(--color-background-primary)", fontSize: 13 }} />
          </div>

          <button onClick={submit} disabled={isPending || !qty}
            className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 14 }}>
            <Check size={16} />
            {isPending ? "جاري التنفيذ..." : "تنفيذ"}
          </button>
        </>
      )}
    </div>
  );
}

/* ────────────── TAB 3: جرد المخزون ────────────── */
function StocktakeTab({ warehouses, items }: { warehouses: Warehouse[]; items: InventoryItem[] }) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      if (!q) return true;
      return i.item_code.toLowerCase().includes(q) ||
        (i.approved_name || i.original_name || "").toLowerCase().includes(q);
    });
  }, [items, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function saveAll() {
    const changed = Object.entries(counts).filter(([, v]) => v !== "");
    if (changed.length === 0) return;
    startTransition(async () => {
      try {
        for (const [itemCode, val] of changed) {
          const fd = new FormData();
          fd.append("item_code", itemCode);
          fd.append("warehouse_id", warehouseId);
          fd.append("movement_type", "ADJUST");
          fd.append("quantity", val);
          fd.append("notes", "جرد مخزون");
          await submitStockMovementAction(fd);
        }
        setToast(`✓ تم حفظ ${changed.length} صنف`);
        setTimeout(() => setToast(""), 3000);
        setCounts({});
      } catch (e: any) {
        setToast("خطأ: " + e.message);
        setTimeout(() => setToast(""), 4000);
      }
    });
  }

  const changedCount = Object.values(counts).filter(v => v !== "").length;

  return (
    <div>
      {toast && <div className="toast">{toast}</div>}

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
          style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", background: "var(--color-background-primary)", fontSize: 13 }}>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", background: "var(--color-background-primary)" }}>
          <Search size={13} color="var(--color-text-tertiary)" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث عن صنف..."
            style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 13 }} />
        </div>
        <button onClick={() => setCounts({})} className="btn btn-ghost" title="مسح التغييرات">
          <RotateCcw size={14} />
        </button>
        {changedCount > 0 && (
          <button onClick={saveAll} disabled={isPending} className="btn btn-primary" style={{ gap: 6 }}>
            <Check size={14} />
            حفظ {changedCount} صنف
          </button>
        )}
      </div>

      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
        أدخل الكمية الفعلية في خانة &quot;الجرد&quot; — اتركها فارغة إن لم تتغير
      </div>

      {/* Table */}
      <table className="tbl">
        <thead>
          <tr>
            <th>رمز الصنف</th>
            <th>اسم الصنف</th>
            <th style={{ textAlign: "center" }}>في النظام</th>
            <th style={{ textAlign: "center", color: "var(--brand)" }}>الجرد الفعلي</th>
            <th style={{ textAlign: "center" }}>الفرق</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map(item => {
            const systemQty = item.inventory[warehouseId] || 0;
            const newVal = counts[item.item_code];
            const newQty = newVal !== undefined && newVal !== "" ? Number(newVal) : null;
            const diff = newQty !== null ? newQty - systemQty : null;
            return (
              <tr key={item.item_code} style={{ background: newVal !== undefined && newVal !== "" ? "rgba(29,158,117,0.04)" : undefined }}>
                <td style={{ fontFamily: "monospace", fontSize: 11 }} dir="ltr">{item.item_code}</td>
                <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.approved_name || item.original_name}
                </td>
                <td style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>{systemQty}</td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="number" min="0" step="0.01" placeholder={String(systemQty)}
                    value={counts[item.item_code] || ""}
                    onChange={e => setCounts(prev => ({ ...prev, [item.item_code]: e.target.value }))}
                    style={{
                      width: 80, textAlign: "center", fontFamily: "monospace", fontWeight: 600,
                      border: `0.5px solid ${newVal ? "var(--brand)" : "var(--color-border-secondary)"}`,
                      borderRadius: "var(--border-radius-sm)", padding: "4px 6px", fontSize: 13,
                      background: newVal ? "rgba(29,158,117,0.06)" : "var(--color-background-primary)",
                    }}
                    dir="ltr"
                  />
                </td>
                <td style={{ textAlign: "center", fontFamily: "monospace", fontSize: 13,
                  color: diff === null ? "transparent" : diff > 0 ? "#1D9E75" : diff < 0 ? "#E05252" : "var(--color-text-tertiary)",
                  fontWeight: 600 }}>
                  {diff !== null ? (diff > 0 ? `+${diff}` : String(diff)) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronRight size={14} />
          </button>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {page} / {totalPages} ({filtered.length.toLocaleString("en")} صنف)
          </span>
          <button className="btn btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronLeft size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
