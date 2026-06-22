import { getItemByCode } from "@/lib/production-data";
import { ItemPricingForm } from "@/components/production/item-pricing-form";
import { Package, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditItemPage({ params }: { params: { item_code: string } }) {
  const code = decodeURIComponent(params.item_code);
  const item = await getItemByCode(code);

  if (!item) {
    notFound();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6" dir="rtl">
      <div className="flex items-center gap-4 mb-2">
        <Link 
          href="/dashboard/production/items"
          className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              {item.original_name}
            </h1>
            <p className="text-slate-500 text-sm font-mono mt-1">كود: {item.item_code}</p>
          </div>
        </div>
      </div>

      <ItemPricingForm item={item} />
    </div>
  );
}
