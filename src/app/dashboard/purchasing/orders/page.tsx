import { getPurchaseOrders } from "@/lib/purchasing-data";
import { ShoppingCart, Plus, Calendar, Building2, Store, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const orders = await getPurchaseOrders();

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/purchasing" className="text-sm font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 mb-2 transition">
            <ArrowRight className="h-4 w-4" /> العودة للمشتريات
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-rose-600" />
            أوامر الشراء
          </h1>
        </div>
        <Link 
          href="/dashboard/purchasing/orders/new"
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-sm text-sm"
        >
          <Plus className="h-5 w-5" /> إضافة أمر شراء جديد
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="p-4">رقم الأمر</th>
              <th className="p-4">المورد</th>
              <th className="p-4">المستودع المستلم</th>
              <th className="p-4">التاريخ</th>
              <th className="p-4">الإجمالي</th>
              <th className="p-4">الحالة</th>
              <th className="p-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-mono font-bold text-slate-500 text-xs" dir="ltr">
                  #{order.id.split("-")[0]}
                </td>
                <td className="p-4 font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    {order.erp_suppliers?.name}
                  </div>
                </td>
                <td className="p-4 text-slate-600">
                  {order.erp_warehouses ? (
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-slate-400" />
                      {order.erp_warehouses.name}
                    </div>
                  ) : <span className="text-slate-400">-</span>}
                </td>
                <td className="p-4 text-slate-500 text-xs">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(order.created_at).toLocaleDateString("en-GB")}
                  </div>
                </td>
                <td className="p-4 font-black text-rose-600 font-mono text-base" dir="ltr">
                  {formatCurrency(order.total_amount_cents / 100)}
                </td>
                <td className="p-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                    order.status === 'مستلم' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'معتمد' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'ملغي' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <Link 
                    href={`/dashboard/purchasing/orders/${order.id}`}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                  >
                    عرض وتحديث
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-500 font-medium bg-slate-50">
                  <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  لا يوجد أوامر شراء حالياً. قم بإنشاء أول أمر شراء لجلب بضائع جديدة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
