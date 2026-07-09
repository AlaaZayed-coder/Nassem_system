"use client";

import { useState, useTransition } from "react";
import { completeDoorOrderItemAction } from "../actions";

export function CompleteDoorItemForm({ itemId, doorOrderId, guidesHeightMm }: { itemId: string; doorOrderId: string; guidesHeightMm: number | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hasCover, setHasCover] = useState(false);
  const [hasBox, setHasBox] = useState(false);
  const [isIndustrial, setIsIndustrial] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.append("item_id", itemId);
    formData.append("door_order_id", doorOrderId);
    startTransition(async () => {
      const result = await completeDoorOrderItemAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form action={handleSubmit} className="bg-sky-50 border border-sky-100 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold text-sky-800">استكمال بيانات الباب (تم إدخال المجرى فقط سابقاً)</p>
      {guidesHeightMm != null && (
        <p className="text-[11px] text-sky-700">
          ارتفاع المجرى المُدخل وقت التركيب المبكر: <span className="font-bold">{guidesHeightMm}</span> مم — قد يختلف عن ارتفاع الباب الفعلي، تحقق قبل الإدخال أدناه.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">اللون</label>
          <input name="color" type="text" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">الطول L (مم) *</label>
          <input required name="length_mm" type="number" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">الارتفاع الفعلي H (مم) *</label>
          <input required name="height_mm" type="number" defaultValue={guidesHeightMm ?? undefined} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">البروفيل (اختياري)</label>
          <input name="profile_item_code" type="text" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none text-sm" />
        </div>
      </div>

      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
          <input name="is_industrial" type="checkbox" checked={isIndustrial} onChange={(e) => setIsIndustrial(e.target.checked)} className="h-4 w-4" />
          باب صناعي
        </label>
        {isIndustrial && (
          <input name="pipe_length_inch" type="number" placeholder="طول الماسورة (إنش)" className="w-40 px-2 py-1 rounded-lg border border-amber-200 outline-none text-xs dir-ltr text-center" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input name="has_cover" type="checkbox" checked={hasCover} onChange={(e) => setHasCover(e.target.checked)} className="h-4 w-4" />
            إضافة شاشية
          </label>
          {hasCover && (
            <div className="grid grid-cols-2 gap-2">
              <input name="cover_width_mm" type="number" placeholder="العرض (مم)" className="px-2 py-1 rounded-lg border border-slate-300 outline-none text-xs dir-ltr text-center" />
              <input name="cover_height_mm" type="number" placeholder="الارتفاع (مم)" className="px-2 py-1 rounded-lg border border-slate-300 outline-none text-xs dir-ltr text-center" />
            </div>
          )}
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input name="has_box" type="checkbox" checked={hasBox} onChange={(e) => setHasBox(e.target.checked)} className="h-4 w-4" />
            إضافة صندوق
          </label>
          {hasBox && (
            <div className="grid grid-cols-2 gap-2">
              <input name="box_length_mm" type="number" placeholder="الطول (مم)" className="px-2 py-1 rounded-lg border border-slate-300 outline-none text-xs dir-ltr text-center" />
              <input name="box_height_mm" type="number" placeholder="الارتفاع (مم)" className="px-2 py-1 rounded-lg border border-slate-300 outline-none text-xs dir-ltr text-center" />
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-600 mb-1">ملاحظات</label>
        <textarea name="item_notes" rows={2} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none text-sm resize-none" />
      </div>

      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

      <button disabled={isPending} type="submit" className="w-full py-2 rounded-xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 transition disabled:opacity-50">
        {isPending ? "جارٍ الحفظ..." : "استكمال بيانات الباب"}
      </button>
    </form>
  );
}
