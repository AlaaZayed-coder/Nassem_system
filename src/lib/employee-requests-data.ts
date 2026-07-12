import { supabase } from "./supabase";
import { sendTelegramMessage } from "./telegram";

export type EmployeeRequestType = "loan" | "vacation" | "permission" | "complaint" | "attendance_fix";

export type EmployeeRequest = {
  id: string;
  staff_id: string;
  request_type: EmployeeRequestType;
  details: Record<string, any>;
  status: "قيد الانتظار" | "موافق عليه" | "مرفوض" | "ملغى" | "مُصعَّد";
  current_approver_id: string | null;
  manager_id: string | null;
  action_notes: string | null;
  source: "web" | "telegram";
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  erp_staff?: { name: string } | null;
};

// خريطة توجيه بسيطة في الكود بدل جدول قاعدة بيانات — الفريق صغير وقواعد
// التوجيه نادراً ما تتغير؛ سهلة التحويل لجدول لاحقاً لو كبر الفريق فعلاً.
// لا يوجد حالياً هيكل تسلسل إداري (مدير مباشر لكل موظف) في erp_staff، لذا كل
// الأنواع تذهب لأي موظف بدور "manager" حتى يُضاف دور HR/تسلسل إداري منفصل.
export const REQUEST_TYPE_LABEL: Record<EmployeeRequestType, string> = {
  loan: "سلفة",
  vacation: "إجازة",
  permission: "مغادرة",
  complaint: "شكوى",
  attendance_fix: "تبرير دوام",
};

export const REQUEST_TYPE_REQUIRES_ATTACHMENT: Record<EmployeeRequestType, boolean> = {
  loan: false,
  vacation: false,
  permission: false,
  complaint: false,
  attendance_fix: false,
};

async function getPrimaryManagerId(): Promise<string | null> {
  const { data } = await supabase
    .from("erp_staff")
    .select("id")
    .eq("role", "manager")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

// كل الأنواع تُوجَّه لنفس المكان حالياً (لا تسلسل إداري بعد) — نُبقيها كدالة
// منفصلة لكل نوع كي يسهل لاحقاً توجيه "شكوى" لدور HR مستقل دون لمس بقية الأنواع.
export async function resolveApproverForRequestType(_type: EmployeeRequestType): Promise<string | null> {
  return getPrimaryManagerId();
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export async function getVacationBalance(staffId: string): Promise<number> {
  const { data } = await supabase.from("erp_staff").select("vacation_balance_days").eq("id", staffId).single();
  return data?.vacation_balance_days ?? 0;
}

export async function getOutstandingLoanTotalCents(staffId: string): Promise<number> {
  const { data } = await supabase
    .from("erp_staff_advances")
    .select("amount_cents")
    .eq("staff_id", staffId)
    .is("reversed_at", null);
  return (data || []).reduce((sum: number, r: any) => sum + (r.amount_cents || 0), 0);
}

// موظفون آخرون في نفس الطلب (نفس الفترة تقريباً) لهم إجازة معتمدة متداخلة —
// بيانات دعم قرار للمدير، وليست منعاً صارماً.
export async function getOverlappingApprovedVacations(startDate: string, endDate: string, excludeStaffId: string): Promise<{ name: string }[]> {
  const { data } = await supabase
    .from("erp_employee_requests")
    .select("staff_id, details, erp_staff(name)")
    .eq("request_type", "vacation")
    .eq("status", "موافق عليه")
    .neq("staff_id", excludeStaffId);

  return (data || [])
    .filter((r: any) => {
      const s = r.details?.start_date;
      const e = r.details?.end_date;
      if (!s || !e) return false;
      return s <= endDate && e >= startDate;
    })
    .map((r: any) => ({ name: r.erp_staff?.name || "غير معروف" }));
}

export async function getEmployeeRequests(status?: string): Promise<EmployeeRequest[]> {
  let query = supabase
    .from("erp_employee_requests")
    .select("*, erp_staff!erp_employee_requests_staff_id_fkey(name)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching employee requests:", error);
    return [];
  }
  return data || [];
}

export async function getEmployeeRequestById(id: string): Promise<EmployeeRequest | null> {
  const { data, error } = await supabase
    .from("erp_employee_requests")
    .select("*, erp_staff!erp_employee_requests_staff_id_fkey(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching employee request:", error);
    return null;
  }
  return data;
}

export type CreateEmployeeRequestInput = {
  staff_id: string;
  request_type: EmployeeRequestType;
  details: Record<string, any>;
  source: "web" | "telegram";
};

// تحقق مسبق قبل حتى إنشاء الطلب — لا يُشغَل المدير بطلب مرفوض سلفاً (مثال:
// إجازة تتجاوز الرصيد المتاح). لا يوجد سقف نظامي معروف للسلف حالياً، لذا لا
// تحقق صارم عليها، فقط بيانات دعم قرار تُعرض للمدير لاحقاً.
export async function validateEmployeeRequest(input: CreateEmployeeRequestInput): Promise<{ error?: string }> {
  if (input.request_type === "vacation") {
    const { start_date, end_date } = input.details;
    if (!start_date || !end_date) return { error: "يجب تحديد تاريخ البداية والنهاية" };
    const requestedDays = daysBetween(start_date, end_date);
    const balance = await getVacationBalance(input.staff_id);
    if (requestedDays > balance) {
      return { error: `رصيد الإجازات المتاح (${balance} يوم) لا يكفي لعدد الأيام المطلوبة (${requestedDays} يوم)` };
    }
  }
  return {};
}

