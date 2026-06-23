import { getWarehouses, getInventorySummary } from "@/lib/inventory-data";
import { getDashboardStats } from "@/lib/settings-data";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Boxes, Store, Package, LayoutDashboard, ClipboardCheck, Zap } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { ExcelManager } from "@/components/inventory/excel-manager";

export const dynamic = "force-dynamic";

const KPI_STYLES: Record<string, { bg: string; label: string; value: string }> = {
  "إجمالي":        { bg: "#F1EFE8", label: "#5F5E5A", value: "#2C2C2A" },
  "معتمد":         { bg: "#EAF3DE", label: "#3B6D11", value: "#173404" },
  "قيد العمل":     { bg: "#E6F1FB", label: "#185FA5", value: "#042C53" },
  "بحاجة مراجعة": { bg: "#FAEEDA", label: "#854F0B", value: "#412402" },
  "غير مسعّر":    { bg: "#F1EFE8", label: "#5F5E5A", value: "#2C2C2A" },
  "مؤجّل":        { bg: "#EEEDFE", label: "#534AB7", value: "#26215C" },
};
const CAT_COLORS = ["#1D9E75","#378ADD","#EF9F27","#E05252","#7C5ABF","#888780","#1D9E75","#378ADD","#EF9F27","#E05252","#888780"];

export default async function InventoryPage() {
  const [warehouses, items, stats] = await Promise.all([
    getWarehouses(),
    getInventorySummary(),
    getDashboardStats(),
  ]);

  let totalCostValue = 0;
  let totalSellingValue = 0;
  items.forEach(item => {
    const totalQty = Object.values(item.inventory).reduce((a: number, b: any) => a + b, 0);
    if (totalQty > 0) {
      totalCostValue += (item.cost_price_cents / 100) * totalQty;
      totalSellingValue += (item.final_selling_price_cents / 100) * totalQty;
    }
  });

  const kpis = [
    { label: "إجمالي",        value: stats.total,                          href: "/dashboard/inventory/items" },
    { label: "معتمد",         value: stats.byStatus["معتمد"] || 0,         href: "/dashboard/inventory/items?pricing_status=معتمد" },
    { label: "قيد العمل",     value: stats.byStatus["قيد العمل"] || 0,     href: "/dashboard/inventory/items?pricing_status=قيد العمل" },
    { label: "بحاجة مراجعة", value: stats.byStatus["بحاجة مراجعة"] || 0,  href: "/dashboard/inventory/review" },
    { label: "غير مسعّر",    value: stats.byStatus["غير مسعّر"] || 0,     href: "/dashboard/inventory/items?pricing_status=غير مسعّر" },
    { label: "مؤجّل",        value: stats.byStatus["مؤجّل"] || 0,         href: "/dashboard/inventory/items?pricing_status=مؤجّل" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8" dir="rtl">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Boxes className="h-10 w-10 text-indigo-600" />
            إدارة المخزون والتسعير
          </h1>
          <p className="text-slate-500 mt-2 text-lg">تحكم في الأصناف، التسعير، والمستودعات.</p>
        </div>
        <div className="flex gap-3 items-center">
          <Link href="/dashboard/inventory/items" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition">
            <Zap className="h-4 w-4" /> ابدأ التسعير
          </Link>
          <div className="hidden md:block"><ExcelManager /></div>
        </div>
      </div>

      {/* Pricing KPIs */}
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-3">حالة التسعير</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {kpis.map(k => {
            const s = KPI_STYLES[k.label] || KPI_STYLES["إجمالي"];
            return (
              <a key={k.label} href={k.href}
                className="rounded-2xl p-4 text-center no-underline hover:opacity-80 transition"
                style={{ background: s.bg, textDecoration: "none" }}>
                <div className="text-xs font-medium mb-1" style={{ color: s.label }}>{k.label}</div>
                <div className="text-2xl font-black font-mono" style={{ color: s.value }}>{(k.value || 0).toLocaleString("en")}</div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-500 font-medium">نسبة الإنجاز العامة</span>
          <span className="font-bold text-slate-700">{stats.progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${stats.progress}%` }} />
        </div>
      </div>

      {/* Category progress */}
      {stats.categories.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-sm font-bold text-slate-500 mb-4">التقدّم حسب التصنيف</h2>
          <div className="flex flex-col gap-2">
            {stats.categories.map((r: any, i: number) => {
              const pct = r.total ? Math.round((r.approved / r.total) * 100) : 0;
              const col = CAT_COLORS[i % CAT_COLORS.length];
              const href = r.category === 'بدون تصنيف'
                ? '/dashboard/inventory/items?no_category=1'
                : `/dashboard/inventory/items?main_category=${encodeURIComponent(r.category)}`;
              return (
                <a key={r.category} href={href} className="flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-1 transition" style={{ textDecoration: "none" }}>
                  <span className="text-sm text-slate-700 w-52 truncate text-right">{r.category}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: col }} />
                  </div>
                  <span className="text-xs text-slate-400 w-8 text-left">{pct}%</span>
                  <span className="text-xs text-slate-400 w-16 text-left font-mono">{r.approved}/{r.total}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/inventory/items" className="group p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all flex flex-col items-start gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl group-hover:scale-110 transition-transform">
            <Package className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">الأصناف والتسعير</h2>
            <p className="text-slate-500 mt-1">إضافة الأصناف، التسعير، ومراجعة التكلفة.</p>
          </div>
        </Link>

        <Link href="/dashboard/inventory/categories" className="group p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-sky-200 transition-all flex flex-col items-start gap-4">
          <div className="p-4 bg-sky-50 rounded-2xl group-hover:scale-110 transition-transform">
            <LayoutDashboard className="w-8 h-8 text-sky-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">إدارة التصنيفات</h2>
            <p className="text-slate-500 mt-1">التصنيفات الرئيسية والفرعية للأصناف.</p>
          </div>
        </Link>

        <Link href="/dashboard/inventory/review" className="group p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-yellow-200 transition-all flex flex-col items-start gap-4">
          <div className="p-4 bg-yellow-50 rounded-2xl group-hover:scale-110 transition-transform">
            <ClipboardCheck className="w-8 h-8 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">قائمة المراجعة</h2>
            <p className="text-slate-500 mt-1">الأصناف التي تحتاج اعتماداً أو مراجعة.</p>
          </div>
        </Link>
      </div>

      {/* Warehouse table */}
      <div className="pt-4 border-t border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Store className="h-6 w-6 text-slate-400" />
          المخزون الكلي والنقل
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
        <InventoryTable warehouses={warehouses} items={items} />
      </div>

    </div>
  );
}
