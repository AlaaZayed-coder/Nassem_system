"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

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

  if (!customer_id) throw new Error("يجب اختيار العميل");

  const { data, error } = await supabase
    .from("erp_sales_orders")
    .insert([{ 
      customer_id, 
      total_amount_cents,
      expected_revenue_cents,
      win_probability_percent,
      status,
      notes
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/sales");
  return data;
}

export async function updateOpportunityStatusAction(orderId: string, newStatus: string) {
  // Fetch current order to see if we need to trigger automation
  const { data: order } = await supabase
    .from("erp_sales_orders")
    .select("*, erp_customers(name)")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("الطلب غير موجود");

  const { error } = await supabase
    .from("erp_sales_orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) throw new Error(error.message);

  // AUTOMATION: If status changed to 'معتمد' (Approved)
  if (newStatus === "معتمد" && order.status !== "معتمد") {
    // 1. Create a dummy production order to kick off factory process
    await supabase.from("erp_production_orders").insert([{
      sales_order_id: order.id,
      item_code: "NS-101", // Default/Dummy item for now
      quantity: 1,
      status: "مخطط",
      priority: "عالي",
      notes: "تم الإنشاء آلياً من قسم المبيعات"
    }]);

    // 2. Notify Production Staff via Telegram
    const { data: prodStaff } = await supabase
      .from("erp_staff")
      .select("telegram_chat_id")
      .eq("role", "production")
      .eq("is_active", true)
      .not("telegram_chat_id", "is", null);

    if (prodStaff && prodStaff.length > 0) {
      const message = `🔔 طلب إنتاج جديد!\n\nتم اعتماد طلب المبيعات رقم: #${order.id.split("-")[0]}\nللعميل: ${order.erp_customers?.name || "غير محدد"}\nالرجاء متابعة لوحة الإنتاج (Mini App).`;
      
      for (const staff of prodStaff) {
        if (staff.telegram_chat_id) {
          await sendTelegramMessage(staff.telegram_chat_id, message);
        }
      }
    }
  }

  revalidatePath("/dashboard/sales");
}

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN is not set. Cannot send message.");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        reply_markup: {
          inline_keyboard: [[
            { text: "فتح تطبيق المصنع", web_app: { url: "https://nassem-system.vercel.app/telegram-app" } }
          ]]
        }
      })
    });
    if (!res.ok) {
      console.error("Failed to send telegram message", await res.text());
    }
  } catch (err) {
    console.error("Error calling Telegram API", err);
  }
}
