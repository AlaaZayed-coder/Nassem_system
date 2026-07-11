"use server";

import { revalidatePath } from "next/cache";
import { saveBomItemMapping, getBomItemMappings } from "@/lib/bom-inventory-data";
import { supabase } from "@/lib/supabase";

export async function getBomMappingDataAction() {
  const [mappings, { data: items }] = await Promise.all([
    getBomItemMappings(),
    supabase.from("erp_items").select("item_code, original_name, approved_name").eq("is_active", true),
  ]);
  return { mappings, items: items || [] };
}

export async function saveBomMappingAction(bomKey: string, itemCode: string): Promise<{ error?: string }> {
  if (!itemCode) return { error: "اختر صنفاً من الكتالوج" };
  try {
    await saveBomItemMapping(bomKey, itemCode);
  } catch (err: any) {
    return { error: err.message || "فشل الحفظ" };
  }
  revalidatePath("/dashboard/settings");
  return {};
}
