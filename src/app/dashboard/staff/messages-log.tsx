"use client";

import Link from "next/link";
import { MessageSquareText, ChevronRight, ChevronLeft } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";
import type { BroadcastMessageLogEntry } from "@/lib/broadcast";

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function ExportMessagesCsvButton({ entries }: { entries: BroadcastMessageLogEntry[] }) {
  const handleExport = () => {
    const headers = ["من", "إلى", "الرسالة", "التاريخ"];
    const rows = entries.map((e) => [
      e.sender?.name || "",
      e.recipient?.name || "",
      e.message_text || "",
      new Date(e.created_at).toLocaleString("en-GB"),
    ]);
    const csv = "﻿" + [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `messages-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={entries.length === 0}
      className="print:hidden flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
    >
      تصدير Excel (CSV)
    </button>
  );
}

export function MessagesLog({
  entries,
  pagination,
}: {
  entries: BroadcastMessageLogEntry[];
  pagination: { page: number; pageSize: number; total: number };
}) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));

  return (
    <div>
      <div className="print:hidden flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-indigo-600" />
          سجل الرسائل ({pagination.total})
        </h2>
        <div className="flex items-center gap-2">
          <ExportMessagesCsvButton entries={entries} />
          <PrintButton />
        </div>
      </div>
      <p className="print:hidden text-xs text-slate-400 mb-3">
        كل رسالة مُرسلة (تعميم/فردية/رد) تبقى محفوظة هنا حتى لو حُذفت من تيليجرام.
      </p>

      {entries.length === 0 ? (
        <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا توجد رسائل مُرسلة بعد.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-right min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                <th className="px-4 py-3 font-bold">من</th>
                <th className="px-4 py-3 font-bold">إلى</th>
                <th className="px-4 py-3 font-bold">الرسالة</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition align-top">
                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-700 text-sm">{e.sender?.name || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-700 text-sm">{e.recipient?.name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-md whitespace-pre-line">{e.message_text || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(e.created_at).toLocaleString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="print:hidden flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>صفحة {pagination.page} من {totalPages} — {pagination.total} رسالة</span>
          <div className="flex items-center gap-2">
            {pagination.page > 1 ? (
              <Link href={`?tab=messages&page=${pagination.page - 1}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition font-bold">
                <ChevronRight className="h-3.5 w-3.5" /> السابق
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-100 text-slate-300 font-bold"><ChevronRight className="h-3.5 w-3.5" /> السابق</span>
            )}
            {pagination.page < totalPages ? (
              <Link href={`?tab=messages&page=${pagination.page + 1}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition font-bold">
                التالي <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-100 text-slate-300 font-bold">التالي <ChevronLeft className="h-3.5 w-3.5" /></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
