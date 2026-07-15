"use client";

import { useState, useTransition } from "react";
import { KeyRound, ChevronDown } from "lucide-react";
import { setStaffCredentialsAction } from "./actions";

export function StaffCredentialsForm({ staffId, currentUsername }: { staffId: string; currentUsername: string | null }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      try {
        await setStaffCredentialsAction(staffId, formData);
        form.reset();
        setOpen(false);
      } catch (err: any) {
        alert("خطأ: " + err.message);
      }
    });
  };

  return (
    <div className="pt-3 border-t border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-sm font-medium text-slate-600 hover:text-indigo-600 transition"
      >
        <span className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          {currentUsername ? `بيانات الدخول: ${currentUsername}` : "لم يتم تفعيل حساب الدخول"}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <input
            required
            name="username"
            type="text"
            defaultValue={currentUsername || ""}
            placeholder="اسم المستخدم"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left text-sm"
          />
          <input
            required
            name="password"
            type="password"
            placeholder="كلمة المرور الجديدة"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left text-sm"
          />
          <button
            disabled={isPending}
            type="submit"
            className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isPending ? "جاري الحفظ..." : currentUsername ? "تحديث بيانات الدخول" : "تفعيل حساب الدخول"}
          </button>
        </form>
      )}
    </div>
  );
}
