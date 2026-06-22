"use client";

import { useState, useTransition } from "react";
import { Warehouse, InventoryItem } from "@/lib/inventory-data";
import { formatCurrency } from "@/lib/format";
import { Package, ArrowRightLeft, Plus, Minus, Search, X, Check, Calculator } from "lucide-react";
import { submitStockMovementAction, submitStockTransferAction } from "@/app/dashboard/inventory/actions";

type InventoryTableProps = {
  warehouses: Warehouse[];
  items: InventoryItem[];
};

export function InventoryTable({ warehouses, items }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeModal, setActiveModal] = useState<"MOVEMENT" | "TRANSFER" | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const filteredItems = items.filter(
    (item) =>
      item.approved_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openMovement = (item: InventoryItem) => {
    setSelectedItem(item);
    setActiveModal("MOVEMENT");
  };

  const openTransfer = (item: InventoryItem) => {
    setSelectedItem(item);
    setActiveModal("TRANSFER");
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="ابحث برمز الصنف أو اسمه..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
        />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="p-4 whitespace-nowrap">رمز الصنف</th>
              <th className="p-4">اسم الصنف</th>
              <th className="p-4">سعر التكلفة</th>
              <th className="p-4">سعر البيع</th>
              {warehouses.map((w) => (
                <th key={w.id} className="p-4 text-center bg-indigo-50/50">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-indigo-800">{w.name}</span>
                  </div>
                </th>
              ))}
              <th className="p-4 text-center">إجمالي المخزون</th>
              <th className="p-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const totalStock = Object.values(item.inventory).reduce((a, b) => a + b, 0);

              return (
                <tr key={item.item_code} className="hover:bg-slate-50/80 transition group">
                  <td className="p-4 text-slate-500 font-mono text-xs" dir="ltr">{item.item_code}</td>
                  <td className="p-4 font-bold text-slate-800 max-w-[200px] truncate" title={item.approved_name}>
                    {item.approved_name}
                  </td>
                  <td className="p-4 text-rose-600 font-medium font-mono" dir="ltr">
                    {formatCurrency(item.cost_price_cents / 100)}
                  </td>
                  <td className="p-4 text-emerald-600 font-bold font-mono" dir="ltr">
                    {formatCurrency(item.final_selling_price_cents / 100)}
                  </td>
                  {warehouses.map((w) => {
                    const qty = item.inventory[w.id] || 0;
                    return (
                      <td key={w.id} className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold font-mono ${
                          qty > 0 ? "bg-indigo-100 text-indigo-700" : 
                          qty < 0 ? "bg-red-100 text-red-700" : 
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {qty}
                        </span>
                      </td>
                    );
                  })}
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-xl font-black font-mono text-base ${
                      totalStock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"
                    }`}>
                      {totalStock}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openMovement(item)}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition"
                        title="إدخال/إخراج"
                      >
                        <Calculator className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openTransfer(item)}
                        className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg transition"
                        title="نقل بين المستودعات"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={7 + warehouses.length} className="p-8 text-center text-slate-400">
                  لا يوجد أصناف تطابق بحثك.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Movement Modal */}
      {activeModal === "MOVEMENT" && selectedItem && (
        <MovementModal item={selectedItem} warehouses={warehouses} onClose={closeModal} />
      )}

      {/* Transfer Modal */}
      {activeModal === "TRANSFER" && selectedItem && (
        <TransferModal item={selectedItem} warehouses={warehouses} onClose={closeModal} />
      )}
    </div>
  );
}

function MovementModal({ item, warehouses, onClose }: { item: InventoryItem; warehouses: Warehouse[]; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  
  const handleAction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("item_code", item.item_code);

    startTransition(async () => {
      try {
        setError("");
        await submitStockMovementAction(formData);
        onClose();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-800">إدارة كمية المخزون</h3>
            <p className="text-sm text-slate-500 mt-1">{item.approved_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleAction} className="p-6 flex flex-col gap-5">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>}
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">المستودع</label>
            <select name="warehouse_id" required className="p-3 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition">
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">نوع الحركة</label>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-emerald-50 has-[:checked]:bg-emerald-100 has-[:checked]:border-emerald-500 has-[:checked]:text-emerald-800 transition font-bold text-sm">
                <input type="radio" name="movement_type" value="IN" className="sr-only" defaultChecked />
                إدخال (+)
              </label>
              <label className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-rose-50 has-[:checked]:bg-rose-100 has-[:checked]:border-rose-500 has-[:checked]:text-rose-800 transition font-bold text-sm">
                <input type="radio" name="movement_type" value="OUT" className="sr-only" />
                إخراج (-)
              </label>
              <label className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-sky-50 has-[:checked]:bg-sky-100 has-[:checked]:border-sky-500 has-[:checked]:text-sky-800 transition font-bold text-sm">
                <input type="radio" name="movement_type" value="ADJUST" className="sr-only" />
                جرد (=)
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">الكمية</label>
            <input type="number" name="quantity" required min="0" step="0.01" className="p-3 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition font-mono text-left text-lg" dir="ltr" placeholder="0" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">ملاحظات (اختياري)</label>
            <input type="text" name="notes" className="p-3 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm" placeholder="مثال: استلام بضاعة جديدة..." />
          </div>

          <button type="submit" disabled={isPending} className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
            <Check className="h-5 w-5" />
            تنفيذ الحركة
          </button>
        </form>
      </div>
    </div>
  );
}

function TransferModal({ item, warehouses, onClose }: { item: InventoryItem; warehouses: Warehouse[]; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  
  const handleAction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("item_code", item.item_code);

    startTransition(async () => {
      try {
        setError("");
        await submitStockTransferAction(formData);
        onClose();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-purple-50">
          <div>
            <h3 className="font-bold text-lg text-purple-900">نقل مخزون</h3>
            <p className="text-sm text-purple-600 mt-1">{item.approved_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-purple-400 hover:bg-purple-200 rounded-full transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleAction} className="p-6 flex flex-col gap-5">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">من مستودع</label>
              <select name="from_warehouse_id" required className="p-3 rounded-xl border border-slate-300 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition bg-slate-50">
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} (متوفر: {item.inventory[w.id] || 0})</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">إلى مستودع</label>
              <select name="to_warehouse_id" required className="p-3 rounded-xl border border-slate-300 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition">
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">الكمية المنقولة</label>
            <input type="number" name="quantity" required min="0.01" step="0.01" className="p-3 rounded-xl border border-slate-300 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition font-mono text-left text-lg text-purple-700" dir="ltr" placeholder="0" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">ملاحظات (اختياري)</label>
            <input type="text" name="notes" className="p-3 rounded-xl border border-slate-300 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition text-sm" placeholder="سبب النقل..." />
          </div>

          <button type="submit" disabled={isPending} className="mt-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
            <ArrowRightLeft className="h-5 w-5" />
            تأكيد النقل
          </button>
        </form>
      </div>
    </div>
  );
}
