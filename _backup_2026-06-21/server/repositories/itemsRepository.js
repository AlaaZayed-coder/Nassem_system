import { db } from '../db/connection.js';
import { audit } from '../services/auditService.js';
import { calculateDoor, calculateSuggested, moneyToCents, validateApproval } from '../services/pricingService.js';

const moneyFields = new Set([
  'cost_price', 'suggested_selling_price', 'final_selling_price', 'price_per_m2',
  'price_without_installation', 'installation_fee', 'price_with_installation'
]);

const allowedPatchFields = [
  'proposed_name', 'approved_name', 'name_status', 'name_change_reason', 'unit', 'main_category', 'sub_category',
  'pricing_method', 'cost_price_cents', 'cost_source', 'supplier', 'cost_date', 'profit_margin_percent',
  'suggested_selling_price_cents', 'final_selling_price_cents', 'pricing_status', 'review_reason', 'notes',
  'door_pricing_enabled', 'door_unit_type', 'width', 'height', 'area', 'price_per_m2_cents',
  'price_without_installation_cents', 'installation_type', 'installation_fee_cents',
  'price_with_installation_cents', 'installation_notes', 'manual_price_override'
];

export function mapPatch(input) {
  const patch = { ...input };
  for (const field of moneyFields) {
    if (field in patch) {
      patch[`${field}_cents`] = moneyToCents(patch[field]);
      delete patch[field];
    }
  }
  patch.suggested_selling_price_cents = calculateSuggested(patch.cost_price_cents, patch.profit_margin_percent);
  Object.assign(patch, calculateDoor(patch));
  return Object.fromEntries(Object.entries(patch).filter(([key]) => allowedPatchFields.includes(key)));
}

export function listItems(query = {}) {
  const where = [];
  const params = {};
  if (query.search) {
    where.push('(item_code LIKE @search OR original_name LIKE @search OR approved_name LIKE @search)');
    params.search = `%${query.search}%`;
  }
  for (const f of ['main_category', 'sub_category', 'unit', 'pricing_status', 'name_status', 'pricing_method', 'last_modified_by']) {
    if (query[f]) {
      where.push(`${f} = @${f}`);
      params[f] = query[f];
    }
  }
  if (query.door_pricing_enabled !== undefined && query.door_pricing_enabled !== '') {
    where.push('door_pricing_enabled = @door_pricing_enabled');
    params.door_pricing_enabled = Number(query.door_pricing_enabled);
  }
  if (query.needs_cleaning === '1') where.push("(main_category = 'أصناف غير واضحة / تحتاج تنظيف' OR notes LIKE '%تحتاج تنظيف%')");
  if (query.missing_cost === '1') where.push('cost_price_cents IS NULL');
  if (query.missing_final_price === '1') where.push('final_selling_price_cents IS NULL');
  if (query.no_category === '1') where.push("(main_category IS NULL OR main_category = '')");
  if (query.from) { where.push('date(last_modified_at) >= date(@from)'); params.from = query.from; }
  if (query.to) { where.push('date(last_modified_at) <= date(@to)'); params.to = query.to; }
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(200, Math.max(20, Number(query.pageSize || 50)));
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortMap = {
    code: 'item_code COLLATE NOCASE ASC',
    name: 'COALESCE(approved_name, original_name) COLLATE NOCASE ASC',
    status: 'pricing_status COLLATE NOCASE ASC, item_code COLLATE NOCASE ASC',
    modified: 'last_modified_at DESC NULLS LAST, item_code COLLATE NOCASE ASC',
    price: 'final_selling_price_cents DESC NULLS LAST, item_code COLLATE NOCASE ASC'
  };
  const orderBy = sortMap[query.sort] || sortMap.code;
  const total = db.prepare(`SELECT COUNT(*) AS count FROM items ${clause}`).get(params).count;
  const rows = db.prepare(`
    SELECT * FROM items ${clause}
    ORDER BY ${orderBy}
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });
  return { rows, total, page, pageSize };
}

export function getItem(itemCode) {
  return db.prepare('SELECT * FROM items WHERE item_code = ?').get(itemCode);
}

export function insertItem(item) {
  const keys = Object.keys(item);
  const placeholders = keys.map(k => `@${k}`).join(', ');
  db.prepare(`INSERT INTO items (${keys.join(', ')}) VALUES (${placeholders})`).run(item);
}

export function updateItem(itemCode, input, user, action = 'save draft') {
  const current = getItem(itemCode);
  if (!current) throw new Error('الصنف غير موجود');
  if (current.price_locked && ['cost_price_cents', 'profit_margin_percent', 'final_selling_price_cents'].some(k => k in input)) {
    throw new Error('الصنف مثبت. يجب فك التثبيت قبل تعديل السعر.');
  }
  const patch = mapPatch({ ...current, ...input });
  if (!['بحاجة مراجعة', 'معتمد'].includes(current.pricing_status) && action === 'save draft') patch.pricing_status = 'قيد العمل';
  patch.last_modified_by = user.username;
  patch.last_modified_at = new Date().toISOString();
  const keys = Object.keys(patch);
  db.prepare(`UPDATE items SET ${keys.map(k => `${k} = @${k}`).join(', ')} WHERE item_code = @item_code`).run({ ...patch, item_code: itemCode });
  for (const key of keys) {
    if (String(current[key] ?? '') !== String(patch[key] ?? '')) audit({ user: user.username, action, item_code: itemCode, field: key, old_value: current[key], new_value: patch[key] });
  }
  return getItem(itemCode);
}

export function approveItem(itemCode, user) {
  const item = getItem(itemCode);
  const error = validateApproval(item);
  if (error) throw new Error(error);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE items SET pricing_status = 'معتمد', price_locked = 1, locked_by = ?, locked_at = ?,
    last_modified_by = ?, last_modified_at = ? WHERE item_code = ?
  `).run(user.username, now, user.username, now, itemCode);
  db.prepare(`
    INSERT INTO price_history (item_code, old_price_cents, new_price_cents, changed_by, changed_at, reason)
    VALUES (?, ?, ?, ?, ?, 'اعتماد التسعير')
  `).run(itemCode, item.final_selling_price_cents, item.final_selling_price_cents, user.username, now);
  audit({ user: user.username, action: 'approve pricing', item_code: itemCode, note: 'تم اعتماد وتثبيت السعر' });
  return getItem(itemCode);
}

