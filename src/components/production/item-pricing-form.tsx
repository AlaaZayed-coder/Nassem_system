"use client";

import { useState, useEffect } from "react";
import { updateItemPricingAction } from "@/app/dashboard/inventory/items/actions";
import { Save, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

type ItemPricingFormProps = {
  item: any;
};

export function ItemPricingForm({ item }: ItemPricingFormProps) {
  const [costPrice, setCostPrice] = useState((item.cost_price_cents || 0) / 100);
  const [profitMargin, setProfitMargin] = useState(item.profit_margin_percent || 35);
  const [finalPrice, setFinalPrice] = useState((item.final_selling_price_cents || 0) / 100);

  // Auto-calculate final price when cost or profit margin changes
  useEffect(() => {
    if (costPrice >= 0 && profitMargin >= 0) {
      setFinalPrice(Math.round(costPrice * (1 + profitMargin / 100)));
    }
  }, [costPrice, profitMargin]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" dir="rtl">
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800">تحديث سعر الصنف</h2>
        <p className="text-slate-500 text-sm mt-1">قم بإدخال التكلفة وهامش الربح المطلوب</p>
      </div>

      <form action={updateItemPricingAction} className="p-6 flex flex-col gap-6">
        <input type="hidden" name="item_code" value={item.item_code} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">كود الصنف</label>
            <input
              type="text"
              value={item.item_code}
              disabled
              className="px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">اسم الصنف</label>
            <input
              type="text"
              value={item.original_name}
              disabled
              className="px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">التكلفة (شيقل)</label>
            <input
              type="number"
              name="cost_price"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(Number(e.target.value))}
              required
              className="px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">نسبة الربح المستهدفة (%)</label>
            <input
              type="number"
              name="profit_margin"
              step="1"
              value={profitMargin}
              onChange={(e) => setProfitMargin(Number(e.target.value))}
              required
              className="px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              placeholder="15"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-indigo-700">سعر البيع النهائي المتوقع</label>
            <input
              type="number"
              name="final_price"
              step="0.01"
              value={finalPrice}
              onChange={(e) => setFinalPrice(Number(e.target.value))}
              required
              className="px-4 py-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 text-indigo-700 font-bold focus:border-indigo-500 outline-none transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm"
          >
            <Save className="h-5 w-5" />
            حفظ التسعير
          </button>
          
          <Link
            href="/dashboard/inventory/items"
            className="flex items-center gap-2 px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
          >
            إلغاء والعودة
          </Link>
        </div>
      </form>
    </div>
  );
}
