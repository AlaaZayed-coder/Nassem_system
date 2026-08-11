"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { EmployeeRequest, REQUEST_TYPE_LABEL, REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY } from "@/lib/employee-requests-data";
import { approveEmployeeRequestAction, rejectEmployeeRequestAction, cancelEmployeeRequestAction, acknowledgeEmployeeRequestAction, deleteEmployeeRequestAction } from "./actions";
import { CheckCircle2, XCircle, Ban, UserCircle2, Trash2, Filter, ChevronRight, ChevronLeft, X } from "lucide-react";
import { ExportRequestsCsvButton } from "./export-csv-button";
import { PrintButton } from "@/components/PrintButton";

const RESOLVED_STATUSES = ["موافق عليه", "مرفوض", "ملغى", "تم الاستلام", "مُصعَّد"];

const REQUEST_TYPE_COLOR: Record<string, string> = {
  loan: "bg-amber-100 text-amber-700",
  vacation: "bg-emerald-100 text-emerald-700",
  permission: "bg-sky-100 text-sky-700",
  complaint: "bg-rose-100 text-rose-700",
  attendance_fix: "bg-indigo-100 text-indigo-700",
  injury_report: "bg-red-100 text-red-700",
  work_report: "bg-violet-100 text-violet-700",
};

