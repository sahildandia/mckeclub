const postgres = require('postgres');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
process.loadEnvFile('.env.local');
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 5, connect_timeout: 15 });
const schema = `registration_load_${randomUUID().replaceAll('-', '')}`;
const report = { testedAt: new Date().toISOString(), databaseConnections: 5, phases: [] };

async function submit(registerNumber, department, club) {
  const start = performance.now();
  try {
    // Include the same preliminary reads made by the application action.
    await sql`SELECT id FROM ${sql(schema + '.clubs')} WHERE id = ${club}`;
    await sql`SELECT 1 FROM ${sql(schema + '.registrations')} WHERE register_number = ${registerNumber}`;
    const rows = await sql`SELECT ${sql(schema + '.register_student')}('Load Test', ${registerNumber}, 'load@mkce.ac.in', '9876543210', ${department}::uuid, '2nd Year', false, false, ${club}::uuid) AS result`;
    return { ...rows[0].result, ms: performance.now() - start };
  } catch (error) {
    return { success: false, infrastructureError: error.message, ms: performance.now() - start };
  }
}

async function phase(name, jobs, expectedSuccesses) {
  const start = performance.now();
  const results = await Promise.all(jobs.map(job => submit(...job)));
  const times = results.map(r => r.ms).sort((a, b) => a - b);
  const summary = {
    name, submitted: results.length, accepted: results.filter(r => r.success).length,
    rejected: results.filter(r => !r.success && !r.infrastructureError).length,
    infrastructureErrors: results.filter(r => r.infrastructureError).length,
    seconds: +( (performance.now() - start) / 1000).toFixed(2),
    p95Seconds: +(times[Math.ceil(times.length * .95) - 1] / 1000).toFixed(2),
    maxSeconds: +(times.at(-1) / 1000).toFixed(2),
  };
  report.phases.push(summary);
  console.log(JSON.stringify(summary));
  assert.equal(summary.infrastructureErrors, 0);
  assert.equal(summary.accepted, expectedSuccesses);
}

(async () => {
  let created = false;
  try {
    await sql`CREATE SCHEMA ${sql(schema)}`;
    created = true;
    for (const table of ['departments', 'clubs', 'club_department_capacities', 'registrations']) {
      await sql`CREATE TABLE ${sql(schema + '.' + table)} (LIKE ${sql('public.' + table)} INCLUDING ALL)`;
    }
    const functions = await sql`SELECT pg_get_functiondef('public.register_student(text,text,text,text,uuid,text,boolean,boolean,uuid)'::regprocedure) AS definition`;
    const definition = functions[0].definition.replaceAll('public.', schema + '.').replace(/SET search_path TO [^\n]+/, `SET search_path TO '${schema}', 'pg_temp'`);
    await sql.unsafe(definition);
    const departments = Array.from({ length: 10 }, () => randomUUID());
    const clubs = Array.from({ length: 10 }, () => randomUUID());
    await sql`INSERT INTO ${sql(schema + '.departments')} ${sql(departments.map((id, i) => ({ id, name: 'Test Department ' + i, short_name: 'T' + i })))}`;
    await sql`INSERT INTO ${sql(schema + '.clubs')} ${sql(clubs.map((id, i) => ({ id, name: 'Test Club ' + i, is_japanese_only: false, is_aws_only: false })))}`;
    await sql`INSERT INTO ${sql(schema + '.club_department_capacities')} ${sql(departments.flatMap(department_id => clubs.map(club_id => ({ department_id, club_id, capacity: 20 }))))}`;
    await sql`UPDATE ${sql(schema + '.club_department_capacities')} SET capacity = 10 WHERE department_id = ${departments[0]} AND club_id = ${clubs[0]}`;
    await phase('100 submissions competing for 10 seats', Array.from({ length: 100 }, (_, i) => ['QUOTA' + i, departments[0], clubs[0]]), 10);
    await phase('50 duplicate submissions across clubs', Array.from({ length: 50 }, (_, i) => ['DUPLICATE001', departments[1], clubs[i % 10]]), 1);
    await sql`TRUNCATE TABLE ${sql(schema + '.registrations')}`;
    await sql`UPDATE ${sql(schema + '.club_department_capacities')} SET capacity = 20`;
    await phase('1500 submissions launched together across 100 quotas', Array.from({ length: 1500 }, (_, i) => ['LOAD' + String(i).padStart(6, '0'), departments[i % 10], clubs[Math.floor(i / 10) % 10]]), 1500);
    const overbooked = await sql`SELECT r.department_id, r.club_id FROM ${sql(schema + '.registrations')} r JOIN ${sql(schema + '.club_department_capacities')} c ON c.department_id = r.department_id AND c.club_id = r.club_id GROUP BY r.department_id, r.club_id, c.capacity HAVING count(*) > c.capacity`;
    assert.equal(overbooked.length, 0);
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.error = error.message;
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (created) {
      assert.match(schema, /^registration_load_[a-f0-9]{32}$/);
      await sql`DROP SCHEMA ${sql(schema)} CASCADE`;
      report.testSchemaRemoved = true;
    }
    fs.writeFileSync('scripts/registration-load-results.json', JSON.stringify(report, null, 2));
    await sql.end();
  }
})();
