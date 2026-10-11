const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: (name) => mocks[name] || require(name), console,
  });
  return exports;
}

const schemaModule = load('src/lib/registration-schema.ts');
const valid = {
  student_name: 'Test Student', register_number: '927624BCS001',
  college_email: 'test@mkce.ac.in', phone_number: '9876543210',
  department_id: '11111111-1111-4111-8111-111111111111',
  club_id: '22222222-2222-4222-8222-222222222222',
  year: '2nd Year', is_japanese_student: false, is_aws_interested: false,
};

test('registration normalizes valid input and rejects invalid fields and AWS', () => {
  const schema = schemaModule.registrationSchema;
  assert.equal(schema.parse({ ...valid, register_number: ' 927624bcs001 ' }).register_number, valid.register_number);
  for (const input of [
    { college_email: 'test@example.com' }, { phone_number: '123' },
    { department_id: 'dept-1' }, { year: '4th Year' },
    { is_aws_interested: true }, { student_name: '' },
  ]) assert.equal(schema.safeParse({ ...valid, ...input }).success, false);
});

test('admin rejects missing, invalid and non-admin tokens before database access', async () => {
  let queries = 0;
  const sql = () => { queries++; throw new Error('Database must not be queried'); };
  for (const user of [null, { app_metadata: { role: 'student' } }]) {
    const actions = load('src/app/admin/actions.ts', {
      '@/lib/db': { sql },
      '@/lib/supabase': { supabase: { auth: { getUser: async () => ({ data: { user }, error: null }) } } },
    });
    assert.equal((await actions.getAdminData('')).success, false);
    assert.equal((await actions.getAdminData('untrusted-token')).success, false);
  }
  assert.equal(queries, 0);
});

test('verified admin can load dashboard data', async () => {
  let queries = 0;
  const actions = load('src/app/admin/actions.ts', {
    '@/lib/db': { sql: async () => { queries++; return []; } },
    '@/lib/supabase': { supabase: { auth: { getUser: async () => ({ data: { user: { app_metadata: { role: 'admin' } } }, error: null }) } } },
  });
  assert.equal((await actions.getAdminData('verified-token')).success, true);
  assert.equal(queries, 4);
});

test('registration action rejects malformed requests and AWS clubs before insertion', async () => {
  let queries = 0;
  const actions = load('src/app/register/actions.ts', {
    '@/lib/db': { sql: async () => { queries++; return [{ is_aws_only: true }]; } },
    '@/lib/registration-schema': schemaModule,
  });
  assert.equal((await actions.submitRegistration({})).success, false);
  assert.equal(queries, 0);
  assert.equal((await actions.submitRegistration(valid)).success, false);
  assert.equal(queries, 1);
});

test('status lookup normalizes register number and returns no-record result', async () => {
  let received;
  const actions = load('src/app/status/actions.ts', {
    '@/lib/db': { sql: async (_strings, value) => { received = value; return []; } },
  });
  assert.equal((await actions.checkStatus('!')).success, false);
  assert.equal(received, undefined);
  assert.equal((await actions.checkStatus(' 927624bcs001 ')).success, false);
  assert.equal(received, '927624BCS001');
});
