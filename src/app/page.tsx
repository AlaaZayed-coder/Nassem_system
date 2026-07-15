import Link from "next/link";
import { Factory, Settings, Boxes, BarChart2, Users, ClipboardList, ShieldCheck, ListChecks, Contact, ShoppingCart } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccessPath } from "@/lib/access-control";

type Tile = {
  href: string;
  label: string;
  icon: React.ReactNode;
  bg: string;
  hoverBg: string;
  iconColor: string;
  textColor: string;
};

const TILES: Tile[] = [
  {
    href: "/dashboard/sales", label: "ادارة علاقات الزبائن",
    icon: <Contact className="w-8 h-8" />,
    bg: "bg-purple-50", hoverBg: "hover:bg-purple-600", iconColor: "text-purple-600", textColor: "text-purple-900",
  },
  {
    href: "/dashboard/production", label: "إدارة الإنتاج",
    icon: <Factory className="w-8 h-8" />,
    bg: "bg-indigo-50", hoverBg: "hover:bg-indigo-600", iconColor: "text-indigo-600", textColor: "text-indigo-900",
  },
  {
    href: "/dashboard/inventory/warehouse", label: "إدارة المخزون",
    icon: <Boxes className="w-8 h-8" />,
    bg: "bg-sky-50", hoverBg: "hover:bg-sky-600", iconColor: "text-sky-600", textColor: "text-sky-900",
  },
  {
    href: "/dashboard/purchasing", label: "إدارة المشتريات",
    icon: <ShoppingCart className="w-8 h-8" />,
    bg: "bg-rose-50", hoverBg: "hover:bg-rose-600", iconColor: "text-rose-600", textColor: "text-rose-900",
  },
  {
    href: "/dashboard/maintenance", label: "إدارة الصيانة",
    icon: <Settings className="w-8 h-8" />,
    bg: "bg-orange-50", hoverBg: "hover:bg-orange-600", iconColor: "text-orange-600", textColor: "text-orange-900",
  },
  {
    href: "/dashboard/staff", label: "إدارة الموظفين",
    icon: <Users className="w-8 h-8" />,
    bg: "bg-emerald-50", hoverBg: "hover:bg-emerald-600", iconColor: "text-emerald-600", textColor: "text-emerald-900",
  },
  {
    href: "/dashboard/reports", label: "التقارير",
    icon: <BarChart2 className="w-8 h-8" />,
    bg: "bg-slate-100", hoverBg: "hover:bg-slate-800", iconColor: "text-slate-700", textColor: "text-slate-800",
  },
  {
    href: "/dashboard/inventory/pricing-dashboard", label: "لوحة التسعير",
    icon: <ShieldCheck className="w-8 h-8" />,
    bg: "bg-teal-50", hoverBg: "hover:bg-teal-600", iconColor: "text-teal-600", textColor: "text-teal-900",
  },
  {
    href: "/dashboard/agenda", label: "الأجندة اليومية",
    icon: <ListChecks className="w-7 h-7" />,
    bg: "bg-cyan-50", hoverBg: "hover:bg-cyan-600", iconColor: "text-cyan-600", textColor: "text-cyan-900",
  },
  {
    href: "/dashboard/audit", label: "سجل التدقيق",
    icon: <ClipboardList className="w-7 h-7" />,
    bg: "bg-amber-50", hoverBg: "hover:bg-amber-600", iconColor: "text-amber-600", textColor: "text-amber-900",
  },
  {
    href: "/dashboard/settings", label: "الإعدادات",
    icon: <Settings className="w-7 h-7" />,
    bg: "bg-gray-100", hoverBg: "hover:bg-gray-700", iconColor: "text-gray-600", textColor: "text-gray-800",
  },
];

export default async function Home() {
  const session = await getSession();
  const role = session?.role || "";
  const visibleTiles = TILES.filter((t) => canAccessPath(role, t.href));

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="max-w-4xl w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center space-y-8">
        <div className="mx-auto bg-indigo-600 text-white w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3">
          <Factory className="w-10 h-10" />
        </div>
        <div className="space-y-3">
          <h1 className="text-5xl font-black text-slate-800 tracking-tight">نظام الحوكمة</h1>
          <p className="text-xl text-slate-500 font-medium">النظام الشامل لإدارة الإنتاج، التسعير، والصيانة.</p>
        </div>

        {visibleTiles.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            {visibleTiles.map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className={`group flex flex-col items-center gap-3 p-6 ${tile.bg} ${tile.hoverBg} rounded-2xl transition-all border border-slate-100`}
              >
                <span className={`${tile.iconColor} group-hover:text-white transition-colors`}>{tile.icon}</span>
                <span className={`text-base font-bold ${tile.textColor} group-hover:text-white transition-colors`}>{tile.label}</span>
              </Link>
            ))}
          </div>
        ) : (
          <Link href="/dashboard" className="block text-indigo-600 font-bold hover:underline pt-4">
            الذهاب للوحة التحكم
          </Link>
        )}
      </div>
    </main>
  );
}
