"use client";

import { useTransition } from "react";
import { updateStaffAction } from "./actions";
import { ROLE_LABELS } from "@/lib/role-labels";
import type { Staff } from "@/lib/staff-data";

export function StaffEditForm({ staff, allStaff, onCancel, onSaved }: { staff: Staff; allStaff: Staff[]; onCancel: () => void; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateStaffAction(staff.id, formData);
        onSaved();
      } catch (err: any) {
        alert("خطأ: " + err.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
      <input
        required
        name="name"
        type="text"
        defaultValue={staff.name}
        placeholder="اسم الموظف"
        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-sm"
      />
      <select
        required
        name="role"
        defaultValue={staff.role}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition bg-white text-sm"
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <input
        name="phone"
        type="text"
        defaultValue={staff.phone || ""}
        placeholder="رقم الجوال (اختياري)"
        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left text-sm"
      />
      <input
        name="telegram_chat_id"
        type="text"
        defaultValue={staff.telegram_chat_id || ""}
        placeholder="معرف تليجرام Chat ID"
        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left text-sm"
      />
      <select
        name="supervisor_id"
        defaultValue={staff.supervisor_id || ""}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition bg-white text-sm"
      >
        <option value="">-- بدون مسؤول مباشر --</option>
        {allStaff.filter((s) => s.id !== staff.id).map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          disabled={isPending}
          type="submit"
          className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-100 transition"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
