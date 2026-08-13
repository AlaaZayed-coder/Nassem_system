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

  const visibleGroups = NAV_GROUPS
    .map((g) => ({ group: g.group, items: g.items.filter((item) => canAccessPath(role, item.path, extraAccess)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto py-2" dir="rtl">
      <h1 className="text-lg font-extrabold text-slate-800 mb-3">أهلاً بك، {session?.name || ""} 👋</h1>

      <div className="flex flex-col gap-3">
        {visibleGroups.map((g) => (
          <div key={g.group} className="flex items-start gap-3">
            <span className="shrink-0 w-24 sm:w-28 pt-1.5 text-[11px] font-bold text-slate-400 text-left">{g.group}</span>
            <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {g.items.map((item) => {
                const badge = item.badgeKey ? counts[item.badgeKey] : 0;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex flex-col items-center gap-1 text-center hover:border-indigo-300 hover:shadow-md transition"
                  >
                    {!!badge && (
                      <span className="absolute top-1 left-1 bg-rose-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[15px] leading-none text-center">
                        {badge}
                      </span>
                    )}
                    <div className="bg-indigo-50 text-indigo-600 w-7 h-7 rounded-lg flex items-center justify-center">
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-700 leading-tight">{item.name}</span>
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
