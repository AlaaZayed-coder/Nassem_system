"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Staff } from "@/lib/staff-data";
import { AgendaItem } from "@/lib/agenda-data";
import { getAgendaAction } from "./actions";
import { UserCircle2, Inbox } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  sales: "مبيعات",
  production: "إنتاج ومصنع (يشمل التركيب والصيانة)",
  purchasing: "مشتريات",
  order_processor: "معالج الطلبيات",
  manager: "مدير النظام (كل شيء)",
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export function AgendaView({ staff }: { staff: Staff[] }) {
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [items, setItems] = useState<AgendaItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  useEffect(() => {
    if (!selectedStaff) {
      setItems(null);
      return;
    }
    setLoading(true);
    getAgendaAction(selectedStaff.role).then((result) => {
      setItems(result);
      setLoading(false);
    });
  }, [selectedStaff?.role]);

  const grouped = useMemo(() => {
    if (!items) return {};
    return items.reduce((acc: Record<string, AgendaItem[]>, item) => {
      (acc[item.category] ||= []).push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
          <UserCircle2 className="h-4 w-4 text-indigo-500" /> أنا:
        </label>
        <select
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none bg-slate-50"
        >
          <option value="">-- اختر اسمك --</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({ROLE_LABEL[s.role] || s.role})</option>
          ))}
        </select>
      </div>

      {loading && <div className="text-center text-slate-400 py-8">جارٍ التحميل...</div>}

      {!loading && items && items.length === 0 && (
        <div className="text-center text-slate-400 py-12 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
          <Inbox className="h-8 w-8 text-slate-300" />
          لا يوجد شيء بانتظارك الآن — كل شيء تحت السيطرة.
        </div>
      )}

      {!loading && items && items.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">{category}</h2>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{categoryItems.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {categoryItems.map((item) => {
                  const days = daysSince(item.createdAt);
                  return (
                    <Link
                      key={item.id}
                      href={item.link}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition text-sm"
                    >
                      <span className="text-slate-800">{item.label}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 mr-3 ${days >= 3 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                        منذ {days} يوم
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
