"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SalesOrder } from "@/lib/sales-data";
import { updateOpportunityStatusAction } from "@/app/dashboard/sales/actions";
import { formatCurrency } from "@/lib/format";
import { Phone, Mail, Building2, UserCircle2, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

const COLUMNS = [
  { id: "تسجيل الطلب", label: "طلبات جديدة", color: "bg-slate-100", textColor: "text-slate-800", borderColor: "border-slate-300" },
  { id: "قيد التقييم", label: "قيد التقييم", color: "bg-blue-50", textColor: "text-blue-800", borderColor: "border-blue-300" },
  { id: "تقديم العرض", label: "تقديم العرض", color: "bg-amber-50", textColor: "text-amber-800", borderColor: "border-amber-300" },
  { id: "معتمد", label: "معتمد (فوز)", color: "bg-emerald-50", textColor: "text-emerald-800", borderColor: "border-emerald-300" },
  { id: "مرفوض", label: "مرفوض (خسارة)", color: "bg-red-50", textColor: "text-red-800", borderColor: "border-red-300" }
];

export function SalesKanban({ initialOrders }: { initialOrders: SalesOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [isPending, startTransition] = useTransition();

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("orderId", orderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("orderId");
    
    // Optimistic update
    const previousOrders = [...orders];
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: columnId } : o));

    startTransition(async () => {
      try {
        await updateOpportunityStatusAction(orderId, columnId);
      } catch (error: any) {
        alert("فشل في تحديث الحالة: " + error.message);
        setOrders(previousOrders); // Revert
      }
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6" dir="rtl">
      {COLUMNS.map(col => {
        const colOrders = orders.filter(o => o.status === col.id);
        const colTotalRevenue = colOrders.reduce((sum, o) => sum + (o.expected_revenue_cents || o.total_amount_cents || 0), 0);

        return (
          <div 
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col w-80 shrink-0 rounded-2xl border ${col.borderColor} ${col.color}`}
          >
            <div className="p-4 border-b border-white/50 flex justify-between items-center">
              <div>
                <h3 className={`font-bold ${col.textColor}`}>{col.label}</h3>
                <span className="text-xs font-medium opacity-70">{colOrders.length} فرصة</span>
              </div>
              <div className="text-sm font-black font-mono opacity-80" dir="ltr">
                {formatCurrency(colTotalRevenue)}
              </div>
            </div>
            
            <div className="p-3 flex flex-col gap-3 min-h-[500px]">
              {colOrders.map(order => (
                <div 
                  key={order.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, order.id)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <Link
                      href={`/dashboard/sales/${order.id}`}
                      className="text-xs font-mono text-slate-400 hover:text-indigo-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{order.id.split("-")[0]}
                    </Link>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {order.win_probability_percent || 0}% فوز
                    </span>
                  </div>
                  
                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    {order.erp_customers?.company_name ? (
                      <Building2 className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <UserCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    {order.erp_customers?.name}
                  </div>
                  
                  {order.erp_customers?.company_name && (
                    <div className="text-xs text-slate-500 mb-2">{order.erp_customers.company_name}</div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-slate-500 text-xs flex gap-2">
                      {order.erp_customers?.phone && <span title={order.erp_customers.phone}><Phone className="h-3.5 w-3.5" /></span>}
                    </div>
                    <div className="font-black text-indigo-700 font-mono text-sm" dir="ltr">
                      {formatCurrency(order.expected_revenue_cents || order.total_amount_cents || 0)}
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
