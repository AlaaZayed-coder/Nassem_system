"use client";

import { useState } from "react";
import { resolveMaintenanceRequestAction } from "@/app/dashboard/maintenance/actions";
import { CheckCircle2 } from "lucide-react";

export function ResolveRequestForm({ requestId }: { requestId: string }) {
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
      >
        <CheckCircle2 className="h-4 w-4" /> إغلاق التذكرة
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setIsPending(true);
        try {
          await resolveMaintenanceRequestAction(formData);
        } finally {
          setIsPending(false);
        }
      }}
      className="flex flex-wrap items-center gap-2 mt-2"
    >
      <input type="hidden" name="request_id" value={requestId} />
      <input
        type="text"
        name="technician_name"
        placeholder="اسم الفني"
        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-32 outline-none focus:border-indigo-500"
      />
      <input
        type="number"
        step="0.01"
        name="cost"
        placeholder="التكلفة"
        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-24 outline-none focus:border-indigo-500 font-mono"
        dir="ltr"
      />
      <button
        type="submit"
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
      >
        {isPending ? "..." : "تأكيد الإغلاق"}
      </button>
    </form>
  );
}
