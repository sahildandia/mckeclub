const postgres = require('postgres');
process.loadEnvFile('.env.local');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const sql = postgres(connectionString);

async function run() {
  try {
    console.log("Updating department name...");
    const result = await sql`
      UPDATE public.departments 
      SET name = 'Computer Science Engineering & Cyber Security' 
      WHERE name = 'Computer Science and Engineering'
      RETURNING *;
    `;
    console.log("Update successful. Rows affected:", result.length);
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await sql.end();
  }
}

run();
