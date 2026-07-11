import { supabase } from "./supabase";
import { getSettings } from "./settings-data";

export type SlaWarning = {
  id: string;
  category: "door_pending" | "purchase_aging" | "maintenance_aging" | "installation_aging" | "submission_aging";
  label: string;
  daysOpen: number;
  link: string;
};

export const SLA_DEFAULTS = {
  sla_door_pending_days: 3,
  sla_purchase_aging_days: 5,
  sla_maintenance_aging_days: 2,
  sla_installation_aging_days: 3,
  sla_submission_aging_days: 1,
};

export type SlaThresholdKey = keyof typeof SLA_DEFAULTS;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export async function getSlaThresholds(): Promise<Record<SlaThresholdKey, number>> {
  const settings = await getSettings();
  const result = { ...SLA_DEFAULTS };
  (Object.keys(SLA_DEFAULTS) as SlaThresholdKey[]).forEach((key) => {
    const raw = settings[key];
    const parsed = raw ? Number(raw) : NaN;
    if (!Number.isNaN(parsed) && parsed > 0) result[key] = parsed;
  });
  return result;
}

export async function getSlaWarnings(): Promise<SlaWarning[]> {
  const thresholds = await getSlaThresholds();
  const DOOR_PENDING_THRESHOLD_DAYS = thresholds.sla_door_pending_days;
  const PURCHASE_AGING_THRESHOLD_DAYS = thresholds.sla_purchase_aging_days;
  const MAINTENANCE_AGING_THRESHOLD_DAYS = thresholds.sla_maintenance_aging_days;
  const INSTALLATION_AGING_THRESHOLD_DAYS = thresholds.sla_installation_aging_days;
  const SUBMISSION_AGING_THRESHOLD_DAYS = thresholds.sla_submission_aging_days;

  const [{ data: doorItems }, { data: purchaseRequests }, { data: maintenanceRequests }, { data: installations }, { data: submissions }] = await Promise.all([
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
    supabase
      .from("erp_door_orders")
      .select("id, dispatched_at, installation_status, erp_customers(name)")
      .in("installation_status", ["قيد التركيب", "بانتظار تأكيد العميل"]),
    supabase
      .from("erp_order_submissions")
      .select("id, created_at, status, customer_name")
      .eq("status", "قيد المراجعة"),
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

  for (const inst of installations || []) {
    if (!inst.dispatched_at) continue;
    const days = daysSince(inst.dispatched_at);
    if (days >= INSTALLATION_AGING_THRESHOLD_DAYS) {
      const customerName = (inst as any).erp_customers?.name || "عميل غير محدد";
      warnings.push({
        id: `installation-${inst.id}`,
        category: "installation_aging",
        label: `تركيب متأخر (${inst.installation_status}) — ${customerName}`,
        daysOpen: days,
        link: `/dashboard/installation/${inst.id}`,
      });
    }
  }

  for (const sub of submissions || []) {
    const days = daysSince(sub.created_at);
    if (days >= SUBMISSION_AGING_THRESHOLD_DAYS) {
      warnings.push({
        id: `submission-${sub.id}`,
        category: "submission_aging",
        label: `طلبية واردة بانتظار المعالجة — ${sub.customer_name || "عميل غير محدد"}`,
        daysOpen: days,
        link: `/dashboard/sales/submissions/${sub.id}`,
      });
    }
  }

  return warnings.sort((a, b) => b.daysOpen - a.daysOpen);
}
