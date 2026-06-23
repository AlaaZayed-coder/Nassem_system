import { getWarehouses, getInventorySummary } from "@/lib/inventory-data";
import { getCategories, getProductionItems } from "@/lib/production-data";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { CatalogManager } from "@/components/inventory/catalog-manager";
import { Boxes, Store, Package, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [warehouses, items, categories, prodItems] = await Promise.all([
    getWarehouses(),
    getInventorySummary(),
    getCategories(),
    getProductionItems()
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Boxes className="h-10 w-10 text-indigo-600" />
            إدارة المخزون والأصناف
          </h1>
          <p className="text-slate-500 mt-2 text-lg">تحكم في المستودعات، حركة الأصناف، التسعير، ومراقبة المخزون.</p>
        </div>
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

      {/* Unified Catalog Manager */}
      <div className="pt-4 border-t border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Package className="h-6 w-6 text-slate-400" />
          إدارة الأصناف والتصنيفات
        </h2>
        <CatalogManager categories={categories} items={prodItems} />
      </div>

      <div className="pt-8 border-t border-slate-100 mt-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Store className="h-6 w-6 text-slate-400" />
          المخزون الكلي والنقل
        </h2>
        <InventoryTable warehouses={warehouses} items={items} />
      </div>
    </div>
  );
}
