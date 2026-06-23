"use client";

import { useState, useTransition } from "react";
import { Plus, X, Check } from "lucide-react";
import { createSupplierAction } from "./actions";

export function NewSupplierModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      setError("");
      const res = await createSupplierAction(formData);
      if (res.success) {
        setIsOpen(false);
      } else {
        setError(res.message || "حدث خطأ غير متوقع");
      }
    });
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-sm text-sm"
      >
        <Plus className="h-5 w-5" /> إضافة مورد جديد
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">إضافة مورد جديد</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>}
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">اسم المورد / الشركة *</label>
                <input type="text" name="name" required className="p-3 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="مثال: شركة المواد الأساسية" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">رقم التواصل</label>
                <input type="tel" name="phone" className="p-3 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-left" dir="ltr" placeholder="+966 5..." />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">البريد الإلكتروني</label>
                <input type="email" name="email" className="p-3 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-left" dir="ltr" placeholder="contact@supplier.com" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">العنوان</label>
                <input type="text" name="address" className="p-3 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="المدينة، الحي..." />
              </div>

              <button type="submit" disabled={isPending} className="mt-4 py-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex justify-center items-center gap-2 disabled:opacity-50">
                <Check className="h-5 w-5" /> حفظ المورد
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
