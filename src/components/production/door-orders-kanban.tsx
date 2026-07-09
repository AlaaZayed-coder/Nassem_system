"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DoorOrder } from "@/lib/door-orders-data";
import { updateDoorOrderStatusAction } from "@/app/dashboard/production/door-orders/actions";
import { Phone, Building2, UserCircle2, Package, Printer } from "lucide-react";

const COLUMNS = [
  { id: "عالقة", label: "عالقة", color: "bg-rose-50", textColor: "text-rose-800", borderColor: "border-rose-300" },
  { id: "قيد الانتظار", label: "قيد الانتظار", color: "bg-slate-100", textColor: "text-slate-800", borderColor: "border-slate-300" },
  { id: "معلقة", label: "معلقة", color: "bg-amber-50", textColor: "text-amber-800", borderColor: "border-amber-300" },
  { id: "قيد الإنتاج", label: "قيد الإنتاج", color: "bg-sky-50", textColor: "text-sky-800", borderColor: "border-sky-300" },
  { id: "تم التوريد", label: "تم التوريد", color: "bg-violet-50", textColor: "text-violet-800", borderColor: "border-violet-300" },
  { id: "جاهزة", label: "جاهزة", color: "bg-emerald-50", textColor: "text-emerald-800", borderColor: "border-emerald-300" },
];

export function DoorOrdersKanban({ initialOrders }: { initialOrders: DoorOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [, startTransition] = useTransition();

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("orderId", orderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("orderId");

    const previousOrders = [...orders];
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: columnId } : o)));

    startTransition(async () => {
      try {
        await updateDoorOrderStatusAction(orderId, columnId);
      } catch (error: any) {
        alert("فشل في تحديث الحالة: " + error.message);
        setOrders(previousOrders);
      }
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6" dir="rtl">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.id);

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col w-80 shrink-0 rounded-2xl border ${col.borderColor} ${col.color}`}
          >
            <div className="p-4 border-b border-white/50 flex justify-between items-center">
              <h3 className={`font-bold ${col.textColor}`}>{col.label}</h3>
              <span className="text-xs font-medium opacity-70">{colOrders.length} طلبية</span>
            </div>

            <div className="p-3 flex flex-col gap-3 min-h-[400px]">
              {colOrders.map((order) => (
                <div
                  key={order.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, order.id)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <Link
                      href={`/dashboard/production/door-orders/${order.id}`}
                      className="text-xs font-mono text-slate-400 hover:text-emerald-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{order.id.split("-")[0]}
                    </Link>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-bold text-slate-600">{order.order_type}</span>
                  </div>

                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    {order.erp_customers?.company_name ? (
                      <Building2 className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <UserCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    {order.erp_customers?.name}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    {(order.item_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        <Package className="h-3 w-3" />
                        {order.item_count} {order.item_count === 1 ? "صنف" : "أصناف"}
                      </span>
                    )}
                    <span className="text-slate-400">{new Date(order.created_at).toLocaleDateString("ar-SA")}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex gap-2">
                      {order.erp_customers?.phone && (
                        <span title={order.erp_customers.phone}>
                          <Phone className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {order.erp_staff?.name && <span className="font-bold">{order.erp_staff.name}</span>}
                      <Link
                        href={`/dashboard/production/door-orders/${order.id}/print`}
                        target="_blank"
                        className="text-slate-400 hover:text-emerald-600 transition"
                        title="طباعة المواصفات الفنية"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {colOrders.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-300/50 rounded-xl text-slate-400 text-sm font-medium">
                  اسحب وأفلت هنا
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
