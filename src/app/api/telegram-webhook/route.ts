import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendTelegramMessage, sendTelegramInlineKeyboard, sendTelegramReplyKeyboard, sendTelegramVoice, getTelegramFileUrl } from "@/lib/telegram";
import {
  getStaffByTelegramChatId,
  createOrderSubmission,
  searchCustomers,
  getPendingTelegramSubmission,
  startPendingTelegramSubmission,
  setPendingTelegramStage,
  setPendingTelegramCustomer,
  setPendingMenuChoice,
  setPendingNewCustomerName,
  setPendingNewCustomerPhone,
  setPendingNewCustomerAddress,
  setPendingNewCustomerCompany,
  clearPendingTelegramSubmission,
} from "@/lib/order-submissions-data";
import { approveSalesOrderAndNotify } from "@/lib/order-notifications";
import {
  resolveEmployeeRequest,
  createEmployeeRequest,
  notifyApproverWithContext,
  notifyRecipientsWithContext,
  acknowledgeEmployeeRequest,
  getEmployeeRequestsForStaff,
  getEmployeeRequestsForSupervisor,
  getEmployeeRequests,
  getAttendanceSummaryForStaff,
  formatRequestLine,
  REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY,
  EmployeeRequestType,
} from "@/lib/employee-requests-data";
import { startEmployeeRequestDraft, updateEmployeeRequestDraft } from "@/lib/order-submissions-data";
import { getDirectReports, searchStaffByName } from "@/lib/staff-data";
import { getSlaWarnings } from "@/lib/sla-data";
import { getDashboardNotificationCounts, ROLE_NOTIFICATION_SCOPE } from "@/lib/dashboard-notifications";
import { ROLE_LABELS } from "@/lib/role-labels";
import { sendBroadcastMessage, type BroadcastTarget } from "@/lib/broadcast";

const EMP_REJECT_REASONS = ["ضغط عمل تشغيلي", "الرصيد لا يسمح", "تأجيل للشهر القادم"];

const EMP_TYPE_LABEL: Record<string, string> = {
  loan: "طلب سلفة",
  vacation: "طلب إجازة",
  permission: "طلب مغادرة",
  complaint: "تقديم شكوى",
  attendance_fix_in: "إثبات دوام صباحي (حضور)",
  attendance_fix_out: "إثبات دوام مسائي (مغادرة)",
  injury_report: "تبليغ عن إصابة",
  work_report: "تقرير عمل",
};

type EmpField = { key: string; prompt: string; required?: boolean; numeric?: boolean; isDate?: boolean };

const EMP_FIELDS: Record<string, EmpField[]> = {
  loan: [
    { key: "amount", prompt: "ما هو المبلغ المطلوب؟ (أرقام فقط، بالشيكل)", required: true, numeric: true },
    { key: "repayment_method", prompt: "طريقة السداد المقترحة؟ (اكتب \"تخطي\" إن لم تحدد)" },
  ],
  vacation: [
    { key: "start_date", prompt: "تاريخ بداية الإجازة؟", required: true, isDate: true },
    { key: "end_date", prompt: "تاريخ نهاية الإجازة؟", required: true, isDate: true },
    { key: "reason", prompt: "سبب الإجازة؟ (اكتب \"تخطي\" إن لم تحدد)" },
  ],
  permission: [
    { key: "date", prompt: "تاريخ المغادرة؟", required: true, isDate: true },
    { key: "from_time", prompt: "من الساعة؟ (مثال 10:00)", required: true },
    { key: "to_time", prompt: "إلى الساعة؟ (مثال 12:00)", required: true },
    { key: "reason", prompt: "سبب المغادرة؟ (اكتب \"تخطي\" إن لم تحدد)" },
  ],
  complaint: [
    { key: "subject", prompt: "عنوان الشكوى؟ (اكتب \"تخطي\" إن لم يوجد)" },
    { key: "description", prompt: "تفاصيل الشكوى؟", required: true },
  ],
  attendance_fix_in: [
    { key: "date", prompt: "تاريخ الحضور المطلوب إثباته؟", required: true, isDate: true },
    { key: "time", prompt: "ما هو وقت الحضور؟ (مثال 08:15)", required: true },
    { key: "reason", prompt: "سبب إثبات الحضور؟", required: true },
  ],
  attendance_fix_out: [
    { key: "date", prompt: "تاريخ المغادرة المطلوب إثباته؟", required: true, isDate: true },
    { key: "time", prompt: "ما هو وقت المغادرة؟ (مثال 17:00)", required: true },
    { key: "reason", prompt: "سبب إثبات المغادرة؟", required: true },
  ],
  injury_report: [
    { key: "date", prompt: "تاريخ الحادثة؟", required: true, isDate: true },
    { key: "description", prompt: "صف ما حدث؟", required: true },
  ],
  // "work_report" غير مُدرَج هنا عمداً — له مسار خاص (emp_work_report) يقبل
  // نصاً أو تسجيلاً صوتياً مباشرة بدل تسلسل حقول ثابت.
};

const MONTH_NAMES = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const WEEKDAY_LABELS = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

// يبني تقويماً شهرياً كأزرار inline (تنقل بين الشهور + اختيار يوم)، لتفادي
// إدخال التواريخ يدوياً في كل حقل تاريخ عبر البوت.
function buildCalendar(year: number, month: number): { text: string; callback_data: string }[][] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const rows: { text: string; callback_data: string }[][] = [];

  rows.push([{ text: `${MONTH_NAMES[month - 1]} ${year}`, callback_data: "noop" }]);
  rows.push(WEEKDAY_LABELS.map((l) => ({ text: l, callback_data: "noop" })));

  let week: { text: string; callback_data: string }[] = [];
  for (let i = 0; i < startWeekday; i++) week.push({ text: " ", callback_data: "noop" });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    week.push({ text: String(d), callback_data: `cal:${dateStr}` });
    if (week.length === 7) {
      rows.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push({ text: " ", callback_data: "noop" });
    rows.push(week);
  }

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  rows.push([
    { text: "◀ الشهر السابق", callback_data: `cal_nav:${prevYear}-${prevMonth}` },
    { text: "الشهر التالي ▶", callback_data: `cal_nav:${nextYear}-${nextMonth}` },
  ]);
  return rows;
}

// يعرض سؤال حقل الطلب التالي: تقويم إن كان تاريخاً، أو إدخال نصي حراً غير ذلك.
async function promptEmpField(chatId: string, field: EmpField, prefix?: string) {
  const text = prefix ? `${prefix}\n${field.prompt}` : field.prompt;
  if (field.isDate) {
    const now = new Date();
    await sendTelegramInlineKeyboard(chatId, text, withBack(buildCalendar(now.getFullYear(), now.getMonth() + 1)));
  } else {
    await sendTelegramInlineKeyboard(chatId, text, withBack([]));
  }
}

