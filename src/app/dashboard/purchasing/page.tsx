import { ShoppingCart, Users, AlertTriangle, ArrowRightLeft, PackageOpen, ClipboardList } from "lucide-react";
import Link from "next/link";
import { getInventorySummary } from "@/lib/inventory-data";
import { getPurchaseOrders, getSuppliers, getPurchaseRequests } from "@/lib/purchasing-data";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PurchasingDashboard() {
  const [inventory, orders, suppliers, pendingRequests] = await Promise.all([
    getInventorySummary(),
    getPurchaseOrders(),
    getSuppliers(),
    getPurchaseRequests("قيد الانتظار")
  ]);

  // Find low stock items (where total inventory <= min_stock_level)
  const lowStockItems = inventory.filter(item => {
    const totalQty = Object.values(item.inventory).reduce((a, b) => a + b, 0);
    // Let's assume min_stock_level is 10 for now if not defined in the item (since we just added it to DB, it might not be in the JS type yet)
    const minStock = (item as any).min_stock_level || 10;
    return totalQty <= minStock;
  });

  const pendingOrders = orders.filter(o => o.status === "مسودة" || o.status === "معتمد");
  const totalPurchases = orders.filter(o => o.status === "مستلم").reduce((acc, o) => acc + o.total_amount_cents, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8" dir="rtl">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <ShoppingCart className="h-10 w-10 text-rose-600" />
          المشتريات والموردين
        </h1>
        <p className="text-slate-500 mt-2 text-lg">إدارة أوامر الشراء، حسابات الموردين، وتنبيهات نواقص المخزون.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-rose-600 rounded-3xl p-6 text-white shadow-lg shadow-rose-200">
          <h3 className="text-rose-100 font-medium mb-1">إجمالي المشتريات (المستلمة)</h3>
          <p className="text-3xl font-black font-mono" dir="ltr">{formatCurrency(totalPurchases / 100)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-slate-500 font-medium mb-1">الموردين المسجلين</h3>
            <p className="text-3xl font-black text-slate-800 font-mono" dir="ltr">{suppliers.length}</p>
          </div>
          <div className="h-14 w-14 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center">
            <Users className="h-7 w-7" />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-slate-500 font-medium mb-1">طلبات قيد الانتظار</h3>
            <p className="text-3xl font-black text-slate-800 font-mono" dir="ltr">{pendingOrders.length}</p>
          </div>
          <div className="h-14 w-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
            <PackageOpen className="h-7 w-7" />
          </div>
        </div>
        <Link href="/dashboard/purchasing/requests" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div>
            <h3 className="text-slate-500 font-medium mb-1">طلبات من المبيعات</h3>
            <p className="text-3xl font-black text-slate-800 font-mono" dir="ltr">{pendingRequests.length}</p>
          </div>
          <div className="h-14 w-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
            <ClipboardList className="h-7 w-7" />
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/purchasing/orders" className="group p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-rose-200 transition-all cursor-pointer flex flex-col items-start gap-4">
          <div className="p-4 bg-rose-50 rounded-2xl group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-8 h-8 text-rose-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">أوامر الشراء (POs)</h2>
            <p className="text-slate-500 mt-1">إنشاء ومتابعة أوامر الشراء، واعتماد استلام البضائع للمخازن.</p>
          </div>
        </Link>

        <Link href="/dashboard/purchasing/suppliers" className="group p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-sky-200 transition-all cursor-pointer flex flex-col items-start gap-4">
          <div className="p-4 bg-sky-50 rounded-2xl group-hover:scale-110 transition-transform">
            <Users className="w-8 h-8 text-sky-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">إدارة الموردين</h2>
            <p className="text-slate-500 mt-1">قائمة الموردين، أرقام التواصل، وحساباتهم المالية.</p>
          </div>
        </Link>
      </div>

      {/* Low Stock Alerts */}
      <div className="mt-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          تنبيهات نواقص المخزون
        </h2>
        
        {lowStockItems.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
            <p className="text-emerald-700 font-bold text-lg">المخزون ممتاز! لا توجد نواقص حالياً.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-rose-50 border-b border-rose-100 text-rose-800 font-bold">
                <tr>
                  <th className="p-4">رمز الصنف</th>
                  <th className="p-4">اسم الصنف</th>
                  <th className="p-4 text-center">الكمية الحالية</th>
                  <th className="p-4 text-center">الحد الأدنى</th>
                  <th className="p-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((item) => {
                  const totalQty = Object.values(item.inventory).reduce((a, b) => a + b, 0);
                  const minStock = (item as any).min_stock_level || 10;
                  
                  return (
                    <tr key={item.item_code} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-slate-500 font-mono text-xs" dir="ltr">{item.item_code}</td>
                      <td className="p-4 font-bold text-slate-800">{item.approved_name || item.original_name}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl font-black font-mono text-base bg-rose-100 text-rose-700">
                          {totalQty}
                        </span>
                      </td>
                      <td className="p-4 text-center text-slate-500 font-mono font-bold">{minStock}</td>
                      <td className="p-4 text-center">
                        <Link href={`/dashboard/purchasing/orders/new?item=${item.item_code}`} className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                          <ShoppingCart className="h-4 w-4" /> طلب شراء
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
