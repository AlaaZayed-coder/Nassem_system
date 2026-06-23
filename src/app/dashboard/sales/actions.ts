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
    item_code: l.type === 'product' ? l.itemCode : null,
    quantity: l.quantity,
    unit_price_cents: l.unitPriceCents,
    total_price_cents: l.quantity * l.unitPriceCents,
    line_type: l.type,
    description: l.description || null,
    line_notes: l.lineNotes || null
  }));

  for (const l of linesToInsert) {
    await supabase.from("erp_sales_order_lines").insert([l]);
  }

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

  const { error } = await supabase
    .from("erp_sales_orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) throw new Error(error.message);

  // SMART FULFILLMENT AUTOMATION: If status changed to 'معتمد' (Approved)
  if (newStatus === "معتمد" && order.status !== "معتمد") {
    
    // Fetch all lines
    const { data: lines } = await supabase.from("erp_sales_order_lines").select("*").eq("sales_order_id", orderId);
    
    if (lines && lines.length > 0) {
      let createdProduction = false;

      for (const line of lines) {
        if (line.line_type === 'maintenance') {
          // Create Maintenance Ticket (just a log for now)
          await supabase.from("erp_maintenance_logs").insert([{
            machine_id: null, // General maintenance
            maintenance_date: new Date().toISOString(),
            description: `تذكرة صيانة للعميل ${order.erp_customers?.name} بناءً على الطلب #${orderId.slice(0,8)}`,
            cost_cents: line.total_price_cents,
            performed_by: "فريق الصيانة"
          }]);
          continue;
        }

        if (line.line_type === 'manufacturing') {
          // Direct to Production - No inventory check
          await supabase.from("erp_production_orders").insert([{
            sales_order_id: order.id,
            item_code: null, // Custom item
            quantity: line.quantity,
            status: "مخطط",
            priority: "عالي",
            notes: `تصنيع مخصص: ${line.description || 'بدون وصف'}` // we'll use description column from line if we had one, wait, line doesn't have description in db.
            // Oh, wait! I didn't add description to erp_sales_order_lines.
            // We need a place for this. Let's just put it in notes.
          }]);
          await supabase.from("erp_sales_order_lines").update({ fulfillment_status: 'manufacturing' }).eq("id", line.id);
          createdProduction = true;
          continue;
        }

        if (line.line_type === 'product' && line.item_code) {
          // Fetch Item Details to know its source
          const { data: itemData } = await supabase.from("erp_items").select("item_source").eq("item_code", line.item_code).single();
          const isPurchased = itemData?.item_source === 'purchased';

          // Check Inventory First
          const { data: invData } = await supabase
            .from("erp_inventory")
            .select("warehouse_id, quantity")
            .eq("item_code", line.item_code);
            
          let availableQty = 0;
          let primaryWarehouse = null;
          
          if (invData && invData.length > 0) {
            availableQty = invData.reduce((sum, w) => sum + Number(w.quantity), 0);
            primaryWarehouse = invData[0].warehouse_id;
          }

          const requiredQty = line.quantity;

          if (availableQty >= requiredQty) {
            // We have enough in stock! Just deduct it.
            if (primaryWarehouse) {
              const newQty = availableQty - requiredQty; // simplified deduction from first warehouse
              await supabase.from("erp_inventory").update({ quantity: newQty }).eq("item_code", line.item_code).eq("warehouse_id", primaryWarehouse);
              await supabase.from("erp_sales_order_lines").update({ fulfillment_status: 'completed' }).eq("id", line.id);
            }
          } else {
            // Deduct whatever we have
            let missingQty = requiredQty;
            if (availableQty > 0 && primaryWarehouse) {
              await supabase.from("erp_inventory").update({ quantity: 0 }).eq("item_code", line.item_code).eq("warehouse_id", primaryWarehouse);
              missingQty = requiredQty - availableQty;
            }

            if (isPurchased) {
              // Create Purchase Request for the missing quantity
              await supabase.from("erp_purchase_requests").insert([{
                sales_order_id: order.id,
                item_code: line.item_code,
                quantity: missingQty,
                status: "قيد الانتظار",
                priority: "عالي",
                notes: `مطلوب استيفاء لطلب المبيعات (متوفر في المخزن: ${availableQty})`
              }]);
              await supabase.from("erp_sales_order_lines").update({ fulfillment_status: 'purchasing' }).eq("id", line.id);
            } else {
              // Create Production Order for the missing quantity
              await supabase.from("erp_production_orders").insert([{
                sales_order_id: order.id,
                item_code: line.item_code,
                quantity: missingQty,
                status: "مخطط",
                priority: "عالي",
                notes: `تم الإنشاء آلياً لاستيفاء نقص المخزون. (متوفر: ${availableQty})`
              }]);
              await supabase.from("erp_sales_order_lines").update({ fulfillment_status: 'manufacturing' }).eq("id", line.id);
              createdProduction = true;
            }
          }
        }
      }

      // Notify Production Staff if any production order was created
      if (createdProduction) {
        const { data: prodStaff } = await supabase
          .from("erp_staff")
          .select("telegram_chat_id")
          .eq("role", "production")
          .eq("is_active", true)
          .not("telegram_chat_id", "is", null);

        if (prodStaff && prodStaff.length > 0) {
          const message = `🔔 أوامر تصنيع جديدة!\n\nتم اعتماد طلب المبيعات رقم: #${order.id.split("-")[0]}\nللعميل: ${order.erp_customers?.name || "غير محدد"}\nتتضمن نواقص تحتاج للتصنيع.\nالرجاء متابعة لوحة الإنتاج (Mini App).`;
          for (const staff of prodStaff) {
            if (staff.telegram_chat_id) {
              await sendTelegramMessage(staff.telegram_chat_id, message);
            }
          }
        }
      }
    }
  }

  revalidatePath("/dashboard/sales");
}

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
  } catch (err) {}
}
