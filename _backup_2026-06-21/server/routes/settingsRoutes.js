import express from 'express';
import { db } from '../db/connection.js';
import { backupInfo, backupNow } from '../services/backupService.js';
import { canAdmin } from '../middleware/roleMiddleware.js';

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

settingsRoutes.post('/backup', canAdmin, (req, res) => res.json({ file: backupNow() }));
