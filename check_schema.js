const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ogvjmrqfqdesjkbjhcmd',
    password: '2mnFDiQYOQ9YxkSA',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const tables = ['property_members', 'room_members', 'rooms'];
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [t]);
    console.log(`=== TABLE: ${t} ===`);
    console.table(res.rows);
  }
  await client.end();
}

main().catch(console.error);
