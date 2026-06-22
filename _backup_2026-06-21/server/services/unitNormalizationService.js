import { db } from '../db/connection.js';

export function normalizeUnit(original) {
  const value = String(original || '').trim();
  if (!value) return '';
  const row = db.prepare('SELECT normalized_value FROM unit_mappings WHERE original_value = ?').get(value);
  return row?.normalized_value || value;
}

export function unitMappings() {
  return db.prepare('SELECT * FROM unit_mappings ORDER BY original_value').all();
}
