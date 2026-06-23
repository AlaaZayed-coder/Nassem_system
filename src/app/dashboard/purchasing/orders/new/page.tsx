import { getSuppliers } from "@/lib/purchasing-data";
import { getProductionItems } from "@/lib/production-data";
import { getWarehouses } from "@/lib/inventory-data";
import { ArrowRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { NewPurchaseOrderForm } from "./new-po-form";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: { item?: string } }) {
  const [suppliers, items, warehouses] = await Promise.all([
    getSuppliers(),
    getProductionItems(),
    getWarehouses()
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6" dir="rtl">
      <div>
        <Link href="/dashboard/purchasing/orders" className="text-sm font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 mb-2 transition">
          <ArrowRight className="h-4 w-4" /> العودة لأوامر الشراء
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-rose-600" />
          إنشاء أمر شراء جديد
        </h1>
        <p className="text-slate-500 mt-2">اختر المورد، حدد المستودع، وقم بإضافة الأصناف المطلوبة.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <NewPurchaseOrderForm 
          suppliers={suppliers} 
          items={items} 
          warehouses={warehouses} 
          preselectedItem={searchParams.item} 
        />
      </div>
    </div>
  );
}
