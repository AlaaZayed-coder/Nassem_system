"use client";

import { useState, useTransition } from "react";
import { createStaffAction } from "./actions";
import { Save } from "lucide-react";

export function StaffForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      try {
        await createStaffAction(formData);
        form.reset();
      } catch (err: any) {
        alert("خطأ: " + err.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم الموظف</label>
        <input required name="name" type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">القسم / الدور</label>
        <select required name="role" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition bg-white">
          <option value="employee">موظف</option>
          <option value="sales">مبيعات</option>
          <option value="production">إنتاج ومصنع</option>
          <option value="purchasing">مشتريات</option>
          <option value="order_processor">معالج الطلبيات</option>
          <option value="manager">مدير النظام</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">رقم الجوال (اختياري)</label>
        <input name="phone" type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left" />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">معرف تليجرام Chat ID</label>
        <input name="telegram_chat_id" type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left" placeholder="مثال: 123456789" />
        <p className="text-xs text-slate-500 mt-1.5">مطلوب لربط تطبيق وبوت تليجرام بالموظف.</p>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم المستخدم (لتسجيل الدخول للويب)</label>
        <input name="username" type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left" placeholder="اختياري" />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">كلمة المرور</label>
        <input name="password" type="password" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left" placeholder="اختياري" />
        <p className="text-xs text-slate-500 mt-1.5">اتركهما فارغتين لإضافتهما لاحقاً من بطاقة الموظف.</p>
      </div>

      <button disabled={isPending} type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 mt-2">
        <Save className="h-4 w-4" />
        {isPending ? "جاري الإضافة..." : "حفظ بيانات الموظف"}
      </button>
    </form>
  );
}
