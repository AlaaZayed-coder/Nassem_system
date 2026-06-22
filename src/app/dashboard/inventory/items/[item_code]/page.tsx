import { getItemByCode, getCategories } from "@/lib/production-data";
import { ItemPricingForm } from "@/components/production/item-pricing-form";
import { ItemInfoForm } from "@/components/production/item-info-form";
import { Package, ArrowRight, Settings2, DollarSign } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditItemPage({ params }: { params: { item_code: string } }) {
  const code = decodeURIComponent(params.item_code);
  const [item, categories] = await Promise.all([
    getItemByCode(code),
    getCategories()
  ]);

  if (!item) {
    notFound();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8" dir="rtl">
      <div className="flex items-center gap-4 mb-2">
        <Link 
          href="/dashboard/inventory/items"
          className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              {item.approved_name || item.original_name}
            </h1>
            <p className="text-slate-500 text-sm font-mono mt-1" dir="ltr">
              {item.item_code}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="font-bold flex items-center gap-2 text-slate-700">
            <Settings2 className="h-5 w-5 text-slate-400" />
            بيانات الصنف والتصنيف
          </h3>
          <ItemInfoForm item={item} categories={categories} />
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <h3 className="font-bold flex items-center gap-2 text-slate-700">
            <DollarSign className="h-5 w-5 text-slate-400" />
            التسعير
          </h3>
          <ItemPricingForm item={item} />
        </div>
      </div>
    </div>
  );
}
