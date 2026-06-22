import { db } from '../db/connection.js';
import { audit } from '../services/auditService.js';

const category = 'أصناف غير واضحة / تحتاج تنظيف';
const note = 'تم وضع الصنف في فئة تحتاج تنظيف لأنه لم يطابق قواعد التصنيف التلقائي';
const now = new Date().toISOString();

const result = db.prepare(`
  UPDATE items
  SET main_category = ?,
      notes = CASE
        WHEN notes IS NULL OR notes = '' THEN ?
        WHEN notes LIKE '%' || ? || '%' THEN notes
        ELSE notes || ' | ' || ?
      END,
      last_modified_by = 'system',
      last_modified_at = ?
  WHERE main_category IS NULL
     OR main_category = ''
     OR main_category LIKE '%?%'
`).run(category, note, note, note, now);

audit({ user: 'system', action: 'fix unclear category', note: `fixed=${result.changes}` });

console.log(JSON.stringify({
  fixed: result.changes,
  summary: db.prepare(`
    SELECT main_category category, COUNT(*) count
    FROM items
    GROUP BY main_category
    ORDER BY count DESC
  `).all()
}, null, 2));
