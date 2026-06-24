"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, X, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, Info, Download } from "lucide-react";
import { importItemsMasterFromExcel, exportImportTemplate } from "@/app/dashboard/inventory/excel-actions";

type Result = {
  added: number;
  updated: number;
  withCat: number;
  withInv: number;
  errors: number;
};

export function ItemsImportModal() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleDownloadTemplate() {
    setIsDownloading(true);
    try {
      const res = await exportImportTemplate();
      if (!res.success || !res.data) return;
      const bytes = Uint8Array.from(atob(res.data), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "قالب_استيراد_الأصناف.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setErrMsg(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    reset();
    setOpen(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
    setErrMsg(null);
  }

  function handleSubmit() {
    if (!file) return;
    setErrMsg(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    startTransition(async () => {
      try {
        const res = await importItemsMasterFromExcel(fd);
        setResult(res);
        if (fileRef.current) fileRef.current.value = "";
        setFile(null);
      } catch (err: any) {
        setErrMsg(err.message || "حدث خطأ أثناء الاستيراد");
      }
    });
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 8, border: "0.5px solid #7C5ABF",
          background: "#F3EFFE", color: "#7C5ABF", fontSize: 12.5,
          fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        <Upload size={14} />
        استيراد أصناف جديدة
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Modal */}
          <div
            onClick={e => e.stopPropagation()}
            dir="rtl"
            style={{
              background: "var(--color-background-primary)",
              borderRadius: 14, width: "100%", maxWidth: 520,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileSpreadsheet size={18} color="#7C5ABF" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>استيراد أصناف جديدة من Excel</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={isDownloading}
                  title="تحميل قالب Excel فارغ"
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 10px", borderRadius: 6,
                    border: "0.5px solid #7C5ABF", background: "#F3EFFE",
                    color: "#7C5ABF", fontSize: 11.5, fontWeight: 600,
                    cursor: isDownloading ? "not-allowed" : "pointer",
                  }}
                >
                  {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  تحميل القالب
                </button>
                <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Info box */}
              <div style={{
                background: "#F3EFFE", border: "0.5px solid #C9AEEE",
                borderRadius: 8, padding: "10px 12px",
                display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <Info size={15} color="#7C5ABF" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 11.5, color: "#5A3FA0", lineHeight: 1.6 }}>
                  <b>الأعمدة المدعومة في الملف:</b><br />
                  كود · اسم الصنف · ملحق الاسم · الوحدة (قطعة/متر) · الرصيد<br />
                  <span style={{ color: "#7C5ABF" }}>
                    ✓ يُحافظ على أسعار وحالة الأصناف الموجودة<br />
                    ✓ يُعيّن التصنيف تلقائياً للأصناف بدون تصنيف<br />
                    ✓ الرصيد يُسجَّل تلقائياً في <b>المستودع الكلي</b>
                  </span>
                </div>
              </div>

              {/* File picker */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                  ملف Excel *
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `1.5px dashed ${file ? "#7C5ABF" : "var(--color-border-tertiary)"}`,
                    borderRadius: 8, padding: "14px 16px",
                    background: file ? "#F9F5FF" : "var(--color-background-secondary)",
                    cursor: "pointer", textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  {file ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <FileSpreadsheet size={16} color="#7C5ABF" />
                      <span style={{ fontSize: 12.5, color: "#7C5ABF", fontWeight: 600 }}>{file.name}</span>
                      <span style={{ fontSize: 11, color: "#9E8CC8" }}>({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <div>
                      <Upload size={20} color="var(--color-text-tertiary)" style={{ margin: "0 auto 4px" }} />
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>اضغط لاختيار ملف .xlsx أو .xls</div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: "none" }} />
              </div>

              {/* Error */}
              {errMsg && (
                <div style={{
                  background: "#FEF2F2", border: "0.5px solid #FECACA",
                  borderRadius: 8, padding: "10px 12px",
                  display: "flex", gap: 8, alignItems: "center",
                }}>
                  <AlertCircle size={15} color="#DC2626" />
                  <span style={{ fontSize: 12, color: "#DC2626" }}>{errMsg}</span>
                </div>
              )}

              {/* Result */}
              {result && (
                <div style={{
                  background: "#F0FDF4", border: "0.5px solid #BBF7D0",
                  borderRadius: 8, padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <CheckCircle size={15} color="#16A34A" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>تمت عملية الاستيراد بنجاح</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                    {[
                      { label: "أصناف جديدة أُضيفت", value: result.added, color: "#15803D" },
                      { label: "أصناف موجودة حُدِّثت", value: result.updated, color: "#1D4ED8" },
                      { label: "أصناف صُنِّفت تلقائياً", value: result.withCat, color: "#7C5ABF" },
                      { label: "سجلات رصيد أُدخلت", value: result.withInv, color: "#B45309" },
                    ].map(r => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--color-text-secondary)" }}>{r.label}</span>
                        <span style={{ fontWeight: 700, color: r.color, fontFamily: "monospace" }}>{r.value.toLocaleString("en")}</span>
                      </div>
                    ))}
                    {result.errors > 0 && (
                      <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#DC2626" }}>أخطاء</span>
                        <span style={{ fontWeight: 700, color: "#DC2626", fontFamily: "monospace" }}>{result.errors}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-start", marginTop: 4 }}>
                <button
                  onClick={handleSubmit}
                  disabled={!file || isPending}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 18px", borderRadius: 8,
                    background: !file || isPending ? "#D1C4E9" : "#7C5ABF",
                    color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
                    cursor: !file || isPending ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {isPending ? "جاري الاستيراد..." : "بدء الاستيراد"}
                </button>
                <button
                  onClick={result ? close : reset}
                  style={{
                    padding: "8px 14px", borderRadius: 8,
                    border: "0.5px solid var(--color-border-tertiary)",
                    background: "transparent", fontSize: 13,
                    color: "var(--color-text-secondary)", cursor: "pointer",
                  }}
                >
                  {result ? "إغلاق" : "إلغاء"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
