export const TELEGRAM_MINI_APP_URL = "https://nassem-system.vercel.app/telegram-app";

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
        ...(withMiniAppButton
          ? { reply_markup: { inline_keyboard: [[{ text: "Business hub", web_app: { url: TELEGRAM_MINI_APP_URL } }]] } }
          : {}),
      }),
    });
  } catch (err) {}
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
      body: JSON.stringify({ chat_id: chatId, text, reply_markup: { inline_keyboard: buttons } }),
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
