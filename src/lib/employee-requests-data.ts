import { supabase } from "./supabase";
import { sendTelegramMessage, sendTelegramInlineKeyboard, sendTelegramVoice } from "./telegram";

export type EmployeeRequestType = "loan" | "vacation" | "permission" | "complaint" | "attendance_fix" | "injury_report" | "work_report";

export type EmployeeRequest = {
  id: string;
  staff_id: string;
  request_type: EmployeeRequestType;
  details: Record<string, any>;
  status: "قيد الانتظار" | "موافق عليه" | "مرفوض" | "ملغى" | "مُصعَّد" | "تم الاستلام";
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
  attendance_fix: "إثبات دوام",
  injury_report: "تبليغ عن إصابة",
  work_report: "تقرير عمل",
};

export const REQUEST_TYPE_REQUIRES_ATTACHMENT: Record<EmployeeRequestType, boolean> = {
  loan: false,
  vacation: false,
  permission: false,
  complaint: false,
  attendance_fix: false,
  injury_report: false,
  work_report: false,
};

// تبليغ الإصابة وتقرير العمل ليسا "طلباً" يحتاج موافقة/رفض — مجرد بلاغ يصل
// للمدير ومسؤول الموارد البشرية معاً، وأي منهما يقدر يعلّم "تم الاستلام".
export const REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY: Record<EmployeeRequestType, boolean> = {
  loan: false,
  vacation: false,
  permission: false,
  complaint: false,
  attendance_fix: false,
  injury_report: true,
  work_report: true,
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
// تبليغ الإصابة وتقرير العمل بلا معتمد واحد — تصل لعدة مستلمين معاً
// (notifyRecipientsWithContext)، فلا داعي لتعيين current_approver_id هنا.
export async function resolveApproverForRequestType(type: EmployeeRequestType): Promise<string | null> {
  if (REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY[type]) return null;
  return getPrimaryManagerId();
}

async function getManagersAndHR(): Promise<{ id: string; telegram_chat_id: string | null }[]> {
  const { data } = await supabase
    .from("erp_staff")
    .select("id, telegram_chat_id")
    .in("role", ["manager", "hr"])
    .eq("is_active", true);
  return data || [];
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

export async function getEmployeeRequestsForStaff(staffId: string): Promise<EmployeeRequest[]> {
  const { data, error } = await supabase
    .from("erp_employee_requests")
    .select("*, erp_staff!erp_employee_requests_staff_id_fkey(name)")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching employee requests for staff:", error);
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

// تحقق مسبق قبل إنشاء الطلب — يتحقق فقط من اكتمال البيانات الأساسية. تجاوز
// الرصيد المتاح لا يمنع الإرسال؛ يُعرض كملاحظة دعم قرار للمعتمد
// (notifyApproverWithContext) ليقرر هو الموافقة أو الرفض.
export async function validateEmployeeRequest(input: CreateEmployeeRequestInput): Promise<{ error?: string }> {
  if (input.request_type === "vacation") {
    const { start_date, end_date } = input.details;
    if (!start_date || !end_date) return { error: "يجب تحديد تاريخ البداية والنهاية" };
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
// رصيد، إثبات دوام → تصحيح سجل الحضور). الشكوى والمغادرة بلا أثر رقمي حالياً.
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

// يبني رسالة تيليجرام للمعتمد تحمل بيانات دعم القرار (رصيد متاح، تعارضات،
// إجمالي سلف قائمة) قبل عرض زري الموافقة/الرفض — وليس الاعتماد الأعمى.
// مشتركة بين مسار الويب (تقديم من صفحة الطلبات) ومسار البوت.
export async function notifyApproverWithContext(requestId: string) {
  const request = await getEmployeeRequestById(requestId);
  if (!request || !request.current_approver_id) return;

  const { data: approver } = await supabase.from("erp_staff").select("telegram_chat_id").eq("id", request.current_approver_id).single();
  if (!approver?.telegram_chat_id) return;

  const staffName = request.erp_staff?.name || "موظف";
  const typeLabel = REQUEST_TYPE_LABEL[request.request_type];
  const contextLines: string[] = [];
  const detailLines: string[] = [];

  if (request.request_type === "loan") {
    const outstanding = await getOutstandingLoanTotalCents(request.staff_id);
    detailLines.push(`المبلغ المطلوب: ${request.details.amount} ₪`);
    if (request.details.repayment_method) detailLines.push(`طريقة السداد المقترحة: ${request.details.repayment_method}`);
    contextLines.push(`💰 إجمالي السلف القائمة على الموظف حالياً: ${(outstanding / 100).toFixed(2)} ₪`);
  } else if (request.request_type === "vacation") {
    const balance = await getVacationBalance(request.staff_id);
    const requestedDays = daysBetween(request.details.start_date, request.details.end_date);
    const overlapping = await getOverlappingApprovedVacations(request.details.start_date, request.details.end_date, request.staff_id);
    detailLines.push(`من ${request.details.start_date} إلى ${request.details.end_date} (${requestedDays} يوم)`);
    if (requestedDays > balance) {
      contextLines.push(`⚠️ الرصيد غير كافٍ: المتاح ${balance} يوم فقط مقابل ${requestedDays} يوم مطلوبة`);
    } else {
      contextLines.push(`📅 رصيد الإجازات المتاح: ${balance} يوم`);
    }
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
    if (request.details.period) detailLines.push(`النوع: إثبات دوام ${request.details.period}`);
    detailLines.push(`تاريخ الدوام: ${request.details.date}`);
    if (request.details.time) detailLines.push(`الوقت: ${request.details.time}`);
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

// إشعار جماعي لتبليغ الإصابة/تقرير العمل — يصل للمدير ومسؤول الموارد
// البشرية معاً (بدل معتمد واحد)، وكل واحد فيهم يقدر يعلّم "تم الاستلام".
export async function notifyRecipientsWithContext(requestId: string) {
  const request = await getEmployeeRequestById(requestId);
  if (!request) return;

  const recipients = await getManagersAndHR();
  if (recipients.length === 0) return;

  const staffName = request.erp_staff?.name || "موظف";
  const typeLabel = REQUEST_TYPE_LABEL[request.request_type];
  const detailLines: string[] = [];

  if (request.request_type === "injury_report") {
    detailLines.push(`تاريخ الحادثة: ${request.details.date || "—"}`);
    detailLines.push(`الوصف: ${request.details.description || "—"}`);
  } else if (request.request_type === "work_report") {
    if (request.details.content) detailLines.push(request.details.content);
    if (request.details.voice_url) detailLines.push("🎤 تقرير صوتي مرفق (يصلك كملف صوت منفصل)");
  }

  const text = [`🔔 ${typeLabel} جديد من "${staffName}"`, ...detailLines].join("\n");

  for (const r of recipients) {
    if (!r.telegram_chat_id) continue;
    await sendTelegramInlineKeyboard(r.telegram_chat_id, text, [
      [{ text: "✅ تم الاستلام", callback_data: `emp_ack:${request.id}` }],
    ]);
    if (request.details.voice_url) {
      await sendTelegramVoice(r.telegram_chat_id, request.details.voice_url);
    }
  }
}

export async function acknowledgeEmployeeRequest(id: string, staffId: string): Promise<{ error?: string }> {
  const request = await getEmployeeRequestById(id);
  if (!request) return { error: "البلاغ غير موجود" };
  if (request.status !== "قيد الانتظار") return { error: "تم استلام هذا البلاغ مسبقاً" };

  const { error } = await supabase
    .from("erp_employee_requests")
    .update({
      status: "تم الاستلام",
      manager_id: staffId,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  const { data: requester } = await supabase.from("erp_staff").select("telegram_chat_id").eq("id", request.staff_id).single();
  if (requester?.telegram_chat_id) {
    const typeLabel = REQUEST_TYPE_LABEL[request.request_type];
    await sendTelegramMessage(requester.telegram_chat_id, `✅ تم استلام ${typeLabel} الخاص بك.`);
  }

  return {};
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
