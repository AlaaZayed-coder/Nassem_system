"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { createPurchaseOrderAction } from "../actions";

export function NewPurchaseOrderForm({ suppliers, items, warehouses, preselectedItem }: { suppliers: any[], items: any[], warehouses: any[], preselectedItem?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  
  const [selectedItems, setSelectedItems] = useState<{ item_code: string; quantity: number; unit_cost_cents: number }[]>(
    preselectedItem ? [{ item_code: preselectedItem, quantity: 1, unit_cost_cents: 0 }] : []
  );

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { item_code: "", quantity: 1, unit_cost_cents: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    (newItems[index] as any)[field] = value;
    setSelectedItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Add items as JSON
    const validItems = selectedItems.filter(i => i.item_code !== "" && i.quantity > 0);
    if (validItems.length === 0) {
      setError("يجب إضافة صنف واحد على الأقل بكمية صحيحة");
      return;
    }
    
    formData.append("items", JSON.stringify(validItems));

    startTransition(async () => {
      setError("");
      const res = await createPurchaseOrderAction(formData);
      if (res.success) {
        router.push(`/dashboard/purchasing/orders/${res.id}`);
      } else {
        setError(res.message || "حدث خطأ أثناء الإنشاء");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl font-bold border border-red-100">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-700">المورد *</label>
          <select name="supplier_id" required className="p-3 rounded-xl border border-slate-300 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition">
            <option value="">-- اختر المورد --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {suppliers.length === 0 && <p className="text-xs text-rose-500 mt-1">يجب إضافة موردين أولاً من شاشة إدارة الموردين</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-700">مستودع الاستلام (الوجهة) *</label>
          <select name="warehouse_id" required className="p-3 rounded-xl border border-slate-300 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition">
            <option value="">-- اختر المستودع --</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700">ملاحظات (اختياري)</label>
          <input type="text" name="notes" className="p-3 rounded-xl border border-slate-300 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition" placeholder="مثال: شحنة عاجلة..." />
        </div>
      </div>

      {/* Items List */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">الأصناف المطلوبة</h3>
          <button type="button" onClick={handleAddItem} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 px-3 py-1.5 rounded-lg text-sm font-bold transition shadow-sm">
            <Plus className="h-4 w-4" /> إضافة صنف
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {selectedItems.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-4">لم يتم إضافة أي أصناف بعد. اضغط على الزر أعلاه لإضافة صنف.</p>
          ) : (
            selectedItems.map((item, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الصنف</label>
                  <select 
                    value={item.item_code} 
                    onChange={(e) => updateItem(idx, "item_code", e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:border-rose-500 text-sm"
                  >
                    <option value="">-- اختر الصنف --</option>
                    {items.map(i => (
                      <option key={i.item_code} value={i.item_code}>
                        {i.item_code} - {i.approved_name || i.original_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full md:w-32">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الكمية</label>
                  <input 
                    type="number" 
                    min="0.01" step="0.01" required
                    value={item.quantity || ""}
                    onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:border-rose-500 text-sm font-mono dir-ltr text-left" 
                    placeholder="0" 
                  />
                </div>

                <div className="w-full md:w-32">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">سعر الوحدة</label>
                  <input 
                    type="number" 
                    min="0" step="0.01" required
                    value={item.unit_cost_cents ? item.unit_cost_cents / 100 : ""}
                    onChange={(e) => updateItem(idx, "unit_cost_cents", Math.round(parseFloat(e.target.value) * 100))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:border-rose-500 text-sm font-mono dir-ltr text-left" 
                    placeholder="0.00" 
                  />
                </div>

                <button type="button" onClick={() => handleRemoveItem(idx)} className="p-2.5 text-rose-500 hover:bg-rose-100 rounded-lg transition" title="حذف">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <button type="submit" disabled={isPending} className="py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-lg transition flex justify-center items-center gap-2 shadow-md disabled:opacity-50">
        <Check className="h-6 w-6" /> اعتماد أمر الشراء
      </button>
    </form>
  );
}
