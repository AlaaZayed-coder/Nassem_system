"use server";

import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/auth";
import { addAuditEntry } from "@/lib/audit-data";
import { ROLE_LABELS } from "@/lib/role-labels";
import { revalidatePath } from "next/cache";
import { sendBroadcastMessage, type BroadcastTarget } from "@/lib/broadcast";
import { addStaffEvaluation, deleteStaffEvaluation, getEvaluationsForStaff, type StaffEvaluation } from "@/lib/staff-evaluations-data";
import { uploadStaffDocument, deleteStaffDocument, getDocumentsForStaff, type StaffDocument } from "@/lib/staff-documents-data";

export async function getStaffEvaluationsAction(staffId: string): Promise<StaffEvaluation[]> {
  return getEvaluationsForStaff(staffId);
}

export async function getStaffDocumentsAction(staffId: string): Promise<StaffDocument[]> {
  return getDocumentsForStaff(staffId);
}

// نفس دلو order-submissions المستخدَم أصلاً لمرفقات البوت والموظفين — مسار
// staff-photos/ فرعي خاص بالصور الشخصية.
export async function updateStaffPhotoAction(staffId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("الرجاء اختيار صورة");
  if (!file.type.startsWith("image/")) throw new Error("الملف يجب أن يكون صورة");
  if (file.size > 5 * 1024 * 1024) throw new Error("الصورة أكبر من الحد المسموح (5 ميجابايت)");

  const arrayBuffer = await file.arrayBuffer();
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `staff-photos/${staffId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("order-submissions")
    .upload(path, arrayBuffer, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("order-submissions").getPublicUrl(path);

  const { error } = await supabase.from("erp_staff").update({ photo_url: data.publicUrl }).eq("id", staffId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}/profile`);
}