export function unlockItem(itemCode, reason, user) {
  if (!reason) throw new Error('سبب فك التثبيت مطلوب');
  const item = getItem(itemCode);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE items SET price_locked = 0, pricing_status = 'قيد العمل', unlock_reason = ?,
    last_modified_by = ?, last_modified_at = ? WHERE item_code = ?
  `).run(reason, user.username, now, itemCode);
  db.prepare(`
    INSERT INTO price_history (item_code, old_price_cents, new_price_cents, changed_by, changed_at, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(itemCode, item.final_selling_price_cents, item.final_selling_price_cents, user.username, now, reason);
  audit({ user: user.username, action: 'unlock price', item_code: itemCode, note: reason });
  return getItem(itemCode);
}

export function setStatus(itemCode, status, reason, user) {
  if (status === 'بحاجة مراجعة' && !reason) throw new Error('سبب المراجعة مطلوب');
  const now = new Date().toISOString();
  db.prepare('UPDATE items SET pricing_status = ?, review_reason = COALESCE(?, review_reason), last_modified_by = ?, last_modified_at = ? WHERE item_code = ?')
    .run(status, reason || null, user.username, now, itemCode);
  audit({ user: user.username, action: status, item_code: itemCode, note: reason });
  return getItem(itemCode);
}

export function nextUnpriced(category = '') {
  return category
    ? db.prepare("SELECT item_code FROM items WHERE pricing_status = 'غير مسعّر' AND main_category = ? ORDER BY item_code COLLATE NOCASE LIMIT 1").get(category)
    : db.prepare("SELECT item_code FROM items WHERE pricing_status = 'غير مسعّر' ORDER BY item_code COLLATE NOCASE LIMIT 1").get();
}

export function bulkUpdate(codes, patchInput, user) {
  const patch = mapPatch(patchInput);
  delete patch.suggested_selling_price_cents;
  const keys = Object.keys(patch);
  if (!codes.length || !keys.length) return 0;
  const tx = db.transaction(() => {
    for (const code of codes) {
      const item = getItem(code);
      if (!item || item.price_locked) continue;
      db.prepare(`UPDATE items SET ${keys.map(k => `${k} = @${k}`).join(', ')}, last_modified_by = @user, last_modified_at = @now WHERE item_code = @code`)
        .run({ ...patch, user: user.username, now: new Date().toISOString(), code });
      audit({ user: user.username, action: 'bulk edit', item_code: code, new_value: patch });
    }
  });
  tx();
  return codes.length;
}

export function bulkLock(codes, user) {
  const now = new Date().toISOString();
  let updated = 0;
  const tx = db.transaction(() => {
    for (const code of codes) {
      const item = getItem(code);
      if (!item || item.price_locked) continue;
      db.prepare(`
        UPDATE items SET price_locked = 1, pricing_status = 'معتمد', locked_by = ?, locked_at = ?,
        last_modified_by = ?, last_modified_at = ? WHERE item_code = ?
      `).run(user.username, now, user.username, now, code);
      db.prepare(`
        INSERT INTO price_history (item_code, old_price_cents, new_price_cents, changed_by, changed_at, reason)
        VALUES (?, ?, ?, ?, ?, 'تثبيت جماعي')
      `).run(code, item.final_selling_price_cents, item.final_selling_price_cents, user.username, now);
      audit({ user: user.username, action: 'bulk lock', item_code: code });
      updated++;
    }
  });
  tx();
  return updated;
}

export function bulkUnlock(codes, reason, user) {
  if (!reason) throw new Error('سبب فك التثبيت مطلوب');
  const now = new Date().toISOString();
  let updated = 0;
  const tx = db.transaction(() => {
    for (const code of codes) {
      const item = getItem(code);
      if (!item || !item.price_locked) continue;
      db.prepare(`
        UPDATE items SET price_locked = 0, pricing_status = 'قيد العمل', unlock_reason = ?,
        last_modified_by = ?, last_modified_at = ? WHERE item_code = ?
      `).run(reason, user.username, now, code);
      db.prepare(`
        INSERT INTO price_history (item_code, old_price_cents, new_price_cents, changed_by, changed_at, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(code, item.final_selling_price_cents, item.final_selling_price_cents, user.username, now, reason);
      audit({ user: user.username, action: 'bulk unlock', item_code: code, note: reason });
      updated++;
    }
  });
  tx();
  return updated;
}
