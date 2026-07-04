"use client";

import { useTransition } from "react";
import { updateDoorOrderStatusAction } from "../actions";

const STATUSES = ["عالقة", "قيد الانتظار", "معلقة", "قيد الإنتاج", "جاهزة"];

export function StatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentStatus}
      disabled={isPending}
      onChange={(e) => {
        const newStatus = e.target.value;
        startTransition(async () => {
          try {
            await updateDoorOrderStatusAction(orderId, newStatus);
          } catch (err: any) {
            alert("فشل تحديث الحالة: " + err.message);
          }
        });
      }}
      className="px-3 py-2 rounded-xl border border-slate-300 outline-none bg-white text-sm font-bold disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
