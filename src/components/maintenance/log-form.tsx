"use client";

import { useState } from "react";
import { logMaintenanceAction } from "@/app/dashboard/maintenance/actions";
import { Wrench, Save, ArrowRight } from "lucide-react";
import Link from "next/link";

type Machine = { id: string; name: string };

export function LogForm({ machines }: { machines: Machine[] }) {
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" dir="rtl">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <Wrench className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">تسجيل عملية صيانة لآلة</h2>
        </div>
        <Link href="/dashboard/maintenance" className="text-sm font-bold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 transition">
          <ArrowRight className="h-4 w-4" /> العودة للوحة
        </Link>
      </div>

      <form 
        action={async (formData) => {
          setIsPending(true);
          try {
            await logMaintenanceAction(formData);
          } finally {
            setIsPending(false);
          }
        }} 
        className="p-6 space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="machine_id" className="block text-sm font-bold text-slate-700">اختر الآلة التي تم صيانتها</label>
          <select 
            required
            name="machine_id" 
            id="machine_id" 
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition bg-white"
          >
            <option value="">-- اختر آلة --</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-bold text-slate-700">وصف العطل أو الصيانة (تفاصيل)</label>
          <textarea 
            required
            name="description" 
            id="description" 
            rows={3}
            placeholder="مثال: تغيير سير المحرك الرئيسي وتنظيف الفلاتر..." 
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="technician_name" className="block text-sm font-bold text-slate-700">اسم الفني أو المهندس</label>
            <input 
              type="text" 
              name="technician_name" 
              id="technician_name" 
              placeholder="مثال: أحمد مصطفى" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="cost" className="block text-sm font-bold text-slate-700">تكلفة الصيانة (إن وجدت)</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.01"
                name="cost" 
                id="cost" 
                placeholder="0.00" 
                className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-left dir-ltr font-mono"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">SAR</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="next_maintenance_date" className="block text-sm font-bold text-slate-700">تاريخ الصيانة الدورية القادمة (اختياري)</label>
          <input 
            type="date" 
            name="next_maintenance_date" 
            id="next_maintenance_date" 
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-left dir-ltr"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            {isPending ? "جاري الحفظ..." : "حفظ سجل الصيانة"}
          </button>
        </div>
      </form>
    </div>
  );
}
