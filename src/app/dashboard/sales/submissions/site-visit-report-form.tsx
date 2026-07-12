"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSiteVisitReportAction, getNextPendingSubmissionIdAction } from "./actions";
import { MapPin } from "lucide-react";

export function SiteVisitReportForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.append("submission_id", submissionId);
    startTransition(async () => {
      const result = await submitSiteVisitReportAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      // بعد حفظ الكشف تنتقل الطلبية لصندوق المعالجة العادي — تابع لأقدم
      // طلبية أخرى بانتظار الكشف أو المعالجة إن وُجدت، وإلا عد للقائمة.
      router.push("/dashboard/sales/submissions");
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="font-bold text-slate-800 mb-1 text-lg flex items-center gap-2">
        <MapPin className="h-5 w-5 text-amber-500" /> تقرير كشف الموقع
      </h2>
      <p className="text-slate-500 text-sm mb-4">بعد زيارة موقع العميل، سجّل الملاحظات وأرفق صورة إن توفرت — تنتقل الطلبية تلقائياً لصندوق معالج الطلبيات فور الحفظ.</p>

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">اسم من قام بالكشف</label>
          <input name="visited_by" type="text" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">ملاحظات الكشف (القياسات، طبيعة الموقع...)</label>
          <textarea name="notes" rows={4} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm resize-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">صورة الموقع (اختياري)</label>
          <input type="file" name="photo" accept="image/*" capture="environment" className="w-full text-sm" />
        </div>

        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

        <button disabled={isPending} type="submit" className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition disabled:opacity-50">
          {isPending ? "جارٍ الحفظ..." : "حفظ تقرير الكشف وإرسال الطلبية للمعالجة"}
        </button>
      </form>
    </div>
  );
}
