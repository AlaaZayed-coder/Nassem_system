import { getStaffList } from "@/lib/staff-data";
import { Users, UserPlus, ShieldCheck } from "lucide-react";
import { StaffForm } from "./staff-form";
import { StaffCard } from "./staff-card";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staffList = await getStaffList();

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8" dir="rtl">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <Users className="h-10 w-10 text-indigo-600" />
          إدارة الموظفين (لـ Telegram App)
        </h1>
        <p className="text-slate-500 mt-2 text-lg">إضافة الموظفين وربطهم بحساباتهم على تليجرام لتفعيل الإشعارات وتطبيق المهام.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              إضافة موظف جديد
            </h2>
            <StaffForm staff={staffList} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
            الموظفين المسجلين ({staffList.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.map(staff => (
              <StaffCard key={staff.id} staff={staff} allStaff={staffList} />
            ))}

            {staffList.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                لا يوجد موظفين مسجلين حالياً.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
