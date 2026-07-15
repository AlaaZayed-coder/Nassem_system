import { supabase } from "@/lib/supabase";

export type Staff = {
  id: string;
  name: string;
  role: string;
  telegram_chat_id: string | null;
  phone: string | null;
  username: string | null;
  supervisor_id: string | null;
  extra_access: string[];
  is_active: boolean;
  created_at: string;
};

export async function getStaffList(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("erp_staff")
    .select("id, name, role, telegram_chat_id, phone, username, supervisor_id, extra_access, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
  return data || [];
}

// حساب صاحب النظام — يُستثنى من قوائم الموظفين (صفحة إدارة الموظفين، قائمة
// المسؤول المباشر) التي يشوفها أي مدير/HR آخر غيره، بينما هو نفسه يرى الجميع
// بلا استثناء. مطابقة باسم المستخدم لأنه حساب واحد محدد، وليس قاعدة عامة.
const OWNER_USERNAME = "alaa";

export function visibleStaffFor(list: Staff[], viewerUsername: string): Staff[] {
  if (viewerUsername === OWNER_USERNAME) return list;
  return list.filter((s) => s.username !== OWNER_USERNAME);
}
