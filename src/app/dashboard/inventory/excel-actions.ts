"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

export async function exportItemsToExcel() {
  try {
    const { data: items, error } = await supabase
      .from("erp_items")
      .select("item_code, approved_name, cost_price_cents, final_selling_price_cents, category_id, is_active")
      .order("item_code", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Format data for Excel
    const safeItems = items || [];
    const excelData = safeItems.map((item) => ({
      "رمز الصنف (Item Code)": item.item_code,
      "اسم الصنف (Name)": item.approved_name || "",
      "سعر التكلفة (Cost Price)": (item.cost_price_cents / 100).toFixed(2),
      "سعر البيع (Selling Price)": (item.final_selling_price_cents / 100).toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الأصناف والأسعار");

    const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
    
    return { success: true, data: base64 };
  } catch (err: any) {
    console.error("Export error inside Server Action:", err);
    return { success: false, error: err.message || "Unknown error during export" };
  }
}

export async function importItemsFromExcel(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("لم يتم إرفاق أي ملف");

    const bytes = await file.arrayBuffer();

    const workbook = XLSX.read(bytes, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Validate headers
    if (data.length < 2) throw new Error("الملف فارغ أو لا يحتوي على بيانات صحيحة");

    // Map column indices
    const headers = data[0] as string[];
    const colCode = headers.findIndex(h => typeof h === 'string' && h.includes("رمز الصنف"));
    const colName = headers.findIndex(h => typeof h === 'string' && h.includes("اسم الصنف"));
    const colCost = headers.findIndex(h => typeof h === 'string' && h.includes("سعر التكلفة"));
    const colSell = headers.findIndex(h => typeof h === 'string' && h.includes("سعر البيع"));

    if (colCode === -1 || colCost === -1 || colSell === -1) {
      throw new Error("تنسيق الأعمدة غير صحيح. يرجى تصدير الملف أولاً لضمان وجود الأعمدة المطلوبة.");
    }

    let successCount = 0;
    let newCount = 0;

    // Process rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0 || !row[colCode]) continue;

      const itemCode = String(row[colCode]).trim();
      const itemName = colName !== -1 ? (row[colName] ? String(row[colName]).trim() : itemCode) : itemCode;
      
      const rawCost = parseFloat(String(row[colCost]));
      const rawSell = parseFloat(String(row[colSell]));

      const costPriceCents = isNaN(rawCost) ? 0 : Math.round(rawCost * 100);
      const sellPriceCents = isNaN(rawSell) ? 0 : Math.round(rawSell * 100);

      if (!itemCode) continue;

      // Upsert into erp_items
      const { error, data: updated } = await supabase
        .from("erp_items")
        .upsert({
          item_code: itemCode,
          approved_name: itemName,
          cost_price_cents: costPriceCents,
          final_selling_price_cents: sellPriceCents,
          is_active: true,
        }, {
          onConflict: 'item_code',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error(`Error updating item ${itemCode}:`, error);
      } else {
        // If we want to strictly know if it was inserted vs updated, 
        // Supabase upsert doesn't tell us easily unless we check first. 
        // We'll just count total successes.
        successCount++;
      }
    }

    revalidatePath("/dashboard/inventory/items");
    revalidatePath("/dashboard/inventory");

    return { success: true, count: successCount };
  } catch (err: any) {
    throw new Error(err.message || "حدث خطأ أثناء قراءة الملف");
  }
}
