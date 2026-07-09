import { getPurchaseOrderById } from "@/lib/purchasing-data";
import { formatCurrency } from "@/lib/format";
import { ArrowRight, ShoppingCart, Check, Building2, Store, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ReceivePoButton } from "./receive-btn";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailsPage({ params }: { params: { id: string } }) {
  const order = await getPurchaseOrderById(params.id);

  if (!order) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-slate-800">أمر الشراء غير موجود</h1>
        <Link href="/dashboard/purchasing/orders" className="text-indigo-600 font-bold mt-4 inline-block">العودة للقائمة</Link>
      </div>
    );
  }

  const isReceived = order.status === "مستلم";

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/purchasing/orders" className="text-sm font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 mb-2 transition">
            <ArrowRight className="h-4 w-4" /> العودة لأوامر الشراء
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-rose-600" />
            أمر شراء #{order.id.split("-")[0]}
          </h1>
        </div>
        
        {isReceived ? (
          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-5 py-2.5 rounded-xl font-bold shadow-sm">
            <CheckCircle2 className="h-5 w-5" /> تم الاستلام مسبقاً
          </div>
        ) : (
          <ReceivePoButton orderId={order.id} warehouseId={order.warehouse_id} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-medium mb-1 flex items-center gap-2"><Building2 className="h-4 w-4"/> المورد</h3>
          <p className="text-xl font-bold text-slate-800">{order.erp_suppliers?.name}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-medium mb-1 flex items-center gap-2"><Store className="h-4 w-4"/> المستودع المستلم</h3>
          <p className="text-xl font-bold text-slate-800">{order.erp_warehouses?.name || "-"}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-medium mb-1 flex items-center gap-2"><Calendar className="h-4 w-4"/> تاريخ الإنشاء</h3>
          <p className="text-xl font-bold text-slate-800" dir="ltr">{new Date(order.created_at).toLocaleDateString("en-GB")}</p>
        </div>
      </div>

      {order.notes && (
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
          <h3 className="text-amber-800 font-bold mb-2">ملاحظات الطلب</h3>
          <p className="text-amber-900">{order.notes}</p>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-6">
          <h2 className="font-bold text-lg text-slate-800">الأصناف المطلوبة</h2>
        </div>
        <table className="w-full text-right text-sm">
          <thead className="bg-white border-b border-slate-100 text-slate-500 font-bold">
            <tr>
              <th className="p-4">رقم الصنف</th>
              <th className="p-4">اسم الصنف</th>
              <th className="p-4 text-center">الكمية</th>
              <th className="p-4 text-center">سعر الوحدة</th>
              <th className="p-4 text-center">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.erp_purchase_order_items?.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="p-4 font-mono font-bold text-slate-400 text-xs" dir="ltr">{item.item_code}</td>
                <td className="p-4 font-bold text-slate-800">
                  {item.erp_items?.approved_name || item.erp_items?.original_name}
                </td>
                <td className="p-4 text-center">
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-bold font-mono text-base">{item.quantity}</span>
                </td>
                <td className="p-4 text-center font-mono text-slate-600" dir="ltr">
                  {formatCurrency(item.unit_cost_cents / 100)}
                </td>
                <td className="p-4 text-center font-mono font-bold text-indigo-600" dir="ltr">
                  {formatCurrency((item.unit_cost_cents * item.quantity) / 100)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={4} className="p-4 text-left font-bold text-slate-600 text-lg">المبلغ الإجمالي:</td>
              <td className="p-4 text-center font-black text-rose-600 text-xl font-mono" dir="ltr">
                {formatCurrency(order.total_amount_cents / 100)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
