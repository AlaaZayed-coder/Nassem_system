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
  setPendingNewCustomerName,
  setPendingNewCustomerPhone,
  setPendingNewCustomerAddress,
  clearPendingTelegramSubmission,
} from "@/lib/order-submissions-data";
import { approveSalesOrderAndNotify } from "@/lib/order-notifications";

function extractPhone(text: string): string | null {
  const match = text.match(/0\d{8,9}|\+?9\d{11,12}/);
  return match ? match[0] : null;
}

async function askCustomerChoice(chatId: string) {
  await sendTelegramInlineKeyboard(chatId, "طلبية جديدة. هل العميل مسجَّل مسبقاً؟", [
    [
      { text: "🔍 عميل موجود", callback_data: "cust_existing" },
      { text: "➕ عميل جديد", callback_data: "cust_new" },
    ],
  ]);
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

    if (!pending) {
      await startPendingTelegramSubmission(chatId);
      await askCustomerChoice(chatId);
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "awaiting_customer_choice") {
      await askCustomerChoice(chatId);
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "awaiting_customer_search") {
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramMessage(chatId, "الرجاء إرسال جزء من اسم العميل أو رقم هاتفه نصاً.");
        return NextResponse.json({ ok: true });
      }
      const results = await searchCustomers(message.text);
      if (results.length === 0) {
        await sendTelegramInlineKeyboard(chatId, "لا يوجد عميل مطابق. جرّب صياغة أخرى، أو أضفه كعميل جديد.", [
          [{ text: "➕ إضافة كعميل جديد", callback_data: "cust_new" }],
        ]);
      } else if (results.length > 6) {
        await sendTelegramMessage(chatId, `وُجد ${results.length} عميل مطابق، حدّد البحث أكثر (اكتب جزءاً أدق من الاسم أو الهاتف).`);
      } else {
        await sendTelegramInlineKeyboard(
          chatId,
          "اختر العميل الصحيح:",
          results.map((c) => [{ text: `${c.name}${c.phone ? " — " + c.phone : ""}`, callback_data: `select_customer:${c.id}` }])
        );
      }
      return NextResponse.json({ ok: true });
    }

    // فورم واضح لإدخال عميل جديد: ثلاث خطوات منفصلة (الاسم، ثم الهاتف، ثم العنوان)
    if (pending.stage === "awaiting_new_name") {
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramMessage(chatId, "الرجاء إرسال اسم العميل نصاً.");
        return NextResponse.json({ ok: true });
      }
      await setPendingNewCustomerName(chatId, message.text);
      await sendTelegramMessage(chatId, "رقم هاتف العميل؟ (اكتب \"تخطي\" إن لم يتوفر)");
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "awaiting_new_phone") {
      if (!message.text) {
        await sendTelegramMessage(chatId, "الرجاء إرسال رقم الهاتف نصاً، أو \"تخطي\".");
        return NextResponse.json({ ok: true });
      }
      const skip = message.text.trim() === "تخطي";
      await setPendingNewCustomerPhone(chatId, skip ? null : (extractPhone(message.text) || message.text));
      await sendTelegramMessage(chatId, "عنوان العميل؟ (اكتب \"تخطي\" إن لم يتوفر)");
      return NextResponse.json({ ok: true });
    }

    if (pending.stage === "awaiting_new_address") {
      if (!message.text) {
        await sendTelegramMessage(chatId, "الرجاء إرسال العنوان نصاً، أو \"تخطي\".");
        return NextResponse.json({ ok: true });
      }
      const skip = message.text.trim() === "تخطي";
      await setPendingNewCustomerAddress(chatId, skip ? null : message.text);
      await sendTelegramMessage(chatId, "تم استلام بيانات العميل الجديد. الآن أرسل تفاصيل الطلبية: نص، صورة، أو تسجيل صوتي.");
      return NextResponse.json({ ok: true });
    }

    // pending.stage === "awaiting_content"
    const customerFields = {
      customer_name: pending.customer_name,
      customer_phone: pending.customer_phone,
      customer_address: pending.customer_address,
      matched_customer_id: pending.matched_customer_id,
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
      await sendTelegramMessage(chatId, `تم استلام طلبية العميل "${pending.customer_name}"${matchNote} بنجاح، وستصل إلى معالج الطلبيات للمراجعة والإدخال.`);
      await notifyOrderProcessors(staff.name, pending.customer_name || "غير محدد");
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
    await sendTelegramMessage(chatId, "اكتب جزءاً من اسم العميل أو رقم هاتفه.");
    return;
  }

  if (data === "cust_new") {
    await setPendingTelegramStage(chatId, "awaiting_new_name");
    await answerCallbackQuery(callbackQuery.id);
    await sendTelegramMessage(chatId, "اسم العميل الجديد؟");
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
