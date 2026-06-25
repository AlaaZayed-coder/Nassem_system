"use server";
import { supabase } from "./supabase";

export async function getSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("erp_app_settings").select("*");
  if (error) return {};
  return Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
}

export async function updateSetting(key: string, value: string) {
  const { error } = await supabase
    .from("erp_app_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function getDashboardStats() {
  // Fetch all items in pages of 1000 (Supabase default limit)
  let allItems: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("erp_items")
      .select("pricing_status, main_category, main_category_id, is_frozen")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("getDashboardStats items error:", error);
      return { total: 0, byStatus: {}, categories: [], progress: 0 };
    }
    allItems = allItems.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  // Step 2: get all categories for name lookup
  const { data: cats } = await supabase
    .from("erp_categories")
    .select("id, name")
    .is("parent_id", null);

  const catNameById: Record<string, string> = {};
  (cats || []).forEach((c: any) => { catNameById[c.id] = c.name; });

  const rows = allItems;
  const total = rows.length;
  const frozen = rows.filter((r: any) => r.is_frozen === true).length;
  const byStatus: Record<string, number> = {};
  const catMap: Record<string, { total: number; approved: number }> = {};

  rows.forEach((r: any) => {
    const s = r.pricing_status || 'غير مسعّر';
    byStatus[s] = (byStatus[s] || 0) + 1;

    // Try text field first, then UUID lookup, then fallback
    const cat = r.main_category
      || (r.main_category_id ? catNameById[r.main_category_id] : null)
      || 'بدون تصنيف';

    if (!catMap[cat]) catMap[cat] = { total: 0, approved: 0 };
    catMap[cat].total++;
    if (s === 'معتمد') catMap[cat].approved++;
  });

  const approved = byStatus['معتمد'] || 0;
  const progress = total ? Math.round((approved / total) * 100) : 0;
  const categories = Object.entries(catMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  return { total, frozen, byStatus, categories, progress };
}
