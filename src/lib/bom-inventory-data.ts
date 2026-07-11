import { supabase } from "./supabase";

// نفس المفاتيح "المؤكَّدة وذات كمية رقمية" في door-bom-calculator.ts فقط
// (pipe/track مستبعدان لأن وحدتهما مم وليست عدد قطع قابل للصرف المباشر).
export const BOM_DEDUCTIBLE_KEYS: { key: string; label: string }[] = [
  { key: "najar_bolt", label: "برغي نجل" },
  { key: "frame", label: "الطاسة" },
  { key: "frame_span", label: "شبر طاسة" },
  { key: "screw", label: "برغي سكريت" },
  { key: "jamb", label: "الخد" },
  { key: "chair", label: "الكرسي" },
  { key: "chair_bolt", label: "برغي كرسي" },
  { key: "bracket", label: "العلاقة" },
  { key: "stopper", label: "ستوبات" },
  { key: "handle", label: "يد باب" },
];

export async function getBomItemMappings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("erp_bom_item_mappings").select("bom_key, item_code");
  if (error) return {};
  return Object.fromEntries((data || []).map((r: any) => [r.bom_key, r.item_code]));
}

export async function saveBomItemMapping(bomKey: string, itemCode: string) {
  const { error } = await supabase.from("erp_bom_item_mappings").upsert({ bom_key: bomKey, item_code: itemCode }, { onConflict: "bom_key" });
  if (error) throw new Error(error.message);
}

export type BomIssue = {
  id: string;
  door_order_item_id: string;
  bom_key: string;
  item_code: string;
  quantity: number;
  issued_at: string;
};

export async function getBomIssuesForItem(doorOrderItemId: string): Promise<BomIssue[]> {
  const { data, error } = await supabase
    .from("erp_bom_issues")
    .select("*")
    .eq("door_order_item_id", doorOrderItemId);
  if (error) return [];
  return data || [];
}

// يعيد مجموعة معرّفات أصناف الأبواب التي صُرفت موادها مسبقاً — لعرض
// حالة "تم الصرف" بدل الزر مرة واحدة لكل صنف، بلا استعلام منفصل لكل صنف.
export async function getIssuedDoorOrderItemIds(doorOrderItemIds: string[]): Promise<Set<string>> {
  if (doorOrderItemIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("erp_bom_issues")
    .select("door_order_item_id")
    .in("door_order_item_id", doorOrderItemIds);
  if (error) return new Set();
  return new Set((data || []).map((r: any) => r.door_order_item_id));
}
