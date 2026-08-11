"use server";

import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { sendTelegramMessage, sendTelegramMessageWithReply } from "@/lib/telegram";
import { getSession } from "@/lib/auth";
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

// إرسال رسالة عبر تيليجرام — تعميم لكل الموظفين، أو لعدد مختار منهم. تُرسل
// بخاصية "الرد السريع" (force_reply) وتُسجَّل بجدول erp_broadcast_messages
// حتى لو ردّ الموظف عليها، نوجّه ردّه تلقائياً لنفس الشخص اللي أرسلها (انظر
// معالجة reply_to_message بملف بوت تيليجرام). متاحة فقط من صفحة إدارة
// الموظفين (مدير النظام ومسؤول الموارد البشرية، حسب صلاحيات الصفحة نفسها).
export async function broadcastMessageAction(formData: FormData): Promise<{ error?: string; sent?: number }> {
  const session = await getSession();
  if (!session) return { error: "غير مصرح" };

  const target = (formData.get("target") as string || "").trim();
  const targetIds = formData.getAll("target_ids") as string[];
  const message = (formData.get("message") as string || "").trim();

  if (!message) return { error: "الرسالة مطلوبة" };
  if (target !== "all" && targetIds.length === 0) return { error: "الرجاء اختيار موظف واحد على الأقل" };

  let recipients: { id: string; telegram_chat_id: string | null }[] = [];

  if (target === "all") {
    const { data, error } = await supabase
      .from("erp_staff")
      .select("id, telegram_chat_id")
      .not("telegram_chat_id", "is", null)
      .eq("is_active", true);
    if (error) return { error: error.message };
    recipients = data || [];
  } else {
    const { data, error } = await supabase
      .from("erp_staff")
      .select("id, telegram_chat_id")
      .in("id", targetIds);
    if (error) return { error: error.message };
    recipients = (data || []).filter((r) => r.telegram_chat_id);
    if (recipients.length === 0) return { error: "لا يوجد بين المختارين من عنده حساب تيليجرام مرتبط" };
  }

  const { data: sender } = await supabase.from("erp_staff").select("telegram_chat_id").eq("id", session.staffId).maybeSingle();
  const senderChatId = sender?.telegram_chat_id || null;
  const text = target === "all" ? `📢 ${message}` : message;

  let sent = 0;
  for (const r of recipients) {
    if (!r.telegram_chat_id) continue;

    if (senderChatId) {
      const messageId = await sendTelegramMessageWithReply(r.telegram_chat_id, text);
      if (messageId) {
        await supabase.from("erp_broadcast_messages").insert([{
          sender_staff_id: session.staffId,
          recipient_staff_id: r.id,
          telegram_message_id: messageId,
          telegram_chat_id: r.telegram_chat_id,
          message_text: text,
        }]);
      }
    } else {
      // المُرسِل نفسه بدون حساب تيليجرام مرتبط — ما فيه وين يرجع الرد، رسالة عادية بلا تتبع.
      await sendTelegramMessage(r.telegram_chat_id, text);
    }
    sent++;
  }

  return { sent };
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
