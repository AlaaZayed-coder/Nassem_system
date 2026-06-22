"use client";

import { useState, useTransition } from "react";
import { updateItemDetailsAction } from "@/app/dashboard/production/actions";
import { Save, AlertCircle } from "lucide-react";

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

type ItemInfoFormProps = {
  item: any;
  categories: Category[];
};

export function ItemInfoForm({ item, categories }: ItemInfoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [approvedName, setApprovedName] = useState(item.approved_name || item.original_name);
  const [pricingStatus, setPricingStatus] = useState(item.pricing_status || "غير مسعّر");
  const [mainCatId, setMainCatId] = useState(item.main_category_id || "");
  const [subCatId, setSubCatId] = useState(item.sub_category_id || "");

  const mainCategories = categories.filter((c) => !c.parent_id);
  const availableSubCategories = mainCatId ? categories.filter((c) => c.parent_id === mainCatId) : [];

  const handleMainCatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMainCatId(e.target.value);
    setSubCatId(""); // Reset sub category when main changes
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    
    const formData = new FormData();
    formData.append("item_code", item.item_code);
    formData.append("approved_name", approvedName);
    formData.append("pricing_status", pricingStatus);
    if (mainCatId) formData.append("main_category_id", mainCatId);
    if (subCatId) formData.append("sub_category_id", subCatId);

    startTransition(async () => {
      try {
        setError("");
        await updateItemDetailsAction(formData);
        setSuccess(true);
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" dir="rtl">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">البيانات الأساسية والتصنيف</h2>
          <p className="text-slate-500 text-sm mt-1">تعديل اسم الصنف ونقله بين التصنيفات</p>
        </div>
        {success && (
          <span className="text-green-600 bg-green-50 px-3 py-1 rounded-lg text-sm font-bold">
            تم الحفظ بنجاح ✓
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="p-6 flex flex-col gap-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-200">
            <AlertCircle className="h-5 w-5" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">كود الصنف</label>
            <input
              type="text"
              value={item.item_code}
              disabled
              className="px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed outline-none font-mono text-left"
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">الاسم الأصلي (للقراءة فقط)</label>
            <input
              type="text"
              value={item.original_name}
              disabled
              className="px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-bold text-indigo-700">الاسم المعتمد</label>
            <input
              type="text"
              value={approvedName}
              onChange={(e) => setApprovedName(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">التصنيف الرئيسي</label>
            <select
              value={mainCatId}
              onChange={handleMainCatChange}
              className="px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            >
              <option value="">بدون تصنيف</option>
              {mainCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">التصنيف الفرعي</label>
            <select
              value={subCatId}
              onChange={(e) => setSubCatId(e.target.value)}
              disabled={!mainCatId}
              className="px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition disabled:bg-slate-50 disabled:opacity-50"
            >
              <option value="">{mainCatId ? "اختر تصنيف فرعي..." : "يرجى اختيار تصنيف رئيسي أولاً"}</option>
              {availableSubCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">حالة التسعير</label>
            <select
              value={pricingStatus}
              onChange={(e) => setPricingStatus(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            >
              <option value="غير مسعّر">غير مسعّر</option>
              <option value="مسعّر">مسعّر</option>
              <option value="موقوف">موقوف</option>
            </select>
          </div>
        </div>

        <div className="flex items-center mt-4">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            حفظ البيانات
          </button>
        </div>
      </form>
    </div>
  );
}
