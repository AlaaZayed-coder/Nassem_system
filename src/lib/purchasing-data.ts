import { supabase } from "./supabase";

export async function getSuppliers() {
  const { data, error } = await supabase
    .from("erp_suppliers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }
  return data || [];
}

export async function addSupplier(supplierData: any) {
  const { data, error } = await supabase
    .from("erp_suppliers")
    .insert(supplierData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPurchaseOrders() {
  const { data, error } = await supabase
    .from("erp_purchase_orders")
    .select("*, erp_suppliers(name), erp_warehouses(name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching purchase orders:", error);
    return [];
  }
  return data || [];
}

export async function getPurchaseOrderById(id: string) {
  const { data, error } = await supabase
    .from("erp_purchase_orders")
    .select("*, erp_suppliers(name), erp_warehouses(name), erp_purchase_order_items(*, erp_items(original_name, approved_name))")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching purchase order:", error);
    return null;
  }
  return data;
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from("erp_purchase_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Retrieves items that have inventory below their min_stock_level
export async function getLowStockAlerts() {
  // We need to fetch all items with min_stock_level, then check their inventory.
  // Since inventory is calculated dynamically from movements, we can use getInventorySummary() 
  // from inventory-data.ts and filter it.
  return []; // We will implement this in the page component directly using getInventorySummary
}
