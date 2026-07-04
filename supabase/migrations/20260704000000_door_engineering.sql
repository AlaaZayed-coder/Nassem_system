-- Engineering calculation engine for door orders: weight, frame, springs, jamb.
-- erp_items and erp_door_order_items already have permissive RLS policies
-- from 20260703000000_fix_rls_policies.sql, so no RLS changes are needed here.

-- Item catalog: weight per m2, entered once per door type
ALTER TABLE erp_items ADD COLUMN IF NOT EXISTS weight_per_m2_kg NUMERIC;

-- Calculated/selected fields per door order item
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS is_industrial BOOLEAN DEFAULT false;
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS pipe_length_inch NUMERIC;
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS base_weight_kg NUMERIC;
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS final_weight_kg NUMERIC;
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS frame_type TEXT; -- '60/220' | '76/240'
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS jamb_type TEXT; -- '35' | '40' | '45'
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS spring_type TEXT; -- e.g. '1.3×60'
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS spring_count INTEGER;
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS spring_match_diff_kg NUMERIC;
ALTER TABLE erp_door_order_items ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ;
