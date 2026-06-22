import bcrypt from 'bcrypt';
import { db } from './connection.js';
import './migrate.js';

const now = new Date().toISOString();
const password = 'ChangeMe123!';
const users = [
  ['ahmad', 'أحمد', 'Admin'],
  ['naseem', 'نسيم', 'Pricing Manager'],
  ['wesam', 'وسام', 'Viewer'],
  ['kareem', 'كريم', 'Viewer']
];

const userInsert = db.prepare(`
  INSERT OR IGNORE INTO users (username, display_name, password_hash, role, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
for (const [username, displayName, role] of users) {
  userInsert.run(username, displayName, bcrypt.hashSync(password, 10), role, now);
}

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
  'أصناف غير واضحة / تحتاج تنظيف'
];
const catInsert = db.prepare(`INSERT OR IGNORE INTO categories (name, type) VALUES (?, 'main')`);
for (const category of categories) catInsert.run(category);

const mappings = [
  ['قطعه', 'قطعة'],
  ['قطعة', 'قطعة'],
  ['م.ط', 'متر'],
  ['متر طول', 'متر'],
  ['متر', 'متر'],
  ['SET', 'طقم'],
  ['KIT', 'طقم'],
  ['طقم', 'طقم'],
  ['قضيب', 'قضيب'],
  ['لفة', 'لفة'],
  ['ماسورة', 'ماسورة']
];
const mapInsert = db.prepare(`INSERT OR IGNORE INTO unit_mappings (original_value, normalized_value) VALUES (?, ?)`);
for (const mapping of mappings) mapInsert.run(...mapping);

const settings = [
  ['currency', 'شيكل'],
  ['tax_enabled', 'false'],
  ['tax_inclusive', 'false'],
  ['vat_percent', '0'],
  ['default_margin_percent', '0'],
  ['rounding_rule', 'nearest_1']
];
const settingsInsert = db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`);
for (const setting of settings) settingsInsert.run(...setting);

console.log('تم إدخال البيانات الأساسية.');
