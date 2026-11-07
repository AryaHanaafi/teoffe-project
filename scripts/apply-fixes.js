const { Client } = require('pg');

const client = new Client({
  host: 'db.gtaaelwpgpeyvbfanwui.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '7DQuC.H!8chXu,S',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL...');

  // 1. Add image_url to products
  await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT \'\';');
  console.log('✓ Column image_url ensured in products table');

  // 2. Fix RLS policies to public (anon & authenticated)
  const tables = ['categories', 'products', 'orders', 'order_items', 'production_log', 'stock_movements'];
  for (const t of tables) {
    await client.query(`DROP POLICY IF EXISTS "auth_all_${t}" ON ${t};`);
    await client.query(`DROP POLICY IF EXISTS "public_all_${t}" ON ${t};`);
    await client.query(`CREATE POLICY "public_all_${t}" ON ${t} FOR ALL USING (true) WITH CHECK (true);`);
    console.log(`✓ Public RLS policy set for ${t}`);
  }

  // 3. Create raw materials tables and RLS
  await client.query(`
    CREATE TABLE IF NOT EXISTS raw_materials (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Lainnya',
      unit TEXT NOT NULL DEFAULT 'g',
      package_size NUMERIC NOT NULL DEFAULT 1000,
      cost_price NUMERIC NOT NULL DEFAULT 0,
      unit_cost NUMERIC NOT NULL DEFAULT 0,
      current_stock NUMERIC NOT NULL DEFAULT 0,
      minimum_stock NUMERIC NOT NULL DEFAULT 0,
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

    ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
    ALTER TABLE raw_material_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "public_all_raw_materials" ON raw_materials;
    CREATE POLICY "public_all_raw_materials" ON raw_materials FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "public_all_raw_material_logs" ON raw_material_logs;
    CREATE POLICY "public_all_raw_material_logs" ON raw_material_logs FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('✓ Raw materials tables and policies ready');

  // 4. Seed raw materials
  const matCount = await client.query('SELECT count(*) FROM raw_materials');
  if (parseInt(matCount.rows[0].count, 10) === 0) {
    await client.query(`
      INSERT INTO raw_materials (name, category, unit, package_size, cost_price, unit_cost, current_stock, minimum_stock, notes)
      VALUES
        ('Biji Kopi', 'Kopi & Espresso', 'g', 1000, 177000, 177, 3000, 500, 'Hostblend 70:30'),
        ('Krimer', 'Dairy & Krimer', 'g', 1000, 35000, 35, 2000, 500, 'Krimer bubuk regular'),
        ('Max Krimer', 'Dairy & Krimer', 'g', 500, 44000, 88, 1000, 250, 'Max Krimer 500g'),
        ('SKM (Susu Kental Manis)', 'Dairy & Krimer', 'g', 250, 14000, 56, 1000, 250, 'Susu kental manis 250g'),
        ('Air Mineral (Galon)', 'Air & Base', 'ml', 19000, 21000, 1.1, 38000, 19000, 'Galon 19 Liter'),
        ('Susu Diamond', 'Dairy & Krimer', 'ml', 1000, 19000, 19, 5000, 2000, 'Diamond Fresh Milk 1000ml'),
        ('Simple Syrup', 'Sirup & Pemanis', 'ml', 15, 166, 11, 2000, 300, 'Gula cair 15ml saji'),
        ('Aren Syrup', 'Sirup & Pemanis', 'ml', 1000, 70980, 71, 3000, 1000, 'Gula aren murni 1000ml'),
        ('Butter Syrup', 'Sirup & Pemanis', 'ml', 750, 71956, 96, 1500, 500, 'Butterscotch syrup 750ml'),
        ('Pandan Syrup', 'Sirup & Pemanis', 'ml', 500, 55550, 111, 1000, 250, 'Pandan syrup 500ml'),
        ('Pack 250ml', 'Kemasan & Packaging', 'pcs', 1, 2234, 2234, 250, 50, 'Cup/Botol kemasan 250ml');
    `);
    console.log('✓ Raw materials seeded');
  }

  // 5. Seed categories
  await client.query(`
    INSERT INTO categories (name, description) VALUES
      ('Manual Brew & Espresso', 'Kopi hitam murni dan espresso'),
      ('Non-Coffee', 'Minuman segar non-kopi'),
      ('Tea & Mocktail', 'Teh premium dan mocktail signature'),
      ('Pastry & Snack', 'Camilan dan pendamping kopi')
    ON CONFLICT (name) DO NOTHING;
  `);
  console.log('✓ Categories seeded');

  // 6. Check products count
  const prodCount = await client.query('SELECT count(*) FROM products');
  console.log(`Total products in DB: ${prodCount.rows[0].count}`);

  await client.end();
  console.log('🎉 SUCCESS: Database RLS and schema fully configured!');
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
