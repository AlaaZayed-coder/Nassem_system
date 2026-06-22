import { useState, useTransition } from "react";
import { Search, Package, ArrowUpRight, Edit2, Save, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { updateItemPricingAction } from "@/app/dashboard/production/actions";

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

  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [costPrice, setCostPrice] = useState(0);
  const [profitMargin, setProfitMargin] = useState(35);
  const [isPending, startTransition] = useTransition();

  const categories = Array.from(new Set(items.map((i) => i.erp_categories?.name).filter(Boolean))) as string[];

  const filtered = items.filter((item) => {
    const matchesQuery = (item.original_name || "").includes(query) || (item.item_code || "").includes(query);
    const matchesCategory = selectedCategory ? item.erp_categories?.name === selectedCategory : true;
    return matchesQuery && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setCostPrice((item.cost_price_cents || 0) / 100);
    setProfitMargin(item.profit_margin_percent || 35);
  };

  const handleSave = () => {
    if (!editingItem) return;
    const finalPrice = Math.round(costPrice * (1 + profitMargin / 100));
    
    const formData = new FormData();
    formData.append("item_code", editingItem.item_code);
    formData.append("cost_price", costPrice.toString());
    formData.append("final_price", finalPrice.toString());
    formData.append("profit_margin", profitMargin.toString());

    startTransition(async () => {
      await updateItemPricingAction(formData);
      setEditingItem(null);
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
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-sm border-b border-slate-200">
              <th className="p-4 font-bold">كود الصنف</th>
              <th className="p-4 font-bold">اسم الصنف</th>
              <th className="p-4 font-bold">التصنيف</th>
              <th className="p-4 font-bold text-center">حالة التسعير</th>
              <th className="p-4 font-bold">التكلفة</th>
              <th className="p-4 font-bold">سعر البيع النهائي</th>
              <th className="p-4 font-bold w-24"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <tr key={item.item_code} className="border-b border-slate-100 hover:bg-slate-50 transition group">
                  <td className="p-4 font-mono text-sm text-slate-500">{item.item_code}</td>
                  <td className="p-4 font-medium text-slate-800">
                    {item.approved_name || item.original_name}
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {item.erp_categories?.name || "—"}
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
                  <td className="p-4 text-sm font-medium text-slate-600">
                    {item.cost_price_cents ? formatCurrency(item.cost_price_cents) : "—"}
                  </td>
                  <td className="p-4 text-sm font-bold text-indigo-700">
                    {item.final_selling_price_cents ? formatCurrency(item.final_selling_price_cents) : "—"}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-amber-500 hover:bg-amber-50 transition"
                        title="تعديل سريع"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/dashboard/production/items/${item.item_code}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="فتح التفاصيل"
                      >
                        <ArrowUpRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
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

      {/* Quick Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">تعديل سريع للتسعير</h3>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-bold text-indigo-600 mb-1">{editingItem.item_code}</p>
                <p className="text-slate-800 font-medium">{editingItem.original_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">التكلفة (شيقل)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice || ""}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-left dir-ltr font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">هامش الربح (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-left dir-ltr font-mono"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 p-3 rounded-lg flex items-center justify-between border border-indigo-100">
                <span className="text-sm font-bold text-indigo-800">السعر النهائي:</span>
                <span className="font-bold font-mono text-indigo-700">
                  {formatCurrency(Math.round(costPrice * (1 + profitMargin / 100)) * 100)}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isPending ? "جاري الحفظ..." : "حفظ التعديل"}
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-2 rounded-lg hover:bg-slate-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
