import { db } from '../db/connection.js';
import { defaultPermissions } from '../services/permissionsService.js';

export function findUser(username) {
  return db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
}

export function listUsers() {
  return db.prepare('SELECT id, username, display_name, role, is_active, permissions, created_at FROM users ORDER BY id').all()
    .map(u => ({ ...u, permissions: u.permissions ? JSON.parse(u.permissions) : defaultPermissions(u.role) }));
}

export function getUser(id) {
  const u = db.prepare('SELECT id, username, display_name, role, is_active, permissions, created_at FROM users WHERE id = ?').get(id);
  if (!u) return null;
  return { ...u, permissions: u.permissions ? JSON.parse(u.permissions) : defaultPermissions(u.role) };
}

export function createUser({ username, display_name, password_hash, role, permissions }) {
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) throw new Error('اسم المستخدم مستخدم مسبقاً');
  const perms = permissions ? JSON.stringify(permissions) : JSON.stringify(defaultPermissions(role));
  const res = db.prepare(
    `INSERT INTO users (username, display_name, password_hash, role, is_active, permissions, created_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`
  ).run(username, display_name, password_hash, role, perms, new Date().toISOString());
  return getUser(res.lastInsertRowid);
}

export function updateUser(id, { display_name, role, is_active, permissions }) {
  const fields = [], vals = [];
  if (display_name  !== undefined) { fields.push('display_name = ?');  vals.push(display_name); }
  if (role          !== undefined) { fields.push('role = ?');           vals.push(role); }
  if (is_active     !== undefined) { fields.push('is_active = ?');      vals.push(is_active); }
  if (permissions   !== undefined) { fields.push('permissions = ?');    vals.push(JSON.stringify(permissions)); }
  if (!fields.length) throw new Error('لا توجد بيانات للتحديث');
  vals.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  return getUser(id);
}

export function resetPassword(id, password_hash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, id);
  return getUser(id);
}

export const saveUser = createUser;
