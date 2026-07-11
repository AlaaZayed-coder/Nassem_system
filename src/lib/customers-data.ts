import { supabase } from "@/lib/supabase";
import { Customer } from "@/lib/sales-data";

export type CustomerWithStats = Customer & {
  sales_orders_count: number;
  door_orders_count: number;
  total_sales_value_cents: number;
};

// جدول عملاء احترافي: كل عميل مع عدد طلبات المبيعات وطلبيات الأبواب وإجمالي قيمة مبيعاته،
// لتمكين المدير من رؤية نشاط كل عميل دون فتح كل طلبية على حدة.
export async function getCustomersWithStats(): Promise<CustomerWithStats[]> {
  const [{ data: customers, error }, { data: salesOrders }, { data: doorOrders }] = await Promise.all([
    supabase.from("erp_customers").select("*").order("created_at", { ascending: false }),
    supabase.from("erp_sales_orders").select("customer_id, total_amount_cents"),
    supabase.from("erp_door_orders").select("customer_id"),
  ]);

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  const salesByCustomer: Record<string, { count: number; total: number }> = {};
  (salesOrders || []).forEach((o: any) => {
    if (!o.customer_id) return;
    if (!salesByCustomer[o.customer_id]) salesByCustomer[o.customer_id] = { count: 0, total: 0 };
    salesByCustomer[o.customer_id].count++;
    salesByCustomer[o.customer_id].total += o.total_amount_cents || 0;
  });

  const doorCountByCustomer: Record<string, number> = {};
  (doorOrders || []).forEach((o: any) => {
    if (!o.customer_id) return;
    doorCountByCustomer[o.customer_id] = (doorCountByCustomer[o.customer_id] || 0) + 1;
  });

  return (customers || []).map((c: any) => ({
    ...c,
    sales_orders_count: salesByCustomer[c.id]?.count || 0,
    total_sales_value_cents: salesByCustomer[c.id]?.total || 0,
    door_orders_count: doorCountByCustomer[c.id] || 0,
  }));
}

export async function getCustomerDetail(id: string) {
  const [{ data: customer }, { data: salesOrders }, { data: doorOrders }] = await Promise.all([
    supabase.from("erp_customers").select("*").eq("id", id).single(),
    supabase.from("erp_sales_orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("erp_door_orders").select("*, erp_door_order_items(id)").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);

  return {
    customer: customer || null,
    salesOrders: salesOrders || [],
    doorOrders: (doorOrders || []).map((o: any) => ({
      ...o,
      item_count: Array.isArray(o.erp_door_order_items) ? o.erp_door_order_items.length : 0,
      erp_door_order_items: undefined,
    })),
  };
}
