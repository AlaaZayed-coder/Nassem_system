import { db } from '../db/connection.js';

export function audit({ user, action, item_code = null, field = null, old_value = null, new_value = null, note = null }) {
  db.prepare(`
    INSERT INTO audit_log (ts, user, action, item_code, field, old_value, new_value, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(new Date().toISOString(), user || null, action, item_code, field, stringify(old_value), stringify(new_value), note);
}

function stringify(value) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}
