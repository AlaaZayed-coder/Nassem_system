"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmployeeRequest, REQUEST_TYPE_LABEL, REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY } from "@/lib/employee-requests-data";
import { approveEmployeeRequestAction, rejectEmployeeRequestAction, cancelEmployeeRequestAction, acknowledgeEmployeeRequestAction } from "./actions";
import { CheckCircle2, XCircle, Ban, UserCircle2 } from "lucide-react";

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
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{REQUEST_TYPE_LABEL[request.request_type]}</span>
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
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{REQUEST_TYPE_LABEL[request.request_type]}</span>
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
        {request.status === "موافق عليه" && (
          <button disabled={isPending} onClick={handleCancel} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-600 transition disabled:opacity-50 whitespace-nowrap">
            <Ban className="h-3.5 w-3.5" /> إلغاء وعكس الأثر
          </button>
        )}
      </td>
    </tr>
  );
}

export function RequestsQueue({ managerId, pending, resolved }: { managerId: string; pending: EmployeeRequest[]; resolved: EmployeeRequest[] }) {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">بانتظار الاعتماد ({pending.length})</h2>
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
                  <th className="px-4 py-3 font-bold">إجراءات</th>
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

      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">آخر الطلبات المعالَجة</h2>
        {resolved.length === 0 ? (
          <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا توجد طلبات مُعالَجة بعد</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-right min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                  <th className="px-4 py-3 font-bold">النوع</th>
                  <th className="px-4 py-3 font-bold">الموظف</th>
                  <th className="px-4 py-3 font-bold">التفاصيل</th>
                  <th className="px-4 py-3 font-bold">الحالة</th>
                  <th className="px-4 py-3 font-bold">إجراءات</th>
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
      </div>
    </div>
  );
}
