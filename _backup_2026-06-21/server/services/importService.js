import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { db } from '../db/connection.js';
import { normalizeUnit } from './unitNormalizationService.js';
import { suggestCategory } from './categorySuggestionService.js';
import { audit } from './auditService.js';

const CLEANING_CATEGORY = 'أصناف غير واضحة / تحتاج تنظيف';
const CLEANING_NOTE = 'تم وسم الصنف تلقائياً لأنه يحتاج تنظيف';

function isGarbageName(name) {
  const n = String(name || '').trim().toLowerCase();
  return !n || ['0', '1', 'test'].includes(n);
}

export function parseCsvFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return parse(text, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true
  });
}

export function previewImport(filePath) {
  const rows = parseCsvFile(filePath);
  const unitStats = {};
  let newItems = 0, existingItems = 0, garbage = 0, conflicts = 0;
  for (const row of rows) {
    const itemCode = String(row['الرقم'] || '').trim();
    const name = String(row['اسم الصنف'] || '').trim();
    const unit = normalizeUnit(row['الوحدة']);
    unitStats[String(row['الوحدة'] || '').trim() || '(فارغ)'] = unit;
    if (isGarbageName(name)) garbage++;
    const existing = itemCode ? db.prepare('SELECT * FROM items WHERE item_code = ?').get(itemCode) : null;
    if (existing) {
      existingItems++;
      if (existing.final_selling_price_cents || existing.cost_price_cents || existing.price_locked || existing.last_modified_at) conflicts++;
    } else {
      newItems++;
    }
  }
  return { totalRows: rows.length, newItems, existingItems, garbage, conflicts, unitStats };
}

export function confirmImport(filePath, user) {
  const rows = parseCsvFile(filePath);
  const insert = db.prepare(`
    INSERT INTO items (item_code, original_name, original_unit, unit, main_category, pricing_status, notes, raw_import, last_modified_by, last_modified_at)
    VALUES (@item_code, @original_name, @original_unit, @unit, @main_category, @pricing_status, @notes, @raw_import, @last_modified_by, @last_modified_at)
  `);
  const updateOriginal = db.prepare(`
    UPDATE items SET original_name = @original_name, original_unit = @original_unit, unit = COALESCE(unit, @unit), raw_import = @raw_import
    WHERE item_code = @item_code
    AND cost_price_cents IS NULL AND final_selling_price_cents IS NULL AND price_locked = 0 AND last_modified_at IS NULL
  `);
  let inserted = 0, updated = 0, skipped = 0;
  const tx = db.transaction(() => {
    for (const row of rows) {
      const item_code = String(row['الرقم'] || '').trim();
      if (!item_code) continue;
      const original_name = String(row['اسم الصنف'] || '').trim();
      const original_unit = String(row['الوحدة'] || '').trim();
      const unit = normalizeUnit(original_unit);
      const garbage = isGarbageName(original_name);
      const item = {
        item_code,
        original_name: original_name || '(فارغ)',
        original_unit,
        unit,
        main_category: garbage ? CLEANING_CATEGORY : suggestCategory(original_name) || null,
        pricing_status: garbage ? 'مؤجّل' : 'غير مسعّر',
        notes: garbage ? CLEANING_NOTE : null,
        raw_import: JSON.stringify(row),
        last_modified_by: null,
        last_modified_at: null
      };
      const existing = db.prepare('SELECT item_code, cost_price_cents, final_selling_price_cents, price_locked, last_modified_at FROM items WHERE item_code = ?').get(item_code);
      if (!existing) {
        insert.run(item);
        inserted++;
      } else {
        const result = updateOriginal.run(item);
        result.changes ? updated++ : skipped++;
      }
    }
  });
  tx();
  audit({ user: user.username, action: 'import', note: `inserted=${inserted}, updated=${updated}, skipped=${skipped}` });
  return { inserted, updated, skipped };
}
