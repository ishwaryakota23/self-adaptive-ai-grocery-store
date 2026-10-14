-- ==========================================================
-- GROCERAI DATABASE SCHEMA
-- Self-Adaptive AI Grocery Store Platform
-- Persistent Source of Truth: Customer Identity, Sessions,
-- Carts, Orders, Payments, Sales, Inventory & Security
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 1. CUSTOMERS (Persistent Customer Identity)
-- WhatsApp number serves as official verified identity channel
-- ==========================================================
CREATE TABLE IF NOT EXISTS customers (
    customer_id VARCHAR(50) PRIMARY KEY, -- e.g. 'CUST-1001'
    email VARCHAR(320) UNIQUE,
    email_verified_at TIMESTAMPTZ,
    whatsapp_number VARCHAR(30) UNIQUE, -- optional legacy channel
    name VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'te', 'hi')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verified_customer_emails (
    email VARCHAR(320) PRIMARY KEY,
    verified_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 2. CUSTOMER IDENTITY TOKENS / CUSTOMER QR
-- Persistent QR generated upon registration, delivered via WhatsApp
-- ==========================================================
CREATE TABLE IF NOT EXISTS customer_identity_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50) REFERENCES customers(customer_id) ON DELETE CASCADE,
    secure_token VARCHAR(255) UNIQUE NOT NULL, -- signed/opaque token e.g. 'CID_SEC_...'
    qr_payload TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    delivered_via_email BOOLEAN DEFAULT FALSE,
    delivered_via_whatsapp BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- ==========================================================
