import { supabase } from "@/lib/supabase";
import { sendTelegramMessage, sendTelegramMessageWithReplyButton } from "@/lib/telegram";

export type BroadcastTarget = "all" | "managers" | "hr" | "specific";

// يرسل رسالة واحدة متتبَّعة (تُسجَّل بجدول erp_broadcast_messages مع زر
// "↩️ رد" + "🔙 القائمة الرئيسية") من موظف لآخر. مُستخدَمة لكل من التعميم
// الأول ولردود المتابعة (كل رد يُسجَّل كرسالة جديدة بنفس الآلية، فالمحادثة
// تبقى ثنائية الاتجاه ومحفوظة بالكامل في النظام حتى لو حُذفت من تيليجرام).
// فشل التسجيل لا يمنع الإرسال نفسه — الرسالة تُرسل دائماً ولو بلا زر رد.
export async function sendTrackedMessage(params: {
  senderStaffId: string;
  recipientStaffId: string;
  recipientChatId: string;
  text: string;
}): Promise<void> {
  const { senderStaffId, recipientStaffId, recipientChatId, text } = params;

  const { data: logRow } = await supabase
    .from("erp_broadcast_messages")
    .insert([{
      sender_staff_id: senderStaffId,
      recipient_staff_id: recipientStaffId,
      telegram_chat_id: recipientChatId,
      message_text: text,
    }])
    .select("id")
    .single();

  if (logRow) {
    const messageId = await sendTelegramMessageWithReplyButton(recipientChatId, text, `bmsg_reply:${logRow.id}`);
    if (messageId) {
      await supabase.from("erp_broadcast_messages").update({ telegram_message_id: messageId }).eq("id", logRow.id);
    }
  } else {
    // تعذّر تسجيل الرسالة (مثلاً الجدول غير محدث) — أرسلها بلا زر رد بدل ما تُفقد بالكامل.
    await sendTelegramMessage(recipientChatId, text);
  }
}

// يرسل رسالة تيليجرام لمجموعة موظفين (الكل/مدراء/موارد بشرية/مختارين)،
// مستخدَمة من صفحة إدارة الموظفين بالويب وأيضاً من داخل البوت مباشرة
// (لمدير النظام ومسؤول الموارد البشرية).
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
      await sendTrackedMessage({ senderStaffId, recipientStaffId: r.id, recipientChatId: r.telegram_chat_id, text });
    } else {
      // المُرسِل نفسه بدون حساب تيليجرام مرتبط — ما فيه وين يرجع الرد، رسالة عادية بلا تتبع.
      await sendTelegramMessage(r.telegram_chat_id, text);
    }
    sent++;
  }

  return { sent };
}

export type BroadcastMessageLogEntry = {
  id: string;
  message_text: string | null;
  created_at: string;
  sender: { name: string } | null;
  recipient: { name: string } | null;
};

// سجل كل الرسائل المُرسلة (تعميم/فردية/ردود) — تبقى محفوظة هنا حتى لو
// حُذفت من تيليجرام نفسه، تُعرض بتبويب "سجل الرسائل" بصفحة إدارة الموظفين.
export async function getBroadcastMessagesLog(page = 1, pageSize = 30): Promise<{ data: BroadcastMessageLogEntry[]; total: number; page: number; pageSize: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("erp_broadcast_messages")
    .select(
      "id, message_text, created_at, sender:erp_staff!erp_broadcast_messages_sender_staff_id_fkey(name), recipient:erp_staff!erp_broadcast_messages_recipient_staff_id_fkey(name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching broadcast messages log:", error);
    return { data: [], total: 0, page, pageSize };
  }

  return { data: (data as any) || [], total: count || 0, page, pageSize };
}
