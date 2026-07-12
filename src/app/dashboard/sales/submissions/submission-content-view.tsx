import { OrderSubmission } from "@/lib/order-submissions-data";
import { ImageIcon, Mic, FileText, MessageCircle, Globe, User, CheckCircle2 } from "lucide-react";

// عرض محتوى الطلبية الأصلي (نص/صورة/صوت + الإضافات) — مستخرج لإعادة الاستخدام
// بين بطاقة الصندوق الوارد وشاشة المعالجة المقسومة.
export function SubmissionContentView({ submission }: { submission: OrderSubmission }) {
  const senderName = submission.erp_staff?.name || submission.submitted_by_name || "غير معروف";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {submission.source === "telegram" ? (
            <MessageCircle className="h-4 w-4 text-sky-500" />
          ) : (
            <Globe className="h-4 w-4 text-indigo-500" />
          )}
          <span className="font-bold text-slate-800 text-sm">{senderName}</span>
          <span className="text-xs text-slate-400">
            {new Date(submission.created_at).toLocaleString("en-GB")}
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {submission.source === "telegram" ? "تيليجرام" : "ويب"}
        </span>
      </div>

      {(submission.customer_name || submission.customer_phone) && (
        <div className="flex items-center gap-2 mb-2 text-sm flex-wrap">
          <User className="h-3.5 w-3.5 text-indigo-500" />
          <span className="font-bold text-slate-800">{submission.erp_customers?.name || submission.customer_name || "—"}</span>
          {submission.customer_company_name && <span className="text-xs text-slate-500">({submission.customer_company_name})</span>}
          {submission.customer_phone && <span className="text-xs text-slate-500" dir="ltr">{submission.customer_phone}</span>}
          {submission.customer_address && <span className="text-xs text-slate-400">· {submission.customer_address}</span>}
          {submission.matched_customer_id && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> عميل مسجَّل
            </span>
          )}
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-3">
        {submission.content_type === "text" && (
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="whitespace-pre-line">{submission.text_content}</p>
          </div>
        )}
        {submission.content_type === "image" && submission.file_url && (
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
              <ImageIcon className="h-3.5 w-3.5" /> صورة الطلبية
            </div>
            <img src={submission.file_url} alt="صورة الطلبية" className="max-h-96 w-full object-contain rounded-lg border border-slate-200" />
          </div>
        )}
        {submission.content_type === "voice" && submission.file_url && (
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
              <Mic className="h-3.5 w-3.5" /> تسجيل صوتي
            </div>
            <audio controls src={submission.file_url} className="w-full h-10" />
          </div>
        )}

        {submission.erp_order_submission_attachments && submission.erp_order_submission_attachments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            <p className="text-xs font-bold text-indigo-700">إضافات قبل الاعتماد:</p>
            {submission.erp_order_submission_attachments.map((att) => (
              <div key={att.id} className="bg-white p-2 rounded-lg border border-indigo-100">
                {att.content_type === "text" && <p className="text-sm text-slate-700 whitespace-pre-line">{att.text_content}</p>}
                {att.content_type === "image" && att.file_url && <img src={att.file_url} alt="" className="max-h-56 w-full object-contain rounded-lg" />}
                {att.content_type === "voice" && att.file_url && <audio controls src={att.file_url} className="w-full h-9" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
