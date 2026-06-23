"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function updateProductionOrderStatus(orderId: string, newStatus: string) {
  const { error } = await supabase
    .from("erp_production_orders")
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/telegram-app");
  revalidatePath("/dashboard/production");
}

export async function getTelegramDashboardDataAction(telegramChatId: string) {
  if (!telegramChatId) return { error: "معرف تليجرام غير متاح" };

  // 1. Identify staff member
  const { data: staff, error: staffError } = await supabase
    .from("erp_staff")
    .select("*")
    .eq("telegram_chat_id", telegramChatId)
    .single();

  if (staffError || !staff) {
    return { role: "unauthorized", data: null, chatId: telegramChatId };
  }

  const role = staff.role;
  let dashboardData: any = {};

  try {
    if (role === "production") {
      const { data } = await supabase
        .from("erp_production_orders")
        .select("*, erp_sales_orders(erp_customers(name)), erp_items(original_name, approved_name)")
        .neq("status", "منتهي")
        .order("created_at", { ascending: false });
      dashboardData.orders = data || [];
    } 
    else if (role === "sales") {
      const { data } = await supabase
        .from("erp_sales_orders")
        .select("*, erp_customers(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      dashboardData.orders = data || [];
    }
    else if (role === "purchasing") {
      const { data: pos } = await supabase
        .from("erp_purchase_orders")
        .select("*, erp_suppliers(name)")
        .neq("status", "مستلم")
        .order("created_at", { ascending: false });
      dashboardData.pendingPos = pos || [];
    }
    else if (role === "manager") {
      // Basic stats for manager
      const [{ count: salesCount }, { count: prodCount }, { count: poCount }] = await Promise.all([
        supabase.from("erp_sales_orders").select("*", { count: "exact", head: true }),
        supabase.from("erp_production_orders").select("*", { count: "exact", head: true }).neq("status", "منتهي"),
        supabase.from("erp_purchase_orders").select("*", { count: "exact", head: true }).neq("status", "مستلم")
      ]);
      dashboardData.stats = {
        totalSales: salesCount || 0,
        activeProduction: prodCount || 0,
        pendingPurchases: poCount || 0
      };
    }
  } catch (err) {
    console.error("Error fetching TG dashboard data", err);
  }

  return {
    role: staff.role,
    name: staff.name,
    data: dashboardData
  };
}
