import Link from "next/link";
import { getStaffList } from "@/lib/staff-data";
import { getEmployeeRequests } from "@/lib/employee-requests-data";
import { NewRequestForm } from "./new-request-form";
import { RequestsQueue } from "./requests-queue";
import { ArrowRight, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeeRequestsPage() {
  const [staff, pending, resolved] = await Promise.all([
    getStaffList(),
    getEmployeeRequests("قيد الانتظار"),
    getEmployeeRequests(),
  ]);

  const resolvedOnly = resolved.filter((r) => r.status !== "قيد الانتظار").slice(0, 15);

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-indigo-600" />
            طلبات الموظفين
          </h1>
          <p className="text-slate-500 mt-2">سلف، إجازات، مغادرات، شكاوى، وإثبات دوام — تقديم واعتماد في مكان واحد.</p>
        </div>
        <Link href="/dashboard/staff" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> إدارة الموظفين
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">تقديم طلب جديد</h2>
            <NewRequestForm staff={staff} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <RequestsQueue staff={staff} pending={pending} resolved={resolvedOnly} />
        </div>
      </div>
    </div>
  );
}
