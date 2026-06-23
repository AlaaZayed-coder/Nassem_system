"use server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { calculateSuggested, calculateDoor, validateApproval } from "@/lib/pricing-service";
import { addAuditEntry, addPriceHistory } from "@/lib/audit-data";

export async function saveItemFullAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;

  // Fetch current item for audit diff
  const { data: current } = await supabase.from("erp_items").select("*").eq("item_code", item_code).single();

  const cost = formData.get("cost_price") ? Number(formData.get("cost_price")) * 100 : null;
  const margin = Number(formData.get("profit_margin_percent") || 0);
  const suggested = cost !== null ? calculateSuggested(cost, margin) : null;
  const finalPriceCents = formData.get("final_selling_price") ? Number(formData.get("final_selling_price")) * 100 : null;

  const doorEnabled = formData.get("door_pricing_enabled") === "1";
  const doorFields = {
    door_pricing_enabled: doorEnabled,
    door_unit_type: formData.get("door_unit_type") || "قطعة",
    width: formData.get("width") ? Number(formData.get("width")) : null,
    height: formData.get("height") ? Number(formData.get("height")) : null,
    area: formData.get("area") ? Number(formData.get("area")) : null,
    price_per_m2_cents: formData.get("price_per_m2") ? Number(formData.get("price_per_m2")) * 100 : null,
    price_without_installation_cents: formData.get("price_without_installation") ? Number(formData.get("price_without_installation")) * 100 : null,
    price_with_installation_cents: formData.get("price_with_installation") ? Number(formData.get("price_with_installation")) * 100 : null,
    installation_type: formData.get("installation_type") || "لكل قطعة",
    installation_fee_cents: formData.get("installation_fee") ? Number(formData.get("installation_fee")) * 100 : 0,
    installation_notes: formData.get("installation_notes") || null,
    manual_price_override: formData.get("manual_price_override") === "1",
  };
  const doorCalc = calculateDoor(doorFields);

  const updates: any = {
    original_name: formData.get("original_name"),
    approved_name: formData.get("approved_name") || null,
    proposed_name: formData.get("proposed_name") || null,
    name_status: formData.get("name_status") || "لا يوجد",
    unit_of_measure: formData.get("unit_of_measure") || "وحدة",
    main_category: formData.get("main_category") || null,
    pricing_status: formData.get("pricing_status") || "غير مسعّر",
    pricing_method: formData.get("pricing_method") || "تكلفة + هامش",
    review_reason: formData.get("review_reason") || null,
    cost_price_cents: cost,
    profit_margin_percent: margin,
    suggested_selling_price_cents: suggested,
    final_selling_price_cents: finalPriceCents,
    supplier: formData.get("supplier") || null,
    notes: formData.get("notes") || null,
    last_modified_by: "system",
    last_modified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...doorFields,
    ...(doorEnabled ? doorCalc : {}),
  };

  const { error } = await supabase.from("erp_items").update(updates).eq("item_code", item_code);
  if (error) throw new Error(error.message);

  // Audit: price change
  if (current && current.final_selling_price_cents !== updates.final_selling_price_cents) {
    await addPriceHistory({
      item_code,
      old_price_cents: current.final_selling_price_cents,
      new_price_cents: updates.final_selling_price_cents,
      changed_by: "system",
    });
    await addAuditEntry({ user: "system", action: "تعديل سعر", item_code, field: "final_selling_price_cents", old_value: String(current.final_selling_price_cents), new_value: String(updates.final_selling_price_cents) });
  }

  revalidatePath(`/dashboard/inventory/items/${encodeURIComponent(item_code)}`);
  revalidatePath("/dashboard/inventory/items");
}

export async function approveItemAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const { data: item } = await supabase.from("erp_items").select("*").eq("item_code", item_code).single();
  if (!item) throw new Error("الصنف غير موجود");

  const err = validateApproval(item);
  if (err) throw new Error(err);

  await supabase.from("erp_items").update({
    pricing_status: "معتمد",
    price_locked: true,
    locked_by: "system",
    locked_at: new Date().toISOString(),
    last_modified_by: "system",
    last_modified_at: new Date().toISOString(),
  }).eq("item_code", item_code);

  await addAuditEntry({ user: "system", action: "اعتماد", item_code });
  revalidatePath(`/dashboard/inventory/items/${encodeURIComponent(item_code)}`);
  revalidatePath("/dashboard/inventory/items");
}

export async function lockItemAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  await supabase.from("erp_items").update({
    price_locked: true, locked_by: "system", locked_at: new Date().toISOString(),
  }).eq("item_code", item_code);
  await addAuditEntry({ user: "system", action: "قفل", item_code });
  revalidatePath(`/dashboard/inventory/items/${encodeURIComponent(item_code)}`);
}

export async function unlockItemAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const reason = formData.get("unlock_reason") as string;
  await supabase.from("erp_items").update({
    price_locked: false, unlock_reason: reason,
    last_modified_by: "system", last_modified_at: new Date().toISOString(),
  }).eq("item_code", item_code);
  await addAuditEntry({ user: "system", action: "فك قفل", item_code, note: reason });
  revalidatePath(`/dashboard/inventory/items/${encodeURIComponent(item_code)}`);
}

export async function submitForReviewAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const reason = formData.get("review_reason") as string;
  await supabase.from("erp_items").update({
    pricing_status: "بحاجة مراجعة", review_reason: reason,
    last_modified_by: "system", last_modified_at: new Date().toISOString(),
  }).eq("item_code", item_code);
  await addAuditEntry({ user: "system", action: "طلب مراجعة", item_code, note: reason });
  revalidatePath(`/dashboard/inventory/items/${encodeURIComponent(item_code)}`);
  revalidatePath("/dashboard/inventory/review");
}