// يعالج إجابة حقل واحد من محادثة طلب موظف (نصاً كانت أم تاريخاً من التقويم)،
// وينتقل للحقل التالي أو يُنشئ الطلب فعلياً عند اكتمال كل الحقول. مشتركة بين
// معالج الرسائل النصية ومعالج أزرار التقويم.
async function advanceEmpField(chatId: string, staff: { id: string; role: string }, requestType: string, idx: number, rawValue: string) {
  const fields = EMP_FIELDS[requestType];
  const field = fields?.[idx];
  if (!field) {
    await clearPendingTelegramSubmission(chatId);
    await askMainMenu(chatId, staff);
    return;
  }

  const raw = rawValue.trim();
  const skip = !field.required && raw === "تخطي";
  if (field.required && (skip || !raw)) {
    await promptEmpField(chatId, field, "هذا الحقل إلزامي.");
    return;
  }
  if (field.required && field.numeric && isNaN(Number(raw))) {
    await promptEmpField(chatId, field, "الرجاء إرسال رقم صحيح.");
    return;
  }

  const pending = await getPendingTelegramSubmission(chatId);
  const draft = { ...(pending?.emp_draft || {}) };
  draft[field.key] = skip ? null : (field.numeric ? Number(raw) : raw);

  const nextIdx = idx + 1;
  const nextField = fields[nextIdx];
  if (nextField) {
    await updateEmployeeRequestDraft(chatId, draft, `emp_new:${requestType}:${nextIdx}`);
    await promptEmpField(chatId, nextField);
    return;
  }

  const dbRequestType = (requestType.startsWith("attendance_fix") ? "attendance_fix" : requestType) as EmployeeRequestType;
  if (requestType === "attendance_fix_in") draft.period = "صباحي";
  if (requestType === "attendance_fix_out") draft.period = "مسائي";

  const { request, error } = await createEmployeeRequest({
    staff_id: staff.id,
    request_type: dbRequestType,
    details: draft,
    source: "telegram",
  });
  await clearPendingTelegramSubmission(chatId);
  if (error) {
    await sendTelegramMessage(chatId, `تعذّر إرسال الطلب: ${error}`);
  } else {
    const ackOnly = REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY[dbRequestType];
    if (request) {
      if (ackOnly) await notifyRecipientsWithContext(request.id);
      else await notifyApproverWithContext(request.id);
    }
    await sendTelegramMessage(
      chatId,
      ackOnly
        ? `تم إرسال ${EMP_TYPE_LABEL[requestType]} بنجاح، وصل للمدير ومسؤول الموارد البشرية ✅`
        : `تم إرسال ${EMP_TYPE_LABEL[requestType]} بنجاح، وسيصل للمعتمد فوراً ✅`
    );
  }
}

// مسار خاص لتقرير العمل: يقبل الرسالة التالية سواء كانت نصاً أو تسجيلاً
// صوتياً، بدل المرور بتسلسل حقول EMP_FIELDS الثابت.
async function submitWorkReport(chatId: string, staff: { id: string }, details: Record<string, any>) {
  const { request, error } = await createEmployeeRequest({
    staff_id: staff.id,
    request_type: "work_report",
    details,
    source: "telegram",
  });
  await clearPendingTelegramSubmission(chatId);
  if (error) {
    await sendTelegramMessage(chatId, `تعذّر إرسال التقرير: ${error}`);
    return;
  }
  if (request) await notifyRecipientsWithContext(request.id);
  await sendTelegramMessage(chatId, "تم إرسال تقرير العمل بنجاح، وصل للمدير ومسؤول الموارد البشرية ✅");
}

function extractPhone(text: string): string | null {
  const match = text.match(/0\d{8,9}|\+?9\d{11,12}/);
  return match ? match[0] : null;
}

const EMP_GATEWAY_LABEL = "🚪 بوابة الموظفين";

const BACK_BUTTON = { text: "🔙 القائمة الرئيسية", callback_data: "main_menu" };

// يعيد أزرار مع صف "القائمة الرئيسية" مُلحق دائماً في الأسفل، بحيث يمكن
// للمندوب الخروج من أي خطوة إدخال دون فقدان ما أدخله جزئياً — البيانات تبقى
// محفوظة في erp_telegram_pending_submissions حتى يكمل أو يبدأ فرعاً جديداً.
function withBack(rows: { text: string; callback_data: string }[][]): { text: string; callback_data: string }[][] {
  return [...rows, [BACK_BUTTON]];
}

// القائمة الرئيسية تتكيّف حسب الشخص: الكل يشوف "طلب جديد/طلباتي/دوامي"،
// "فريقي" تظهر فقط لمن عنده مرؤوسين فعلاً (بغض النظر عن دوره)، و"بحث عن
// موظف/ملخص اليوم" لمدير النظام ومسؤول الموارد البشرية فقط. أزرار الطلبيات
// (إدخال مباشر/كشف موقع) معطّلة مؤقتاً هنا ريثما يُعاد تفعيلها لاحقاً.
async function askMainMenu(chatId: string, staff: { id: string; role: string }) {
  const isManagerOrHR = staff.role === "manager" || staff.role === "hr";
  const directReports = await getDirectReports(staff.id);
  const isSupervisor = directReports.length > 0;

  const rows: { text: string; callback_data: string }[][] = [
    [
      { text: "📝 طلب جديد", callback_data: "emp_menu" },
      { text: "📋 طلباتي", callback_data: "emp_my_requests" },
    ],
  ];

  rows.push(
    isSupervisor
      ? [
          { text: "🕐 دوامي", callback_data: "emp_attendance_summary" },
          { text: "👥 فريقي", callback_data: "emp_team" },
        ]
      : [{ text: "🕐 دوامي", callback_data: "emp_attendance_summary" }]
  );

  if (isManagerOrHR) {
    rows.push([{ text: "⚙️ أدوات الإدارة", callback_data: "admin_tools_menu" }]);
  }

  await sendTelegramInlineKeyboard(chatId, "ماذا تريد أن تفعل؟", rows);
}

async function askEmpMenu(chatId: string) {
  await sendTelegramInlineKeyboard(chatId, "أي طلب تريد تقديمه؟", withBack([
    [
      { text: "💰 سلفة", callback_data: "emp_new:loan" },
      { text: "🌴 إجازة", callback_data: "emp_new:vacation" },
    ],
    [
      { text: "🚪 مغادرة", callback_data: "emp_new:permission" },
      { text: "😠 شكوى", callback_data: "emp_new:complaint" },
    ],
    [
      { text: "🕐 إثبات دوام", callback_data: "emp_attendance_menu" },
      { text: "🚨 تبليغ إصابة", callback_data: "emp_new:injury_report" },
    ],
    [{ text: "📝 تقرير عمل", callback_data: "emp_new:work_report" }],
  ]));
}

async function askAttendanceMenu(chatId: string) {
  await sendTelegramInlineKeyboard(chatId, "أي نوع إثبات دوام؟", withBack([
    [
      { text: "🌅 حضور", callback_data: "emp_new:attendance_fix_in" },
      { text: "🌇 مغادرة", callback_data: "emp_new:attendance_fix_out" },
    ],
  ]));
}

// "طلباتي" — سجل الموظف لطلباته الخاصة وحالتها، للجميع.
async function askMyRequests(chatId: string, staffId: string) {
  const requests = await getEmployeeRequestsForStaff(staffId);
  if (requests.length === 0) {
    await sendTelegramInlineKeyboard(chatId, "لم تقدّم أي طلبات بعد.", withBack([]));
    return;
  }
  const shown = requests.slice(0, 10);
  const lines = shown.map((r) => formatRequestLine(r)).join("\n\n");
  await sendTelegramInlineKeyboard(chatId, `📋 طلباتك (آخر ${shown.length}):\n\n${lines}`, withBack([]));
}

