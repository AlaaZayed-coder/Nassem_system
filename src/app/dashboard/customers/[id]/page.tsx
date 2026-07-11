import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/customers-data";
import { formatCurrency } from "@/lib/format";
import { ArrowRight, Building2, UserCircle2, Phone, MapPin, Package, DoorClosed } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { customer, salesOrders, doorOrders } = await getCustomerDetail(params.id);
  if (!customer) notFound();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            {customer.company_name ? (
              <Building2 className="h-8 w-8 text-indigo-600" />
            ) : (
              <UserCircle2 className="h-8 w-8 text-emerald-600" />
            )}
            {customer.name}
          </h1>
          {customer.company_name && <p className="text-slate-500 mt-2">{customer.company_name}</p>}
        </div>
        <Link href="/dashboard/customers" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للعملاء
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-slate-500 text-xs block mb-1 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> الهاتف</span>
            <span className="font-bold text-slate-800" dir="ltr">{customer.phone || "—"}</span>
          </div>
          <div className="md:col-span-2">
            <span className="text-slate-500 text-xs block mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> العنوان</span>
            <span className="font-bold text-slate-800">{customer.address || "—"}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-500" /> طلبات المبيعات ({salesOrders.length})
        </h2>
        <div className="space-y-2">
          {salesOrders.map((o: any) => (
            <Link key={o.id} href={`/dashboard/sales/${o.id}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition text-sm">
              <span className="font-bold text-slate-700">{o.status}</span>
              <span className="font-mono font-bold text-indigo-700" dir="ltr">{formatCurrency(o.total_amount_cents || 0)}</span>
              <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString("en-GB")}</span>
            </Link>
          ))}
          {salesOrders.length === 0 && <div className="text-center text-slate-400 py-4 text-sm">لا توجد طلبات مبيعات</div>}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
          <DoorClosed className="h-5 w-5 text-emerald-500" /> طلبيات الأبواب ({doorOrders.length})
        </h2>
        <div className="space-y-2">
          {doorOrders.map((o: any) => (
            <Link key={o.id} href={`/dashboard/production/door-orders/${o.id}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition text-sm">
              <span className="font-bold text-slate-700">{o.status}</span>
              <span className="text-xs text-slate-500">{o.item_count} صنف</span>
              <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString("en-GB")}</span>
            </Link>
          ))}
          {doorOrders.length === 0 && <div className="text-center text-slate-400 py-4 text-sm">لا توجد طلبيات أبواب</div>}
        </div>
      </div>
    </div>
  );
}
