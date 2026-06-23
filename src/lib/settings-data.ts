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
  const { data, error } = await supabase
    .from("erp_items")
    .select("pricing_status, main_category, is_active");
  if (error) return { total: 0, byStatus: {}, categories: [], progress: 0 };

  const rows = (data || []).filter((r: any) => r.is_active !== false);
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  const catMap: Record<string, { total: number; approved: number }> = {};

  rows.forEach((r: any) => {
    const s = r.pricing_status || 'غير مسعّر';
    byStatus[s] = (byStatus[s] || 0) + 1;
    const cat = r.main_category || 'بدون تصنيف';
    if (!catMap[cat]) catMap[cat] = { total: 0, approved: 0 };
    catMap[cat].total++;
    if (s === 'معتمد') catMap[cat].approved++;
  });

  const approved = byStatus['معتمد'] || 0;
  const progress = total ? Math.round((approved / total) * 100) : 0;
  const categories = Object.entries(catMap).map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  return { total, byStatus, categories, progress };
}
