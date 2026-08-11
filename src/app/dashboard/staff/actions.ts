"use server";

import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { sendTelegramMessage } from "@/lib/telegram";
import { revalidatePath } from "next/cache";

export async function createStaffAction(formData: FormData) {
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const phone = formData.get("phone") as string;
  const telegram_chat_id = formData.get("telegram_chat_id") as string;
  const username = (formData.get("username") as string || "").trim();
  const password = (formData.get("password") as string || "");
  const supervisor_id = (formData.get("supervisor_id") as string || "").trim();

  if (!name || !role) throw new Error("الاسم والدور مطلوبان");
  if (username && !password) throw new Error("الرجاء إدخال كلمة مرور مع اسم المستخدم");

  const { data, error } = await supabase
    .from("erp_staff")
    .insert([{
      name,
      role,
      phone: phone || null,
      telegram_chat_id: telegram_chat_id || null,
      username: username || null,
      password_hash: password ? await hashPassword(password) : null,
      supervisor_id: supervisor_id || null,
    }])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("اسم المستخدم مستخدم بالفعل");
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/staff");
  return data;
}

export async function updateStaffAction(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const phone = formData.get("phone") as string;
  const telegram_chat_id = formData.get("telegram_chat_id") as string;
  const supervisor_id = (formData.get("supervisor_id") as string || "").trim();
  const extra_access = formData.getAll("extra_access") as string[];

  if (!name || !role) throw new Error("الاسم والدور مطلوبان");
  if (supervisor_id === id) throw new Error("لا يمكن أن يكون الموظف مسؤوله المباشر عن نفسه");

  const { error } = await supabase
    .from("erp_staff")
    .update({
      name,
      role,
      phone: phone || null,
      telegram_chat_id: telegram_chat_id || null,
      supervisor_id: supervisor_id || null,
      extra_access,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/staff");
}

export async function deleteStaffAction(id: string) {
  const { error } = await supabase
    .from("erp_staff")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/staff");
}

// إرسال رسالة عبر تيليجرام — إما تعميم لكل الموظفين النشطين المرتبطين
// بالبوت، أو لموظف واحد محدد. متاحة فقط من صفحة إدارة الموظفين (مدير
// النظام ومسؤول الموارد البشرية، حسب صلاحيات الصفحة نفسها).
export async function broadcastMessageAction(formData: FormData): Promise<{ error?: string; sent?: number }> {
  const target = (formData.get("target") as string || "").trim();
  const message = (formData.get("message") as string || "").trim();

  if (!message) return { error: "الرسالة مطلوبة" };
  if (!target) return { error: "الرجاء اختيار المستلم" };

  if (target === "all") {
    const { data: staffList, error } = await supabase
      .from("erp_staff")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null)
      .eq("is_active", true);

    if (error) return { error: error.message };

    let sent = 0;
    for (const s of staffList || []) {
      if (s.telegram_chat_id) {
        await sendTelegramMessage(s.telegram_chat_id, `📢 ${message}`);
        sent++;
      }
    }
    return { sent };
  }

  const { data: staff, error } = await supabase
    .from("erp_staff")
    .select("telegram_chat_id")
    .eq("id", target)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!staff?.telegram_chat_id) return { error: "هذا الموظف ما عنده حساب تيليجرام مرتبط" };

  await sendTelegramMessage(staff.telegram_chat_id, message);
  return { sent: 1 };
}

export async function setStaffCredentialsAction(id: string, formData: FormData) {
  const username = (formData.get("username") as string || "").trim();
  const password = (formData.get("password") as string || "");

  if (!username || !password) throw new Error("الرجاء إدخال اسم المستخدم وكلمة المرور");

  const { error } = await supabase
    .from("erp_staff")
    .update({ username, password_hash: await hashPassword(password) })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") throw new Error("اسم المستخدم مستخدم بالفعل");
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/staff");
}
