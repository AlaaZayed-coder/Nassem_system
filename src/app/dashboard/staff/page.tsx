import { getStaffList, visibleStaffFor } from "@/lib/staff-data";
import { getOngoingVacationStaffIds } from "@/lib/employee-requests-data";
import { getSession } from "@/lib/auth";
import { Users, UserPlus, ShieldCheck } from "lucide-react";
import { StaffForm } from "./staff-form";
import { StaffCard } from "./staff-card";
import { BroadcastForm } from "./broadcast-form";
import { StaffFilters } from "./staff-filters";
import { ExportCsvButton } from "./export-csv-button";

export const dynamic = "force-dynamic";

export default async function StaffPage({ searchParams }: { searchParams: { q?: string; role?: string; status?: string } }) {
  const session = await getSession();
  const fullList = await getStaffList();
  const staffList = visibleStaffFor(fullList, session?.username || "");
  const ongoingVacationIds = await getOngoingVacationStaffIds();

  const q = (searchParams.q || "").trim();
  const roleFilter = searchParams.role || "";
  const statusFilter = searchParams.status || "";

  const filteredList = staffList.filter((s) => {
    if (q && !s.name.includes(q)) return false;
    if (roleFilter && s.role !== roleFilter) return false;
    if (statusFilter === "active" && !s.is_active) return false;
    if (statusFilter === "inactive" && s.is_active) return false;
    return true;
  });

  const stats = {
    total: staffList.length,
    active: staffList.filter((s) => s.is_active).length,
    inactive: staffList.filter((s) => !s.is_active).length,
    noTelegram: staffList.filter((s) => !s.telegram_chat_id).length,
    noLogin: staffList.filter((s) => !s.username).length,
    onVacation: ongoingVacationIds.size,
  };

  const statCards = [
    { label: "إجمالي الموظفين", value: stats.total },
    { label: "نشطون", value: stats.active },
    { label: "معطّلون", value: stats.inactive },
    { label: "بدون تيليجرام", value: stats.noTelegram },
    { label: "بدون بيانات دخول", value: stats.noLogin },
    { label: "في إجازة الآن", value: stats.onVacation },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8" dir="rtl">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <Users className="h-10 w-10 text-indigo-600" />
          إدارة الموظفين (لـ Telegram App)
        </h1>
        <p className="text-slate-500 mt-2 text-lg">إضافة الموظفين وربطهم بحساباتهم على تليجرام لتفعيل الإشعارات وتطبيق المهام.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-slate-800">{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-8 sticky top-8 self-start">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              إضافة موظف جديد
            </h2>
            <StaffForm staff={staffList} />
          </div>
          <BroadcastForm staff={staffList} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-600" />
              الموظفين المسجلين ({filteredList.length} من {staffList.length})
            </h2>
            <ExportCsvButton staff={filteredList} />
          </div>

          <StaffFilters q={q} role={roleFilter} status={statusFilter} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map(staff => (
              <StaffCard key={staff.id} staff={staff} allStaff={staffList} viewerRole={session?.role} />
            ))}

            {filteredList.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                {staffList.length === 0 ? "لا يوجد موظفين مسجلين حالياً." : "لا يوجد موظفين مطابقين لعوامل التصفية."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
