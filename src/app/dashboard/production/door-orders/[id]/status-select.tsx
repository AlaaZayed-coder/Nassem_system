"use client";

import { useTransition } from "react";
import { updateDoorOrderStatusAction } from "../actions";

// "بانتظار التركيب" لا تظهر إلا لطلبيات "توريد وتركيب" — لطلبيات "توريد" فقط
// الحالة النهائية بعد الإنتاج هي "تم التوريد" مباشرة (لا تركيب من طرفنا).
function getStatusesForOrderType(orderType: string): string[] {
  const base = ["عالقة", "قيد الانتظار", "معلقة", "قيد الإنتاج"];
  if (orderType === "توريد وتركيب") return [...base, "بانتظار التركيب", "جاهزة"];
  return [...base, "تم التوريد", "جاهزة"];
}

export function StatusSelect({ orderId, currentStatus, orderType }: { orderId: string; currentStatus: string; orderType: string }) {
  const [isPending, startTransition] = useTransition();
  const statuses = getStatusesForOrderType(orderType);
  const options = statuses.includes(currentStatus) ? statuses : [currentStatus, ...statuses];

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
      {options.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
