import Link from "next/link";
import { getStaffList, visibleStaffFor } from "@/lib/staff-data";
import { getOngoingVacationStaffIds } from "@/lib/employee-requests-data";
import { getSession } from "@/lib/auth";
import { Users, UserPlus, ShieldCheck } from "lucide-react";
import { StaffForm } from "./staff-form";
import { StaffRow } from "./staff-card";
import { BroadcastForm } from "./broadcast-form";
import { StaffFilters } from "./staff-filters";
import { ExportCsvButton } from "./export-csv-button";
import { PrintButton } from "@/components/PrintButton";
import { MessagesLog } from "./messages-log";
import { getBroadcastMessagesLog } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

type SearchParams = { tab?: string; q?: string; role?: string; status?: string; page?: string };

const TABS = [
  { key: "list", label: "الموظفين المسجلين" },
  { key: "add", label: "إضافة موظف جديد" },
  { key: "broadcast", label: "إرسال رسالة" },
  { key: "messages", label: "سجل الرسائل" },
] as const;

export default async function StaffPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  const fullList = await getStaffList();
  const staffList = visibleStaffFor(fullList, session?.username || "");
  const ongoingVacationIds = await getOngoingVacationStaffIds();

  const activeTab = searchParams.tab || "list";
  const q = (searchParams.q || "").trim();
  const roleFilter = searchParams.role || "";
  const statusFilter = searchParams.status || "";
  const messagesPage = Number(searchParams.page) || 1;
  const messagesLog = activeTab === "messages" ? await getBroadcastMessagesLog(messagesPage) : null;

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
      <div className="print:hidden">
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <Users className="h-10 w-10 text-indigo-600" />
          إدارة الموظفين (لـ Telegram App)
        </h1>
        <p className="text-slate-500 mt-2 text-lg">إضافة الموظفين وربطهم بحساباتهم على تليجرام لتفعيل الإشعارات وتطبيق المهام.</p>
      </div>

      <div className="print:hidden grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-slate-800">{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="print:hidden flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          const count = t.key === "list" ? filteredList.length : undefined;
          return (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition ${
                isActive ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              {count !== undefined ? ` (${count})` : ""}
            </Link>
          );
        })}
      </div>

      {activeTab === "add" && (
        <div className="max-w-xl bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            إضافة موظف جديد
          </h2>
          <StaffForm staff={staffList} />
        </div>
      )}

      {activeTab === "broadcast" && (
        <div className="max-w-xl">
          <BroadcastForm staff={staffList} />
        </div>
      )}

      {activeTab === "messages" && messagesLog && (
        <MessagesLog
          entries={messagesLog.data}
          pagination={{ page: messagesLog.page, pageSize: messagesLog.pageSize, total: messagesLog.total }}
        />
      )}

      {activeTab !== "add" && activeTab !== "broadcast" && activeTab !== "messages" && (
        <div className="space-y-4">
          <div className="print:hidden flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-600" />
              الموظفين المسجلين ({filteredList.length} من {staffList.length})
            </h2>
            <div className="flex items-center gap-2">
              <ExportCsvButton staff={filteredList} />
              <PrintButton />
            </div>
          </div>

          <StaffFilters q={q} role={roleFilter} status={statusFilter} />

          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              {staffList.length === 0 ? "لا يوجد موظفين مسجلين حالياً." : "لا يوجد موظفين مطابقين لعوامل التصفية."}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-right min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                    <th className="px-4 py-3 font-bold">الاسم</th>
                    <th className="px-4 py-3 font-bold">الدور</th>
                    <th className="px-4 py-3 font-bold">الحالة</th>
                    <th className="px-4 py-3 font-bold">الهاتف</th>
                    <th className="px-4 py-3 font-bold">تيليجرام</th>
                    <th className="px-4 py-3 font-bold">بيانات الدخول</th>
                    <th className="px-4 py-3 font-bold print:hidden">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((staff) => (
                    <StaffRow key={staff.id} staff={staff} allStaff={staffList} viewerRole={session?.role} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
