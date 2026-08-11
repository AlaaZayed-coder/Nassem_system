"use server";

import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendBroadcastMessage, type BroadcastTarget } from "@/lib/broadcast";

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
  const is_active = formData.get("is_active") === "on";

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
      is_active,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/staff");
}

// حذف نهائي — يُرفض من قاعدة البيانات (23503) لو للموظف سجلات مرتبطة
// (طلبات، رسائل مُرسلة/مستلمة...) حفاظاً على السجل التاريخي/التدقيقي؛
// الخيار البديل حينها هو تعطيل الحساب (is_active) بدل حذفه فعلياً.
export async function deleteStaffAction(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("erp_staff")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return { error: "لا يمكن حذف هذا الموظف لوجود سجلات مرتبطة به (طلبات، رسائل، أو موظفون تابعون له إدارياً). يمكنك تعطيل حسابه بدلاً من ذلك من زر التعديل." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/staff");
  return {};
}

// حذف نهائي يشمل كل السجلات المرتبطة — لمدير النظام فقط (وليس HR)، ويُستخدم
// فقط لما يكون deleteStaffAction العادي مرفوضاً بسبب سجلات مرتبطة. يحذف
// طلبات الموظف الخاصة به ورسائله المُرسلة/المُستلمة نهائياً (لا يمكن
// التراجع)، ويُفرغ فقط المراجع التي تخصه كـ"مسؤول" على سجلات غيره (مسؤول
// مباشر، معتمِد طلب...) بدل حذف تلك السجلات نفسها.
export async function forceDeleteStaffAction(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "manager") return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  await supabase.from("erp_broadcast_messages").delete().or(`sender_staff_id.eq.${id},recipient_staff_id.eq.${id}`);
  await supabase.from("erp_employee_requests").update({ manager_id: null }).eq("manager_id", id);
  await supabase.from("erp_employee_requests").update({ current_approver_id: null }).eq("current_approver_id", id);
  await supabase.from("erp_employee_requests").delete().eq("staff_id", id);
  await supabase.from("erp_staff").update({ supervisor_id: null }).eq("supervisor_id", id);
  await supabase.from("erp_door_orders").update({ responsible_staff_id: null }).eq("responsible_staff_id", id);
  await supabase.from("erp_door_orders").update({ dispatched_by_staff_id: null }).eq("dispatched_by_staff_id", id);
  await supabase.from("erp_order_submissions").update({ submitted_by_staff_id: null }).eq("submitted_by_staff_id", id);

  const { error } = await supabase.from("erp_staff").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/staff");
  return {};
}

// إرسال رسالة عبر تيليجرام — تعميم لكل الموظفين، أو لعدد مختار منهم. المنطق
// الفعلي مشترك مع بوت تيليجرام نفسه (انظر lib/broadcast.ts)، فمدير النظام
// ومسؤول الموارد البشرية يقدروا يرسلوا نفس الرسائل من الويب أو من داخل
// البوت مباشرة. متاحة فقط من صفحة إدارة الموظفين (حسب صلاحيات الصفحة نفسها).
export async function broadcastMessageAction(formData: FormData): Promise<{ error?: string; sent?: number }> {
  const session = await getSession();
  if (!session) return { error: "غير مصرح" };

  const target = (formData.get("target") as string || "").trim() as BroadcastTarget;
  const targetIds = formData.getAll("target_ids") as string[];
  const message = (formData.get("message") as string || "").trim();

  return sendBroadcastMessage({ senderStaffId: session.staffId, target, targetIds, message });
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
