"use client";

import { useState, useTransition } from "react";
import { dispatchInstallationAction } from "../actions";
import { Staff } from "@/lib/staff-data";
import { Truck } from "lucide-react";

export function DispatchForm({ doorOrderId, staff }: { doorOrderId: string; staff: Staff[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.append("door_order_id", doorOrderId);
    startTransition(async () => {
      const result = await dispatchInstallationAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="font-bold text-slate-800 mb-1 text-lg flex items-center gap-2">
        <Truck className="h-5 w-5 text-indigo-500" /> سند إخراج لفريق التركيب
      </h2>
      <p className="text-slate-500 text-sm mb-4">تعيين فريق التركيب وتسجيل خروج الطلبية من المصنع/المستودع نحو موقع العميل.</p>

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">اسم فريق التركيب *</label>
          <input required name="installation_team_name" type="text" placeholder="مثال: فريق إبراهيم + مؤمن" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">تم الإخراج بواسطة</label>
          <select name="dispatched_by_staff_id" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm bg-white">
            <option value="">-- بدون تحديد --</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">ملاحظات سند الإخراج</label>
          <textarea name="exit_slip_notes" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm resize-none" placeholder="أي تفاصيل إضافية عن المواد الخارجة أو التعليمات..." />
        </div>

        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

        <button disabled={isPending} type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50">
          {isPending ? "جارٍ الحفظ..." : "تأكيد الإخراج وبدء التركيب"}
        </button>
      </form>
    </div>
  );
}
