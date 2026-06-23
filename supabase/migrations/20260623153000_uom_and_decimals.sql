-- Add unit of measure to items
ALTER TABLE erp_items ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'وحدة';

-- Convert integer quantities to numeric to support decimals (meters, kg, etc.)
ALTER TABLE erp_inventory ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC;
ALTER TABLE erp_inventory_transactions ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC;
ALTER TABLE erp_sales_order_lines ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC;
ALTER TABLE erp_production_orders ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC;
ALTER TABLE erp_production_materials ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC;
