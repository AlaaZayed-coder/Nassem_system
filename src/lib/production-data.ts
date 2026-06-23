import { supabase } from "./supabase";

export async function getProductionItems() {
  let allData: any[] = [];
  let from = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("erp_items")
      .select("*, erp_categories!erp_items_sub_category_id_fkey(name)")
      .order("created_at", { ascending: false })
      .order("item_code", { ascending: true })
      .range(from, from + limit - 1);

    if (error) {
      console.error("Error fetching production items:", error);
      break;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += limit;
      if (data.length < limit) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  
  // Transform the response to match the expected format in UI
  const formattedData = allData.map(item => ({
    ...item,
    erp_categories: item.erp_categories || null
  }));

  return formattedData;
}

export async function addProductionItem(itemData: any) {
  const { data, error } = await supabase
    .from("erp_items")
    .insert(itemData)
    .select()
    .single();

  if (error) {
    console.error("Error adding item:", error);
    throw error;
  }
  return data;
}

export async function getProductionOrders() {
  const { data, error } = await supabase
    .from("erp_production_orders")
    .select("*, erp_items(original_name, approved_name), erp_sales_orders(customer_id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching production orders:", error);
    return [];
  }
  return data || [];
}

export async function updateProductionOrderStatus(orderId: string, status: string) {
  const { data, error } = await supabase
    .from("erp_production_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
  return data;
}

export async function getItemByCode(code: string) {
  const { data, error } = await supabase
    .from("erp_items")
    .select("*, erp_categories!erp_items_sub_category_id_fkey(name)")
    .eq("item_code", code)
    .single();

  if (error) {
    console.error("Error fetching item:", error);
    return null;
  }
  return data;
}

export async function updateProductionItem(code: string, updates: any) {
  const { data, error } = await supabase
    .from("erp_items")
    .update(updates)
    .eq("item_code", code)
    .select()
    .single();

  if (error) {
    console.error("Error updating item:", error);
    throw error;
  }
  return data;
}

export async function getCategories() {
  const { data, error } = await supabase
    .from("erp_categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data || [];
}

export async function addCategory(categoryData: any) {
  const { data, error } = await supabase
    .from("erp_categories")
    .insert(categoryData)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function updateCategory(id: string, updates: any) {
  const { data, error } = await supabase
    .from("erp_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from("erp_categories")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
  return true;
}

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

export async function getProductionMaterials(orderId: string) {
  const { data, error } = await supabase
    .from("erp_production_materials")
    .select("*, erp_items(original_name, approved_name), erp_warehouses(name)")
    .eq("production_order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching production materials:", error);
    return [];
  }
  return data || [];
}

export async function addProductionMaterial(materialData: any) {
  const { data, error } = await supabase
    .from("erp_production_materials")
    .insert(materialData)
    .select()
    .single();

  if (error) throw error;
  return data;
}
