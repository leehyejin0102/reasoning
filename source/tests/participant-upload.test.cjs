const test = require('node:test'), assert = require('node:assert'), I = require('../participant.js'), U = require('../upload.js');
test('참가자 정보 검증·연령 계산(한국 시간)', () => {
  const ok = I.validate({ participant_id: 'P001', participant_name: '', birth_date: '2010-02-15' }, '2026-10-27');
  assert.strictEqual(ok.age_years, 16); assert.strictEqual(ok.participant_name, null);
  assert.strictEqual(I.validate({ participant_id: '가나', birth_date: '2010-02-15' }, '2026-10-27').error, 'codeError');
  assert.strictEqual(I.validate({ participant_id: 'P', birth_date: '2010-13-45' }, '2026-10-27').error, 'birthDateError');
  assert.strictEqual(I.validate({ participant_id: 'P', birth_date: '2030-01-01' }, '2026-10-27').error, 'birthDateFuture');
  assert.strictEqual(I.testDate('2026-10-27T16:00:00Z'), '2026-10-28');
});
const mk = status => async () => ({ status, json: async () => (typeof status === 'object' ? status : {}) });
test('DataPipe: 201 저장, 202 접수, FILE_EXISTS 는 확인 필요', async () => {
  const files = [{ key: 'results', filename: 'a_results.json', encoding: 'text', data: '{}' }];
  const ses = () => ({ dataPipeExperimentId: 'x' });
  let s = ses(); await U.send(s, files, { fetch: async () => ({ status: 201, json: async () => ({}) }) }); assert.strictEqual(s.upload_status, 'saved');
  s = ses(); await U.send(s, files, { fetch: async () => ({ status: 202, json: async () => ({}) }) }); assert.strictEqual(s.upload_status, 'queued');
  s = ses(); await U.send(s, files, { fetch: async () => ({ status: 400, json: async () => ({ error: 'FILE_EXISTS' }) }) }); assert.strictEqual(s.upload_files.results.status, 'needs_verify'); assert.strictEqual(s.upload_status, 'uncertain');
  s = ses(); await U.send(s, files, { fetch: async () => { throw new Error('offline'); } }); assert.strictEqual(s.upload_status, 'uncertain');
  s = { dataPipeExperimentId: '' }; assert.deepStrictEqual(await U.send(s, files), { skipped: true });
});
test('DataPipe 요청 본문: experimentID·filename·data', async () => {
  let body; const s = { dataPipeExperimentId: 'XfGPyXaYmLqT' };
  await U.send(s, [{ key: 'results', filename: 'b.json', encoding: 'text', data: '{"a":1}' }], { fetch: async (url, init) => { body = { url, ...JSON.parse(init.body) }; return { status: 201, json: async () => ({}) }; } });
  assert.strictEqual(body.url, 'https://pipe.jspsych.org/api/data/'); assert.strictEqual(body.experimentID, 'XfGPyXaYmLqT'); assert.strictEqual(body.filename, 'b.json');
});
