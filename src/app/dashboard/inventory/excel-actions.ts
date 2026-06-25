"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

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

// ─── Professional pricing entry export ───────────────────────────────────────
export async function exportPricingSheet() {
  // Fetch all non-frozen items
  let allItems: any[] = [];
  let from = 0;
  const ps = 1000;
  while (true) {
    const { data } = await supabase
      .from("erp_items")
      .select("item_code, original_name, name_suffix, approved_name, main_category, cost_price_cents, profit_margin_percent, final_selling_price_cents, pricing_status, is_frozen")
      .or("is_frozen.is.null,is_frozen.eq.false")
      .order("main_category", { ascending: true })
      .order("item_code", { ascending: true })
      .range(from, from + ps - 1);
    if (!data || data.length === 0) break;
    allItems = allItems.concat(data);
    if (data.length < ps) break;
    from += ps;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "نظام الحوكمة";
  wb.created = new Date();

  // ── Hidden sheet: قوائم — contains category names for dropdowns ───────────
  const { data: catsForDropdown } = await supabase.from("erp_categories").select("name").order("name");
  const catNames = (catsForDropdown || []).map((c: any) => c.name);

  const wsLists = wb.addWorksheet("قوائم");
  wsLists.state = "veryHidden"; // hidden from user
  wsLists.getColumn(1).width = 40;
  // Write category names — 50 rows total (extra rows for categories added in Sheet 2)
  for (let i = 0; i < 50; i++) {
    wsLists.getCell(`A${i + 1}`).value = catNames[i] || "";
  }
  // Named range helper: we'll reference قوائم!$A$1:$A$50 in data validation

  const ws = wb.addWorksheet("إدخال الأسعار", {
    views: [{ state: "frozen", ySplit: 2, rightToLeft: "rtl" as any }],
  });

  // ── Column definitions ────────────────────────────────────────────────────
  ws.columns = [
    { key: "no",       width: 6  },
    { key: "code",     width: 14 },
    { key: "name",     width: 34 },
    { key: "suffix",   width: 18 },
    { key: "category", width: 22 },
    { key: "cost",     width: 13 },
    { key: "margin",   width: 12 },
    { key: "suggested",width: 13 },
    { key: "final",    width: 13 },
    { key: "status",   width: 16 },
  ];

  // ── Row 1: Title banner ───────────────────────────────────────────────────
  ws.mergeCells("A1:J1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `نظام الحوكمة — ملف إدخال الأسعار   (${new Date().toLocaleDateString("ar-SA")})`;
  titleCell.font   = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3C5E" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(1).height = 28;

  // ── Row 2: Column headers ─────────────────────────────────────────────────
  const HEADER_BG   = "FF2C5F8A";
  const HEADER_TEXT = "FFFFFFFF";
  const headers = [
    "#", "الكود", "اسم الصنف", "ملحق الاسم", "التصنيف",
    "التكلفة ₪", "الهامش %", "المقترح ₪", "السعر النهائي ₪", "الحالة",
  ];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.font      = { name: "Arial", size: 11, bold: true, color: { argb: HEADER_TEXT } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false, readingOrder: "rtl" };
    cell.border    = { bottom: { style: "medium", color: { argb: "FF1A3C5E" } } };
  });

  // ── Colour palette for categories ─────────────────────────────────────────
  const CAT_COLORS: Record<string, string> = {};
  const PALETTE = ["FFE8F5E9","FFE3F2FD","FFFFF3E0","FFFCE4EC","FFEDE7F6","FFE0F7FA","FFFFF8E1","FFF3E5F5","FFE8EAF6","FFEFEBE9"];
  let palIdx = 0;
  function catColor(cat: string) {
    if (!CAT_COLORS[cat]) CAT_COLORS[cat] = PALETTE[palIdx++ % PALETTE.length];
    return CAT_COLORS[cat];
  }

  // ── Status colors for read-only cells ─────────────────────────────────────
  const STATUS_FG: Record<string, string> = {
    "معتمد":          "FF1D9E75",
    "قيد المراجعة":   "FF185FA5",
    "غير مسعّر":      "FF854F0B",
    "مؤجّل":          "FF534AB7",
    "بحاجة مراجعة":  "FFB45309",
  };

  // ── Data rows ─────────────────────────────────────────────────────────────
  const lockedStyle = { argb: "FFF5F5F5" };
  const editableFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } };
  const lockedFill   = { type: "pattern" as const, pattern: "solid" as const, fgColor: lockedStyle };
  const numFmt = '#,##0.00';
  const pctFmt = '0.00%';

  allItems.forEach((item, idx) => {
    const rowNum = idx + 3; // rows start at 3 (1=title, 2=header)
    const cost    = item.cost_price_cents    != null ? item.cost_price_cents / 100    : null;
    const final   = item.final_selling_price_cents != null ? item.final_selling_price_cents / 100 : null;
    const margin  = item.profit_margin_percent != null ? item.profit_margin_percent / 100 : null;
    const cat     = item.main_category || "بدون تصنيف";
    const bg      = catColor(cat);

    const row = ws.addRow([
      idx + 1,
      item.item_code,
      item.original_name || "",
      item.name_suffix || "",
      cat,
      cost,
      margin,
      null, // suggested — formula
      final,
      item.pricing_status || "غير مسعّر",
    ]);
    row.height = 18;

    // Suggested price formula: cost * (1 + margin)
    const sugCell = row.getCell(8);
    sugCell.value = { formula: `=IF(AND(F${rowNum}<>"",G${rowNum}<>""),ROUND(F${rowNum}*(1+G${rowNum}),2),"")` };

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.alignment = { vertical: "middle", readingOrder: "rtl",
        horizontal: colNum === 1 ? "center" : colNum >= 6 ? "left" : "right" };
      cell.font = { name: "Arial", size: 10 };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right:  { style: "thin", color: { argb: "FFE0E0E0" } },
      };

      // Locked columns: #, code, name, suffix (cols 1-4); category (col 5) is editable
      if (colNum <= 4) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.font = { name: "Arial", size: 10, color: { argb: "FF333333" } };
        if (colNum === 1) cell.font = { ...cell.font, color: { argb: "FF888888" } };
        if (colNum === 2) cell.font = { ...cell.font, bold: true, color: { argb: "FF1A3C5E" } };
      } else if (colNum === 5) {
        // التصنيف — editable dropdown, light purple tint
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
        cell.font = { name: "Arial", size: 10, color: { argb: "FF3730A3" } };
      } else {
        cell.fill = editableFill;
      }

      // Number formats
      if (colNum === 6 || colNum === 8 || colNum === 9) cell.numFmt = numFmt;
      if (colNum === 7) cell.numFmt = pctFmt;

      // Suggested — light blue background (formula, not editable)
      if (colNum === 8) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } };
        cell.font = { name: "Arial", size: 10, color: { argb: "FF1565C0" }, italic: true };
      }

      // Status column color
      if (colNum === 10) {
        const stColor = STATUS_FG[item.pricing_status] || "FF888888";
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: stColor } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8F8F8" } };
      }
    });

    // Data validation: category dropdown (references hidden قوائم sheet)
    ws.getCell(`E${rowNum}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ["قوائم!$A$1:$A$50"],
      showErrorMessage: false, // allow typing new values too
    };

    // Data validation: status dropdown (no مؤجّل)
    ws.getCell(`J${rowNum}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"قيد المراجعة,معتمد,مجمد,غير مسعّر"'],
      showErrorMessage: true,
      errorTitle: "قيمة غير صحيحة",
      error: "اختر من القائمة: قيد المراجعة، معتمد، مجمد، غير مسعّر",
    };
  });

  // ── Sheet 2: إدارة التصنيفات ──────────────────────────────────────────────
  const { data: cats } = await supabase.from("erp_categories").select("name").order("name");
  const catList = (cats || []).map((c: any) => c.name);

  const wsCat = wb.addWorksheet("إدارة التصنيفات", { views: [{ rightToLeft: "rtl" as any }] });
  wsCat.columns = [
    { key: "action",   width: 18 },
    { key: "current",  width: 32 },
    { key: "newname",  width: 32 },
  ];

  // Header
  const catHeader = wsCat.addRow(["الإجراء", "اسم التصنيف الحالي", "الاسم الجديد (للتعديل فقط)"]);
  catHeader.height = 22;
  catHeader.eachCell(cell => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3C5E" } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border = { bottom: { style: "medium", color: { argb: "FF1A3C5E" } } };
  });

  // Populate existing categories
  catList.forEach((name: string, i: number) => {
    const row = wsCat.addRow(["", name, ""]);
    row.height = 18;
    const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF5F7FA";
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { readingOrder: "rtl", vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE0E0E0" } } };
      if (col === 2) cell.font = { name: "Arial", size: 10, bold: true };
    });
    // Action dropdown
    row.getCell(1).dataValidation = {
      type: "list", allowBlank: true,
      formulae: ['"إضافة,تعديل اسم,حذف"'],
      showErrorMessage: true, errorTitle: "خطأ", error: "اختر: إضافة، تعديل اسم، حذف",
    };
  });

  // Empty rows for adding new categories
  for (let i = 0; i < 10; i++) {
    const rowNum2 = catList.length + 2 + i;
    const row = wsCat.addRow(["إضافة", "", ""]);
    row.height = 18;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { readingOrder: "rtl", vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFD1FAE5" } } };
    });
    wsCat.getCell(`A${rowNum2}`).dataValidation = {
      type: "list", allowBlank: true,
      formulae: ['"إضافة,تعديل اسم,حذف"'],
    };
    wsCat.getCell(`A${rowNum2}`).font = { name: "Arial", size: 10, color: { argb: "FF15803D" } };
  }

  // ── Sheet 3: إضافة وحذف أصناف ────────────────────────────────────────────
  const wsItems2 = wb.addWorksheet("إضافة وحذف أصناف", { views: [{ rightToLeft: "rtl" as any }] });
  wsItems2.columns = [
    { key: "action",   width: 14 },
    { key: "code",     width: 16 },
    { key: "name",     width: 34 },
    { key: "suffix",   width: 18 },
    { key: "category", width: 28 },
    { key: "unit",     width: 12 },
  ];

  const itemsHeader = wsItems2.addRow(["الإجراء", "الكود *", "اسم الصنف *", "ملحق الاسم", "التصنيف", "الوحدة"]);
  itemsHeader.height = 22;
  itemsHeader.eachCell(cell => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D9E75" } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border = { bottom: { style: "medium", color: { argb: "FF0F6E56" } } };
  });

  // Note row
  const noteRow2 = wsItems2.addRow(["", "← الكود إلزامي للحذف", "← الاسم إلزامي للإضافة", "", "← اختر من القائمة", "قطعة/متر"]);
  noteRow2.height = 16;
  noteRow2.eachCell(cell => {
    cell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF888888" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
  });

  // 20 blank editable rows
  for (let i = 0; i < 20; i++) {
    const rowNum3 = i + 3;
    const row = wsItems2.addRow(["إضافة", "", "", "", "", "قطعة"]);
    row.height = 18;
    const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF5F7FA";
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { readingOrder: "rtl", vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE0E0E0" } } };
    });
    wsItems2.getCell(`A${rowNum3}`).dataValidation = {
      type: "list", allowBlank: false,
      formulae: ['"إضافة,حذف"'],
      showErrorMessage: true, errorTitle: "خطأ", error: "اختر: إضافة أو حذف",
    };
    wsItems2.getCell(`F${rowNum3}`).dataValidation = {
      type: "list", allowBlank: true,
      formulae: ['"قطعة,متر"'],
    };
    if (catList.length > 0) {
      wsItems2.getCell(`E${rowNum3}`).dataValidation = {
        type: "list", allowBlank: true,
        formulae: [`"${catList.slice(0, 20).join(",")}"`],
      };
    }
  }

  // ── Sheet 4: تعليمات ──────────────────────────────────────────────────────
  const info = wb.addWorksheet("تعليمات", { views: [{ rightToLeft: "rtl" as any }] });
  info.columns = [{ width: 72 }];
  const instructions: [string, boolean?, number?][] = [
    ["نظام الحوكمة — دليل استخدام ملف Excel", true, 13],
    ["", false, 10],
    ["── Sheet 1: إدخال الأسعار ──", true, 11],
    ["  • التكلفة ₪ — سعر التكلفة بالشيكل", false, 10],
    ["  • الهامش % — نسبة الهامش (مثال: 0.35 = 35%)", false, 10],
    ["  • السعر النهائي ₪ — يمكن تجاوز المقترح", false, 10],
    ["  • الحالة — اختر: قيد المراجعة / معتمد / مجمد / غير مسعّر", false, 10],
    ["", false, 10],
    ["── Sheet 2: إدارة التصنيفات ──", true, 11],
    ["  • إضافة — اكتب الاسم في خلية 'اسم التصنيف الحالي'", false, 10],
    ["  • تعديل اسم — اكتب الاسم القديم ثم الجديد في العمود الثالث", false, 10],
    ["  • حذف — اختر 'حذف' بجانب التصنيف (يجب أن يكون فارغاً)", false, 10],
    ["", false, 10],
    ["── Sheet 3: إضافة وحذف أصناف ──", true, 11],
    ["  • إضافة — اكتب الكود والاسم والتصنيف والوحدة", false, 10],
    ["  • حذف — اكتب الكود واختر 'حذف' (يحذف الصنف نهائياً)", false, 10],
    ["", false, 10],
    ["بعد الانتهاء: احفظ الملف وارفعه من لوحة المعلومات ← استيراد الأسعار", false, 10],
  ];
  instructions.forEach(([text, bold, size]) => {
    const row = info.addRow([text]);
    row.height = bold ? 24 : 17;
    const cell = row.getCell(1);
    cell.font = { name: "Arial", size: size || 10, bold: !!bold, color: { argb: bold ? "FF1A3C5E" : "FF333333" } };
    cell.alignment = { readingOrder: "rtl" };
    if (bold && text.startsWith("──")) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F8" } };
    }
  });

  // ── Write to buffer ───────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { success: true, data: base64, count: allItems.length };
}

