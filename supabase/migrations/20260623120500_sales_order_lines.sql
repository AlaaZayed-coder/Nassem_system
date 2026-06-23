CREATE TABLE IF NOT EXISTS erp_sales_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID REFERENCES erp_sales_orders(id) ON DELETE CASCADE,
  item_code TEXT REFERENCES erp_items(item_code),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  total_price_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
