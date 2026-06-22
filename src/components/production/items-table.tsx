"use client";

import { useState, useTransition } from "react";
import { Search, Package, ArrowUpRight, Edit2, X, Check } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { updateItemPricingAction } from "@/app/dashboard/inventory/items/actions";

type Item = {
  item_code: string;
  original_name: string;
  approved_name: string | null;
  pricing_status: string;
  final_selling_price_cents: number | null;
  cost_price_cents: number | null;
  profit_margin_percent?: number | null;
  erp_categories?: { name: string } | null;
};

export function ItemsTable({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState(0);
  const [editMargin, setEditMargin] = useState(35);
  const [isPending, startTransition] = useTransition();

  const categories = Array.from(new Set(items.map((i) => i.erp_categories?.name).filter(Boolean))) as string[];

  const filtered = items.filter((item) => {
    const matchesQuery = (item.original_name || "").includes(query) || (item.item_code || "").includes(query);
    const matchesCategory = selectedCategory ? item.erp_categories?.name === selectedCategory : true;
    return matchesQuery && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const startEditing = (item: Item) => {
    setEditingRowId(item.item_code);
    setEditCost((item.cost_price_cents || 0) / 100);
    setEditMargin(item.profit_margin_percent || 35);
  };

  const handleSaveRow = (item: Item) => {
    const finalPrice = Math.round(editCost * (1 + editMargin / 100));
    const formData = new FormData();
    formData.append("item_code", item.item_code);
    formData.append("cost_price", editCost.toString());
    formData.append("final_price", finalPrice.toString());
    formData.append("profit_margin", editMargin.toString());

    startTransition(async () => {
      try {
        await updateItemPricingAction(formData);
        setEditingRowId(null);
      } catch (err: any) {
        alert("فشل في حفظ السعر: " + err.message);
      }
    });
  };

  return (
    <div className="flex flex-col w-full relative">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
            placeholder="ابحث برمز أو اسم الصنف..."
            className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
            dir="rtl"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          className="w-full md:w-auto px-4 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm bg-white"
        >
          <option value="">كل التصنيفات</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <div className="text-sm font-bold text-slate-500 bg-slate-200 px-3 py-1.5 rounded-lg">
          العدد: {filtered.length} صنف
        </div>
      </div>

      <div className="overflow-x-auto w-full" dir="rtl">
        <table className="w-full text-right border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-sm border-b border-slate-200">
              <th className="p-4 font-bold">كود الصنف</th>
              <th className="p-4 font-bold">اسم الصنف</th>
              <th className="p-4 font-bold text-center">حالة التسعير</th>
              <th className="p-4 font-bold w-32">التكلفة (₪)</th>
              <th className="p-4 font-bold w-24">الربح (%)</th>
              <th className="p-4 font-bold w-32">السعر النهائي</th>
              <th className="p-4 font-bold w-24">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => {
                const isEditing = editingRowId === item.item_code;
                
                return (
                  <tr key={item.item_code} className={`border-b transition ${isEditing ? 'bg-indigo-50/50 border-indigo-100' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <td className="p-4 font-mono text-sm text-slate-500">{item.item_code}</td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{item.approved_name || item.original_name}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.erp_categories?.name || "—"}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                          item.pricing_status === "مسعّر"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.pricing_status || "غير مسعّر"}
                      </span>
                    </td>
                    
                    {/* Inline Edit Cells */}
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editCost || ""}
                          onChange={(e) => setEditCost(Number(e.target.value))}
                          className="w-24 px-2 py-1.5 border-2 border-indigo-300 rounded-lg focus:border-indigo-600 outline-none text-left dir-ltr font-mono text-sm"
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm font-medium text-slate-600">
                          {item.cost_price_cents ? formatCurrency(item.cost_price_cents) : "—"}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          type="number"
                          step="1"
                          value={editMargin || ""}
                          onChange={(e) => setEditMargin(Number(e.target.value))}
                          className="w-16 px-2 py-1.5 border-2 border-indigo-300 rounded-lg focus:border-indigo-600 outline-none text-left dir-ltr font-mono text-sm"
                        />
                      ) : (
                        <div className="text-sm font-medium text-slate-600">
                          {item.profit_margin_percent ? `${item.profit_margin_percent}%` : "—"}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {isEditing ? (
                        <div className="text-sm font-bold text-indigo-700 font-mono">
                          {formatCurrency(Math.round(editCost * (1 + editMargin / 100)) * 100)}
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-indigo-700 font-mono">
                          {item.final_selling_price_cents ? formatCurrency(item.final_selling_price_cents) : "—"}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSaveRow(item)}
                            disabled={isPending}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition"
                            title="حفظ السعر"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setEditingRowId(null)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                            title="إلغاء"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditing(item)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition"
                            title="تعديل مباشر"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/dashboard/inventory/items/${item.item_code}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 bg-slate-50 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="فتح التفاصيل"
                          >
                            <ArrowUpRight className="h-5 w-5" />
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  لا توجد أصناف مطابقة للبحث.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between" dir="ltr">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm font-bold text-slate-500">
            صفحة {currentPage} من {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
