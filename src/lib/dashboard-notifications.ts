import { supabase } from "./supabase";

export type DashboardNotificationCounts = {
  pendingSubmissions: number;
  pendingMaintenance: number;
  pendingPurchases: number;
  pendingInstallations: number;
  pendingEmployeeRequests: number;
};

// أي فئات تنبيه يشوفها كل دور بجرس الإشعارات — كل دور يشوف فقط ما يخصه، لا
// كل شيء دائماً. "طلبات موظفين بانتظار الاعتماد" مُستثناة عمداً من الجرس
// حالياً (تُعرض بدلاً منها كـ badge على رابط "طلبات الموظفين" بالقائمة الجانبية).
export const ROLE_NOTIFICATION_SCOPE: Record<string, (keyof Omit<DashboardNotificationCounts, "pendingEmployeeRequests">)[]> = {
  manager: ["pendingSubmissions", "pendingMaintenance", "pendingPurchases", "pendingInstallations"],
  order_processor: ["pendingSubmissions"],
  production: ["pendingMaintenance", "pendingInstallations"],
  purchasing: ["pendingPurchases"],
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
