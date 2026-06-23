"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function updateProductionOrderStatus(orderId: string, newStatus: string) {
  const { error } = await supabase
    .from("erp_production_orders")
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/telegram-app");
  revalidatePath("/dashboard/production");
}
