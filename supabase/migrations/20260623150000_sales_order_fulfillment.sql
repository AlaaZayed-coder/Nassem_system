-- Update sales order lines for smart routing
ALTER TABLE erp_sales_order_lines ADD COLUMN IF NOT EXISTS line_type TEXT DEFAULT 'product'; -- 'product' or 'maintenance'
ALTER TABLE erp_sales_order_lines ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending'; -- pending, ready, manufacturing, completed

-- Support for maintenance price being set later
ALTER TABLE erp_sales_orders ADD COLUMN IF NOT EXISTS is_final_price BOOLEAN DEFAULT true;
