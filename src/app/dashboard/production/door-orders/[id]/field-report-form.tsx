"use client";

import { useState } from "react";
import { saveDoorOrderFieldReportAction } from "../actions";
import { ClipboardList } from "lucide-react";

export function FieldReportForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-violet-700 transition shadow text-sm"
      >
        <ClipboardList className="h-4 w-4" /> إدخال تقرير ميداني (تركيب)
      </button>
    );
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-violet-900">تقرير ميداني — تركيب الباب في الموقع</h3>
      <form
        action={async (formData) => {
          setIsPending(true);
          try {
            const result = await saveDoorOrderFieldReportAction(formData);
            if (result?.error) alert(result.error);
            else setOpen(false);
          } finally {
            setIsPending(false);
          }
        }}
        className="space-y-3"
      >
        <input type="hidden" name="order_id" value={orderId} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم التقرير الميداني</label>
            <input type="text" name="field_report_number" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع التركيب</label>
            <select name="installation_type" defaultValue="" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm">
              <option value="">—</option>
              <option value="داخلي">داخلي</option>
              <option value="خارجي">خارجي</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">وقت البداية</label>
            <input type="datetime-local" name="field_start_time" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">وقت النهاية</label>
            <input type="datetime-local" name="field_end_time" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" dir="ltr" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">أسماء الفنيين</label>
            <input type="text" name="field_technician_name" placeholder="مثال: إبراهيم + مؤمن" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" />
          </div>
        </div>

        <p className="text-[11px] text-violet-700">عند الحفظ، ستنتقل حالة الطلبية تلقائياً إلى &quot;جاهزة&quot;.</p>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition disabled:opacity-50"
          >
            {isPending ? "جاري الحفظ..." : "حفظ وتعيين كجاهزة"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
