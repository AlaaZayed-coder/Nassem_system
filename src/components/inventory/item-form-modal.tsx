"use client";

import { useState } from "react";
import { createItemAction } from "@/app/dashboard/inventory/items/actions";
import { Calculator, PackagePlus, Save, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export function ItemFormModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [costPrice, setCostPrice] = useState<number>(0);
  const [profitMargin, setProfitMargin] = useState<number>(35); // Default 35%
  const [isPending, setIsPending] = useState(false);

  if (!isOpen) return null;

  const calculatedPriceCents = Math.round((costPrice * 100) * (1 + profitMargin / 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
              <PackagePlus className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">إضافة صنف جديد (تسعير)</h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <form 
            action={async (formData) => {
              setIsPending(true);
              try {
                await createItemAction(formData);
                onClose();
              } catch (err: any) {
                alert("حدث خطأ: " + err.message);
              } finally {
                setIsPending(false);
              }
            }} 
            className="p-6 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="item_code" className="block text-sm font-bold text-slate-700">كود الصنف (Item Code)</label>
                <input 
                  required
                  type="text" 
                  name="item_code" 
                  id="item_code" 
                  placeholder="مثال: NS-101" 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-mono text-left dir-ltr"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="original_name" className="block text-sm font-bold text-slate-700">اسم الصنف</label>
                <input 
                  required
                  type="text" 
                  name="original_name" 
                  id="original_name" 
                  placeholder="مثال: باب حديد مشغول" 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-6">
              <div className="flex items-center gap-2 mb-2 text-indigo-700">
                <Calculator className="h-5 w-5" />
                <h3 className="font-bold">معادلة التسعير التلقائية</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="cost_price" className="block text-sm font-bold text-slate-700">سعر التكلفة</label>
                  <div className="relative">
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      name="cost_price" 
                      id="cost_price" 
                      value={costPrice || ""}
                      onChange={(e) => setCostPrice(Number(e.target.value))}
                      placeholder="0.00" 
                      className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-left dir-ltr font-mono"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">ILS</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="profit_margin" className="block text-sm font-bold text-slate-700">هامش الربح المطلوب</label>
                  <div className="relative">
                    <input 
                      required
                      type="number" 
                      step="0.1"
                      name="profit_margin" 
                      id="profit_margin" 
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(Number(e.target.value))}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-left dir-ltr font-mono"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-indigo-600 text-white flex items-center justify-between shadow-inner">
                <span className="font-bold text-indigo-100">سعر البيع النهائي المتوقع:</span>
                <span className="text-2xl font-black font-mono">
                  {formatCurrency(calculatedPriceCents)}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isPending}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                {isPending ? "جاري الحفظ..." : "حفظ الصنف وتأكيد السعر"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
