import { supabase } from "./supabase";

export type ExecutiveSummary = {
  salesThisMonthCents: number;
  salesLastMonthCents: number;
  ordersThisMonthCount: number;
  pendingDoorCompletionCount: number;
  pendingPurchaseRequestsCount: number;
  pendingMaintenanceCount: number;
  openSalesOrdersCount: number;
  pendingSubmissionsCount: number;
  pendingInstallationDispatchCount: number;
  installationInProgressCount: number;
};

function monthRange(monthsAgo: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getExecutiveSummary(): Promise<ExecutiveSummary> {
  const thisMonth = monthRange(0);
  const lastMonth = monthRange(1);

  const [
    { data: salesThisMonth },
    { data: salesLastMonth },
    { count: pendingDoorCompletionCount },
    { count: pendingPurchaseRequestsCount },
    { count: pendingMaintenanceCount },
    { count: openSalesOrdersCount },
    { count: pendingSubmissionsCount },
    { count: pendingInstallationDispatchCount },
    { count: installationInProgressCount },
  ] = await Promise.all([
    supabase
      .from("erp_sales_orders")
      .select("total_amount_cents")
      .eq("status", "معتمد")
      .gte("created_at", thisMonth.start)
      .lt("created_at", thisMonth.end),
    supabase
      .from("erp_sales_orders")
      .select("total_amount_cents")
      .eq("status", "معتمد")
      .gte("created_at", lastMonth.start)
      .lt("created_at", lastMonth.end),
    supabase.from("erp_door_order_items").select("*", { count: "exact", head: true }).eq("item_status", "قيد الاستكمال"),
    supabase.from("erp_purchase_requests").select("*", { count: "exact", head: true }).eq("status", "قيد الانتظار"),
    supabase.from("erp_maintenance_requests").select("*", { count: "exact", head: true }).eq("status", "قيد الانتظار"),
    supabase.from("erp_sales_orders").select("*", { count: "exact", head: true }).neq("status", "معتمد").neq("status", "مرفوض"),
    supabase.from("erp_order_submissions").select("*", { count: "exact", head: true }).eq("status", "قيد المراجعة"),
    supabase.from("erp_door_orders").select("*", { count: "exact", head: true }).eq("status", "بانتظار التركيب").is("installation_status", null),
    supabase.from("erp_door_orders").select("*", { count: "exact", head: true }).in("installation_status", ["قيد التركيب", "بانتظار تأكيد العميل"]),
  ]);

  return {
    salesThisMonthCents: (salesThisMonth || []).reduce((sum, o) => sum + (o.total_amount_cents || 0), 0),
    salesLastMonthCents: (salesLastMonth || []).reduce((sum, o) => sum + (o.total_amount_cents || 0), 0),
    ordersThisMonthCount: (salesThisMonth || []).length,
    pendingDoorCompletionCount: pendingDoorCompletionCount || 0,
    pendingPurchaseRequestsCount: pendingPurchaseRequestsCount || 0,
    pendingMaintenanceCount: pendingMaintenanceCount || 0,
    openSalesOrdersCount: openSalesOrdersCount || 0,
    pendingSubmissionsCount: pendingSubmissionsCount || 0,
    pendingInstallationDispatchCount: pendingInstallationDispatchCount || 0,
    installationInProgressCount: installationInProgressCount || 0,
  };
}
