import { getWarehouses, getInventorySummary } from "@/lib/inventory-data";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Store } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ExcelManager } from "@/components/inventory/excel-manager";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  const [warehouses, items] = await Promise.all([
    getWarehouses(),
    getInventorySummary(),
  ]);

  let totalCostValue = 0;
  let totalSellingValue = 0;
  items.forEach(item => {
    const totalQty = Object.values(item.inventory).reduce((a: number, b: any) => a + b, 0);
    if (totalQty > 0) {
      totalCostValue += (item.cost_price_cents / 100) * totalQty;
      totalSellingValue += (item.final_selling_price_cents / 100) * totalQty;
    }
  });

  return (
    <div className="legacy-wrapper" dir="rtl">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Store size={16} color="var(--brand)" />
          <h3 className="section-title" style={{ margin: 0 }}>إدارة المخزون</h3>
        </div>
        <ExcelManager />
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <div style={{ background: "var(--brand)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8 }}>إجمالي تكلفة المخزون</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }} dir="ltr">{formatCurrency(totalCostValue)}</div>
        </div>
        <div style={{ background: "#1D9E75", borderRadius: "var(--border-radius-md)", padding: "10px 14px", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8 }}>القيمة البيعية للمخزون</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }} dir="ltr">{formatCurrency(totalSellingValue)}</div>
        </div>
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", background: "var(--color-background-primary)" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>عدد المستودعات</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{warehouses.length}</div>
        </div>
      </div>

      {/* Table */}
      <InventoryTable warehouses={warehouses} items={items} />

    </div>
  );
}
