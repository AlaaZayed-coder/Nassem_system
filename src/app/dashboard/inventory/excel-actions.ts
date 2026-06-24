"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

// ─── Export blank import template ────────────────────────────────────────────
export async function exportImportTemplate() {
  const headers = ["الكود", "اسم الصنف", "ملحق الاسم", "الوحدة", "الرصيد"];

  const examples = [
    ["A001", "باب خشبي", "ذو مصراعين", "قطعة", 10],
    ["A002", "ألومنيوم", "بروفايل 6م", "متر", 50],
    ["A003", "زجاج شفاف", "", "متر", 0],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);

  // Column widths
  ws["!cols"] = [
    { wch: 12 }, // الكود
    { wch: 28 }, // اسم الصنف
    { wch: 20 }, // ملحق الاسم
    { wch: 10 }, // الوحدة
    { wch: 10 }, // الرصيد
  ];

  // Note row after examples
  const noteRow = [
    "* الوحدة: قطعة أو متر فقط",
    "* الملحق والرصيد اختياريان",
    "", "", "",
  ];
  XLSX.utils.sheet_add_aoa(ws, [noteRow], { origin: -1 });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "قالب الاستيراد");

  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  return { success: true, data: base64 };
}

// ─── Unit normalization ───────────────────────────────────────────────────────
function normalizeUnit(raw: string): string {
  const u = (raw || "").trim();
  if (u.includes("متر") || u.toLowerCase() === "m" || u.toLowerCase() === "meter") return "متر";
  if (u.includes("قطع") || u.toLowerCase() === "pcs" || u.toLowerCase() === "pc" || u.toLowerCase() === "piece") return "قطعة";
  // default to قطعة if unrecognized
  return u || "قطعة";
}

// ─── Category auto-assignment (names must match erp_categories exactly) ──────
function inferCategory(name: string): string | null {
  const n = (name || "").toUpperCase();

  // أبواب رول ومستلزماتها (أكثر تحديداً — يجب أن يسبق أبواب ومستلزماتها)
  if (n.includes("رول") || n.includes("ROLL")) return "أبواب رول ومستلزماتها";

  // أبواب ومستلزماتها
  if (n.includes("باب") || n.includes("بوابة") || n.includes("DOOR") ||
      n.includes("نافذة") || n.includes("شباك") || n.includes("WINDOW")) return "أبواب ومستلزماتها";

  // مواتير وماكينات وقطع كهربائية
  if (n.includes("موتور") || n.includes("مواتير") || n.includes("ماكينة") ||
      n.includes("كهرباء") || n.includes("كهربائي") || n.includes("MOTOR") ||
      n.includes("ELECTRIC") || n.includes("محرك")) return "مواتير وماكينات وقطع كهربائية";

  // صاج ومواد خام
  if (n.includes("صاج") || n.includes("حديد") || n.includes("فولاذ") ||
      n.includes("ألومنيوم") || n.includes("ALUMINIUM") || n.includes("ALUMINUM") ||
      n.includes("بروفايل") || n.includes("STEEL") || n.includes("IRON") ||
      n.includes("مواد خام") || n.includes("خام")) return "صاج ومواد خام";

  // إكسسوارات أبواب وجرارات
  if (n.includes("جرار") || n.includes("اكسسوار") || n.includes("ACCESSORY") ||
      n.includes("قبضة") || n.includes("مقبض") || n.includes("يد باب")) return "إكسسوارات أبواب وجرارات";

  // مفصلات وأقفال وقطع تثبيت
  if (n.includes("مفصل") || n.includes("قفل") || n.includes("HINGE") ||
      n.includes("LOCK") || n.includes("برغي") || n.includes("مسمار") ||
      n.includes("تثبيت") || n.includes("ربط")) return "مفصلات وأقفال وقطع تثبيت";

  // زينة حديد وحدادة ديكورية
  if (n.includes("زينة") || n.includes("ديكور") || n.includes("حدادة") ||
      n.includes("DECOR") || n.includes("زخرف")) return "زينة حديد وحدادة ديكورية";

  // روزيت وغطاء وقطع تشطيب
  if (n.includes("روزيت") || n.includes("غطاء") || n.includes("تشطيب") ||
      n.includes("ROSETTE") || n.includes("COVER")) return "روزيت وغطاء وقطع تشطيب";

  // شبك وسلك ومجاري
  if (n.includes("شبك") || n.includes("سلك") || n.includes("مجرى") ||
      n.includes("WIRE") || n.includes("MESH") || n.includes("CHANNEL")) return "شبك وسلك ومجاري";

  // خدمات وتصنيع وتشطيب
  if (n.includes("تصنيع") || n.includes("تركيب") || n.includes("عمالة") ||
      n.includes("خدمة") || n.includes("LABOR") || n.includes("INSTALL") ||
      n.includes("SERVICE")) return "خدمات وتصنيع وتشطيب";

  // سيلكون ومانعات
  if (n.includes("سيلكون") || n.includes("مانع") || n.includes("عازل") ||
      n.includes("SILICON") || n.includes("SEAL")) return "صاج ومواد خام";

  return null;
}

