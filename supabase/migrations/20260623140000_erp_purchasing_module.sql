-- Add min_stock_level to erp_items
ALTER TABLE erp_items ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC DEFAULT 10;

-- Suppliers Table
CREATE TABLE IF NOT EXISTS erp_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  balance_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS erp_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES erp_suppliers(id) NOT NULL,
  status TEXT DEFAULT 'مسودة', -- 'مسودة', 'معتمد', 'مستلم', 'ملغي'
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  warehouse_id UUID REFERENCES erp_warehouses(id), -- Warehouse to receive the items into
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS erp_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID REFERENCES erp_purchase_orders(id) ON DELETE CASCADE,
  item_code TEXT REFERENCES erp_items(item_code) NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
