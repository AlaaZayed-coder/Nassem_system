-- Add item_source to erp_items
ALTER TABLE erp_items ADD COLUMN IF NOT EXISTS item_source TEXT DEFAULT 'manufactured'; -- 'manufactured' or 'purchased'

-- Create Purchase Requests table for handling shortages of purchased items
CREATE TABLE IF NOT EXISTS erp_purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID REFERENCES erp_sales_orders(id),
  item_code TEXT REFERENCES erp_items(item_code) NOT NULL,
  quantity NUMERIC NOT NULL,
  status TEXT DEFAULT 'قيد الانتظار', -- 'قيد الانتظار', 'مكتمل', 'ملغي'
  priority TEXT DEFAULT 'عالي',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
