import { getWarehouses, getInventorySummary } from "@/lib/inventory-data";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Boxes, Store, Package, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [warehouses, items] = await Promise.all([
    getWarehouses(),
    getInventorySummary()
  ]);

  // Calculate totals
  let totalCostValue = 0;
  let totalSellingValue = 0;
  
  items.forEach(item => {
    const totalQty = Object.values(item.inventory).reduce((a, b) => a + b, 0);
    if (totalQty > 0) {
      totalCostValue += (item.cost_price_cents / 100) * totalQty;
      totalSellingValue += (item.final_selling_price_cents / 100) * totalQty;
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8" dir="rtl">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <Boxes className="h-10 w-10 text-indigo-600" />
          إدارة المخزون
        </h1>
        <p className="text-slate-500 mt-2 text-lg">تحكم في المستودعات وحركة الأصناف ومراقبة المخزون.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
          <h3 className="text-indigo-100 font-medium mb-1">إجمالي تكلفة المخزون</h3>
          <p className="text-3xl font-black font-mono" dir="ltr">{formatCurrency(totalCostValue)}</p>
        </div>
        <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200">
          <h3 className="text-emerald-100 font-medium mb-1">القيمة البيعية للمخزون</h3>
          <p className="text-3xl font-black font-mono" dir="ltr">{formatCurrency(totalSellingValue)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-slate-500 font-medium mb-1">عدد المستودعات</h3>
            <p className="text-3xl font-black text-slate-800 font-mono" dir="ltr">{warehouses.length}</p>
          </div>
          <div className="h-14 w-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
            <Store className="h-7 w-7" />
          </div>
        </div>
      </div>
      {/* Navigation Cards for Items and Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/inventory/items" className="group p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer flex flex-col items-start gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl group-hover:scale-110 transition-transform">
            <Package className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">الأصناف والتسعير</h2>
            <p className="text-slate-500 mt-1">إضافة الأصناف، التسعير، ومراجعة التكلفة الخاصة بالمخزون.</p>
          </div>
        </Link>

        <Link href="/dashboard/inventory/categories" className="group p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-sky-200 transition-all cursor-pointer flex flex-col items-start gap-4">
          <div className="p-4 bg-sky-50 rounded-2xl group-hover:scale-110 transition-transform">
            <LayoutDashboard className="w-8 h-8 text-sky-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">إدارة التصنيفات</h2>
            <p className="text-slate-500 mt-1">ترتيب هيكلية الأقسام، التصنيفات الرئيسية والفرعية للأصناف.</p>
          </div>
        </Link>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Store className="h-6 w-6 text-slate-400" />
          المخزون الكلي والنقل
        </h2>
        <InventoryTable warehouses={warehouses} items={items} />
      </div>
    </div>
  );
}