async function getOrCreateMainWarehouse(): Promise<string | null> {
  // Fetch all warehouses and pick the best match
  const { data: warehouses } = await supabase
    .from("erp_warehouses")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (warehouses && warehouses.length > 0) {
    // Prefer one with كلي or رئيسي in the name, otherwise take the first
    const match = warehouses.find(w =>
      w.name.includes("كلي") || w.name.includes("رئيسي") ||
      w.name.toLowerCase().includes("main") || w.name.includes("عام")
    );
    return (match || warehouses[0]).id;
  }

  // No warehouses exist — create المستودع الكلي
  const { data: created, error } = await supabase
    .from("erp_warehouses")
    .insert({ name: "المستودع الكلي", location: "المستودع الرئيسي" })
    .select("id")
    .single();

  if (error) { console.error("Could not create main warehouse:", error); return null; }
  return created.id;
}

export async function importItemsMasterFromExcel(formData: FormData) {
  const file = formData.get("file") as File;

  if (!file) throw new Error("لم يتم إرفاق أي ملف");

  // Always use المستودع الكلي for balance
  const warehouseId = await getOrCreateMainWarehouse();

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
  let firstError = "";

  // ── Build batches ─────────────────────────────────────────────────────────
  // itemsBatch: only safe columns that definitely exist
  // catUpdates: separate list for main_category updates
  // invBatch: inventory records
  const itemsBatch: any[] = [];
  const catUpdates: { item_code: string; main_category: string }[] = [];
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

    const fullName = rawSuffix ? `${rawName} ${rawSuffix}`.trim() : rawName;

    const existing = existingMap.get(itemCode);
    const isNew = !existing;

    // ── Item upsert row (only core columns, NO main_category here) ──────────
    const upsertRow: Record<string, any> = {
      item_code: itemCode,
      original_name: fullName || itemCode,
      is_active: true,
    };
    if (rawUnit) upsertRow.unit_of_measure = normalizeUnit(rawUnit);
    if (isNew)  upsertRow.pricing_status = "غير مسعّر";

    itemsBatch.push(upsertRow);
    if (isNew) added++; else updated++;

    // ── Category (separate update to avoid column issues) ───────────────────
    if (!existing?.hasCat) {
      const cat = inferCategory(fullName);
      if (cat) { catUpdates.push({ item_code: itemCode, main_category: cat }); withCat++; }
    }

    // ── Inventory ────────────────────────────────────────────────────────────
    if (warehouseId && rawQty !== null && !isNaN(rawQty) && rawQty > 0) {
      invBatch.push({ item_code: itemCode, warehouse_id: warehouseId, quantity: rawQty,
        last_updated: new Date().toISOString() });
      withInv++;
    }
  }

  // ── Upsert items in batches of 200 ────────────────────────────────────────
  for (let i = 0; i < itemsBatch.length; i += 200) {
    const { error } = await supabase.from("erp_items")
      .upsert(itemsBatch.slice(i, i + 200), { onConflict: "item_code", ignoreDuplicates: false });
    if (error) {
      if (!firstError) firstError = error.message;
      errors += Math.min(200, itemsBatch.length - i);
    }
  }

  // ── Update categories separately ──────────────────────────────────────────
  for (const cu of catUpdates) {
    await supabase.from("erp_items")
      .update({ main_category: cu.main_category })
      .eq("item_code", cu.item_code);
  }

  // ── Upsert inventory ──────────────────────────────────────────────────────
  for (let i = 0; i < invBatch.length; i += 200) {
    const { error } = await supabase.from("erp_inventory")
      .upsert(invBatch.slice(i, i + 200), { onConflict: "item_code,warehouse_id", ignoreDuplicates: false });
    if (error) console.error("Inventory upsert error:", error.message);
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/inventory/items");
  revalidatePath("/dashboard/inventory/warehouse");

  return { success: true, added, updated, withCat, withInv, errors, firstError };
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
