"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { sendTelegramInlineKeyboard } from "@/lib/telegram";

// سند إخراج: يعيّن فريق التركيب ويسجّل من قام بالإخراج، دون المساس بحقل
// status الأصلي لطلبية الباب (يبقى كما هو، هذه طبقة تتبّع إضافية).
export async function dispatchInstallationAction(formData: FormData): Promise<{ error?: string }> {
  const door_order_id = formData.get("door_order_id") as string;
  const installation_team_name = (formData.get("installation_team_name") as string) || null;
  const dispatched_by_staff_id = (formData.get("dispatched_by_staff_id") as string) || null;
  const exit_slip_notes = (formData.get("exit_slip_notes") as string) || null;

  if (!door_order_id) return { error: "طلبية غير محددة" };
  if (!installation_team_name) return { error: "يجب تحديد اسم فريق التركيب" };

  const { error } = await supabase
    .from("erp_door_orders")
    .update({
      installation_status: "قيد التركيب",
      installation_team_name,
      dispatched_by_staff_id,
      dispatched_at: new Date().toISOString(),
      exit_slip_notes,
    })
    .eq("id", door_order_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/installation");
  revalidatePath(`/dashboard/installation/${door_order_id}`);
  return {};
}

async function uploadInstallationPhoto(file: File, label: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-install-${label}.${ext}`;

  const { error } = await supabase.storage
    .from("order-submissions")
    .upload(path, await file.arrayBuffer(), { contentType: file.type });

  if (error) return null;

  const { data } = supabase.storage.from("order-submissions").getPublicUrl(path);
  return data.publicUrl;
}

// التقرير الميداني: صور قبل/بعد التركيب، أوقات الوصول/المغادرة، واسم ورقم
// من استلم الباب في الموقع. عند الحفظ يُرسل طلب تأكيد لمن قام بالإخراج عبر
// تيليجرام (بدل واتساب) بزر مباشر لتأكيد استلام العميل.
export async function submitInstallationReportAction(formData: FormData): Promise<{ error?: string }> {
  const door_order_id = formData.get("door_order_id") as string;
  const field_report_number = (formData.get("field_report_number") as string) || null;
  const installation_type = (formData.get("installation_type") as string) || null;
  const field_start_time = (formData.get("field_start_time") as string) || null;
  const field_end_time = (formData.get("field_end_time") as string) || null;
  const field_technician_name = (formData.get("field_technician_name") as string) || null;
  const recipient_name = (formData.get("recipient_name") as string) || null;
  const recipient_phone = (formData.get("recipient_phone") as string) || null;
  const beforePhoto = formData.get("before_photo") as File | null;
  const afterPhoto = formData.get("after_photo") as File | null;

  if (!door_order_id) return { error: "طلبية غير محددة" };
  if (!recipient_name) return { error: "يجب إدخال اسم الشخص المستلم" };

  const { data: order, error: orderError } = await supabase
    .from("erp_door_orders")
    .select("id, dispatched_by_staff_id, responsible_staff_id, erp_customers(name)")
    .eq("id", door_order_id)
    .single();

  if (orderError || !order) return { error: "تعذّر إيجاد الطلبية" };

  const [before_photo_url, after_photo_url] = await Promise.all([
    beforePhoto ? uploadInstallationPhoto(beforePhoto, "before") : Promise.resolve(null),
    afterPhoto ? uploadInstallationPhoto(afterPhoto, "after") : Promise.resolve(null),
  ]);

  const { error } = await supabase
    .from("erp_door_orders")
    .update({
      field_report_number,
      installation_type,
      field_start_time,
      field_end_time,
      field_technician_name,
      recipient_name,
      recipient_phone,
      ...(before_photo_url ? { before_photo_url } : {}),
      ...(after_photo_url ? { after_photo_url } : {}),
      installation_status: "بانتظار تأكيد العميل",
    })
    .eq("id", door_order_id);

  if (error) return { error: error.message };

  const notifyStaffId = order.dispatched_by_staff_id || order.responsible_staff_id;
  if (notifyStaffId) {
    const { data: staff } = await supabase.from("erp_staff").select("telegram_chat_id").eq("id", notifyStaffId).single();
    if (staff?.telegram_chat_id) {
      const customerName = (order as any).erp_customers?.name || "العميل";
      await sendTelegramInlineKeyboard(
        staff.telegram_chat_id,
        `تم تركيب باب العميل "${customerName}" واستلامه بواسطة "${recipient_name}". هل تؤكد استلام العميل النهائي؟`,
        [[{ text: "✅ تأكيد استلام العميل", callback_data: `confirm_install:${door_order_id}` }]]
      );
    }
  }

  revalidatePath("/dashboard/installation");
  revalidatePath(`/dashboard/installation/${door_order_id}`);
  return {};
}
