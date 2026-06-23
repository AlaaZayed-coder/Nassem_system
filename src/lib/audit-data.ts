"use server";
import { supabase } from "./supabase";

export async function getAuditLog(filters: {
  item_code?: string; user?: string; action?: string;
  from?: string; to?: string; limit?: number;
}) {
  let q = supabase.from("erp_audit_log").select("*").order("ts", { ascending: false });
  if (filters.item_code) q = q.ilike("item_code", `%${filters.item_code}%`);
  if (filters.user) q = q.ilike("user", `%${filters.user}%`);
  if (filters.action) q = q.ilike("action", `%${filters.action}%`);
  if (filters.from) q = q.gte("ts", filters.from);
  if (filters.to) q = q.lte("ts", filters.to);
  q = q.limit(filters.limit || 200);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function addAuditEntry(entry: {
  user: string; action: string; item_code?: string;
  field?: string; old_value?: string; new_value?: string; note?: string;
}) {
  const { error } = await supabase.from("erp_audit_log").insert([entry]);
  if (error) console.error("Audit log error:", error);
}

export async function getPriceHistory(item_code: string) {
  const { data, error } = await supabase
    .from("erp_price_history")
    .select("*")
    .eq("item_code", item_code)
    .order("changed_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return data || [];
}

export async function addPriceHistory(entry: {
  item_code: string; old_price_cents: number | null;
  new_price_cents: number | null; changed_by: string; reason?: string;
}) {
  await supabase.from("erp_price_history").insert([entry]);
}
