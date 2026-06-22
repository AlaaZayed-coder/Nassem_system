"use client";

import { useState } from "react";
import { createMachineAction } from "@/app/dashboard/maintenance/actions";
import { Settings, Save, ArrowRight } from "lucide-react";
import Link from "next/link";

export function MachineForm() {
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" dir="rtl">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
            <Settings className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">إضافة آلة جديدة للمصنع</h2>
        </div>
        <Link href="/dashboard/maintenance/machines" className="text-sm font-bold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 transition">
          <ArrowRight className="h-4 w-4" /> رجوع للقائمة
        </Link>
      </div>

      <form 
        action={async (formData) => {
          setIsPending(true);
          try {
            await createMachineAction(formData);
          } finally {
            setIsPending(false);
          }
        }} 
        className="p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-bold text-slate-700">اسم الآلة</label>
            <input 
              required
              type="text" 
              name="name" 
              id="name" 
              placeholder="مثال: آلة قص المعادن CNC" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="model" className="block text-sm font-bold text-slate-700">موديل الآلة</label>
            <input 
              type="text" 
              name="model" 
              id="model" 
              placeholder="مثال: XJ-2000" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition text-left dir-ltr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="serial_number" className="block text-sm font-bold text-slate-700">الرقم التسلسلي (Serial Number)</label>
          <input 
            type="text" 
            name="serial_number" 
            id="serial_number" 
            placeholder="مثال: SN-987654321" 
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition font-mono text-left dir-ltr"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            {isPending ? "جاري الحفظ..." : "حفظ بيانات الآلة"}
          </button>
        </div>
      </form>
    </div>
  );
}
