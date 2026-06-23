import { getSuppliers } from "@/lib/purchasing-data";
import { Users, Plus, Phone, MapPin, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { NewSupplierModal } from "./new-supplier-modal";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/purchasing" className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2 transition">
            <ArrowRight className="h-4 w-4" /> العودة للمشتريات
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-indigo-600" />
            إدارة الموردين
          </h1>
        </div>
        <NewSupplierModal />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="p-4">اسم المورد</th>
              <th className="p-4">معلومات التواصل</th>
              <th className="p-4">العنوان</th>
              <th className="p-4">الرصيد المالي</th>
              <th className="p-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-bold text-slate-800">{supplier.name}</td>
                <td className="p-4 text-slate-600 space-y-1 text-xs">
                  {supplier.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> <span dir="ltr">{supplier.phone}</span></div>}
                  {supplier.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> <span>{supplier.email}</span></div>}
                  {!supplier.phone && !supplier.email && <span className="text-slate-400">لا يوجد</span>}
                </td>
                <td className="p-4 text-slate-600 text-xs">
                  {supplier.address ? (
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {supplier.address}</div>
                  ) : <span className="text-slate-400">-</span>}
                </td>
                <td className="p-4 text-slate-800 font-mono font-bold" dir="ltr">
                  {formatCurrency(supplier.balance_cents / 100)}
                </td>
                <td className="p-4 text-center">
                  <button className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition">
                    تعديل
                  </button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-medium bg-slate-50">
                  لا يوجد موردين مسجلين بعد. ابدأ بإضافة مورد جديد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
