"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DoorOrder } from "@/lib/door-orders-data";
import { Search, Building2, UserCircle2, Package, ArrowUpRight } from "lucide-react";

const STAGES = [
  { id: "", label: "بانتظار الإخراج", color: "bg-slate-100 text-slate-700" },
  { id: "قيد التركيب", label: "قيد التركيب", color: "bg-sky-100 text-sky-700" },
  { id: "بانتظار تأكيد العميل", label: "بانتظار تأكيد العميل", color: "bg-amber-100 text-amber-700" },
  { id: "مكتملة", label: "مكتملة", color: "bg-emerald-100 text-emerald-700" },
];

export function InstallationTable({ initialOrders }: { initialOrders: DoorOrder[] }) {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const filtered = useMemo(() => {
    return initialOrders.filter((o) => {
      const matchesQuery = !query || o.erp_customers?.name?.toLowerCase().includes(query.toLowerCase());
      const matchesStage = !stageFilter || (o.installation_status || "") === stageFilter;
      return matchesQuery && matchesStage;
    });
  }, [initialOrders, query, stageFilter]);

  const stageMeta = (id: string | null) => STAGES.find((s) => s.id === (id || "")) || STAGES[0];

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
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm bg-white"
        >
          <option value="">كل المراحل</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs">
              <th className="text-right font-bold px-4 py-3">العميل</th>
              <th className="text-right font-bold px-4 py-3">الأصناف</th>
              <th className="text-right font-bold px-4 py-3">فريق التركيب</th>
              <th className="text-right font-bold px-4 py-3">المرحلة</th>
              <th className="text-right font-bold px-4 py-3">التاريخ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => {
              const meta = stageMeta(order.installation_status);
              return (
                <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/installation/${order.id}`} className="flex items-center gap-2 font-bold text-slate-800 hover:text-indigo-600">
                      {order.erp_customers?.company_name ? (
                        <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                      ) : (
                        <UserCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      {order.erp_customers?.name || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {(order.item_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                        <Package className="h-3 w-3" /> {order.item_count}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{order.installation_team_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${meta.color}`}>{meta.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(order.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/installation/${order.id}`} className="text-slate-400 hover:text-indigo-600">
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-10">لا توجد طلبيات مطابقة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
