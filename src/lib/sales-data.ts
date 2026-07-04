import { supabase } from "@/lib/supabase";

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_name: string | null;
  customer_type: string;

  lead_source?: string | null;
  created_at: string;
};

export type SalesOrder = {
  id: string;
  customer_id: string;
  order_date: string;
  status: string;
  total_amount_cents: number;
  expected_revenue_cents?: number;
  win_probability_percent?: number;
  notes: string | null;
  created_at: string;
  erp_customers?: Customer;
};

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("erp_customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
  return data || [];
}

export async function getSalesOpportunities(): Promise<SalesOrder[]> {
  const { data, error } = await supabase
    .from("erp_sales_orders")
    .select(`
      *,
      erp_customers (*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sales orders:", error);
    return [];
  }
  return data || [];
}

export type SalesOrderLine = {
  id: string;
  sales_order_id: string;
  item_code: string | null;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  line_type: string;
  fulfillment_status: string;
  description: string | null;
  line_notes: string | null;
  created_at: string;
  erp_items?: { original_name: string } | null;
};

export async function getSalesOrderDetail(orderId: string) {
  const [{ data: order }, { data: lines }, { data: productionOrders }, { data: maintenanceRequests }, { data: purchaseRequests }] = await Promise.all([
    supabase.from("erp_sales_orders").select("*, erp_customers(*)").eq("id", orderId).single(),
    supabase.from("erp_sales_order_lines").select("*, erp_items(original_name)").eq("sales_order_id", orderId).order("created_at", { ascending: true }),
    supabase.from("erp_production_orders").select("*").eq("sales_order_id", orderId),
    supabase.from("erp_maintenance_requests").select("*").eq("sales_order_id", orderId),
    supabase.from("erp_purchase_requests").select("*").eq("sales_order_id", orderId),
  ]);

  return {
    order: order || null,
    lines: (lines || []) as SalesOrderLine[],
    productionOrders: productionOrders || [],
    maintenanceRequests: maintenanceRequests || [],
    purchaseRequests: purchaseRequests || [],
  };
}
