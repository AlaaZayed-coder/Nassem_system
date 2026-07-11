import Link from "next/link";
import { getMaintenanceRequests } from "@/lib/maintenance-data";
import { getCustomers } from "@/lib/sales-data";
import { ResolveRequestForm } from "@/components/maintenance/resolve-request-form";
import { NewFieldReportForm } from "@/components/maintenance/new-field-report-form";
import { HighlightScroll } from "@/components/HighlightScroll";
import { Wrench, ArrowRight, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MaintenanceRequestsPage() {
  const [pending, resolved, customers] = await Promise.all([
    getMaintenanceRequests("قيد الانتظار"),
    getMaintenanceRequests("مكتمل"),
    getCustomers(),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8" dir="rtl">
      <HighlightScroll />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Wrench className="h-8 w-8 text-orange-500" />
            تذاكر الصيانة الواردة من المبيعات
          </h1>
          <p className="text-slate-500 mt-2">تذاكر صيانة نشأت تلقائياً عند اعتماد طلبات مبيعات تحتوي أسطر صيانة.</p>
        </div>
        <Link href="/dashboard/maintenance" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للصيانة
        </Link>
      </div>

      <NewFieldReportForm customers={customers} />

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3">بانتظار المعالجة ({pending.length})</h2>
        <div className="space-y-3">
          {pending.map((req: any) => (
            <div key={req.id} id={`row-${req.id}`} className="p-4 rounded-2xl border border-orange-100 bg-orange-50 transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{req.erp_customers?.name || "عميل غير محدد"}</div>
                  <div className="text-sm text-slate-600 mt-1">{req.description}</div>
                </div>
                {req.erp_sales_orders?.id && (
                  <Link href={`/dashboard/sales/${req.erp_sales_orders.id}`} className="text-xs font-bold text-indigo-600 hover:underline shrink-0">
                    عرض طلب المبيعات
                  </Link>
                )}
              </div>
              <ResolveRequestForm requestId={req.id} />
            </div>
          ))}
          {pending.length === 0 && <div className="text-center text-slate-400 py-4">لا توجد تذاكر بانتظار المعالجة</div>}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3">مغلقة مؤخراً</h2>
        <div className="space-y-3">
          {resolved.slice(0, 10).map((req: any) => (
            <div key={req.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-700">{req.erp_customers?.name || "عميل غير محدد"}</div>
                  <div className="text-slate-500">{req.description}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 text-left">
                    <div>{req.technician_name || "—"}</div>
                    <div>{req.resolved_at ? new Date(req.resolved_at).toLocaleDateString("en-GB") : ""}</div>
                  </div>
                  <Link
                    href={`/dashboard/maintenance/requests/${req.id}/print`}
                    target="_blank"
                    className="text-slate-400 hover:text-indigo-600 transition shrink-0"
                    title="طباعة التقرير الميداني"
                  >
                    <Printer className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              {(req.field_report_number || req.field_start_time || req.installation_type) && (
                <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-3 text-xs text-indigo-700">
                  {req.field_report_number && <span>رقم التقرير: {req.field_report_number}</span>}
                  {req.installation_type && <span>التركيب: {req.installation_type}</span>}
                  {req.field_start_time && (
                    <span>
                      الفترة: {new Date(req.field_start_time).toLocaleString("en-GB")}
                      {req.field_end_time ? ` — ${new Date(req.field_end_time).toLocaleString("en-GB")}` : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {resolved.length === 0 && <div className="text-center text-slate-400 py-4">لا توجد تذاكر مغلقة بعد</div>}
        </div>
      </div>
    </div>
  );
}
