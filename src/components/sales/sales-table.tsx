"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { SalesOrder } from "@/lib/sales-data";
import { updateOpportunityStatusAction } from "@/app/dashboard/sales/actions";
import { formatCurrency } from "@/lib/format";
import { Search, Building2, UserCircle2, ArrowUpRight } from "lucide-react";

const STATUSES = [
  { id: "تسجيل الطلب", label: "طلبات جديدة", color: "bg-slate-100 text-slate-700" },
  { id: "قيد التقييم", label: "قيد التقييم", color: "bg-blue-100 text-blue-700" },
  { id: "تقديم العرض", label: "تقديم العرض", color: "bg-amber-100 text-amber-700" },
  { id: "معتمد", label: "معتمد (فوز)", color: "bg-emerald-100 text-emerald-700" },
  { id: "مرفوض", label: "مرفوض (خسارة)", color: "bg-red-100 text-red-700" },
];

export function SalesTable({ initialOrders }: { initialOrders: SalesOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesQuery = !query || o.erp_customers?.name?.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = !statusFilter || o.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [orders, query, statusFilter]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    const previousOrders = [...orders];
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

    startTransition(async () => {
      try {
        await updateOpportunityStatusAction(orderId, newStatus);
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs">
              <th className="text-right font-bold px-4 py-3">العميل</th>
              <th className="text-right font-bold px-4 py-3">الاحتمال</th>
              <th className="text-right font-bold px-4 py-3">القيمة</th>
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
                    <Link href={`/dashboard/sales/${order.id}`} className="flex items-center gap-2 font-bold text-slate-800 hover:text-indigo-600">
                      {order.erp_customers?.company_name ? (
                        <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                      ) : (
                        <UserCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      {order.erp_customers?.name || "—"}
                    </Link>
                    {order.erp_customers?.company_name && (
                      <div className="text-xs text-slate-400 mr-6">{order.erp_customers.company_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{order.win_probability_percent || 0}%</td>
                  <td className="px-4 py-3 font-mono font-bold text-indigo-700" dir="ltr">
                    {formatCurrency(order.expected_revenue_cents || order.total_amount_cents || 0)}
                  </td>
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
                    {new Date(order.created_at).toLocaleDateString("ar-SA")}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/sales/${order.id}`} className="text-slate-400 hover:text-indigo-600">
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-10">لا توجد طلبات مطابقة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
