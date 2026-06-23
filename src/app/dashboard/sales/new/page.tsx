"use client";

import { useState, useTransition, useEffect } from "react";
import { createSalesOpportunityAction, createCustomerAction } from "@/app/dashboard/sales/actions";
import { getCustomers, Customer } from "@/lib/sales-data";
import { supabase } from "@/lib/supabase";
import { Target, UserPlus, Save, ArrowRight, Plus, Trash2, Wrench, Factory } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewSalesOpportunityPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  
  // Form State
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerId, setCustomerId] = useState("");
  
  // New Customer State
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");

  // Order Items State
  const [lines, setLines] = useState<{ id: string, type: 'product' | 'maintenance' | 'manufacturing', itemCode: string, quantity: number, unitPriceCents: number, description: string, lineNotes: string, unit: string }[]>([]);
  
  // Order State
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getCustomers().then(setCustomers);
    // Fetch Items for the dropdown
    supabase.from("erp_items").select("item_code, original_name, approved_name, final_selling_price_cents, unit_of_measure").then(({ data }) => {
      if (data) setAvailableItems(data);
    });
  }, []);

  const addLine = (type: 'product' | 'maintenance' | 'manufacturing') => {
    setLines([...lines, { 
      id: Math.random().toString(), 
      type, 
      itemCode: "", 
      quantity: 1, 
      unitPriceCents: 0,
      description: "",
      lineNotes: "",
      unit: "وحدة"
    }]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: string, value: any) => {
    setLines(lines.map(l => {
      if (l.id === id) {
        const newLine = { ...l, [field]: value };
        if (field === 'itemCode' && newLine.type === 'product') {
          const item = availableItems.find(i => i.item_code === value);
          if (item) {
            newLine.unitPriceCents = item.final_selling_price_cents || 0;
            newLine.unit = item.unit_of_measure || "وحدة";
          }
        }
        return newLine;
      }
      return l;
    }));
  };

  const totalAmountCents = lines.reduce((sum, line) => sum + (line.quantity * line.unitPriceCents), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.length === 0) {
      alert("الرجاء إضافة صنف واحد على الأقل للطلبية");
      return;
    }

    startTransition(async () => {
      try {
        let finalCustomerId = customerId;

        // If new customer, create it first
        if (isNewCustomer) {
          const custData = new FormData();
          custData.append("name", custName);
          custData.append("phone", custPhone);
          custData.append("address", custAddress);
          const newCust = await createCustomerAction(custData);
          finalCustomerId = newCust.id;
        }

        const linesJson = JSON.stringify(lines);

        // Create Order
        const oppData = new FormData();
        oppData.append("customer_id", finalCustomerId);
        oppData.append("total_amount_cents", totalAmountCents.toString());
        oppData.append("expected_revenue_cents", totalAmountCents.toString()); // Probability is 100%
        oppData.append("win_probability_percent", "100");
        oppData.append("notes", notes);
        oppData.append("status", "تسجيل الطلب");
        oppData.append("lines", linesJson);

        await createSalesOpportunityAction(oppData);
        router.push("/dashboard/sales");
      } catch (err: any) {
        alert("حدث خطأ: " + err.message);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Target className="h-8 w-8 text-indigo-600" />
            طلبية فعلية جديدة
          </h1>
          <p className="text-slate-500 mt-2">تسجيل طلبات العملاء الفعلية (جاهزة، صيانة، أو تصنيع مخصص).</p>
        </div>
        <Link href="/dashboard/sales" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للقائمة
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        
        {/* Customer Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-500" />
              بيانات العميل
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button type="button" onClick={() => setIsNewCustomer(false)} className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${!isNewCustomer ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>عميل حالي</button>
              <button type="button" onClick={() => setIsNewCustomer(true)} className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${isNewCustomer ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>عميل جديد</button>
            </div>
          </div>

          {!isNewCustomer ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">اختر العميل</label>
              <select 
                required={!isNewCustomer}
                value={customerId} 
                onChange={e => setCustomerId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition bg-slate-50"
              >
                <option value="">-- اختر عميلاً من القائمة --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم العميل بالكامل *</label>
                <input required={isNewCustomer} type="text" value={custName} onChange={e => setCustName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">رقم الجوال</label>
                <input type="text" value={custPhone} onChange={e => setCustPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left" placeholder="059..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">عنوان العميل</label>
                <input type="text" value={custAddress} onChange={e => setCustAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" placeholder="المدينة، الحي..." />
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Line Items Section */}
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div className="flex flex-col md:flex-row items-center justify-between pb-2 border-b border-slate-100 gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              أصناف وتفاصيل الطلبية
            </h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => addLine('product')} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-indigo-100 transition">
                <Plus className="h-4 w-4" /> صنف جاهز (مبيعات)
              </button>
              <button type="button" onClick={() => addLine('manufacturing')} className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-sky-100 transition">
                <Factory className="h-4 w-4" /> طلب تصنيع
              </button>
              <button type="button" onClick={() => addLine('maintenance')} className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-amber-100 transition">
                <Wrench className="h-4 w-4" /> طلب صيانة
              </button>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              يرجى إضافة صنف مبيعات، تصنيع، أو صيانة للبدء
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 px-4 text-xs font-bold text-slate-500 hidden md:grid">
                <div className="col-span-5">الصنف / الوصف وملاحظات التصنيع</div>
                <div className="col-span-2 text-center">الكمية</div>
                <div className="col-span-2 text-center">سعر الوحدة (₪)</div>
                <div className="col-span-2 text-center">الإجمالي (₪)</div>
                <div className="col-span-1"></div>
              </div>
              
              {lines.map((line) => (
                <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="md:col-span-5 flex flex-col gap-2">
                    {line.type === 'product' ? (
                      <select required value={line.itemCode} onChange={e => updateLine(line.id, 'itemCode', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none">
                        <option value="">اختر صنفاً...</option>
                        {availableItems.map(i => (
                          <option key={i.item_code} value={i.item_code}>{i.approved_name || i.original_name} {i.unit_of_measure ? `(بـ ${i.unit_of_measure})` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <input required type="text" placeholder={line.type === 'manufacturing' ? "مثال: تصنيع باب خشبي..." : "وصف عطل الصيانة..."} value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none" />
                    )}
                    
                    {/* Line Notes for specific instructions */}
                    <input type="text" placeholder="ملاحظات تفصيلية (مقاسات، ألوان...)" value={line.lineNotes} onChange={e => updateLine(line.id, 'lineNotes', e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white outline-none" />

                    <div className="flex gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${
                        line.type === 'product' ? 'bg-indigo-100 text-indigo-700' : 
                        line.type === 'manufacturing' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {line.type === 'product' ? 'منتج مبيعات' : line.type === 'manufacturing' ? 'تصنيع مخصص' : 'طلب صيانة'}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1 md:hidden">الكمية ({line.unit})</label>
                    <div className="relative">
                      <input required type="number" step="0.01" min="0.01" value={line.quantity || ''} onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))} className="w-full px-3 py-2 pr-12 rounded-lg border border-slate-300 outline-none text-center" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{line.unit}</div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1 md:hidden">سعر الوحدة</label>
                    <input required type="number" step="0.01" value={line.unitPriceCents / 100} onChange={e => updateLine(line.id, 'unitPriceCents', Math.round(Number(e.target.value) * 100))} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-center dir-ltr" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1 md:hidden">الإجمالي</label>
                    <div className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-center font-mono font-bold text-slate-800 dir-ltr">
                      {((line.quantity * line.unitPriceCents) / 100).toFixed(2)}
                    </div>
                  </div>

                  <div className="md:col-span-1 flex justify-center mt-2 md:mt-0">
                    <button type="button" onClick={() => removeLine(line.id)} className="p-2 text-rose-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg transition border border-slate-200 shadow-sm w-full md:w-auto">
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {lines.length > 0 && (
            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <span className="font-bold text-indigo-900">إجمالي الطلب:</span>
              <span className="font-black font-mono text-2xl text-indigo-600" dir="ltr">₪ {(totalAmountCents / 100).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* General Opportunity Details */}
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات عامة على الطلب</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" placeholder="مثال: يرجى التواصل مع العميل قبل التسليم..."></textarea>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button disabled={isPending} type="submit" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg disabled:opacity-50 text-lg">
            <Save className="h-5 w-5" />
            {isPending ? "جاري الحفظ..." : "تأكيد الطلبية"}
          </button>
        </div>

      </form>
    </div>
  );
}
