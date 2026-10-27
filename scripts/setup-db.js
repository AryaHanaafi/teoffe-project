const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function setup() {
  // Try multiple connection approaches
  const configs = [
    {
      name: 'Direct IPv4',
      config: {
        host: 'db.gtaaelwpgpeyvbfanwui.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: '7DQuC.H!8chXu,S',
        ssl: { rejectUnauthorized: false },
        family: 4, // Force IPv4
      }
    },
    {
      name: 'Pooler connection',
      config: {
        host: 'aws-0-ap-southeast-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.gtaaelwpgpeyvbfanwui',
        password: '7DQuC.H!8chXu,S',
        ssl: { rejectUnauthorized: false },
      }
    },
    {
      name: 'Direct IPv6',
      config: {
        host: 'db.gtaaelwpgpeyvbfanwui.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: '7DQuC.H!8chXu,S',
        ssl: { rejectUnauthorized: false },
        family: 6, // Force IPv6
      }
    },
  ]

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  for (const { name, config } of configs) {
    const client = new Client(config)
    try {
      console.log(`\nTrying ${name}...`)
      await client.connect()
      console.log(`Connected via ${name}!`)

      console.log('Executing migration...')
      await client.query(sql)
      console.log('✅ Migration executed successfully!')

      // Verify tables
      const result = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)
      console.log('\nTables created:')
      result.rows.forEach(row => console.log(`  ✓ ${row.table_name}`))

      // Verify products
      const products = await client.query('SELECT name, price, color_hex FROM products ORDER BY name')
      console.log('\nProducts seeded:')
      products.rows.forEach(row => console.log(`  ✓ ${row.name} - Rp ${row.price} (${row.color_hex})`))

      await client.end()
      console.log('\n✅ Database setup complete!')
      process.exit(0)
    } catch (err) {
      console.log(`❌ ${name} failed: ${err.message}`)
      try { await client.end() } catch(e) {}
    }
  }

  console.log('\n❌ All connection methods failed. Please run the SQL manually in Supabase dashboard.')
  process.exit(1)
}

setup()
