const postgres = require('postgres');
const fs = require('fs');

const connectionString = "postgresql://postgres.kwzuhysldgendoswrfzd:927624Bcs%40139@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";
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
