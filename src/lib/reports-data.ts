import { supabase } from "./supabase";

export async function getFinancialSummary() {
  // Get all sales (revenue)
  const { data: sales, error: salesError } = await supabase
    .from("erp_sales_orders")
    .select("total_amount_cents, status");

  // Get all purchases (expenses)
  const { data: purchases, error: purchError } = await supabase
    .from("erp_purchase_orders")
    .select("total_amount_cents, status");

  let totalRevenue = 0;
  let totalExpenses = 0;

  if (!salesError && sales) {
    totalRevenue = sales.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0);
  }

  if (!purchError && purchases) {
    // Only count received (مستلم) POs as actual expenses or maybe all for committed expenses. Let's do all.
    totalExpenses = purchases.reduce((sum, po) => sum + (po.total_amount_cents || 0), 0);
  }

  return {
    revenue: totalRevenue,
    expenses: totalExpenses,
    netIncome: totalRevenue - totalExpenses
  };
}

export async function getTopSellingItems() {
  // Since we don't have a direct erp_sales_order_items table (orders are linked directly to production currently, or simplified), 
  // Wait! In the current schema, erp_sales_orders doesn't have an items table?
  // Let's check erp_production_orders which has item_code and sales_order_id.
  
  const { data: prodOrders, error } = await supabase
    .from("erp_production_orders")
    .select("item_code, quantity, erp_items(original_name, approved_name)");

  if (error || !prodOrders) return [];

  const itemCounts: Record<string, { name: string, quantity: number, count: number }> = {};

  prodOrders.forEach((order: any) => {
    const code = order.item_code;
    if (!itemCounts[code]) {
      itemCounts[code] = {
        name: order.erp_items?.approved_name || order.erp_items?.original_name || code,
        quantity: 0,
        count: 0
      };
    }
    itemCounts[code].quantity += Number(order.quantity || 0);
    itemCounts[code].count += 1;
  });

  return Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
}

export async function getProductionPerformance() {
  const { data: prodOrders, error } = await supabase
    .from("erp_production_orders")
    .select("status");

  if (error || !prodOrders) return { total: 0, completed: 0, inProgress: 0, planned: 0 };

  const stats = {
    total: prodOrders.length,
    completed: prodOrders.filter(o => o.status === "منتهي").length,
    inProgress: prodOrders.filter(o => o.status === "قيد التنفيذ" || o.status === "فحص الجودة").length,
    planned: prodOrders.filter(o => o.status === "مخطط").length
  };

  return stats;
}
