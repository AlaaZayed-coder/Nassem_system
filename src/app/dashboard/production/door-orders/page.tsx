import Link from "next/link";
import { getDoorOrders } from "@/lib/door-orders-data";
import { DoorOrdersTable } from "@/components/production/door-orders-table";
import { DoorClosed, Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DoorOrdersPage() {
  const orders = await getDoorOrders();

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <DoorClosed className="h-10 w-10 text-emerald-600" />
            طلبيات أبواب الرول
          </h1>
          <p className="text-slate-500 mt-2 text-lg">إدخال ومتابعة طلبيات الأبواب، الدناجل، ووجوه الأبواب.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/production" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
            <ArrowRight className="h-4 w-4" /> العودة للإنتاج
          </Link>
          <Link href="/dashboard/production/door-orders/new" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition shadow">
            <Plus className="h-5 w-5" />
            طلبية باب جديدة
          </Link>
        </div>
      </div>

      <DoorOrdersTable initialOrders={orders} />
    </div>
  );
}
