"use client";

import { useState, useTransition } from "react";
import { addDoorOrderElectronicsAction } from "../actions";
import { Cpu, Plus, Check } from "lucide-react";

type ItemOption = { item_code: string; original_name: string; approved_name: string | null };

export function ElectronicsManager({ doorOrderId, electronics, items }: { doorOrderId: string; electronics: any[]; items: ItemOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("door_order_id", doorOrderId);

    startTransition(async () => {
      try {
        setError("");
        await addDoorOrderElectronicsAction(formData);
        setShowAdd(false);
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Cpu className="h-5 w-5 text-sky-500" />
          الأصناف الإلكترونية
        </h2>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 px-3 py-1.5 rounded-lg text-sm font-bold transition">
            <Plus className="h-4 w-4" /> إضافة صنف
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="mb-6 bg-slate-50 p-5 rounded-2xl border border-sky-100">
          {error && <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الصنف (إن وُجد بالكتالوج)</label>
              <select name="item_code" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none bg-white text-sm">
                <option value="">-- عام / غير معرّف --</option>
                {items.map((i) => (
                  <option key={i.item_code} value={i.item_code}>{i.approved_name || i.original_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الوصف/الموديل</label>
              <input type="text" name="description" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm" placeholder="مثال: موتور 500كغم صيني" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الكمية</label>
              <input type="number" name="quantity" defaultValue={1} min="1" step="1" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm dir-ltr text-center" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">إلغاء</button>
            <button disabled={isPending} type="submit" className="flex items-center gap-1 px-4 py-2 text-sm font-bold bg-sky-600 text-white hover:bg-sky-700 rounded-xl transition disabled:opacity-50">
              <Check className="h-4 w-4" /> حفظ
            </button>
          </div>
        </form>
      )}

      {electronics.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm font-medium">لا توجد أصناف إلكترونية مضافة بعد.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {electronics.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
              <div>
                <span className="font-bold text-slate-800">{e.erp_items?.original_name || e.description || "صنف عام"}</span>
                {e.erp_items?.original_name && e.description && <span className="text-slate-500"> — {e.description}</span>}
              </div>
              <span className="font-mono font-bold text-slate-600">×{e.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
