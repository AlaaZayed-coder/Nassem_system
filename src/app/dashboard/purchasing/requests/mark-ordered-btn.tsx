"use client";

import { useState, useTransition } from "react";
import { markPurchaseRequestOrderedAction } from "../orders/actions";
import { CheckCircle2 } from "lucide-react";

export function MarkOrderedButton({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs font-bold text-emerald-600">تم ✓</span>;

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await markPurchaseRequestOrderedAction(requestId);
        setDone(true);
      })}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
    >
      <CheckCircle2 className="h-4 w-4" /> تم الطلب من المورد
    </button>
  );
}
