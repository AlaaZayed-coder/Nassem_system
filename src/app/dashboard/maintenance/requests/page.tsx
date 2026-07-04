import Link from "next/link";
import { getMaintenanceRequests } from "@/lib/maintenance-data";
import { ResolveRequestForm } from "@/components/maintenance/resolve-request-form";
import { Wrench, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MaintenanceRequestsPage() {
  const [pending, resolved] = await Promise.all([
    getMaintenanceRequests("قيد الانتظار"),
    getMaintenanceRequests("مكتمل"),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8" dir="rtl">
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3">بانتظار المعالجة ({pending.length})</h2>
        <div className="space-y-3">
          {pending.map((req: any) => (
            <div key={req.id} className="p-4 rounded-2xl border border-orange-100 bg-orange-50">
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
            <div key={req.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm">
              <div>
                <div className="font-bold text-slate-700">{req.erp_customers?.name || "عميل غير محدد"}</div>
                <div className="text-slate-500">{req.description}</div>
              </div>
              <div className="text-xs text-slate-500 text-left">
                <div>{req.technician_name || "—"}</div>
                <div>{req.resolved_at ? new Date(req.resolved_at).toLocaleDateString("ar-SA") : ""}</div>
              </div>
            </div>
          ))}
          {resolved.length === 0 && <div className="text-center text-slate-400 py-4">لا توجد تذاكر مغلقة بعد</div>}
        </div>
      </div>
    </div>
  );
}
