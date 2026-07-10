"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderSubmission } from "@/lib/order-submissions-data";
import { resolveSubmissionAction } from "./actions";
import { Ban, Pencil } from "lucide-react";
import { EditSubmissionPanel } from "./edit-submission-panel";
import { SubmissionContentView } from "./submission-content-view";

export function SubmissionCard({ submission, readOnly = false }: { submission: OrderSubmission; readOnly?: boolean }) {
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleResolve = async (status: string) => {
    setIsPending(true);
    try {
      await resolveSubmissionAction(submission.id, status);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <SubmissionContentView submission={submission} />

      {!readOnly ? (
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/sales/submissions/${submission.id}`}
              className="flex-1 text-center px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
            >
              معالجة الطلبية
            </Link>
            <button
              onClick={() => setIsEditing((v) => !v)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              <Pencil className="h-3.5 w-3.5" /> تعديل
            </button>
            <button
              disabled={isPending}
              onClick={() => handleResolve("مرفوضة")}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" /> رفض
            </button>
          </div>
          {isEditing && (
            <EditSubmissionPanel
              submissionId={submission.id}
              currentCustomerName={submission.erp_customers?.name || submission.customer_name}
              onClose={() => setIsEditing(false)}
            />
          )}
        </div>
      ) : (
        <span className={`text-xs font-bold px-2 py-1 rounded-full mt-3 inline-block ${submission.status === "مرفوضة" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
          {submission.status}
        </span>
      )}
    </div>
  );
}
