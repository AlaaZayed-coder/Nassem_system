import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db/seed.js';
import { ensureDailyBackup } from './db/backup.js';
import { paths } from './db/connection.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { authRoutes } from './routes/authRoutes.js';
import { itemRoutes } from './routes/itemRoutes.js';
import { importRoutes } from './routes/importRoutes.js';
import { exportRoutes } from './routes/exportRoutes.js';
import { categoryRoutes } from './routes/categoryRoutes.js';
import { dashboardRoutes } from './routes/dashboardRoutes.js';
import { auditRoutes } from './routes/auditRoutes.js';
import { reportsRoutes } from './routes/reportsRoutes.js';
import { settingsRoutes } from './routes/settingsRoutes.js';
import { userRoutes } from './routes/userRoutes.js';

const app = express();
const port = Number(process.env.PORT || 3000);

ensureDailyBackup();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/exports', express.static(paths.exports));

app.use('/api/auth', authRoutes);
app.use('/api/items', requireAuth, itemRoutes);
app.use('/api/import', requireAuth, importRoutes);
app.use('/api/export', requireAuth, exportRoutes);
app.use('/api/categories', requireAuth, categoryRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/audit', requireAuth, auditRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/users', requireAuth, userRoutes);

const clientDist = path.resolve(process.cwd(), 'client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'حدث خطأ غير متوقع' });
});

app.listen(port, () => console.log(`نظام التسعير يعمل على http://localhost:${port}`));
