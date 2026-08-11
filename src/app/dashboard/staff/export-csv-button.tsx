"use client";

import { FileDown } from "lucide-react";
import { ROLE_LABELS } from "@/lib/role-labels";
import type { Staff } from "@/lib/staff-data";

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function ExportCsvButton({ staff }: { staff: Staff[] }) {
  const handleExport = () => {
    const headers = ["الاسم", "الدور", "الحالة", "الهاتف", "معرّف تليجرام", "رصيد الإجازات", "تاريخ الانضمام"];
    const rows = staff.map((s) => [
      s.name,
      ROLE_LABELS[s.role] || s.role,
      s.is_active ? "نشط" : "معطّل",
      s.phone || "",
      s.telegram_chat_id || "",
      String(s.vacation_balance_days),
      new Date(s.created_at).toLocaleDateString("en-GB"),
    ]);

    const csv = "﻿" + [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={staff.length === 0}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
    >
      <FileDown className="h-4 w-4" />
      تصدير Excel (CSV)
    </button>
  );
}
