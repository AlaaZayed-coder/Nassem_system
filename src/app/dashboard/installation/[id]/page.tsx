import Link from "next/link";
import { notFound } from "next/navigation";
import { getDoorOrderDetail } from "@/lib/door-orders-data";
import { getStaffList } from "@/lib/staff-data";
import { Truck, ArrowRight, User, Calendar, CheckCircle2, Clock, Phone } from "lucide-react";
import { DispatchForm } from "./dispatch-form";
import { InstallationReportForm } from "./installation-report-form";

export const dynamic = "force-dynamic";

export default async function InstallationDetailPage({ params }: { params: { id: string } }) {
  const [{ order, items }, staff] = await Promise.all([
    getDoorOrderDetail(params.id),
    getStaffList(),
  ]);

  if (!order) notFound();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Truck className="h-8 w-8 text-indigo-600" />
            تركيب طلبية #{order.id.slice(0, 8)}
          </h1>
          <p className="text-slate-500 mt-2">{order.erp_customers?.name} {order.customer_name_note ? `(${order.customer_name_note})` : ""}</p>
        </div>
        <Link href="/dashboard/installation" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة لقائمة التركيب
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-slate-500 text-xs block mb-1">العميل</span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" /> {order.erp_customers?.name}</span>
            {order.erp_customers?.phone && <span className="text-xs text-slate-500 block mt-1" dir="ltr">{order.erp_customers.phone}</span>}
          </div>
          <div>
            <span className="text-slate-500 text-xs block mb-1">عدد الأصناف</span>
            <span className="font-bold text-slate-800">{items.length}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs block mb-1">تاريخ الإنشاء</span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> {new Date(order.created_at).toLocaleDateString("en-GB")}</span>
          </div>
        </div>
      </div>

      {!order.installation_status && (
        <DispatchForm doorOrderId={order.id} staff={staff} />
      )}

      {order.installation_status === "قيد التركيب" && (
        <div className="space-y-6">
          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-sm text-sky-800">
            <strong>فريق التركيب:</strong> {order.installation_team_name} — تم الإخراج في {order.dispatched_at ? new Date(order.dispatched_at).toLocaleString("en-GB") : "—"}
          </div>
          <InstallationReportForm doorOrderId={order.id} />
        </div>
      )}

      {order.installation_status === "بانتظار تأكيد العميل" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-lg">
            <Clock className="h-5 w-5" /> بانتظار تأكيد استلام العميل
          </div>
          <p className="text-sm text-amber-800">تم إرسال طلب تأكيد عبر تيليجرام لمن قام بالإخراج. سيتم تحديث الحالة تلقائياً فور الضغط على زر التأكيد.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-3 rounded-xl border border-amber-100">
              <span className="text-slate-500 text-xs block mb-1">المستلم</span>
              <span className="font-bold text-slate-800 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {order.recipient_name}</span>
              {order.recipient_phone && <span className="text-xs text-slate-500 flex items-center gap-1 mt-1" dir="ltr"><Phone className="h-3 w-3" /> {order.recipient_phone}</span>}
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-100">
              <span className="text-slate-500 text-xs block mb-1">أوقات التركيب</span>
              <span className="text-xs text-slate-700 block">وصول: {order.field_start_time ? new Date(order.field_start_time).toLocaleString("en-GB") : "—"}</span>
              <span className="text-xs text-slate-700 block">مغادرة: {order.field_end_time ? new Date(order.field_end_time).toLocaleString("en-GB") : "—"}</span>
            </div>
          </div>

          {(order.before_photo_url || order.after_photo_url) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {order.before_photo_url && (
                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-1">قبل التركيب</span>
                  <img src={order.before_photo_url} alt="قبل التركيب" className="rounded-xl border border-slate-200 max-h-64 w-full object-contain" />
                </div>
              )}
              {order.after_photo_url && (
                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-1">بعد التركيب</span>
                  <img src={order.after_photo_url} alt="بعد التركيب" className="rounded-xl border border-slate-200 max-h-64 w-full object-contain" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {order.installation_status === "مكتملة" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-lg">
            <CheckCircle2 className="h-5 w-5" /> التركيب مكتمل ومؤكَّد من العميل
          </div>
          <p className="text-sm text-emerald-800">
            تم التأكيد في {order.customer_confirmed_at ? new Date(order.customer_confirmed_at).toLocaleString("en-GB") : "—"}، المستلم: <strong>{order.recipient_name}</strong>
          </p>

          {(order.before_photo_url || order.after_photo_url) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {order.before_photo_url && (
                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-1">قبل التركيب</span>
                  <img src={order.before_photo_url} alt="قبل التركيب" className="rounded-xl border border-slate-200 max-h-64 w-full object-contain" />
                </div>
              )}
              {order.after_photo_url && (
                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-1">بعد التركيب</span>
                  <img src={order.after_photo_url} alt="بعد التركيب" className="rounded-xl border border-slate-200 max-h-64 w-full object-contain" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
