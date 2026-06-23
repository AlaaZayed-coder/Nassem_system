ALTER TABLE erp_sales_order_lines ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE erp_sales_order_lines ADD COLUMN IF NOT EXISTS line_notes TEXT;
