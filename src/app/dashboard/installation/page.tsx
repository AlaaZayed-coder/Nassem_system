import Link from "next/link";
import { getInstallationQueue } from "@/lib/door-orders-data";
import { InstallationTable } from "@/components/installation/installation-table";
import { Truck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstallationPage() {
  const orders = await getInstallationQueue();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Truck className="h-8 w-8 text-indigo-600" />
            التركيب
          </h1>
          <p className="text-slate-500 mt-2">الطلبيات الجاهزة للتوريد لفريق التركيب، من سند الإخراج حتى تأكيد استلام العميل.</p>
        </div>
        <Link href="/dashboard/production/door-orders" className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowRight className="h-4 w-4" /> طلبيات الأبواب
        </Link>
      </div>

      <InstallationTable initialOrders={orders} />
    </div>
  );
}
