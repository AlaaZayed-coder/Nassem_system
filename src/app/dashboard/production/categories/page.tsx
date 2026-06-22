import { getCategories } from "@/lib/production-data";
import { CategoryManager } from "@/components/production/category-manager";
import { FolderTree } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6" dir="rtl">
      <div className="flex items-center gap-3">
        <FolderTree className="h-8 w-8 text-indigo-600" />
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">إدارة التصنيفات</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <CategoryManager categories={categories} />
      </div>
    </div>
  );
}
