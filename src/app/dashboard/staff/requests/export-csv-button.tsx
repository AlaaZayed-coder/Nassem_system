"use client";

import { FileDown } from "lucide-react";
import { REQUEST_TYPE_LABEL, type EmployeeRequest } from "@/lib/employee-requests-data";

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function detailText(request: EmployeeRequest): string {
  const d = request.details || {};
  switch (request.request_type) {
    case "loan": return `المبلغ: ${d.amount} ₪${d.repayment_method ? ` — ${d.repayment_method}` : ""}`;
    case "vacation": return `من ${d.start_date} إلى ${d.end_date}${d.reason ? ` — ${d.reason}` : ""}`;
    case "permission": return `${d.date} — من ${d.from_time || "—"} إلى ${d.to_time || "—"}${d.reason ? ` — ${d.reason}` : ""}`;
    case "complaint": return `${d.subject ? `${d.subject}: ` : ""}${d.description || ""}`;
    case "attendance_fix": return `${d.period ? `${d.period} — ` : ""}تاريخ: ${d.date}${d.time ? ` — ${d.time}` : ""}`;
    case "injury_report": return `${d.date} — ${d.description || ""}`;
    case "work_report": return d.content || (d.voice_url ? "تقرير صوتي" : "");
    default: return "";
  }
}

export function ExportRequestsCsvButton({ requests, filenamePrefix }: { requests: EmployeeRequest[]; filenamePrefix: string }) {
  const handleExport = () => {
    const headers = ["النوع", "الموظف", "التفاصيل", "الحالة", "التاريخ"];
    const rows = requests.map((r) => [
      REQUEST_TYPE_LABEL[r.request_type] || r.request_type,
      r.erp_staff?.name || "",
      detailText(r),
      r.status,
      new Date(r.created_at).toLocaleDateString("en-GB"),
    ]);

    const csv = "﻿" + [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={requests.length === 0}
      className="print:hidden flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
    >
      <FileDown className="h-4 w-4" />
      تصدير Excel (CSV)
    </button>
  );
}
