-- Shared kiosk/mobile cart snapshot and optimistic concurrency revision.
-- Apply after schema.sql and migrations 20261006/20261009, and after seed.sql.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS app_product_id VARCHAR(100);

-- Map every current app catalog product to its database product row. The seed includes all 59 rows.
UPDATE public.products AS p
SET app_product_id = mappings.app_product_id
FROM (VALUES
('p1000000-0000-0000-0000-000000000001', 'prod-paneer'),
  ('p1000000-0000-0000-0000-000000000002', 'prod-tomatoes'),
  ('p1000000-0000-0000-0000-000000000003', 'prod-onions'),
  ('p1000000-0000-0000-0000-000000000004', 'prod-pasta'),
  ('p1000000-0000-0000-0000-000000000005', 'prod-oliveoil'),
  ('p1000000-0000-0000-0000-000000000006', 'prod-cheese'),
  ('p1000000-0000-0000-0000-000000000007', 'prod-garlic'),
  ('p1000000-0000-0000-0000-000000000008', 'prod-greekyogurt'),
  ('p1000000-0000-0000-0000-000000000009', 'prod-almondmilk'),
  ('p1000000-0000-0000-0000-000000000010', 'prod-quinoa'),
  ('p1000000-0000-0000-0000-000000000011', 'prod-tofu'),
  ('p1000000-0000-0000-0000-000000000012', 'prod-bread'),
  ('prod-taaza-milk', 'prod-taaza-milk'),
  ('prod-curd', 'prod-curd'),
  ('prod-sourdough', 'prod-sourdough'),
  ('prod-rolled-oats', 'prod-rolled-oats'),
  ('prod-avocado-oil', 'prod-avocado-oil'),
  ('prod-cheese-100g', 'prod-cheese-100g'),
  ('prod-taaza-milk-500ml', 'prod-taaza-milk-500ml'),
  ('prod-fortune-oil-1l', 'prod-fortune-oil-1l'),
  ('prod-fortune-oil-2l', 'prod-fortune-oil-2l'),
  ('prod-atta-1kg', 'prod-atta-1kg'),
  ('prod-atta-5kg', 'prod-atta-5kg'),
  ('prod-rice-1kg', 'prod-rice-1kg'),
  ('prod-rice-5kg', 'prod-rice-5kg'),
  ('prod-parleg-250g', 'prod-parleg-250g'),
  ('prod-oreo-120g', 'prod-oreo-120g'),
  ('prod-goodday-200g', 'prod-goodday-200g'),
  ('prod-maggi-70g', 'prod-maggi-70g'),
  ('prod-maggi-280g', 'prod-maggi-280g'),
  ('prod-cornflakes-475g', 'prod-cornflakes-475g'),
  ('prod-tajmahal-250g', 'prod-tajmahal-250g'),
  ('prod-nescafe-100g', 'prod-nescafe-100g'),
  ('prod-kissan-500g', 'prod-kissan-500g'),
  ('prod-nutella-350g', 'prod-nutella-350g'),
  ('prod-bread-english-oven', 'prod-bread-english-oven'),
  ('prod-bread-modern-brown', 'prod-bread-modern-brown'),
  ('prod-bread-britannia-wheat', 'prod-bread-britannia-wheat'),
  ('prod-pasta-barilla-penne', 'prod-pasta-barilla-penne'),
  ('prod-pasta-delmonte-fusilli', 'prod-pasta-delmonte-fusilli'),
  ('prod-spinach', 'prod-spinach'),
  ('prod-broccoli', 'prod-broccoli'),
  ('prod-carrots', 'prod-carrots'),
  ('prod-capsicum', 'prod-capsicum'),
  ('prod-potatoes', 'prod-potatoes'),
  ('prod-nandini-milk', 'prod-nandini-milk'),
  ('prod-amul-gold-milk', 'prod-amul-gold-milk'),
  ('prod-country-delight-milk', 'prod-country-delight-milk'),
  ('prod-curd-milky-mist', 'prod-curd-milky-mist'),
  ('prod-curd-mother-dairy', 'prod-curd-mother-dairy'),
  ('prod-amul-vanilla', 'prod-amul-vanilla'),
  ('prod-cornetto-choco', 'prod-cornetto-choco'),
  ('prod-havmor-belgian', 'prod-havmor-belgian'),
  ('prod-cadbury-silk', 'prod-cadbury-silk'),
  ('prod-ferrero-rocher', 'prod-ferrero-rocher'),
  ('prod-kitkat-share', 'prod-kitkat-share'),
  ('prod-amul-dark-choco', 'prod-amul-dark-choco'),
  ('prod-dark-fantasy', 'prod-dark-fantasy'),
  ('prod-mcvities-digestive', 'prod-mcvities-digestive')
) AS mappings(product_id, app_product_id)
WHERE p.id = mappings.product_id;