export async function removeStaffPhotoAction(staffId: string) {
  const { error } = await supabase.from("erp_staff").update({ photo_url: null }).eq("id", staffId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}/profile`);
}

// أرقام هاتف بصيغ فلسطينية/دولية شائعة (أرقام، +، مسافات، شرطات) — تحقق
// شكلي بسيط يمنع إدخال نص عشوائي بالخطأ، وليس تحققاً كاملاً من صحة الرقم.
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;
// معرّف شات تيليجرام للأفراد رقم صحيح موجب فقط.
const TELEGRAM_ID_PATTERN = /^\d{5,15}$/;

function validateContactFields(phone: string, telegramChatId: string): string | null {
  if (phone && !PHONE_PATTERN.test(phone)) return "رقم الهاتف غير صالح — أرقام فقط (يمكن +/-/مسافات)";
  if (telegramChatId && !TELEGRAM_ID_PATTERN.test(telegramChatId)) return "معرّف تليجرام غير صالح — أرقام فقط";
  return null;
}

export async function createStaffAction(formData: FormData) {
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const phone = ((formData.get("phone") as string) || "").trim();
  const telegram_chat_id = ((formData.get("telegram_chat_id") as string) || "").trim();
  const username = (formData.get("username") as string || "").trim();
  const password = (formData.get("password") as string || "");
  const supervisor_id = (formData.get("supervisor_id") as string || "").trim();
  const hire_date = (formData.get("hire_date") as string || "").trim();

  if (!name || !role) throw new Error("الاسم والدور مطلوبان");
  if (username && !password) throw new Error("الرجاء إدخال كلمة مرور مع اسم المستخدم");
  const contactError = validateContactFields(phone, telegram_chat_id);
  if (contactError) throw new Error(contactError);

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
      hire_date: hire_date || null,
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
  const phone = ((formData.get("phone") as string) || "").trim();
  const telegram_chat_id = ((formData.get("telegram_chat_id") as string) || "").trim();
  const supervisor_id = (formData.get("supervisor_id") as string || "").trim();
  const extra_access = formData.getAll("extra_access") as string[];
  const is_active = formData.get("is_active") === "on";
  const hire_date = (formData.get("hire_date") as string || "").trim();
  const vacation_balance_raw = (formData.get("vacation_balance_days") as string || "").trim();
  const vacation_balance_days = vacation_balance_raw === "" ? null : Number(vacation_balance_raw);

  if (!name || !role) throw new Error("الاسم والدور مطلوبان");
  if (supervisor_id === id) throw new Error("لا يمكن أن يكون الموظف مسؤوله المباشر عن نفسه");
  if (vacation_balance_days !== null && (!Number.isFinite(vacation_balance_days) || vacation_balance_days < 0)) {
    throw new Error("رصيد الإجازات يجب أن يكون رقماً صحيحاً موجباً");
  }
  const contactError = validateContactFields(phone, telegram_chat_id);
  if (contactError) throw new Error(contactError);

  const { data: before } = await supabase.from("erp_staff").select("name, role, vacation_balance_days").eq("id", id).maybeSingle();

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
      hire_date: hire_date || null,
      ...(vacation_balance_days !== null ? { vacation_balance_days } : {}),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const session = await getSession();

  // سجل تدقيق فقط لما يتغيّر الدور فعلاً — تغيير صلاحيات موظف حدث يستحق أثراً.
  if (before && before.role !== role) {
    await addAuditEntry({
      user: session?.name || "—",
      action: "تغيير دور موظف",
      item_code: before.name || name,
      field: "role",
      old_value: ROLE_LABELS[before.role] || before.role,
      new_value: ROLE_LABELS[role] || role,
    });
  }

  // تعديل رصيد الإجازات يدوياً من الإدارة (خارج آلية الخصم التلقائي عند
  // الموافقة على طلب) حدث يستحق أثراً أيضاً — يمنع خلافاً لاحقاً حول "مين غيّر الرصيد".
  if (before && vacation_balance_days !== null && before.vacation_balance_days !== vacation_balance_days) {
    await addAuditEntry({
      user: session?.name || "—",
      action: "تعديل رصيد إجازات يدوياً",
      item_code: before.name || name,
      field: "vacation_balance_days",
      old_value: String(before.vacation_balance_days),
      new_value: String(vacation_balance_days),
    });
  }

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

// أي شخص بصلاحية الوصول لهذه الصفحة يقدر يغيّر بيانات دخول أي موظف آخر —
// سجل تدقيق يوثّق من فعلها ومتى (بلا تسجيل كلمة المرور نفسها أبداً).
export async function setStaffCredentialsAction(id: string, formData: FormData) {
  const username = (formData.get("username") as string || "").trim();
  const password = (formData.get("password") as string || "");

  if (!username || !password) throw new Error("الرجاء إدخال اسم المستخدم وكلمة المرور");

  const { data: before } = await supabase.from("erp_staff").select("name, username").eq("id", id).maybeSingle();

  const { error } = await supabase
    .from("erp_staff")
    .update({ username, password_hash: await hashPassword(password) })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") throw new Error("اسم المستخدم مستخدم بالفعل");
    throw new Error(error.message);
  }

  const session = await getSession();
  await addAuditEntry({
    user: session?.name || "—",
    action: before?.username ? "تحديث بيانات دخول موظف" : "تفعيل حساب دخول موظف",
    item_code: before?.name || "—",
    field: "username",
    old_value: before?.username || "—",
    new_value: username,
    note: "كلمة المرور غُيّرت أيضاً (غير مسجَّلة هنا لأسباب أمنية)",
  });

  revalidatePath("/dashboard/staff");
}

export async function addStaffEvaluationAction(staffId: string, formData: FormData) {
  const session = await getSession();
  const period = (formData.get("period") as string || "").trim();
  const rating = Number(formData.get("rating"));
  const notes = (formData.get("notes") as string || "").trim();

  const result = await addStaffEvaluation({
    staffId,
    evaluatorName: session?.name || "—",
    period,
    rating,
    notes,
  });
  if (result.error) throw new Error(result.error);

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}/profile`);
}

export async function deleteStaffEvaluationAction(id: string, staffId: string) {
  const result = await deleteStaffEvaluation(id);
  if (result.error) throw new Error(result.error);

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}/profile`);
}

export async function uploadStaffDocumentAction(staffId: string, formData: FormData) {
  const session = await getSession();
  const file = formData.get("file") as File | null;
  const docType = (formData.get("doc_type") as string || "other").trim();

  if (!file) throw new Error("الرجاء اختيار ملف");

  const result = await uploadStaffDocument({ staffId, file, docType, uploadedBy: session?.name || "—" });
  if (result.error) throw new Error(result.error);

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}/profile`);
}

export async function deleteStaffDocumentAction(id: string, staffId: string) {
  const result = await deleteStaffDocument(id);
  if (result.error) throw new Error(result.error);

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}/profile`);
}
