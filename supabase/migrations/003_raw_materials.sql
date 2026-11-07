-- ============================================
-- 003_raw_materials.sql
-- TEOFFE Admin - Bahan Baku & Stoking
-- ============================================

CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lainnya',
  unit TEXT NOT NULL DEFAULT 'g', -- 'g', 'ml', 'pcs', 'kg', 'L'
  package_size NUMERIC NOT NULL DEFAULT 1000, -- berat / volume per kemasan beli
  cost_price NUMERIC NOT NULL DEFAULT 0, -- harga modal per kemasan (Rp)
  unit_cost NUMERIC NOT NULL DEFAULT 0, -- harga modal per berat / volume (Rp/unit)
  current_stock NUMERIC NOT NULL DEFAULT 0, -- stok fisik saat ini
  minimum_stock NUMERIC NOT NULL DEFAULT 0, -- batas minimum alert
  notes TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS raw_material_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('in', 'out', 'adjustment')),
  quantity NUMERIC NOT NULL,
  stock_before NUMERIC NOT NULL DEFAULT 0,
  stock_after NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_raw_materials_name ON raw_materials(name);
CREATE INDEX IF NOT EXISTS idx_raw_material_logs_material ON raw_material_logs(material_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_logs_created_at ON raw_material_logs(created_at DESC);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trigger_raw_materials_updated_at ON raw_materials;
CREATE TRIGGER trigger_raw_materials_updated_at
  BEFORE UPDATE ON raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access on raw_materials" ON raw_materials;
CREATE POLICY "Allow all access on raw_materials" ON raw_materials FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on raw_material_logs" ON raw_material_logs;
CREATE POLICY "Allow all access on raw_material_logs" ON raw_material_logs FOR ALL USING (true) WITH CHECK (true);

-- Seed Data Bahan Baku Awal
INSERT INTO raw_materials (name, category, unit, package_size, cost_price, unit_cost, current_stock, minimum_stock, notes)
VALUES
  ('Biji Kopi', 'Kopi & Espresso', 'g', 1000, 177000, 177, 3000, 500, 'Hostblend 70:30'),
  ('Krimer', 'Dairy & Krimer', 'g', 1000, 35000, 35, 2000, 500, 'Krimer bubuk regular'),
  ('Max Krimer', 'Dairy & Krimer', 'g', 500, 44000, 88, 1000, 250, 'Max Krimer premium'),
  ('SKM (Susu Kental Manis)', 'Dairy & Krimer', 'g', 250, 14000, 56, 1000, 250, 'Susu kental manis'),
  ('Air Mineral (Galon)', 'Air & Base', 'ml', 19000, 21000, 1.11, 38000, 19000, 'Galon 19 Liter'),
  ('Susu Diamond', 'Dairy & Krimer', 'ml', 1000, 19000, 19, 5000, 2000, 'Diamond Fresh Milk 1L'),
  ('Simple Syrup', 'Sirup & Pemanis', 'ml', 15, 166, 11.07, 2000, 500, 'Gula cair (Rp 166 per 15ml)'),
  ('Aren Syrup', 'Sirup & Pemanis', 'ml', 1000, 70980, 70.98, 3000, 1000, 'Gula aren murni 1L'),
  ('Butter Syrup', 'Sirup & Pemanis', 'ml', 750, 71956, 95.94, 1500, 500, 'Butterscotch syrup 750ml'),
  ('Pandan Syrup', 'Sirup & Pemanis', 'ml', 500, 55550, 111.1, 1000, 250, 'Pandan syrup 500ml'),
  ('Pack 250ml', 'Kemasan & Packaging', 'pcs', 1, 2234, 2234, 250, 50, 'Cup/Botol 250ml')
ON CONFLICT DO NOTHING;

