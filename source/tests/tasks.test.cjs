const test = require('node:test'), assert = require('node:assert'), T = require('../tasks.js'), { csv } = require('./fixtures.cjs');
test('CSV 읽기: 따옴표 안 쉼표·줄바꿈·BOM·CRLF', () => {
  assert.deepStrictEqual(T.parseCSV('﻿a,b\r\n"x, y",2\r\n'), [{ a: 'x, y', b: '2' }]);
  assert.deepStrictEqual(T.parseCSV('a,b\n"줄1\n줄2",3\n'), [{ a: '줄1\n줄2', b: '3' }]);
});
test('값 형 변환 (정답·응답 문자열은 문자 그대로)', () => {
  assert.strictEqual(T.typed('correct', 'true'), true); assert.strictEqual(T.typed('rt', '120'), 120);
  assert.strictEqual(T.typed('response', '2'), '2'); assert.strictEqual(T.typed('correct_answer', '2-1'), '2-1'); assert.strictEqual(T.typed('rt', ''), null);
});
test('13개 소검사 코드 ↔ 폴더, 실시 순서', () => {
  assert.deepStrictEqual(Object.keys(T.SPEC), ['picture_concepts', 'problem_solving', 'raven', 'verbal_cue', 'pattern', 'analogy', 'rotation',
    'picture_arrangement', 'dls', 'verbal_reasoning', 'number_series', 'predictive', 'length']);
  assert.strictEqual(Object.keys(T.byCode).length, 13); assert.strictEqual(T.byCode.PI, 'predictive');
});
test('공통그림찾기: 줄마다 고른 그림 정답 → 총점 = 문항 점수 합', () => {
  const l = T.items('picture_concepts', csv.picture_concepts), s = T.summary('picture_concepts', l, 20);
  assert.strictEqual(l.length, 3); assert.strictEqual(s.n_correct, 3); assert.strictEqual(s.total_score, 3); assert.match(l[0].correct_answer, /^\d-\d$/);
});
test('예측추론: 0/1/2점, 1점은 오경보로 셈, 부분점수 반응 수 따로 기록', () => {
  const l = T.items('predictive', csv.predictive), s = T.summary('predictive', l, 20);
  assert.deepStrictEqual(l.map(r => r.score), [1, 0, 2]);
  assert.strictEqual(s.total_score, 3); assert.strictEqual(s.n_correct, 1); assert.strictEqual(s.n_false_alarms, 2); assert.strictEqual(s.n_partial, 1);
});
test('물리적 길이 전이: 연속 3문항 0점이면 중지 — 실시 5문항, 미실시 15문항은 제외', () => {
  const l = T.items('length', csv.length), s = T.summary('length', l, T.totalItems('length', csv.length));
  assert.strictEqual(l.length, 5); assert.strictEqual(s.n_items_total, 20); assert.strictEqual(s.stopped_by_rule, true);
  assert.deepStrictEqual(l.slice(2).map(r => r.score), [0, 0, 0]);
});
test('제한시간 경과: 무응답은 누락오류, 첫 반응·결정시간 없음', () => {
  const l = T.items('pattern', csv.pattern), s = T.summary('pattern', l, 20);
  assert.strictEqual(l[0].omission, true); assert.strictEqual(l[0].rt, null); assert.strictEqual(s.n_omissions, 1); assert.strictEqual(s.n_failures, 1);
});
test('문항 한글 항목에 정답·응답 내용 포함', () => {
  const r = T.koItem('predictive', T.items('predictive', csv.predictive)[0], 0);
  assert.strictEqual(r['문항 아이디'], 'PI_001'); assert.strictEqual(r['부분점수(1점) 반응'], true); assert.ok(r['응답 내용'].length > 0);
});
