import { getActiveProductionOrders, getProductionMaterials } from "@/lib/production-data";
import { getWarehouses, getInventorySummary } from "@/lib/inventory-data";
import { Factory, Calendar, CheckCircle, PackageSearch, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { OrderMaterialsManager } from "./materials-manager";

export const dynamic = 'force-dynamic';

export default async function ProductionOrderDetailsPage({ params }: { params: { id: string } }) {
  const [orders, materials, warehouses, inventory] = await Promise.all([
    getActiveProductionOrders(),
    getProductionMaterials(params.id),
    getWarehouses(),
    getInventorySummary()
  ]);

  const order = orders.find(o => o.id === params.id);

  if (!order) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-slate-800">الطلب غير موجود أو منتهي</h1>
        <Link href="/dashboard/production/orders" className="text-indigo-600 font-bold mt-4 inline-block hover:underline">العودة للقائمة</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Factory className="h-8 w-8 text-emerald-600" />
            تفاصيل أمر الإنتاج #{order.id.slice(0, 8)}
          </h1>
          <p className="text-slate-500 mt-2">إدارة المواد الخام المستهلكة لهذا الأمر.</p>
        </div>
        <Link href="/dashboard/production/orders" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة لأوامر الإنتاج
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3">معلومات الطلب</h2>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-slate-500 block mb-1">المنتج المراد تصنيعه</span>
                <span className="font-bold text-slate-800 text-base">{order.erp_items?.original_name || order.item_code}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block mb-1">الكمية</span>
                  <span className="font-black text-indigo-700 text-lg bg-indigo-50 px-3 py-1 rounded-lg inline-block">{order.quantity}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">الحالة</span>
                  <span className="font-bold text-slate-700">{order.status}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">تاريخ الإنشاء</span>
                <span className="font-bold text-slate-700 flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {new Date(order.created_at).toLocaleDateString("en-GB")}</span>
              </div>
              {order.erp_sales_orders && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <span className="text-amber-700 font-bold block mb-1 text-xs">مرتبط بطلب مبيعات</span>
                  <span className="font-bold text-amber-900">{order.erp_sales_orders.erp_customers?.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Materials Consumed */}
        <div className="lg:col-span-2">
          <OrderMaterialsManager 
            orderId={order.id} 
            materials={materials} 
            warehouses={warehouses} 
            inventory={inventory} 
          />
        </div>
      </div>
    </div>
  );
}
