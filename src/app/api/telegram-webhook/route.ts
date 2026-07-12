import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendTelegramMessage, sendTelegramInlineKeyboard, getTelegramFileUrl } from "@/lib/telegram";
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
import { resolveEmployeeRequest } from "@/lib/employee-requests-data";

const EMP_REJECT_REASONS = ["ضغط عمل تشغيلي", "الرصيد لا يسمح", "تأجيل للشهر القادم"];

function extractPhone(text: string): string | null {
  const match = text.match(/0\d{8,9}|\+?9\d{11,12}/);
  return match ? match[0] : null;
}

const BACK_BUTTON = { text: "🔙 القائمة الرئيسية", callback_data: "main_menu" };

// يعيد أزرار مع صف "القائمة الرئيسية" مُلحق دائماً في الأسفل، بحيث يمكن
// للمندوب الخروج من أي خطوة إدخال دون فقدان ما أدخله جزئياً — البيانات تبقى
// محفوظة في erp_telegram_pending_submissions حتى يكمل أو يبدأ فرعاً جديداً.
function withBack(rows: { text: string; callback_data: string }[][]): { text: string; callback_data: string }[][] {
  return [...rows, [BACK_BUTTON]];
}

async function askMainMenu(chatId: string) {
  await sendTelegramInlineKeyboard(chatId, "ماذا تريد أن تفعل؟", [
    [{ text: "📝 طلبية جديدة (إدخال مباشر)", callback_data: "menu_direct" }],
    [{ text: "🧭 طلبية تحتاج كشف موقع", callback_data: "menu_site_visit" }],
  ]);
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

    if (!staff || !["sales", "manager"].includes(staff.role)) {
      await sendTelegramMessage(chatId, "غير مصرح لك بإرسال طلبيات عبر هذا البوت. تواصل مع مدير النظام لتسجيلك كمندوب مبيعات أو مدير.");
      return NextResponse.json({ ok: true });
    }

    const pending = await getPendingTelegramSubmission(chatId);

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
      await askMainMenu(chatId);
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "main_menu") {
      await askMainMenu(chatId);
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
    await setPendingTelegramStage(chatId, "main_menu");
    await answerCallbackQuery(callbackQuery.id);
    await askMainMenu(chatId);
    return;
  }

  if (data === "menu_direct" || data === "menu_site_visit") {
    await setPendingMenuChoice(chatId, data === "menu_site_visit");
    await answerCallbackQuery(callbackQuery.id);
    await askCustomerChoice(chatId);
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
