const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function testConnection(connectionString, name) {
  console.log(`\nTesting connection with ${name}...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log(`Connected successfully via ${name}!`);

    const sqlPath = path.resolve(__dirname, 'db/migrations/20261006_create_notifications_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration...');
    await client.query(sql);
    console.log('Migration executed successfully!');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'notifications';
    `);
    console.log('Verification result:', res.rows);

    await client.end();
    return true;
  } catch (err) {
    console.error(`Failed with ${name}:`, err.message);
    try { await client.end(); } catch {}
    return false;
  }
}

async function main() {
  // Option 1: Pooler port 6543
  const pooler6543 = 'postgres://postgres.ogvjmrqfqdesjkbjhcmd:2mnFDiQYOQ9YxkSA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require';
  if (await testConnection(pooler6543, 'Pooler (Port 6543)')) return;

  // Option 2: Direct host db.ogvjmrqfqdesjkbjhcmd.supabase.co:5432
  const direct5432 = 'postgres://postgres:2mnFDiQYOQ9YxkSA@db.ogvjmrqfqdesjkbjhcmd.supabase.co:5432/postgres?sslmode=require';
  if (await testConnection(direct5432, 'Direct DB (db.ogvjmrqfqdesjkbjhcmd.supabase.co:5432)')) return;

  // Option 3: Pooler port 5432
  const pooler5432 = 'postgres://postgres.ogvjmrqfqdesjkbjhcmd:2mnFDiQYOQ9YxkSA@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require';
  if (await testConnection(pooler5432, 'Pooler (Port 5432)')) return;

  console.error('All connection attempts failed.');
  process.exit(1);
}

main();
