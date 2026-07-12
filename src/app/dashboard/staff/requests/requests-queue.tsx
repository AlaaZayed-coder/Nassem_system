"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Staff } from "@/lib/staff-data";
import { EmployeeRequest, REQUEST_TYPE_LABEL } from "@/lib/employee-requests-data";
import { approveEmployeeRequestAction, rejectEmployeeRequestAction, cancelEmployeeRequestAction } from "./actions";
import { CheckCircle2, XCircle, Ban, UserCircle2 } from "lucide-react";

function DetailLine({ request }: { request: EmployeeRequest }) {
  const d = request.details || {};
  if (request.request_type === "loan") return <span>المبلغ: {d.amount} ₪ {d.repayment_method ? `— ${d.repayment_method}` : ""}</span>;
  if (request.request_type === "vacation") return <span>من {d.start_date} إلى {d.end_date} {d.reason ? `— ${d.reason}` : ""}</span>;
  if (request.request_type === "permission") return <span>{d.date} — من {d.from_time || "—"} إلى {d.to_time || "—"} {d.reason ? `— ${d.reason}` : ""}</span>;
  if (request.request_type === "complaint") return <span>{d.subject ? `${d.subject}: ` : ""}{d.description}</span>;
  if (request.request_type === "attendance_fix") return <span>تاريخ: {d.date} {d.reason ? `— ${d.reason}` : ""}</span>;
  return null;
}

function RequestRow({ request, managerId, onDone }: { request: EmployeeRequest; managerId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    if (!managerId) { setError("اختر اسمك أولاً (من يوافق) من الأعلى"); return; }
    setError(null);
    startTransition(async () => {
      const result = await approveEmployeeRequestAction(request.id, managerId);
      if (result.error) setError(result.error);
      else onDone();
    });
  };

  const handleReject = () => {
    if (!managerId) { setError("اختر اسمك أولاً (من يوافق) من الأعلى"); return; }
    setError(null);
    startTransition(async () => {
      const result = await rejectEmployeeRequestAction(request.id, managerId, reason);
      if (result.error) setError(result.error);
      else onDone();
    });
  };

  return (
    <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{REQUEST_TYPE_LABEL[request.request_type]}</span>
          <span className="font-bold text-slate-800 text-sm flex items-center gap-1"><UserCircle2 className="h-3.5 w-3.5 text-slate-400" /> {request.erp_staff?.name || "غير معروف"}</span>
        </div>
        <span className="text-xs text-slate-400">{new Date(request.created_at).toLocaleDateString("en-GB")}</span>
      </div>
      <p className="text-sm text-slate-700"><DetailLine request={request} /></p>

      {!showReject ? (
        <div className="flex gap-2 pt-1">
          <button disabled={isPending} onClick={handleApprove} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50">
            <CheckCircle2 className="h-3.5 w-3.5" /> موافقة
          </button>
          <button disabled={isPending} onClick={() => setShowReject(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50">
            <XCircle className="h-3.5 w-3.5" /> رفض
          </button>
        </div>
      ) : (
        <div className="flex gap-2 pt-1">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الرفض..." className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 outline-none text-xs" />
          <button disabled={isPending} onClick={handleReject} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition disabled:opacity-50">
            تأكيد الرفض
          </button>
          <button type="button" onClick={() => setShowReject(false)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">إلغاء</button>
        </div>
      )}
      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
    </div>
  );
}

function ResolvedRow({ request }: { request: EmployeeRequest }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const color = request.status === "موافق عليه" ? "bg-emerald-100 text-emerald-700" : request.status === "مرفوض" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600";

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelEmployeeRequestAction(request.id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{REQUEST_TYPE_LABEL[request.request_type]}</span>
          <span className="font-bold text-slate-700">{request.erp_staff?.name || "غير معروف"}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{request.status}</span>
        </div>
        {request.status === "موافق عليه" && (
          <button disabled={isPending} onClick={handleCancel} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-600 transition disabled:opacity-50">
            <Ban className="h-3.5 w-3.5" /> إلغاء وعكس الأثر
          </button>
        )}
      </div>
      <p className="text-slate-600 mt-1"><DetailLine request={request} /></p>
      {request.action_notes && <p className="text-xs text-slate-400 mt-1">ملاحظة: {request.action_notes}</p>}
      {error && <p className="text-xs font-bold text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

export function RequestsQueue({ staff, pending, resolved }: { staff: Staff[]; pending: EmployeeRequest[]; resolved: EmployeeRequest[] }) {
  const router = useRouter();
  const [managerId, setManagerId] = useState("");
  const managers = staff.filter((s) => s.role === "manager");

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <label className="block text-xs font-bold text-slate-600 mb-1.5">من يوافق (اسمك)</label>
        <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm bg-white">
          <option value="">-- اختر اسمك --</option>
          {managers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">بانتظار الاعتماد ({pending.length})</h2>
        <div className="space-y-3">
          {pending.map((r) => (
            <RequestRow key={r.id} request={r} managerId={managerId} onDone={() => router.refresh()} />
          ))}
          {pending.length === 0 && <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا توجد طلبات بانتظار الاعتماد</div>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">آخر الطلبات المعالَجة</h2>
        <div className="space-y-2">
          {resolved.map((r) => (
            <ResolvedRow key={r.id} request={r} />
          ))}
          {resolved.length === 0 && <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا توجد طلبات مُعالَجة بعد</div>}
        </div>
      </div>
    </div>
  );
}
