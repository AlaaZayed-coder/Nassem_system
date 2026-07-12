"use server";

import { revalidatePath } from "next/cache";
import {
  createEmployeeRequest,
  resolveEmployeeRequest,
  cancelEmployeeRequest,
  getEmployeeRequestById,
  getVacationBalance,
  getOutstandingLoanTotalCents,
  getOverlappingApprovedVacations,
  REQUEST_TYPE_LABEL,
  EmployeeRequestType,
} from "@/lib/employee-requests-data";
import { supabase } from "@/lib/supabase";
import { sendTelegramInlineKeyboard } from "@/lib/telegram";

export async function createEmployeeRequestAction(formData: FormData): Promise<{ error?: string }> {
  const staff_id = formData.get("staff_id") as string;
  const request_type = formData.get("request_type") as EmployeeRequestType;
  const source = "web" as const;

  if (!staff_id) return { error: "يجب اختيار اسمك من القائمة" };
  if (!request_type) return { error: "يجب اختيار نوع الطلب" };

  let details: Record<string, any> = {};
  if (request_type === "loan") {
    details = { amount: Number(formData.get("amount") || 0), repayment_method: (formData.get("repayment_method") as string) || null };
    if (!details.amount) return { error: "يجب إدخال مبلغ السلفة" };
  } else if (request_type === "vacation") {
    details = { start_date: formData.get("start_date"), end_date: formData.get("end_date"), reason: (formData.get("reason") as string) || null };
  } else if (request_type === "permission") {
    details = { date: formData.get("date"), from_time: formData.get("from_time"), to_time: formData.get("to_time"), reason: (formData.get("reason") as string) || null };
  } else if (request_type === "complaint") {
    details = { subject: formData.get("subject"), description: formData.get("description") };
    if (!details.description) return { error: "يجب كتابة تفاصيل الشكوى" };
  } else if (request_type === "attendance_fix") {
    details = { date: formData.get("date"), reason: (formData.get("reason") as string) || null };
    if (!details.date) return { error: "يجب تحديد تاريخ الدوام المطلوب تبريره" };
  }

  const { request, error } = await createEmployeeRequest({ staff_id, request_type, details, source });
  if (error) return { error };
  if (request) await notifyApproverWithContext(request.id);

  revalidatePath("/dashboard/staff/requests");
  return {};
}

// يبني رسالة تيليجرام للمعتمد تحمل بيانات دعم القرار (رصيد متاح، تعارضات،
// إجمالي سلف قائمة) قبل عرض زري الموافقة/الرفض — وليس الاعتماد الأعمى.
async function notifyApproverWithContext(requestId: string) {
  const request = await getEmployeeRequestById(requestId);
  if (!request || !request.current_approver_id) return;

  const { data: approver } = await supabase.from("erp_staff").select("telegram_chat_id").eq("id", request.current_approver_id).single();
  if (!approver?.telegram_chat_id) return;

  const staffName = request.erp_staff?.name || "موظف";
  const typeLabel = REQUEST_TYPE_LABEL[request.request_type];
  let contextLines: string[] = [];
  let detailLines: string[] = [];

  if (request.request_type === "loan") {
    const outstanding = await getOutstandingLoanTotalCents(request.staff_id);
    detailLines.push(`المبلغ المطلوب: ${request.details.amount} ₪`);
    if (request.details.repayment_method) detailLines.push(`طريقة السداد المقترحة: ${request.details.repayment_method}`);
    contextLines.push(`💰 إجمالي السلف القائمة على الموظف حالياً: ${(outstanding / 100).toFixed(2)} ₪`);
  } else if (request.request_type === "vacation") {
    const balance = await getVacationBalance(request.staff_id);
    const overlapping = await getOverlappingApprovedVacations(request.details.start_date, request.details.end_date, request.staff_id);
    detailLines.push(`من ${request.details.start_date} إلى ${request.details.end_date}`);
    contextLines.push(`📅 رصيد الإجازات المتاح: ${balance} يوم`);
    if (overlapping.length > 0) {
      contextLines.push(`⚠️ موظفون آخرون مجازون في نفس الفترة تقريباً: ${overlapping.map((o) => o.name).join("، ")}`);
    }
  } else if (request.request_type === "permission") {
    detailLines.push(`تاريخ: ${request.details.date} — من ${request.details.from_time || "—"} إلى ${request.details.to_time || "—"}`);
    if (request.details.reason) detailLines.push(`السبب: ${request.details.reason}`);
  } else if (request.request_type === "complaint") {
    detailLines.push(`الموضوع: ${request.details.subject || "—"}`);
    detailLines.push(`التفاصيل: ${request.details.description}`);
  } else if (request.request_type === "attendance_fix") {
    detailLines.push(`تاريخ الدوام: ${request.details.date}`);
    if (request.details.reason) detailLines.push(`السبب: ${request.details.reason}`);
  }

  const text = [
    `📋 طلب ${typeLabel} جديد من "${staffName}"`,
    ...detailLines,
    ...(contextLines.length > 0 ? ["", ...contextLines] : []),
  ].join("\n");

  await sendTelegramInlineKeyboard(approver.telegram_chat_id, text, [
    [
      { text: "✅ موافقة", callback_data: `emp_approve:${request.id}` },
      { text: "❌ رفض", callback_data: `emp_reject:${request.id}` },
    ],
  ]);
}

export async function approveEmployeeRequestAction(id: string, managerId: string): Promise<{ error?: string }> {
  const result = await resolveEmployeeRequest(id, "موافق عليه", managerId);
  revalidatePath("/dashboard/staff/requests");
  return result;
}

export async function rejectEmployeeRequestAction(id: string, managerId: string, reason?: string): Promise<{ error?: string }> {
  const result = await resolveEmployeeRequest(id, "مرفوض", managerId, reason);
  revalidatePath("/dashboard/staff/requests");
  return result;
}

export async function cancelEmployeeRequestAction(id: string, reason?: string): Promise<{ error?: string }> {
  const result = await cancelEmployeeRequest(id, reason);
  revalidatePath("/dashboard/staff/requests");
  return result;
}
