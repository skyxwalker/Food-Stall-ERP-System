-- =====================================================
-- FOOD STALL POS - COMPLETE DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee', 'server')),
  employee_code VARCHAR(50),
  confirmation_mode VARCHAR(20) DEFAULT 'manual' CHECK (confirmation_mode IN ('manual', 'auto')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default users
INSERT INTO users (username, password, role, employee_code, confirmation_mode) VALUES
  ('Admin123', 'Admin123', 'admin', NULL, 'manual'),
  ('emp1', 'emp1', 'employee', 'emp1', 'manual'),
  ('emp2', 'emp2', 'employee', 'emp2', 'manual'),
  ('emp3', 'emp3', 'employee', 'emp3', 'manual'),
  ('emp4', 'emp4', 'employee', 'emp4', 'auto'),
  ('server1', 'server1', 'server', 'srv1', 'manual');

-- =====================================================
-- 2. ITEMS TABLE
-- =====================================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock_type VARCHAR(20) NOT NULL CHECK (stock_type IN ('fixed', 'unlimited')),
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  assigned_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. SALES TABLE
-- =====================================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  token_number INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'credit')),
  credit_customer_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MIGRATION: Add token_number column if table already exists
-- Run this if you're upgrading an existing database:
-- ALTER TABLE sales ADD COLUMN IF NOT EXISTS token_number INTEGER NOT NULL DEFAULT 1;
-- =====================================================

-- =====================================================
-- 4. ORDER ITEMS TABLE (Junction table for sales-items)
-- =====================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  item_name VARCHAR(100) NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. STOCK LOGS TABLE
-- =====================================================
CREATE TABLE stock_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  change INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('sale', 'admin_update', 'initial')),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. COST ENTRIES TABLE
-- =====================================================
CREATE TABLE cost_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_cost DECIMAL(10, 2) NOT NULL CHECK (total_cost >= 0),
  description TEXT,
  common_name VARCHAR(100),
  cost_type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (cost_type IN ('individual', 'combined', 'general')),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MIGRATION: Add cost_type column if table already exists
-- Run this if you're upgrading an existing database:
-- ALTER TABLE cost_entries ADD COLUMN IF NOT EXISTS cost_type VARCHAR(20) DEFAULT 'individual' CHECK (cost_type IN ('individual', 'combined', 'general'));
-- UPDATE cost_entries SET cost_type = 'combined' WHERE common_name IS NOT NULL;
-- =====================================================

-- =====================================================
-- 7. COST ENTRY ITEMS TABLE (Junction for shared costs)
-- =====================================================
CREATE TABLE cost_entry_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cost_entry_id UUID REFERENCES cost_entries(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(cost_entry_id, item_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_items_assigned_employee ON items(assigned_employee_id);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);
CREATE INDEX idx_order_items_sale_id ON order_items(sale_id);
CREATE INDEX idx_order_items_item_id ON order_items(item_id);
CREATE INDEX idx_order_items_employee_id ON order_items(employee_id);
CREATE INDEX idx_order_items_status ON order_items(status);
CREATE INDEX idx_stock_logs_item_id ON stock_logs(item_id);
CREATE INDEX idx_stock_logs_date ON stock_logs(date);
CREATE INDEX idx_cost_entries_date ON cost_entries(date);
CREATE INDEX idx_cost_entry_items_cost_entry ON cost_entry_items(cost_entry_id);
CREATE INDEX idx_cost_entry_items_item ON cost_entry_items(item_id);

-- =====================================================
-- DISABLE RLS FOR SIMPLE ACCESS (Development)
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entry_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for development - adjust for production)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for stock_logs" ON stock_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for cost_entries" ON cost_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for cost_entry_items" ON cost_entry_items FOR ALL USING (true) WITH CHECK (true);
