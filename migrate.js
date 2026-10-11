const postgres = require('postgres');
const fs = require('fs');

process.loadEnvFile('.env.local');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const sql = postgres(connectionString);

async function run() {
  try {
    console.log("Applying schema...");
    const schema = fs.readFileSync('supabase_schema.sql', 'utf8');
    await sql.unsafe(schema);
    console.log("Schema applied.");

    console.log("Applying seed...");
    const seed = fs.readFileSync('supabase_seed.sql', 'utf8');
    await sql.unsafe(seed);
    console.log("Seed applied.");

    console.log("Done.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
