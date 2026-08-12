"use client";

import { ROLE_LABELS } from "@/lib/role-labels";
import { Search } from "lucide-react";

export function StaffFilters({ q, role, status }: { q: string; role: string; status: string }) {
  return (
    <form className="filter-bar-compact bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2" dir="rtl">
      <div className="relative flex-1 min-w-[140px]">
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="بحث بالاسم..."
          className="w-full pr-8 pl-2 py-1.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-xs"
        />
      </div>

      <select
        name="role"
        defaultValue={role}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="shrink-0 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-none"
      >
        <option value="">كل الأدوار</option>
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="shrink-0 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-none"
      >
        <option value="">كل الحالات</option>
        <option value="active">نشط</option>
        <option value="inactive">معطّل</option>
      </select>

      {(q || role || status) && (
        <a href="/dashboard/staff" className="shrink-0 text-xs font-bold text-slate-400 hover:text-rose-600 transition whitespace-nowrap">
          مسح
        </a>
      )}
    </form>
  );
}