const REQUEST_TYPE_ICON: Record<string, string> = {
  loan: "💰",
  vacation: "🌴",
  permission: "🚪",
  complaint: "😠",
  attendance_fix: "🕐",
  injury_report: "🚨",
  work_report: "📝",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${REQUEST_TYPE_COLOR[type] || "bg-slate-200 text-slate-600"}`}>
      {REQUEST_TYPE_ICON[type] || ""} {REQUEST_TYPE_LABEL[type as keyof typeof REQUEST_TYPE_LABEL] || type}
    </span>
  );
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== 1) usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

function ResolvedFilters({ filters }: { filters: { type: string; status: string; employeeName: string } }) {
  const pathname = usePathname();
  const hasFilters = !!(filters.type || filters.status || filters.employeeName);

  return (
    <form action={pathname} method="get" className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-nowrap items-center gap-2 mb-3 overflow-x-auto">
      <input type="hidden" name="tab" value="resolved" />
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 shrink-0">
        <Filter className="h-3.5 w-3.5" /> تصفية:
      </span>
      <select name="type" defaultValue={filters.type} className="shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none text-xs bg-white">
        <option value="">كل الأنواع</option>
        {Object.entries(REQUEST_TYPE_LABEL).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select name="status" defaultValue={filters.status} className="shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none text-xs bg-white">
        <option value="">كل الحالات</option>
        {RESOLVED_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input
        name="employee"
        type="text"
        defaultValue={filters.employeeName}
        placeholder="اسم الموظف..."
        className="px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none text-xs flex-1 min-w-[120px]"
      />
      <button type="submit" className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition whitespace-nowrap">تطبيق</button>
      {hasFilters && (
        <Link href={`${pathname}?tab=resolved`} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-rose-600 transition whitespace-nowrap">
          <X className="h-3 w-3" /> مسح
        </Link>
      )}
    </form>
  );
}

function ResolvedPagination({ page, pageSize, total, filters }: { page: number; pageSize: number; total: number; filters: { type: string; status: string; employeeName: string } }) {
  const pathname = usePathname();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const linkFor = (p: number) => `${pathname}${buildQuery({ tab: "resolved", type: filters.type, status: filters.status, employee: filters.employeeName, page: p })}`;

  return (
    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
      <span>صفحة {page} من {totalPages} — {total} طلب</span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={linkFor(page - 1)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition font-bold">
            <ChevronRight className="h-3.5 w-3.5" /> السابق
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-100 text-slate-300 font-bold"><ChevronRight className="h-3.5 w-3.5" /> السابق</span>
        )}
        {page < totalPages ? (
          <Link href={linkFor(page + 1)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition font-bold">
            التالي <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-100 text-slate-300 font-bold">التالي <ChevronLeft className="h-3.5 w-3.5" /></span>
        )}
      </div>
    </div>
  );
}

function DeleteRequestButton({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteEmployeeRequestAction(requestId);
      if (!result.error) onDone();
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-[10px] text-rose-600 font-bold">متأكد؟</span>
        <button disabled={isPending} onClick={handleDelete} className="text-rose-600 hover:text-rose-800 text-[11px] font-bold px-1">نعم</button>
        <button type="button" onClick={() => setConfirming(false)} className="text-slate-400 hover:text-slate-600 text-[11px] px-1">إلغاء</button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} title="حذف الطلب نهائياً" className="text-slate-300 hover:text-rose-600 transition p-1 shrink-0">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function DetailLine({ request }: { request: EmployeeRequest }) {
  const d = request.details || {};
  if (request.request_type === "loan") return <span>المبلغ: {d.amount} ₪ {d.repayment_method ? `— ${d.repayment_method}` : ""}</span>;
  if (request.request_type === "vacation") return <span>من {d.start_date} إلى {d.end_date} {d.reason ? `— ${d.reason}` : ""}</span>;
  if (request.request_type === "permission") return <span>{d.date} — من {d.from_time || "—"} إلى {d.to_time || "—"} {d.reason ? `— ${d.reason}` : ""}</span>;
  if (request.request_type === "complaint") return <span>{d.subject ? `${d.subject}: ` : ""}{d.description}</span>;
  if (request.request_type === "attendance_fix")
    return (
      <span>
        {d.period ? `إثبات دوام ${d.period} — ` : ""}تاريخ: {d.date}
        {d.time ? ` — الوقت: ${d.time}` : ""} {d.reason ? `— ${d.reason}` : ""}
      </span>
    );
  if (request.request_type === "injury_report") return <span>تاريخ الحادثة: {d.date} — {d.description}</span>;
  if (request.request_type === "work_report")
    return (
      <span className="flex flex-col gap-1.5">
        {d.content && <span>{d.content}</span>}
        {d.voice_url && <audio controls src={d.voice_url} className="h-8 max-w-full" />}
      </span>
    );
  return null;
}

const STATUS_COLOR: Record<string, string> = {
  "قيد الانتظار": "bg-amber-100 text-amber-700",
  "موافق عليه": "bg-emerald-100 text-emerald-700",
  "مرفوض": "bg-rose-100 text-rose-700",
  "ملغى": "bg-slate-200 text-slate-600",
  "مُصعَّد": "bg-indigo-100 text-indigo-700",
  "تم الاستلام": "bg-sky-100 text-sky-700",
};

function PendingRow({ request, managerId, onDone }: { request: EmployeeRequest; managerId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ackOnly = REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY[request.request_type];

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveEmployeeRequestAction(request.id, managerId);
      if (result.error) setError(result.error);
      else onDone();
    });
  };

  const handleAcknowledge = () => {
    setError(null);
    startTransition(async () => {
      const result = await acknowledgeEmployeeRequestAction(request.id, managerId);
      if (result.error) setError(result.error);
      else onDone();
    });
  };

  const handleReject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectEmployeeRequestAction(request.id, managerId, reason);
      if (result.error) setError(result.error);
      else onDone();
    });
  };

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition align-top">
      <td className="px-4 py-3 whitespace-nowrap">
        <TypeBadge type={request.request_type} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><UserCircle2 className="h-4 w-4 text-slate-400" /> {request.erp_staff?.name || "غير معروف"}</span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 max-w-sm">
        <DetailLine request={request} />
        {error && <p className="text-xs font-bold text-rose-600 mt-1">{error}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(request.created_at).toLocaleDateString("en-GB")}</td>
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {ackOnly ? (
              <button disabled={isPending} onClick={handleAcknowledge} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition disabled:opacity-50 whitespace-nowrap">
                <CheckCircle2 className="h-3.5 w-3.5" /> تم الاستلام
              </button>
            ) : !showReject ? (
              <div className="flex gap-2">
                <button disabled={isPending} onClick={handleApprove} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50 whitespace-nowrap">
                  <CheckCircle2 className="h-3.5 w-3.5" /> موافقة
                </button>
                <button disabled={isPending} onClick={() => setShowReject(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50 whitespace-nowrap">
                  <XCircle className="h-3.5 w-3.5" /> رفض
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 min-w-[180px]">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الرفض..." className="px-3 py-1.5 rounded-lg border border-slate-300 outline-none text-xs" />
                <div className="flex gap-2">
                  <button disabled={isPending} onClick={handleReject} className="flex-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition disabled:opacity-50">
                    تأكيد الرفض
                  </button>
                  <button type="button" onClick={() => setShowReject(false)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">إلغاء</button>
                </div>
              </div>
            )}
          </div>
          <DeleteRequestButton requestId={request.id} onDone={onDone} />
        </div>
      </td>
    </tr>
  );
}

function ResolvedRow({ request }: { request: EmployeeRequest }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelEmployeeRequestAction(request.id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition align-top">
      <td className="px-4 py-3 whitespace-nowrap">
        <TypeBadge type={request.request_type} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-700 text-sm">{request.erp_staff?.name || "غير معروف"}</td>
      <td className="px-4 py-3 text-sm text-slate-600 max-w-sm">
        <DetailLine request={request} />
        {request.action_notes && <p className="text-xs text-slate-400 mt-1">ملاحظة: {request.action_notes}</p>}
        {error && <p className="text-xs font-bold text-rose-600 mt-1">{error}</p>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[request.status] || "bg-slate-200 text-slate-600"}`}>{request.status}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {request.status === "موافق عليه" && (
            <button disabled={isPending} onClick={handleCancel} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-600 transition disabled:opacity-50 whitespace-nowrap">
              <Ban className="h-3.5 w-3.5" /> إلغاء وعكس الأثر
            </button>
          )}
          <DeleteRequestButton requestId={request.id} onDone={() => router.refresh()} />
        </div>
      </td>
    </tr>
  );
}

