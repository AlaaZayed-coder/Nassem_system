"use client";

import { useState } from "react";
import { createStandaloneMaintenanceRequestAction } from "@/app/dashboard/maintenance/actions";
import { PlusCircle, X } from "lucide-react";

export function NewFieldReportForm({ customers }: { customers: { id: string; name: string; company_name: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow text-sm"
      >
        <PlusCircle className="h-4 w-4" /> تقرير ميداني جديد
      </button>
    );
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-indigo-900">تقرير ميداني جديد (تركيب موتور / ريش / صيانة غير مرتبطة بطلبية سابقة)</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        action={async (formData) => {
          setIsPending(true);
          try {
            await createStandaloneMaintenanceRequestAction(formData);
            setOpen(false);
          } catch (err: any) {
            alert("حدث خطأ: " + err.message);
          } finally {
            setIsPending(false);
          }
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل *</label>
            <select required name="customer_id" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm">
              <option value="">-- اختر العميل --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">أسماء الفنيين</label>
            <input type="text" name="technician_name" placeholder="مثال: إبراهيم + مؤمن" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">وصف الأعمال المُنفَّذة *</label>
          <textarea required name="description" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm resize-none" placeholder="وصف العمل في موقع الزبون..." />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم التقرير</label>
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
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">التكلفة (₪) — اختياري</label>
          <input type="number" step="0.01" name="cost" className="w-40 px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm dir-ltr" dir="ltr" />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition disabled:opacity-50"
        >
          {isPending ? "جاري الحفظ..." : "حفظ وإغلاق"}
        </button>
      </form>
    </div>
  );
}
