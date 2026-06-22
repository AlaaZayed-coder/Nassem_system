import express from 'express';
import { db } from '../db/connection.js';

export const reportsRoutes = express.Router();

reportsRoutes.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    daily: {
      modifiedToday: db.prepare('SELECT COUNT(*) count FROM items WHERE date(last_modified_at)=date(?)').get(today).count,
      approvedToday: db.prepare("SELECT COUNT(*) count FROM items WHERE pricing_status='معتمد' AND date(last_modified_at)=date(?)").get(today).count,
      reviewToday: db.prepare("SELECT COUNT(*) count FROM items WHERE pricing_status='بحاجة مراجعة' AND date(last_modified_at)=date(?)").get(today).count,
      namesChangedToday: db.prepare("SELECT COUNT(*) count FROM audit_log WHERE field IN ('approved_name','proposed_name') AND date(ts)=date(?)").get(today).count,
      latest: db.prepare('SELECT item_code, original_name, approved_name, pricing_status, last_modified_by, last_modified_at FROM items WHERE last_modified_at IS NOT NULL ORDER BY last_modified_at DESC LIMIT 20').all()
    },
    remaining: {
      unpriced: count("pricing_status='غير مسعّر'"),
      working: count("pricing_status='قيد العمل'"),
      review: count("pricing_status='بحاجة مراجعة'"),
      noCategory: count("main_category IS NULL OR main_category=''"),
      noCost: count("cost_price_cents IS NULL"),
      noFinalPrice: count("final_selling_price_cents IS NULL"),
      noCostSource: count("cost_source IS NULL OR cost_source=''")
    },
    approved: db.prepare("SELECT item_code, original_name, approved_name, final_selling_price_cents, main_category FROM items WHERE pricing_status='معتمد' ORDER BY last_modified_at DESC LIMIT 50").all()
  });
});

function count(where) {
  return db.prepare(`SELECT COUNT(*) count FROM items WHERE ${where}`).get().count;
}
