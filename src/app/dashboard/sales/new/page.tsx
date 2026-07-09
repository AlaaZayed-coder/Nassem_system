"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { createSalesOpportunityAction, createCustomerAction, linkSubmissionAndNotifySubmitterAction } from "@/app/dashboard/sales/actions";
import { getCustomers, Customer } from "@/lib/sales-data";
import { supabase } from "@/lib/supabase";
import { Target, UserPlus, Save, ArrowRight, Plus, Trash2, Wrench, DoorClosed, Layers, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewSalesOpportunityPage() {
  return (
    <Suspense fallback={null}>
      <NewSalesOpportunityPageInner />
    </Suspense>
  );
}

function NewSalesOpportunityPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submission_id");
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
  const [lines, setLines] = useState<{
    id: string, type: 'product' | 'maintenance' | 'manufacturing' | 'door' | 'slat', itemCode: string, quantity: number, unitPriceCents: number, description: string, lineNotes: string, unit: string,
    doorColor: string, doorLengthMm: string, doorHeightMm: string, doorProfileItemCode: string,
    doorHasCover: boolean, doorCoverWidthMm: string, doorCoverHeightMm: string,
    doorHasBox: boolean, doorBoxLengthMm: string, doorBoxHeightMm: string,
    doorGuidesSent: boolean, doorIsIndustrial: boolean, doorPipeLengthInch: string, doorGuidesOnly: boolean,
    slatColor: string, slatWidthMm: string, slatFinCount: string, slatFrontageCount: string,
    // ملحقات الباب (Parent-Child): ريش/جبهة وماتور مرتبطان بنفس طلبية التصنيع
    accNeedsSlat: boolean, accSlatQty: string,
    accNeedsMotor: boolean, accMotorMode: 'catalog' | 'new', accMotorItemCode: string, accMotorFreeText: string, accMotorQty: string,
  }[]>([]);
  // Order State
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getCustomers().then(setCustomers);
    const preselectCustomerId = searchParams.get("customer_id");
    if (preselectCustomerId) setCustomerId(preselectCustomerId);

    const newCustomerName = searchParams.get("new_customer_name");
    if (newCustomerName) {
      setIsNewCustomer(true);
      setCustName(newCustomerName);
      setCustPhone(searchParams.get("new_customer_phone") || "");
      setCustAddress(searchParams.get("new_customer_address") || "");
    }
    // Fetch Items for the dropdown
    supabase.from("erp_items").select("item_code, original_name, approved_name, final_selling_price_cents, unit_of_measure").then(({ data }) => {
      if (data) setAvailableItems(data);
    });
  }, []);

  const addLine = (type: 'product' | 'maintenance' | 'manufacturing' | 'door' | 'slat') => {
    setLines([...lines, {
      id: Math.random().toString(),
      type,
      itemCode: "",
      quantity: 1,
      unitPriceCents: 0,
      description: "",
      lineNotes: "",
      unit: "وحدة",
      doorColor: "", doorLengthMm: "", doorHeightMm: "", doorProfileItemCode: "",
      doorHasCover: false, doorCoverWidthMm: "", doorCoverHeightMm: "",
      doorHasBox: false, doorBoxLengthMm: "", doorBoxHeightMm: "",
      doorGuidesSent: false, doorIsIndustrial: false, doorPipeLengthInch: "", doorGuidesOnly: false,
      slatColor: "", slatWidthMm: "", slatFinCount: "", slatFrontageCount: "",
      accNeedsSlat: false, accSlatQty: "",
      accNeedsMotor: false, accMotorMode: 'catalog', accMotorItemCode: "", accMotorFreeText: "", accMotorQty: "1",
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

        const linesForSubmit = lines.map((l) => {
          if (l.type === "slat") {
            return {
              ...l,
              slatSpecs: {
                color: l.slatColor || undefined,
                width_mm: l.slatWidthMm ? Number(l.slatWidthMm) : undefined,
                fin_count: l.slatFinCount || undefined,
                frontage_count: l.slatFrontageCount ? Number(l.slatFrontageCount) : undefined,
                notes: l.lineNotes || undefined,
              },
            };
          }
          if (l.type !== "door") return l;
          return {
            ...l,
            doorSpecs: {
              item_code: l.itemCode,
              color: l.doorColor,
              length_mm: l.doorLengthMm ? Number(l.doorLengthMm) : undefined,
              height_mm: l.doorHeightMm ? Number(l.doorHeightMm) : undefined,
              profile_item_code: l.doorProfileItemCode || undefined,
              has_cover: l.doorHasCover,
              cover_width_mm: l.doorHasCover && l.doorCoverWidthMm ? Number(l.doorCoverWidthMm) : undefined,
              cover_height_mm: l.doorHasCover && l.doorCoverHeightMm ? Number(l.doorCoverHeightMm) : undefined,
              has_box: l.doorHasBox,
              box_length_mm: l.doorHasBox && l.doorBoxLengthMm ? Number(l.doorBoxLengthMm) : undefined,
              box_height_mm: l.doorHasBox && l.doorBoxHeightMm ? Number(l.doorBoxHeightMm) : undefined,
              guides_sent: l.doorGuidesSent,
              item_notes: l.lineNotes || undefined,
              is_industrial: l.doorIsIndustrial,
              pipe_length_inch: l.doorIsIndustrial && l.doorPipeLengthInch ? Number(l.doorPipeLengthInch) : undefined,
              guides_only: l.doorGuidesOnly,
              accessories: {
                needs_slat: l.accNeedsSlat,
                slat_qty: l.accNeedsSlat && l.accSlatQty ? Number(l.accSlatQty) : undefined,
                motor_item_code: l.accNeedsMotor && l.accMotorMode === 'catalog' ? l.accMotorItemCode || undefined : undefined,
                motor_free_text: l.accNeedsMotor && l.accMotorMode === 'new' ? l.accMotorFreeText || undefined : undefined,
                motor_quantity: l.accNeedsMotor && l.accMotorQty ? Number(l.accMotorQty) : undefined,
              },
            },
          };
        });
        const linesJson = JSON.stringify(linesForSubmit);

        // Create Order
        const oppData = new FormData();
        oppData.append("customer_id", finalCustomerId);
        oppData.append("total_amount_cents", totalAmountCents.toString());
        oppData.append("expected_revenue_cents", totalAmountCents.toString()); // Probability is 100%
        oppData.append("win_probability_percent", "100");
        oppData.append("notes", notes);
        oppData.append("status", "تسجيل الطلب");
        oppData.append("lines", linesJson);

        const createdOrder = await createSalesOpportunityAction(oppData);

        if (submissionId && createdOrder?.id) {
          await linkSubmissionAndNotifySubmitterAction(submissionId, createdOrder.id);
        }

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
                <Plus className="h-4 w-4" /> صنف جاهز
              </button>

              <button type="button" onClick={() => addLine('door')} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-emerald-100 transition">
                <DoorClosed className="h-4 w-4" /> تصنيع (باب رول + ملحقاته)
              </button>

              <button type="button" onClick={() => addLine('maintenance')} className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-amber-100 transition">
                <Wrench className="h-4 w-4" /> طلب صيانة
              </button>
              <button type="button" onClick={() => addLine('slat')} className="px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-teal-100 transition">
                <Layers className="h-4 w-4" /> ريش / جبهة (بدون باب)
              </button>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              يرجى إضافة صنف مبيعات، تصنيع، صيانة، أو طلب باب للبدء
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
              
              {lines.map((line) => line.type === 'slat' ? (
                <div key={line.id} className="bg-slate-50 p-5 rounded-2xl border border-teal-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded w-fit bg-teal-100 text-teal-700">ريش / جبهة</span>
                    <button type="button" onClick={() => removeLine(line.id)} className="p-1.5 text-rose-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg transition border border-slate-200">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">اللون</label>
                      <input type="text" value={line.slatColor} onChange={e => updateLine(line.id, 'slatColor', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">عرض الريشة/الجبهة (مم)</label>
                      <input type="number" value={line.slatWidthMm} onChange={e => updateLine(line.id, 'slatWidthMm', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none dir-ltr text-center" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">عدد الريش</label>
                      <input type="text" placeholder="مثال: 18+2+18+1" value={line.slatFinCount} onChange={e => updateLine(line.id, 'slatFinCount', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none dir-ltr text-center" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">عدد الجبهات</label>
                      <input type="number" value={line.slatFrontageCount} onChange={e => updateLine(line.id, 'slatFrontageCount', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none dir-ltr text-center" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ملاحظات (لون مختلف، موقع الريش، طريقة التركيب...)</label>
                    <textarea rows={2} value={line.lineNotes} onChange={e => updateLine(line.id, 'lineNotes', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none resize-none" placeholder="مثال: ريشتان بلون مختلف في المنتصف // تركيب خارجي" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">الكمية (م²)</label>
                      <input required type="number" step="0.01" min="0.01" value={line.quantity || ''} onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-center dir-ltr" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">سعر المتر المربع (₪)</label>
                      <input required type="number" step="0.01" value={line.unitPriceCents / 100} onChange={e => updateLine(line.id, 'unitPriceCents', Math.round(Number(e.target.value) * 100))} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-center dir-ltr" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500">الإجمالي</span>
                    <span className="font-mono font-bold text-slate-800" dir="ltr">{((line.quantity * line.unitPriceCents) / 100).toFixed(2)}</span>
                  </div>
                </div>
              ) : line.type === 'door' ? (
                <div key={line.id} className="bg-slate-50 p-5 rounded-2xl border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded w-fit bg-emerald-100 text-emerald-700">طلب باب رول</span>
                    <button type="button" onClick={() => removeLine(line.id)} className="p-1.5 text-rose-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg transition border border-slate-200">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                    <label className="flex items-center gap-2 text-xs font-bold text-sky-800 cursor-pointer">
                      <input type="checkbox" checked={line.doorGuidesOnly} onChange={e => updateLine(line.id, 'doorGuidesOnly', e.target.checked)} className="h-4 w-4" />
                      مجرى فقط الآن (سيُستكمل الباب لاحقاً)
                    </label>
                    {line.doorGuidesOnly && (
                      <p className="text-[11px] text-sky-700 mt-1 mr-6">
                        يكفي إدخال الارتفاع الآن — تبقى الطلبية &quot;قيد الاستكمال&quot; حتى تُضاف بقية المواصفات لاحقاً على نفس الصنف.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">نوع الباب/الدنجل/الوجه (Item No.)</label>
                      <select required value={line.itemCode} onChange={e => updateLine(line.id, 'itemCode', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none">
                        <option value="">اختر صنفاً...</option>
                        {availableItems.map(i => (
                          <option key={i.item_code} value={i.item_code}>{i.approved_name || i.original_name}</option>
                        ))}
                      </select>
                    </div>
                    {!line.doorGuidesOnly && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">اللون</label>
                        <input type="text" value={line.doorColor} onChange={e => updateLine(line.id, 'doorColor', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none" />
                      </div>
                    )}
                    <div className="flex items-end pb-2 gap-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={line.doorGuidesSent} onChange={e => updateLine(line.id, 'doorGuidesSent', e.target.checked)} className="h-4 w-4" />
                        المجاري بالورشة
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {!line.doorGuidesOnly && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">الطول L (مم)</label>
                        <input type="number" value={line.doorLengthMm} onChange={e => updateLine(line.id, 'doorLengthMm', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none dir-ltr text-center" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">الارتفاع H (مم)</label>
                      <input required={line.doorGuidesOnly} type="number" value={line.doorHeightMm} onChange={e => updateLine(line.id, 'doorHeightMm', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none dir-ltr text-center" />
                    </div>
                    {!line.doorGuidesOnly && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1">البروفيل (اختياري)</label>
                        <select value={line.doorProfileItemCode} onChange={e => updateLine(line.id, 'doorProfileItemCode', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none">
                          <option value="">-- بدون بروفيل --</option>
                          {availableItems.map(i => (
                            <option key={i.item_code} value={i.item_code}>{i.approved_name || i.original_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {!line.doorGuidesOnly && (
                  <>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
                      <input type="checkbox" checked={line.doorIsIndustrial} onChange={e => updateLine(line.id, 'doorIsIndustrial', e.target.checked)} className="h-4 w-4" />
                      باب صناعي (Industrial Door) — بدون احتساب زنبركات
                    </label>
                    {line.doorIsIndustrial && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-amber-800">طول الماسورة (إنش)</label>
                        <input type="number" value={line.doorPipeLengthInch} onChange={e => updateLine(line.id, 'doorPipeLengthInch', e.target.value)} className="w-28 px-2 py-1.5 rounded-lg border border-amber-200 outline-none text-sm dir-ltr text-center" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={line.doorHasCover} onChange={e => updateLine(line.id, 'doorHasCover', e.target.checked)} className="h-4 w-4" />
                        إضافة شاشية (Cover)
                      </label>
                      {line.doorHasCover && (
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" placeholder="العرض (مم)" value={line.doorCoverWidthMm} onChange={e => updateLine(line.id, 'doorCoverWidthMm', e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
                          <input type="number" placeholder="الارتفاع (مم)" value={line.doorCoverHeightMm} onChange={e => updateLine(line.id, 'doorCoverHeightMm', e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
                        </div>
                      )}
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={line.doorHasBox} onChange={e => updateLine(line.id, 'doorHasBox', e.target.checked)} className="h-4 w-4" />
                        إضافة صندوق (Box)
                      </label>
                      {line.doorHasBox && (
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" placeholder="الطول (مم)" value={line.doorBoxLengthMm} onChange={e => updateLine(line.id, 'doorBoxLengthMm', e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
                          <input type="number" placeholder="الارتفاع (مم)" value={line.doorBoxHeightMm} onChange={e => updateLine(line.id, 'doorBoxHeightMm', e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
                        </div>
                      )}
                    </div>
                  </div>
                  </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ملاحظات الصنف</label>
                    <textarea rows={2} value={line.lineNotes} onChange={e => updateLine(line.id, 'lineNotes', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none resize-none" placeholder="أي تفاصيل إضافية خاصة بهذا الصنف..." />
                  </div>

                  {/* ملحقات الباب: ريش/جبهة وماتور — Parent-Child مرتبط بنفس طلبية التصنيع */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-3">
                    <div className="text-xs font-bold text-indigo-900">ملحقات الباب (اختياري)</div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={line.accNeedsSlat} onChange={e => updateLine(line.id, 'accNeedsSlat', e.target.checked)} className="h-4 w-4" />
                        <Layers className="h-3.5 w-3.5 text-teal-600" /> يحتاج ريش / جبهة
                      </label>
                      {line.accNeedsSlat && (
                        <input
                          type="number"
                          placeholder="الكمية"
                          value={line.accSlatQty}
                          onChange={e => updateLine(line.id, 'accSlatQty', e.target.value)}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-xs dir-ltr text-center"
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={line.accNeedsMotor} onChange={e => updateLine(line.id, 'accNeedsMotor', e.target.checked)} className="h-4 w-4" />
                        <Zap className="h-3.5 w-3.5 text-amber-600" /> يحتاج ماتور
                      </label>
                    </div>

                    {line.accNeedsMotor && (
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit">
                          <button type="button" onClick={() => updateLine(line.id, 'accMotorMode', 'catalog')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition ${line.accMotorMode === 'catalog' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                            من الكتالوج
                          </button>
                          <button type="button" onClick={() => updateLine(line.id, 'accMotorMode', 'new')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition ${line.accMotorMode === 'new' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                            صنف غير موجود
                          </button>
                        </div>

                        {line.accMotorMode === 'catalog' ? (
                          <select value={line.accMotorItemCode} onChange={e => updateLine(line.id, 'accMotorItemCode', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm">
                            <option value="">ابحث واختر الماتور...</option>
                            {availableItems.map(i => (
                              <option key={i.item_code} value={i.item_code}>{i.approved_name || i.original_name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="اكتب اسم/موديل الماتور — سيُنشأ طلب شراء تلقائياً"
                            value={line.accMotorFreeText}
                            onChange={e => updateLine(line.id, 'accMotorFreeText', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm"
                          />
                        )}
                        <input
                          type="number"
                          placeholder="الكمية"
                          value={line.accMotorQty}
                          onChange={e => updateLine(line.id, 'accMotorQty', e.target.value)}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-xs dir-ltr text-center"
                        />
                        <p className="text-[10px] text-indigo-700">
                          يتحقق النظام تلقائياً من توفر الماتور بالمخزون؛ إن لم يتوفر يُنشئ طلب شراء تلقائي لقسم المشتريات.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">سعر الباب (₪)</label>
                      <input required type="number" step="0.01" value={line.unitPriceCents / 100} onChange={e => updateLine(line.id, 'unitPriceCents', Math.round(Number(e.target.value) * 100))} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-center dir-ltr" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">الإجمالي</label>
                      <div className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-center font-mono font-bold text-slate-800 dir-ltr">
                        {(line.unitPriceCents / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
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
                    <label className="block text-xs text-slate-500 mb-1 md:hidden">سعر ({line.unit})</label>
                    <div className="relative">
                      <input required type="number" step="0.01" value={line.unitPriceCents / 100} onChange={e => updateLine(line.id, 'unitPriceCents', Math.round(Number(e.target.value) * 100))} className="w-full px-3 py-2 pr-14 rounded-lg border border-slate-300 outline-none text-center dir-ltr" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] bg-slate-100 px-1 py-0.5 rounded">لكل {line.unit}</div>
                    </div>
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
