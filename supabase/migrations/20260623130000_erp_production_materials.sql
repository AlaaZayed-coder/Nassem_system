CREATE TABLE IF NOT EXISTS erp_production_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_order_id UUID REFERENCES erp_production_orders(id) ON DELETE CASCADE,
  item_code TEXT REFERENCES erp_items(item_code) NOT NULL,
  quantity_used NUMERIC NOT NULL,
  warehouse_id UUID REFERENCES erp_warehouses(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We do not deduct inventory automatically here because inventory 
-- is calculated dynamically from erp_inventory_movements.
-- So when a material is added to erp_production_materials, we should ALSO 
-- insert a record into erp_inventory_movements with type 'OUT' (Consumption).
