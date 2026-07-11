import { getSalesOpportunities } from "@/lib/sales-data";
import { SalesTable } from "@/components/sales/sales-table";
import { Target, Plus, LayoutDashboard, Inbox } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SalesDashboardPage() {
  const opportunities = await getSalesOpportunities();

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Target className="h-10 w-10 text-indigo-600" />
            إدارة المبيعات والعملاء (CRM)
          </h1>
          <p className="text-slate-500 mt-2 text-lg">تتبع مسار المبيعات، الفرص البيعية، وقاعدة بيانات العملاء.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/sales/submissions" className="inline-flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm border border-slate-200">
            <Inbox className="h-5 w-5" />
            صندوق وارد الطلبيات
          </Link>
          <Link href="/dashboard/sales/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow">
            <Plus className="h-5 w-5" />
            إضافة فرصة بيعية
          </Link>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-slate-400" />
          طلبات المبيعات
        </h2>
        <SalesTable initialOrders={opportunities} />
      </div>
    </div>
  );
}
