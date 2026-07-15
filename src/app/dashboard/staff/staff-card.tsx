"use client";

import { useState } from "react";
import { Phone, Trash2, Pencil, UserCog } from "lucide-react";
import { deleteStaffAction } from "./actions";
import { StaffEditForm } from "./staff-edit-form";
import { StaffCredentialsForm } from "./staff-credentials-form";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/role-labels";
import type { Staff } from "@/lib/staff-data";

export function StaffCard({ staff, allStaff }: { staff: Staff; allStaff: Staff[] }) {
  const [editing, setEditing] = useState(false);
  const supervisor = staff.supervisor_id ? allStaff.find((s) => s.id === staff.supervisor_id) : null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
      {editing ? (
        <StaffEditForm staff={staff} allStaff={allStaff} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-slate-800">{staff.name}</h3>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${ROLE_COLORS[staff.role] || "bg-slate-100 text-slate-800"}`}>
                {ROLE_LABELS[staff.role] || staff.role}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 rounded-lg transition"
                title="تعديل بيانات الموظف"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <form action={() => deleteStaffAction(staff.id)}>
                <button type="submit" className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-lg transition" title="حذف الموظف">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-sm text-slate-600">
            {staff.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <span dir="ltr">{staff.phone}</span>
              </div>
            )}
            {staff.telegram_chat_id ? (
              <div className="flex items-center gap-2 text-sky-600 font-medium">
                <span>✈️</span> Telegram ID: <span className="font-mono">{staff.telegram_chat_id}</span>
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic">لا يوجد معرف تليجرام مرتبط</div>
            )}
            {supervisor && (
              <div className="flex items-center gap-2 text-indigo-600 font-medium">
                <UserCog className="h-4 w-4" /> المسؤول المباشر: {supervisor.name}
              </div>
            )}
          </div>

          <StaffCredentialsForm staffId={staff.id} currentUsername={staff.username} />
        </>
      )}
    </div>
  );
}
