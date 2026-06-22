import { supabase } from "./supabase";

export type Warehouse = {
  id: string;
  name: string;
  location: string | null;
};

export type InventoryItem = {
  item_code: string;
  original_name: string;
  approved_name: string;
  cost_price_cents: number;
  final_selling_price_cents: number;
  inventory: {
    [warehouse_id: string]: number;
  };
};

export async function getWarehouses(): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from("erp_warehouses")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching warehouses:", error);
    return [];
  }
  return data || [];
}

export async function getInventorySummary() {
  // Fetch all items that have inventory records or just all items
  // Since we want to show items and their quantities, we'll fetch items and their inventory joined.
  
  // First, fetch all items
  const { data: items, error: itemsError } = await supabase
    .from("erp_items")
    .select("item_code, original_name, approved_name, cost_price_cents, final_selling_price_cents")
    .order("created_at", { ascending: false });

  if (itemsError) {
    console.error("Error fetching items for inventory:", itemsError);
    return [];
  }

  // Fetch all inventory records
  const { data: inventoryRecords, error: invError } = await supabase
    .from("erp_inventory")
    .select("item_code, warehouse_id, quantity");

  if (invError) {
    console.error("Error fetching inventory records:", invError);
    return [];
  }

  // Map inventory by item_code
  const inventoryMap = new Map<string, { [w_id: string]: number }>();
  for (const record of inventoryRecords || []) {
    if (!inventoryMap.has(record.item_code)) {
      inventoryMap.set(record.item_code, {});
    }
    inventoryMap.get(record.item_code)![record.warehouse_id] = Number(record.quantity);
  }

  // Combine
  const summary: InventoryItem[] = (items || []).map((item) => ({
    item_code: item.item_code,
    original_name: item.original_name,
    approved_name: item.approved_name || item.original_name,
    cost_price_cents: item.cost_price_cents || 0,
    final_selling_price_cents: item.final_selling_price_cents || 0,
    inventory: inventoryMap.get(item.item_code) || {},
  }));

  return summary;
}

export async function processInventoryMovement(
  itemCode: string,
  warehouseId: string,
  type: "IN" | "OUT" | "ADJUST",
  quantity: number,
  notes: string = ""
) {
  // We need to do this in a transaction, but via Supabase JS we will do sequential updates.
  // 1. Get current inventory
  const { data: currentInv, error: fetchError } = await supabase
    .from("erp_inventory")
    .select("quantity")
    .eq("item_code", itemCode)
    .eq("warehouse_id", warehouseId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  let newQuantity = 0;
  if (currentInv) {
    newQuantity = Number(currentInv.quantity);
  }

  if (type === "IN") newQuantity += quantity;
  else if (type === "OUT") newQuantity -= quantity;
  else if (type === "ADJUST") newQuantity = quantity;

  // 2. Upsert inventory record
  const { error: upsertError } = await supabase
    .from("erp_inventory")
    .upsert(
      {
        item_code: itemCode,
        warehouse_id: warehouseId,
        quantity: newQuantity,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "item_code,warehouse_id" }
    );

  if (upsertError) throw upsertError;

  // 3. Log transaction
  const { error: logError } = await supabase
    .from("erp_inventory_transactions")
    .insert({
      item_code: itemCode,
      warehouse_id: warehouseId,
      transaction_type: type,
      quantity: quantity,
      notes,
    });

  if (logError) throw logError;

  return true;
}

export async function processInventoryTransfer(
  itemCode: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  quantity: number,
  notes: string = ""
) {
  // A transfer is an OUT from source and an IN to destination
  await processInventoryMovement(itemCode, fromWarehouseId, "OUT", quantity, `نقل إلى مستودع آخر: ${notes}`);
  await processInventoryMovement(itemCode, toWarehouseId, "IN", quantity, `نقل من مستودع آخر: ${notes}`);
  return true;
}
