import { supabase } from "@/lib/supabase";

export type Staff = {
  id: string;
  name: string;
  role: string;
  telegram_chat_id: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

export async function getStaffList(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("erp_staff")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
  return data || [];
}
