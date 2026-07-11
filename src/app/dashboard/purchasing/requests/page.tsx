import Link from "next/link";
import { getPurchaseRequests } from "@/lib/purchasing-data";
import { MarkOrderedButton } from "./mark-ordered-btn";
import { HighlightScroll } from "@/components/HighlightScroll";
import { ShoppingCart, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PurchaseRequestsPage() {
  const [pending, resolved] = await Promise.all([
    getPurchaseRequests("قيد الانتظار"),
    getPurchaseRequests("مكتمل"),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8" dir="rtl">
      <HighlightScroll />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-rose-600" />
            طلبات الشراء الواردة من المبيعات
          </h1>
          <p className="text-slate-500 mt-2">طلبات نشأت تلقائياً لسد نقص مخزون أصناف مستوردة عند اعتماد طلبات مبيعات.</p>
        </div>
        <Link href="/dashboard/purchasing" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للمشتريات
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3">بانتظار المعالجة ({pending.length})</h2>
        <div className="space-y-3">
          {pending.map((req: any) => (
            <div key={req.id} id={`row-${req.id}`} className="flex items-center justify-between p-4 rounded-2xl border border-rose-100 bg-rose-50 transition">
              <div>
                <div className="font-bold text-slate-800">{req.erp_items?.approved_name || req.erp_items?.original_name || req.item_code}</div>
                <div className="text-sm text-slate-600 mt-1">الكمية الناقصة: {req.quantity} · {req.notes}</div>
                {req.erp_sales_orders?.id && (
                  <Link href={`/dashboard/sales/${req.erp_sales_orders.id}`} className="text-xs font-bold text-indigo-600 hover:underline">
                    عرض طلب المبيعات
                  </Link>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Link
                  href={`/dashboard/purchasing/orders/new?item=${req.item_code}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition"
                >
                  <ShoppingCart className="h-3.5 w-3.5" /> إنشاء أمر شراء
                </Link>
                <MarkOrderedButton requestId={req.id} />
              </div>
            </div>
          ))}
          {pending.length === 0 && <div className="text-center text-slate-400 py-4">لا توجد طلبات بانتظار المعالجة</div>}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3">مكتملة مؤخراً</h2>
        <div className="space-y-3">
          {resolved.slice(0, 10).map((req: any) => (
            <div key={req.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm">
              <div className="font-bold text-slate-700">{req.erp_items?.approved_name || req.erp_items?.original_name || req.item_code}</div>
              <div className="text-slate-500">الكمية: {req.quantity}</div>
            </div>
          ))}
          {resolved.length === 0 && <div className="text-center text-slate-400 py-4">لا توجد طلبات مكتملة بعد</div>}
        </div>
      </div>
    </div>
  );
}
