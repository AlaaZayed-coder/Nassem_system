"use client";

import { Bell, User, Menu } from "lucide-react";
import { useState } from "react";

export function Header({
  onMenuClick,
  counts,
}: {
  onMenuClick: () => void;
  counts: { pendingSubmissions: number; pendingMaintenance: number; pendingPurchases: number };
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const totalPending = counts.pendingSubmissions + counts.pendingMaintenance + counts.pendingPurchases;

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
              {totalPending === 0 && <div className="text-center text-slate-400 py-2">لا توجد تنبيهات حالياً</div>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-r pr-3 md:pr-5 border-slate-200">
          <div className="bg-slate-100 p-2 rounded-full">
            <User className="h-4 w-4 text-slate-700" />
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline">علاء زايد</span>
        </div>
      </div>
    </header>
  );
}
