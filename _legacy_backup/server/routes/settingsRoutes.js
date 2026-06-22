import express from 'express';
import { db } from '../db/connection.js';
import { backupInfo, backupNow } from '../services/backupService.js';
import { canAdmin } from '../middleware/roleMiddleware.js';
import { suggestCategory } from '../services/categorySuggestionService.js';

export const settingsRoutes = express.Router();

settingsRoutes.get('/', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('currency','default_margin_percent','rounding_rule','tax_inclusive','vat_percent')").all();
  res.json({ settings: Object.fromEntries(rows.map(r => [r.key, r.value])), backup: backupInfo() });
});

settingsRoutes.put('/', canAdmin, (req, res) => {
  const stmt = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const key of ['default_margin_percent', 'rounding_rule', 'tax_inclusive', 'vat_percent']) {
    if (key in req.body) stmt.run(key, String(req.body[key]));
  }
  res.json({ ok: true });
});

settingsRoutes.post('/backup', canAdmin, (_req, res) => res.json({ file: backupNow() }));

/* إعادة تصنيف الأصناف التي بدون تصنيف تلقائياً */
settingsRoutes.post('/auto-categorize', canAdmin, (_req, res) => {
  const items = db.prepare("SELECT item_code, original_name FROM items WHERE (main_category IS NULL OR main_category = '') AND pricing_status != 'مؤجّل'").all();
  let updated = 0;
  const stmt = db.prepare("UPDATE items SET main_category = ? WHERE item_code = ?");
  for (const item of items) {
    const cat = suggestCategory(item.original_name);
    if (cat) { stmt.run(cat, item.item_code); updated++; }
  }
  res.json({ total: items.length, updated, skipped: items.length - updated });
});
