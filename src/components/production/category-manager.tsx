"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Trash2, Folder, Layers, AlertCircle } from "lucide-react";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/dashboard/production/categories/actions";

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const mainCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const handleSave = (id: string, parentId: string | null) => {
    if (!editName.trim()) return;
    const formData = new FormData();
    formData.append("id", id);
    formData.append("name", editName);
    if (parentId) formData.append("parent_id", parentId);

    startTransition(async () => {
      try {
        setError("");
        await updateCategoryAction(formData);
        setEditingId(null);
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleAdd = (parentId: string | null) => {
    const name = prompt(parentId ? "اسم التصنيف الفرعي الجديد:" : "اسم التصنيف الرئيسي الجديد:");
    if (!name?.trim()) return;

    const formData = new FormData();
    formData.append("name", name);
    if (parentId) formData.append("parent_id", parentId);

    startTransition(async () => {
      try {
        setError("");
        await createCategoryAction(formData);
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟ سيتم رفض الحذف إذا كان مرتبطاً بأصناف.")) return;
    const formData = new FormData();
    formData.append("id", id);

    startTransition(async () => {
      try {
        setError("");
        await deleteCategoryAction(formData);
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <div className="p-6">
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-200">
          <AlertCircle className="h-5 w-5" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Folder className="h-5 w-5 text-indigo-500" />
          التصنيفات الرئيسية
        </h2>
        <button
          onClick={() => handleAdd(null)}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          إضافة تصنيف رئيسي
        </button>
      </div>

      <div className="space-y-6">
        {mainCategories.map((mainCat) => (
          <div key={mainCat.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Folder className="h-6 w-6 text-indigo-400" />
                {editingId === mainCat.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-1 border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSave(mainCat.id, null)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-bold"
                    >
                      حفظ
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-sm font-bold"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <h3 className="font-bold text-lg text-slate-800">{mainCat.name}</h3>
                )}
              </div>
              
              {!editingId && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingId(mainCat.id); setEditName(mainCat.name); }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(mainCat.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 pl-12 bg-slate-50">
              <div className="flex justify-between items-center mb-4 pl-4">
                <h4 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  التصنيفات الفرعية
                </h4>
                <button
                  onClick={() => handleAdd(mainCat.id)}
                  disabled={isPending}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-100 transition disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  إضافة فرعي
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getSubcategories(mainCat.id).map((subCat) => (
                  <div key={subCat.id} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-indigo-200 transition">
                    {editingId === subCat.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 border border-indigo-300 rounded text-sm outline-none flex-1"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave(subCat.id, mainCat.id)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold"
                        >
                          حفظ
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-slate-700 text-sm">{subCat.name}</span>
                        <div className="flex items-center">
                          <button
                            onClick={() => { setEditingId(subCat.id); setEditName(subCat.name); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(subCat.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {getSubcategories(mainCat.id).length === 0 && (
                  <div className="col-span-full p-4 border border-dashed border-slate-300 rounded-xl text-center text-sm text-slate-400">
                    لا يوجد تصنيفات فرعية
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {mainCategories.length === 0 && (
          <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            لا توجد تصنيفات رئيسية بعد.
          </div>
        )}
      </div>
    </div>
  );
}
