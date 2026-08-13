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
    <div className="max-w-6xl mx-auto py-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">أهلاً بك، {session?.name || ""} 👋</h1>
        <p className="text-slate-500 mt-1">اختر القسم اللي تريد العمل عليه.</p>
      </div>

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
