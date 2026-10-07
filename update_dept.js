const postgres = require('postgres');
const connectionString = "postgresql://postgres.kwzuhysldgendoswrfzd:927624Bcs%40139@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";
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
