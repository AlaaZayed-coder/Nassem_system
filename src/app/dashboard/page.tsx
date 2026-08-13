import Link from "next/link";
import { getDashboardNotificationCounts } from "@/lib/dashboard-notifications";
import { getSession } from "@/lib/auth";
import { canAccessPath } from "@/lib/access-control";
import { NAV_GROUPS } from "@/lib/nav-modules";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const session = await getSession();
  const role = session?.role || "";
  const extraAccess = session?.extraAccess || [];
  const counts = await getDashboardNotificationCounts();

  // أيقونة واحدة تمثّل القسم كله بالشاشة الرئيسية — تفتح أول صفحة مسموحة
  // بالقسم، وبقية صفحاته تظهر بالشريط السياقي تحت الرأس بمجرد الدخول
  // (انظر Header.tsx)، بدل تكديسها كأيقونات منفصلة هنا.
  const groupTiles = NAV_GROUPS
    .map((g) => {
      const accessibleItems = g.items.filter((item) => canAccessPath(role, item.path, extraAccess));
      if (accessibleItems.length === 0) return null;
      const badge = accessibleItems.reduce((sum, item) => sum + (item.badgeKey ? counts[item.badgeKey] : 0), 0);
      return { group: g.group, color: g.color, primary: accessibleItems[0], badge };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  return (
    <div className="max-w-4xl mx-auto py-4" dir="rtl">
      <h1 className="text-lg font-extrabold text-slate-800 mb-4">أهلاً بك، {session?.name || ""} 👋</h1>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {groupTiles.map((g) => (
          <Link
            key={g.group}
            href={g.primary.path}
            className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center gap-2 text-center hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition"
          >
            {!!g.badge && (
              <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] leading-none text-center">
                {g.badge}
              </span>
            )}
            <div className={`${g.color} w-10 h-10 rounded-xl flex items-center justify-center`}>
              <g.primary.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-700 leading-tight">{g.group}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
