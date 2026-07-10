import { supabase } from "./supabase";

export type SlaWarning = {
  id: string;
  category: "door_pending" | "purchase_aging" | "maintenance_aging";
  label: string;
  daysOpen: number;
  link: string;
};

const DOOR_PENDING_THRESHOLD_DAYS = 3;
const PURCHASE_AGING_THRESHOLD_DAYS = 5;
const MAINTENANCE_AGING_THRESHOLD_DAYS = 2;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export async function getSlaWarnings(): Promise<SlaWarning[]> {
  const [{ data: doorItems }, { data: purchaseRequests }, { data: maintenanceRequests }] = await Promise.all([
    supabase
      .from("erp_door_order_items")
      .select("id, door_order_id, initial_entry_date, item_status, erp_door_orders(erp_customers(name))")
      .eq("item_status", "قيد الاستكمال"),
    supabase
      .from("erp_purchase_requests")
      .select("id, created_at, status, item_code")
      .eq("status", "قيد الانتظار"),
    supabase
      .from("erp_maintenance_requests")
      .select("id, created_at, status, description")
      .eq("status", "قيد الانتظار"),
  ]);

  const warnings: SlaWarning[] = [];

  for (const item of doorItems || []) {
    const openedAt = item.initial_entry_date;
    if (!openedAt) continue;
    const days = daysSince(openedAt);
    if (days >= DOOR_PENDING_THRESHOLD_DAYS) {
      const customerName = (item as any).erp_door_orders?.erp_customers?.name || "عميل غير محدد";
      warnings.push({
        id: `door-${item.id}`,
        category: "door_pending",
        label: `مجرى بانتظار استكمال الباب — ${customerName}`,
        daysOpen: days,
        link: `/dashboard/production/door-orders/${item.door_order_id}`,
      });
    }
  }

  for (const req of purchaseRequests || []) {
    const days = daysSince(req.created_at);
    if (days >= PURCHASE_AGING_THRESHOLD_DAYS) {
      warnings.push({
        id: `purchase-${req.id}`,
        category: "purchase_aging",
        label: `طلب شراء متأخر: ${req.item_code || "بدون كود صنف"}`,
        daysOpen: days,
        link: `/dashboard/purchasing/requests`,
      });
    }
  }

  for (const req of maintenanceRequests || []) {
    const days = daysSince(req.created_at);
    if (days >= MAINTENANCE_AGING_THRESHOLD_DAYS) {
      warnings.push({
        id: `maintenance-${req.id}`,
        category: "maintenance_aging",
        label: `طلب صيانة متأخر: ${req.description || "بدون وصف"}`,
        daysOpen: days,
        link: `/dashboard/maintenance/requests`,
      });
    }
  }

  return warnings.sort((a, b) => b.daysOpen - a.daysOpen);
}
