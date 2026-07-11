import { getCustomersWithStats } from "@/lib/customers-data";
import { CustomersTable } from "@/components/customers/customers-table";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getCustomersWithStats();

  return (
    <div className="p-8 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <Users className="h-8 w-8 text-indigo-600" />
          العملاء
        </h1>
        <p className="text-slate-500 mt-2">سجل العملاء ونشاطهم عبر المبيعات وطلبيات الأبواب.</p>
      </div>

      <CustomersTable initialCustomers={customers} />
    </div>
  );
}
