import { getWarehouses, getInventorySummary } from "@/lib/inventory-data";
import { formatCurrency } from "@/lib/format";
import { WarehouseClient } from "./warehouse-client";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  const [warehouses, items] = await Promise.all([
    getWarehouses(),
    getInventorySummary(),
  ]);

  let totalCostValue = 0;
  let totalSellingValue = 0;
  let totalQtyAll = 0;

  items.forEach(item => {
    const totalQty = Object.values(item.inventory).reduce((a: number, b: any) => a + b, 0);
    totalQtyAll += totalQty;
    if (totalQty > 0) {
      totalCostValue += (item.cost_price_cents / 100) * totalQty;
      totalSellingValue += (item.final_selling_price_cents / 100) * totalQty;
    }
  });

  const stats = {
    totalCostValue,
    totalSellingValue,
    totalQtyAll,
    warehouseCount: warehouses.length,
    itemCount: items.length,
  };

  return (
    <WarehouseClient
      warehouses={warehouses}
      items={items}
      stats={stats}
    />
  );
}
