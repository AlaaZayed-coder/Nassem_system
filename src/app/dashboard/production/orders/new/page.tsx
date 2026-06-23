"use client";

import { useState, useTransition, useEffect } from "react";
import { createProductionOrderAction } from "../actions";
import { getProductionItems } from "@/lib/production-data";
import { Factory, Save, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewProductionOrderPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<any[]>([]);

  // Form State
  const [itemCode, setItemCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [priority, setPriority] = useState("عادي");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getProductionItems().then(setItems);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("item_code", itemCode);
        formData.append("quantity", quantity);
        formData.append("priority", priority);
        formData.append("notes", notes);
        
        await createProductionOrderAction(formData);
        router.push("/dashboard/production/orders");
      } catch (err: any) {
        alert("حدث خطأ: " + err.message);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Factory className="h-8 w-8 text-emerald-600" />
            أمر إنتاج جديد
          </h1>
          <p className="text-slate-500 mt-2">إنشاء أمر تصنيع داخلي لزيادة المخزون من منتج معين.</p>
        </div>
        <Link href="/dashboard/production/orders" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للقائمة
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">اختر المنتج أو الصنف *</label>
          <select 
            required
            value={itemCode} 
            onChange={e => setItemCode(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition bg-slate-50"
          >
            <option value="">-- اختر من القائمة --</option>
            {items.map(item => (
              <option key={item.item_code} value={item.item_code}>
                {item.item_code} - {item.original_name} {item.approved_name ? `(${item.approved_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الكمية المطلوبة *</label>
            <input 
              required 
              type="number" 
              min="1" 
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الأولوية</label>
            <select 
              value={priority} 
              onChange={e => setPriority(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition bg-slate-50"
            >
              <option value="عادي">عادي</option>
              <option value="عالي">عالي (مستعجل)</option>
              <option value="منخفض">منخفض</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات لفريق المصنع</label>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            rows={4} 
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" 
            placeholder="تعليمات إضافية، مقاسات خاصة..."
          ></textarea>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button disabled={isPending} type="submit" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg disabled:opacity-50 text-lg">
            <Save className="h-5 w-5" />
            {isPending ? "جاري الإنشاء..." : "إنشاء أمر الإنتاج"}
          </button>
        </div>

      </form>
    </div>
  );
}