// "دوامي" — ملخص حضور/غياب الشهر الحالي، للجميع.
async function askMyAttendance(chatId: string, staffId: string) {
  const summary = await getAttendanceSummaryForStaff(staffId);
  const monthLabel = MONTH_NAMES[new Date().getMonth()];
  const text = [
    `🕐 دوامك خلال ${monthLabel}:`,
    "",
    `✅ أيام حضور: ${summary.present}`,
    `🚫 أيام غياب: ${summary.absent}`,
    `📝 أيام مُبرَّرة: ${summary.justified}`,
  ].join("\n");
  await sendTelegramInlineKeyboard(chatId, text, withBack([]));
}

// "فريقي" — طلبات فريقه المعلّقة فقط (السجل الكامل يبقى بالويب)، كل طلب
// برسالة مستقلة مع أزرار موافقة/رفض أو "تم الاستلام" حسب نوعه — نفس أزرار
// الإشعارات المعتادة، فيقدر يتصرّف مباشرة من نفس المحادثة.
async function askTeamRequests(chatId: string, supervisorId: string) {
  const directReports = await getDirectReports(supervisorId);
  if (directReports.length === 0) {
    await sendTelegramInlineKeyboard(chatId, "لا يوجد فريق مرتبط بحسابك حالياً.", withBack([]));
    return;
  }

  const { pending } = await getEmployeeRequestsForSupervisor(supervisorId);
  if (pending.length === 0) {
    await sendTelegramInlineKeyboard(chatId, "لا توجد طلبات معلّقة من فريقك حالياً ✅", withBack([]));
    return;
  }

  await sendTelegramMessage(chatId, `👥 لديك ${pending.length} طلب معلّق من فريقك:`);
  for (const r of pending) {
    const text = formatRequestLine(r, { showName: true });
    const ackOnly = REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY[r.request_type];
    const buttons = ackOnly
      ? [[{ text: "✅ تم الاستلام", callback_data: `emp_ack:${r.id}` }]]
      : [[
          { text: "✅ موافقة", callback_data: `emp_approve:${r.id}` },
          { text: "❌ رفض", callback_data: `emp_reject:${r.id}` },
        ]];
    await sendTelegramInlineKeyboard(chatId, text, buttons);
  }
  await sendTelegramInlineKeyboard(chatId, "انتهت القائمة.", withBack([]));
}

const OPS_NOTIFICATION_LABELS: Record<string, string> = {
  pendingSubmissions: "طلبيات واردة قيد المراجعة",
  pendingMaintenance: "تذاكر صيانة معلّقة",
  pendingPurchases: "طلبات شراء معلّقة",
  pendingInstallations: "طلبيات بانتظار إخراج التركيب",
};

// قائمة أدوات الإدارة — نقطة دخول واحدة على القائمة الرئيسية لمدير النظام
// ومسؤول الموارد البشرية، تجمع كل أدوات الإدارة بدل تكديسها كأزرار منفصلة.
async function askAdminToolsMenu(chatId: string) {
  await sendTelegramInlineKeyboard(chatId, "⚙️ أدوات الإدارة:", withBack([
    [
      { text: "🔍 بحث عن موظف", callback_data: "emp_search_staff" },
      { text: "📊 ملخص اليوم", callback_data: "emp_daily_summary" },
    ],
    [
      { text: "📢 إرسال رسالة", callback_data: "bmsg_menu" },
      { text: "📋 كل الطلبات المعلّقة", callback_data: "admin_all_pending" },
    ],
    [
      { text: "📝 آخر تقارير العمل", callback_data: "admin_work_reports" },
      { text: "➕ إضافة موظف", callback_data: "admin_add_staff" },
    ],
    [{ text: "🚫 تعطيل/تفعيل موظف", callback_data: "admin_toggle_staff" }],
  ]));
}

// "كل الطلبات المعلّقة" — عرض شامل لكل طلبات الموظفين المعلّقة بالشركة (لا
// يقتصر على فريق مباشر)، فمدير النظام هو المعتمِد الافتراضي لأي طلب بغض
// النظر عن التسلسل الإداري. نفس أزرار الموافقة/الرفض/الاستلام المعتادة.
async function askAllPendingRequests(chatId: string) {
  const pending = await getEmployeeRequests("قيد الانتظار");
  if (pending.length === 0) {
    await sendTelegramInlineKeyboard(chatId, "لا توجد طلبات معلّقة حالياً ✅", withBack([]));
    return;
  }

  await sendTelegramMessage(chatId, `📋 يوجد ${pending.length} طلب معلّق بالشركة:`);
  for (const r of pending) {
    const text = formatRequestLine(r, { showName: true });
    const ackOnly = REQUEST_TYPE_IS_ACKNOWLEDGMENT_ONLY[r.request_type];
    const buttons = ackOnly
      ? [[{ text: "✅ تم الاستلام", callback_data: `emp_ack:${r.id}` }]]
      : [[
          { text: "✅ موافقة", callback_data: `emp_approve:${r.id}` },
          { text: "❌ رفض", callback_data: `emp_reject:${r.id}` },
        ]];
    await sendTelegramInlineKeyboard(chatId, text, buttons);
  }
  await sendTelegramInlineKeyboard(chatId, "انتهت القائمة.", withBack([]));
}

// "آخر تقارير العمل" — آخر تقارير العمل الواردة (نصية أو صوتية)، لمتابعتها
// لو فات أحداً إشعارها اللحظي.
async function askRecentWorkReports(chatId: string) {
  const reports = (await getEmployeeRequests()).filter((r) => r.request_type === "work_report").slice(0, 8);
  if (reports.length === 0) {
    await sendTelegramInlineKeyboard(chatId, "لا توجد تقارير عمل بعد.", withBack([]));
    return;
  }

  for (const r of reports) {
    const name = r.erp_staff?.name || "—";
    const date = new Date(r.created_at).toLocaleDateString("en-GB");
    await sendTelegramMessage(chatId, `📝 تقرير عمل من ${name} — ${date}`);
    if (r.details?.content) {
      await sendTelegramMessage(chatId, r.details.content);
    } else if (r.details?.voice_url) {
      await sendTelegramVoice(chatId, r.details.voice_url);
    }
  }
  await sendTelegramInlineKeyboard(chatId, "انتهت القائمة.", withBack([]));
}

// "إضافة موظف" — نموذج مختصر عبر البوت (اسم/دور/هاتف/شات آيدي) بدل إلزام
// المدير فتح الويب لكل تسجيل جديد. البيانات الجزئية تُحفظ بعمود emp_draft
// (نفس آلية طلبات الموظفين متعددة الحقول) حتى تكتمل كل الحقول.
async function askAdminAddRole(chatId: string) {
  const roles = Object.entries(ROLE_LABELS);
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < roles.length; i += 2) {
    rows.push(roles.slice(i, i + 2).map(([key, label]) => ({ text: label, callback_data: `admin_add_role:${key}` })));
  }
  await sendTelegramInlineKeyboard(chatId, "اختر دور الموظف الجديد:", withBack(rows));
}

