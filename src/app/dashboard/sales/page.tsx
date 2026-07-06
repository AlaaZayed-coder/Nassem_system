import { getCustomers, getSalesOpportunities } from "@/lib/sales-data";
import { SalesKanban } from "@/components/sales/sales-kanban";
import { Users, Target, CircleDollarSign, Plus, LayoutDashboard, Inbox } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SalesDashboardPage() {
  const [customers, opportunities] = await Promise.all([
    getCustomers(),
    getSalesOpportunities()
  ]);

  const totalPipelineRevenue = opportunities.reduce((sum, o) => sum + (o.expected_revenue_cents || o.total_amount_cents || 0), 0);
  const wonRevenue = opportunities.filter(o => o.status === "معتمد").reduce((sum, o) => sum + (o.expected_revenue_cents || o.total_amount_cents || 0), 0);
  const totalCustomers = customers.length;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
          <h3 className="text-indigo-100 font-medium mb-1 flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5" />
            حجم الفرص البيعية المفتوحة
          </h3>
          <p className="text-3xl font-black font-mono mt-2" dir="ltr">{formatCurrency(totalPipelineRevenue)}</p>
        </div>
        <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200">
          <h3 className="text-emerald-100 font-medium mb-1 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            المبيعات المحققة (المعتمدة)
          </h3>
          <p className="text-3xl font-black font-mono mt-2" dir="ltr">{formatCurrency(wonRevenue)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-slate-500 font-medium mb-1 flex items-center gap-2">
              <Users className="h-5 w-5" />
              إجمالي العملاء المسجلين
            </h3>
            <p className="text-3xl font-black text-slate-800 font-mono mt-2" dir="ltr">{totalCustomers}</p>
          </div>
          <div className="h-14 w-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
            <Users className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-slate-400" />
          لوحة مسار المبيعات (Pipeline)
        </h2>
        <SalesKanban initialOrders={opportunities} />
      </div>
    </div>
  );
}

// Minimal missing component hack for the CheckCircle icon above
function CheckCircle(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
  )
}