export async function createEmployeeRequest(input: CreateEmployeeRequestInput): Promise<{ request?: EmployeeRequest; error?: string }> {
  const validation = await validateEmployeeRequest(input);
  if (validation.error) return { error: validation.error };

  const approverId = await resolveApproverForRequestType(input.request_type);

  const { data, error } = await supabase
    .from("erp_employee_requests")
    .insert([{
      staff_id: input.staff_id,
      request_type: input.request_type,
      details: input.details,
      source: input.source,
      current_approver_id: approverId,
    }])
    .select("*, erp_staff!erp_employee_requests_staff_id_fkey(name)")
    .single();

  if (error) {
    console.error("Error creating employee request:", error);
    return { error: error.message };
  }
  return { request: data };
}

// أثر تلقائي عند الاعتماد — لكل نوع أثره الخاص (سلفة → قيد مالي، إجازة → خصم
// رصيد، تبرير دوام → تصحيح سجل الحضور). الشكوى والمغادرة بلا أثر رقمي حالياً.
async function applyApprovalSideEffect(request: EmployeeRequest): Promise<void> {
  if (request.request_type === "loan") {
    const amountCents = Math.round(Number(request.details.amount || 0) * 100);
    await supabase.from("erp_staff_advances").insert([{
      staff_id: request.staff_id,
      request_id: request.id,
      amount_cents: amountCents,
      repayment_method: request.details.repayment_method || null,
    }]);
  } else if (request.request_type === "vacation") {
    const days = daysBetween(request.details.start_date, request.details.end_date);
    const balance = await getVacationBalance(request.staff_id);
    await supabase.from("erp_staff").update({ vacation_balance_days: balance - days }).eq("id", request.staff_id);
  } else if (request.request_type === "attendance_fix") {
    const logDate = request.details.date;
    if (logDate) {
      await supabase.from("erp_attendance_logs").upsert(
        [{ staff_id: request.staff_id, log_date: logDate, status: "مُبرَّر", notes: request.details.reason || null, justified_by_request_id: request.id }],
        { onConflict: "staff_id,log_date" }
      );
    }
  }
}

// عكس الأثر عند إلغاء طلب كان مُعتمداً سابقاً — سجل تدقيق كامل بلا حذف فعلي.
async function reverseApprovalSideEffect(request: EmployeeRequest): Promise<void> {
  if (request.request_type === "loan") {
    await supabase.from("erp_staff_advances").update({ reversed_at: new Date().toISOString() }).eq("request_id", request.id);
  } else if (request.request_type === "vacation") {
    const days = daysBetween(request.details.start_date, request.details.end_date);
    const balance = await getVacationBalance(request.staff_id);
    await supabase.from("erp_staff").update({ vacation_balance_days: balance + days }).eq("id", request.staff_id);
  } else if (request.request_type === "attendance_fix") {
    await supabase.from("erp_attendance_logs").update({ status: "غائب", justified_by_request_id: null }).eq("justified_by_request_id", request.id);
  }
}

export async function resolveEmployeeRequest(
  id: string,
  decision: "موافق عليه" | "مرفوض",
  managerId: string,
  actionNotes?: string
): Promise<{ error?: string }> {
  const request = await getEmployeeRequestById(id);
  if (!request) return { error: "الطلب غير موجود" };
  if (request.status !== "قيد الانتظار") return { error: "تمت معالجة هذا الطلب مسبقاً" };

  const { error } = await supabase
    .from("erp_employee_requests")
    .update({
      status: decision,
      manager_id: managerId,
      action_notes: actionNotes || null,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  if (decision === "موافق عليه") {
    await applyApprovalSideEffect(request);
  }

  await notifyStaffOfDecision(request, decision, actionNotes);

  return {};
}

// حلقة تغذية راجعة — الرفض الصامت يزيد مراجعات الموظفين اليدوية للإدارة.
async function notifyStaffOfDecision(request: EmployeeRequest, decision: "موافق عليه" | "مرفوض", actionNotes?: string) {
  const { data: requester } = await supabase.from("erp_staff").select("telegram_chat_id").eq("id", request.staff_id).single();
  if (!requester?.telegram_chat_id) return;

  const typeLabel = REQUEST_TYPE_LABEL[request.request_type];
  const text = decision === "موافق عليه"
    ? `✅ تمت الموافقة على طلب ${typeLabel} الخاص بك.`
    : `❌ تم رفض طلب ${typeLabel} الخاص بك.${actionNotes ? ` السبب: ${actionNotes}` : ""}`;

  await sendTelegramMessage(requester.telegram_chat_id, text);
}

export async function cancelEmployeeRequest(id: string, actionNotes?: string): Promise<{ error?: string }> {
  const request = await getEmployeeRequestById(id);
  if (!request) return { error: "الطلب غير موجود" };
  if (request.status === "ملغى") return { error: "الطلب ملغى بالفعل" };

  const wasApproved = request.status === "موافق عليه";

  const { error } = await supabase
    .from("erp_employee_requests")
    .update({ status: "ملغى", action_notes: actionNotes || request.action_notes, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  if (wasApproved) {
    await reverseApprovalSideEffect(request);
  }

  return {};
}
