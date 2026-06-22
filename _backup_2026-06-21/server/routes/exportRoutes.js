import express from 'express';
import path from 'node:path';
import { createExport } from '../services/exportService.js';
import { canExport } from '../middleware/roleMiddleware.js';

export const exportRoutes = express.Router();

exportRoutes.post('/', canExport, (req, res, next) => {
  try {
    const file = createExport(req.body.filters || {}, req.body.format || 'xlsx', req.user);
    res.json({ file: `/exports/${path.basename(file)}` });
  } catch (e) { next(e); }
});
