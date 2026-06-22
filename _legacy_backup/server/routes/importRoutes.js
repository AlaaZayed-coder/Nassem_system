import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { paths } from '../db/connection.js';
import { confirmImport, previewImport } from '../services/importService.js';
import { canEdit } from '../middleware/roleMiddleware.js';

const upload = multer({ dest: paths.imports });
export const importRoutes = express.Router();

importRoutes.post('/preview', canEdit, upload.single('file'), (req, res, next) => {
  try { res.json({ filePath: req.file.path, ...previewImport(req.file.path) }); } catch (e) { next(e); }
});
importRoutes.post('/confirm', canEdit, (req, res, next) => {
  try {
    const filePath = path.resolve(req.body.filePath || '');
    if (!filePath.startsWith(paths.imports)) throw new Error('ملف الاستيراد غير صالح');
    res.json(confirmImport(filePath, req.user));
  } catch (e) { next(e); }
});
