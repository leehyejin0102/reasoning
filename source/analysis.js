/* 분석용 자료(analysis) 구성 — 결과 JSON 안의 analysis 항목과 엑셀(sessions·trials)의 기준입니다. */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const T = node ? require('./tasks.js') : root.BatteryTasks;
  const I = node ? require('./participant.js') : root.BatteryParticipant;
  const schema = '2.0';

  const rtDefinitions = {
    unit: 'ms',
    rt: '문항(그림)이 제시된 후 첫 응답(첫 터치)까지의 시간',
    decision_time: '첫 응답 후 "다음" 버튼을 누르기까지의 시간 (제한시간이 지나 자동으로 넘어간 경우 제한시간 종료까지)',
    valid_trial: '문항 진행 중 화면 전환·창 이탈·창 크기 변경이 없었으면 true. false 이면 요약 계산에서 제외(행은 남김)',
    total_rt: 'rt + decision_time',
  };
  const trialCommon = ['task_name', 'item_index', 'response', 'correct_answer', 'correct', 'omission', 'false_alarm', 'score', 'rt', 'decision_time', 'total_rt'];
  const trialSpecific = ['difficulty', 'question', 'time_limit_sec', 'answer_text', 'response_text', 'partial', 'change_count', 'change_count_correct',
    'change_count_false_alarm', 'response_history', 'valid_trial', 'interruption_count'];
  const summaryKeys = Object.keys(T.SUMMARY_LABELS);

  const sessionId = d => { const id = String(d.session_id || ''); return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id.replace(/-/g, '').slice(0, 12) : id; };
  function common(d) {
    const a = I.fromSession(d);
    return { analysis_schema_version: schema, participant_id: d.participant_id, session_id: sessionId(d), data_role: d.data_role || 'research',
      test_date: a.test_date, age_years: a.age_years, age_months: a.age_months, age_days: a.age_days,
      test_timezone: 'Asia/Seoul', language: d.language || null, version: d.version || null, session_complete: d.session_complete === true };
  }
  // 진행된 소검사(폴더 이름) 목록, 선택 순서대로
  const doneTasks = d => (d.selected || Object.keys(d.task_data || {})).filter(id => d.task_data && d.task_data[id] && T.SPEC[id]);

  function taskPacket(d, id) {
    const td = d.task_data[id], list = T.items(id, td.csv), s = T.summary(id, list, T.totalItems(id, td.csv));
    const pick = r => Object.fromEntries([...trialCommon, ...trialSpecific].map(k => [k, k === 'task_name' ? id : (r[k] ?? null)]));
    if (td.completed === false) s.stopped_by_rule = false;   // 검사 중단(연구자)으로 끝난 경우는 중지 규칙이 아님
    return { id, list, summary: { task_name: id, summary_scope: 'task', condition: 'overall', task_complete: td.completed !== false, ...s }, trials: list.map(pick) };
  }
  function packet(d) {
    const parts = doneTasks(d).map(id => taskPacket(d, id));
    return {
      schema_version: schema,
      rt_definitions: rtDefinitions,
      session: { ...common(d), participant_name: d.participant_name || null, birth_date: d.birth_date || null,
        started_at: d.started_at || null, completed_at: d.completed_at || null, selected_tasks: parts.map(p => p.id) },
      summary: parts.map(p => p.summary),
      summary_details: [],
      trials: parts.flatMap(p => p.trials),
    };
  }
  const numericFields = ['item_index', 'score', 'rt', 'decision_time', 'total_rt', 'time_limit_sec', 'change_count', 'change_count_correct',
    'change_count_false_alarm', 'interruption_count', ...summaryKeys.filter(k => !['task_complete', 'stopped_by_rule'].includes(k))];
  const booleanFields = ['correct', 'omission', 'false_alarm', 'partial', 'valid_trial', 'task_complete', 'stopped_by_rule'];
  const api = { schema, rtDefinitions, trialCommon, trialSpecific, summaryKeys, numericFields, booleanFields, sessionId, common, doneTasks, taskPacket, packet };
  if (node) module.exports = api; else root.BatteryAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
