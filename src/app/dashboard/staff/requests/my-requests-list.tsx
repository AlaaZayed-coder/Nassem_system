import { EmployeeRequest, REQUEST_TYPE_LABEL } from "@/lib/employee-requests-data";

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
  return null;
}

const STATUS_COLOR: Record<string, string> = {
  "قيد الانتظار": "bg-amber-100 text-amber-700",
  "موافق عليه": "bg-emerald-100 text-emerald-700",
  "مرفوض": "bg-rose-100 text-rose-700",
  "ملغى": "bg-slate-200 text-slate-600",
  "مُصعَّد": "bg-indigo-100 text-indigo-700",
};

export function MyRequestsList({ requests }: { requests: EmployeeRequest[] }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-3">طلباتي ({requests.length})</h2>
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{REQUEST_TYPE_LABEL[r.request_type]}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] || "bg-slate-200 text-slate-600"}`}>{r.status}</span>
              </div>
              <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString("en-GB")}</span>
            </div>
            <p className="text-slate-600 mt-1"><DetailLine request={r} /></p>
            {r.action_notes && <p className="text-xs text-slate-400 mt-1">ملاحظة: {r.action_notes}</p>}
          </div>
        ))}
        {requests.length === 0 && (
          <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">لم تقدّم أي طلبات بعد</div>
        )}
      </div>
    </div>
  );
}
