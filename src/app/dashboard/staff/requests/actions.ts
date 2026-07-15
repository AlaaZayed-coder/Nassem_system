"use server";

import { revalidatePath } from "next/cache";
import {
  createEmployeeRequest,
  resolveEmployeeRequest,
  cancelEmployeeRequest,
  acknowledgeEmployeeRequest,
  notifyApproverWithContext,
  notifyRecipientsWithContext,
  REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY,
  EmployeeRequestType,
} from "@/lib/employee-requests-data";

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
    if (!details.date) return { error: "يجب تحديد تاريخ الدوام المطلوب إثباته" };
  } else if (request_type === "injury_report") {
    details = { date: formData.get("date"), description: (formData.get("description") as string) || "" };
    if (!details.date) return { error: "يجب تحديد تاريخ الحادثة" };
    if (!details.description) return { error: "يجب كتابة وصف الحادثة" };
  } else if (request_type === "work_report") {
    details = { content: (formData.get("content") as string) || "" };
    if (!details.content) return { error: "يجب كتابة تقرير العمل" };
  }

  const { request, error } = await createEmployeeRequest({ staff_id, request_type, details, source });
  if (error) return { error };
  if (request) {
    if (REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY[request_type]) await notifyRecipientsWithContext(request.id);
    else await notifyApproverWithContext(request.id);
  }

  revalidatePath("/dashboard/staff/requests");
  return {};
}

export async function acknowledgeEmployeeRequestAction(id: string, staffId: string): Promise<{ error?: string }> {
  const result = await acknowledgeEmployeeRequest(id, staffId);
  revalidatePath("/dashboard/staff/requests");
  return result;
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
