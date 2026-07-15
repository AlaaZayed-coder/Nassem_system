"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createSessionCookie, clearSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function loginAction(formData: FormData): Promise<{ error: string } | void> {
  const username = (formData.get("username") as string || "").trim();
  const password = (formData.get("password") as string || "");

  if (!username || !password) {
    return { error: "الرجاء إدخال اسم المستخدم وكلمة المرور" };
  }

  const { data: staff, error } = await supabase
    .from("erp_staff")
    .select("id, name, role, username, password_hash, is_active")
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
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
