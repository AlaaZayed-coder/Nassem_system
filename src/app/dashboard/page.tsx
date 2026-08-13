import Link from "next/link";
import { getExecutiveSummary } from "@/lib/executive-dashboard-data";
import { getSlaWarnings } from "@/lib/sla-data";
import { getDashboardNotificationCounts } from "@/lib/dashboard-notifications";
import { getSession } from "@/lib/auth";
import { canAccessPath } from "@/lib/access-control";
import { NAV_GROUPS } from "@/lib/nav-modules";
import { DoorClosed, ShoppingCart, Wrench, ClipboardList, AlertTriangle, Inbox, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500 text-sm font-bold">{label}</span>
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-extrabold text-slate-800">{value}</div>
    </div>
  );
}

// اللوحة التنفيذية (بيانات تشغيلية عابرة لكل الأقسام) مناسبة لمدير النظام
// فقط — تظهر فوق شبكة الأيقونات، وتحتها الشبكة نفسها المتاحة للجميع
// (مفلترة حسب صلاحية كل دور)، بدل قائمة جانبية شجرية دائمة الظهور.
async function ManagerOverview() {
  const [summary, warnings] = await Promise.all([getExecutiveSummary(), getSlaWarnings()]);

  const CATEGORY_LABEL: Record<string, string> = {
    door_pending: "استكمال باب",
    purchase_aging: "طلب شراء",
    maintenance_aging: "طلب صيانة",
    installation_aging: "تركيب",
    submission_aging: "صندوق وارد",
  };

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <KpiCard label="طلبيات باب بانتظار الاستكمال" value={String(summary.pendingDoorCompletionCount)} icon={DoorClosed} color="bg-sky-50 text-sky-600" />
        <KpiCard label="طلبات شراء قيد الانتظار" value={String(summary.pendingPurchaseRequestsCount)} icon={ShoppingCart} color="bg-amber-50 text-amber-600" />
        <KpiCard label="تذاكر صيانة قيد الانتظار" value={String(summary.pendingMaintenanceCount)} icon={Wrench} color="bg-orange-50 text-orange-600" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <KpiCard label="صندوق وارد الطلبيات (بانتظار المعالجة)" value={String(summary.pendingSubmissionsCount)} icon={Inbox} color="bg-indigo-50 text-indigo-600" />
        <KpiCard label="طلبيات جاهزة بانتظار إخراج التركيب" value={String(summary.pendingInstallationDispatchCount)} icon={Truck} color="bg-sky-50 text-sky-600" />
        <KpiCard label="تركيبات جارية (قيد التنفيذ / بانتظار تأكيد العميل)" value={String(summary.installationInProgressCount)} icon={Truck} color="bg-violet-50 text-violet-600" />
      </div>

      {warnings.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            تنبيهات التأخير (SLA)
          </h2>
          <div className="space-y-2">
            {warnings.map((w) => (
              <Link
                key={w.id}
                href={w.link}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    {CATEGORY_LABEL[w.category]}
                  </span>
                  <span className="font-bold text-slate-800">{w.label}</span>
                </div>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                  متأخر {w.daysOpen} يوم
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function DashboardHomePage() {
  const session = await getSession();
  const role = session?.role || "";
  const extraAccess = session?.extraAccess || [];
  const counts = await getDashboardNotificationCounts();

  const visibleGroups = NAV_GROUPS
    .map((g) => ({ group: g.group, items: g.items.filter((item) => canAccessPath(role, item.path, extraAccess)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="max-w-6xl mx-auto py-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">أهلاً بك، {session?.name || ""} 👋</h1>
        <p className="text-slate-500 mt-1">اختر القسم اللي تريد العمل عليه.</p>
      </div>

      {role === "manager" && <ManagerOverview />}

      <div className="flex flex-col gap-8">
        {visibleGroups.map((g) => (
          <div key={g.group}>
            <h2 className="text-sm font-bold text-slate-400 mb-3">{g.group}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {g.items.map((item) => {
                const badge = item.badgeKey ? counts[item.badgeKey] : 0;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center gap-2 text-center hover:border-indigo-300 hover:shadow-md transition"
                  >
                    {!!badge && (
                      <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {badge}
                      </span>
                    )}
                    <div className="bg-indigo-50 text-indigo-600 w-11 h-11 rounded-xl flex items-center justify-center">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 leading-tight">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
