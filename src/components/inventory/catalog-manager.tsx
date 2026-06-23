"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Trash2, Folder, Layers, AlertCircle, Package, ArrowUpRight, Check, X, Search } from "lucide-react";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/dashboard/inventory/categories/actions";
import { updateItemPricingAction } from "@/app/dashboard/inventory/items/actions";
import { ExcelManager } from "@/components/inventory/excel-manager";
import { ItemFormModal } from "./item-form-modal";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

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

export function CatalogManager({ categories, items }: { categories: Category[], items: Item[] }) {
  const [isPending, startTransition] = useTransition();
  
  // Category State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [catError, setCatError] = useState("");

  // Items State
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Row Edit State
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState(0);
  const [editMargin, setEditMargin] = useState(35);

  const mainCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  // Selected Category filter
  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name;

  const filteredItems = items.filter((item) => {
    const matchesQuery = (item.original_name || "").includes(query) || (item.item_code || "").includes(query);
    const matchesCategory = selectedCategoryId ? item.erp_categories?.name === selectedCategoryName : true;
    return matchesQuery && matchesCategory;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Category Actions
  const handleSaveCat = (id: string, parentId: string | null) => {
    if (!editCatName.trim()) return;
    const formData = new FormData();
    formData.append("id", id);
    formData.append("name", editCatName);
    if (parentId) formData.append("parent_id", parentId);

    startTransition(async () => {
      try {
        setCatError("");
        await updateCategoryAction(formData);
        setEditingCatId(null);
      } catch (err: any) {
        setCatError(err.message);
      }
    });
  };

  const handleAddCat = (parentId: string | null) => {
    const name = prompt(parentId ? "اسم التصنيف الفرعي الجديد:" : "اسم التصنيف الرئيسي الجديد:");
    if (!name?.trim()) return;

    const formData = new FormData();
    formData.append("name", name);
    if (parentId) formData.append("parent_id", parentId);

    startTransition(async () => {
      try {
        setCatError("");
        await createCategoryAction(formData);
      } catch (err: any) {
        setCatError(err.message);
      }
    });
  };

  const handleDeleteCat = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟ سيتم رفض الحذف إذا كان مرتبطاً بأصناف.")) return;
    const formData = new FormData();
    formData.append("id", id);

    startTransition(async () => {
      try {
        setCatError("");
        await deleteCategoryAction(formData);
        if (selectedCategoryId === id) setSelectedCategoryId(null);
      } catch (err: any) {
        setCatError(err.message);
      }
    });
  };

  // Item Actions
  const startEditingRow = (item: Item) => {
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
    <div className="flex flex-col lg:flex-row gap-6 w-full items-start" dir="rtl">
      
      {/* Sidebar: Categories */}
      <div className="w-full lg:w-1/4 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col shrink-0">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Folder className="h-5 w-5 text-indigo-500" />
            التصنيفات
          </h2>
          <button
            onClick={() => handleAddCat(null)}
            disabled={isPending}
            className="p-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition"
            title="إضافة تصنيف رئيسي"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {catError && (
          <div className="m-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 border border-red-200 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-medium">{catError}</span>
          </div>
        )}

        <div className="p-2 overflow-y-auto max-h-[600px] space-y-1">
          <button 
            onClick={() => setSelectedCategoryId(null)}
            className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${selectedCategoryId === null ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Layers className="h-4 w-4" />
            الكل ({items.length})
          </button>

          {mainCategories.map((mainCat) => (
            <div key={mainCat.id} className="pt-2">
              <div className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${selectedCategoryId === mainCat.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                
                {editingCatId === mainCat.id ? (
                  <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="px-2 py-1 border border-indigo-300 rounded outline-none flex-1 w-full text-xs"
                      autoFocus
                    />
                    <button onClick={() => handleSaveCat(mainCat.id, null)} className="text-green-600 p-1"><Check className="h-3 w-3" /></button>
                    <button onClick={() => setEditingCatId(null)} className="text-slate-400 p-1"><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <>
                    <div 
                      className="flex items-center gap-2 flex-1 cursor-pointer" 
                      onClick={() => setSelectedCategoryId(mainCat.id)}
                    >
                      <Folder className={`h-4 w-4 ${selectedCategoryId === mainCat.id ? 'text-indigo-600' : 'text-indigo-400'}`} />
                      {mainCat.name}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={(e) => { e.stopPropagation(); setEditingCatId(mainCat.id); setEditCatName(mainCat.name); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleAddCat(mainCat.id); }} className="p-1 text-slate-400 hover:text-indigo-600"><Plus className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCat(mainCat.id); }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </>
                )}
              </div>

              {/* Subcategories */}
              <div className="pr-6 space-y-1 mt-1 border-r-2 border-slate-100 mr-2">
                {getSubcategories(mainCat.id).map(subCat => (
                  <div key={subCat.id} className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition ${selectedCategoryId === subCat.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    
                    {editingCatId === subCat.id ? (
                      <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          className="px-2 py-1 border border-indigo-300 rounded outline-none flex-1 w-full text-xs"
                          autoFocus
                        />
                        <button onClick={() => handleSaveCat(subCat.id, mainCat.id)} className="text-green-600 p-1"><Check className="h-3 w-3" /></button>
                        <button onClick={() => setEditingCatId(null)} className="text-slate-400 p-1"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <>
                        <div 
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => setSelectedCategoryId(subCat.id)}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          {subCat.name}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={(e) => { e.stopPropagation(); setEditingCatId(subCat.id); setEditCatName(subCat.name); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="h-3 w-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteCat(subCat.id); }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area: Items */}
      <div className="w-full lg:w-3/4 flex flex-col gap-4">
        
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-3 w-full md:w-1/2">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                placeholder="ابحث برمز أو اسم الصنف..."
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm bg-slate-50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <ExcelManager />
            <button
              onClick={() => setIsItemModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 transition shrink-0"
            >
              <Plus className="h-5 w-5" />
              إضافة صنف
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm border-b border-slate-200">
                  <th className="p-4 font-bold">كود الصنف</th>
                  <th className="p-4 font-bold">اسم الصنف والتصنيف</th>
                  <th className="p-4 font-bold text-center">التسعير</th>
                  <th className="p-4 font-bold w-32">التكلفة (₪)</th>
                  <th className="p-4 font-bold w-24">الربح (%)</th>
                  <th className="p-4 font-bold w-32">السعر النهائي</th>
                  <th className="p-4 font-bold w-24 text-center">إجراء</th>
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

                        <td className="p-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
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
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => startEditingRow(item)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition"
                                title="تعديل مباشر للأسعار"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <Link
                                href={`/dashboard/inventory/items/${item.item_code}`}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 bg-slate-50 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                title="فتح ملف الصنف الكامل (تغيير التصنيف، الاسم، الخ)"
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
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      لا توجد أصناف مطابقة.
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
      </div>

      <ItemFormModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} />
    </div>
  );
}
