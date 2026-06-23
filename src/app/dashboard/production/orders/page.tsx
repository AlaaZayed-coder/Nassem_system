import { Factory } from "lucide-react";
import Link from "next/link";
import { getProductionOrders } from "@/lib/production-data";
import { KanbanBoard } from "@/components/production/kanban-board";

export default async function ProductionOrdersPage() {
  const orders = await getProductionOrders();

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory className="h-8 w-8 text-emerald-600" />
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">أوامر الإنتاج (Kanban)</h1>
          </div>
          <Link href="/dashboard/production/orders/new" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-sm text-sm">
            + إضافة أمر إنتاج
          </Link>
        </div>
        <p className="text-slate-500 text-sm max-w-3xl">
          قم بإدارة حالة التصنيع لكل طلب. يمكنك نقل الطلبات من قسم لآخر بالضغط على القائمة المنسدلة داخل كل بطاقة لتحديث مسار العمل فورياً.
        </p>
      </div>

      <div className="w-full overflow-x-auto pb-4">
        <div className="min-w-[900px]">
          <KanbanBoard initialOrders={orders} />
        </div>
      </div>
    </div>
  );
}
