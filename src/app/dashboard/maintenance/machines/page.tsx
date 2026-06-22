import { Settings, Plus } from "lucide-react";
import { getMachines } from "@/lib/maintenance-data";
import Link from "next/link";
import { changeMachineStatusAction } from "@/app/dashboard/maintenance/actions";

export default async function MachinesPage() {
  const machines = await getMachines();

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">سجل آلات المصنع</h1>
        </div>
        <Link
          href="/dashboard/maintenance/machines/new"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-700 transition"
        >
          <Plus className="h-5 w-5" />
          إضافة آلة جديدة
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <th className="p-4 font-bold">اسم الآلة</th>
              <th className="p-4 font-bold">الموديل / السيريال</th>
              <th className="p-4 font-bold text-center">الحالة الحالية</th>
              <th className="p-4 font-bold text-center">تحديث الحالة</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((machine) => (
              <tr key={machine.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                <td className="p-4 font-bold text-slate-800">{machine.name}</td>
                <td className="p-4 font-mono text-sm text-slate-500">
                  {machine.model || "—"} / {machine.serial_number || "—"}
                </td>
                <td className="p-4 text-center">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                    machine.status === "تعمل" ? "bg-emerald-100 text-emerald-700" :
                    machine.status === "متعطلة" ? "bg-rose-100 text-rose-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {machine.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <form action={changeMachineStatusAction.bind(null, machine.id, "تعمل")}>
                      <button className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg font-bold hover:bg-emerald-100 border border-emerald-200">
                        تعمل
                      </button>
                    </form>
                    <form action={changeMachineStatusAction.bind(null, machine.id, "صيانة")}>
                      <button className="text-xs bg-amber-50 text-amber-600 px-3 py-1 rounded-lg font-bold hover:bg-amber-100 border border-amber-200">
                        صيانة
                      </button>
                    </form>
                    <form action={changeMachineStatusAction.bind(null, machine.id, "متعطلة")}>
                      <button className="text-xs bg-rose-50 text-rose-600 px-3 py-1 rounded-lg font-bold hover:bg-rose-100 border border-rose-200">
                        معطلة
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {machines.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  <Settings className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  لا يوجد آلات مسجلة في المصنع.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