// "تعطيل/تفعيل موظف" — بحث بالاسم ثم تبديل حالة الحساب بضغطة واحدة.
async function askToggleStaffSearch(chatId: string) {
  await sendTelegramInlineKeyboard(chatId, "🔍 اكتب اسم الموظف المطلوب تعطيله أو تفعيله:", withBack([]));
}

async function handleToggleStaffSearch(chatId: string, query: string) {
  const results = await searchStaffByName(query);
  if (results.length === 0) {
    await sendTelegramInlineKeyboard(chatId, "لا يوجد موظف مطابق.", withBack([]));
    return;
  }
  const rows = results.slice(0, 8).map((s) => [{ text: `${s.name} ${s.is_active ? "🟢" : "🔴"}`, callback_data: `admin_toggle_pick:${s.id}` }]);
  await sendTelegramInlineKeyboard(chatId, "اختر الموظف:", withBack(rows));
}

// "ملخص اليوم" — لمدير النظام ومسؤول الموارد البشرية فقط: التنبيهات
// التشغيلية اللي تخص دوره + طلبات الموظفين المعلّقة + تنبيهات SLA المتأخرة.
async function askDailySummary(chatId: string, role: string) {
  const [warnings, counts] = await Promise.all([getSlaWarnings(), getDashboardNotificationCounts()]);
  const scope = ROLE_NOTIFICATION_SCOPE[role] || [];

  const lines = ["📊 ملخص اليوم:", ""];
  for (const key of scope) {
    lines.push(`${OPS_NOTIFICATION_LABELS[key]}: ${counts[key]}`);
  }
  lines.push(`طلبات موظفين معلّقة: ${counts.pendingEmployeeRequests}`);
  lines.push("", `⚠️ عناصر متأخرة (SLA): ${warnings.length}`);

  await sendTelegramInlineKeyboard(chatId, lines.join("\n"), withBack([]));
}

// "إرسال رسالة" — لمدير النظام ومسؤول الموارد البشرية فقط: يختار الجهة
// المستهدفة (نفس خيارات الويب) ثم يكتب نص الرسالة، وتُرسل بنفس منطق
// lib/broadcast.ts المشترك مع صفحة إدارة الموظفين بالويب.
async function askBroadcastTargetMenu(chatId: string) {
  await sendTelegramInlineKeyboard(chatId, "📢 لمن تريد إرسال الرسالة؟", withBack([
    [
      { text: "📢 الكل", callback_data: "bmsg_target:all" },
      { text: "🔍 موظف محدد", callback_data: "bmsg_target:specific" },
    ],
    [
      { text: "🧑‍💼 مدير النظام", callback_data: "bmsg_target:managers" },
      { text: "🗂️ الموارد البشرية", callback_data: "bmsg_target:hr" },
    ],
  ]));
}

async function askBroadcastComposePrompt(chatId: string, stage: string) {
  await supabase.from("erp_telegram_pending_submissions").upsert([{ chat_id: chatId, stage }]);
  await sendTelegramInlineKeyboard(chatId, "✍️ اكتب نص الرسالة:", withBack([]));
}

async function handleBroadcastPickSearch(chatId: string, query: string) {
  const results = (await searchStaffByName(query)).filter((s) => s.telegram_chat_id);

  if (results.length === 0) {
    await sendTelegramInlineKeyboard(chatId, "لا يوجد موظف مطابق له حساب تيليجرام مرتبط. حاول باسم آخر.", withBack([]));
    return;
  }

  const rows = results.slice(0, 8).map((s) => [{ text: s.name, callback_data: `bmsg_pick:${s.id}` }]);
  await sendTelegramInlineKeyboard(chatId, "اختر الموظف:", withBack(rows));
}

// "بحث عن موظف" — لمدير النظام ومسؤول الموارد البشرية فقط.
async function askStaffSearchPrompt(chatId: string) {
  await sendTelegramInlineKeyboard(chatId, "🔍 اكتب اسم الموظف (أو جزءاً منه):", withBack([]));
}

async function handleStaffSearchQuery(chatId: string, query: string) {
  const results = await searchStaffByName(query);
  await clearPendingTelegramSubmission(chatId);

  if (results.length === 0) {
    await sendTelegramMessage(chatId, "لا يوجد موظف مطابق.");
    return;
  }

  for (const s of results) {
    const lines = [
      `👤 ${s.name}`,
      `الدور: ${ROLE_LABELS[s.role] || s.role}`,
      `الحساب: ${!s.is_active ? "معطّل" : s.username ? "مفعّل" : "بدون بيانات دخول بعد"}`,
      `رصيد الإجازات: ${s.vacation_balance_days} يوم`,
    ];
    await sendTelegramMessage(chatId, lines.join("\n"));
  }
}

async function askCustomerChoice(chatId: string) {
  await sendTelegramInlineKeyboard(chatId, "هل العميل مسجَّل مسبقاً؟", withBack([
    [
      { text: "🔍 عميل موجود", callback_data: "cust_existing" },
      { text: "➕ عميل جديد", callback_data: "cust_new" },
    ],
  ]));
}

