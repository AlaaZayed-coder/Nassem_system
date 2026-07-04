import Link from "next/link";
import { Package, Factory, LayoutDashboard, DoorClosed } from "lucide-react";

export default function ProductionPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">إدارة الإنتاج والتسعير</h1>
        <p className="text-slate-500 mt-2">المركز الرئيسي للتحكم في الأصناف، التسعير التلقائي، وأوامر التصنيع (Kanban).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/production/orders" className="group p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer flex flex-col items-start gap-4">
          <div className="p-4 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform">
            <Factory className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">أوامر الإنتاج (Kanban)</h2>
            <p className="text-slate-500 mt-1">إدارة أوامر التصنيع، تحريك الطلبات بين الحالات (قيد التنفيذ، منتهي) بطريقة تفاعلية.</p>
          </div>
        </Link>

        <Link href="/dashboard/production/door-orders" className="group p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer flex flex-col items-start gap-4">
          <div className="p-4 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform">
            <DoorClosed className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">طلبيات أبواب الرول</h2>
            <p className="text-slate-500 mt-1">إدخال طلبيات الأبواب، الدناجل، ووجوه الأبواب ببياناتها الفنية ومتابعة حالتها.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
