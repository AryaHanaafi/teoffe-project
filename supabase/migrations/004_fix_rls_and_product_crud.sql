-- ============================================
-- 004_fix_rls_and_product_crud.sql
-- TEOFFE Admin - Fix Public RLS & Product CRUD
-- ============================================

-- 1. Tambah kolom image_url pada tabel products jika belum ada
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- 2. Pastikan tabel orders memiliki kolom customer_name
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '';

-- 3. Hapus trigger lama pengurangan stok otomatis jika masih ada
DROP TRIGGER IF EXISTS trigger_order_item_stock_deduct ON order_items;
DROP FUNCTION IF EXISTS handle_order_item_insert() CASCADE;
DROP TRIGGER IF EXISTS trigger_order_cancel_stock_restore ON orders;
DROP TRIGGER IF EXISTS trigger_order_cancel_restore ON orders;
DROP FUNCTION IF EXISTS handle_order_cancel() CASCADE;

-- 4. Buka akses RLS ke Public (anon & authenticated) agar POS dan dashboard admin bekerja langsung
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_categories" ON categories;
DROP POLICY IF EXISTS "public_all_categories" ON categories;
CREATE POLICY "public_all_categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_products" ON products;
DROP POLICY IF EXISTS "public_all_products" ON products;
CREATE POLICY "public_all_products" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_orders" ON orders;
DROP POLICY IF EXISTS "public_all_orders" ON orders;
CREATE POLICY "public_all_orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_order_items" ON order_items;
DROP POLICY IF EXISTS "public_all_order_items" ON order_items;
CREATE POLICY "public_all_order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_production_log" ON production_log;
DROP POLICY IF EXISTS "public_all_production_log" ON production_log;
CREATE POLICY "public_all_production_log" ON production_log FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "public_all_stock_movements" ON stock_movements;
CREATE POLICY "public_all_stock_movements" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- 5. Seed kategori tambahan jika belum ada
INSERT INTO categories (name, description) VALUES
  ('Manual Brew & Espresso', 'Kopi hitam murni dan espresso'),
  ('Non-Coffee', 'Minuman segar non-kopi'),
  ('Tea & Mocktail', 'Teh premium dan mocktail signature'),
  ('Pastry & Snack', 'Camilan dan pendamping kopi')
ON CONFLICT (name) DO NOTHING;

