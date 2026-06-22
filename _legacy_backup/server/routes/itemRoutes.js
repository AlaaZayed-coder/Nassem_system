import express from 'express';
import { approveItem, bulkLock, bulkUnlock, bulkUpdate, getItem, listItems, nextUnpriced, setStatus, unlockItem, updateItem } from '../repositories/itemsRepository.js';
import { db } from '../db/connection.js';
import { canApprove, canEdit } from '../middleware/roleMiddleware.js';

export const itemRoutes = express.Router();

itemRoutes.get('/', (req, res) => res.json(listItems(req.query)));
itemRoutes.get('/next', (req, res) => res.json(nextUnpriced(req.query.main_category) || {}));
itemRoutes.get('/:code', (req, res) => {
  const item = getItem(req.params.code);
  item ? res.json(item) : res.status(404).json({ error: 'الصنف غير موجود' });
});
itemRoutes.put('/:code', canEdit, (req, res, next) => {
  try { res.json(updateItem(req.params.code, req.body, req.user)); } catch (e) { next(e); }
});
itemRoutes.post('/:code/approve', canApprove, (req, res, next) => {
  try { res.json(approveItem(req.params.code, req.user)); } catch (e) { next(e); }
});
itemRoutes.post('/:code/unlock', canApprove, (req, res, next) => {
  try { res.json(unlockItem(req.params.code, req.body.reason, req.user)); } catch (e) { next(e); }
});
itemRoutes.post('/:code/status', canEdit, (req, res, next) => {
  try { res.json(setStatus(req.params.code, req.body.status, req.body.reason, req.user)); } catch (e) { next(e); }
});
itemRoutes.post('/bulk/update', canEdit, (req, res, next) => {
  try { res.json({ updated: bulkUpdate(req.body.codes || [], req.body.patch || {}, req.user) }); } catch (e) { next(e); }
});
itemRoutes.post('/bulk/lock', canApprove, (req, res, next) => {
  try { res.json({ updated: bulkLock(req.body.codes || [], req.user) }); } catch (e) { next(e); }
});
itemRoutes.post('/bulk/unlock', canApprove, (req, res, next) => {
  try { res.json({ updated: bulkUnlock(req.body.codes || [], req.body.reason, req.user) }); } catch (e) { next(e); }
});
itemRoutes.get('/:code/price-history', (req, res) => {
  const rows = db.prepare('SELECT * FROM price_history WHERE item_code = ? ORDER BY changed_at DESC LIMIT 50').all(req.params.code);
  res.json(rows);
});
