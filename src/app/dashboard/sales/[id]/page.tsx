import Link from "next/link";
import { getSalesOrderDetail } from "@/lib/sales-data";
import { formatCurrency } from "@/lib/format";
import { ArrowRight, Target, Wrench, Factory, ShoppingCart, Package, DoorClosed, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

const LINE_TYPE_LABEL: Record<string, string> = {
  product: "صنف جاهز",
  manufacturing: "تصنيع مخصص",
  maintenance: "صيانة",
  door: "طلب باب رول",
  slat: "ريش / جبهة",
};

const FULFILLMENT_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار الاعتماد", color: "bg-slate-100 text-slate-600" },
  ready: { label: "جاهز", color: "bg-slate-100 text-slate-600" },
  completed: { label: "تم من المخزون", color: "bg-emerald-100 text-emerald-700" },
  manufacturing: { label: "قيد التصنيع", color: "bg-indigo-100 text-indigo-700" },
  purchasing: { label: "قيد الشراء", color: "bg-amber-100 text-amber-700" },
  maintenance: { label: "لدى فريق الصيانة", color: "bg-orange-100 text-orange-700" },
  door: { label: "لدى فريق الإنتاج (باب)", color: "bg-emerald-100 text-emerald-700" },
};

export default async function SalesOrderDetailPage({ params }: { params: { id: string } }) {
  const { order, lines, productionOrders, maintenanceRequests, purchaseRequests, doorOrders } = await getSalesOrderDetail(params.id);

  if (!order) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-slate-800">الطلب غير موجود</h1>
        <Link href="/dashboard/sales" className="text-indigo-600 font-bold mt-4 inline-block hover:underline">العودة للمبيعات</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Target className="h-8 w-8 text-indigo-600" />
            طلب مبيعات #{order.id.slice(0, 8)}
          </h1>
          <p className="text-slate-500 mt-2">{order.erp_customers?.name} · الحالة: <span className="font-bold text-slate-700">{order.status}</span></p>
        </div>
        <Link href="/dashboard/sales" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للمبيعات
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3">أسطر الطلب وحالة التوجيه</h2>
        <div className="space-y-3">
          {lines.map(line => {
            const fulfillment = line.line_type === "slat" && line.fulfillment_status === "completed"
              ? { label: "منجزة (ريش/جبهة)", color: "bg-teal-100 text-teal-700" }
              : FULFILLMENT_LABEL[line.fulfillment_status] || { label: line.fulfillment_status, color: "bg-slate-100 text-slate-600" };
            return (
              <div key={line.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                  {line.line_type === "maintenance" && <Wrench className="h-5 w-5 text-orange-500" />}
                  {line.line_type === "manufacturing" && <Factory className="h-5 w-5 text-indigo-500" />}
                  {line.line_type === "product" && <Package className="h-5 w-5 text-emerald-500" />}
                  {line.line_type === "door" && <DoorClosed className="h-5 w-5 text-emerald-500" />}
                  {line.line_type === "slat" && <Layers className="h-5 w-5 text-teal-500" />}
                  <div>
                    <div className="font-bold text-slate-800">
                      {line.erp_items?.original_name || line.description || LINE_TYPE_LABEL[line.line_type]}
                    </div>
                    <div className="text-xs text-slate-500">{LINE_TYPE_LABEL[line.line_type] || line.line_type} · الكمية: {line.quantity}</div>
                    {line.line_type === "slat" && line.slat_specs && (
                      <div className="text-xs text-teal-700 mt-1">
                        {line.slat_specs.color && <>اللون: {line.slat_specs.color} · </>}
                        {line.slat_specs.width_mm && <>العرض: {line.slat_specs.width_mm} مم · </>}
                        {line.slat_specs.fin_count && <>الريش: {line.slat_specs.fin_count} · </>}
                        {line.slat_specs.frontage_count ? <>الجبهات: {line.slat_specs.frontage_count}</> : null}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-600" dir="ltr">{formatCurrency(line.total_price_cents)}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${fulfillment.color}`}>{fulfillment.label}</span>
                </div>
              </div>
            );
          })}
          {lines.length === 0 && <div className="text-center text-slate-400 py-4">لا توجد أسطر في هذا الطلب</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Factory className="h-5 w-5 text-indigo-500" /> أوامر الإنتاج</h3>
          <div className="space-y-2">
            {productionOrders.map(p => (
              <Link key={p.id} href={`/dashboard/production/orders/${p.id}`} className="block p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-sm">
                <div className="font-bold text-slate-700">#{p.id.slice(0, 8)} · {p.status}</div>
                <div className="text-xs text-slate-500">الكمية: {p.quantity}</div>
              </Link>
            ))}
            {productionOrders.length === 0 && <div className="text-slate-400 text-sm text-center py-2">لا يوجد</div>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Wrench className="h-5 w-5 text-orange-500" /> تذاكر الصيانة</h3>
          <div className="space-y-2">
            {maintenanceRequests.map(m => (
              <div key={m.id} className="p-3 rounded-xl bg-slate-50 text-sm">
                <div className="font-bold text-slate-700">{m.status}</div>
                <div className="text-xs text-slate-500">{m.description}</div>
              </div>
            ))}
            {maintenanceRequests.length === 0 && <div className="text-slate-400 text-sm text-center py-2">لا يوجد</div>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-amber-500" /> طلبات الشراء</h3>
          <div className="space-y-2">
            {purchaseRequests.map(pr => (
              <div key={pr.id} className="p-3 rounded-xl bg-slate-50 text-sm">
                <div className="font-bold text-slate-700">{pr.item_code} · {pr.status}</div>
                <div className="text-xs text-slate-500">الكمية الناقصة: {pr.quantity}</div>
              </div>
            ))}
            {purchaseRequests.length === 0 && <div className="text-slate-400 text-sm text-center py-2">لا يوجد</div>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><DoorClosed className="h-5 w-5 text-emerald-500" /> طلبيات الأبواب</h3>
          <div className="space-y-2">
            {doorOrders.map((d: any) => (
              <Link key={d.id} href={`/dashboard/production/door-orders/${d.id}`} className="block p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-sm">
                <div className="font-bold text-slate-700">#{d.id.slice(0, 8)} · {d.status}</div>
              </Link>
            ))}
            {doorOrders.length === 0 && <div className="text-slate-400 text-sm text-center py-2">لا يوجد</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
