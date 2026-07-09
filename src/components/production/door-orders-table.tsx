"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DoorOrder } from "@/lib/door-orders-data";
import { updateDoorOrderStatusAction } from "@/app/dashboard/production/door-orders/actions";
import { Search, Building2, UserCircle2, Package, Printer, ArrowUpRight } from "lucide-react";

const STATUSES = [
  { id: "عالقة", label: "عالقة", color: "bg-rose-100 text-rose-700" },
  { id: "قيد الانتظار", label: "قيد الانتظار", color: "bg-slate-100 text-slate-700" },
  { id: "معلقة", label: "معلقة", color: "bg-amber-100 text-amber-700" },
  { id: "قيد الإنتاج", label: "قيد الإنتاج", color: "bg-sky-100 text-sky-700" },
  { id: "تم التوريد", label: "تم التوريد", color: "bg-violet-100 text-violet-700" },
  { id: "جاهزة", label: "جاهزة", color: "bg-emerald-100 text-emerald-700" },
];

export function DoorOrdersTable({ initialOrders }: { initialOrders: DoorOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesQuery = !query || o.erp_customers?.name?.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = !statusFilter || o.status === statusFilter;
      const matchesPending = !pendingOnly || (o.pending_completion_count ?? 0) > 0;
      return matchesQuery && matchesStatus && matchesPending;
    });
  }, [orders, query, statusFilter, pendingOnly]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    const previousOrders = [...orders];
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

    startTransition(async () => {
      try {
        await updateDoorOrderStatusAction(orderId, newStatus);
      } catch (error: any) {
        alert("فشل في تحديث الحالة: " + error.message);
        setOrders(previousOrders);
      }
    });
  };

  const statusMeta = (id: string) => STATUSES.find((s) => s.id === id) || { id, label: id, color: "bg-slate-100 text-slate-700" };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث باسم العميل..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 outline-none text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm bg-white"
        >
          <option value="">كل الحالات</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 px-3 py-2 rounded-xl border border-sky-100 cursor-pointer">
          <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} className="h-3.5 w-3.5" />
          بانتظار الاستكمال فقط
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs">
              <th className="text-right font-bold px-4 py-3">العميل</th>
              <th className="text-right font-bold px-4 py-3">نوع الطلبية</th>
              <th className="text-right font-bold px-4 py-3">الأصناف</th>
              <th className="text-right font-bold px-4 py-3">المسؤول</th>
              <th className="text-right font-bold px-4 py-3">الحالة</th>
              <th className="text-right font-bold px-4 py-3">التاريخ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => {
              const meta = statusMeta(order.status);
              return (
                <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/production/door-orders/${order.id}`} className="flex items-center gap-2 font-bold text-slate-800 hover:text-emerald-600">
                      {order.erp_customers?.company_name ? (
                        <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                      ) : (
                        <UserCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      {order.erp_customers?.name || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{order.order_type}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {(order.item_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                          <Package className="h-3 w-3" /> {order.item_count}
                        </span>
                      )}
                      {(order.pending_completion_count ?? 0) > 0 && (
                        <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full w-fit">
                          ⏳ {order.pending_completion_count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{order.erp_staff?.name || "غير محدد"}</td>
                  <td className="px-4 py-3">
                    <select
                      disabled={isPending}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border-0 cursor-pointer ${meta.color} disabled:opacity-50`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(order.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/production/door-orders/${order.id}/print`} target="_blank" className="text-slate-400 hover:text-emerald-600" title="طباعة">
                        <Printer className="h-4 w-4" />
                      </Link>
                      <Link href={`/dashboard/production/door-orders/${order.id}`} className="text-slate-400 hover:text-emerald-600">
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-10">لا توجد طلبيات مطابقة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
