"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Star, Trash2, Paperclip, FileText } from "lucide-react";
import {
  addStaffEvaluationAction,
  deleteStaffEvaluationAction,
  uploadStaffDocumentAction,
  deleteStaffDocumentAction,
  getStaffEvaluationsAction,
  getStaffDocumentsAction,
} from "./actions";
import type { StaffEvaluation } from "@/lib/staff-evaluations-data";
import { DOC_TYPE_LABELS, type StaffDocument } from "@/lib/staff-documents-data";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

// يُركَّب فقط عند فتح لوحة التعديل (انظر staff-card.tsx)، فيجلب بيانات
// التقييمات والمرفقات عند التركيب بدل تحميلها لكل موظف بالقائمة مسبقاً —
// تفادياً لعشرات الاستعلامات الزائدة على كل تحميل صفحة الموظفين.
export function StaffEvaluationsDocuments({ staffId }: { staffId: string }) {
  const [evaluations, setEvaluations] = useState<StaffEvaluation[]>([]);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const evalFormRef = useRef<HTMLFormElement>(null);
  const docFormRef = useRef<HTMLFormElement>(null);

  const reload = () => {
    Promise.all([getStaffEvaluationsAction(staffId), getStaffDocumentsAction(staffId)]).then(([evs, docs]) => {
      setEvaluations(evs);
      setDocuments(docs);
      setLoading(false);
    });
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const handleAddEvaluation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addStaffEvaluationAction(staffId, formData);
        evalFormRef.current?.reset();
        setShowEvalForm(false);
        reload();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleUploadDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await uploadStaffDocumentAction(staffId, formData);
        docFormRef.current?.reset();
        reload();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  if (loading) {
    return <p className="text-xs text-slate-400 italic">جاري تحميل التقييمات والمرفقات...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
          <span className="text-sm font-bold text-slate-600">تقييمات الأداء ({evaluations.length})</span>
          <button type="button" onClick={() => setShowEvalForm((v) => !v)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
            {showEvalForm ? "إلغاء" : "+ تقييم جديد"}
          </button>
        </div>

        {showEvalForm && (
          <form ref={evalFormRef} onSubmit={handleAddEvaluation} className="p-3 flex flex-col gap-2 border-b border-slate-100">
            <div className="flex gap-2">
              <input required name="period" type="text" placeholder="الفترة (مثال: 2026 - الربع الثالث)" className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-indigo-500" />
              <select required name="rating" defaultValue="" className="w-28 px-2 py-1.5 rounded-lg border border-slate-300 text-sm bg-white outline-none focus:border-indigo-500">
                <option value="" disabled>التقييم</option>
                <option value="5">5 — ممتاز</option>
                <option value="4">4 — جيد جداً</option>
                <option value="3">3 — جيد</option>
                <option value="2">2 — مقبول</option>
                <option value="1">1 — ضعيف</option>
              </select>
            </div>
            <textarea name="notes" placeholder="ملاحظات (اختياري)" rows={2} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-indigo-500 resize-none" />
            <button disabled={isPending} type="submit" className="self-start px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50">
              {isPending ? "جاري الحفظ..." : "حفظ التقييم"}
            </button>
          </form>
        )}

        {evaluations.length === 0 ? (
          <p className="p-3 text-xs text-slate-400 italic">لا توجد تقييمات مسجَّلة بعد.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
            {evaluations.map((ev) => (
              <div key={ev.id} className="p-3 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{ev.period}</span>
                    <StarRow rating={ev.rating} />
                  </div>
                  {ev.notes && <p className="text-xs text-slate-500 mt-1">{ev.notes}</p>}
                  <p className="text-[11px] text-slate-400 mt-1">بواسطة {ev.evaluator_name} — {new Date(ev.created_at).toLocaleDateString("en-GB")}</p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(async () => { await deleteStaffEvaluationAction(ev.id, staffId); reload(); })}
                  className="text-slate-300 hover:text-rose-500 transition shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-slate-50">
          <span className="text-sm font-bold text-slate-600">مرفقات الموظف ({documents.length})</span>
        </div>

        <form ref={docFormRef} onSubmit={handleUploadDocument} className="p-3 flex flex-col gap-2 border-b border-slate-100">
          <div className="flex gap-2">
            <select name="doc_type" defaultValue="contract" className="w-32 px-2 py-1.5 rounded-lg border border-slate-300 text-sm bg-white outline-none focus:border-indigo-500">
              {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input required name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" className="flex-1 text-xs" />
          </div>
          <button disabled={isPending} type="submit" className="self-start px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            {isPending ? "جاري الرفع..." : "رفع الملف"}
          </button>
        </form>

        {documents.length === 0 ? (
          <p className="p-3 text-xs text-slate-400 italic">لا توجد مرفقات بعد.</p>
        ) : (
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="p-3 flex items-center justify-between gap-2">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 hover:underline min-w-0">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{doc.file_name}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">({DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type})</span>
                </a>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(async () => { await deleteStaffDocumentAction(doc.id, staffId); reload(); })}
                  className="text-slate-300 hover:text-rose-500 transition shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
