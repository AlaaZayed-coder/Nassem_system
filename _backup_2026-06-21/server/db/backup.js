import fs from 'node:fs';
import path from 'node:path';
import { db, paths } from './connection.js';

export function backupNow() {
  fs.mkdirSync(paths.backups, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const target = path.join(paths.backups, `pricing-${stamp}.db`);
  db.pragma('wal_checkpoint(FULL)');
  fs.copyFileSync(paths.dbPath, target);
  return target;
}

export function ensureDailyBackup() {
  if (!fs.existsSync(paths.dbPath)) return null;
  const stamp = new Date().toISOString().slice(0, 10);
  const target = path.join(paths.backups, `pricing-${stamp}.db`);
  if (!fs.existsSync(target)) {
    db.pragma('wal_checkpoint(FULL)');
    fs.copyFileSync(paths.dbPath, target);
  }
  return target;
}
