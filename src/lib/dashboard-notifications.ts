import { supabase } from "./supabase";

export type DashboardNotificationCounts = {
  pendingSubmissions: number;
  pendingMaintenance: number;
  pendingPurchases: number;
  pendingInstallations: number;
  pendingEmployeeRequests: number;
};

export async function getDashboardNotificationCounts(): Promise<DashboardNotificationCounts> {
  const [{ count: pendingSubmissions }, { count: pendingMaintenance }, { count: pendingPurchases }, { count: pendingInstallations }, { count: pendingEmployeeRequests }] = await Promise.all([
    supabase.from("erp_order_submissions").select("*", { count: "exact", head: true }).eq("status", "قيد المراجعة"),
    supabase.from("erp_maintenance_requests").select("*", { count: "exact", head: true }).eq("status", "قيد الانتظار"),
    supabase.from("erp_purchase_requests").select("*", { count: "exact", head: true }).eq("status", "قيد الانتظار"),
    supabase.from("erp_door_orders").select("*", { count: "exact", head: true }).eq("status", "بانتظار التركيب").is("installation_status", null),
    supabase.from("erp_employee_requests").select("*", { count: "exact", head: true }).eq("status", "قيد الانتظار"),
  ]);

  return {
    pendingSubmissions: pendingSubmissions || 0,
    pendingMaintenance: pendingMaintenance || 0,
    pendingPurchases: pendingPurchases || 0,
    pendingInstallations: pendingInstallations || 0,
    pendingEmployeeRequests: pendingEmployeeRequests || 0,
  };
}
