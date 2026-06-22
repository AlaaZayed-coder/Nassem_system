import fs from 'node:fs';
import path from 'node:path';
import { db } from './connection.js';

const schemaPath = path.resolve(process.cwd(), 'server/db/schema.sql');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

console.log('تم تجهيز قاعدة البيانات.');
