"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CustomerWithStats } from "@/lib/customers-data";
import { formatCurrency } from "@/lib/format";
import { Search, Building2, UserCircle2, ArrowUpRight, Package, DoorClosed } from "lucide-react";

export function CustomersTable({ initialCustomers }: { initialCustomers: CustomerWithStats[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialCustomers;
    return initialCustomers.filter((c) => {
      const haystack = [c.name, c.company_name, c.phone, c.address].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [initialCustomers, query]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم، الشركة، الهاتف، أو العنوان..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 outline-none text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs">
              <th className="text-right font-bold px-4 py-3">العميل</th>
              <th className="text-right font-bold px-4 py-3">الشركة / المؤسسة</th>
              <th className="text-right font-bold px-4 py-3">الهاتف</th>
              <th className="text-right font-bold px-4 py-3">طلبات المبيعات</th>
              <th className="text-right font-bold px-4 py-3">طلبيات الأبواب</th>
              <th className="text-right font-bold px-4 py-3">إجمالي المبيعات</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-2 font-bold text-slate-800 hover:text-indigo-600">
                    {c.company_name ? (
                      <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                    ) : (
                      <UserCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.company_name || "—"}</td>
                <td className="px-4 py-3 text-slate-500" dir="ltr">{c.phone || "—"}</td>
                <td className="px-4 py-3">
                  {c.sales_orders_count > 0 ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full w-fit">
                      <Package className="h-3 w-3" /> {c.sales_orders_count}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.door_orders_count > 0 ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                      <DoorClosed className="h-3 w-3" /> {c.door_orders_count}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-indigo-700" dir="ltr">
                  {formatCurrency(c.total_sales_value_cents)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/customers/${c.id}`} className="text-slate-400 hover:text-indigo-600">
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-10">لا يوجد عملاء مطابقون</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
