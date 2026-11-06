-- Secret Calculator Connected Application
-- Normalized PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'AGENT', 'SUBDEALER')),
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dealer_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sales_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    winning_commission_dc NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    daily_sale_limit NUMERIC(12, 2) NOT NULL DEFAULT 50000.00,
    max_number_count INT NOT NULL DEFAULT 100,
    blocked_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
    allocated_games JSONB NOT NULL DEFAULT '["DR1", "KL", "DR6", "DR8"]'::jsonb,
    custom_prices JSONB NOT NULL DEFAULT '{"three_digit": {"c": 10, "d": 10}, "two_digit": {"c": 10, "d": 10}, "one_digit": {"c": 12, "d": 12}}'::jsonb,
    permissions JSONB NOT NULL DEFAULT '{"can_book": true, "can_view_reports": true, "can_view_last_sale": true}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prize_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_prize NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
    box_prize NUMERIC(10, 2) NOT NULL DEFAULT 3000.00,
    one_digit_prize NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    two_digit_prize NUMERIC(10, 2) NOT NULL DEFAULT 700.00,
    complementary_prize NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS draw_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_code VARCHAR(10) NOT NULL CHECK (game_code IN ('DR1', 'KL', 'DR6', 'DR8')),
    draw_date DATE NOT NULL,
    scheduled_close_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'PUBLISHED')),
    manual_override BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_game_draw_date UNIQUE (game_code, draw_date)
);

CREATE TABLE IF NOT EXISTS draw_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID UNIQUE NOT NULL REFERENCES draw_schedules(id) ON DELETE CASCADE,
    first_prize VARCHAR(10) DEFAULT NULL,
    second_prize VARCHAR(10) DEFAULT NULL,
    third_prize VARCHAR(10) DEFAULT NULL,
    fourth_prize VARCHAR(10) DEFAULT NULL,
    fifth_prize VARCHAR(10) DEFAULT NULL,
    complementary_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username_snapshot VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    draw_id UUID NOT NULL REFERENCES draw_schedules(id),
    game_code VARCHAR(10) NOT NULL,
    draw_date DATE NOT NULL,
    total_c_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_d_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    lsk_category VARCHAR(20) NOT NULL,
    booked_number VARCHAR(10) NOT NULL,
    count INT NOT NULL,
    unit_c_price NUMERIC(10, 2) NOT NULL,
    unit_d_price NUMERIC(10, 2) NOT NULL,
    total_c_amount NUMERIC(10, 2) NOT NULL,
    total_d_amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS winning_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES draw_schedules(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    bill_item_id UUID NOT NULL REFERENCES bill_items(id) ON DELETE CASCADE,
    winning_category VARCHAR(50) NOT NULL,
    matched_number VARCHAR(10) NOT NULL,
    match_count INT NOT NULL,
    prize_amount NUMERIC(12, 2) NOT NULL,
    dealer_commission NUMERIC(12, 2) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for high-performance reporting and lookups
CREATE INDEX IF NOT EXISTS idx_bills_user_draw ON bills(user_id, draw_id);
CREATE INDEX IF NOT EXISTS idx_bills_draw_date ON bills(draw_date, game_code);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_num ON bill_items(booked_number, lsk_category);
CREATE INDEX IF NOT EXISTS idx_draw_schedules_date_game ON draw_schedules(draw_date, game_code);
CREATE INDEX IF NOT EXISTS idx_winning_records_draw_bill ON winning_records(draw_id, bill_id);
