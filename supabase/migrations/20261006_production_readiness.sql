-- ==========================================================
-- GROCERAI PRODUCTION MIGRATION
-- 20261006_production_readiness.sql
-- Harmonizes PostgreSQL schema for the GrocerAI prototype
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure VARCHAR(100) compatibility for product_id across catalog and ledgers
ALTER TABLE IF EXISTS public.categories ALTER COLUMN id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.products ALTER COLUMN id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.products ALTER COLUMN category_id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.cart_items ALTER COLUMN product_id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.inventory ALTER COLUMN product_id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.inventory_movements ALTER COLUMN product_id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.order_items ALTER COLUMN product_id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.sales ALTER COLUMN product_id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.customer_requests ALTER COLUMN product_id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.store_events ALTER COLUMN product_id TYPE VARCHAR(100);
ALTER TABLE IF EXISTS public.ai_recommendations ALTER COLUMN product_id TYPE VARCHAR(100);

-- 2. OTP persistence table for server-authoritative authentication
CREATE TABLE IF NOT EXISTS public.otps (
    phone VARCHAR(30) PRIMARY KEY,
    otp_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    attempts_left INT DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    last_requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customer Preferences table
CREATE TABLE IF NOT EXISTS public.customer_preferences (
    customer_id VARCHAR(50) PRIMARY KEY REFERENCES public.customers(customer_id) ON DELETE CASCADE,
    dietary_preferences TEXT[] DEFAULT '{}',
    preferred_brands TEXT[] DEFAULT '{}',
    disliked_brands TEXT[] DEFAULT '{}',
    budget_min NUMERIC(10, 2) DEFAULT 0,
    budget_max NUMERIC(10, 2) DEFAULT 5000,
    voice_enabled BOOLEAN DEFAULT TRUE,
    preferred_cuisine TEXT[] DEFAULT '{}',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ensure generic payment idempotency and metadata columns exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public.payments ADD COLUMN idempotency_key VARCHAR(100) UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'metadata') THEN
        ALTER TABLE public.payments ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 5. Ensure idempotency key on orders table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public.orders ADD COLUMN idempotency_key VARCHAR(100) UNIQUE;
    END IF;
END $$;

-- 6. Checkout Queues table (operational telemetry)
CREATE TABLE IF NOT EXISTS public.checkout_queues (
    id VARCHAR(100) PRIMARY KEY,
    counter_number INT NOT NULL,
    customer_count INT NOT NULL DEFAULT 0,
    estimated_wait_mins NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'congested', 'closed')),
    operator_name VARCHAR(100) NOT NULL DEFAULT 'Unassigned',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Indexes for high-performance server queries
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_customer ON public.shopping_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON public.carts(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON public.orders(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON public.security_events(timestamp DESC);
