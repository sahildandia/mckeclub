const assert = require('node:assert/strict');
const postgres = require('postgres');
process.loadEnvFile('.env.local');
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
(async () => {
  try {
    const policies = await sql`SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('registrations', 'departments', 'clubs', 'club_department_capacities', 'audit_logs')`;
    assert.equal(policies.some(p => p.policyname === 'Allow public status check'), false);
    const adminPolicies = policies.filter(p => p.policyname.startsWith('Allow admin full access'));
    assert.equal(adminPolicies.length, 5);
    assert.ok(adminPolicies.every(p => p.qual.includes('app_metadata') && p.qual.includes('admin')));
    const privileges = await sql`SELECT has_function_privilege('anon', 'public.register_student(text,text,text,text,uuid,text,boolean,boolean,uuid)', 'EXECUTE') AS anon, has_function_privilege('authenticated', 'public.register_student(text,text,text,text,uuid,text,boolean,boolean,uuid)', 'EXECUTE') AS authenticated`;
    assert.equal(privileges[0].anon, false);
    assert.equal(privileges[0].authenticated, false);
    const result = await sql`SELECT public.register_student('', '', 'bad@example.com', '', NULL, '', false, false, NULL) AS result`;
    assert.equal(result[0].result.success, false);
    console.log('Live database verified: restricted admin policies, public RPC revoked, invalid registration rejected.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
})();