// نقطة استقبال تحديثات بوت تيليجرام: يستقبل صورة/تسجيل صوتي/نص من مندوب
// مبيعات أو مدير، ويحفظه في صندوق الوارد (erp_order_submissions) ليراجعه
// معالج الطلبيات لاحقاً. لا يوجد أي إدخال تلقائي مباشر في نظام الطلبيات.
// محادثة ذكية: يسأل البوت أولاً هل العميل موجود (بحث فعلي بأزرار) أو جديد،
// ثم يطلب محتوى الطلبية، وأخيراً يعالج زر "اعتماد الطلبية".
export async function POST(req: Request) {
  try {
    const update = await req.json();

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const staff = await getStaffByTelegramChatId(chatId);

    if (!staff) {
      await sendTelegramMessage(
        chatId,
        `غير مصرح لك باستخدام هذا البوت.\n\nأرسل رقم الشات هذا لمدير النظام لتسجيلك:\n${chatId}`
      );
      return NextResponse.json({ ok: true });
    }

    // زر ثابت أسفل الشاشة يعمل من أي مكان في أي محادثة جارية — يقاطعها
    // وينقل الموظف مباشرة لقائمة طلباته دون فقدان تسجيله ككل.
    if (message.text === EMP_GATEWAY_LABEL) {
      await startPendingTelegramSubmission(chatId);
      await askEmpMenu(chatId);
      return NextResponse.json({ ok: true });
    }

    const pending = await getPendingTelegramSubmission(chatId);

    if (pending?.stage === "emp_work_report") {
      if (message.text && !message.text.startsWith("/")) {
        await submitWorkReport(chatId, staff, { content: message.text });
      } else if (message.voice) {
        const voiceUrl = await uploadTelegramFileToStorage(message.voice.file_id, "ogg");
        await submitWorkReport(chatId, staff, { voice_url: voiceUrl });
      } else {
        await sendTelegramInlineKeyboard(chatId, "أرسل تقرير عملك نصاً أو تسجيلاً صوتياً.", withBack([]));
      }
      return NextResponse.json({ ok: true });
    }

    if (pending?.stage === "emp_search_query") {
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramInlineKeyboard(chatId, "اكتب اسم الموظف نصاً.", withBack([]));
        return NextResponse.json({ ok: true });
      }
      await handleStaffSearchQuery(chatId, message.text);
      return NextResponse.json({ ok: true });
    }

    if (pending?.stage === "bmsg_pick_search") {
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramInlineKeyboard(chatId, "اكتب اسم الموظف نصاً.", withBack([]));
        return NextResponse.json({ ok: true });
      }
      await handleBroadcastPickSearch(chatId, message.text);
      return NextResponse.json({ ok: true });
    }

    if (pending?.stage?.startsWith("bmsg_send_compose:")) {
      const suffix = pending.stage.replace("bmsg_send_compose:", "");
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramInlineKeyboard(chatId, "اكتب نص الرسالة.", withBack([]));
        return NextResponse.json({ ok: true });
      }
      if (staff.role !== "manager" && staff.role !== "hr") {
        await clearPendingTelegramSubmission(chatId);
        await sendTelegramMessage(chatId, "غير مصرح.");
        return NextResponse.json({ ok: true });
      }

      const target: BroadcastTarget = suffix.startsWith("specific:") ? "specific" : (suffix as BroadcastTarget);
      const targetIds = suffix.startsWith("specific:") ? [suffix.replace("specific:", "")] : [];

      const result = await sendBroadcastMessage({ senderStaffId: staff.id, target, targetIds, message: message.text });
      await setPendingTelegramStage(chatId, "main_menu");
      await sendTelegramInlineKeyboard(
        chatId,
        result.error ? `تعذّر الإرسال: ${result.error}` : `✅ تم الإرسال إلى ${result.sent} موظف`,
        withBack([])
      );
      return NextResponse.json({ ok: true });
    }

    if (pending?.stage?.startsWith("bmsg_reply_compose:")) {
      const senderStaffId = pending.stage.replace("bmsg_reply_compose:", "");
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramMessage(chatId, "الرجاء إرسال ردك نصاً.");
        return NextResponse.json({ ok: true });
      }
      const { data: sender } = await supabase
        .from("erp_staff")
        .select("telegram_chat_id")
        .eq("id", senderStaffId)
        .maybeSingle();

      if (sender?.telegram_chat_id) {
        await sendTelegramMessage(sender.telegram_chat_id, `↩️ رد من ${staff.name}:\n\n${message.text}`);
        await sendTelegramInlineKeyboard(chatId, "✅ تم إرسال ردك.", withBack([]));
      } else {
        await sendTelegramInlineKeyboard(chatId, "تعذّر إيصال ردك، حساب المُرسل غير متاح حالياً.", withBack([]));
      }
      await setPendingTelegramStage(chatId, "main_menu");
      return NextResponse.json({ ok: true });
    }

    if (pending?.stage === "admin_toggle_search") {
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramInlineKeyboard(chatId, "اكتب اسم الموظف نصاً.", withBack([]));
        return NextResponse.json({ ok: true });
      }
      if (staff.role !== "manager" && staff.role !== "hr") {
        await clearPendingTelegramSubmission(chatId);
        await sendTelegramMessage(chatId, "غير مصرح.");
        return NextResponse.json({ ok: true });
      }
      await handleToggleStaffSearch(chatId, message.text);
      return NextResponse.json({ ok: true });
    }

    if (pending?.stage?.startsWith("admin_add_staff:")) {
      if (staff.role !== "manager" && staff.role !== "hr") {
        await clearPendingTelegramSubmission(chatId);
        await sendTelegramMessage(chatId, "غير مصرح.");
        return NextResponse.json({ ok: true });
      }
      const idx = Number(pending.stage.replace("admin_add_staff:", ""));
      const draft = { ...(pending.emp_draft || {}) };

      if (idx === 1) {
        await askAdminAddRole(chatId);
        return NextResponse.json({ ok: true });
      }

      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramInlineKeyboard(chatId, "اكتب نصاً.", withBack([]));
        return NextResponse.json({ ok: true });
      }
      const value = message.text.trim();

      if (idx === 0) {
        draft.name = value;
        await updateEmployeeRequestDraft(chatId, draft, "admin_add_staff:1");
        await askAdminAddRole(chatId);
        return NextResponse.json({ ok: true });
      }

      if (idx === 2) {
        draft.phone = value === "تخطي" ? null : value;
        await updateEmployeeRequestDraft(chatId, draft, "admin_add_staff:3");
        await sendTelegramInlineKeyboard(
          chatId,
          "🔗 رقم الشات على تيليجرام إن وُجد (اطلب من الموظف إرسال /start للبوت ليحصل عليه)، أو اكتب \"تخطي\":",
          withBack([])
        );
        return NextResponse.json({ ok: true });
      }

      if (idx === 3) {
        draft.telegram_chat_id = value === "تخطي" ? null : value;
        const { error } = await supabase.from("erp_staff").insert([{
          name: draft.name, role: draft.role, phone: draft.phone || null, telegram_chat_id: draft.telegram_chat_id || null,
        }]);
        await clearPendingTelegramSubmission(chatId);
        await sendTelegramInlineKeyboard(
          chatId,
          error ? `تعذّرت الإضافة: ${error.message}` : `✅ تمت إضافة ${draft.name} بنجاح`,
          withBack([])
        );
        return NextResponse.json({ ok: true });
      }

      await clearPendingTelegramSubmission(chatId);
      await askMainMenu(chatId, staff);
      return NextResponse.json({ ok: true });
    }

    if (pending?.stage?.startsWith("emp_reject_custom:")) {
      const requestId = pending.stage.replace("emp_reject_custom:", "");
      if (!message.text) {
        await sendTelegramMessage(chatId, "الرجاء إرسال سبب الرفض نصاً.");
        return NextResponse.json({ ok: true });
      }
      const result = await resolveEmployeeRequest(requestId, "مرفوض", staff.id, message.text);
      await clearPendingTelegramSubmission(chatId);
      await sendTelegramMessage(chatId, result.error ? `تعذّر الرفض: ${result.error}` : "تم رفض الطلب وإبلاغ الموظف بالسبب ✅");
      return NextResponse.json({ ok: true });
    }

    if (!pending) {
      await startPendingTelegramSubmission(chatId);
      await sendTelegramReplyKeyboard(chatId, "أهلاً بك 👋", [EMP_GATEWAY_LABEL]);
      await askMainMenu(chatId, staff);
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "main_menu") {
      await askMainMenu(chatId, staff);
      return NextResponse.json({ ok: true });
    }

    if (pending.stage?.startsWith("emp_new:")) {
      const [, requestType, idxStr] = pending.stage.split(":");
      const idx = Number(idxStr);
      const field = EMP_FIELDS[requestType]?.[idx];
      if (!field) {
        await clearPendingTelegramSubmission(chatId);
        await askMainMenu(chatId, staff);
        return NextResponse.json({ ok: true });
      }

      // حقول التاريخ تُدخَل فقط عبر أزرار التقويم، لا نصاً حراً
      if (field.isDate) {
        await promptEmpField(chatId, field, "الرجاء اختيار التاريخ من التقويم أدناه.");
        return NextResponse.json({ ok: true });
      }

      if (!message.text || message.text.startsWith("/")) {
        await promptEmpField(chatId, field);
        return NextResponse.json({ ok: true });
      }

      await advanceEmpField(chatId, staff, requestType, idx, message.text);
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "awaiting_customer_choice") {
      await askCustomerChoice(chatId);
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "awaiting_customer_search") {
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramInlineKeyboard(chatId, "الرجاء إرسال جزء من اسم العميل أو رقم هاتفه نصاً.", withBack([]));
        return NextResponse.json({ ok: true });
      }
      const results = await searchCustomers(message.text);
      if (results.length === 0) {
        await sendTelegramInlineKeyboard(chatId, "لا يوجد عميل مطابق. جرّب صياغة أخرى، أو أضفه كعميل جديد.", withBack([
          [{ text: "➕ إضافة كعميل جديد", callback_data: "cust_new" }],
        ]));
      } else if (results.length > 6) {
        await sendTelegramInlineKeyboard(chatId, `وُجد ${results.length} عميل مطابق، حدّد البحث أكثر (اكتب جزءاً أدق من الاسم أو الهاتف).`, withBack([]));
      } else {
        await sendTelegramInlineKeyboard(
          chatId,
          "اختر العميل الصحيح:",
          withBack(results.map((c) => [{ text: `${c.name}${c.phone ? " — " + c.phone : ""}`, callback_data: `select_customer:${c.id}` }]))
        );
      }
      return NextResponse.json({ ok: true });
    }

    // فورم واضح لإدخال عميل جديد: أربع خطوات منفصلة (الاسم، الهاتف، العنوان، المؤسسة)
    if (pending.stage === "awaiting_new_name") {
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramInlineKeyboard(chatId, "الرجاء إرسال اسم العميل نصاً.", withBack([]));
        return NextResponse.json({ ok: true });
      }
      await setPendingNewCustomerName(chatId, message.text);
      await sendTelegramInlineKeyboard(chatId, "رقم هاتف العميل؟ (اكتب \"تخطي\" إن لم يتوفر)", withBack([]));
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "awaiting_new_phone") {
      if (!message.text) {
        await sendTelegramInlineKeyboard(chatId, "الرجاء إرسال رقم الهاتف نصاً، أو \"تخطي\".", withBack([]));
        return NextResponse.json({ ok: true });
      }
      const skip = message.text.trim() === "تخطي";
      await setPendingNewCustomerPhone(chatId, skip ? null : (extractPhone(message.text) || message.text));
      await sendTelegramInlineKeyboard(chatId, "عنوان العميل؟ (اكتب \"تخطي\" إن لم يتوفر)", withBack([]));
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "awaiting_new_address") {
      if (!message.text) {
        await sendTelegramInlineKeyboard(chatId, "الرجاء إرسال العنوان نصاً، أو \"تخطي\".", withBack([]));
        return NextResponse.json({ ok: true });
      }
      const skip = message.text.trim() === "تخطي";
      await setPendingNewCustomerAddress(chatId, skip ? null : message.text);
      await sendTelegramInlineKeyboard(chatId, "اسم المؤسسة/الشركة؟ (اكتب \"تخطي\" إن لم يوجد)", withBack([]));
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "awaiting_new_company") {
      if (!message.text) {
        await sendTelegramInlineKeyboard(chatId, "الرجاء إرسال اسم المؤسسة نصاً، أو \"تخطي\".", withBack([]));
        return NextResponse.json({ ok: true });
      }
      const skip = message.text.trim() === "تخطي";
      await setPendingNewCustomerCompany(chatId, skip ? null : message.text);
      await sendTelegramInlineKeyboard(chatId, "الآن أرسل تفاصيل الطلبية: نص، صورة، أو تسجيل صوتي.", withBack([]));
      return NextResponse.json({ ok: true });
    }

    // pending.stage === "awaiting_content"
    const customerFields = {
      customer_name: pending.customer_name,
      customer_phone: pending.customer_phone,
      customer_address: pending.customer_address,
      customer_company_name: pending.company_name,
      matched_customer_id: pending.matched_customer_id,
      needs_site_visit: !!pending.needs_site_visit,
    };

    let submission = null;

    if (message.text && !message.text.startsWith("/")) {
      submission = await createOrderSubmission({
        submitted_by_staff_id: staff.id,
        submitted_by_name: staff.name,
        source: "telegram",
        content_type: "text",
        text_content: message.text,
        ...customerFields,
      });
    } else if (message.photo && message.photo.length > 0) {
      const largest = message.photo[message.photo.length - 1];
      const fileUrl = await uploadTelegramFileToStorage(largest.file_id, "jpg");
      submission = await createOrderSubmission({
        submitted_by_staff_id: staff.id,
        submitted_by_name: staff.name,
        source: "telegram",
        content_type: "image",
        file_url: fileUrl,
        telegram_file_id: largest.file_id,
        ...customerFields,
      });
    } else if (message.voice) {
      const fileUrl = await uploadTelegramFileToStorage(message.voice.file_id, "ogg");
      submission = await createOrderSubmission({
        submitted_by_staff_id: staff.id,
        submitted_by_name: staff.name,
        source: "telegram",
        content_type: "voice",
        file_url: fileUrl,
        telegram_file_id: message.voice.file_id,
        ...customerFields,
      });
    } else {
      await sendTelegramMessage(chatId, "أرسل صورة الطلبية، تسجيلاً صوتياً، أو اكتبها نصاً فقط.");
      return NextResponse.json({ ok: true });
    }

    await clearPendingTelegramSubmission(chatId);

    if (submission) {
      const matchNote = pending.matched_customer_id ? " (عميل مسجَّل مسبقاً)" : "";
      if (pending.needs_site_visit) {
        await sendTelegramMessage(chatId, `تم تسجيل طلبية العميل "${pending.customer_name}"${matchNote} كـ"بانتظار كشف الموقع" — بعد الزيارة الميدانية ستصل تلقائياً لمعالج الطلبيات.`);
      } else {
        await sendTelegramMessage(chatId, `تم استلام طلبية العميل "${pending.customer_name}"${matchNote} بنجاح، وستصل إلى معالج الطلبيات للمراجعة والإدخال.`);
        await notifyOrderProcessors(staff.name, pending.customer_name || "غير محدد");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch (err) {}
}

async function handleCallbackQuery(callbackQuery: any) {
  const chatId = String(callbackQuery.message?.chat?.id);
  const data: string = callbackQuery.data || "";

  if (data === "cust_existing") {
    await setPendingTelegramStage(chatId, "awaiting_customer_search");
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramInlineKeyboard(chatId, "اكتب جزءاً من اسم العميل أو رقم هاتفه.", withBack([]));
    return;
  }

  if (data === "cust_new") {
    await setPendingTelegramStage(chatId, "awaiting_new_name");
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramInlineKeyboard(chatId, "اسم العميل الجديد؟", withBack([]));
    return;
  }

  if (data.startsWith("select_customer:")) {
    const customerId = data.replace("select_customer:", "");
    const { data: customer } = await supabase.from("erp_customers").select("id, name, phone").eq("id", customerId).single();
    if (!customer) {
      await answerCallbackQuery(callbackQuery.id, "تعذّر إيجاد العميل");
      return;
    }
    await setPendingTelegramCustomer(chatId, customer.name, customer.phone, customer.id);
    await answerCallbackQuery(callbackQuery.id, "تم اختيار العميل");
    await sendTelegramMessage(chatId, `تم اختيار العميل: ${customer.name}. الآن أرسل تفاصيل الطلبية: نص، صورة، أو تسجيل صوتي.`);
    return;
  }

  if (data === "main_menu") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await setPendingTelegramStage(chatId, "main_menu");
    await answerCallbackQuery(callbackQuery.id);
    await askMainMenu(chatId, staff);
    return;
  }

  if (data === "menu_direct" || data === "menu_site_visit") {
    await setPendingMenuChoice(chatId, data === "menu_site_visit");
    await answerCallbackQuery(callbackQuery.id);
    await askCustomerChoice(chatId);
    return;
  }

  if (data === "emp_menu") {
    await answerCallbackQuery(callbackQuery.id);
    await askEmpMenu(chatId);
    return;
  }

  if (data === "emp_attendance_menu") {
    await answerCallbackQuery(callbackQuery.id);
    await askAttendanceMenu(chatId);
    return;
  }

  if (data === "emp_my_requests") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await answerCallbackQuery(callbackQuery.id);
    await askMyRequests(chatId, staff.id);
    return;
  }

  if (data === "emp_attendance_summary") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await answerCallbackQuery(callbackQuery.id);
    await askMyAttendance(chatId, staff.id);
    return;
  }

  if (data === "emp_team") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await answerCallbackQuery(callbackQuery.id);
    await askTeamRequests(chatId, staff.id);
    return;
  }

  if (data === "emp_daily_summary") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await answerCallbackQuery(callbackQuery.id);
    await askDailySummary(chatId, staff.role);
    return;
  }

  if (data === "emp_search_staff") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await supabase.from("erp_telegram_pending_submissions").upsert([{ chat_id: chatId, stage: "emp_search_query" }]);
    await answerCallbackQuery(callbackQuery.id);
    await askStaffSearchPrompt(chatId);
    return;
  }

  if (data === "emp_new:work_report") {
    await startEmployeeRequestDraft(chatId, "work_report");
    await setPendingTelegramStage(chatId, "emp_work_report");
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramInlineKeyboard(chatId, "أرسل تقرير عملك: اكتبه نصاً، أو أرسل تسجيلاً صوتياً 🎤", withBack([]));
    return;
  }

  if (data.startsWith("emp_new:")) {
    const requestType = data.replace("emp_new:", "");
    const fields = EMP_FIELDS[requestType];
    if (!fields) { await answerCallbackQuery(callbackQuery.id, "نوع غير معروف"); return; }
    await startEmployeeRequestDraft(chatId, requestType);
    await answerCallbackQuery(callbackQuery.id);
    await promptEmpField(chatId, fields[0], `${EMP_TYPE_LABEL[requestType]}:`);
    return;
  }

  if (data === "admin_tools_menu") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await answerCallbackQuery(callbackQuery.id);
    await askAdminToolsMenu(chatId);
    return;
  }

  if (data === "admin_all_pending") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await answerCallbackQuery(callbackQuery.id);
    await askAllPendingRequests(chatId);
    return;
  }

  if (data === "admin_work_reports") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await answerCallbackQuery(callbackQuery.id);
    await askRecentWorkReports(chatId);
    return;
  }

  if (data === "admin_add_staff") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await supabase.from("erp_telegram_pending_submissions").upsert([{ chat_id: chatId, stage: "admin_add_staff:0", emp_draft: {} }]);
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramInlineKeyboard(chatId, "👤 اسم الموظف الجديد؟", withBack([]));
    return;
  }

  if (data.startsWith("admin_add_role:")) {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    const role = data.replace("admin_add_role:", "");
    const pending = await getPendingTelegramSubmission(chatId);
    const draft = { ...(pending?.emp_draft || {}), role };
    await updateEmployeeRequestDraft(chatId, draft, "admin_add_staff:2");
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramInlineKeyboard(chatId, "📱 رقم الهاتف؟ (اكتب \"تخطي\" إن لم تحدد)", withBack([]));
    return;
  }

  if (data === "admin_toggle_staff") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await supabase.from("erp_telegram_pending_submissions").upsert([{ chat_id: chatId, stage: "admin_toggle_search" }]);
    await answerCallbackQuery(callbackQuery.id);
    await askToggleStaffSearch(chatId);
    return;
  }

  if (data.startsWith("admin_toggle_pick:")) {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    const targetId = data.replace("admin_toggle_pick:", "");
    const { data: target } = await supabase.from("erp_staff").select("id, name, is_active").eq("id", targetId).maybeSingle();
    if (!target) { await answerCallbackQuery(callbackQuery.id, "تعذّر إيجاد الموظف"); return; }
    await answerCallbackQuery(callbackQuery.id);
    const nextVal = target.is_active ? "0" : "1";
    const actionLabel = target.is_active ? "⛔ تعطيله الآن" : "✅ تفعيله الآن";
    await sendTelegramInlineKeyboard(
      chatId,
      `${target.name} حالياً ${target.is_active ? "🟢 نشط" : "🔴 معطّل"}.`,
      withBack([[{ text: actionLabel, callback_data: `admin_toggle_do:${target.id}:${nextVal}` }]])
    );
    return;
  }

  if (data.startsWith("admin_toggle_do:")) {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    const [, targetId, nextValStr] = data.split(":");
    const nextVal = nextValStr === "1";
    const { error } = await supabase.from("erp_staff").update({ is_active: nextVal }).eq("id", targetId);
    await answerCallbackQuery(callbackQuery.id, error ? "فشل" : "تم");
    await sendTelegramInlineKeyboard(
      chatId,
      error ? `تعذّر: ${error.message}` : `✅ تم ${nextVal ? "تفعيل" : "تعطيل"} الموظف بنجاح`,
      withBack([])
    );
    return;
  }

  if (data === "bmsg_menu") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await answerCallbackQuery(callbackQuery.id);
    await askBroadcastTargetMenu(chatId);
    return;
  }

  if (data === "bmsg_target:specific") {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    await supabase.from("erp_telegram_pending_submissions").upsert([{ chat_id: chatId, stage: "bmsg_pick_search" }]);
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramInlineKeyboard(chatId, "🔍 اكتب اسم الموظف (أو جزءاً منه):", withBack([]));
    return;
  }

  if (data.startsWith("bmsg_target:")) {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    const target = data.replace("bmsg_target:", "");
    await answerCallbackQuery(callbackQuery.id);
    await askBroadcastComposePrompt(chatId, `bmsg_send_compose:${target}`);
    return;
  }

  if (data.startsWith("bmsg_pick:")) {
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff || (staff.role !== "manager" && staff.role !== "hr")) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    const pickedId = data.replace("bmsg_pick:", "");
    await answerCallbackQuery(callbackQuery.id);
    await askBroadcastComposePrompt(chatId, `bmsg_send_compose:specific:${pickedId}`);
    return;
  }

  if (data.startsWith("bmsg_reply:")) {
    const broadcastId = data.replace("bmsg_reply:", "");
    const { data: original } = await supabase
      .from("erp_broadcast_messages")
      .select("sender_staff_id")
      .eq("id", broadcastId)
      .maybeSingle();

    if (!original) { await answerCallbackQuery(callbackQuery.id, "تعذّر إيجاد الرسالة"); return; }

    await supabase.from("erp_telegram_pending_submissions").upsert([{
      chat_id: chatId, stage: `bmsg_reply_compose:${original.sender_staff_id}`,
    }]);
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramMessage(chatId, "✍️ اكتب ردك:");
    return;
  }

  if (data === "noop") {
    await answerCallbackQuery(callbackQuery.id);
    return;
  }

  if (data.startsWith("cal_nav:")) {
    const ym = data.replace("cal_nav:", "");
    const [y, m] = ym.split("-").map(Number);
    await answerCallbackQuery(callbackQuery.id);
    const pending = await getPendingTelegramSubmission(chatId);
    if (!pending?.stage?.startsWith("emp_new:")) return;
    const [, requestType, idxStr] = pending.stage.split(":");
    const field = EMP_FIELDS[requestType]?.[Number(idxStr)];
    if (!field) return;
    await sendTelegramInlineKeyboard(chatId, field.prompt, withBack(buildCalendar(y, m)));
    return;
  }

  if (data.startsWith("cal:")) {
    const dateStr = data.replace("cal:", "");
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    const pending = await getPendingTelegramSubmission(chatId);
    await answerCallbackQuery(callbackQuery.id, dateStr);
    if (!pending?.stage?.startsWith("emp_new:")) return;
    const [, requestType, idxStr] = pending.stage.split(":");
    await advanceEmpField(chatId, staff, requestType, Number(idxStr), dateStr);
    return;
  }

  if (data.startsWith("emp_ack:")) {
    const requestId = data.replace("emp_ack:", "");
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    const result = await acknowledgeEmployeeRequest(requestId, staff.id);
    await answerCallbackQuery(callbackQuery.id, result.error ? "فشل" : "تم الاستلام");
    await sendTelegramMessage(chatId, result.error ? `تعذّر: ${result.error}` : "تم تسجيل الاستلام ✅");
    return;
  }

  if (data.startsWith("emp_approve:")) {
    const requestId = data.replace("emp_approve:", "");
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    const result = await resolveEmployeeRequest(requestId, "موافق عليه", staff.id);
    await answerCallbackQuery(callbackQuery.id, result.error ? "فشل" : "تمت الموافقة");
    await sendTelegramMessage(chatId, result.error ? `تعذّرت الموافقة: ${result.error}` : "تمت الموافقة على الطلب وتنفيذ أثره تلقائياً ✅");
    return;
  }

  if (data.startsWith("emp_reject:")) {
    const requestId = data.replace("emp_reject:", "");
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramInlineKeyboard(chatId, "اختر سبب الرفض:", [
      ...EMP_REJECT_REASONS.map((reason, idx) => [{ text: reason, callback_data: `emp_reject_do:${requestId}:${idx}` }]),
      [{ text: "✏️ سبب آخر (اكتب رسالة)", callback_data: `emp_reject_custom:${requestId}` }],
    ]);
    return;
  }

  if (data.startsWith("emp_reject_do:")) {
    const [, requestId, idxStr] = data.split(":");
    const staff = await getStaffByTelegramChatId(chatId);
    if (!staff) { await answerCallbackQuery(callbackQuery.id, "غير مصرح"); return; }
    const reason = EMP_REJECT_REASONS[Number(idxStr)] || "غير محدد";
    const result = await resolveEmployeeRequest(requestId, "مرفوض", staff.id, reason);
    await answerCallbackQuery(callbackQuery.id, result.error ? "فشل" : "تم الرفض");
    await sendTelegramMessage(chatId, result.error ? `تعذّر الرفض: ${result.error}` : "تم رفض الطلب وإبلاغ الموظف بالسبب ✅");
    return;
  }

  if (data.startsWith("emp_reject_custom:")) {
    const requestId = data.replace("emp_reject_custom:", "");
    await supabase.from("erp_telegram_pending_submissions").upsert([{ chat_id: chatId, stage: `emp_reject_custom:${requestId}` }]);
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramMessage(chatId, "اكتب سبب الرفض نصاً.");
    return;
  }

  if (data.startsWith("confirm_install:")) {
    const doorOrderId = data.replace("confirm_install:", "");
    try {
      const { error } = await supabase
        .from("erp_door_orders")
        .update({ installation_status: "مكتملة", customer_confirmed_at: new Date().toISOString(), status: "جاهزة" })
        .eq("id", doorOrderId);
      if (error) throw error;
      await answerCallbackQuery(callbackQuery.id, "تم تأكيد الاستلام");
      await sendTelegramMessage(chatId, "تم تسجيل تأكيد استلام العميل بنجاح ✅");
    } catch (err: any) {
      await answerCallbackQuery(callbackQuery.id, "فشل التأكيد");
      await sendTelegramMessage(chatId, `تعذّر تأكيد الاستلام: ${err.message || "خطأ غير متوقع"}`);
    }
    return;
  }

  if (data.startsWith("approve:")) {
    const orderId = data.replace("approve:", "");
    try {
      const order = await approveSalesOrderAndNotify(orderId);
      await answerCallbackQuery(callbackQuery.id, "تم اعتماد الطلبية");
      const orderRef = order.id.split("-")[0];
      await sendTelegramMessage(chatId, `تم اعتماد الطلبية #${orderRef} بنجاح، وتوجيهها تلقائياً للأقسام المعنية.`);
    } catch (err: any) {
      await answerCallbackQuery(callbackQuery.id, "فشل الاعتماد");
      await sendTelegramMessage(chatId, `تعذّر اعتماد الطلبية: ${err.message || "خطأ غير متوقع"}`);
    }
    return;
  }

  await answerCallbackQuery(callbackQuery.id);
}

