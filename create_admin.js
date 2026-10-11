const postgres = require('postgres');
process.loadEnvFile('.env.local');
if (!process.env.DATABASE_URL || !process.env.ADMIN_EMAIL) throw new Error('DATABASE_URL and ADMIN_EMAIL are required');
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
async function run() {
  try {
    const users = await sql`UPDATE auth.users SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb WHERE email = ${process.env.ADMIN_EMAIL} RETURNING id`;
    if (!users.length) throw new Error('Create this user in Supabase Auth first, then rerun this script.');
    console.log('Admin role assigned. Sign in again to refresh the session.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}
run();
