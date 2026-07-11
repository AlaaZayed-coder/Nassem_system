import { getFinancialSummary, getTopSellingItems, getProductionPerformance } from "@/lib/reports-data";
import { getInventorySummary } from "@/lib/inventory-data";
import { getExecutiveSummary } from "@/lib/executive-dashboard-data";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, PackageOpen, Factory, PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [financials, topItems, prodStats, inventory, execSummary] = await Promise.all([
    getFinancialSummary(),
    getTopSellingItems(),
    getProductionPerformance(),
    getInventorySummary(),
    getExecutiveSummary(),
  ]);

  const salesDiff = execSummary.salesThisMonthCents - execSummary.salesLastMonthCents;
  const salesDiffPercent = execSummary.salesLastMonthCents > 0 ? Math.round((salesDiff / execSummary.salesLastMonthCents) * 100) : null;

  // Calculate total inventory value (qty * cost)
  // Note: the schema doesn't have cost in inventory summary directly, we'll estimate based on items if available, 
  // or just show total quantity for now.
  const totalInventoryItems = inventory.reduce((acc, item) => {
    return acc + Object.values(item.inventory).reduce((a, b) => a + b, 0);
  }, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8" dir="rtl">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <BarChart3 className="h-10 w-10 text-indigo-600" />
          التقارير والإحصائيات
        </h1>
        <p className="text-slate-500 mt-2 text-lg">نظرة شاملة على الأداء المالي، المبيعات، والإنتاج في المصنع.</p>
      </div>

      {/* Financial Summary */}
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-emerald-500" />
        الملخص المالي
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
            <span className="font-bold">إجمالي المبيعات (الإيرادات)</span>
          </div>
          <div className="text-3xl font-black font-mono text-slate-800" dir="ltr">
            {formatCurrency(financials.revenue / 100)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <BarChart3 className="h-5 w-5" />
            <span className="font-bold">مبيعات هذا الشهر (معتمدة)</span>
          </div>
          <div className="text-3xl font-black font-mono text-slate-800" dir="ltr">
            {formatCurrency(execSummary.salesThisMonthCents / 100)}
          </div>
          <div className="text-xs">
            {salesDiffPercent !== null ? (
              <span className={`flex items-center gap-1 font-bold ${salesDiff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {salesDiff >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(salesDiffPercent)}% عن الشهر الماضي
              </span>
            ) : (
              <span className="text-slate-400">لا توجد بيانات مقارنة</span>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-600">
            <TrendingDown className="h-5 w-5" />
            <span className="font-bold">إجمالي المشتريات (المصروفات)</span>
          </div>
          <div className="text-3xl font-black font-mono text-slate-800" dir="ltr">
            {formatCurrency(financials.expenses / 100)}
          </div>
        </div>

        <div className={`p-6 rounded-3xl shadow-sm flex flex-col gap-2 ${financials.netIncome >= 0 ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'}`}>
          <div className="flex items-center gap-2 text-white/80">
            <PieChart className="h-5 w-5" />
            <span className="font-bold">صافي الدخل (تقريبي)</span>
          </div>
          <div className="text-3xl font-black font-mono" dir="ltr">
            {formatCurrency(financials.netIncome / 100)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        {/* Top Selling Items */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <PackageOpen className="h-6 w-6 text-purple-500" />
            <h2 className="text-xl font-bold text-slate-800">الأصناف الأكثر إنتاجاً ومبيعاً</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {topItems.length === 0 ? (
              <p className="text-center text-slate-500">لا توجد بيانات كافية</p>
            ) : (
              <div className="space-y-5">
                {topItems.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-bold text-slate-700">{item.name}</span>
                      <span className="font-mono font-bold text-purple-600">{item.quantity} وحدة</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (item.quantity / topItems[0].quantity) * 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Production & Inventory Stats */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex items-center gap-6">
            <div className="bg-sky-100 text-sky-600 p-5 rounded-2xl">
              <PackageOpen className="h-8 w-8" />
            </div>
            <div>
              <p className="text-slate-500 font-bold mb-1">إجمالي القطع في المخزون</p>
              <div className="text-4xl font-black text-slate-800 font-mono">
                {totalInventoryItems.toLocaleString('en-US')}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex-1">
            <div className="flex items-center gap-2 mb-6">
              <Factory className="h-6 w-6 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-800">أداء أوامر الإنتاج</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div className="text-3xl font-black text-slate-800 mb-1">{prodStats.total}</div>
                <div className="text-xs font-bold text-slate-500">إجمالي الأوامر</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                <div className="text-3xl font-black text-emerald-600 mb-1">{prodStats.completed}</div>
                <div className="text-xs font-bold text-emerald-700">مكتملة</div>
              </div>
              <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 text-center">
                <div className="text-3xl font-black text-sky-600 mb-1">{prodStats.inProgress}</div>
                <div className="text-xs font-bold text-sky-700">قيد التنفيذ</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                <div className="text-3xl font-black text-amber-600 mb-1">{prodStats.planned}</div>
                <div className="text-xs font-bold text-amber-700">مخطط لها</div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-600">نسبة الإنجاز الكلية</span>
                <span className="font-bold text-emerald-600">
                  {prodStats.total > 0 ? Math.round((prodStats.completed / prodStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${prodStats.total > 0 ? (prodStats.completed / prodStats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
