import { supabase } from "@/lib/supabase";

export type DoorOrder = {
  id: string;
  customer_id: string;
  order_type: string;
  responsible_staff_id: string | null;
  status: string;
  customer_name_note: string | null;
  general_notes: string | null;
  created_at: string;
  updated_at: string;
  erp_customers?: { name: string; company_name: string | null; phone: string | null };
  erp_staff?: { name: string } | null;
  item_count?: number;
};

export type DoorOrderItem = {
  id: string;
  door_order_id: string;
  item_code: string;
  color: string | null;
  length_mm: number | null;
  height_mm: number | null;
  profile_item_code: string | null;
  has_cover: boolean;
  cover_width_mm: number | null;
  cover_height_mm: number | null;
  has_box: boolean;
  box_length_mm: number | null;
  box_height_mm: number | null;
  guides_sent: boolean;
  item_notes: string | null;
  is_industrial: boolean;
  pipe_length_inch: number | null;
  base_weight_kg: number | null;
  final_weight_kg: number | null;
  frame_type: string | null;
  jamb_type: string | null;
  spring_type: string | null;
  spring_count: number | null;
  spring_match_diff_kg: number | null;
  calculated_at: string | null;
  created_at: string;
  erp_items?: { original_name: string; approved_name: string | null };
};

export type DoorOrderElectronics = {
  id: string;
  door_order_id: string;
  item_code: string | null;
  description: string | null;
  quantity: number;
  created_at: string;
  erp_items?: { original_name: string } | null;
};

export type DoorOrderAccessory = {
  id: string;
  door_order_id: string;
  sales_order_line_id: string | null;
  accessory_type: "slat" | "motor";
  item_code: string | null;
  free_text_name: string | null;
  quantity: number | null;
  fulfillment_status: "noted" | "available" | "purchasing";
  created_at: string;
  erp_items?: { original_name: string; approved_name: string | null } | null;
};

export async function getDoorOrders(): Promise<DoorOrder[]> {
  const { data, error } = await supabase
    .from("erp_door_orders")
    .select("*, erp_customers(name, company_name, phone), erp_staff(name), erp_door_order_items(id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching door orders:", error);
    return [];
  }

  return (data || []).map((o: any) => ({
    ...o,
    item_count: Array.isArray(o.erp_door_order_items) ? o.erp_door_order_items.length : 0,
    erp_door_order_items: undefined,
  }));
}

export async function getDoorOrderDetail(id: string) {
  const [{ data: order }, { data: items }, { data: electronics }, { data: accessories }] = await Promise.all([
    supabase.from("erp_door_orders").select("*, erp_customers(*), erp_staff(name)").eq("id", id).single(),
    supabase.from("erp_door_order_items").select("*, erp_items!erp_door_order_items_item_code_fkey(original_name, approved_name)").eq("door_order_id", id).order("created_at", { ascending: true }),
    supabase.from("erp_door_order_electronics").select("*, erp_items(original_name)").eq("door_order_id", id).order("created_at", { ascending: true }),
    supabase.from("erp_door_order_accessories").select("*, erp_items(original_name, approved_name)").eq("door_order_id", id).order("created_at", { ascending: true }),
  ]);

  return {
    order: order || null,
    items: (items || []) as DoorOrderItem[],
    electronics: (electronics || []) as DoorOrderElectronics[],
    accessories: (accessories || []) as DoorOrderAccessory[],
  };
}
