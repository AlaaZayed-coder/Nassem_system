"use server";

import { supabase } from "@/lib/supabase";

export async function fetchLegacyCategories() {
  const { data, error } = await supabase
    .from("erp_categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data || [];
}

export async function fetchLegacyDashboardStats() {
  // Paginate all items to bypass Supabase 1000-row limit
  const stats: Record<string, { category: string; total: number; approved: number; unpriced: number }> = {};
  let from = 0;
  const ps = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("erp_items")
      .select("main_category, pricing_status")
      .range(from, from + ps - 1);
    if (error) { console.error("Error fetching stats:", error); break; }
    (data || []).forEach(item => {
      const cat = item.main_category || "بدون تصنيف";
      if (!stats[cat]) stats[cat] = { category: cat, total: 0, approved: 0, unpriced: 0 };
      stats[cat].total++;
      if (item.pricing_status === "معتمد")    stats[cat].approved++;
      if (item.pricing_status === "غير مسعّر") stats[cat].unpriced++;
    });
    if (!data || data.length < ps) break;
    from += ps;
  }
  return { categories: Object.values(stats) };
}

export async function deleteLegacyCategory(id: string) {
  // Check if any items still use this category
  const { data: cat } = await supabase.from("erp_categories").select("name").eq("id", id).single();
  if (cat?.name) {
    const { count } = await supabase.from("erp_items")
      .select("*", { count: "exact", head: true })
      .eq("main_category", cat.name);
    if (count && count > 0) throw new Error(`يوجد ${count} صنف مرتبط بهذا التصنيف. أعد تصنيف الأصناف أولاً.`);
  }
  const { error } = await supabase.from("erp_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export async function deleteLegacyItem(item_code: string) {
  // Delete inventory records first
  await supabase.from("erp_inventory").delete().eq("item_code", item_code);
  const { error } = await supabase.from("erp_items").delete().eq("item_code", item_code);
  if (error) throw new Error(error.message);
  return true;
}

export async function fetchLegacyItems(filters: any) {
  let query = supabase.from("erp_items").select("*", { count: "exact" });

  if (filters.search) {
    query = query.or(`item_code.ilike.%${filters.search}%,original_name.ilike.%${filters.search}%,approved_name.ilike.%${filters.search}%`);
  }
  if (filters.pricing_status) {
    query = query.eq("pricing_status", filters.pricing_status);
  }
  if (filters.main_category) {
    query = query.eq("main_category", filters.main_category);
  }
  if (filters.no_category === "1") {
    query = query.or("main_category.is.null,main_category.eq.");
  }
  if (filters.door_pricing_enabled === "1") {
    query = query.eq("door_pricing_enabled", true);
  }
  if (filters.show_frozen) {
    query = query.eq("is_frozen", true);
  } else {
    query = query.or("is_frozen.is.null,is_frozen.eq.false");
  }

  // Pagination
  const page = filters.page ? parseInt(filters.page) : 1;
  const pageSize = filters.pageSize ? parseInt(filters.pageSize) : 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.range(from, to).order("created_at", { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching items:", error);
    return { rows: [], total: 0, page, pageSize };
  }

  return { rows: data || [], total: count || 0, page, pageSize };
}

export async function updateLegacyCategory(id: string, updates: any) {
  const { error } = await supabase
    .from("erp_categories")
    .update(updates)
    .eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export async function addLegacyCategory(category: any) {
  const { error } = await supabase
    .from("erp_categories")
    .insert([
      {
        name: category.name,
        type: category.type || 'main',
        is_active: true
      }
    ]);
  if (error) throw new Error(error.message);
  return true;
}

export async function renameLegacyCategory(id: string, newName: string) {
  const oldData = await supabase.from("erp_categories").select("name").eq("id", id).single();
  const oldName = oldData.data?.name;
  const { error } = await supabase.from("erp_categories").update({ name: newName }).eq("id", id);
  if (error) throw new Error(error.message);
  // Update all items that had the old category name
  if (oldName && oldName !== newName) {
    await supabase.from("erp_items").update({ main_category: newName }).eq("main_category", oldName);
  }
  return true;
}

export async function addLegacyItem(item: {
  item_code: string;
  original_name: string;
  name_suffix?: string;
  unit_of_measure: string;
  main_category: string;
}) {
  const { error } = await supabase.from("erp_items").insert([{
    item_code: item.item_code,
    original_name: item.original_name,
    name_suffix: item.name_suffix || null,
    unit_of_measure: item.unit_of_measure,
    main_category: item.main_category,
    pricing_status: "غير مسعّر",
    is_active: true,
  }]);
  if (error) throw new Error(error.message);
  return true;
}

export async function bulkUpdateLegacyItems(codes: string[], patch: any) {
  if (!codes || codes.length === 0) return;
  const { error } = await supabase
    .from("erp_items")
    .update(patch)
    .in("item_code", codes);
  
  if (error) throw new Error(error.message);
  return true;
}
