const postgres = require('postgres');
const fs = require('node:fs');
process.loadEnvFile('.env.local');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
(async () => {
  try {
    await sql.unsafe(fs.readFileSync('scripts/security-migration.sql', 'utf8'));
    console.log('Security migration applied.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
})();
