"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { exportPricingSheet } from "@/app/dashboard/inventory/excel-actions";

export function PricingExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await exportPricingSheet();
      if (!res.success || !res.data) return;
      const bytes = Uint8Array.from(atob(res.data), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ملف_إدخال_الأسعار_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 8,
        border: "0.5px solid #1D9E75",
        background: loading ? "#F0FDF4" : "#F0FDF4",
        color: "#1D6E52", fontSize: 12.5, fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      {loading ? "جاري التصدير…" : "تصدير ملف الأسعار"}
    </button>
  );
}
