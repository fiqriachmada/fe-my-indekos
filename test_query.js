const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.ogvjmrqfqdesjkbjhcmd',
  password: '2mnFDiQYOQ9YxkSA',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  await client.connect();
  const res = await client.query(`
    SELECT routine_name FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'respond_to_room_application'
  `);
  console.log('RPC exists:', res.rows);

  const pol = await client.query(`
    SELECT tablename, policyname, cmd, qual FROM pg_policies
    WHERE tablename IN ('rooms', 'room_members', 'properties')
  `);
  console.log('Policies:');
  for (const r of pol.rows) {
    console.log(`- ${r.tablename} | ${r.policyname} | ${r.cmd} | ${r.qual}`);
  }

  await client.end();
}

test().catch(console.error);
