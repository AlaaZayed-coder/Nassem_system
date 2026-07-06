-- Narrow fix (same pattern as 20260703000000_fix_rls_policies.sql): the
-- motor-accessory purchasing path (approve_sales_order -> erp_purchase_requests)
-- is the first code path to actually INSERT into this table live; it has
-- RLS-enabled-with-no-policies default, blocking the insert. Scoped to this
-- single table only — no blanket erp_* access change.

ALTER TABLE public.erp_purchase_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON public.erp_purchase_requests;
CREATE POLICY allow_all_anon ON public.erp_purchase_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
