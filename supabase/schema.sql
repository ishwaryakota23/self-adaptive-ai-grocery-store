-- ==========================================================
-- GROCERAI DATABASE SCHEMA
-- Self-Adaptive AI Grocery Store Platform
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CUSTOMER SESSIONS (QR Handoff / Physical Store Shoppers)
CREATE TABLE IF NOT EXISTS customer_sessions (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'USER00001', 'USER00002'
    token VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'LARGE_DISPLAY' CHECK (device_type IN ('LARGE_DISPLAY', 'MOBILE', 'SYNCED')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 2. MANAGER ACCOUNTS (Authorized Internal Store Staff)
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

-- 3. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STORE_MANAGER')),
    language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'te', 'hi')),
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMER PREFERENCES
CREATE TABLE IF NOT EXISTS customer_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50) NOT NULL,
    dietary_preferences TEXT[] DEFAULT '{}',
    budget_min NUMERIC(10, 2) DEFAULT 0,
    budget_max NUMERIC(10, 2) DEFAULT 2000,
    preferred_brands TEXT[] DEFAULT '{}',
    disliked_brands TEXT[] DEFAULT '{}',
    voice_enabled BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- 6. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    weight_or_volume VARCHAR(50),
    image_url TEXT,
    aisle VARCHAR(50) NOT NULL,
    shelf_location VARCHAR(50),
    nutrition JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    rating NUMERIC(2, 1) DEFAULT 4.5,
    reviews_count INT DEFAULT 0,
    is_organic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
    quantity INT NOT NULL DEFAULT 0,
    reorder_threshold INT NOT NULL DEFAULT 10,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    max_capacity INT DEFAULT 100
);

-- 8. INVENTORY MOVEMENTS (Strictly records history; never overwritten)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255),
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('SALE', 'RESTOCK', 'ADJUSTMENT')),
    quantity_change INT NOT NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reason TEXT NOT NULL,
    related_order_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SHOPPING MISSIONS
CREATE TABLE IF NOT EXISTS shopping_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    budget NUMERIC(10, 2) DEFAULT 500.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SHOPPING MISSION ITEMS
CREATE TABLE IF NOT EXISTS shopping_mission_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID REFERENCES shopping_missions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'found', 'not_found')),
    aisle VARCHAR(50),
    found_at TIMESTAMPTZ,
    alternative_product_id UUID REFERENCES products(id) ON DELETE SET NULL
);

-- 11. CART ITEMS (Temporary shopping intent; NOT a purchase)
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, product_id)
);

-- 12. CUSTOMER REQUESTS & UNMET DEMAND
CREATE TABLE IF NOT EXISTS customer_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50),
    customer_name VARCHAR(255),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    request_text TEXT NOT NULL,
    request_count INT DEFAULT 1,
    mode VARCHAR(10) DEFAULT 'voice' CHECK (mode IN ('voice', 'chat')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('fulfilled', 'pending', 'unavailable')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. SUBSTITUTION RECORDS
CREATE TABLE IF NOT EXISTS substitutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_session_id VARCHAR(50) NOT NULL,
    requested_product_name VARCHAR(255) NOT NULL,
    requested_product_available BOOLEAN DEFAULT FALSE,
    substitute_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    substitute_product_name VARCHAR(255) NOT NULL,
    substitute_suggested BOOLEAN DEFAULT TRUE,
    substitute_accepted BOOLEAN DEFAULT FALSE,
    substitute_purchased BOOLEAN DEFAULT FALSE,
    related_order_id VARCHAR(100),
    quantity INT DEFAULT 1,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT FALSE,
    actions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. PAYMENTS (Tracks payment lifecycle before order confirmation)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(100),
    customer_session_id VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('CART', 'CHECKOUT', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'ORDER_CONFIRMED', 'CANCELLED')),
    transaction_ref VARCHAR(100),
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. ORDERS & ORDER ITEMS (ONLY created upon confirmed payment)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(100) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'PAYMENT_SUCCESS',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(100) REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

-- 17. SALES (Strictly populated upon completed order confirmation)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255),
    category_name VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'UPI',
    order_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. EVENT HISTORY (The unified behavioral and operational event stream)
CREATE TABLE IF NOT EXISTS event_history (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(60) NOT NULL,
    customer_session_id VARCHAR(50),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    store_id VARCHAR(50) DEFAULT 'BRANCH-104',
    source VARCHAR(30) DEFAULT 'LARGE_DISPLAY' CHECK (source IN ('LARGE_DISPLAY', 'MOBILE', 'SYSTEM')),
    related_order_id VARCHAR(100),
    related_action_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 19. STORE EVENTS
CREATE TABLE IF NOT EXISTS store_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    aisle VARCHAR(50),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'urgent')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. AISLE TRAFFIC
CREATE TABLE IF NOT EXISTS aisle_traffic (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aisle VARCHAR(50) NOT NULL,
    aisle_name VARCHAR(100) NOT NULL,
    customer_count INT DEFAULT 0,
    density VARCHAR(20) DEFAULT 'low' CHECK (density IN ('low', 'moderate', 'high', 'critical')),
    peak_hours VARCHAR(100),
    avg_dwell_time_mins NUMERIC(4, 1) DEFAULT 3.0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. CHECKOUT QUEUES
CREATE TABLE IF NOT EXISTS checkout_queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    counter_number INT NOT NULL,
    customer_count INT DEFAULT 0,
    estimated_wait_mins NUMERIC(4, 1) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'congested')),
    operator_name VARCHAR(100),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. AI RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    target_counter INT,
    suggested_action TEXT NOT NULL,
    confidence NUMERIC(3, 2) DEFAULT 0.90,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    expected_impact TEXT,
    historical_evidence TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed', 'modified')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. OPERATIONAL ACTIONS & OUTCOMES
CREATE TABLE IF NOT EXISTS operational_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_id UUID REFERENCES ai_recommendations(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'in_progress', 'completed')),
    approved_by VARCHAR(100) NOT NULL,
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    initial_state JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS action_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID REFERENCES operational_actions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    observed_event TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    reobserved_metric TEXT NOT NULL,
    outcome_summary TEXT NOT NULL,
    satisfaction_delta VARCHAR(50),
    sales_delta VARCHAR(50),
    is_hindsight_stored BOOLEAN DEFAULT TRUE,
    hindsight_id VARCHAR(100)
);

-- 24. HINDSIGHT MEMORY INSIGHTS
CREATE TABLE IF NOT EXISTS customer_memory_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    tag VARCHAR(100),
    confidence NUMERIC(3, 2) DEFAULT 0.90,
    times_applied INT DEFAULT 1,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_memory_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    observation TEXT NOT NULL,
    consequence TEXT NOT NULL,
    learned_rule TEXT NOT NULL,
    confidence NUMERIC(3, 2) DEFAULT 0.95,
    is_hindsight_synced BOOLEAN DEFAULT TRUE,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
