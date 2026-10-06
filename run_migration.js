const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Connecting to Supabase pooler (port 6543)...');
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ogvjmrqfqdesjkbjhcmd',
    password: '2mnFDiQYOQ9YxkSA',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully!');

  const sqlPath = path.resolve(__dirname, 'db/migrations/20261006_create_notifications_table.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running migration...');
  await client.query(sql);
  console.log('Migration executed successfully!');

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notifications';
  `);
  console.log('Verification: public.notifications found ->', res.rows);

  await client.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
