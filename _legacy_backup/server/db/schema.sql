CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  item_code TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  proposed_name TEXT,
  approved_name TEXT,
  name_status TEXT DEFAULT 'لا يوجد',
  name_change_reason TEXT,
  original_unit TEXT,
  unit TEXT,
  main_category TEXT,
  sub_category TEXT,
  pricing_method TEXT DEFAULT 'تكلفة + هامش',
  cost_price_cents INTEGER,
  cost_source TEXT,
  supplier TEXT,
  cost_date TEXT,
  profit_margin_percent REAL,
  suggested_selling_price_cents INTEGER,
  final_selling_price_cents INTEGER,
  pricing_status TEXT DEFAULT 'غير مسعّر',
  review_reason TEXT,
  price_locked INTEGER DEFAULT 0,
  locked_by TEXT,
  locked_at TEXT,
  unlock_reason TEXT,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  raw_import TEXT,
  last_modified_by TEXT,
  last_modified_at TEXT,
  door_pricing_enabled INTEGER DEFAULT 0,
  door_unit_type TEXT,
  width REAL,
  height REAL,
  area REAL,
  price_per_m2_cents INTEGER,
  price_without_installation_cents INTEGER,
  installation_type TEXT,
  installation_fee_cents INTEGER,
  price_with_installation_cents INTEGER,
  installation_notes TEXT,
  manual_price_override INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_id INTEGER,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS unit_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_value TEXT UNIQUE NOT NULL,
  normalized_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  user TEXT,
  action TEXT NOT NULL,
  item_code TEXT,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT NOT NULL,
  old_price_cents INTEGER,
  new_price_cents INTEGER,
  changed_by TEXT,
  changed_at TEXT,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_main_category ON items(main_category);
CREATE INDEX IF NOT EXISTS idx_items_pricing_status ON items(pricing_status);
CREATE INDEX IF NOT EXISTS idx_items_approved_name ON items(approved_name);
CREATE INDEX IF NOT EXISTS idx_items_original_name ON items(original_name);
CREATE INDEX IF NOT EXISTS idx_items_last_modified_at ON items(last_modified_at);
CREATE INDEX IF NOT EXISTS idx_audit_item_code ON audit_log(item_code);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
