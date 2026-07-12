"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import {
  createOrderSubmission,
  updateOrderSubmissionStatus,
  findCustomerByPhone,
  searchCustomers,
  updateSubmissionCustomer,
  addSubmissionAttachment,
  getNextPendingSubmissionId,
} from "@/lib/order-submissions-data";

export async function createWebSubmissionAction(formData: FormData): Promise<{ error?: string }> {
  const submitted_by_name = (formData.get("submitted_by_name") as string) || null;
  const customer_name = (formData.get("customer_name") as string) || null;
  const customer_phone = (formData.get("customer_phone") as string) || null;
  const customer_address = (formData.get("customer_address") as string) || null;
  const customer_company_name = (formData.get("customer_company_name") as string) || null;
  const needs_site_visit = formData.get("needs_site_visit") === "on";
  const text_content = (formData.get("text_content") as string) || null;
  const file = formData.get("file") as File | null;

  if (!customer_name && !customer_phone) {
    return { error: "أدخل اسم العميل أو رقم هاتفه على الأقل" };
  }
  if (!text_content && (!file || file.size === 0)) {
    return { error: "أضف نصاً أو صورة أو تسجيلاً صوتياً على الأقل" };
  }

  const matchedCustomer = customer_phone ? await findCustomerByPhone(customer_phone) : null;

  let file_url: string | null = null;
  let content_type: "image" | "voice" | "text" = "text";

  if (file && file.size > 0) {
    content_type = file.type.startsWith("audio") ? "voice" : "image";
    const ext = content_type === "voice" ? "webm" : (file.name.split(".").pop() || "jpg");
    const path = `${Date.now()}-web.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("order-submissions")
      .upload(path, await file.arrayBuffer(), { contentType: file.type });

    if (uploadError) return { error: "فشل رفع الملف: " + uploadError.message };

    const { data } = supabase.storage.from("order-submissions").getPublicUrl(path);
    file_url = data.publicUrl;
  } else {
    content_type = "text";
  }

  try {
    await createOrderSubmission({
      submitted_by_name,
      source: "web",
      content_type,
      text_content,
      file_url,
      customer_name,
      customer_phone,
      customer_address,
      customer_company_name,
      matched_customer_id: matchedCustomer?.id || null,
      needs_site_visit,
    });
  } catch (err: any) {
    return { error: err.message || "فشل حفظ الطلبية" };
  }

  revalidatePath("/dashboard/sales/submissions");
  return {};
}

// تقرير الزيارة الميدانية (كشف الموقع): يُضاف كإضافة على الطلبية (نفس آلية
// "الإضافات قبل الاعتماد" الموجودة)، ثم تنتقل الطلبية تلقائياً من "بانتظار
// الكشف" إلى "قيد المراجعة" فتظهر في صندوق معالج الطلبيات كالمعتاد.
export async function submitSiteVisitReportAction(formData: FormData): Promise<{ error?: string }> {
  const submission_id = formData.get("submission_id") as string;
  const visited_by = (formData.get("visited_by") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const file = formData.get("photo") as File | null;

  if (!submission_id) return { error: "طلبية غير محددة" };
  if (!notes && (!file || file.size === 0)) {
    return { error: "أضف ملاحظات الكشف أو صورة للموقع على الأقل" };
  }

  try {
    if (notes) {
      await addSubmissionAttachment({ submission_id, content_type: "text", text_content: `📍 تقرير كشف الموقع: ${notes}`, added_by_name: visited_by });
    }

    if (file && file.size > 0) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-site-visit.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("order-submissions")
        .upload(path, await file.arrayBuffer(), { contentType: file.type });

      if (uploadError) return { error: "فشل رفع الصورة: " + uploadError.message };

      const { data } = supabase.storage.from("order-submissions").getPublicUrl(path);
      await addSubmissionAttachment({ submission_id, content_type: "image", file_url: data.publicUrl, added_by_name: visited_by });
    }

    await updateOrderSubmissionStatus(submission_id, "قيد المراجعة");
  } catch (err: any) {
    return { error: err.message || "فشل حفظ تقرير الكشف" };
  }

  revalidatePath("/dashboard/sales/submissions");
  revalidatePath(`/dashboard/sales/submissions/${submission_id}`);
  return {};
}

export async function resolveSubmissionAction(id: string, status: string, notes?: string) {
  await updateOrderSubmissionStatus(id, status, notes);
  revalidatePath("/dashboard/sales/submissions");
}

export async function getNextPendingSubmissionIdAction(excludeId?: string) {
  return getNextPendingSubmissionId(excludeId);
}

export async function searchCustomersAction(query: string) {
  return searchCustomers(query);
}

export async function updateSubmissionCustomerAction(
  submissionId: string,
  input: { customer_name: string; customer_phone: string | null; matched_customer_id: string | null }
) {
  await updateSubmissionCustomer(submissionId, input);
  revalidatePath("/dashboard/sales/submissions");
}

export async function addSubmissionAttachmentAction(formData: FormData): Promise<{ error?: string }> {
  const submission_id = formData.get("submission_id") as string;
  const added_by_name = (formData.get("added_by_name") as string) || null;
  const text_content = (formData.get("text_content") as string) || null;
  const file = formData.get("file") as File | null;

  if (!submission_id) return { error: "طلبية غير محددة" };
  if (!text_content && (!file || file.size === 0)) {
    return { error: "أضف نصاً أو صورة أو تسجيلاً صوتياً على الأقل" };
  }

  let file_url: string | null = null;
  let content_type: "image" | "voice" | "text" = "text";

  if (file && file.size > 0) {
    content_type = file.type.startsWith("audio") ? "voice" : "image";
    const ext = content_type === "voice" ? "webm" : (file.name.split(".").pop() || "jpg");
    const path = `${Date.now()}-attachment.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("order-submissions")
      .upload(path, await file.arrayBuffer(), { contentType: file.type });

    if (uploadError) return { error: "فشل رفع الملف: " + uploadError.message };

    const { data } = supabase.storage.from("order-submissions").getPublicUrl(path);
    file_url = data.publicUrl;
  }

  try {
    await addSubmissionAttachment({ submission_id, content_type, text_content, file_url, added_by_name });
  } catch (err: any) {
    return { error: err.message || "فشل حفظ الإضافة" };
  }

  revalidatePath("/dashboard/sales/submissions");
  return {};
}
