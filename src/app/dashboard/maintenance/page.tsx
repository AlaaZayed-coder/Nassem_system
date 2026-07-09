import Link from "next/link";
import { Wrench, Cog, ActivitySquare, AlertTriangle, Ticket } from "lucide-react";
import { getMachines, getMaintenanceLogs, getMaintenanceRequests } from "@/lib/maintenance-data";

export default async function MaintenanceDashboardPage() {
  const machines = await getMachines();
  const logs = await getMaintenanceLogs();
  const pendingRequests = await getMaintenanceRequests("قيد الانتظار");

  const workingMachines = machines.filter((m) => m.status === "تعمل").length;
  const brokenMachines = machines.filter((m) => m.status === "متعطلة" || m.status === "صيانة").length;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8" dir="rtl">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <Wrench className="w-10 h-10 text-orange-500" /> إدارة الآلات والصيانة
        </h1>
        <p className="text-slate-500 mt-2">راقب حالة آلات المصنع، سجل الأعطال، وجدول عمليات الصيانة الدورية.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600">
            <ActivitySquare className="w-8 h-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">{workingMachines}</div>
            <div className="text-slate-500 font-medium">آلات تعمل بصحة جيدة</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-rose-100 p-4 rounded-2xl text-rose-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">{brokenMachines}</div>
            <div className="text-slate-500 font-medium">آلات معطلة أو في الصيانة</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600">
            <Cog className="w-8 h-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">{logs.length}</div>
            <div className="text-slate-500 font-medium">عملية صيانة مسجلة</div>
          </div>
        </div>

        <Link href="/dashboard/maintenance/requests" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="bg-orange-100 p-4 rounded-2xl text-orange-600">
            <Ticket className="w-8 h-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">{pendingRequests.length}</div>
            <div className="text-slate-500 font-medium">تذاكر صيانة بانتظار المعالجة</div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">حالة الآلات</h2>
            <Link href="/dashboard/maintenance/machines" className="text-indigo-600 text-sm font-bold hover:underline">
              إدارة الآلات
            </Link>
          </div>
          <div className="space-y-4">
            {machines.slice(0, 5).map(machine => (
              <div key={machine.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800">{machine.name}</span>
                  <span className="text-xs text-slate-500">{machine.model || "بدون موديل"}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  machine.status === "تعمل" ? "bg-emerald-100 text-emerald-700" :
                  machine.status === "متعطلة" ? "bg-rose-100 text-rose-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {machine.status}
                </span>
              </div>
            ))}
            {machines.length === 0 && <div className="text-center text-slate-400 py-4">لم يتم إضافة آلات بعد</div>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">أحدث عمليات الصيانة</h2>
            <Link href="/dashboard/maintenance/logs/new" className="text-indigo-600 text-sm font-bold hover:underline">
              تسجيل صيانة
            </Link>
          </div>
          <div className="space-y-4">
            {logs.slice(0, 5).map(log => (
              <div key={log.id} className="flex flex-col gap-2 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">{log.erp_machines?.name}</span>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(log.maintenance_date).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{log.description}</p>
              </div>
            ))}
            {logs.length === 0 && <div className="text-center text-slate-400 py-4">لا توجد سجلات صيانة</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
