/* 내보내기 — 결과 JSON(저장·다운로드), 전체 기록 JSON(복구용), 엑셀 */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const A = node ? require('./analysis.js') : root.BatteryAnalysis, R = node ? require('./results.js') : root.BatteryResults,
    W = node ? require('./workbook.js') : root.BatteryWorkbook, D = node ? require('./data-tables.js') : root.BatteryDataTables;
  function cleanResult(d) { return { ...R.output(d), analysis: A.packet(d) }; }
  function fileNames(d) { const base = (d.filename || 'recovered').replace(/\.(csv|xlsx|json)$/i, ''); return { results: base + '_results.json', workbook: base + '_results.xlsx', raw: base + '_raw.json' }; }
  function files(d) { return [{ key: 'results', filename: fileNames(d).results, encoding: 'text', data: JSON.stringify(cleanResult(d), null, 2) }]; }
  function rawSession(d) { return { ...d, csv_session_id: A.sessionId(d) }; }
  function workbookBytes(d) { return W.workbook(D.sheets([A.packet(d)])); }
  const api = { cleanResult, fileNames, files, rawSession, workbookBytes };
  if (node) module.exports = api; else root.BatteryExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
