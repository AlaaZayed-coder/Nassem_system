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
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  matched_customer_id: string | null;
  created_at: string;
  processed_at: string | null;
  erp_staff?: { name: string; role: string } | null;
  erp_customers?: { name: string; phone: string | null } | null;
  erp_order_submission_attachments?: OrderSubmissionAttachment[];
};

export type OrderSubmissionAttachment = {
  id: string;
  submission_id: string;
  content_type: "image" | "voice" | "text";
  text_content: string | null;
  file_url: string | null;
  added_by_name: string | null;
  created_at: string;
};

// يحاول مطابقة رقم هاتف مع عميل موجود مسبقاً لربط الطلبية بسجله التاريخي
export async function findCustomerByPhone(phone: string) {
  if (!phone) return null;
  const { data } = await supabase
    .from("erp_customers")
    .select("id, name, phone")
    .eq("phone", phone)
    .maybeSingle();
  return data;
}

// بحث سهل عن عميل بالاسم أو رقم الهاتف أو مقطع منه، لتصحيح/تعديل ربط الطلبية
export async function searchCustomers(query: string) {
  if (!query || query.trim().length < 2) return [];
  const { data, error } = await supabase
    .from("erp_customers")
    .select("id, name, phone, company_name")
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error("Error searching customers:", error);
    return [];
  }
  return data || [];
}

export async function updateSubmissionCustomer(
  submissionId: string,
  input: { customer_name: string; customer_phone: string | null; matched_customer_id: string | null; customer_address?: string | null }
) {
  const { error } = await supabase
    .from("erp_order_submissions")
    .update({
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      matched_customer_id: input.matched_customer_id,
      ...(input.customer_address !== undefined ? { customer_address: input.customer_address } : {}),
    })
    .eq("id", submissionId);

  if (error) throw error;
}

export async function addSubmissionAttachment(input: {
  submission_id: string;
  content_type: "image" | "voice" | "text";
  text_content?: string | null;
  file_url?: string | null;
  added_by_name?: string | null;
}) {
  const { error } = await supabase.from("erp_order_submission_attachments").insert([{
    submission_id: input.submission_id,
    content_type: input.content_type,
    text_content: input.text_content || null,
    file_url: input.file_url || null,
    added_by_name: input.added_by_name || null,
  }]);

  if (error) throw error;
}

export async function getOrderSubmissions(status?: string): Promise<OrderSubmission[]> {
  let query = supabase
    .from("erp_order_submissions")
    .select("*, erp_staff(name, role), erp_customers(name, phone), erp_order_submission_attachments(*)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching order submissions:", error);
    return [];
  }
  return data || [];
}

export async function getOrderSubmissionById(id: string): Promise<OrderSubmission | null> {
  const { data, error } = await supabase
    .from("erp_order_submissions")
    .select("*, erp_staff(name, role), erp_customers(name, phone), erp_order_submission_attachments(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching order submission:", error);
    return null;
  }
  return data;
}

// يعيد أقدم طلبية بانتظار المعالجة غير الحالية، لتمكين طابور معالجة متسلسل
// (بعد اعتماد/رفض طلبية، ننتقل مباشرة للتالية بدل العودة لقائمة الصندوق الوارد).
export async function getNextPendingSubmissionId(excludeId?: string): Promise<string | null> {
  let query = supabase
    .from("erp_order_submissions")
    .select("id")
    .eq("status", "قيد المراجعة")
    .order("created_at", { ascending: true })
    .limit(2);

  const { data, error } = await query;
  if (error || !data) return null;

  const next = data.find((s) => s.id !== excludeId);
  return next?.id || null;
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
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  matched_customer_id?: string | null;
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
      customer_name: input.customer_name || null,
      customer_phone: input.customer_phone || null,
      customer_address: input.customer_address || null,
      matched_customer_id: input.matched_customer_id || null,
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating order submission:", error);
    throw error;
  }
  return data;
}

// محادثة تيليجرام من خطوتين: أولاً هوية العميل، ثم محتوى الطلبية نفسها
export async function getPendingTelegramSubmission(chatId: string) {
  const { data } = await supabase
    .from("erp_telegram_pending_submissions")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();
  return data;
}

export async function startPendingTelegramSubmission(chatId: string) {
  await supabase.from("erp_telegram_pending_submissions").upsert([{
    chat_id: chatId, customer_name: null, customer_phone: null, stage: "awaiting_customer_choice",
  }]);
}

export async function setPendingTelegramStage(chatId: string, stage: string) {
  await supabase.from("erp_telegram_pending_submissions").update({ stage }).eq("chat_id", chatId);
}

export async function setPendingTelegramCustomer(
  chatId: string,
  customerName: string,
  customerPhone: string | null,
  matchedCustomerId: string | null = null
) {
  await supabase
    .from("erp_telegram_pending_submissions")
    .update({ customer_name: customerName, customer_phone: customerPhone, matched_customer_id: matchedCustomerId, stage: "awaiting_content" })
    .eq("chat_id", chatId);
}

// فورم واضح لإدخال عميل جديد على ثلاث خطوات منفصلة: الاسم ثم الهاتف ثم العنوان
export async function setPendingNewCustomerName(chatId: string, name: string) {
  await supabase
    .from("erp_telegram_pending_submissions")
    .update({ customer_name: name, stage: "awaiting_new_phone" })
    .eq("chat_id", chatId);
}

export async function setPendingNewCustomerPhone(chatId: string, phone: string | null) {
  await supabase
    .from("erp_telegram_pending_submissions")
    .update({ customer_phone: phone, stage: "awaiting_new_address" })
    .eq("chat_id", chatId);
}

export async function setPendingNewCustomerAddress(chatId: string, address: string | null) {
  await supabase
    .from("erp_telegram_pending_submissions")
    .update({ customer_address: address, stage: "awaiting_content" })
    .eq("chat_id", chatId);
}

export async function clearPendingTelegramSubmission(chatId: string) {
  await supabase.from("erp_telegram_pending_submissions").delete().eq("chat_id", chatId);
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
