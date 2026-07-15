"use client";

import { Bell, User, Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { ROLE_LABELS } from "@/lib/role-labels";
import type { SessionPayload } from "@/lib/auth";

export function Header({
  onMenuClick,
  counts,
  session,
}: {
  onMenuClick: () => void;
  counts: { pendingSubmissions: number; pendingMaintenance: number; pendingPurchases: number; pendingInstallations: number; pendingEmployeeRequests: number };
  session: SessionPayload | null;
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const totalPending = counts.pendingSubmissions + counts.pendingMaintenance + counts.pendingPurchases + counts.pendingInstallations + counts.pendingEmployeeRequests;

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 md:px-6 relative">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-slate-600 hover:text-slate-900">
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-lg md:text-xl font-semibold text-slate-800">لوحة التحكم</h1>
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
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-600">طلبيات واردة قيد المراجعة</span>
                <span className="font-bold text-slate-800">{counts.pendingSubmissions}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                <span className="text-slate-600">تذاكر صيانة معلّقة</span>
                <span className="font-bold text-slate-800">{counts.pendingMaintenance}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                <span className="text-slate-600">طلبات شراء معلّقة</span>
                <span className="font-bold text-slate-800">{counts.pendingPurchases}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                <span className="text-slate-600">طلبيات بانتظار إخراج التركيب</span>
                <span className="font-bold text-slate-800">{counts.pendingInstallations}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                <span className="text-slate-600">طلبات موظفين بانتظار الاعتماد</span>
                <span className="font-bold text-slate-800">{counts.pendingEmployeeRequests}</span>
              </div>
              {totalPending === 0 && <div className="text-center text-slate-400 py-2">لا توجد تنبيهات حالياً</div>}
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
  );
}
