import { supabase } from "./supabase";

export type OrderSubmission = {
  id: string;
  submitted_by_staff_id: string | null;
  submitted_by_name: string | null;
  source: "telegram" | "web";
  content_type: "image" | "voice" | "text";
  text_content: string | null;
  file_url: string | null;
  telegram_file_id: string | null;
  status: "قيد المراجعة" | "تمت المعالجة" | "مرفوضة";
  linked_sales_order_id: string | null;
  processor_notes: string | null;
  created_at: string;
  processed_at: string | null;
  erp_staff?: { name: string; role: string } | null;
};

export async function getOrderSubmissions(status?: string): Promise<OrderSubmission[]> {
  let query = supabase
    .from("erp_order_submissions")
    .select("*, erp_staff(name, role)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching order submissions:", error);
    return [];
  }
  return data || [];
}

export async function getStaffByTelegramChatId(chatId: string) {
  const { data, error } = await supabase
    .from("erp_staff")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createOrderSubmission(input: {
  submitted_by_staff_id?: string | null;
  submitted_by_name?: string | null;
  source: "telegram" | "web";
  content_type: "image" | "voice" | "text";
  text_content?: string | null;
  file_url?: string | null;
  telegram_file_id?: string | null;
}) {
  const { data, error } = await supabase
    .from("erp_order_submissions")
    .insert([{
      submitted_by_staff_id: input.submitted_by_staff_id || null,
      submitted_by_name: input.submitted_by_name || null,
      source: input.source,
      content_type: input.content_type,
      text_content: input.text_content || null,
      file_url: input.file_url || null,
      telegram_file_id: input.telegram_file_id || null,
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating order submission:", error);
    throw error;
  }
  return data;
}

export async function updateOrderSubmissionStatus(id: string, status: string, processor_notes?: string) {
  const { error } = await supabase
    .from("erp_order_submissions")
    .update({
      status,
      processor_notes: processor_notes || null,
      processed_at: status !== "قيد المراجعة" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw error;
}
