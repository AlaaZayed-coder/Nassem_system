"use client";

import { useState, useTransition } from "react";
import { addProductionMaterialAction } from "../actions";
import { PackageSearch, Plus, Check } from "lucide-react";

export function OrderMaterialsManager({ orderId, materials, warehouses, inventory }: { orderId: string, materials: any[], warehouses: any[], inventory: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("production_order_id", orderId);

    startTransition(async () => {
      try {
        setError("");
        await addProductionMaterialAction(formData);
        setShowAdd(false);
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <PackageSearch className="h-5 w-5 text-indigo-500" />
          المواد الخام المستهلكة
        </h2>
        {!showAdd && (
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold transition"
          >
            <Plus className="h-4 w-4" /> إضافة مادة
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="mb-8 bg-slate-50 p-5 rounded-2xl border border-indigo-100 relative">
          <h3 className="font-bold text-slate-700 mb-4 text-sm">تسجيل استهلاك مادة جديدة</h3>
          {error && <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المادة الخام (الصنف)</label>
              <select name="item_code" required className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-sm">
                <option value="">-- اختر المادة --</option>
                {inventory.map(inv => (
                  <option key={inv.item_code} value={inv.item_code}>
                    {inv.item_code} - {inv.approved_name || inv.original_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الكمية المستهلكة</label>
              <input type="number" name="quantity_used" required min="0.01" step="0.01" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono dir-ltr text-left text-sm" placeholder="0" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">سحب من مستودع</label>
              <select name="warehouse_id" required className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-sm">
                <option value="">-- اختر المستودع --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات (اختياري)</label>
              <input type="text" name="notes" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm" placeholder="..." />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">إلغاء</button>
            <button disabled={isPending} type="submit" className="flex items-center gap-1 px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition disabled:opacity-50">
              <Check className="h-4 w-4" /> حفظ وسحب من المخزون
            </button>
          </div>
        </form>
      )}

      {materials.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm font-medium">لم يتم تسجيل أي مواد مستهلكة لهذا الطلب بعد.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3">المادة</th>
                <th className="p-3 text-center">الكمية المستهلكة</th>
                <th className="p-3">المستودع</th>
                <th className="p-3">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materials.map(mat => (
                <tr key={mat.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-slate-800">
                    {mat.erp_items?.approved_name || mat.erp_items?.original_name || mat.item_code}
                    <span className="block text-xs text-slate-400 font-mono mt-0.5">{mat.item_code}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-block bg-rose-50 text-rose-700 font-black font-mono px-2 py-0.5 rounded text-sm">
                      -{mat.quantity_used}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 font-medium">
                    {mat.erp_warehouses?.name || 'غير محدد'}
                  </td>
                  <td className="p-3 text-slate-500 text-xs" dir="ltr">
                    {new Date(mat.created_at).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
