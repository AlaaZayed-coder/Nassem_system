"use client";

import { useState, useTransition, useEffect } from "react";
import { createDoorOrderAction } from "../actions";
import { createCustomerAction } from "@/app/dashboard/sales/actions";
import { getCustomers, Customer } from "@/lib/sales-data";
import { getStaffList, Staff } from "@/lib/staff-data";
import { supabase } from "@/lib/supabase";
import { DoorClosed, UserPlus, Save, ArrowRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ItemOption = { item_code: string; original_name: string; approved_name: string | null };

type DoorItemRow = {
  id: string;
  item_code: string;
  color: string;
  length_mm: string;
  height_mm: string;
  profile_item_code: string;
  has_cover: boolean;
  cover_width_mm: string;
  cover_height_mm: string;
  has_box: boolean;
  box_length_mm: string;
  box_height_mm: string;
  guides_sent: boolean;
  item_notes: string;
  is_industrial: boolean;
  pipe_length_inch: string;
};

function newDoorItemRow(): DoorItemRow {
  return {
    id: Math.random().toString(),
    item_code: "",
    color: "",
    length_mm: "",
    height_mm: "",
    profile_item_code: "",
    has_cover: false,
    cover_width_mm: "",
    cover_height_mm: "",
    has_box: false,
    box_length_mm: "",
    box_height_mm: "",
    guides_sent: false,
    item_notes: "",
    is_industrial: false,
    pipe_length_inch: "",
  };
}

export default function NewDoorOrderPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [customerNameNote, setCustomerNameNote] = useState("");

  const [orderType, setOrderType] = useState("توريد");
  const [responsibleStaffId, setResponsibleStaffId] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  const [doorItems, setDoorItems] = useState<DoorItemRow[]>([newDoorItemRow()]);

  useEffect(() => {
    getCustomers().then(setCustomers);
    getStaffList().then(setStaff);
    supabase.from("erp_items").select("item_code, original_name, approved_name").eq("is_active", true).then(({ data }) => {
      if (data) setItems(data);
    });
  }, []);

  const addDoorItem = () => setDoorItems([...doorItems, newDoorItemRow()]);
  const removeDoorItem = (id: string) => setDoorItems(doorItems.filter((d) => d.id !== id));
  const updateDoorItem = (id: string, field: keyof DoorItemRow, value: any) => {
    setDoorItems(doorItems.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (doorItems.some((d) => !d.item_code)) {
      alert("يجب اختيار نوع الصنف لكل عنصر في الطلبية");
      return;
    }

    startTransition(async () => {
      try {
        let finalCustomerId = customerId;

        if (isNewCustomer) {
          const custData = new FormData();
          custData.append("name", custName);
          custData.append("phone", custPhone);
          custData.append("address", custAddress);
          const newCust = await createCustomerAction(custData);
          finalCustomerId = newCust.id;
        }

        const itemsPayload = doorItems.map((d) => ({
          item_code: d.item_code,
          color: d.color,
          length_mm: d.length_mm ? Number(d.length_mm) : undefined,
          height_mm: d.height_mm ? Number(d.height_mm) : undefined,
          profile_item_code: d.profile_item_code || undefined,
          has_cover: d.has_cover,
          cover_width_mm: d.cover_width_mm ? Number(d.cover_width_mm) : undefined,
          cover_height_mm: d.cover_height_mm ? Number(d.cover_height_mm) : undefined,
          has_box: d.has_box,
          box_length_mm: d.box_length_mm ? Number(d.box_length_mm) : undefined,
          box_height_mm: d.box_height_mm ? Number(d.box_height_mm) : undefined,
          guides_sent: d.guides_sent,
          item_notes: d.item_notes,
          is_industrial: d.is_industrial,
          pipe_length_inch: d.pipe_length_inch ? Number(d.pipe_length_inch) : undefined,
        }));

        const formData = new FormData();
        formData.append("customer_id", finalCustomerId);
        formData.append("order_type", orderType);
        formData.append("responsible_staff_id", responsibleStaffId);
        formData.append("customer_name_note", customerNameNote);
        formData.append("general_notes", generalNotes);
        formData.append("items", JSON.stringify(itemsPayload));

        const order = await createDoorOrderAction(formData);
        router.push(`/dashboard/production/door-orders/${order.id}`);
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
            <DoorClosed className="h-8 w-8 text-emerald-600" />
            طلبية باب رول جديدة
          </h1>
          <p className="text-slate-500 mt-2">تسجيل طلبية أبواب/دناجل/وجوه أبواب جديدة.</p>
        </div>
        <Link href="/dashboard/production/door-orders" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> العودة للقائمة
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        {/* Customer Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-500" />
              بيانات العميل
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button type="button" onClick={() => setIsNewCustomer(false)} className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${!isNewCustomer ? "bg-white shadow text-emerald-600" : "text-slate-500 hover:text-slate-700"}`}>عميل حالي</button>
              <button type="button" onClick={() => setIsNewCustomer(true)} className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${isNewCustomer ? "bg-white shadow text-emerald-600" : "text-slate-500 hover:text-slate-700"}`}>عميل جديد</button>
            </div>
          </div>

          {!isNewCustomer ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">اختر العميل</label>
              <select required={!isNewCustomer} value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition bg-slate-50">
                <option value="">-- اختر عميلاً من القائمة --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ""}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم العميل بالكامل *</label>
                <input required={isNewCustomer} type="text" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">رقم الجوال</label>
                <input type="text" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none dir-ltr text-left" placeholder="059..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">عنوان العميل</label>
                <input type="text" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">توضيح إضافي لاسم العميل (اختياري)</label>
            <input type="text" value={customerNameNote} onChange={(e) => setCustomerNameNote(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none" placeholder="مثال: فرع الشمال، جوال الابن..." />
          </div>
        </div>

        {/* Order Meta Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">نوع الطلبية</label>
            <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none bg-slate-50">
              <option value="توريد">توريد</option>
              <option value="توريد وتركيب">توريد وتركيب</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">مسؤول الطلبية</label>
            <select value={responsibleStaffId} onChange={(e) => setResponsibleStaffId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none bg-slate-50">
              <option value="">-- بدون تحديد --</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Door Items Section */}
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <DoorClosed className="h-5 w-5 text-emerald-500" />
              أصناف الطلبية (أبواب / دناجل / وجوه أبواب)
            </h2>
            <button type="button" onClick={addDoorItem} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-emerald-100 transition">
              <Plus className="h-4 w-4" /> إضافة صنف
            </button>
          </div>

          <div className="space-y-4">
            {doorItems.map((d, idx) => (
              <div key={d.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">صنف #{idx + 1}</span>
                  {doorItems.length > 1 && (
                    <button type="button" onClick={() => removeDoorItem(d.id)} className="p-1.5 text-rose-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg transition border border-slate-200">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">نوع الباب/الدنجل/الوجه (Item No.)</label>
                    <select required value={d.item_code} onChange={(e) => updateDoorItem(d.id, "item_code", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none">
                      <option value="">اختر صنفاً...</option>
                      {items.map((i) => (
                        <option key={i.item_code} value={i.item_code}>{i.approved_name || i.original_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">اللون</label>
                    <input type="text" value={d.color} onChange={(e) => updateDoorItem(d.id, "color", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none" />
                  </div>
                  <div className="flex items-end pb-2 gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={d.guides_sent} onChange={(e) => updateDoorItem(d.id, "guides_sent", e.target.checked)} className="h-4 w-4" />
                      المجاري بالورشة (Guides Sent)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">الطول L (مم)</label>
                    <input type="number" value={d.length_mm} onChange={(e) => updateDoorItem(d.id, "length_mm", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none dir-ltr text-center" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">الارتفاع H (مم)</label>
                    <input type="number" value={d.height_mm} onChange={(e) => updateDoorItem(d.id, "height_mm", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none dir-ltr text-center" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">البروفيل (اختياري)</label>
                    <select value={d.profile_item_code} onChange={(e) => updateDoorItem(d.id, "profile_item_code", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none">
                      <option value="">-- بدون بروفيل --</option>
                      {items.map((i) => (
                        <option key={i.item_code} value={i.item_code}>{i.approved_name || i.original_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
                    <input type="checkbox" checked={d.is_industrial} onChange={(e) => updateDoorItem(d.id, "is_industrial", e.target.checked)} className="h-4 w-4" />
                    باب صناعي (Industrial Door) — بدون احتساب زنبركات
                  </label>
                  {d.is_industrial && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-amber-800">طول الماسورة (إنش)</label>
                      <input type="number" value={d.pipe_length_inch} onChange={(e) => updateDoorItem(d.id, "pipe_length_inch", e.target.value)} className="w-28 px-2 py-1.5 rounded-lg border border-amber-200 outline-none text-sm dir-ltr text-center" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={d.has_cover} onChange={(e) => updateDoorItem(d.id, "has_cover", e.target.checked)} className="h-4 w-4" />
                      إضافة شاشية (Cover)
                    </label>
                    {d.has_cover && (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="العرض (مم)" value={d.cover_width_mm} onChange={(e) => updateDoorItem(d.id, "cover_width_mm", e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
                        <input type="number" placeholder="الارتفاع (مم)" value={d.cover_height_mm} onChange={(e) => updateDoorItem(d.id, "cover_height_mm", e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={d.has_box} onChange={(e) => updateDoorItem(d.id, "has_box", e.target.checked)} className="h-4 w-4" />
                      إضافة صندوق (Box)
                    </label>
                    {d.has_box && (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="الطول (مم)" value={d.box_length_mm} onChange={(e) => updateDoorItem(d.id, "box_length_mm", e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
                        <input type="number" placeholder="الارتفاع (مم)" value={d.box_height_mm} onChange={(e) => updateDoorItem(d.id, "box_height_mm", e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-center" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ملاحظات الصنف</label>
                  <textarea rows={2} value={d.item_notes} onChange={(e) => updateDoorItem(d.id, "item_notes", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none resize-none" placeholder="أي تفاصيل إضافية خاصة بهذا الصنف..." />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Notes */}
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات عامة على الطلبية</label>
            <textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none" placeholder="ملاحظات عامة تخص الطلبية بالكامل..."></textarea>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button disabled={isPending} type="submit" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg disabled:opacity-50 text-lg">
            <Save className="h-5 w-5" />
            {isPending ? "جاري الحفظ..." : "حفظ الطلبية"}
          </button>
        </div>
      </form>
    </div>
  );
}
