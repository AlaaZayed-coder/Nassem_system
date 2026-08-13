"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User, Home, LogOut, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { ROLE_LABELS } from "@/lib/role-labels";
import { ROLE_NOTIFICATION_SCOPE } from "@/lib/dashboard-notifications";
import { NAV_GROUPS } from "@/lib/nav-modules";
import { canAccessPath } from "@/lib/access-control";
import type { SessionPayload } from "@/lib/auth";

const NOTIFICATION_LABELS: Record<string, string> = {
  pendingSubmissions: "طلبيات واردة قيد المراجعة",
  pendingMaintenance: "تذاكر صيانة معلّقة",
  pendingPurchases: "طلبات شراء معلّقة",
  pendingInstallations: "طلبيات بانتظار إخراج التركيب",
};

function isPathActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(path + "/");
}

export function Header({
  counts,
  session,
}: {
  counts: { pendingSubmissions: number; pendingMaintenance: number; pendingPurchases: number; pendingInstallations: number; pendingEmployeeRequests: number };
  session: SessionPayload | null;
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const pathname = usePathname() || "";
  // كل حساب يشوف تنبيهات تخصه هو فقط، مو تنبيهات المدراء/المشرفين الشاملة.
  const scope = ROLE_NOTIFICATION_SCOPE[session?.role || ""] || [];
  const totalPending = scope.reduce((sum, key) => sum + counts[key], 0);

  // شريط سياقي رفيع يظهر فقط وأنت داخل قسم (مو بالرئيسية نفسها) — يعرض
  // اسم المجموعة الحالية وروابط سريعة لباقي صفحاتها، بدل القائمة الجانبية
  // القديمة اللي كانت تفتح نفس الروابط كأبناء قابلين للطي.
  const role = session?.role || "";
  const extraAccess = session?.extraAccess || [];
  const currentGroup = pathname && pathname !== "/dashboard"
    ? NAV_GROUPS.find((g) => g.items.some((item) => isPathActive(pathname, item.path)))
    : null;
  const groupItems = currentGroup?.items.filter((item) => canAccessPath(role, item.path, extraAccess)) || [];

  return (
    <>
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 md:px-6 relative">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-700 hover:text-indigo-600 transition font-bold">
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline text-lg md:text-xl">الرئيسية</span>
          </Link>
        </div>

      <div className="flex items-center gap-3 md:gap-5 text-slate-600">
        <div className="relative">
          <button onClick={() => setShowNotifications((v) => !v)} className="hover:text-indigo-600 relative">
            <Bell className="h-5 w-5" />
            {totalPending > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-white text-[9px] font-bold">
                  {totalPending > 9 ? "9+" : totalPending}
                </span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-0 top-10 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 text-sm">
              {scope.map((key, i) => (
                <div key={key} className={`flex items-center justify-between py-1.5 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                  <span className="text-slate-600">{NOTIFICATION_LABELS[key]}</span>
                  <span className="font-bold text-slate-800">{counts[key]}</span>
                </div>
              ))}
              {scope.length === 0 && <div className="text-center text-slate-400 py-2">لا توجد تنبيهات تخصك حالياً</div>}
              {scope.length > 0 && totalPending === 0 && <div className="text-center text-slate-400 py-2">لا توجد تنبيهات حالياً</div>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-r pr-3 md:pr-5 border-slate-200">
          <div className="bg-slate-100 p-2 rounded-full">
            <User className="h-4 w-4 text-slate-700" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-semibold text-slate-700">{session?.name || ""}</span>
            {session?.role && <span className="text-[11px] text-slate-400">{ROLE_LABELS[session.role] || session.role}</span>}
          </div>
          <form action={logoutAction}>
            <button type="submit" title="تسجيل الخروج" className="text-slate-400 hover:text-rose-600 transition p-1.5">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      </header>

      {currentGroup && groupItems.length > 0 && (
        <div className="print:hidden bg-white border-t border-slate-100 px-4 md:px-6 py-2 flex items-center gap-2 overflow-x-auto">
          <Link href="/dashboard" className="shrink-0 text-xs font-bold text-slate-400 hover:text-indigo-600 transition whitespace-nowrap">
            الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3 text-slate-300 shrink-0" />
          <span className="shrink-0 text-xs font-bold text-slate-500 whitespace-nowrap">{currentGroup.group}</span>
          <div className="w-px h-4 bg-slate-200 mx-1 shrink-0" />
          {groupItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                isPathActive(pathname, item.path) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
