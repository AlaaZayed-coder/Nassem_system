import express from 'express';
import { db } from '../db/connection.js';

export const dashboardRoutes = express.Router();

dashboardRoutes.get('/', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) count FROM items').get().count;
  const statusRows = db.prepare('SELECT pricing_status status, COUNT(*) count FROM items GROUP BY pricing_status').all();
  const byStatus = Object.fromEntries(statusRows.map(r => [r.status, r.count]));
  const today = new Date().toISOString().slice(0, 10);
  const modifiedToday = db.prepare('SELECT COUNT(*) count FROM items WHERE date(last_modified_at) = date(?)').get(today).count;
  const approvedToday = db.prepare("SELECT COUNT(*) count FROM items WHERE pricing_status = 'معتمد' AND date(last_modified_at) = date(?)").get(today).count;
  const categoryRows = db.prepare(`
    SELECT COALESCE(main_category, 'بدون تصنيف') category, COUNT(*) total,
      SUM(CASE WHEN pricing_status='معتمد' THEN 1 ELSE 0 END) approved,
      SUM(CASE WHEN pricing_status='قيد العمل' THEN 1 ELSE 0 END) working,
      SUM(CASE WHEN pricing_status='بحاجة مراجعة' THEN 1 ELSE 0 END) review,
      SUM(CASE WHEN pricing_status='غير مسعّر' THEN 1 ELSE 0 END) unpriced,
      SUM(CASE WHEN pricing_status='مؤجّل' THEN 1 ELSE 0 END) postponed
    FROM items GROUP BY COALESCE(main_category, 'بدون تصنيف') ORDER BY total DESC
  `).all();
  const activeDays = db.prepare(`
    SELECT date(changed_at) d, COUNT(*) c FROM price_history
    WHERE reason = 'اعتماد التسعير' GROUP BY date(changed_at) ORDER BY d DESC LIMIT 7
  `).all();
  const avg = activeDays.length ? activeDays.reduce((s, r) => s + r.c, 0) / activeDays.length : 0;
  const remaining = total - (byStatus['معتمد'] || 0);
  res.json({
    total,
    byStatus,
    progress: total ? Math.round(((byStatus['معتمد'] || 0) / total) * 100) : 0,
    modifiedToday,
    approvedToday,
    averageDailyApproved: avg ? Number(avg.toFixed(1)) : 0,
    estimatedRemainingDays: avg ? Math.ceil(remaining / avg) : null,
    categories: categoryRows
  });
});
