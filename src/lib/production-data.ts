import { supabase } from "@/lib/supabase";

export type ProductionOrder = {
  id: string;
  sales_order_id: string | null;
  item_code: string;
  quantity: number;
  status: string; // 'مخطط', 'قيد التنفيذ', 'منتهي'
  priority: string;
  start_date: string | null;
  estimated_end_date: string | null;
  actual_end_date: string | null;
  notes: string | null;
  created_at: string;
  
  // Linked data
  erp_items?: {
    original_name: string;
  };
  erp_sales_orders?: {
    customer_id: string;
    erp_customers?: {
      name: string;
    };
  };
};

export async function getActiveProductionOrders(): Promise<ProductionOrder[]> {
  const { data, error } = await supabase
    .from("erp_production_orders")
    .select(`
      *,
      erp_items ( original_name ),
      erp_sales_orders ( 
        customer_id,
        erp_customers ( name )
      )
    `)
    .neq("status", "منتهي")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching production orders:", error);
    return [];
  }
  return data as any as ProductionOrder[];
}
