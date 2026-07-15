"use client";

import { useState, useTransition } from "react";
import { REQUEST_TYPE_LABEL, EmployeeRequestType } from "@/lib/employee-requests-data";
import { createEmployeeRequestAction } from "./actions";
import { Send } from "lucide-react";

const REQUEST_TYPES = Object.keys(REQUEST_TYPE_LABEL) as EmployeeRequestType[];

export function NewRequestForm({ staffId }: { staffId: string }) {
  const [isPending, startTransition] = useTransition();
  const [requestType, setRequestType] = useState<EmployeeRequestType>("vacation");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    formData.append("staff_id", staffId);
    formData.append("request_type", requestType);
    startTransition(async () => {
      const result = await createEmployeeRequestAction(formData);
      if (result.error) setError(result.error);
      else setSuccess(true);
    });
  };

  return (
    <form action={handleSubmit} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">نوع الطلب</label>
        <select value={requestType} onChange={(e) => setRequestType(e.target.value as EmployeeRequestType)} className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm bg-white">
          {REQUEST_TYPES.map((t) => (
            <option key={t} value={t}>{REQUEST_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>

      {requestType === "loan" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">المبلغ (₪)</label>
            <input required name="amount" type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm dir-ltr text-center" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">طريقة السداد</label>
            <input name="repayment_method" type="text" placeholder="مثال: خصم من الراتب" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm" />
          </div>
        </div>
      )}

      {requestType === "vacation" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">من تاريخ</label>
            <input required name="start_date" type="date" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm dir-ltr" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">إلى تاريخ</label>
            <input required name="end_date" type="date" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm dir-ltr" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">السبب (اختياري)</label>
            <input name="reason" type="text" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm" />
          </div>
        </div>
      )}

      {requestType === "permission" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">التاريخ</label>
            <input required name="date" type="date" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm dir-ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">من الساعة</label>
              <input name="from_time" type="time" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm dir-ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">إلى الساعة</label>
              <input name="to_time" type="time" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm dir-ltr" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">السبب (اختياري)</label>
            <input name="reason" type="text" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm" />
          </div>
        </div>
      )}

      {requestType === "complaint" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">الموضوع</label>
            <input name="subject" type="text" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">التفاصيل</label>
            <textarea required name="description" rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm resize-none" />
          </div>
        </div>
      )}

      {requestType === "attendance_fix" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">تاريخ الدوام المطلوب إثباته</label>
            <input required name="date" type="date" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm dir-ltr" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">السبب</label>
            <input name="reason" type="text" placeholder="مثال: نسيت البصمة" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm" />
          </div>
        </div>
      )}

      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
      {success && <p className="text-xs font-bold text-emerald-600">تم إرسال الطلب للمعتمد بنجاح ✓</p>}

      <button disabled={isPending} type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 text-sm">
        <Send className="h-4 w-4" />
        {isPending ? "جارٍ الإرسال..." : "إرسال الطلب"}
      </button>
    </form>
  );
}
