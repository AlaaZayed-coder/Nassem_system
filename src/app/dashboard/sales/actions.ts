"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { sendTelegramMessage } from "@/lib/telegram";

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
    const { data: result, error: rpcError } = await supabase
      .rpc("approve_sales_order", { p_order_id: orderId })
      .single();

    if (rpcError) throw new Error(rpcError.message);

    await notifyDepartments(order, result as { needs_production: boolean; needs_maintenance: boolean; needs_purchasing: boolean });
  } else {
    const { error } = await supabase
      .from("erp_sales_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/sales");
}

async function notifyDepartments(
  order: { id: string; erp_customers?: { name?: string } | null },
  routing: { needs_production: boolean; needs_maintenance: boolean; needs_purchasing: boolean }
) {
  const customerName = order.erp_customers?.name || "غير محدد";
  const orderRef = order.id.split("-")[0];

  const departments: { role: string; condition: boolean; message: string }[] = [
    {
      role: "production",
      condition: routing.needs_production,
      message: `🔔 أوامر تصنيع جديدة!\n\nتم اعتماد طلب المبيعات رقم: #${orderRef}\nللعميل: ${customerName}\nتتضمن أصناف تحتاج للتصنيع.\nالرجاء متابعة لوحة الإنتاج.`,
    },
    {
      role: "maintenance",
      condition: routing.needs_maintenance,
      message: `🔔 تذكرة صيانة جديدة!\n\nتم اعتماد طلب المبيعات رقم: #${orderRef}\nللعميل: ${customerName}\nيتضمن طلب صيانة.\nالرجاء متابعة قائمة تذاكر الصيانة.`,
    },
    {
      role: "purchasing",
      condition: routing.needs_purchasing,
      message: `🔔 طلب شراء جديد!\n\nتم اعتماد طلب المبيعات رقم: #${orderRef}\nللعميل: ${customerName}\nيتضمن نواقص تحتاج للشراء.\nالرجاء متابعة قائمة طلبات الشراء.`,
    },
  ];

  for (const dept of departments) {
    if (!dept.condition) continue;

    const { data: staff } = await supabase
      .from("erp_staff")
      .select("telegram_chat_id")
      .eq("role", dept.role)
      .eq("is_active", true)
      .not("telegram_chat_id", "is", null);

    if (staff) {
      for (const member of staff) {
        if (member.telegram_chat_id) {
          await sendTelegramMessage(member.telegram_chat_id, dept.message, true);
        }
      }
    }
  }
}
