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
  vacation_balance_days: number;
  is_active: boolean;
  is_hidden: boolean;
  hire_date: string | null;
  created_at: string;
};

const STAFF_COLUMNS = "id, name, role, telegram_chat_id, phone, username, supervisor_id, extra_access, vacation_balance_days, is_active, is_hidden, hire_date, created_at";

export async function getStaffList(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("erp_staff")
    .select(STAFF_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
  return data || [];
}

export async function getStaffById(id: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from("erp_staff")
    .select(STAFF_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching staff by id:", error);
    return null;
  }
  return data;
}

// موظفون مسؤولهم المباشر هو staffId — تُستخدم لتحديد هل الشخص "مسؤول عن
// فريق" (لإظهار زر "فريقي" بالبوت) ولعرض قائمة الفريق نفسها.
export async function getDirectReports(staffId: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("erp_staff")
    .select(STAFF_COLUMNS)
    .eq("supervisor_id", staffId);

  if (error) {
    console.error("Error fetching direct reports:", error);
    return [];
  }
  return data || [];
}

// بحث بالاسم لميزة "بحث عن موظف" بالبوت (مدير/HR فقط) — أول 8 نتائج مطابقة.
export async function searchStaffByName(query: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("erp_staff")
    .select(STAFF_COLUMNS)
    .ilike("name", `%${query}%`)
    .limit(8);

  if (error) {
    console.error("Error searching staff:", error);
    return [];
  }
  return data || [];
}

// حسابات مُعلَّمة is_hidden تُستثنى من قوائم الموظفين (صفحة إدارة الموظفين،
// قائمة المسؤول المباشر) التي يشوفها أي مدير/HR آخر، بينما الحساب المخفي
// نفسه يرى الجميع بلا استثناء. عمود بيانات بدل تحقق اسم مستخدم ثابت بالكود،
// حتى ما ينكسر الإخفاء بصمت لو تغيّر اسم المستخدم مستقبلاً.
export function visibleStaffFor(list: Staff[], viewerUsername: string): Staff[] {
  const viewerIsHidden = list.some((s) => s.is_hidden && s.username === viewerUsername);
  if (viewerIsHidden) return list;
  return list.filter((s) => !s.is_hidden);
}
