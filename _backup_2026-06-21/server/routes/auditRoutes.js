import express from 'express';
import { db } from '../db/connection.js';

export const auditRoutes = express.Router();

auditRoutes.get('/', (req, res) => {
  const where = [];
  const params = {};
  for (const key of ['item_code', 'user', 'action']) {
    if (req.query[key]) { where.push(`${key} LIKE @${key}`); params[key] = `%${req.query[key]}%`; }
  }
  if (req.query.from) { where.push('date(ts) >= date(@from)'); params.from = req.query.from; }
  if (req.query.to) { where.push('date(ts) <= date(@to)'); params.to = req.query.to; }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  res.json(db.prepare(`SELECT * FROM audit_log ${clause} ORDER BY ts DESC LIMIT 500`).all(params));
});
