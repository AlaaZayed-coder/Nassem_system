import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getEmployeeRequests, getResolvedEmployeeRequests, getEmployeeRequestsForStaff, getEmployeeRequestsForSupervisor } from "@/lib/employee-requests-data";
import { NewRequestForm } from "./new-request-form";
import { RequestsQueue } from "./requests-queue";
import { MyRequestsList } from "./my-requests-list";
import { ArrowRight, ClipboardList, Users2 } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function EmployeeRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (!session) return null;

  const canManageAll = session.role === "manager" || session.role === "hr";

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
        {canManageAll && (
          <Link href="/dashboard/staff" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
            <ArrowRight className="h-4 w-4" /> إدارة الموظفين
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">تقديم طلب جديد</h2>
            <NewRequestForm staffId={session.staffId} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {canManageAll ? (
            <RequestsQueueSection managerId={session.staffId} searchParams={searchParams} />
          ) : (
            <>
              <TeamRequestsSection supervisorId={session.staffId} />
              <MyRequestsSection staffId={session.staffId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) || "";
}

async function RequestsQueueSection({ managerId, searchParams }: { managerId: string; searchParams: SearchParams }) {
  const page = Number(firstParam(searchParams.page)) || 1;
  const type = firstParam(searchParams.type);
  const status = firstParam(searchParams.status);
  const employeeName = firstParam(searchParams.employee);

  const [pending, resolvedResult] = await Promise.all([
    getEmployeeRequests("قيد الانتظار"),
    getResolvedEmployeeRequests({ page, type: type || undefined, status: status || undefined, employeeName: employeeName || undefined }),
  ]);

  return (
    <RequestsQueue
      managerId={managerId}
      pending={pending}
      resolved={resolvedResult.data}
      resolvedPagination={{ page: resolvedResult.page, pageSize: resolvedResult.pageSize, total: resolvedResult.total }}
      filters={{ type, status, employeeName }}
    />
  );
}

async function TeamRequestsSection({ supervisorId }: { supervisorId: string }) {
  const { pending, resolved } = await getEmployeeRequestsForSupervisor(supervisorId);
  if (pending.length === 0 && resolved.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Users2 className="h-5 w-5 text-indigo-600" /> طلبات فريقي
      </h2>
      <RequestsQueue managerId={supervisorId} pending={pending} resolved={resolved} />
    </div>
  );
}

async function MyRequestsSection({ staffId }: { staffId: string }) {
  const requests = await getEmployeeRequestsForStaff(staffId);
  return <MyRequestsList requests={requests} />;
}
