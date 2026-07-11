import { getStaffList } from "@/lib/staff-data";
import { AgendaView } from "./agenda-view";
import { ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const staff = await getStaffList();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <ListChecks className="h-8 w-8 text-indigo-600" />
          الأجندة اليومية
        </h1>
        <p className="text-slate-500 mt-2">
          كل ما يحتاج متابعة أو عملاً حسب دورك الوظيفي. لا يوجد تسجيل دخول لكل موظف بعد، لذا حدّد اسمك ليُطابَق دورك تلقائياً.
        </p>
      </div>

      <AgendaView staff={staff} />
    </div>
  );
}
