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
  unit_of_measure: string;
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
  // Fetch ALL items in pages of 1000
  let allItems: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("erp_items")
      .select("*")
      .order("item_code", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) { console.error("Error fetching items for inventory:", error); return []; }
    allItems = allItems.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  const items = allItems;

  // Fetch all inventory records (non-fatal if table missing or RLS blocks)
  const { data: inventoryRecords } = await supabase
    .from("erp_inventory")
    .select("item_code, warehouse_id, quantity");

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
    unit_of_measure: item.unit_of_measure || "وحدة",
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
