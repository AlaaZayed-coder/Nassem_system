import Link from "next/link";
import { getDoorOrderDetail } from "@/lib/door-orders-data";
import { supabase } from "@/lib/supabase";
import { DoorClosed, ArrowRight, User, Calendar } from "lucide-react";
import { ElectronicsManager } from "./electronics-manager";
import { StatusSelect } from "./status-select";
import { CalculateSpecsButton } from "./calculate-specs-button";

export const dynamic = "force-dynamic";

export default async function DoorOrderDetailPage({ params }: { params: { id: string } }) {
  const { order, items, electronics } = await getDoorOrderDetail(params.id);
  const { data: catalogItems } = await supabase.from("erp_items").select("item_code, original_name, approved_name").eq("is_active", true);

  if (!order) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-slate-800">الطلبية غير موجودة</h1>
        <Link href="/dashboard/production/door-orders" className="text-emerald-600 font-bold mt-4 inline-block hover:underline">العودة للقائمة</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <DoorClosed className="h-8 w-8 text-emerald-600" />
            طلبية باب #{order.id.slice(0, 8)}
          </h1>
          <p className="text-slate-500 mt-2">{order.erp_customers?.name} {order.customer_name_note ? `(${order.customer_name_note})` : ""}</p>
        </div>
        <Link href="/dashboard/production/door-orders" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للقائمة
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <span className="text-slate-500 text-xs block mb-1">العميل</span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" /> {order.erp_customers?.name}</span>
            {order.erp_customers?.phone && <span className="text-xs text-slate-500 block mt-1" dir="ltr">{order.erp_customers.phone}</span>}
          </div>
          <div>
            <span className="text-slate-500 text-xs block mb-1">نوع الطلبية</span>
            <span className="font-bold text-slate-800">{order.order_type}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs block mb-1">المسؤول</span>
            <span className="font-bold text-slate-800">{order.erp_staff?.name || "غير محدد"}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs block mb-1">الحالة</span>
            <StatusSelect orderId={order.id} currentStatus={order.status} />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> أُنشئت في {new Date(order.created_at).toLocaleDateString("ar-SA")}
        </div>
        {order.general_notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-slate-500 text-xs block mb-1">ملاحظات عامة</span>
            <p className="text-slate-700 text-sm whitespace-pre-line">{order.general_notes}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-3">أصناف الطلبية</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800">{item.erp_items?.approved_name || item.erp_items?.original_name}</span>
                {item.color && <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-600">{item.color}</span>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600">
                <div>الطول: <span className="font-bold">{item.length_mm ?? "—"}</span> مم</div>
                <div>الارتفاع: <span className="font-bold">{item.height_mm ?? "—"}</span> مم</div>
                <div>المجاري بالورشة: <span className="font-bold">{item.guides_sent ? "نعم" : "لا"}</span></div>
                {item.profile_item_code && <div>بروفيل: <span className="font-bold">{item.profile_item_code}</span></div>}
              </div>
              {item.has_cover && (
                <div className="mt-2 text-xs text-sky-700 bg-sky-50 inline-block px-2 py-1 rounded-lg">
                  شاشية: {item.cover_width_mm ?? "—"}×{item.cover_height_mm ?? "—"} مم
                </div>
              )}
              {item.has_box && (
                <div className="mt-2 ms-2 text-xs text-indigo-700 bg-indigo-50 inline-block px-2 py-1 rounded-lg">
                  صندوق: {item.box_length_mm ?? "—"}×{item.box_height_mm ?? "—"} مم
                </div>
              )}
              {item.item_notes && <p className="mt-2 text-xs text-slate-500 whitespace-pre-line">{item.item_notes}</p>}

              <div className="mt-3 pt-3 border-t border-slate-200">
                {item.calculated_at ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">الوزن الأساسي</span>
                      <span className="font-bold text-slate-800">{item.base_weight_kg?.toFixed(2)} كغم</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">الوزن النهائي</span>
                      <span className="font-bold text-slate-800">{item.final_weight_kg?.toFixed(2)} كغم</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">الطاسة</span>
                      <span className="font-bold text-slate-800">{item.frame_type}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">الخد</span>
                      <span className="font-bold text-slate-800">{item.jamb_type}</span>
                    </div>
                    {item.is_industrial ? (
                      <div className="bg-amber-50 p-2 rounded-lg border border-amber-100 col-span-2">
                        <span className="text-amber-700 block">باب صناعي — بدون احتساب زنبركات</span>
                        <span className="font-bold text-amber-900">طول الماسورة: {item.pipe_length_inch ?? "—"} إنش</span>
                      </div>
                    ) : item.spring_type ? (
                      <div className="bg-white p-2 rounded-lg border border-slate-200 col-span-2">
                        <span className="text-slate-500 block">الزنبرك</span>
                        <span className="font-bold text-slate-800">{item.spring_count} × ({item.spring_type}) — فرق التحقق: {item.spring_match_diff_kg?.toFixed(2)} كغم</span>
                      </div>
                    ) : (
                      <div className="bg-rose-50 p-2 rounded-lg border border-rose-100 col-span-2">
                        <span className="font-bold text-rose-700">لا يوجد تطابق مناسب للزنبركات — يحتاج مراجعة يدوية</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <CalculateSpecsButton itemId={item.id} />
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-center text-slate-400 py-4">لا توجد أصناف</div>}
        </div>
      </div>

      <ElectronicsManager doorOrderId={order.id} electronics={electronics} items={catalogItems || []} />
    </div>
  );
}
