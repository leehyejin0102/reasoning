/* 결과 JSON → 엑셀 변환 (json_to_excel.html 에서 사용) */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const T = node ? require('./tasks.js') : root.BatteryTasks, A = node ? require('./analysis.js') : root.BatteryAnalysis,
    D = node ? require('./data-tables.js') : root.BatteryDataTables, W = node ? require('./workbook.js') : root.BatteryWorkbook;
  const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
  function reportRecords(doc) {
    if (!object(doc.result)) throw Error('result 항목이 있는 검사 결과 JSON을 선택해 주세요.');
    const out = [];
    for (const [date, byTask] of Object.entries(doc.result)) {
      if (!object(byTask)) throw Error('검사일 아래의 검사 구조가 올바르지 않습니다.');
      for (const [code, arr] of Object.entries(byTask)) {
        if (!T.byCode[code] || !Array.isArray(arr) || arr.length !== 1 || !object(arr[0])) throw Error('지원하지 않는 검사 결과 구조: ' + code);
        out.push({ date, task: T.byCode[code], value: arr[0] });
      }
    }
    return out;
  }
  function validate(p, reports) {
    if (p.schema_version !== '2.0' || !object(p.session) || !Array.isArray(p.summary) || !Array.isArray(p.trials)) throw Error('지원하지 않는 analysis 구조 버전입니다.');
    const s = p.session;
    for (const k of ['age_years', 'age_months', 'age_days']) if (s[k] != null && !Number.isFinite(s[k])) throw Error('연령 자료형 오류: ' + k);
    if (typeof s.participant_id !== 'string' || !s.participant_id) throw Error('참가자 코드가 없습니다.');
    for (const r of [...p.summary, ...p.trials]) {
      if (!T.SPEC[r.task_name]) throw Error('알 수 없는 검사 코드: ' + r.task_name);
      for (const [k, v] of Object.entries(r)) {
        if (A.numericFields.includes(k) && v !== null && !Number.isFinite(v)) throw Error('숫자 자료형 오류: ' + k);
        if (A.booleanFields.includes(k) && v !== null && typeof v !== 'boolean') throw Error('논리 자료형 오류: ' + k);
      }
    }
    for (const t of new Set(p.trials.map(r => r.task_name))) if (!reports.some(r => r.task === t)) throw Error('analysis에만 존재하는 검사가 있습니다.');
    for (const { task, value } of reports) {
      if (value['참가자 번호'] !== s.participant_id || value['세션 아이디'] !== s.session_id) throw Error('result와 analysis의 참가자·세션 정보가 다릅니다.');
      if (value['본시행 수'] !== p.trials.filter(r => r.task_name === task).length) throw Error('result와 analysis의 본시행 수가 다릅니다.');
    }
    return p;
  }
  function decode(input) {
    const doc = typeof input === 'string' ? JSON.parse(input.replace(/^﻿/, '')) : input;
    if (!object(doc)) throw Error('JSON 객체가 아닙니다.');
    const reports = reportRecords(doc);
    if (!doc.analysis) throw Error('analysis 항목이 없는 파일입니다. 이 앱이 저장한 결과 JSON을 선택해 주세요.');
    return validate({ ...doc.analysis, warnings: [] }, reports);
  }
  const canonical = v => Array.isArray(v) ? v.map(canonical) : object(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
  function convert(inputs) {
    if (!Array.isArray(inputs) || !inputs.length) throw Error('JSON 파일을 선택해 주세요.');
    const unique = new Map(), packets = [], warnings = []; let duplicates = 0;
    for (const input of inputs) {
      const p = decode(input.document ?? input), key = p.session.participant_id + '|' + p.session.session_id;
      const fp = JSON.stringify(canonical({ session: p.session, summary: p.summary, trials: p.trials }));
      if (unique.has(key)) { if (unique.get(key) !== fp) throw Error('같은 참가자·세션의 값이 다른 파일이 있습니다. 확인 후 하나를 선택해 주세요.'); duplicates++; continue; }
      unique.set(key, fp); packets.push(p);
      const label = p.session.participant_id + ' / ' + p.session.session_id;
      if (p.session.session_complete === false) warnings.push(label + ': 미완료 세션입니다.');
      for (const s of p.summary) if (s.task_complete === false) warnings.push(label + ': ' + s.task_name + ' 검사가 중단되었습니다.');
    }
    const sheets = D.sheets(packets);
    return { bytes: W.workbook(sheets), sheets, packets, duplicates, warnings: [...new Set(warnings)], sessionCount: packets.length, trialCount: packets.reduce((n, p) => n + p.trials.length, 0) };
  }
  const api = { decode, convert };
  if (node) module.exports = api; else root.BatteryConvert = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
