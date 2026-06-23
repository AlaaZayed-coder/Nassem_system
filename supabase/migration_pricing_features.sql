-- =====================================================
-- Migration: Add Pricing Features from Old Project
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Extend erp_items with missing columns
ALTER TABLE erp_items
  ADD COLUMN IF NOT EXISTS proposed_name TEXT,
  ADD COLUMN IF NOT EXISTS name_status TEXT DEFAULT 'لا يوجد' CHECK (name_status IN ('لا يوجد','مقترح','معتمد')),
  ADD COLUMN IF NOT EXISTS original_unit TEXT,
  ADD COLUMN IF NOT EXISTS suggested_selling_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS pricing_method TEXT DEFAULT 'تكلفة + هامش',
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS cost_source TEXT,
  ADD COLUMN IF NOT EXISTS cost_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS raw_import JSONB,
  -- Door pricing
  ADD COLUMN IF NOT EXISTS door_pricing_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS door_unit_type TEXT DEFAULT 'قطعة' CHECK (door_unit_type IN ('قطعة','متر مربع','يدوي')),
  ADD COLUMN IF NOT EXISTS width NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS height NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS area NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS price_per_m2_cents INTEGER,
  ADD COLUMN IF NOT EXISTS price_without_installation_cents INTEGER,
  ADD COLUMN IF NOT EXISTS price_with_installation_cents INTEGER,
  ADD COLUMN IF NOT EXISTS installation_type TEXT DEFAULT 'لكل قطعة' CHECK (installation_type IN ('لكل قطعة','لكل متر مربع')),
  ADD COLUMN IF NOT EXISTS installation_fee_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installation_notes TEXT,
  ADD COLUMN IF NOT EXISTS manual_price_override BOOLEAN DEFAULT FALSE,
  -- Lock & audit
  ADD COLUMN IF NOT EXISTS price_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlock_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_modified_by TEXT,
  ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;

-- 2. Audit log table
CREATE TABLE IF NOT EXISTS erp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ DEFAULT NOW(),
  "user" TEXT,
  action TEXT,
  item_code TEXT,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_item_code ON erp_audit_log(item_code);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON erp_audit_log(ts DESC);

-- 3. Price history table
CREATE TABLE IF NOT EXISTS erp_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL,
  old_price_cents INTEGER,
  new_price_cents INTEGER,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_price_history_item ON erp_price_history(item_code);

-- 4. Unit mappings
CREATE TABLE IF NOT EXISTS erp_unit_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_value TEXT UNIQUE NOT NULL,
  normalized_value TEXT NOT NULL
);
INSERT INTO erp_unit_mappings (original_value, normalized_value) VALUES
  ('قطعه','قطعة'),('م.ط','متر'),('متر طول','متر'),
  ('SET','طقم'),('KIT','طقم'),('كيلو','كجم'),
  ('K.G','كجم'),('M2','م²'),('م مربع','م²')
ON CONFLICT (original_value) DO NOTHING;

-- 5. App settings
CREATE TABLE IF NOT EXISTS erp_app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT INTO erp_app_settings (key, value) VALUES
  ('currency','شيكل'),
  ('default_margin_percent','0'),
  ('rounding_rule','nearest_1'),
  ('tax_inclusive','false'),
  ('vat_percent','0')
ON CONFLICT (key) DO NOTHING;

-- 6. System users (custom auth)
CREATE TABLE IF NOT EXISTS erp_system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin','pricing_manager','viewer')),
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default users (password: ChangeMe123!)
-- Hash generated with bcrypt rounds=10
INSERT INTO erp_system_users (username, display_name, role, password_hash) VALUES
  ('admin','المدير','admin','$2b$10$YourHashHere'),
  ('naseem','نسيم','pricing_manager','$2b$10$YourHashHere')
ON CONFLICT (username) DO NOTHING;
