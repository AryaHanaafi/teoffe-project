-- ============================================
-- TEOFFE Admin - Database Schema
-- Version: 1.0
-- Database: Supabase PostgreSQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 2. PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  price INTEGER NOT NULL CHECK (price > 0),
  color_hex TEXT NOT NULL DEFAULT '#5BA4C9',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 3. ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE DEFAULT '',
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  total_items INTEGER NOT NULL CHECK (total_items > 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'qris')),
  customer_name TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  order_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 4. ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0),
  subtotal INTEGER NOT NULL CHECK (subtotal > 0)
);

-- ============================================
-- 5. PRODUCTION LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS production_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_produced INTEGER NOT NULL CHECK (quantity_produced > 0),
  batch_number TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  production_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 6. STOCK MOVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  production_id UUID REFERENCES production_log(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('production_in', 'sale_out', 'adjustment')),
  quantity INTEGER NOT NULL,
  stock_before INTEGER NOT NULL DEFAULT 0,
  stock_after INTEGER NOT NULL DEFAULT 0,
  reference TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_production_log_product ON production_log(product_id);
CREATE INDEX IF NOT EXISTS idx_production_log_date ON production_log(production_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at DESC);

-- ============================================
-- TRIGGER: Auto-update updated_at on products
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: Auto-generate order number
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  v_date TEXT;
  v_count INTEGER;
BEGIN
  v_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_count 
  FROM orders 
  WHERE (order_date AT TIME ZONE 'Asia/Jakarta')::DATE = (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
  NEW.order_number := 'TF-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_order_number ON orders;
CREATE TRIGGER trigger_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

-- ============================================
-- TRIGGER: Auto-update stock on production insert
-- ============================================
CREATE OR REPLACE FUNCTION handle_production_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_before INTEGER;
BEGIN
  SELECT current_stock INTO v_stock_before 
  FROM products 
  WHERE id = NEW.product_id 
  FOR UPDATE;

  UPDATE products 
  SET current_stock = current_stock + NEW.quantity_produced 
  WHERE id = NEW.product_id;

  INSERT INTO stock_movements (product_id, production_id, movement_type, quantity, stock_before, stock_after, reference)
  VALUES (
    NEW.product_id, 
    NEW.id, 
    'production_in', 
    NEW.quantity_produced, 
    v_stock_before, 
    v_stock_before + NEW.quantity_produced, 
    'Batch: ' || COALESCE(NEW.batch_number, '-')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_production_stock_update ON production_log;
CREATE TRIGGER trigger_production_stock_update
  AFTER INSERT ON production_log
  FOR EACH ROW
  EXECUTE FUNCTION handle_production_insert();

-- ============================================
-- TRIGGER: Auto-deduct stock on order item insert
-- ============================================
CREATE OR REPLACE FUNCTION handle_order_item_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_before INTEGER;
BEGIN
  SELECT current_stock INTO v_stock_before 
  FROM products 
  WHERE id = NEW.product_id 
  FOR UPDATE;

  IF v_stock_before < NEW.quantity THEN
    RAISE EXCEPTION 'Stok tidak cukup untuk produk ini. Stok tersedia: %, diminta: %', v_stock_before, NEW.quantity;
  END IF;

  UPDATE products 
  SET current_stock = current_stock - NEW.quantity 
  WHERE id = NEW.product_id;

  INSERT INTO stock_movements (product_id, order_id, movement_type, quantity, stock_before, stock_after, reference)
  VALUES (
    NEW.product_id, 
    NEW.order_id, 
    'sale_out', 
    NEW.quantity, 
    v_stock_before, 
    v_stock_before - NEW.quantity, 
    'Penjualan'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_item_stock_deduct ON order_items;
CREATE TRIGGER trigger_order_item_stock_deduct
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_item_insert();

-- ============================================
-- TRIGGER: Restore stock on order cancellation
-- ============================================
CREATE OR REPLACE FUNCTION handle_order_cancel()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_stock_before INTEGER;
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    FOR v_item IN SELECT * FROM order_items WHERE order_id = NEW.id
    LOOP
      SELECT current_stock INTO v_stock_before 
      FROM products 
      WHERE id = v_item.product_id 
      FOR UPDATE;

      UPDATE products 
      SET current_stock = current_stock + v_item.quantity 
      WHERE id = v_item.product_id;

      INSERT INTO stock_movements (product_id, order_id, movement_type, quantity, stock_before, stock_after, reference)
      VALUES (
        v_item.product_id, 
        NEW.id, 
        'adjustment', 
        v_item.quantity, 
        v_stock_before, 
        v_stock_before + v_item.quantity, 
        'Pesanan dibatalkan: ' || NEW.order_number
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_cancel_stock_restore ON orders;
CREATE TRIGGER trigger_order_cancel_stock_restore
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_cancel();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users full access
CREATE POLICY "auth_all_categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_order_items" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_production_log" ON production_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_stock_movements" ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Category: Kopi Susu
INSERT INTO categories (name, description) 
VALUES ('Kopi Susu', 'Minuman kopi susu premium TEOFFE')
ON CONFLICT (name) DO NOTHING;

-- 6 Products
INSERT INTO products (name, slug, type, tagline, price, color_hex, category_id, current_stock) VALUES
  ('Basically OG', 'basically-og', 'Aren Latte', 'The OG. No explanation needed.', 18000, '#7BB8D4', (SELECT id FROM categories WHERE name = 'Kopi Susu'), 0),
  ('Aren Things', 'aren-things', 'Aren Latte', 'Aren you glad you tried it?', 20000, '#B8956A', (SELECT id FROM categories WHERE name = 'Kopi Susu'), 0),
  ('Butter Me Up', 'butter-me-up', 'Butterscotch Latte', 'Butter believe it''s good.', 20000, '#8B7D3C', (SELECT id FROM categories WHERE name = 'Kopi Susu'), 0),
  ('Pandan Club', 'pandan-club', 'Pandan Latte', 'Keep calm and pandan on.', 20000, '#8B9E6B', (SELECT id FROM categories WHERE name = 'Kopi Susu'), 0),
  ('Salty Sip', 'salty-sip', 'Salted Caramel Latte', 'Salty on the outside, sweet on the inside.', 20000, '#C08B6E', (SELECT id FROM categories WHERE name = 'Kopi Susu'), 0),
  ('Hazel Hang', 'hazel-hang', 'Hazelnut Latte', 'Let''s go nuts.', 20000, '#7A6E5A', (SELECT id FROM categories WHERE name = 'Kopi Susu'), 0)
ON CONFLICT (slug) DO NOTHING;
