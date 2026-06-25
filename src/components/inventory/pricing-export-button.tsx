"use client";

import { useState, useRef } from "react";
import { FileDown, FileUp, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { exportPricingSheet, importPricingSheetFull } from "@/app/dashboard/inventory/excel-actions";

export function PricingExportButton() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await exportPricingSheet();
      if (!res.success || !res.data) return;
      const bytes = Uint8Array.from(atob(res.data), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ملف_الأسعار_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await importPricingSheetFull(fd);
      setResult(res);
      setShowResult(true);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
      setShowResult(true);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 6 }}>
        {/* تصدير */}
        <button onClick={handleExport} disabled={exporting}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "0.5px solid #1D9E75", background: "#F0FDF4", color: "#1D6E52", fontSize: 12.5, fontWeight: 600, cursor: exporting ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: exporting ? 0.7 : 1 }}>
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          {exporting ? "جاري التصدير…" : "تصدير ملف الأسعار"}
        </button>

        {/* استيراد */}
        <button onClick={() => fileRef.current?.click()} disabled={importing}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "0.5px solid #185FA5", background: "#E6F1FB", color: "#0C447C", fontSize: 12.5, fontWeight: 600, cursor: importing ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: importing ? 0.7 : 1 }}>
          {importing ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
          {importing ? "جاري الاستيراد…" : "استيراد الأسعار"}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx" onChange={handleImport} style={{ display: "none" }} />
      </div>

      {/* Result modal */}
      {showResult && result && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowResult(false)}>
          <div onClick={e => e.stopPropagation()} dir="rtl"
            style={{ background: "var(--color-background-primary)", borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {result.success
                  ? <CheckCircle size={16} color="#1D9E75" />
                  : <AlertCircle size={16} color="#DC2626" />}
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {result.success ? "تمت عملية الاستيراد" : "حدث خطأ"}
                </span>
              </div>
              <button onClick={() => setShowResult(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 18 }}>
              {result.success ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                  {[
                    { label: "أسعار مُحدَّثة",     value: result.priceUpdated, color: "#1D9E75" },
                    { label: "تصنيفات أُضيفت",      value: result.catAdded,     color: "#185FA5" },
                    { label: "تصنيفات عُدِّلت",     value: result.catRenamed,   color: "#7C5ABF" },
                    { label: "تصنيفات حُذفت",       value: result.catDeleted,   color: "#E05252" },
                    { label: "أصناف أُضيفت",        value: result.itemAdded,    color: "#1D9E75" },
                    { label: "أصناف حُذفت",         value: result.itemDeleted,  color: "#E05252" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>{r.label}</span>
                      <span style={{ fontWeight: 700, color: r.color, fontFamily: "monospace" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#DC2626" }}>{result.error}</div>
              )}
              {result.errors?.length > 0 && (
                <div style={{ marginTop: 12, background: "#FEF2F2", border: "0.5px solid #FECACA", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#DC2626", marginBottom: 4 }}>أخطاء ({result.errors.length}):</div>
                  {result.errors.slice(0, 5).map((e: string, i: number) => (
                    <div key={i} style={{ fontSize: 11, color: "#DC2626", marginBottom: 2 }}>• {e}</div>
                  ))}
                  {result.errors.length > 5 && <div style={{ fontSize: 11, color: "#DC2626" }}>... و {result.errors.length - 5} أخطاء أخرى</div>}
                </div>
              )}
              <button onClick={() => setShowResult(false)} style={{ marginTop: 16, width: "100%", padding: "8px 0", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "transparent", fontSize: 13, cursor: "pointer" }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
