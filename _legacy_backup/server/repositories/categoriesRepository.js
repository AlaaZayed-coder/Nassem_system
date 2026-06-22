import { db } from '../db/connection.js';

export function listCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY type, parent_id, name').all();
}

export function addCategory({ name, type, parent_id }) {
  return db.prepare('INSERT INTO categories (name, type, parent_id) VALUES (?, ?, ?)').run(name, type, parent_id || null);
}

export function updateCategory(id, patch) {
  const current = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  const next = { ...current, ...patch };
  db.prepare('UPDATE categories SET name = ?, is_active = ? WHERE id = ?').run(next.name, next.is_active, id);
  return next;
}
