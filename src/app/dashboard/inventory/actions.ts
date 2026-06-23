"use server";

import { revalidatePath } from "next/cache";
import { processInventoryMovement, processInventoryTransfer } from "@/lib/inventory-data";

export async function submitStockMovementAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const warehouse_id = formData.get("warehouse_id") as string;
  const movement_type = formData.get("movement_type") as "IN" | "OUT" | "ADJUST";
  const quantity = Number(formData.get("quantity"));
  const notes = formData.get("notes") as string || "";

  try {
    await processInventoryMovement(item_code, warehouse_id, movement_type, quantity, notes);
  } catch (error: any) {
    console.error("Failed to process inventory movement:", error);
    throw new Error(error.message || "فشل تسجيل حركة المخزون");
  }

  revalidatePath("/dashboard/inventory/warehouse");
  revalidatePath("/dashboard/inventory");
}

export async function submitStockTransferAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const from_warehouse_id = formData.get("from_warehouse_id") as string;
  const to_warehouse_id = formData.get("to_warehouse_id") as string;
  const quantity = Number(formData.get("quantity"));
  const notes = formData.get("notes") as string || "";

  if (from_warehouse_id === to_warehouse_id) {
    throw new Error("لا يمكن النقل لنفس المستودع");
  }

  try {
    await processInventoryTransfer(item_code, from_warehouse_id, to_warehouse_id, quantity, notes);
  } catch (error: any) {
    console.error("Failed to process inventory transfer:", error);
    throw new Error(error.message || "فشل نقل المخزون");
  }

  revalidatePath("/dashboard/inventory/warehouse");
  revalidatePath("/dashboard/inventory");
}
