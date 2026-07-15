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

export function MyRequestsList({ requests }: { requests: EmployeeRequest[] }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-3">طلباتي ({requests.length})</h2>
      {requests.length === 0 ? (
        <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">لم تقدّم أي طلبات بعد</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-right min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                <th className="px-4 py-3 font-bold">النوع</th>
                <th className="px-4 py-3 font-bold">التفاصيل</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{REQUEST_TYPE_LABEL[r.request_type]}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-sm">
                    <DetailLine request={r} />
                    {r.action_notes && <p className="text-xs text-slate-400 mt-1">ملاحظة: {r.action_notes}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] || "bg-slate-200 text-slate-600"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
