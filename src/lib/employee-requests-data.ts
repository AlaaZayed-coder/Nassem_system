import { supabase } from "./supabase";
import { sendTelegramMessage, sendTelegramInlineKeyboard, sendTelegramVoice } from "./telegram";

export type EmployeeRequestType = "loan" | "vacation" | "permission" | "complaint" | "attendance_fix" | "injury_report" | "work_report";

export type ApprovalStage = "hr" | "supervisor" | "manager";

export type ApprovalLogEntry = {
  stage: ApprovalStage;
  staff_id: string;
  staff_name: string;
  decision: "موافقة" | "رفض";
  notes: string | null;
  at: string;
};

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
  approval_stage: ApprovalStage | null;
  approval_log: ApprovalLogEntry[];
  erp_staff?: { name: string } | null;
};

// الأنواع اللي فيها بُعد قابل للفحص (مبلغ/رصيد/مدة) تمر بتسلسل ثلاثي:
// الموارد البشرية (فحص الرصيد/السقف) ← المسؤول المباشر ← مدير النظام. أي
// رفض بأي مرحلة ينهي الطلب فوراً. بقية الأنواع تبقى بمعتمِد واحد كالسابق.
export const STAGED_REQUEST_TYPES: EmployeeRequestType[] = ["loan", "vacation", "permission"];

export const STAGE_LABEL: Record<ApprovalStage, string> = {
  hr: "الموارد البشرية",
  supervisor: "المسؤول المباشر",
  manager: "مدير النظام",
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

const STATUS_EMOJI: Record<string, string> = {
  "قيد الانتظار": "⏳",
  "موافق عليه": "✅",
  "مرفوض": "❌",
  "ملغى": "🚫",
  "مُصعَّد": "⏫",
  "تم الاستلام": "📬",
};

// وصف مختصر لتفاصيل الطلب — سطر واحد أو سطرين، لعرض مضغوط بقوائم البوت
// ("طلباتي"، "فريقي") بدل التفاصيل الكاملة المستخدمة برسائل الإشعار.
function formatRequestDetail(request: EmployeeRequest): string {
  const d = request.details || {};
  switch (request.request_type) {
    case "loan":
      return `المبلغ: ${d.amount} ₪${d.repayment_method ? ` — ${d.repayment_method}` : ""}`;
    case "vacation":
      return `من ${d.start_date} إلى ${d.end_date}${d.reason ? ` — ${d.reason}` : ""}`;
    case "permission":
      return `${d.date} — من ${d.from_time || "—"} إلى ${d.to_time || "—"}`;
    case "complaint":
      return `${d.subject ? `${d.subject}: ` : ""}${d.description || ""}`;
    case "attendance_fix":
      return `${d.period ? `${d.period} — ` : ""}تاريخ: ${d.date}${d.time ? ` — ${d.time}` : ""}`;
    case "injury_report":
      return `${d.date} — ${d.description || ""}`;
    case "work_report":
      return d.content || (d.voice_url ? "🎤 تقرير صوتي" : "");
    default:
      return "";
  }
}

// سطر مختصر جاهز للعرض بقوائم البوت — نوع + (اسم صاحب الطلب إن طُلب) + تفاصيل + حالة.
export function formatRequestLine(request: EmployeeRequest, opts?: { showName?: boolean }): string {
  const typeLabel = REQUEST_TYPE_LABEL[request.request_type];
  const statusEmoji = STATUS_EMOJI[request.status] || "";
  const name = opts?.showName && request.erp_staff?.name ? ` (${request.erp_staff.name})` : "";
  const date = new Date(request.created_at).toLocaleDateString("en-GB");
  const stageLine = request.status === "قيد الانتظار" && request.approval_stage ? `\n⏳ بانتظار: ${STAGE_LABEL[request.approval_stage]}` : "";
  return `${statusEmoji} ${typeLabel}${name} — ${request.status}${stageLine}\n${formatRequestDetail(request)}\n${date}`;
}

export type AttendanceSummary = { present: number; absent: number; justified: number };

// ملخص دوام الشهر الحالي لموظف — لزر "دوامي" بالبوت.
export async function getAttendanceSummaryForStaff(staffId: string): Promise<AttendanceSummary> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("erp_attendance_logs")
    .select("status")
    .eq("staff_id", staffId)
    .gte("log_date", start)
    .lt("log_date", end);

  const summary: AttendanceSummary = { present: 0, absent: 0, justified: 0 };
  for (const row of data || []) {
    if (row.status === "حاضر") summary.present++;
    else if (row.status === "غائب") summary.absent++;
    else if (row.status === "مُبرَّر") summary.justified++;
  }
  return summary;
}

