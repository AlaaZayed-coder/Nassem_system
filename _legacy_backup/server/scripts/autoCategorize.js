import { db } from '../db/connection.js';
import { audit } from '../services/auditService.js';

const rules = [
  ['أبواب رول ومستلزماتها', ['رول']],
  ['أبواب ومستلزماتها', ['باب', 'ابواب', 'أبواب']],
  ['مواتير وماكينات وقطع كهربائية', ['موتور', 'ماكينة', 'مكنة', 'ريموت', 'كهرب', 'حساس', 'سويتش', 'كنترول', 'بطارية', 'لوحة', 'مفتاح']],
  ['إكسسوارات أبواب وجرارات', ['جرار', 'جرارات', 'سحاب', 'مجرى', 'مجري', 'عجل', 'حمالة', 'لقاطة', 'مسكة', 'دليل', 'سكة', 'بكرة']],
  ['مفصلات وأقفال وقطع تثبيت', ['مفصل', 'مفصلة', 'قفل', 'اقفال', 'أقفال', 'برغي', 'براغي', 'مسمار', 'مسامير', 'كلبس', 'تثبيت', 'صامولة', 'واشر']],
  ['روزيت وغطاء وقطع تشطيب', ['روزيت', 'غطاء', 'غطا', 'كفر', 'سدادة', 'طبة', 'طابه', 'طابة', 'تشطيب', 'نهاية']],
  ['شبك وسلك ومجاري', ['شبك', 'سلك', 'مجرى تصريف', 'مجرى مياه', 'مجرى ارضي']],
  ['صاج ومواد خام', ['صاج', 'ماسورة', 'مواسير', 'انبوب', 'أنبوب', 'بروفيل', 'زاوية', 'حديد', 'قضيب', 'مبسط', 'مبسطة', 'مسطح', 'فلات', 'مربع', 'دائري', 'صفيحة', 'لوح']],
  ['خدمات وتصنيع وتشطيب', ['دهان', 'قص', 'ثني', 'لحام', 'تصنيع', 'خدمة', 'تركيب', 'جلفنة', 'بودرة']],
  ['زينة حديد وحدادة ديكورية', ['زينة', 'مخروط', 'عامود', 'عمود', 'رمح', 'شكلة', 'كونص', 'زهرة', 'وردة', 'ورق', 'حلقة', 'صليبة', 'كرة', 'سنبلة', 'زخرف', 'قوس', 'حلزون', 'مجدول', 'مبروم', 'مضرب', 'حماية', 'نحاس', 'ديكور']]
];

function classify(name) {
  const text = String(name || '').trim();
  for (const [category, words] of rules) {
    if (words.some(word => text.includes(word))) return category;
  }
  return '';
}

const rows = db.prepare("SELECT item_code, original_name FROM items WHERE main_category IS NULL OR main_category = ''").all();
const update = db.prepare("UPDATE items SET main_category = ?, last_modified_by = 'system', last_modified_at = ? WHERE item_code = ? AND (main_category IS NULL OR main_category = '')");
const counts = {};
let changed = 0;
const now = new Date().toISOString();

const tx = db.transaction(() => {
  for (const row of rows) {
    const category = classify(row.original_name);
    if (!category) continue;
    update.run(category, now, row.item_code);
    counts[category] = (counts[category] || 0) + 1;
    changed++;
  }
});

tx();
audit({ user: 'system', action: 'auto categorize', note: `categorized=${changed}` });

const summary = db.prepare(`
  SELECT COALESCE(main_category, 'بدون تصنيف') category, COUNT(*) count
  FROM items
  GROUP BY COALESCE(main_category, 'بدون تصنيف')
  ORDER BY count DESC
`).all();

console.log(JSON.stringify({ changed, counts, summary }, null, 2));
