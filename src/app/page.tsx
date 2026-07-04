import Link from "next/link";
import { Factory, Settings, Boxes, BarChart2, Users, ClipboardList, ShieldCheck } from "lucide-react";

export default function Home() {
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          {/* Row 1 */}
          <Link href="/dashboard/sales"
            className="group flex flex-col items-center gap-3 p-6 bg-purple-50 hover:bg-purple-600 rounded-2xl transition-all border border-purple-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="text-base font-bold text-purple-900 group-hover:text-white transition-colors">ادارة علاقات الزبائن</span>
          </Link>

          <Link href="/dashboard/production"
            className="group flex flex-col items-center gap-3 p-6 bg-indigo-50 hover:bg-indigo-600 rounded-2xl transition-all border border-indigo-100">
            <Factory className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" />
            <span className="text-base font-bold text-indigo-900 group-hover:text-white transition-colors">إدارة الإنتاج</span>
          </Link>

          <Link href="/dashboard/inventory/warehouse"
            className="group flex flex-col items-center gap-3 p-6 bg-sky-50 hover:bg-sky-600 rounded-2xl transition-all border border-sky-100">
            <Boxes className="w-8 h-8 text-sky-600 group-hover:text-white transition-colors" />
            <span className="text-base font-bold text-sky-900 group-hover:text-white transition-colors">إدارة المخزون</span>
          </Link>

          <Link href="/dashboard/purchasing"
            className="group flex flex-col items-center gap-3 p-6 bg-rose-50 hover:bg-rose-600 rounded-2xl transition-all border border-rose-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-rose-600 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="text-base font-bold text-rose-900 group-hover:text-white transition-colors">إدارة المشتريات</span>
          </Link>

          {/* Row 2 */}
          <Link href="/dashboard/maintenance"
            className="group flex flex-col items-center gap-3 p-6 bg-orange-50 hover:bg-orange-600 rounded-2xl transition-all border border-orange-100">
            <Settings className="w-8 h-8 text-orange-600 group-hover:text-white transition-colors" />
            <span className="text-base font-bold text-orange-900 group-hover:text-white transition-colors">إدارة الصيانة</span>
          </Link>

          <Link href="/dashboard/staff"
            className="group flex flex-col items-center gap-3 p-6 bg-emerald-50 hover:bg-emerald-600 rounded-2xl transition-all border border-emerald-100">
            <Users className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors" />
            <span className="text-base font-bold text-emerald-900 group-hover:text-white transition-colors">إدارة الموظفين</span>
          </Link>

          <Link href="/dashboard/reports"
            className="group flex flex-col items-center gap-3 p-6 bg-slate-100 hover:bg-slate-800 rounded-2xl transition-all border border-slate-200">
            <BarChart2 className="w-8 h-8 text-slate-700 group-hover:text-white transition-colors" />
            <span className="text-base font-bold text-slate-800 group-hover:text-white transition-colors">التقارير</span>
          </Link>

          <Link href="/dashboard/inventory/pricing-dashboard"
            className="group flex flex-col items-center gap-3 p-6 bg-teal-50 hover:bg-teal-600 rounded-2xl transition-all border border-teal-100">
            <ShieldCheck className="w-8 h-8 text-teal-600 group-hover:text-white transition-colors" />
            <span className="text-base font-bold text-teal-900 group-hover:text-white transition-colors">لوحة التسعير</span>
          </Link>
        </div>

        {/* Second row: Audit, Settings */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard/audit"
            className="group flex flex-col items-center gap-3 p-5 bg-amber-50 hover:bg-amber-600 rounded-2xl transition-all border border-amber-100">
            <ClipboardList className="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" />
            <span className="text-base font-bold text-amber-900 group-hover:text-white transition-colors">سجل التدقيق</span>
          </Link>

          <Link href="/dashboard/settings"
            className="group flex flex-col items-center gap-3 p-5 bg-gray-100 hover:bg-gray-700 rounded-2xl transition-all border border-gray-200">
            <Settings className="w-7 h-7 text-gray-600 group-hover:text-white transition-colors" />
            <span className="text-base font-bold text-gray-800 group-hover:text-white transition-colors">الإعدادات</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
