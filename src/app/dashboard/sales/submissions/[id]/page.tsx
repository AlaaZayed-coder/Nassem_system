import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderSubmissionById } from "@/lib/order-submissions-data";
import { ArrowRight, Inbox } from "lucide-react";
import { SubmissionContentView } from "../submission-content-view";
import { ProcessSubmissionForm } from "./process-submission-form";

export const dynamic = "force-dynamic";

export default async function ProcessSubmissionPage({ params }: { params: { id: string } }) {
  const submission = await getOrderSubmissionById(params.id);
  if (!submission) notFound();

  return (
    <div className="p-8 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Inbox className="h-6 w-6 text-indigo-600" />
            معالجة الطلبية
          </h1>
          <p className="text-slate-500 mt-1 text-sm">راجع محتوى الطلبية الأصلي على اليمين أثناء تعبئة نموذج الإدخال على اليسار.</p>
        </div>
        <Link href="/dashboard/sales/submissions" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للصندوق الوارد
        </Link>
      </div>

      {submission.status === "بانتظار الكشف" && (
        <div className="mb-6 bg-amber-50 border border-amber-100 text-amber-800 text-sm font-bold px-4 py-3 rounded-xl">
          هذه الطلبية تحتاج كشف موقع أولاً — بعد حفظ تقرير الزيارة ستنتقل تلقائياً لصندوق معالج الطلبيات.
        </div>
      )}
      {submission.status !== "قيد المراجعة" && submission.status !== "بانتظار الكشف" && (
        <div className="mb-6 bg-amber-50 border border-amber-100 text-amber-800 text-sm font-bold px-4 py-3 rounded-xl">
          هذه الطلبية معالَجة مسبقاً (الحالة: {submission.status}) — يمكنك مراجعتها فقط.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="sticky top-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <SubmissionContentView submission={submission} />
          </div>
        </div>

        <div className="lg:col-span-3">
          <ProcessSubmissionForm submission={submission} />
        </div>
      </div>
    </div>
  );
}