export function PendingQueueTable({ managerId, pending }: { managerId: string; pending: EmployeeRequest[] }) {
  const router = useRouter();

  return (
    <div>
      <div className="print:hidden flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-800">بانتظار الاعتماد ({pending.length})</h2>
        <div className="flex items-center gap-2">
          <ExportRequestsCsvButton requests={pending} filenamePrefix="pending-requests" />
          <PrintButton />
        </div>
      </div>
      <h2 className="hidden print:block text-lg font-bold text-slate-800 mb-3">بانتظار الاعتماد ({pending.length})</h2>

      {pending.length === 0 ? (
        <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا توجد طلبات بانتظار الاعتماد</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-right min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                <th className="px-4 py-3 font-bold">النوع</th>
                <th className="px-4 py-3 font-bold">الموظف</th>
                <th className="px-4 py-3 font-bold">التفاصيل</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
                <th className="px-4 py-3 font-bold print:hidden">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <PendingRow key={r.id} request={r} managerId={managerId} onDone={() => router.refresh()} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ResolvedQueueTable({
  resolved,
  resolvedPagination,
  filters,
}: {
  resolved: EmployeeRequest[];
  resolvedPagination?: { page: number; pageSize: number; total: number };
  filters?: { type: string; status: string; employeeName: string };
}) {
  const activeFilters = filters || { type: "", status: "", employeeName: "" };
  const hasActiveFilters = !!(activeFilters.type || activeFilters.status || activeFilters.employeeName);

  return (
    <div>
      <div className="print:hidden flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-800">آخر الطلبات المعالَجة</h2>
        <div className="flex items-center gap-2">
          <ExportRequestsCsvButton requests={resolved} filenamePrefix="resolved-requests" />
          <PrintButton />
        </div>
      </div>
      <h2 className="hidden print:block text-lg font-bold text-slate-800 mb-3">آخر الطلبات المعالَجة</h2>

      {resolvedPagination && <ResolvedFilters filters={activeFilters} />}
      {resolved.length === 0 ? (
        <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          {hasActiveFilters ? "لا توجد نتائج مطابقة لهذه التصفية" : "لا توجد طلبات مُعالَجة بعد"}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-right min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                <th className="px-4 py-3 font-bold">النوع</th>
                <th className="px-4 py-3 font-bold">الموظف</th>
                <th className="px-4 py-3 font-bold">التفاصيل</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold print:hidden">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((r) => (
                <ResolvedRow key={r.id} request={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {resolvedPagination && (
        <ResolvedPagination
          page={resolvedPagination.page}
          pageSize={resolvedPagination.pageSize}
          total={resolvedPagination.total}
          filters={activeFilters}
        />
      )}
    </div>
  );
}

export function RequestsQueue({
  managerId,
  pending,
  resolved,
  resolvedPagination,
  filters,
}: {
  managerId: string;
  pending: EmployeeRequest[];
  resolved: EmployeeRequest[];
  resolvedPagination?: { page: number; pageSize: number; total: number };
  filters?: { type: string; status: string; employeeName: string };
}) {
  return (
    <div className="space-y-8">
      <PendingQueueTable managerId={managerId} pending={pending} />
      <ResolvedQueueTable resolved={resolved} resolvedPagination={resolvedPagination} filters={filters} />
    </div>
  );
}
