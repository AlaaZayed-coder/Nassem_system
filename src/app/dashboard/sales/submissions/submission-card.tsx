"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderSubmission } from "@/lib/order-submissions-data";
import { resolveSubmissionAction } from "./actions";
import { ImageIcon, Mic, FileText, Send, Ban, MessageCircle, Globe } from "lucide-react";

export function SubmissionCard({ submission, readOnly = false }: { submission: OrderSubmission; readOnly?: boolean }) {
  const [isPending, setIsPending] = useState(false);

  const handleResolve = async (status: string) => {
    setIsPending(true);
    try {
      await resolveSubmissionAction(submission.id, status);
    } finally {
      setIsPending(false);
    }
  };

  const senderName = submission.erp_staff?.name || submission.submitted_by_name || "غير معروف";

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {submission.source === "telegram" ? (
            <MessageCircle className="h-4 w-4 text-sky-500" />
          ) : (
            <Globe className="h-4 w-4 text-indigo-500" />
          )}
          <span className="font-bold text-slate-800 text-sm">{senderName}</span>
          <span className="text-xs text-slate-400">
            {new Date(submission.created_at).toLocaleString("ar-SA")}
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {submission.source === "telegram" ? "تيليجرام" : "ويب"}
        </span>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 mb-3">
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
            <img src={submission.file_url} alt="صورة الطلبية" className="max-h-72 rounded-lg border border-slate-200" />
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
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/sales/new"
            target="_blank"
            className="flex-1 text-center px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
          >
            فتح نموذج إدخال الطلبية
          </Link>
          <button
            disabled={isPending}
            onClick={() => handleResolve("تمت المعالجة")}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> تمييز كمُعالَجة
          </button>
          <button
            disabled={isPending}
            onClick={() => handleResolve("مرفوضة")}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" /> رفض
          </button>
        </div>
      ) : (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${submission.status === "مرفوضة" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
          {submission.status}
        </span>
      )}
    </div>
  );
}
