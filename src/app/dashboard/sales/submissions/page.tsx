import Link from "next/link";
import { getOrderSubmissions } from "@/lib/order-submissions-data";
import { NewSubmissionForm } from "./new-submission-form";
import { SubmissionCard } from "./submission-card";
import { ArrowRight, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrderSubmissionsPage() {
  const [pending, resolved] = await Promise.all([
    getOrderSubmissions("قيد المراجعة"),
    getOrderSubmissions("تمت المعالجة"),
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Inbox className="h-8 w-8 text-indigo-600" />
            صندوق وارد الطلبيات
          </h1>
          <p className="text-slate-500 mt-2">طلبيات مُرسَلة عبر بوت تيليجرام أو نموذج الويب (صورة، صوت، أو نص) بانتظار الإدخال في النظام الفعلي.</p>
        </div>
        <Link href="/dashboard/sales" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للمبيعات
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">إرسال طلبية جديدة (عبر الويب)</h2>
            <NewSubmissionForm />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">بانتظار المعالجة ({pending.length})</h2>
            <div className="space-y-3">
              {pending.map((s) => (
                <SubmissionCard key={s.id} submission={s} />
              ))}
              {pending.length === 0 && (
                <div className="text-center text-slate-400 py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد طلبيات بانتظار المعالجة
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">تمت معالجتها مؤخراً</h2>
            <div className="space-y-3">
              {resolved.slice(0, 10).map((s) => (
                <SubmissionCard key={s.id} submission={s} readOnly />
              ))}
              {resolved.length === 0 && (
                <div className="text-center text-slate-400 py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد طلبيات مُعالَجة بعد
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
