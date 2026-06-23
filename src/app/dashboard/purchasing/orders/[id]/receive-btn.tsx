"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { receivePurchaseOrderAction } from "../actions";

export function ReceivePoButton({ orderId, warehouseId }: { orderId: string, warehouseId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleReceive = () => {
    if (!confirm("هل أنت متأكد من استلام هذه البضاعة؟ سيتم إضافتها فوراً للمخزون.")) return;
    
    startTransition(async () => {
      const res = await receivePurchaseOrderAction(orderId, warehouseId);
      if (!res.success) {
        alert(res.message || "حدث خطأ أثناء استلام البضاعة");
      }
    });
  };

  return (
    <button 
      onClick={handleReceive}
      disabled={isPending}
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-sm text-sm disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
      تأكيد استلام البضاعة
    </button>
  );
}
