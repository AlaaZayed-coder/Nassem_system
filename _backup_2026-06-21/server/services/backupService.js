import fs from 'node:fs';
import path from 'node:path';
import { paths } from '../db/connection.js';
import { backupNow } from '../db/backup.js';

export function backupInfo() {
  const files = fs.existsSync(paths.backups)
    ? fs.readdirSync(paths.backups).filter(f => f.endsWith('.db')).sort()
    : [];
  return {
    dbPath: paths.dbPath,
    backupPath: paths.backups,
    lastBackup: files.at(-1) || '',
    lastBackupFullPath: files.at(-1) ? path.join(paths.backups, files.at(-1)) : ''
  };
}

export { backupNow };
