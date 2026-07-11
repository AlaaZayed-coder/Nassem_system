"use client";

import { useState, useTransition } from "react";
import { submitInstallationReportAction } from "../actions";
import { Camera } from "lucide-react";

export function InstallationReportForm({ doorOrderId }: { doorOrderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.append("door_order_id", doorOrderId);
    startTransition(async () => {
      const result = await submitInstallationReportAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="font-bold text-slate-800 mb-1 text-lg flex items-center gap-2">
        <Camera className="h-5 w-5 text-violet-500" /> التقرير الميداني — تركيب في الموقع
      </h2>
      <p className="text-slate-500 text-sm mb-4">صوّر الموقع قبل وبعد التركيب، وسجّل بيانات الوصول والمستلم.</p>

      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">رقم التقرير الميداني</label>
            <input type="text" name="field_report_number" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">نوع التركيب</label>
            <select name="installation_type" defaultValue="" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm bg-white">
              <option value="">—</option>
              <option value="داخلي">داخلي</option>
              <option value="خارجي">خارجي</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">وقت الوصول</label>
            <input type="datetime-local" name="field_start_time" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">وقت المغادرة</label>
            <input type="datetime-local" name="field_end_time" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" dir="ltr" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">أسماء الفنيين</label>
            <input type="text" name="field_technician_name" placeholder="مثال: إبراهيم + مؤمن" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">صورة الموقع قبل التركيب</label>
            <input type="file" name="before_photo" accept="image/*" capture="environment" className="w-full text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">صورة الموقع بعد التركيب</label>
            <input type="file" name="after_photo" accept="image/*" capture="environment" className="w-full text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
          <div>
            <label className="block text-xs font-bold text-indigo-900 mb-1">اسم الشخص المستلم *</label>
            <input required type="text" name="recipient_name" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-indigo-900 mb-1">رقم هاتف المستلم</label>
            <input type="text" name="recipient_phone" dir="ltr" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" />
          </div>
        </div>

        <p className="text-[11px] text-violet-700">عند الحفظ، سيصل طلب تأكيد استلام العميل عبر تيليجرام لمن قام بالإخراج.</p>

        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

        <button disabled={isPending} type="submit" className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition disabled:opacity-50">
          {isPending ? "جارٍ الحفظ..." : "حفظ التقرير وطلب تأكيد العميل"}
        </button>
      </form>
    </div>
  );
}
