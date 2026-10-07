const postgres = require('postgres');
const connectionString = "postgresql://postgres.kwzuhysldgendoswrfzd:927624Bcs%40139@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";
const sql = postgres(connectionString);

async function run() {
  try {
    await sql`DELETE FROM auth.users WHERE email = 'admin@admin.com'`;
    const res = await sql`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@admin.com', crypt('admin123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
      ) RETURNING id;
    `;
    
    const userId = res[0].id;
    await sql`
      INSERT INTO auth.identities (
        provider_id, id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        ${userId}, gen_random_uuid(), ${userId}, ${sql.json({ sub: userId, email: 'admin@admin.com' })}, 'email', now(), now(), now()
      );
    `;
    console.log("Admin user created successfully.");
  } catch(e) {
    console.error("Error creating admin user:", e);
  } finally {
    sql.end();
  }
}
run();
