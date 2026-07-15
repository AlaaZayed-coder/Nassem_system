"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  Truck,
  ListChecks,
  ChevronDown,
  X,
} from "lucide-react";
import { canAccessPath } from "@/lib/access-control";

type LeafItem = {
  name: string;
  icon: any;
  path: string;
  badge?: number;
};

type MenuEntry = LeafItem & { children?: LeafItem[] };

function isPathActive(pathname: string | null, path: string): boolean {
  if (!pathname) return false;
  if (path === "/dashboard") return pathname === "/dashboard";
  return pathname === path || pathname.startsWith(path + "/");
}

export function Sidebar({
  isOpen,
  onClose,
  counts,
  role,
  extraAccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  counts: { pendingSubmissions: number; pendingMaintenance: number; pendingPurchases: number; pendingInstallations: number; pendingEmployeeRequests: number };
  role: string;
  extraAccess: string[];
}) {
  const pathname = usePathname();

  const allMenuItems: MenuEntry[] = [
    { name: "الرئيسية", icon: Factory, path: "/dashboard" },
    { name: "الأجندة اليومية", icon: ListChecks, path: "/dashboard/agenda" },
    {
      name: "إدارة المبيعات (CRM)", icon: Target, path: "/dashboard/sales",
      children: [
        { name: "العملاء", icon: Contact, path: "/dashboard/customers" },
        { name: "صندوق وارد الطلبيات", icon: Inbox, path: "/dashboard/sales/submissions", badge: counts.pendingSubmissions },
      ],
    },
    {
      name: "إدارة الإنتاج", icon: Factory, path: "/dashboard/production",
      children: [
        { name: "طلبيات أبواب الرول", icon: DoorClosed, path: "/dashboard/production/door-orders" },
        { name: "التركيب", icon: Truck, path: "/dashboard/installation", badge: counts.pendingInstallations },
      ],
    },
    {
      name: "إدارة المخزون", icon: Boxes, path: "/dashboard/inventory",
      children: [
        { name: "لوحة التسعير", icon: ShieldCheck, path: "/dashboard/inventory/pricing-dashboard" },
      ],
    },
    {
      name: "إدارة المشتريات", icon: ShoppingCart, path: "/dashboard/purchasing",
      children: [
        { name: "طلبات الشراء المعلّقة", icon: ShoppingCart, path: "/dashboard/purchasing/requests", badge: counts.pendingPurchases },
      ],
    },
    {
      name: "إدارة الصيانة", icon: Wrench, path: "/dashboard/maintenance",
      children: [
        { name: "تذاكر الصيانة", icon: Wrench, path: "/dashboard/maintenance/requests", badge: counts.pendingMaintenance },
      ],
    },
    {
      name: "إدارة الموظفين", icon: Users, path: "/dashboard/staff",
      children: [
        { name: "طلبات الموظفين", icon: ClipboardList, path: "/dashboard/staff/requests", badge: counts.pendingEmployeeRequests },
      ],
    },
    { name: "التقارير", icon: BarChart2, path: "/dashboard/reports" },
    { name: "سجل التدقيق", icon: ClipboardList, path: "/dashboard/audit" },
    { name: "الإعدادات", icon: Settings, path: "/dashboard/settings" },
  ];

  const isAllowed = (path: string) => path === "/dashboard" || canAccessPath(role, path, extraAccess);

  // العناصر التي لا يُسمح بمسارها الأساسي لكن يُسمح ببعض أبنائها تُستبدل بروابط الأبناء المسموحة مباشرة.
  const menuItems: MenuEntry[] = allMenuItems.flatMap((item) => {
    const allowedChildren = item.children?.filter((c) => isAllowed(c.path));
    if (isAllowed(item.path)) return [{ ...item, children: allowedChildren }];
    if (allowedChildren && allowedChildren.length > 0) return allowedChildren;
    return [];
  });

  const groupContainsActive = (item: MenuEntry) =>
    isPathActive(pathname, item.path) || !!item.children?.some((c) => isPathActive(pathname, c.path));

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(menuItems.filter((item) => item.children && groupContainsActive(item)).map((item) => item.name))
  );

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const badgeSum = (item: MenuEntry) => (item.badge || 0) + (item.children?.reduce((s, c) => s + (c.badge || 0), 0) || 0);

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
            const isActive = isPathActive(pathname, item.path);
            const hasChildren = !!item.children?.length;
            const isExpanded = expanded.has(item.name);
            const badge = badgeSum(item);

            return (
              <div key={item.path}>
                <div
                  className={`flex items-center justify-between gap-1 rounded-lg transition-colors text-sm ${
                    isActive ? "bg-indigo-600 text-white font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Link
                    href={item.path}
                    onClick={() => {
                      if (hasChildren) setExpanded((prev) => new Set(prev).add(item.name));
                      onClose();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 flex-1 min-w-0"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>

                  <div className="flex items-center gap-1 pl-2">
                    {!!badge && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {badge}
                      </span>
                    )}
                    {hasChildren && (
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className="p-1.5 hover:bg-slate-700/50 rounded-md shrink-0"
                        aria-label={isExpanded ? "طي" : "توسيع"}
                      >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>

                {hasChildren && isExpanded && (
                  <div className="flex flex-col gap-0.5 mt-0.5 mr-3 pr-3 border-r border-slate-700">
                    {item.children!.map((child) => {
                      const childActive = isPathActive(pathname, child.path);
                      return (
                        <Link
                          key={child.path}
                          href={child.path}
                          onClick={onClose}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                            childActive ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800"
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <child.icon className="h-3.5 w-3.5 shrink-0" />
                            {child.name}
                          </span>
                          {!!child.badge && (
                            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
