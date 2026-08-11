"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Phone, Trash2, Pencil, UserCog, TriangleAlert, IdCard } from "lucide-react";
import { deleteStaffAction, forceDeleteStaffAction } from "./actions";
import { StaffEditForm } from "./staff-edit-form";
import { StaffCredentialsForm } from "./staff-credentials-form";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/role-labels";
import type { Staff } from "@/lib/staff-data";

export function StaffCard({ staff, allStaff, viewerRole }: { staff: Staff; allStaff: Staff[]; viewerRole?: string }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingForceDelete, setConfirmingForceDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isForceDeleting, startForceDeleteTransition] = useTransition();
  const supervisor = staff.supervisor_id ? allStaff.find((s) => s.id === staff.supervisor_id) : null;

  const handleDelete = () => {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteStaffAction(staff.id);
      if (result?.error) {
        setDeleteError(result.error);
        setConfirmingDelete(false);
      }
    });
  };

  const handleForceDelete = () => {
    startForceDeleteTransition(async () => {
      const result = await forceDeleteStaffAction(staff.id);
      if (result?.error) {
        setDeleteError(result.error);
        setConfirmingForceDelete(false);
      }
    });
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
      {editing ? (
        <StaffEditForm staff={staff} allStaff={allStaff} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-slate-800">{staff.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${ROLE_COLORS[staff.role] || "bg-slate-100 text-slate-800"}`}>
                  {ROLE_LABELS[staff.role] || staff.role}
                </span>
                {!staff.is_active && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
                    معطّل
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/dashboard/staff/${staff.id}/profile`}
                className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 rounded-lg transition"
                title="الملف الشخصي (طباعة / PDF)"
              >
                <IdCard className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 rounded-lg transition"
                title="تعديل بيانات الموظف"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-lg transition"
                title="حذف الموظف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-2">
              <div className="flex items-start gap-1.5">
                <TriangleAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-rose-700">{deleteError}</p>
              </div>

              {viewerRole === "manager" && !confirmingForceDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmingForceDelete(true)}
                  className="self-start text-xs font-bold text-rose-700 underline hover:text-rose-800 transition"
                >
                  لمدير النظام فقط: حذف نهائي مع كل سجلاته المرتبطة
                </button>
              )}

              {confirmingForceDelete && (
                <div className="pt-2 border-t border-rose-200 flex flex-col gap-2">
                  <p className="text-xs font-bold text-rose-800">
                    ⚠️ سيُحذف {staff.name} نهائياً مع كل طلباته ورسائله المرتبطة. هذا يمحو سجلاً تاريخياً ولا يمكن التراجع عنه.
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={isForceDeleting}
                      onClick={handleForceDelete}
                      className="flex-1 bg-rose-800 text-white px-3 py-1.5 rounded-lg font-bold text-sm hover:bg-rose-900 transition disabled:opacity-50"
                    >
                      {isForceDeleting ? "جاري الحذف النهائي..." : "نعم، احذف نهائياً مع كل سجلاته"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingForceDelete(false)}
                      className="px-3 py-1.5 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-100 transition"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {confirmingDelete && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-2">
              <p className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                <TriangleAlert className="h-4 w-4" /> متأكد من حذف {staff.name}؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="flex-1 bg-rose-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {isDeleting ? "جاري الحذف..." : "نعم، احذف"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="px-3 py-1.5 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-100 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

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
