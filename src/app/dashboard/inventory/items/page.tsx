import { Package, Plus } from "lucide-react";
import { getProductionItems } from "@/lib/production-data";
import { ItemsTable } from "@/components/production/items-table";
import Link from "next/link";
import { ExcelManager } from "@/components/inventory/excel-manager";

export const dynamic = 'force-dynamic';

export default async function ProductionItemsPage() {
  const items = await getProductionItems();

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-indigo-600" />
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">إدارة الأصناف والتسعير</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExcelManager />
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700 shadow-sm hover:bg-sky-200 transition"
          >
            الذهاب إلى المخزون الكلي والنقل
          </Link>
          <Link
            href="/dashboard/inventory/items/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-indigo-700 transition"
          >
            <Plus className="h-5 w-5" />
            إضافة صنف جديد
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <ItemsTable items={items} />
      </div>
    </div>
  );
}
