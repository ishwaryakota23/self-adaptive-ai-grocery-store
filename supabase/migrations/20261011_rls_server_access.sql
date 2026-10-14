-- Keep application tables private to server APIs by default.
-- The current browser client performs a public products SELECT for its
-- Supabase connection diagnostic; that read remains explicitly allowed below.
-- All business writes use the server-only service_role client.

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customers',
    'verified_customer_emails',
    'customer_identity_tokens',
    'customer_preferences',
    'otps',
    'shopping_sessions',
    'customer_sessions',
    'carts',
    'categories',
    'products',
    'cart_items',
    'session_handoffs',
    'orders',
    'order_items',
    'payments',
    'sales',
    'inventory',
    'inventory_movements',
    'security_events',
    'manager_accounts',
    'manager_actions',
    'checkout_queues',
    'shopping_missions',
    'customer_requests',
    'store_events',
    'ai_recommendations',
    'shopping_session_state'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;

-- Product metadata is intentionally public for the connection diagnostic and
-- catalog display. No other table receives an anon/authenticated policy.
GRANT SELECT ON TABLE public.products TO anon, authenticated;
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Future tables created by this migration owner do not inherit broad API grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

