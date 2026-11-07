-- ============================================
-- Disable automatic stock deduction and restoration
-- Stock is no longer auto-updated during sales/cancel.
-- If a product is out of stock, it will be disabled via is_active.
-- ============================================

-- 1. Pastikan kolom customer_name (Atas Nama) tersedia di tabel orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '';

-- 2. Hapus trigger otomatis yang memotong stok saat pesanan dibuat
DROP TRIGGER IF EXISTS trigger_order_item_stock_deduct ON order_items;
DROP FUNCTION IF EXISTS handle_order_item_insert() CASCADE;

-- 3. Hapus trigger pengembalian stok saat pesanan dibatalkan
DROP TRIGGER IF EXISTS trigger_order_cancel_stock_restore ON orders;
DROP TRIGGER IF EXISTS trigger_order_cancel_restore ON orders;
DROP FUNCTION IF EXISTS handle_order_cancel() CASCADE;
