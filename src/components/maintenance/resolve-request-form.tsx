"use client";

import { useState } from "react";
import { resolveMaintenanceRequestAction } from "@/app/dashboard/maintenance/actions";
import { CheckCircle2, ClipboardList } from "lucide-react";

export function ResolveRequestForm({ requestId }: { requestId: string }) {
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [showFieldReport, setShowFieldReport] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
      >
        <CheckCircle2 className="h-4 w-4" /> إغلاق التذكرة
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setIsPending(true);
        try {
          await resolveMaintenanceRequestAction(formData);
        } finally {
          setIsPending(false);
        }
      }}
      className="mt-2 flex flex-col gap-2"
    >
      <input type="hidden" name="request_id" value={requestId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="technician_name"
          placeholder="أسماء الفنيين (مثال: إبراهيم + مؤمن)"
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-48 outline-none focus:border-indigo-500"
        />
        <input
          type="number"
          step="0.01"
          name="cost"
          placeholder="التكلفة"
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-24 outline-none focus:border-indigo-500 font-mono"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setShowFieldReport((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
        >
          <ClipboardList className="h-3.5 w-3.5" /> {showFieldReport ? "إخفاء التقرير الميداني" : "إضافة تقرير ميداني"}
        </button>
      </div>

      {showFieldReport && (
        <div className="flex flex-wrap items-center gap-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
          <input
            type="text"
            name="field_report_number"
            placeholder="رقم التقرير الميداني"
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-36 outline-none focus:border-indigo-500"
          />
          <select
            name="installation_type"
            defaultValue=""
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-indigo-500"
          >
            <option value="">نوع التركيب</option>
            <option value="داخلي">داخلي</option>
            <option value="خارجي">خارجي</option>
          </select>
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-bold text-slate-500">البداية</label>
            <input
              type="datetime-local"
              name="field_start_time"
              className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-indigo-500"
              dir="ltr"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-bold text-slate-500">النهاية</label>
            <input
              type="datetime-local"
              name="field_end_time"
              className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-indigo-500"
              dir="ltr"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
      >
        {isPending ? "..." : "تأكيد الإغلاق"}
      </button>
    </form>
  );
}
