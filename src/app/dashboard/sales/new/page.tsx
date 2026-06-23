"use client";

import { useState, useTransition, useEffect } from "react";
import { createSalesOpportunityAction, createCustomerAction } from "@/app/dashboard/sales/actions";
import { getCustomers, Customer } from "@/lib/sales-data";
import { Target, UserPlus, Save, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewSalesOpportunityPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Form State
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerId, setCustomerId] = useState("");
  
  // New Customer State
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custTelegram, setCustTelegram] = useState("");

  // Order State
  const [totalAmount, setTotalAmount] = useState("");
  const [winProb, setWinProb] = useState("50");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getCustomers().then(setCustomers);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        let finalCustomerId = customerId;

        // If new customer, create it first
        if (isNewCustomer) {
          const custData = new FormData();
          custData.append("name", custName);
          custData.append("phone", custPhone);
          custData.append("telegram_chat_id", custTelegram);
          const newCust = await createCustomerAction(custData);
          finalCustomerId = newCust.id;
        }

        // Create Opportunity
        const oppData = new FormData();
        oppData.append("customer_id", finalCustomerId);
        oppData.append("total_amount_cents", Math.round(Number(totalAmount) * 100).toString());
        oppData.append("expected_revenue_cents", Math.round(Number(totalAmount) * 100 * (Number(winProb)/100)).toString());
        oppData.append("win_probability_percent", winProb);
        oppData.append("notes", notes);
        oppData.append("status", "تسجيل الطلب");

        await createSalesOpportunityAction(oppData);
        router.push("/dashboard/sales");
      } catch (err: any) {
        alert("حدث خطأ: " + err.message);
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Target className="h-8 w-8 text-indigo-600" />
            فرصة بيعية جديدة
          </h1>
          <p className="text-slate-500 mt-2">قم بتسجيل تفاصيل العميل والطلب للبدء في مسار المبيعات.</p>
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
                <label className="block text-sm font-bold text-slate-700 mb-2">معرف تليجرام (Telegram Chat ID) للمراسلة الآلية</label>
                <input type="text" value={custTelegram} onChange={e => setCustTelegram(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left" placeholder="مثال: 123456789" />
                <p className="text-xs text-slate-500 mt-2">سيتم استخدامه لإرسال إشعارات الأتمتة للعميل عندما يتم اعتماد طلبه.</p>
              </div>
            </div>
          )}
        </div>

        {/* Opportunity Details */}
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            تفاصيل الفرصة البيعية
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">القيمة المتوقعة للطلب (₪)</label>
              <input required type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-mono text-left dir-ltr" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">احتمالية الفوز (إتمام البيع) %</label>
              <input required type="number" min="0" max="100" value={winProb} onChange={e => setWinProb(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-mono text-left dir-ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">تفاصيل الطلب وملاحظات</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" placeholder="مثال: العميل مهتم بـ 5 أبواب خشبية من نوع X..."></textarea>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button disabled={isPending} type="submit" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg disabled:opacity-50 text-lg">
            <Save className="h-5 w-5" />
            {isPending ? "جاري الحفظ..." : "حفظ الفرصة البيعية"}
          </button>
        </div>

      </form>
    </div>
  );
}
