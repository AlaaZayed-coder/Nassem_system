export const TELEGRAM_MINI_APP_URL = "https://nassem-system.vercel.app/telegram-app";

// نُفعِّل HTML على كل رسائل البوت للسماح بالخط العريض (<b>) على المعلومات
// المهمة (اسم الموظف، القيم الحساسة...). أي نص حر يُدرَج داخل رسالة يجب أن
// يمر بـ escapeHtml أولاً وإلا كسر تنسيق تيليجرام (أو سبّب رفض الإرسال
// بصمت لو احتوى على "<" أو "&" أو ">" غير مقصودة).
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function bold(value: string): string {
  return `<b>${escapeHtml(value)}</b>`;
}

export async function sendTelegramMessage(chatId: string, text: string, withMiniAppButton = false) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(withMiniAppButton
          ? { reply_markup: { inline_keyboard: [[{ text: "Business hub", web_app: { url: TELEGRAM_MINI_APP_URL } }]] } }
          : {}),
      }),
    });
  } catch (err) {}
}

// يرسل صورة (برابط عام يقدر تيليجرام يجلبه، مثل شعار مستضاف تحت public/)
// مع نص توضيحي (caption) بنفس تنسيق HTML — مستخدَمة لتحية الصباح/المساء
// المرفقة بشعار الشركة.
export async function sendTelegramPhoto(chatId: string, photoUrl: string, caption: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML" }),
    });
  } catch (err) {}
}

// نفس sendTelegramMessage لكن مع زر شفاف "↩️ رد" + "🔙 القائمة الرئيسية"
// ملتصقين بالرسالة دائماً معاً — عند الضغط على "رد" يدخل الموظف بوضع كتابة
// رد يُوجَّه تلقائياً لمُرسِل الرسالة الأصلي (انظر معالجة bmsg_reply: بملف
// بوت تيليجرام)، وزر القائمة الرئيسية يبقى متاحاً دائماً بجانبه للخروج من
// أي وقت. يرجّع معرّف الرسالة المُرسَلة للتوثيق فقط.
export async function sendTelegramMessageWithReplyButton(
  chatId: string,
  text: string,
  callbackData: string
): Promise<number | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "↩️ رد", callback_data: callbackData },
            { text: "🔙 القائمة الرئيسية", callback_data: "main_menu" },
          ]],
        },
      }),
    });
    const data = await res.json();
    return data?.result?.message_id ?? null;
  } catch (err) {
    return null;
  }
}

export async function sendTelegramInlineKeyboard(
  chatId: string,
  text: string,
  buttons: { text: string; callback_data: string }[][]
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }),
    });
  } catch (err) {}
}

// لوحة مفاتيح ثابتة تبقى ظاهرة أسفل شاشة تيليجرام بعد أي رسالة (وليست
// inline)، بحيث يستطيع الموظف الوصول لبوابته في أي وقت بغض النظر عن مرحلة
// أي محادثة أخرى جارية.
export async function sendTelegramReplyKeyboard(chatId: string, text: string, buttonLabels: string[]) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          keyboard: buttonLabels.map((label) => [{ text: label }]),
          resize_keyboard: true,
          is_persistent: true,
        },
      }),
    });
  } catch (err) {}
}

// يقبل تيليجرام رابط HTTP مباشرة لحقل voice ويجلبه هو بنفسه، فلا حاجة لتنزيله ثم رفعه.
export async function sendTelegramVoice(chatId: string, voiceUrl: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, voice: voiceUrl }),
    });
  } catch (err) {}
}

export async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (!data.ok) return null;

  return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
}
