import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const root = path.resolve(process.cwd());
const dbPath = path.resolve(root, process.env.DB_PATH || 'data/pricing.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const paths = {
  root,
  dbPath,
  imports: path.resolve(root, 'data/imports'),
  backups: path.resolve(root, 'backups'),
  exports: path.resolve(root, 'exports')
};

for (const dir of [paths.imports, paths.backups, paths.exports]) {
  fs.mkdirSync(dir, { recursive: true });
}
