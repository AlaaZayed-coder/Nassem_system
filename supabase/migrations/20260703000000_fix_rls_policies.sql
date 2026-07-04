-- Narrow fix: erp_customers currently has RLS enabled with no policies
-- (likely toggled on via the Supabase dashboard table editor), which blocks
-- creating any new customer app-wide. This migration opens read/write only
-- for the specific tables touched by this session's work (customer
-- creation + door orders), via the anon/authenticated roles the app's
-- single publishable key uses. It intentionally does NOT touch any other
-- erp_* table — a broader, permanent access-control model (real user
-- accounts/auth) is deferred to a future task.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['erp_customers', 'erp_door_orders', 'erp_door_order_items', 'erp_door_order_electronics']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS allow_all_anon ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY allow_all_anon ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;
