"use server";

import { revalidatePath } from "next/cache";
import { updateProductionOrderStatus } from "@/lib/production-data";

export async function updateOrderStatusAction(orderId: string, newStatus: string) {
  try {
    await updateProductionOrderStatus(orderId, newStatus);
    revalidatePath("/dashboard/production/orders");
    return { success: true };
  } catch (error) {
    console.error("Failed to update order status:", error);
    return { success: false, error: "فشل تحديث حالة الطلب" };
  }
}

import { supabase } from "@/lib/supabase";

export async function createProductionOrderAction(formData: FormData) {
  const item_code = formData.get("item_code") as string;
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  const priority = formData.get("priority") as string || "عادي";
  const notes = formData.get("notes") as string;

  if (!item_code) throw new Error("يجب اختيار المنتج");

  const { data, error } = await supabase
    .from("erp_production_orders")
    .insert([{
      item_code,
      quantity,
      status: "مخطط",
      priority,
      notes
    }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Also notify Telegram staff
  try {
    const { data: prodStaff } = await supabase
      .from("erp_staff")
      .select("telegram_chat_id")
      .eq("role", "production")
      .eq("is_active", true)
      .not("telegram_chat_id", "is", null);

    if (prodStaff && prodStaff.length > 0) {
      const message = `🔔 أمر إنتاج داخلي جديد!\n\nرقم: #${data.id.split("-")[0]}\nالصنف: ${item_code}\nالكمية: ${quantity}\nالأولوية: ${priority}\nالرجاء متابعة لوحة الإنتاج (Mini App).`;
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        for (const staff of prodStaff) {
          if (staff.telegram_chat_id) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: staff.telegram_chat_id,
                text: message,
                reply_markup: {
                  inline_keyboard: [[
                    { text: "فتح تطبيق المصنع", web_app: { url: "https://nassem-system.vercel.app/telegram-app" } }
                  ]]
                }
              })
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error sending telegram notification", err);
  }

  revalidatePath("/dashboard/production/orders");
  return data;
}
