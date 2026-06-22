import bcrypt from 'bcrypt';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './connection.js';
import './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const now = new Date().toISOString();

/* ── Users ──────────────────────────────────────────────── */
const password = 'ChangeMe123!';
const users = [
  ['ahmad',  'أحمد',  'admin'],
  ['naseem', 'نسيم',  'pricing_manager'],
];
const userInsert = db.prepare(`
  INSERT OR IGNORE INTO users (username, display_name, password_hash, role, is_active, created_at)
  VALUES (?, ?, ?, ?, 1, ?)
`);
for (const [username, displayName, role] of users) {
  userInsert.run(username, displayName, bcrypt.hashSync(password, 10), role, now);
}

/* ── Categories ─────────────────────────────────────────── */
const categories = [
  'صاج ومواد خام',
  'إكسسوارات أبواب وجرارات',
  'مفصلات وأقفال وقطع تثبيت',
  'زينة حديد وحدادة ديكورية',
  'روزيت وغطاء وقطع تشطيب',
  'أبواب ومستلزماتها',
  'أبواب رول ومستلزماتها',
  'مواتير وماكينات وقطع كهربائية',
  'شبك وسلك ومجاري',
  'خدمات وتصنيع وتشطيب',
  'أصناف غير واضحة / تحتاج تنظيف',
];
const catInsert = db.prepare(
  `INSERT INTO categories (name, type) SELECT ?, 'main'
   WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ? AND type = 'main')`
);
for (const cat of categories) catInsert.run(cat, cat);

/* ── Unit mappings ──────────────────────────────────────── */
const mappings = [
  ['قطعه',      'قطعة'],
  ['قطعة',      'قطعة'],
  ['م.ط',       'متر'],
  ['متر طول',   'متر'],
  ['متر',       'متر'],
  ['SET',       'طقم'],
  ['KIT',       'طقم'],
  ['طقم',       'طقم'],
  ['قضيب',      'قضيب'],
  ['لفة',       'لفة'],
  ['ماسورة',    'ماسورة'],
];
const mapInsert = db.prepare(
  `INSERT OR IGNORE INTO unit_mappings (original_value, normalized_value) VALUES (?, ?)`
);
for (const [orig, norm] of mappings) { try { mapInsert.run(orig, norm); } catch {} }

/* ── App settings ────────────────────────────────────────── */
const settings = [
  ['currency',               'شيكل'],
  ['tax_enabled',            'false'],
  ['tax_inclusive',          'false'],
  ['vat_percent',            '0'],
  ['default_margin_percent', '0'],
  ['rounding_rule',          'nearest_1'],
];
const settingsInsert = db.prepare(
  `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`
);
for (const [k, v] of settings) settingsInsert.run(k, v);

/* ── Auto-import CSV on first run ────────────────────────── */
const itemCount = db.prepare('SELECT COUNT(*) c FROM items').get().c;
if (itemCount === 0) {
  const csvPath = path.resolve(__dirname, '../../إدارة الكميات.csv');
  if (fs.existsSync(csvPath)) {
    console.log('قاعدة البيانات فارغة — جاري استيراد الأصناف تلقائياً…');
    const { confirmImport } = await import('../services/importService.js');
    const result = confirmImport(csvPath, { username: 'system' });
    console.log(`تم استيراد ${result.inserted} صنف (${result.skipped} موجود مسبقاً، ${result.updated} محدَّث).`);
  } else {
    console.warn('تحذير: ملف إدارة الكميات.csv غير موجود — قاعدة البيانات ستبقى فارغة.');
  }
}

console.log('تم تجهيز قاعدة البيانات.');
