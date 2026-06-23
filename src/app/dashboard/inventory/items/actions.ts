"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addProductionItem, updateProductionItem } from "@/lib/production-data";

export async function createItemAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const original_name = formData.get("original_name") as string;
  const unit_of_measure = formData.get("unit_of_measure") as string || "وحدة";
  const item_source = formData.get("item_source") as string || "manufactured";
  const cost_price = Number(formData.get("cost_price"));
  const profit_margin = Number(formData.get("profit_margin"));
  
  const final_selling_price_cents = Math.round(cost_price * 100 * (1 + profit_margin / 100));

  const itemData = {
    item_code,
    original_name,
    unit_of_measure,
    item_source,
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

  revalidatePath("/dashboard/inventory/items");
  redirect("/dashboard/inventory/items");
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

  try {
    await updateProductionItem(item_code, updates);
  } catch (error) {
    console.error("Failed to update item pricing:", error);
    throw new Error("فشل تحديث سعر الصنف");
  }

  revalidatePath("/dashboard/inventory/items");
}

export async function updateItemDetailsAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const approved_name = formData.get("approved_name") as string;
  const main_category_id = formData.get("main_category_id") as string | null;
  const sub_category_id = formData.get("sub_category_id") as string | null;
  const pricing_status = formData.get("pricing_status") as string;

  const updates = {
    approved_name,
    main_category_id: main_category_id || null,
    sub_category_id: sub_category_id || null,
    pricing_status,
    updated_at: new Date().toISOString()
  };

  try {
    await updateProductionItem(item_code, updates);
  } catch (error) {
    console.error("Failed to update item details:", error);
    throw new Error("فشل تحديث بيانات الصنف");
  }

  revalidatePath("/dashboard/inventory/items");
  revalidatePath(`/dashboard/inventory/items/${encodeURIComponent(item_code)}`);
}