// معرّفات الموظفين في إجازة معتمدة تشمل تاريخ اليوم — لبطاقة إحصائية بصفحة
// إدارة الموظفين. الفلترة بالتاريخ تتم بالكود (لا فهرس جديد) لأن الفريق صغير.
export async function getOngoingVacationStaffIds(): Promise<Set<string>> {
  const { data } = await supabase
    .from("erp_employee_requests")
    .select("staff_id, details")
    .eq("request_type", "vacation")
    .eq("status", "موافق عليه");

  const today = new Date().toISOString().slice(0, 10);
  const ids = new Set<string>();
  for (const row of data || []) {
    const { start_date, end_date } = row.details || {};
    if (start_date && end_date && start_date <= today && today <= end_date) {
      ids.add(row.staff_id);
    }
  }
  return ids;
}

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

async function getPrimaryHRId(): Promise<string | null> {
  const { data } = await supabase
    .from("erp_staff")
    .select("id")
    .eq("role", "hr")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

async function getActiveStaffByRole(role: string): Promise<{ id: string; telegram_chat_id: string | null }[]> {
  const { data } = await supabase
    .from("erp_staff")
    .select("id, telegram_chat_id")
    .eq("role", role)
    .eq("is_active", true);
  return data || [];
}

// يحدّد نقطة انطلاق التسلسل الثلاثي: الموارد البشرية إن وُجد أحد بهذا
// الدور، وإلا يتخطاها للمسؤول المباشر، وإلا مدير النظام مباشرة — حتى لا
// يعلق الطلب بلا معتمِد لو نقص أحد الأدوار بالنظام.
async function resolveInitialStagedRouting(staffId: string): Promise<{ stage: ApprovalStage; approverId: string | null }> {
  const hrId = await getPrimaryHRId();
  if (hrId) return { stage: "hr", approverId: hrId };

  const { data: staff } = await supabase.from("erp_staff").select("supervisor_id").eq("id", staffId).maybeSingle();
  if (staff?.supervisor_id) return { stage: "supervisor", approverId: staff.supervisor_id };

  return { stage: "manager", approverId: await getPrimaryManagerId() };
}

// المرحلة التالية بعد موافقة مرحلة حالية — null يعني إن المرحلة الحالية
// كانت الأخيرة (مدير النظام) فالطلب يُعتمد نهائياً.
async function nextStagedApprover(currentStage: ApprovalStage, staffId: string): Promise<{ stage: ApprovalStage; approverId: string | null } | null> {
  if (currentStage === "hr") {
    const { data: staff } = await supabase.from("erp_staff").select("supervisor_id").eq("id", staffId).maybeSingle();
    if (staff?.supervisor_id) return { stage: "supervisor", approverId: staff.supervisor_id };
    return { stage: "manager", approverId: await getPrimaryManagerId() };
  }
  if (currentStage === "supervisor") {
    return { stage: "manager", approverId: await getPrimaryManagerId() };
  }
  return null;
}

// كل من له علاقة بطلب متسلسل (كل الموارد البشرية، المسؤول المباشر إن
// وُجد، وكل مدراء النظام) — يُستخدم لإرسال تحديثات الحالة للجميع، بغض
// النظر عن مين صاحب الدور بهذه اللحظة تحديداً.
async function getStagedAudienceContacts(staffId: string): Promise<{ id: string; telegram_chat_id: string | null }[]> {
  const [hrList, managerList, submitter] = await Promise.all([
    getActiveStaffByRole("hr"),
    getActiveStaffByRole("manager"),
    supabase.from("erp_staff").select("supervisor_id").eq("id", staffId).maybeSingle(),
  ]);

  const contacts = [...hrList, ...managerList];
  const supervisorId = submitter.data?.supervisor_id;
  if (supervisorId && !contacts.some((c) => c.id === supervisorId)) {
    const { data: sup } = await supabase.from("erp_staff").select("id, telegram_chat_id").eq("id", supervisorId).maybeSingle();
    if (sup) contacts.push(sup);
  }
  return contacts;
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

export type ResolvedRequestFilters = {
  type?: string;
  status?: string;
  employeeName?: string;
  page?: number;
  pageSize?: number;
};

export type ResolvedRequestsResult = {
  data: EmployeeRequest[];
  total: number;
  page: number;
  pageSize: number;
};

// سجل "آخر الطلبات المعالَجة" مع فلترة (نوع/حالة/اسم موظف) وترقيم صفحات —
// بخلاف getEmployeeRequests العامة، هذي مخصصة لجدول قابل للنمو بلا حد.
export async function getResolvedEmployeeRequests(filters: ResolvedRequestFilters = {}): Promise<ResolvedRequestsResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 15;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("erp_employee_requests")
    .select("*, erp_staff!erp_employee_requests_staff_id_fkey!inner(name)", { count: "exact" })
    .neq("status", "قيد الانتظار")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.type) query = query.eq("request_type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.employeeName) query = query.ilike("erp_staff.name", `%${filters.employeeName}%`);

  const { data, error, count } = await query;
  if (error) {
    console.error("Error fetching resolved employee requests:", error);
    return { data: [], total: 0, page, pageSize };
  }
  return { data: data || [], total: count || 0, page, pageSize };
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

// طلبات الموظفين اللي مسؤولهم المباشر هو staffId — لواجهة "طلبات فريقي" لأي
// موظف مُعيَّن كمسؤول مباشر لغيره، حتى لو دوره الوظيفي ليس مدير/HR.
export async function getEmployeeRequestsForSupervisor(supervisorId: string): Promise<{ pending: EmployeeRequest[]; resolved: EmployeeRequest[] }> {
  const { data: reports } = await supabase.from("erp_staff").select("id").eq("supervisor_id", supervisorId);
  const staffIds = (reports || []).map((r) => r.id);
  if (staffIds.length === 0) return { pending: [], resolved: [] };

  const { data, error } = await supabase
    .from("erp_employee_requests")
    .select("*, erp_staff!erp_employee_requests_staff_id_fkey(name)")
    .in("staff_id", staffIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching team requests:", error);
    return { pending: [], resolved: [] };
  }

  const all = data || [];
  return {
    pending: all.filter((r) => r.status === "قيد الانتظار"),
    resolved: all.filter((r) => r.status !== "قيد الانتظار").slice(0, 15),
  };
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

  const isStaged = STAGED_REQUEST_TYPES.includes(input.request_type);
  const routing = isStaged
    ? await resolveInitialStagedRouting(input.staff_id)
    : { stage: null as ApprovalStage | null, approverId: await resolveApproverForRequestType(input.request_type) };

  const { data, error } = await supabase
    .from("erp_employee_requests")
    .insert([{
      staff_id: input.staff_id,
      request_type: input.request_type,
      details: input.details,
      source: input.source,
      current_approver_id: routing.approverId,
      approval_stage: routing.stage,
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
  if (!request) return;

  if (request.approval_stage) {
    await notifyStagedStageStart(request);
    return;
  }

  const text = await buildApprovalContextText(request);
  if (!text) return;

  const buttons = [[
    { text: "✅ موافقة", callback_data: `emp_approve:${request.id}` },
    { text: "❌ رفض", callback_data: `emp_reject:${request.id}` },
  ]];

  // المدير العام (current_approver_id) + المسؤول المباشر للموظف مقدّم الطلب
  // (supervisor_id) معاً — كلاهما يقدر يوافق/يرفض، أيهما تصرّف أولاً يُنفَّذ.
  const recipientIds = new Set<string>();
  if (request.current_approver_id) recipientIds.add(request.current_approver_id);

  const { data: submitter } = await supabase.from("erp_staff").select("supervisor_id").eq("id", request.staff_id).single();
  if (submitter?.supervisor_id) recipientIds.add(submitter.supervisor_id);

  if (recipientIds.size === 0) return;

  const { data: recipients } = await supabase
    .from("erp_staff")
    .select("telegram_chat_id")
    .in("id", Array.from(recipientIds));

  for (const r of recipients || []) {
    if (r.telegram_chat_id) await sendTelegramInlineKeyboard(r.telegram_chat_id, text, buttons);
  }
}

// يُرسل عند إنشاء طلب متسلسل أو تقدّمه لمرحلة تالية: رسالة فعّالة (بأزرار
// موافقة/رفض) لمعتمِد المرحلة الحالية فقط، ورسالة معلوماتية بلا أزرار
// لبقية الأطراف الثلاثة (الموارد البشرية/المسؤول المباشر/مدير النظام) —
// حتى يعرف الجميع أين وصل الطلب، بدون أن يقدر أحد يتصرف بدوره.
async function notifyStagedStageStart(request: EmployeeRequest) {
  if (!request.approval_stage) return;
  const contextText = await buildApprovalContextText(request);
  if (!contextText) return;

  const stageText = `${contextText}\n\n⏳ بانتظار: ${STAGE_LABEL[request.approval_stage]}`;
  const buttons = [[
    { text: "✅ موافقة", callback_data: `emp_approve:${request.id}` },
    { text: "❌ رفض", callback_data: `emp_reject:${request.id}` },
  ]];

  const contacts = await getStagedAudienceContacts(request.staff_id);
  for (const c of contacts) {
    if (!c.telegram_chat_id) continue;
    if (c.id === request.current_approver_id) {
      await sendTelegramInlineKeyboard(c.telegram_chat_id, stageText, buttons);
    } else {
      await sendTelegramMessage(c.telegram_chat_id, stageText);
    }
  }
}

// يُرسل عند إغلاق الطلب نهائياً (اعتماد كامل من مدير النظام، أو رفض بأي
// مرحلة): القرار النهائي يصل للموظف كالمعتاد، وتأكيد إغلاق (بلا أزرار)
// يصل للثلاثة أطراف اللي تابعوا الطلب طوال مراحله.
async function notifyStagedClosure(request: EmployeeRequest, decision: "موافق عليه" | "مرفوض", lastStage: ApprovalStage, actionNotes?: string) {
  await notifyStaffOfDecision(request, decision, actionNotes);

  const staffName = request.erp_staff?.name || "الموظف";
  const typeLabel = REQUEST_TYPE_LABEL[request.request_type];
  const resultText = decision === "موافق عليه"
    ? `✅ تم الاعتماد النهائي لطلب ${typeLabel} الخاص بـ"${staffName}".`
    : `❌ تم رفض طلب ${typeLabel} الخاص بـ"${staffName}" بمرحلة ${STAGE_LABEL[lastStage]}${actionNotes ? ` — الملاحظة: ${actionNotes}` : ""}.`;

  const contacts = await getStagedAudienceContacts(request.staff_id);
  for (const c of contacts) {
    if (c.telegram_chat_id) await sendTelegramMessage(c.telegram_chat_id, resultText);
  }
}

async function buildApprovalContextText(request: EmployeeRequest): Promise<string | null> {
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

  return [
    `📋 طلب ${typeLabel} جديد من "${staffName}"`,
    ...detailLines,
    ...(contextLines.length > 0 ? ["", ...contextLines] : []),
  ].join("\n");
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

  if (request.approval_stage) {
    return resolveStagedRequest(request, decision, managerId, actionNotes);
  }

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

// يعالج الموافقة/الرفض لطلب متسلسل (سلفة/إجازة/مغادرة). لازم يكون الفاعل
// فعلاً معتمِد المرحلة الحالية (current_approver_id) — رفض أي مرحلة ينهي
// الطلب فوراً، والموافقة إما تُقدّمه للمرحلة التالية أو تعتمده نهائياً لو
// كانت مرحلة مدير النظام. كل إجراء (بملاحظته الاختيارية) يُسجَّل بـ
// approval_log ليبقى ظاهراً بالويب حتى بعد إغلاق الطلب.
async function resolveStagedRequest(
  request: EmployeeRequest,
  decision: "موافق عليه" | "مرفوض",
  actorStaffId: string,
  actionNotes?: string
): Promise<{ error?: string }> {
  const stage = request.approval_stage as ApprovalStage;

  if (request.current_approver_id !== actorStaffId) {
    return { error: "هذا الطلب ليس بانتظار موافقتك حالياً" };
  }

  const { data: actor } = await supabase.from("erp_staff").select("name").eq("id", actorStaffId).maybeSingle();
  const logEntry: ApprovalLogEntry = {
    stage,
    staff_id: actorStaffId,
    staff_name: actor?.name || "—",
    decision: decision === "موافق عليه" ? "موافقة" : "رفض",
    notes: actionNotes || null,
    at: new Date().toISOString(),
  };
  const newLog = [...(request.approval_log || []), logEntry];

  if (decision === "مرفوض") {
    const { error } = await supabase
      .from("erp_employee_requests")
      .update({
        status: "مرفوض",
        manager_id: actorStaffId,
        action_notes: actionNotes || null,
        approval_log: newLog,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);
    if (error) return { error: error.message };

    await notifyStagedClosure(request, "مرفوض", stage, actionNotes);
    return {};
  }

  const next = await nextStagedApprover(stage, request.staff_id);

  if (!next) {
    // مرحلة مدير النظام كانت الأخيرة — اعتماد نهائي وتنفيذ الأثر.
    const { error } = await supabase
      .from("erp_employee_requests")
      .update({
        status: "موافق عليه",
        manager_id: actorStaffId,
        action_notes: actionNotes || null,
        approval_log: newLog,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);
    if (error) return { error: error.message };

    await applyApprovalSideEffect(request);
    await notifyStagedClosure(request, "موافق عليه", stage, actionNotes);
    return {};
  }

  const { error } = await supabase
    .from("erp_employee_requests")
    .update({
      approval_stage: next.stage,
      current_approver_id: next.approverId,
      approval_log: newLog,
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id);
  if (error) return { error: error.message };

  const updatedRequest: EmployeeRequest = { ...request, approval_stage: next.stage, current_approver_id: next.approverId, approval_log: newLog };
  await notifyStagedStageStart(updatedRequest);
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

// حذف نهائي للسجل — يعكس أثره أولاً إن كان مُعتمداً (زي الإلغاء) قبل الحذف
// الفعلي، حتى ما تبقى قيود مالية/رصيد بلا سجل طلب يفسّرها.
export async function deleteEmployeeRequest(id: string): Promise<{ error?: string }> {
  const request = await getEmployeeRequestById(id);
  if (!request) return { error: "الطلب غير موجود" };

  if (request.status === "موافق عليه") {
    await reverseApprovalSideEffect(request);
  }

  const { error } = await supabase.from("erp_employee_requests").delete().eq("id", id);
  if (error) return { error: error.message };

  return {};
}