// ─── Import pricing sheet with all actions ────────────────────────────────────
export async function importPricingSheetFull(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("لم يتم إرفاق أي ملف");

  const bytes = await file.arrayBuffer();
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(bytes);

  let priceUpdated = 0, catAdded = 0, catRenamed = 0, catDeleted = 0;
  let itemAdded = 0, itemDeleted = 0;
  const errors: string[] = [];

  // ── Sheet 2: إدارة التصنيفات ─────────────────────────────────────────────
  const wsCat = wb2.getWorksheet("إدارة التصنيفات");
  if (wsCat) {
    wsCat.eachRow((row, rn) => {
      if (rn === 1) return; // header
      const action = String(row.getCell(1).value || "").trim();
      const current = String(row.getCell(2).value || "").trim();
      const newName = String(row.getCell(3).value || "").trim();
      if (!action || !current) return;
      (async () => {
        try {
          if (action === "إضافة" && current) {
            await supabase.from("erp_categories").insert({ name: current, type: "main", is_active: true });
            catAdded++;
          } else if (action === "تعديل اسم" && current && newName) {
            await supabase.from("erp_categories").update({ name: newName }).eq("name", current);
            await supabase.from("erp_items").update({ main_category: newName }).eq("main_category", current);
            catRenamed++;
          } else if (action === "حذف" && current) {
            const { count } = await supabase.from("erp_items").select("*", { count: "exact", head: true }).eq("main_category", current);
            if (count && count > 0) { errors.push(`لا يمكن حذف "${current}": يوجد ${count} صنف`); return; }
            await supabase.from("erp_categories").delete().eq("name", current);
            catDeleted++;
          }
        } catch (e: any) { errors.push(e.message); }
      })();
    });
  }

  // ── Sheet 3: إضافة وحذف أصناف ───────────────────────────────────────────
  const wsItems3 = wb2.getWorksheet("إضافة وحذف أصناف");
  if (wsItems3) {
    const itemRows: any[] = [];
    wsItems3.eachRow((row, rn) => { if (rn > 2) itemRows.push(row); });
    for (const row of itemRows) {
      const action = String(row.getCell(1).value || "").trim();
      const code   = String(row.getCell(2).value || "").trim();
      const name   = String(row.getCell(3).value || "").trim();
      const suffix = String(row.getCell(4).value || "").trim();
      const cat    = String(row.getCell(5).value || "").trim();
      const unit   = String(row.getCell(6).value || "قطعة").trim();
      if (!action || !code) continue;
      try {
        if (action === "إضافة" && code && name) {
          const { error } = await supabase.from("erp_items").insert({
            item_code: code, original_name: name,
            name_suffix: suffix || null, main_category: cat || null,
            unit_of_measure: unit, pricing_status: "غير مسعّر", is_active: true,
          });
          if (error) errors.push(`إضافة ${code}: ${error.message}`);
          else itemAdded++;
        } else if (action === "حذف" && code) {
          await supabase.from("erp_inventory").delete().eq("item_code", code);
          const { error } = await supabase.from("erp_items").delete().eq("item_code", code);
          if (error) errors.push(`حذف ${code}: ${error.message}`);
          else itemDeleted++;
        }
      } catch (e: any) { errors.push(e.message); }
    }
  }

  // ── Sheet 1: إدخال الأسعار ───────────────────────────────────────────────
  const ws1 = wb2.getWorksheet("إدخال الأسعار");
  if (ws1) {
    const priceRows: any[] = [];
    ws1.eachRow((row, rn) => { if (rn > 2) priceRows.push(row); });
    const batch: any[] = [];
    for (const row of priceRows) {
      const code      = String(row.getCell(2).value || "").trim();
      const category  = String(row.getCell(5).value || "").trim();
      const cost      = row.getCell(6).value;
      const margin    = row.getCell(7).value;
      const finalP    = row.getCell(9).value;
      const status    = String(row.getCell(10).value || "").trim();
      if (!code) continue;
      const updates: any = {};
      if (category && category !== "بدون تصنيف") updates.main_category = category;
      if (cost !== null && cost !== undefined && cost !== "") updates.cost_price_cents = Math.round(Number(cost) * 100);
      if (margin !== null && margin !== undefined && margin !== "") updates.profit_margin_percent = Number(margin) * 100;
      if (finalP !== null && finalP !== undefined && finalP !== "") updates.final_selling_price_cents = Math.round(Number(finalP) * 100);
      if (status && ["قيد المراجعة","معتمد","مجمد","غير مسعّر"].includes(status)) {
        updates.pricing_status = status === "مجمد" ? updates.pricing_status : status;
        updates.is_frozen = status === "مجمد";
      }
      if (Object.keys(updates).length > 0) {
        updates.item_code = code;
        batch.push(updates);
      }
    }
    for (let i = 0; i < batch.length; i += 100) {
      const slice = batch.slice(i, i + 100);
      for (const u of slice) {
        const { item_code, ...rest } = u;
        const { error } = await supabase.from("erp_items").update(rest).eq("item_code", item_code);
        if (!error) priceUpdated++;
        else errors.push(`${item_code}: ${error.message}`);
      }
    }
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/inventory/items");
  revalidatePath("/dashboard/inventory/categories");

  return { success: true, priceUpdated, catAdded, catRenamed, catDeleted, itemAdded, itemDeleted, errors };
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