DO $$
DECLARE
  mapped_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT app_product_id) INTO mapped_count
  FROM public.products
  WHERE app_product_id IN ('prod-paneer', 'prod-tomatoes', 'prod-onions', 'prod-pasta', 'prod-oliveoil', 'prod-cheese', 'prod-garlic', 'prod-greekyogurt', 'prod-almondmilk', 'prod-quinoa', 'prod-tofu', 'prod-bread', 'prod-taaza-milk', 'prod-curd', 'prod-sourdough', 'prod-rolled-oats', 'prod-avocado-oil', 'prod-cheese-100g', 'prod-taaza-milk-500ml', 'prod-fortune-oil-1l', 'prod-fortune-oil-2l', 'prod-atta-1kg', 'prod-atta-5kg', 'prod-rice-1kg', 'prod-rice-5kg', 'prod-parleg-250g', 'prod-oreo-120g', 'prod-goodday-200g', 'prod-maggi-70g', 'prod-maggi-280g', 'prod-cornflakes-475g', 'prod-tajmahal-250g', 'prod-nescafe-100g', 'prod-kissan-500g', 'prod-nutella-350g', 'prod-bread-english-oven', 'prod-bread-modern-brown', 'prod-bread-britannia-wheat', 'prod-pasta-barilla-penne', 'prod-pasta-delmonte-fusilli', 'prod-spinach', 'prod-broccoli', 'prod-carrots', 'prod-capsicum', 'prod-potatoes', 'prod-nandini-milk', 'prod-amul-gold-milk', 'prod-country-delight-milk', 'prod-curd-milky-mist', 'prod-curd-mother-dairy', 'prod-amul-vanilla', 'prod-cornetto-choco', 'prod-havmor-belgian', 'prod-cadbury-silk', 'prod-ferrero-rocher', 'prod-kitkat-share', 'prod-amul-dark-choco', 'prod-dark-fantasy', 'prod-mcvities-digestive');
  IF mapped_count <> 59 THEN
    RAISE EXCEPTION 'Expected 59 mapped app catalog products, found %', mapped_count;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_app_product_id
  ON public.products (app_product_id) WHERE app_product_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.shopping_session_state (
  session_id VARCHAR(50) PRIMARY KEY REFERENCES public.shopping_sessions(session_id) ON DELETE CASCADE,
  customer_id VARCHAR(50) NOT NULL REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_handoffs_active_expiry
  ON public.session_handoffs (secure_token, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_session_state_customer
  ON public.shopping_session_state (customer_id, updated_at DESC);

ALTER TABLE public.shopping_session_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.shopping_session_state FROM anon, authenticated;
GRANT ALL ON TABLE public.shopping_session_state TO service_role;

-- Handoff tokens are bearer credentials and are accessed only by server APIs.
ALTER TABLE public.session_handoffs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.session_handoffs FROM anon, authenticated;
GRANT ALL ON TABLE public.session_handoffs TO service_role;
