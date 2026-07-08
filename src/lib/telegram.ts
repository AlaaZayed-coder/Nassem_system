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
          ? { reply_markup: { inline_keyboard: [[{ text: "فتح تطبيق المصنع", web_app: { url: TELEGRAM_MINI_APP_URL } }]] } }
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

export async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (!data.ok) return null;

  return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
}
