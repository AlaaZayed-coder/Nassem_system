import { supabase } from "./supabase";

export async function getProductionItems() {
  const { data, error } = await supabase
    .from("erp_items")
    .select("*, erp_categories(name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching production items:", error);
    return [];
  }
  return data || [];
}

export async function addProductionItem(itemData: any) {
  const { data, error } = await supabase
    .from("erp_items")
    .insert(itemData)
    .select()
    .single();

  if (error) {
    console.error("Error adding item:", error);
    throw error;
  }
  return data;
}

export async function getProductionOrders() {
  const { data, error } = await supabase
    .from("erp_production_orders")
    .select("*, erp_items(original_name, approved_name), erp_sales_orders(customer_id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching production orders:", error);
    return [];
  }
  return data || [];
}

export async function updateProductionOrderStatus(orderId: string, status: string) {
  const { data, error } = await supabase
    .from("erp_production_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
  return data;
}
