"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AgendaItem } from "@/lib/agenda-data";
import { Inbox } from "lucide-react";

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export function AgendaView({ items }: { items: AgendaItem[] }) {
  const grouped = useMemo(() => {
    return items.reduce((acc: Record<string, AgendaItem[]>, item) => {
      (acc[item.category] ||= []).push(item);
      return acc;
    }, {});
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
        <Inbox className="h-8 w-8 text-slate-300" />
        لا يوجد شيء بانتظارك الآن — كل شيء تحت السيطرة.
      </div>
    );
  }

  return (
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
  );
}
