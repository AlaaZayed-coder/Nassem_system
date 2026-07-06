import { supabase } from "./supabase";
import { sendTelegramMessage } from "./telegram";

export async function notifyDepartments(
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

export async function approveSalesOrderAndNotify(orderId: string) {
  const { data: order } = await supabase
    .from("erp_sales_orders")
    .select("*, erp_customers(name)")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("الطلب غير موجود");

  const { data: result, error: rpcError } = await supabase
    .rpc("approve_sales_order", { p_order_id: orderId })
    .single();

  if (rpcError) throw new Error(rpcError.message);

  await notifyDepartments(order, result as { needs_production: boolean; needs_maintenance: boolean; needs_purchasing: boolean });
  return order;
}
