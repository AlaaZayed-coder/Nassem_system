import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { paths } from '../db/connection.js';
import { listItems } from '../repositories/itemsRepository.js';
import { audit } from './auditService.js';

function money(cents) {
  return cents === null || cents === undefined ? '' : Number(cents) / 100;
}

function exportRows(items) {
  return items.map(item => ({
    'رقم الصنف': item.item_code,
    'الاسم الأصلي': item.original_name,
    'الاسم المعتمد': item.approved_name || '',
    'الوحدة': item.unit || item.original_unit || '',
    'التصنيف الرئيسي': item.main_category || '',
    'التصنيف الفرعي': item.sub_category || '',
    'نوع التسعير': item.pricing_method || '',
    'سعر التكلفة': money(item.cost_price_cents),
    'مصدر التكلفة': item.cost_source || '',
    'المورد': item.supplier || '',
    'هامش الربح %': item.profit_margin_percent ?? '',
    'السعر المقترح': money(item.suggested_selling_price_cents),
    'سعر البيع النهائي': money(item.final_selling_price_cents),
    'يحتاج تركيب؟': item.door_pricing_enabled ? 'نعم' : 'لا',
    'سعر بدون تركيب': money(item.price_without_installation_cents),
    'أجرة التركيب': money(item.installation_fee_cents),
    'سعر مع التركيب': money(item.price_with_installation_cents),
    'حالة التسعير': item.pricing_status,
    'مثبّت؟': item.price_locked ? 'نعم' : 'لا',
    'ملاحظات': item.notes || '',
    'آخر تعديل بواسطة': item.last_modified_by || '',
    'آخر تعديل': item.last_modified_at || ''
  }));
}

export function createExport(query, format, user) {
  const all = listItems({ ...query, page: 1, pageSize: 200000 }).rows;
  const rows = exportRows(all);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = format === 'csv' ? 'csv' : 'xlsx';
  const file = path.join(paths.exports, `pricing-export-${stamp}.${ext}`);
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'الأسعار');
  if (format === 'csv') {
    fs.writeFileSync(file, '\uFEFF' + XLSX.utils.sheet_to_csv(sheet), 'utf8');
  } else {
    XLSX.writeFile(wb, file);
  }
  audit({ user: user.username, action: 'export', note: path.basename(file) });
  return file;
}
