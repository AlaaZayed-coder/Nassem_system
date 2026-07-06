"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { approveSalesOrderAndNotify } from "@/lib/order-notifications";
import { getSalesOrderDetail } from "@/lib/sales-data";
import { updateOrderSubmissionStatus } from "@/lib/order-submissions-data";

export async function createCustomerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;
  const company_name = formData.get("company_name") as string;
  const customer_type = formData.get("customer_type") as string || "فرد";
  const lead_source = formData.get("lead_source") as string || "direct";

  if (!name) throw new Error("اسم العميل مطلوب");

  const { data, error } = await supabase
    .from("erp_customers")
    .insert([{ 
      name, 
      phone: phone || null, 
      email: email || null, 
      address: address || null, 
      company_name: company_name || null, 
      customer_type,
      lead_source
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error("رقم الهاتف أو العميل مسجل مسبقاً");
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/sales");
  return data;
}

export async function createSalesOpportunityAction(formData: FormData) {
  const customer_id = formData.get("customer_id") as string;
  const total_amount_cents = parseInt(formData.get("total_amount_cents") as string) || 0;
  const expected_revenue_cents = parseInt(formData.get("expected_revenue_cents") as string) || 0;
  const win_probability_percent = parseInt(formData.get("win_probability_percent") as string) || 0;
  const status = formData.get("status") as string || "تسجيل الطلب";
  const notes = formData.get("notes") as string;
  const linesJson = formData.get("lines") as string;

  if (!customer_id) throw new Error("يجب اختيار العميل");

  const lines = JSON.parse(linesJson || "[]");
  if (lines.length === 0) throw new Error("يجب إضافة أصناف");

  // Create Order
  const { data: order, error: orderError } = await supabase
    .from("erp_sales_orders")
    .insert([{ 
      customer_id, 
      total_amount_cents,
      expected_revenue_cents,
      win_probability_percent,
      status,
      notes,
      is_final_price: !lines.some((l: any) => l.type === 'maintenance') // if there's maintenance, price is not final
    }])
    .select()
    .single();

  if (orderError) throw new Error(orderError.message);

  // Insert lines
  const linesToInsert = lines.map((l: any) => ({
    sales_order_id: order.id,
    item_code: l.type === 'product' || l.type === 'door' ? l.itemCode : null,
    quantity: l.quantity,
    unit_price_cents: l.unitPriceCents,
    total_price_cents: l.quantity * l.unitPriceCents,
    line_type: l.type,
    description: l.description || null,
    line_notes: l.lineNotes || null,
    door_specs: l.type === 'door' ? l.doorSpecs : null,
    slat_specs: l.type === 'slat' ? l.slatSpecs : null
  }));

  const { error: linesError } = await supabase.from("erp_sales_order_lines").insert(linesToInsert);
  if (linesError) throw new Error(linesError.message);

  revalidatePath("/dashboard/sales");
  return order;
}

export async function updateOpportunityStatusAction(orderId: string, newStatus: string) {
  // Fetch current order
  const { data: order } = await supabase
    .from("erp_sales_orders")
    .select("*, erp_customers(name)")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("الطلب غير موجود");

  if (newStatus === "معتمد" && order.status !== "معتمد") {
    // SMART FULFILLMENT AUTOMATION: routes every line (product / manufacturing /
    // maintenance) to the responsible department atomically in one DB transaction.
    await approveSalesOrderAndNotify(orderId);
  } else {
    const { error } = await supabase
      .from("erp_sales_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/sales");
}

// بعد إدخال معالج الطلبيات لطلبية واردة (من البوت أو الويب) في النظام الفعلي،
// نرسل تفاصيلها الكاملة إلى نفس الشخص الذي أرسلها أصلاً (عبر تيليجرام) مع زر
// "اعتماد الطلبية" — الاعتماد يتم من طرف المُرسِل نفسه بعد تأكده من صحة الإدخال.
export async function linkSubmissionAndNotifySubmitterAction(submissionId: string, orderId: string) {
  const { data: submission } = await supabase
    .from("erp_order_submissions")
    .select("*, erp_staff(telegram_chat_id, name)")
    .eq("id", submissionId)
    .single();

  await supabase
    .from("erp_order_submissions")
    .update({ linked_sales_order_id: orderId })
    .eq("id", submissionId);

  await updateOrderSubmissionStatus(submissionId, "تمت المعالجة");

  const chatId = submission?.erp_staff?.telegram_chat_id;
  if (!chatId) return; // لا يمكن إرسال تفاصيل إن لم يكن المُرسِل موظفاً مسجلاً بمعرف تيليجرام

  const { order, lines } = await getSalesOrderDetail(orderId);
  if (!order) return;

  const lineTypeLabel: Record<string, string> = {
    product: "صنف جاهز",
    manufacturing: "تصنيع مخصص",
    maintenance: "صيانة",
    door: "طلب باب رول",
    slat: "ريش / جبهة",
  };

  const linesText = lines
    .map((l: any, i: number) => `${i + 1}. ${lineTypeLabel[l.line_type] || l.line_type} — الكمية: ${l.quantity} — ₪${(l.total_price_cents / 100).toFixed(2)}`)
    .join("\n");

  const totalText = `₪${(order.total_amount_cents / 100).toFixed(2)}`;
  const orderRef = order.id.split("-")[0];

  const message =
    `تم إدخال طلبيتك في النظام. راجع التفاصيل قبل الاعتماد:\n\n` +
    `طلب #${orderRef}\n` +
    `العميل: ${order.erp_customers?.name || "غير محدد"}\n\n` +
    `الأصناف:\n${linesText}\n\n` +
    `الإجمالي: ${totalText}\n\n` +
    `اضغط "اعتماد الطلبية" أدناه إن كانت التفاصيل صحيحة.`;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      reply_markup: {
        inline_keyboard: [[{ text: "✅ اعتماد الطلبية", callback_data: `approve:${order.id}` }]],
      },
    }),
  });
}
