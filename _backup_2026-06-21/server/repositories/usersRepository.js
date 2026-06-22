import { db } from '../db/connection.js';

export function findUser(username) {
  return db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
}

export function listUsers() {
  return db.prepare('SELECT id, username, display_name, role, is_active, created_at FROM users ORDER BY id').all();
}

export function saveUser({ username, display_name, password_hash, role, is_active = 1 }) {
  return db.prepare(`
    INSERT INTO users (username, display_name, password_hash, role, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(username, display_name, password_hash, role, is_active, new Date().toISOString());
}
