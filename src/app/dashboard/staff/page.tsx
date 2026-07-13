import { getStaffList } from "@/lib/staff-data";
import { Users, UserPlus, Phone, ShieldCheck, Trash2 } from "lucide-react";
import { StaffForm } from "./staff-form";
import { deleteStaffAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staffList = await getStaffList();

  const roleMap: Record<string, { label: string, color: string }> = {
    'employee': { label: 'موظف', color: 'bg-slate-200 text-slate-800' },
    'sales': { label: 'مبيعات', color: 'bg-blue-100 text-blue-800' },
    'production': { label: 'إنتاج ومصنع', color: 'bg-indigo-100 text-indigo-800' },
    'purchasing': { label: 'مشتريات', color: 'bg-amber-100 text-amber-800' },
    'order_processor': { label: 'معالج الطلبيات', color: 'bg-teal-100 text-teal-800' },
    'manager': { label: 'مدير النظام', color: 'bg-purple-100 text-purple-800' },
  };

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
            <StaffForm />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
            الموظفين المسجلين ({staffList.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.map(staff => (
              <div key={staff.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{staff.name}</h3>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${roleMap[staff.role]?.color || 'bg-slate-100 text-slate-800'}`}>
                      {roleMap[staff.role]?.label || staff.role}
                    </span>
                  </div>
                  <form action={async () => {
                    "use server";
                    await deleteStaffAction(staff.id);
                  }}>
                    <button type="submit" className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-lg transition" title="حذف الموظف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
                
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-sm text-slate-600">
                  {staff.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span dir="ltr">{staff.phone}</span>
                    </div>
                  )}
                  {staff.telegram_chat_id ? (
                    <div className="flex items-center gap-2 text-sky-600 font-medium">
                      <span>✈️</span> Telegram ID: <span className="font-mono">{staff.telegram_chat_id}</span>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs italic">لا يوجد معرف تليجرام مرتبط</div>
                  )}
                </div>
              </div>
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
