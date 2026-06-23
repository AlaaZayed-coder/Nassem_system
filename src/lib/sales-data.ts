import { createClient } from "@/lib/supabase/server";

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_name: string | null;
  customer_type: string;
  telegram_chat_id?: string | null;
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
  const supabase = createClient();
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
  const supabase = createClient();
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
