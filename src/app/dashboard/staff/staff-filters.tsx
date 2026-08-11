import { ROLE_LABELS } from "@/lib/role-labels";
import { Search } from "lucide-react";

export function StaffFilters({ q, role, status }: { q: string; role: string; status: string }) {
  return (
    <form className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-nowrap gap-3 items-center overflow-x-auto" dir="rtl">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="بحث بالاسم..."
          className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-sm"
        />
      </div>

      <select name="role" defaultValue={role} className="shrink-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm outline-none">
        <option value="">كل الأدوار</option>
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select name="status" defaultValue={status} className="shrink-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm outline-none">
        <option value="">كل الحالات</option>
        <option value="active">نشط</option>
        <option value="inactive">معطّل</option>
      </select>

      <button type="submit" className="shrink-0 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition whitespace-nowrap">
        تصفية
      </button>
      {(q || role || status) && (
        <a href="/dashboard/staff" className="shrink-0 px-3 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition whitespace-nowrap">
          مسح
        </a>
      )}
    </form>
  );
}