async function uploadTelegramFileToStorage(fileId: string, ext: string): Promise<string | null> {
  const telegramUrl = await getTelegramFileUrl(fileId);
  if (!telegramUrl) return null;

  const fileRes = await fetch(telegramUrl);
  if (!fileRes.ok) return null;

  const arrayBuffer = await fileRes.arrayBuffer();
  const path = `${Date.now()}-${fileId}.${ext}`;

  const { error } = await supabase.storage
    .from("order-submissions")
    .upload(path, arrayBuffer, { contentType: ext === "jpg" ? "image/jpeg" : "audio/ogg" });

  if (error) {
    console.error("Storage upload error:", error);
    return null;
  }

  const { data } = supabase.storage.from("order-submissions").getPublicUrl(path);
  return data.publicUrl;
}

async function notifyOrderProcessors(senderName: string, customerName: string) {
  const { data: processors } = await supabase
    .from("erp_staff")
    .select("telegram_chat_id")
    .eq("role", "order_processor")
    .eq("is_active", true)
    .not("telegram_chat_id", "is", null);

  if (!processors) return;
  for (const p of processors) {
    if (p.telegram_chat_id) {
      await sendTelegramMessage(p.telegram_chat_id, `طلبية جديدة من ${senderName} للعميل "${customerName}" بانتظار المراجعة والإدخال.`, true);
    }
  }
}
