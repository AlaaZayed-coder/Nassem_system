import { supabase } from "@/lib/supabase";
import { sendTelegramMessage, sendTelegramMessageWithReplyButton } from "@/lib/telegram";

export type BroadcastTarget = "all" | "managers" | "hr" | "specific";

// يرسل رسالة تيليجرام لمجموعة موظفين (الكل/مدراء/موارد بشرية/مختارين)،
// مستخدَمة من صفحة إدارة الموظفين بالويب وأيضاً من داخل البوت مباشرة
// (لمدير النظام ومسؤول الموارد البشرية). يحاول تسجيل كل رسالة بجدول
// erp_broadcast_messages لتفعيل زر "↩️ رد"، لكن فشل التسجيل لا يمنع
// الإرسال نفسه — الرسالة تُرسل دائماً ولو بلا زر رد.
export async function sendBroadcastMessage(params: {
  senderStaffId: string;
  target: BroadcastTarget;
  targetIds?: string[];
  message: string;
}): Promise<{ error?: string; sent?: number }> {
  const { senderStaffId, target, message } = params;
  const targetIds = params.targetIds || [];

  if (!message) return { error: "الرسالة مطلوبة" };
  if (target === "specific" && targetIds.length === 0) return { error: "الرجاء اختيار موظف واحد على الأقل" };

  let recipients: { id: string; telegram_chat_id: string | null }[] = [];
  const roleForTarget: Record<string, string> = { managers: "manager", hr: "hr" };

  if (target === "all") {
    const { data, error } = await supabase
      .from("erp_staff")
      .select("id, telegram_chat_id")
      .not("telegram_chat_id", "is", null)
      .eq("is_active", true);
    if (error) return { error: error.message };
    recipients = data || [];
  } else if (target === "managers" || target === "hr") {
    const { data, error } = await supabase
      .from("erp_staff")
      .select("id, telegram_chat_id")
      .eq("role", roleForTarget[target])
      .not("telegram_chat_id", "is", null)
      .eq("is_active", true);
    if (error) return { error: error.message };
    recipients = data || [];
    if (recipients.length === 0) return { error: "لا يوجد أحد بهذا الدور له حساب تيليجرام مرتبط" };
  } else {
    const { data, error } = await supabase
      .from("erp_staff")
      .select("id, telegram_chat_id")
      .in("id", targetIds);
    if (error) return { error: error.message };
    recipients = (data || []).filter((r) => r.telegram_chat_id);
    if (recipients.length === 0) return { error: "لا يوجد بين المختارين من عنده حساب تيليجرام مرتبط" };
  }

  const { data: sender } = await supabase.from("erp_staff").select("telegram_chat_id").eq("id", senderStaffId).maybeSingle();
  const senderChatId = sender?.telegram_chat_id || null;
  const text = target === "specific" ? message : `📢 ${message}`;

  let sent = 0;
  for (const r of recipients) {
    if (!r.telegram_chat_id) continue;

    if (senderChatId) {
      const { data: logRow } = await supabase
        .from("erp_broadcast_messages")
        .insert([{
          sender_staff_id: senderStaffId,
          recipient_staff_id: r.id,
          telegram_chat_id: r.telegram_chat_id,
          message_text: text,
        }])
        .select("id")
        .single();

      if (logRow) {
        const messageId = await sendTelegramMessageWithReplyButton(r.telegram_chat_id, text, `bmsg_reply:${logRow.id}`);
        if (messageId) {
          await supabase.from("erp_broadcast_messages").update({ telegram_message_id: messageId }).eq("id", logRow.id);
        }
      } else {
        // تعذّر تسجيل الرسالة (مثلاً الجدول غير محدث) — أرسلها بلا زر رد بدل ما تُفقد بالكامل.
        await sendTelegramMessage(r.telegram_chat_id, text);
      }
    } else {
      // المُرسِل نفسه بدون حساب تيليجرام مرتبط — ما فيه وين يرجع الرد، رسالة عادية بلا تتبع.
      await sendTelegramMessage(r.telegram_chat_id, text);
    }
    sent++;
  }

  return { sent };
}
