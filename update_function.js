const postgres = require('postgres');
const fs = require('fs');

process.loadEnvFile('.env.local');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const sql = postgres(connectionString);

async function run() {
  try {
    const schema = fs.readFileSync('supabase_schema.sql', 'utf8');
    // Extract the CREATE OR REPLACE FUNCTION part
    const funcMatch = schema.match(/CREATE OR REPLACE FUNCTION register_student[\s\S]+?LANGUAGE plpgsql SECURITY DEFINER;/);
    
    if (funcMatch) {
      await sql.unsafe(funcMatch[0]);
      console.log("Updated function in database.");
    } else {
      console.log("Function not found in schema file.");
    }
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
