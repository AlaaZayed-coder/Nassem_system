"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Trash2, Pencil, TriangleAlert, IdCard, X } from "lucide-react";
import { deleteStaffAction, forceDeleteStaffAction } from "./actions";
import { StaffEditForm } from "./staff-edit-form";
import { StaffCredentialsForm } from "./staff-credentials-form";
import { StaffEvaluationsDocuments } from "./staff-evaluations-documents";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/role-labels";
import type { Staff } from "@/lib/staff-data";

function StaffAvatar({ name, role }: { name: string; role: string }) {
  const initial = name.trim().charAt(0) || "؟";
  const color = ROLE_COLORS[role] || "bg-slate-100 text-slate-800";
  return (
    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${color}`}>
      {initial}
    </div>
  );
}

export function StaffRow({ staff, allStaff, viewerRole }: { staff: Staff; allStaff: Staff[]; viewerRole?: string }) {
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

  const expanded = confirmingDelete || !!deleteError;

  return (
    <>
      <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition align-top">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <StaffAvatar name={staff.name} role={staff.role} />
            <div>
              <div className="font-bold text-slate-800 text-sm whitespace-nowrap">{staff.name}</div>
              {supervisor && <div className="text-[11px] text-indigo-600 mt-0.5 whitespace-nowrap">يتبع: {supervisor.name}</div>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[staff.role] || "bg-slate-100 text-slate-800"}`}>
            {ROLE_LABELS[staff.role] || staff.role}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {staff.is_active ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">نشط</span>
          ) : (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">معطّل</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap" dir="ltr">{staff.phone || "—"}</td>
        <td className="px-4 py-3 text-xs whitespace-nowrap">
          {staff.telegram_chat_id ? (
            <span className="text-sky-600 font-mono" dir="ltr">✈️ {staff.telegram_chat_id}</span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {staff.username ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">{staff.username}</span>
          ) : (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">بدون دخول</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/staff/${staff.id}/profile`}
              className="text-slate-400 hover:text-indigo-600 p-1.5 bg-slate-50 rounded-lg transition"
              title="الملف الشخصي (طباعة / PDF)"
            >
              <IdCard className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-slate-400 hover:text-indigo-600 p-1.5 bg-slate-50 rounded-lg transition"
              title="تعديل بيانات الموظف"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-lg transition"
              title="حذف الموظف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={7} className="px-4 py-4">
            {deleteError && (
              <div className="max-w-xl p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-2">
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
                        className="px-3 py-1.5 rounded-lg bg-rose-800 text-white font-bold text-sm hover:bg-rose-900 transition disabled:opacity-50"
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

            {!deleteError && confirmingDelete && (
              <div className="max-w-xl p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-2">
                <p className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                  <TriangleAlert className="h-4 w-4" /> متأكد من حذف {staff.name}؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    {isDeleting ? "جاري الحذف..." : "نعم، احذف"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="px-4 py-1.5 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-100 transition"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}

      {/* لوحة تعديل منزلقة بدل صف موسّع يزيح الجدول كله للأسفل — تحافظ على
          موضعك بالقائمة أثناء التعديل، خصوصاً مع نمو عدد الموظفين. تُركَّب
          عبر Portal لخارج الجدول لأن <div> غير صالح كابن مباشر لـ <tbody>. */}
      {editing && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setEditing(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto p-6" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">تعديل {staff.name}</h3>
              <button type="button" onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <StaffEditForm staff={staff} allStaff={allStaff} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
            <div className="pt-4 mt-4 border-t border-slate-200">
              <StaffCredentialsForm staffId={staff.id} currentUsername={staff.username} />
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200">
              <StaffEvaluationsDocuments staffId={staff.id} />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
