import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendTelegramMessage, getTelegramFileUrl } from "@/lib/telegram";
import {
  getStaffByTelegramChatId,
  createOrderSubmission,
  findCustomerByPhone,
  getPendingTelegramSubmission,
  startPendingTelegramSubmission,
  setPendingTelegramCustomer,
  clearPendingTelegramSubmission,
} from "@/lib/order-submissions-data";
import { approveSalesOrderAndNotify } from "@/lib/order-notifications";

function extractPhone(text: string): string | null {
  const match = text.match(/0\d{8,9}|\+?9\d{11,12}/);
  return match ? match[0] : null;
}

// نقطة استقبال تحديثات بوت تيليجرام: يستقبل صورة/تسجيل صوتي/نص من مندوب
// مبيعات أو مدير، ويحفظه في صندوق الوارد (erp_order_submissions) ليراجعه
// معالج الطلبيات لاحقاً. لا يوجد أي إدخال تلقائي مباشر في نظام الطلبيات.
// كما يعالج ضغط زر "اعتماد الطلبية" الذي يصل للمُرسِل الأصلي بعد إدخال طلبيته.
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

    // محادثة من خطوتين: أولاً هوية العميل، ثم محتوى الطلبية. يبدأ البوت
    // المحادثة تلقائياً إن لم تكن هناك محادثة قائمة لهذا المُرسِل.
    const pending = await getPendingTelegramSubmission(chatId);

    if (!pending) {
      await startPendingTelegramSubmission(chatId);
      await sendTelegramMessage(chatId, "طلبية جديدة. أرسل أولاً اسم العميل و/أو رقم هاتفه.");
      return NextResponse.json({ ok: true });
    }

    if (!pending.customer_name) {
      if (!message.text || message.text.startsWith("/")) {
        await sendTelegramMessage(chatId, "الرجاء إرسال اسم العميل أو رقم هاتفه نصاً أولاً.");
        return NextResponse.json({ ok: true });
      }
      const phone = extractPhone(message.text);
      await setPendingTelegramCustomer(chatId, message.text, phone);
      await sendTelegramMessage(chatId, "تم استلام بيانات العميل. الآن أرسل تفاصيل الطلبية: نص، صورة، أو تسجيل صوتي.");
      return NextResponse.json({ ok: true });
    }

    const matchedCustomer = pending.customer_phone ? await findCustomerByPhone(pending.customer_phone) : null;
    const customerFields = {
      customer_name: pending.customer_name,
      customer_phone: pending.customer_phone,
      matched_customer_id: matchedCustomer?.id || null,
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
      const matchNote = matchedCustomer ? ` (عميل مسجَّل مسبقاً: ${matchedCustomer.name})` : "";
      await sendTelegramMessage(chatId, `تم استلام طلبية العميل "${pending.customer_name}"${matchNote} بنجاح، وستصل إلى معالج الطلبيات للمراجعة والإدخال.`);
      await notifyOrderProcessors(staff.name, pending.customer_name);
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

  if (!data.startsWith("approve:")) {
    await answerCallbackQuery(callbackQuery.id);
    return;
  }

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
