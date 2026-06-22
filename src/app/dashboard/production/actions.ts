"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addProductionItem } from "@/lib/production-data";

export async function createItemAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const original_name = formData.get("original_name") as string;
  const cost_price = Number(formData.get("cost_price"));
  const profit_margin = Number(formData.get("profit_margin"));
  
  const final_selling_price_cents = Math.round(cost_price * 100 * (1 + profit_margin / 100));

  const itemData = {
    item_code,
    original_name,
    cost_price_cents: Math.round(cost_price * 100),
    profit_margin_percent: profit_margin,
    final_selling_price_cents,
    pricing_status: "مسعّر",
  };

  try {
    await addProductionItem(itemData);
  } catch (error) {
    console.error("Failed to add item:", error);
    throw new Error("فشل إضافة الصنف");
  }

  revalidatePath("/dashboard/production/items");
  redirect("/dashboard/production/items");
}

export async function updateItemPricingAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const cost_price = Number(formData.get("cost_price"));
  const final_price = Number(formData.get("final_price"));
  const profit_margin = Number(formData.get("profit_margin"));
  
  const updates = {
    cost_price_cents: Math.round(cost_price * 100),
    final_selling_price_cents: Math.round(final_price * 100),
    profit_margin_percent: profit_margin,
    pricing_status: "مسعّر",
    updated_at: new Date().toISOString()
  };

  const { updateProductionItem } = await import("@/lib/production-data");

  try {
    await updateProductionItem(item_code, updates);
  } catch (error) {
    console.error("Failed to update item pricing:", error);
    throw new Error("فشل تحديث سعر الصنف");
  }

  revalidatePath("/dashboard/production/items");
  redirect("/dashboard/production/items");
}
