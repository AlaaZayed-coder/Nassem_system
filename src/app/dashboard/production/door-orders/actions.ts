"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { calculateDoorEngineering } from "@/lib/door-engineering";

type DoorOrderItemInput = {
  item_code: string;
  color?: string;
  length_mm?: number;
  height_mm?: number;
  profile_item_code?: string;
  has_cover?: boolean;
  cover_width_mm?: number;
  cover_height_mm?: number;
  has_box?: boolean;
  box_length_mm?: number;
  box_height_mm?: number;
  guides_sent?: boolean;
  item_notes?: string;
  is_industrial?: boolean;
  pipe_length_inch?: number;
};

export async function createDoorOrderAction(formData: FormData) {
  const customer_id = formData.get("customer_id") as string;
  const order_type = (formData.get("order_type") as string) || "توريد";
  const responsible_staff_id = (formData.get("responsible_staff_id") as string) || null;
  const customer_name_note = (formData.get("customer_name_note") as string) || null;
  const general_notes = (formData.get("general_notes") as string) || null;
  const itemsJson = formData.get("items") as string;

  if (!customer_id) throw new Error("يجب اختيار العميل");

  const items = JSON.parse(itemsJson || "[]") as DoorOrderItemInput[];
  if (items.length === 0) throw new Error("يجب إضافة صنف واحد على الأقل للطلبية");

  const { data: order, error: orderError } = await supabase
    .from("erp_door_orders")
    .insert([{ customer_id, order_type, responsible_staff_id, customer_name_note, general_notes }])
    .select()
    .single();

  if (orderError) throw new Error(orderError.message);

  const itemsToInsert = items.map((item) => ({
    door_order_id: order.id,
    item_code: item.item_code,
    color: item.color || null,
    length_mm: item.length_mm || null,
    height_mm: item.height_mm || null,
    profile_item_code: item.profile_item_code || null,
    has_cover: !!item.has_cover,
    cover_width_mm: item.has_cover ? item.cover_width_mm || null : null,
    cover_height_mm: item.has_cover ? item.cover_height_mm || null : null,
    has_box: !!item.has_box,
    box_length_mm: item.has_box ? item.box_length_mm || null : null,
    box_height_mm: item.has_box ? item.box_height_mm || null : null,
    guides_sent: !!item.guides_sent,
    item_notes: item.item_notes || null,
    is_industrial: !!item.is_industrial,
    pipe_length_inch: item.is_industrial ? item.pipe_length_inch || null : null,
  }));

  const { error: itemsError } = await supabase.from("erp_door_order_items").insert(itemsToInsert);
  if (itemsError) throw new Error(itemsError.message);

  revalidatePath("/dashboard/production/door-orders");
  return order;
}

export async function addDoorOrderElectronicsAction(formData: FormData) {
  const door_order_id = formData.get("door_order_id") as string;
  const item_code = (formData.get("item_code") as string) || null;
  const description = (formData.get("description") as string) || null;
  const quantity = Number(formData.get("quantity")) || 1;

  if (!door_order_id) throw new Error("طلبية غير محددة");
  if (!item_code && !description) throw new Error("يجب اختيار صنف أو كتابة وصف");

  const { error } = await supabase
    .from("erp_door_order_electronics")
    .insert([{ door_order_id, item_code, description, quantity }]);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/production/door-orders/${door_order_id}`);
}

export async function calculateDoorItemSpecsAction(itemId: string): Promise<{ error?: string }> {
  // ملاحظة: نُعيد { error } بدل throw لرسائل التحقق المتوقعة، لأن Next.js
  // يُخفي نص أي خطأ يُرمى داخل Server Action في بيئة الإنتاج (production build)
  // ويستبدله برسالة عامة — حتى لو كانت الرسالة الأصلية موجّهة للمستخدم عمداً.
  const { data: item, error: itemError } = await supabase
    .from("erp_door_order_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (itemError || !item) return { error: "الصنف غير موجود" };
  if (!item.length_mm || !item.height_mm) return { error: "يجب إدخال الطول والارتفاع قبل الاحتساب" };

  const { data: catalogItem, error: catalogError } = await supabase
    .from("erp_items")
    .select("weight_per_m2_kg")
    .eq("item_code", item.item_code)
    .single();

  if (catalogError || !catalogItem?.weight_per_m2_kg) {
    return { error: "لم يُحدَّد وزن هذا الصنف (كغم/م²) في كتالوج الأصناف بعد" };
  }

  const result = calculateDoorEngineering({
    length_mm: item.length_mm,
    height_mm: item.height_mm,
    weightPerM2Kg: catalogItem.weight_per_m2_kg,
    isIndustrial: !!item.is_industrial,
  });

  if (!result) return { error: "تعذّر الاحتساب بالبيانات المتوفرة" };

  const { error: updateError } = await supabase
    .from("erp_door_order_items")
    .update({
      base_weight_kg: result.baseWeightKg,
      final_weight_kg: result.finalWeightKg,
      frame_type: result.frameType,
      jamb_type: result.jambType,
      spring_type: result.spring?.type || null,
      spring_count: result.spring?.count || null,
      spring_match_diff_kg: result.spring?.diffKg ?? null,
      calculated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/dashboard/production/door-orders/${item.door_order_id}`);
  return {};
}

// تقرير ميداني مرتبط مباشرة بطلبية الباب (وليس بقسم الصيانة المنفصل)، حسب
// دليل التشغيل: يُدخَل بعد التركيب في الموقع، وينقل حالة الطلبية إلى "جاهزة".
export async function saveDoorOrderFieldReportAction(formData: FormData): Promise<{ error?: string }> {
  const orderId = formData.get("order_id") as string;
  const field_report_number = (formData.get("field_report_number") as string) || null;
  const field_start_time = (formData.get("field_start_time") as string) || null;
  const field_end_time = (formData.get("field_end_time") as string) || null;
  const field_technician_name = (formData.get("field_technician_name") as string) || null;
  const installation_type = (formData.get("installation_type") as string) || null;

  if (!orderId) return { error: "طلبية غير محددة" };

  const { error } = await supabase
    .from("erp_door_orders")
    .update({
      field_report_number,
      field_start_time,
      field_end_time,
      field_technician_name,
      installation_type,
      status: "جاهزة",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/production/door-orders");
  revalidatePath(`/dashboard/production/door-orders/${orderId}`);
  return {};
}

export async function updateDoorOrderStatusAction(orderId: string, newStatus: string) {
  const { error } = await supabase
    .from("erp_door_orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/production/door-orders");
  revalidatePath(`/dashboard/production/door-orders/${orderId}`);
}