-- 3. CUSTOMER PREFERENCES & PROFILE
-- ==========================================================
CREATE TABLE IF NOT EXISTS customer_preferences (
    customer_id VARCHAR(50) PRIMARY KEY REFERENCES customers(customer_id) ON DELETE CASCADE,
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

-- ==========================================================
-- 4. OTPS (Cryptographic One-Time Passwords)
-- ==========================================================
CREATE TABLE IF NOT EXISTS otps (
    phone VARCHAR(320) PRIMARY KEY,
    otp_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    attempts_left INT DEFAULT 3,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 5. SHOPPING SESSIONS
-- Ephemeral visit-specific session (never mixed with customer identity)
-- ==========================================================
CREATE TABLE IF NOT EXISTS shopping_sessions (
    session_id VARCHAR(50) PRIMARY KEY, -- e.g. 'SESS-5001'
    customer_id VARCHAR(50) REFERENCES customers(customer_id) ON DELETE CASCADE,
    device_type VARCHAR(50) DEFAULT 'KIOSK' CHECK (device_type IN ('KIOSK', 'MOBILE', 'SYNCED', 'LARGE_DISPLAY')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    interaction_mode VARCHAR(20) DEFAULT 'voice' CHECK (interaction_mode IN ('voice', 'chat', 'browse')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Backward compatibility alias view/table
CREATE TABLE IF NOT EXISTS customer_sessions (
    id VARCHAR(50) PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'LARGE_DISPLAY',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- ==========================================================
-- 6. CARTS
-- Scoped to a specific session and customer. Always new & empty per visit.
-- ==========================================================
CREATE TABLE IF NOT EXISTS carts (
    cart_id VARCHAR(50) PRIMARY KEY, -- e.g. 'CART-9001'
    session_id VARCHAR(50) REFERENCES shopping_sessions(session_id) ON DELETE CASCADE,
    customer_id VARCHAR(50) REFERENCES customers(customer_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'checked_out', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 7. CATEGORIES & PRODUCTS (Store Catalog Seed)
-- ==========================================================
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(100) REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    discount_percentage NUMERIC(5, 2) DEFAULT 0,
    weight_or_volume VARCHAR(50),
    image_url TEXT,
    aisle VARCHAR(50) NOT NULL,
    shelf_location VARCHAR(100),
    nutrition JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    rating NUMERIC(2, 1) DEFAULT 4.5,
    reviews_count INT DEFAULT 0,
    is_organic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 8. CART ITEMS (Explicit selections by shopper during this session)
-- ==========================================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id VARCHAR(50) REFERENCES carts(cart_id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES shopping_sessions(session_id) ON DELETE CASCADE,
    customer_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);

-- ==========================================================
-- 9. SESSION QR / SESSION HANDOFFS
-- Temporary, session-bound handoff token for transferring session to mobile
-- ==========================================================
CREATE TABLE IF NOT EXISTS session_handoffs (
    handoff_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(50) REFERENCES shopping_sessions(session_id) ON DELETE CASCADE,
    customer_id VARCHAR(50) REFERENCES customers(customer_id) ON DELETE CASCADE,
    secure_token VARCHAR(255) UNIQUE NOT NULL, -- e.g. 'SQ_HANDOFF_...'
    qr_payload TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);

-- ==========================================================
-- 10. ORDERS & ORDER ITEMS
-- Created ONLY after verified successful payment
-- ==========================================================
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'ord-104921'
    customer_id VARCHAR(50) REFERENCES customers(customer_id) ON DELETE SET NULL,
    session_id VARCHAR(50) REFERENCES shopping_sessions(session_id) ON DELETE SET NULL,
    cart_id VARCHAR(50),
    total_amount NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'PAYMENT_SUCCESS',
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'processing', 'cancelled')),
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(100) REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL
);

-- ==========================================================
-- 11. PAYMENTS (Historical records only; demo checkout creates no payment rows)
-- Generic ledger retained for compatibility with prior records.
-- ==========================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(100),
    customer_id VARCHAR(50),
    session_id VARCHAR(50),
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('initiated', 'pending', 'successful', 'failed', 'cancelled')),
    transaction_ref VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 12. SALES (Authoritative financial record of completed transactions)
-- ==========================================================
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(100) REFERENCES orders(id) ON DELETE SET NULL,
    customer_id VARCHAR(50),
    session_id VARCHAR(50),
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    category_name VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    sold_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 13. INVENTORY & INVENTORY MOVEMENTS (Double-entry stock ledger)
-- ==========================================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE CASCADE UNIQUE,
    quantity INT NOT NULL DEFAULT 0,
    reorder_threshold INT NOT NULL DEFAULT 10,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    max_capacity INT DEFAULT 100
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255),
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('SALE', 'RESTOCK', 'ADJUSTMENT')),
    quantity_change INT NOT NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reason TEXT NOT NULL,
    related_order_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 14. SECURITY EVENTS (Security Agent Audit Log)
-- ==========================================================
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(80) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    customer_id VARCHAR(50),
    session_id VARCHAR(50),
    details TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 15. MANAGER ACCOUNTS & AUDIT
-- ==========================================================
CREATE TABLE IF NOT EXISTS manager_accounts (
    employee_id VARCHAR(50) PRIMARY KEY, -- e.g. 'EMP-1042'
    dob VARCHAR(10) NOT NULL, -- 'YYYY-MM-DD'
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'STORE_MANAGER' CHECK (role IN ('STORE_MANAGER', 'ADMIN')),
    branch_id VARCHAR(50) NOT NULL DEFAULT 'BRANCH-104',
    branch_name VARCHAR(255) DEFAULT 'Indiranagar Flagship',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manager_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id VARCHAR(50) REFERENCES manager_accounts(employee_id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    details TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 16. STORE TELEMETRY, QUEUES & RECOMMENDATIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS checkout_queues (
    id VARCHAR(100) PRIMARY KEY,
    counter_number INT NOT NULL,
    customer_count INT NOT NULL DEFAULT 0,
    estimated_wait_mins NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'congested', 'closed')),
    operator_name VARCHAR(100) NOT NULL DEFAULT 'Unassigned',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    budget NUMERIC(10, 2) DEFAULT 500.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50),
    customer_name VARCHAR(255),
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    request_text TEXT NOT NULL,
    request_count INT DEFAULT 1,
    mode VARCHAR(10) DEFAULT 'voice' CHECK (mode IN ('voice', 'chat')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('fulfilled', 'pending', 'unavailable')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL,
    aisle VARCHAR(50),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'urgent')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL,
    target_counter INT,
    suggested_action TEXT NOT NULL,
    confidence NUMERIC(3, 2) DEFAULT 0.90,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    expected_impact TEXT,
    historical_evidence TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed', 'modified')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 17. PERFORMANCE INDEXES
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_customer ON shopping_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
