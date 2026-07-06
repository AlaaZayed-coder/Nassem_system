-- Narrow fix (same pattern as 20260703000000_fix_rls_policies.sql): the new
-- erp_door_order_accessories table inherits RLS-enabled-with-no-policies
-- default, blocking approve_sales_order() from inserting accessory rows.
-- Scoped to this single new table only — no blanket erp_* access change.

ALTER TABLE public.erp_door_order_accessories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON public.erp_door_order_accessories;
CREATE POLICY allow_all_anon ON public.erp_door_order_accessories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
