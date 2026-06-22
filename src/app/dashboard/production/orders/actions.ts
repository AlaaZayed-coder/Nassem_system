"use server";

import { revalidatePath } from "next/cache";
import { updateProductionOrderStatus } from "@/lib/production-data";

export async function updateOrderStatusAction(orderId: string, newStatus: string) {
  try {
    await updateProductionOrderStatus(orderId, newStatus);
    revalidatePath("/dashboard/production/orders");
    return { success: true };
  } catch (error) {
    console.error("Failed to update order status:", error);
    return { success: false, error: "فشل تحديث حالة الطلب" };
  }
}
