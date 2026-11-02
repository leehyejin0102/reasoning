/* 엑셀 시트 정의 — sessions(참가자·세션) + trials(문항별 기록) 두 시트 */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports, A = node ? require('./analysis.js') : root.BatteryAnalysis;
  const sessionColumns = ['participant_id', 'session_id', 'test_date', 'age_years', 'language', 'version'];
  const trialColumns = ['participant_id', 'session_id', ...A.trialCommon, ...A.trialSpecific];
  const pick = (columns, r) => Object.fromEntries(columns.map(k => [k, r[k] ?? null]));
  const sessionRow = session => pick(sessionColumns, { ...session, ...A.common(session) });
  function sheets(packets) {
    return [
      { name: 'sessions', columns: sessionColumns, rows: packets.map(p => sessionRow(p.session)), freeze: { rows: 1, cols: 1 } },
      { name: 'trials', columns: trialColumns, rows: packets.flatMap(p => { const s = sessionRow(p.session); return p.trials.map(r => pick(trialColumns, { ...r, participant_id: s.participant_id, session_id: s.session_id })); }), freeze: { rows: 1, cols: 2 } },
    ];
  }
  const api = { sessionColumns, trialColumns, sessionRow, sheets };
  if (node) module.exports = api; else root.BatteryDataTables = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
