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
  guides_only?: boolean;
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

  const hasPendingGuides = items.some((item) => item.guides_only);
  const { data: order, error: orderError } = await supabase
    .from("erp_door_orders")
    .insert([{ customer_id, order_type, responsible_staff_id, customer_name_note, general_notes, status: hasPendingGuides ? "معلقة" : undefined }])
    .select()
    .single();

  if (orderError) throw new Error(orderError.message);

  const itemsToInsert = items.map((item) => ({
    door_order_id: order.id,
    item_code: item.item_code,
    color: item.guides_only ? null : item.color || null,
    length_mm: item.guides_only ? null : item.length_mm || null,
    height_mm: item.guides_only ? null : item.height_mm || null,
    guides_height_mm: item.guides_only ? item.height_mm || null : null,
    profile_item_code: item.guides_only ? null : item.profile_item_code || null,
    has_cover: item.guides_only ? false : !!item.has_cover,
    cover_width_mm: !item.guides_only && item.has_cover ? item.cover_width_mm || null : null,
    cover_height_mm: !item.guides_only && item.has_cover ? item.cover_height_mm || null : null,
    has_box: item.guides_only ? false : !!item.has_box,
    box_length_mm: !item.guides_only && item.has_box ? item.box_length_mm || null : null,
    box_height_mm: !item.guides_only && item.has_box ? item.box_height_mm || null : null,
    guides_sent: !!item.guides_sent,
    item_notes: item.item_notes || null,
    is_industrial: item.guides_only ? false : !!item.is_industrial,
    pipe_length_inch: !item.guides_only && item.is_industrial ? item.pipe_length_inch || null : null,
    item_status: item.guides_only ? "قيد الاستكمال" : "مكتمل",
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

// استكمال بيانات صنف "مجرى فقط" — يُحدَّث نفس السطر (لا يُنشأ سطر جديد)،
// ثم يتحول item_status إلى "مكتمل" ليظهر زر الاحتساب الهندسي.
export async function completeDoorOrderItemAction(formData: FormData): Promise<{ error?: string }> {
  const itemId = formData.get("item_id") as string;
  const doorOrderId = formData.get("door_order_id") as string;
  const color = (formData.get("color") as string) || null;
  const length_mm = formData.get("length_mm") ? Number(formData.get("length_mm")) : null;
  const height_mm = formData.get("height_mm") ? Number(formData.get("height_mm")) : null;
  const profile_item_code = (formData.get("profile_item_code") as string) || null;
  const has_cover = formData.get("has_cover") === "on";
  const cover_width_mm = has_cover && formData.get("cover_width_mm") ? Number(formData.get("cover_width_mm")) : null;
  const cover_height_mm = has_cover && formData.get("cover_height_mm") ? Number(formData.get("cover_height_mm")) : null;
  const has_box = formData.get("has_box") === "on";
  const box_length_mm = has_box && formData.get("box_length_mm") ? Number(formData.get("box_length_mm")) : null;
  const box_height_mm = has_box && formData.get("box_height_mm") ? Number(formData.get("box_height_mm")) : null;
  const is_industrial = formData.get("is_industrial") === "on";
  const pipe_length_inch = is_industrial && formData.get("pipe_length_inch") ? Number(formData.get("pipe_length_inch")) : null;
  const item_notes = (formData.get("item_notes") as string) || null;

  if (!itemId) return { error: "الصنف غير محدد" };
  if (!length_mm) return { error: "يجب إدخال الطول لاستكمال الباب" };
  if (!height_mm) return { error: "يجب إدخال ارتفاع الباب الفعلي (قد يختلف عن ارتفاع المجرى المُدخل مسبقاً)" };

  const { error } = await supabase
    .from("erp_door_order_items")
    .update({
      color, length_mm, height_mm, profile_item_code,
      has_cover, cover_width_mm, cover_height_mm,
      has_box, box_length_mm, box_height_mm,
      is_industrial, pipe_length_inch,
      item_notes,
      item_status: "مكتمل",
      completed_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) return { error: error.message };

  if (doorOrderId) {
    await supabase.from("erp_door_orders").update({ status: "قيد الانتظار", updated_at: new Date().toISOString() }).eq("id", doorOrderId).eq("status", "معلقة");
  }

  revalidatePath(`/dashboard/production/door-orders/${doorOrderId}`);
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
