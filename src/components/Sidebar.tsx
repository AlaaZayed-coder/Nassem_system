"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Factory,
  Settings,
  Boxes,
  BarChart2,
  Users,
  ClipboardList,
  ShieldCheck,
  Target,
  Inbox,
  Wrench,
  ShoppingCart,
  DoorClosed,
  Contact,
  X,
} from "lucide-react";

type MenuItem = {
  name: string;
  icon: any;
  path: string;
  badge?: number;
};

export function Sidebar({
  isOpen,
  onClose,
  counts,
}: {
  isOpen: boolean;
  onClose: () => void;
  counts: { pendingSubmissions: number; pendingMaintenance: number; pendingPurchases: number };
}) {
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    { name: "الرئيسية", icon: Factory, path: "/dashboard" },
    { name: "إدارة المبيعات (CRM)", icon: Target, path: "/dashboard/sales" },
    { name: "العملاء", icon: Contact, path: "/dashboard/customers" },
    { name: "صندوق وارد الطلبيات", icon: Inbox, path: "/dashboard/sales/submissions", badge: counts.pendingSubmissions },
    { name: "إدارة الإنتاج", icon: Factory, path: "/dashboard/production" },
    { name: "طلبيات أبواب الرول", icon: DoorClosed, path: "/dashboard/production/door-orders" },
    { name: "إدارة المخزون", icon: Boxes, path: "/dashboard/inventory" },
    { name: "إدارة المشتريات", icon: ShoppingCart, path: "/dashboard/purchasing" },
    { name: "طلبات الشراء المعلّقة", icon: ShoppingCart, path: "/dashboard/purchasing/requests", badge: counts.pendingPurchases },
    { name: "إدارة الصيانة", icon: Wrench, path: "/dashboard/maintenance" },
    { name: "تذاكر الصيانة", icon: Wrench, path: "/dashboard/maintenance/requests", badge: counts.pendingMaintenance },
    { name: "إدارة الموظفين", icon: Users, path: "/dashboard/staff" },
    { name: "التقارير", icon: BarChart2, path: "/dashboard/reports" },
    { name: "لوحة التسعير", icon: ShieldCheck, path: "/dashboard/inventory/pricing-dashboard" },
    { name: "سجل التدقيق", icon: ClipboardList, path: "/dashboard/audit" },
    { name: "الإعدادات", icon: Settings, path: "/dashboard/settings" },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`w-72 bg-slate-900 text-white h-screen fixed right-0 top-0 p-4 z-40 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } lg:relative lg:z-0`}
      >
        <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
          <div className="text-xl font-bold">نظام الحوكمة</div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
          {menuItems.map((item) => {
            const isActive = item.path === "/" ? pathname === "/" : pathname?.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  isActive ? "bg-indigo-600 text-white font-bold" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </span>
                {!!item.badge && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
