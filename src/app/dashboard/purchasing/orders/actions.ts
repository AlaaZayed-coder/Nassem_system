"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { markPurchaseRequestOrdered } from "@/lib/purchasing-data";

export async function createPurchaseOrderAction(formData: FormData) {
  try {
    const supplier_id = formData.get("supplier_id") as string;
    const warehouse_id = formData.get("warehouse_id") as string;
    const notes = formData.get("notes") as string;
    
    // Parse the items JSON string
    const itemsJson = formData.get("items") as string;
    if (!itemsJson) throw new Error("لم يتم اختيار أي أصناف");
    
    const items = JSON.parse(itemsJson) as { item_code: string; quantity: number; unit_cost_cents: number }[];
    
    if (items.length === 0) throw new Error("أمر الشراء يجب أن يحتوي على صنف واحد على الأقل");
    if (!supplier_id) throw new Error("يجب اختيار المورد");
    if (!warehouse_id) throw new Error("يجب اختيار مستودع الاستلام");

    // Calculate total
    const total_amount_cents = items.reduce((acc, item) => acc + (item.quantity * item.unit_cost_cents), 0);

    // 1. Create PO
    const { data: po, error: poError } = await supabase
      .from("erp_purchase_orders")
      .insert([{
        supplier_id,
        warehouse_id,
        total_amount_cents,
        notes,
        status: "معتمد" // default to approved to simplify flow for now
      }])
      .select()
      .single();

    if (poError) throw new Error(poError.message);

    // 2. Insert items
    const poItems = items.map(item => ({
      po_id: po.id,
      item_code: item.item_code,
      quantity: item.quantity,
      unit_cost_cents: item.unit_cost_cents
    }));

    const { error: itemsError } = await supabase
      .from("erp_purchase_order_items")
      .insert(poItems);

    if (itemsError) throw new Error(itemsError.message);

    revalidatePath("/dashboard/purchasing/orders");
    return { success: true, id: po.id };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function receivePurchaseOrderAction(poId: string, warehouseId: string) {
  try {
    // 1. Get PO items
    const { data: items, error: itemsError } = await supabase
      .from("erp_purchase_order_items")
      .select("*")
      .eq("po_id", poId);

    if (itemsError) throw new Error(itemsError.message);
    if (!items || items.length === 0) throw new Error("لا يوجد أصناف في هذا الأمر");

    // 2. Update PO status
    const { error: poError } = await supabase
      .from("erp_purchase_orders")
      .update({ status: "مستلم", actual_delivery_date: new Date().toISOString() })
      .eq("id", poId);

    if (poError) throw new Error(poError.message);

    // 3. Add to inventory movements (IN)
    const movements = items.map(item => ({
      item_code: item.item_code,
      warehouse_id: warehouseId,
      movement_type: "IN",
      quantity: item.quantity,
      reference_type: "PURCHASE",
      reference_id: poId,
      notes: `استلام أمر شراء #${poId.split("-")[0]}`
    }));

    const { error: movError } = await supabase
      .from("erp_inventory_movements")
      .insert(movements);

    if (movError) throw new Error(movError.message);

    revalidatePath(`/dashboard/purchasing/orders/${poId}`);
    revalidatePath("/dashboard/purchasing/orders");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function markPurchaseRequestOrderedAction(requestId: string) {
  try {
    await markPurchaseRequestOrdered(requestId);
  } catch (error: any) {
    throw new Error("فشل تحديث حالة طلب الشراء");
  }

  revalidatePath("/dashboard/purchasing/requests");
  revalidatePath("/dashboard/purchasing");
}
