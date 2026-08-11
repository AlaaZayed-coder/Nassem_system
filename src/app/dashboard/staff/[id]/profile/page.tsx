import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getStaffById, getDirectReports, type Staff } from "@/lib/staff-data";
import { getEmployeeRequestsForStaff, formatRequestLine } from "@/lib/employee-requests-data";
import { ROLE_LABELS } from "@/lib/role-labels";
import { GRANTABLE_PATHS } from "@/lib/access-control";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function StaffProfilePage({ params }: { params: { id: string } }) {
  const staff = await getStaffById(params.id);
  if (!staff) notFound();

  const [supervisor, directReports, requests] = await Promise.all([
    staff.supervisor_id ? getStaffById(staff.supervisor_id) : Promise.resolve<Staff | null>(null),
    getDirectReports(staff.id),
    getEmployeeRequestsForStaff(staff.id),
  ]);

  const recentRequests = requests.slice(0, 10);
  const grantedLabels = GRANTABLE_PATHS.filter((g) => staff.extra_access?.includes(g.path)).map((g) => g.label);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-0 flex flex-col gap-6" dir="rtl">
      <div className="print:hidden flex items-center justify-between">
        <Link href="/dashboard/staff" className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 transition">
          <ArrowRight className="h-4 w-4" /> رجوع لإدارة الموظفين
        </Link>
        <PrintButton />
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 print:shadow-none print:border-none flex flex-col gap-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">{staff.name}</h1>
            <p className="text-slate-500 mt-1">{ROLE_LABELS[staff.role] || staff.role}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${staff.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
            {staff.is_active ? "نشط" : "معطّل"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 font-bold mb-1">الهاتف</p>
            <p className="text-slate-700" dir="ltr">{staff.phone || "—"}</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold mb-1">معرّف تليجرام</p>
            <p className="text-slate-700 font-mono" dir="ltr">{staff.telegram_chat_id || "—"}</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold mb-1">المسؤول المباشر</p>
            <p className="text-slate-700">{supervisor?.name || "—"}</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold mb-1">رصيد الإجازات</p>
            <p className="text-slate-700">{staff.vacation_balance_days} يوم</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold mb-1">تاريخ الانضمام</p>
            <p className="text-slate-700">{new Date(staff.created_at).toLocaleDateString("en-GB")}</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold mb-1">بيانات الدخول للويب</p>
            <p className="text-slate-700">{staff.username ? "مفعّلة" : "غير مفعّلة"}</p>
          </div>
        </div>

        {directReports.length > 0 && (
          <div>
            <p className="text-slate-400 font-bold mb-2 text-sm">الفريق التابع له ({directReports.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {directReports.map((r) => (
                <span key={r.id} className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{r.name}</span>
              ))}
            </div>
          </div>
        )}

        {grantedLabels.length > 0 && (
          <div>
            <p className="text-slate-400 font-bold mb-2 text-sm">صلاحيات إضافية خارج دوره</p>
            <div className="flex flex-wrap gap-1.5">
              {grantedLabels.map((label) => (
                <span key={label} className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">{label}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-slate-400 font-bold mb-2 text-sm">آخر الطلبات ({recentRequests.length})</p>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-slate-400 italic">لا توجد طلبات مسجّلة.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentRequests.map((r) => (
                <div key={r.id} className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 whitespace-pre-line">
                  {formatRequestLine(r)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
