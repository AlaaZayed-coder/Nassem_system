"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createSessionCookie, clearSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { sendTelegramMessage } from "@/lib/telegram";

export async function loginAction(formData: FormData): Promise<{ error: string } | void> {
  const username = (formData.get("username") as string || "").trim();
  const password = (formData.get("password") as string || "");

  if (!username || !password) {
    return { error: "الرجاء إدخال اسم المستخدم وكلمة المرور" };
  }

  const { data: staff, error } = await supabase
    .from("erp_staff")
    .select("id, name, role, username, password_hash, is_active, extra_access")
    .eq("username", username)
    .maybeSingle();

  if (error || !staff || !staff.is_active) {
    return { error: "بيانات الدخول غير صحيحة" };
  }

  if (!staff.password_hash) {
    return { error: "لم يتم تفعيل حساب هذا المستخدم بعد. تواصل مع مدير النظام." };
  }

  const valid = await verifyPassword(password, staff.password_hash);
  if (!valid) {
    return { error: "بيانات الدخول غير صحيحة" };
  }

  await createSessionCookie({
    staffId: staff.id,
    username: staff.username,
    name: staff.name,
    role: staff.role,
    extraAccess: staff.extra_access || [],
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

// رسالة عامة دائماً بغض النظر عن نتيجة البحث الفعلية — لتفادي كشف أي اسم
// مستخدم فعلاً موجود بالنظام لمن لا يملك صلاحية.
const GENERIC_RESET_MESSAGE = "إذا كان اسم المستخدم صحيحاً، وصل طلبك لمسؤول الموارد البشرية.";

export async function requestPasswordResetAction(username: string): Promise<{ message: string }> {
  const trimmed = (username || "").trim();
  if (!trimmed) return { message: GENERIC_RESET_MESSAGE };

  const { data: staff } = await supabase
    .from("erp_staff")
    .select("id, name, username, is_active")
    .eq("username", trimmed)
    .maybeSingle();

  if (staff && staff.is_active) {
    const { data: hrStaff } = await supabase
      .from("erp_staff")
      .select("telegram_chat_id")
      .eq("role", "hr")
      .eq("is_active", true)
      .not("telegram_chat_id", "is", null);

    const text = `🔑 طلب إعادة تعيين كلمة مرور\n\nالموظف "${staff.name}" (${staff.username}) يطلب كلمة مرور جديدة لتسجيل الدخول للويب.`;
    for (const hr of hrStaff || []) {
      if (hr.telegram_chat_id) await sendTelegramMessage(hr.telegram_chat_id, text);
    }
  }

  return { message: GENERIC_RESET_MESSAGE };
}
