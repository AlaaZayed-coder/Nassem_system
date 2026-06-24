"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

// ─── Category auto-assignment ────────────────────────────────────────────────
function inferCategory(name: string): string | null {
  const n = (name || "").toUpperCase();
  if (n.includes("باب") || n.includes("بوابة") || n.includes("DOOR")) return "أبواب";
  if (n.includes("نافذة") || n.includes("شباك") || n.includes("WINDOW")) return "نوافذ";
  if (n.includes("مطبخ") || n.includes("خزانة") || n.includes("KITCHEN") || n.includes("CABINET")) return "مطابخ وخزائن";
  if (n.includes("زجاج") || n.includes("GLASS") || n.includes("مرآة")) return "زجاج";
  if (n.includes("اكسسوار") || n.includes("قبضة") || n.includes("مسمار") || n.includes("برغي") || n.includes("مفصلة") || n.includes("ACCESSORY")) return "اكسسوارات";
  if (n.includes("سيلكون") || n.includes("مانع") || n.includes("عازل") || n.includes("SEAL") || n.includes("SILICON")) return "مواد عازلة";
  if (n.includes("ألومنيوم") || n.includes("ALUMINIUM") || n.includes("ALUMINUM") || n.includes("بروفايل")) return "ألومنيوم";
  if (n.includes("حديد") || n.includes("فولاذ") || n.includes("STEEL") || n.includes("IRON")) return "حديد وفولاذ";
  if (n.includes("صنع") || n.includes("تركيب") || n.includes("عمالة") || n.includes("LABOR") || n.includes("INSTALL")) return "أعمال";
  return null;
}

export async function importItemsMasterFromExcel(formData: FormData) {
  const file = formData.get("file") as File;
  const warehouseId = formData.get("warehouse_id") as string | null;

  if (!file) throw new Error("لم يتم إرفاق أي ملف");

  const bytes = await file.arrayBuffer();
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  if (rows.length < 2) throw new Error("الملف فارغ أو لا يحتوي على بيانات");

  // ── Column detection ──────────────────────────────────────────────────────
  const headers = (rows[0] as string[]).map(h => String(h || "").trim());
  const find = (...kw: string[]) =>
    headers.findIndex(h => kw.some(k => h.includes(k)));

  const colCode   = find("كود", "رمز", "code", "CODE", "Item Code", "الكود");
  const colName   = find("اسم الصنف", "الاسم", "name", "NAME", "اسم");
  const colSuffix = find("ملحق", "suffix", "SUFFIX", "الملحق");
  const colUnit   = find("وحدة", "unit", "UNIT", "الوحدة");
  const colQty    = find("رصيد", "كمية", "qty", "QTY", "quantity", "QUANTITY", "الرصيد");

  if (colCode === -1) throw new Error("لم يُعثر على عمود الكود. تأكد من وجود عمود باسم 'كود' أو 'رمز'");
  if (colName === -1) throw new Error("لم يُعثر على عمود الاسم. تأكد من وجود عمود باسم 'اسم' أو 'اسم الصنف'");

  // ── Fetch existing items (code → {has category, has pricing}) ─────────────
  let existingMap = new Map<string, { hasCat: boolean; hasPricing: boolean }>();
  {
    let from = 0; const ps = 1000;
    while (true) {
      const { data } = await supabase.from("erp_items")
        .select("item_code, main_category, pricing_status")
        .range(from, from + ps - 1);
      (data || []).forEach(r => existingMap.set(r.item_code, {
        hasCat: !!r.main_category,
        hasPricing: r.pricing_status && r.pricing_status !== "غير مسعّر",
      }));
      if (!data || data.length < ps) break;
      from += ps;
    }
  }

  let added = 0, updated = 0, withCat = 0, withInv = 0, errors = 0;

  // ── Process rows in batches of 200 ───────────────────────────────────────
  const batch: any[] = [];
  const invBatch: any[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[colCode]) continue;

    const itemCode = String(row[colCode]).trim();
    if (!itemCode) continue;

    const rawName   = colName   !== -1 ? String(row[colName]   || "").trim() : "";
    const rawSuffix = colSuffix !== -1 ? String(row[colSuffix] || "").trim() : "";
    const rawUnit   = colUnit   !== -1 ? String(row[colUnit]   || "").trim() : "";
    const rawQty    = colQty    !== -1 ? parseFloat(String(row[colQty] || "0")) : null;

    // Build full name
    const fullName = rawSuffix ? `${rawName} ${rawSuffix}`.trim() : rawName;

    // Auto-assign category only for items without one
    const existing = existingMap.get(itemCode);
    const isNew = !existing;
    const category = (!existing?.hasCat) ? inferCategory(fullName) : undefined;

    const upsertRow: Record<string, any> = {
      item_code: itemCode,
      original_name: fullName || itemCode,
      is_active: true,
    };

    if (rawUnit) upsertRow.unit_of_measure = rawUnit;

    // New items get default status and category
    if (isNew) {
      upsertRow.pricing_status = "غير مسعّر";
      if (category) { upsertRow.main_category = category; withCat++; }
    } else {
      // Existing: update name/unit only, assign category if missing
      if (category) { upsertRow.main_category = category; withCat++; }
    }

    batch.push(upsertRow);
    if (isNew) added++; else updated++;

    // Inventory record
    if (warehouseId && rawQty !== null && !isNaN(rawQty) && rawQty > 0) {
      invBatch.push({
        item_code: itemCode,
        warehouse_id: warehouseId,
        quantity: rawQty,
        last_updated: new Date().toISOString(),
      });
      withInv++;
    }

    // Flush every 200 rows
    if (batch.length >= 200) {
      const { error } = await supabase.from("erp_items")
        .upsert(batch, { onConflict: "item_code", ignoreDuplicates: false });
      if (error) { console.error("Upsert batch error:", error); errors += batch.length; }
      batch.length = 0;
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    const { error } = await supabase.from("erp_items")
      .upsert(batch, { onConflict: "item_code", ignoreDuplicates: false });
    if (error) { console.error("Upsert final batch error:", error); errors += batch.length; }
  }

  // Inventory upsert
  if (invBatch.length > 0 && warehouseId) {
    for (let i = 0; i < invBatch.length; i += 200) {
      await supabase.from("erp_inventory").upsert(
        invBatch.slice(i, i + 200),
        { onConflict: "item_code,warehouse_id", ignoreDuplicates: false }
      );
    }
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/inventory/items");
  revalidatePath("/dashboard/inventory/warehouse");

  return { success: true, added, updated, withCat, withInv, errors };
}

export async function exportItemsToExcel() {
  try {
    let allItems: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let fetchMore = true;

    while (fetchMore) {
      const { data: items, error } = await supabase
        .from("erp_items")
        .select("item_code, approved_name, cost_price_cents, final_selling_price_cents, is_active")
        .order("item_code", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        throw new Error(error.message);
      }

      if (items && items.length > 0) {
        allItems = allItems.concat(items);
        page++;
        if (items.length < pageSize) {
          fetchMore = false;
        }
      } else {
        fetchMore = false;
      }
    }

    // Format data for Excel
    const safeItems = allItems;
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
