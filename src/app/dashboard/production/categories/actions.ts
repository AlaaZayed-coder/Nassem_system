"use server";

import { revalidatePath } from "next/cache";
import { addCategory, updateCategory, deleteCategory } from "@/lib/production-data";

export async function createCategoryAction(formData: FormData) {
  const name = formData.get("name") as string;
  const parent_id = formData.get("parent_id") as string | null;
  const type = "منتجات";

  try {
    await addCategory({ name, parent_id: parent_id || null, type });
  } catch (error) {
    console.error("Failed to add category:", error);
    throw new Error("فشل إضافة التصنيف");
  }

  revalidatePath("/dashboard/production/categories");
  revalidatePath("/dashboard/production/items");
}

export async function updateCategoryAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const parent_id = formData.get("parent_id") as string | null;

  const updates: any = { name };
  if (parent_id !== undefined) {
    updates.parent_id = parent_id || null;
  }

  try {
    await updateCategory(id, updates);
  } catch (error) {
    console.error("Failed to update category:", error);
    throw new Error("فشل تحديث التصنيف");
  }

  revalidatePath("/dashboard/production/categories");
  revalidatePath("/dashboard/production/items");
}

export async function deleteCategoryAction(formData: FormData) {
  const id = formData.get("id") as string;

  try {
    await deleteCategory(id);
  } catch (error) {
    console.error("Failed to delete category:", error);
    throw new Error("فشل حذف التصنيف. قد يكون هناك أصناف مرتبطة به.");
  }

  revalidatePath("/dashboard/production/categories");
  revalidatePath("/dashboard/production/items");
}
