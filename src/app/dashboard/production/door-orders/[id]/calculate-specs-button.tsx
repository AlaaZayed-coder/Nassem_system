"use client";

import { useState, useTransition } from "react";
import { calculateDoorItemSpecsAction } from "../actions";
import { Calculator } from "lucide-react";

export function CalculateSpecsButton({ itemId }: { itemId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            try {
              const result = await calculateDoorItemSpecsAction(itemId);
              if (result?.error) setError(result.error);
            } catch (err: any) {
              setError(err.message);
            }
          })
        }
        className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
      >
        <Calculator className="h-3.5 w-3.5" />
        {isPending ? "جاري الاحتساب..." : "احتساب المواصفات الفنية"}
      </button>
      {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
    </div>
  );
}
