/* 결과 JSON 의 result 항목 — 사람이 읽는 한글 항목. result > 검사일 > 검사 코드 > [ 기록 1개 ] */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const T = node ? require('./tasks.js') : root.BatteryTasks;
  const I = node ? require('./participant.js') : root.BatteryParticipant;
  const A = node ? require('./analysis.js') : root.BatteryAnalysis;

  function koreanTime(iso) { if (!iso || !Number.isFinite(Date.parse(iso))) return null; return new Date(Date.parse(iso) + 9 * 3600000).toISOString().replace('T', ' ').slice(0, 19); }

  function output(d) {
    const start = koreanTime(d.started_at), date = start ? start.slice(0, 10) : '검사일 미상', byTask = {}, age = I.fromSession(d);
    for (const id of A.doneTasks(d)) {
      const spec = T.SPEC[id], td = d.task_data[id], p = A.taskPacket(d, id), s = p.summary;
      const rec = {
        '참가자 번호': d.participant_id, '이름': d.participant_name || null, '생년월일': d.birth_date || null,
        '만 나이': age.age_years, '총 월령': age.age_months, '생후 일수': age.age_days,
        '검사 버전': d.version || null, '검사 언어': d.language || null, '세션 아이디': A.sessionId(d), '검사명': spec.label,
        '검사일': date, '세션 시작 시간': start, '세션 종료 시간': koreanTime(td.completed_at || d.completed_at), '표시 시간대': 'Asia/Seoul',
        '검사 완료 여부': td.completed !== false, '시간 단위': 'ms', '정확도·오류율 단위': '비율(0–1)',
        '총점': s.total_score, '정반응 수': s.n_correct, '실패 횟수': s.n_failures, '누락오류 수': s.n_omissions, '오경보오류 수': s.n_false_alarms,
        '본시행 수': s.n_trials, '유효 시행 수': s.n_valid, '제외 시행 수': s.n_invalid,
      };
      if (id === 'predictive') rec['부분점수(1점) 반응 수'] = s.n_partial;
      rec['중지 규칙 적용 여부'] = s.stopped_by_rule;
      rec['요약 측정치'] = { '전체': T.koSummary(s) };
      rec['문항별 상세 결과'] = p.list.map((r, i) => T.koItem(id, r, i));
      byTask[spec.code] = [rec];
    }
    return { result: { [date]: byTask } };
  }
  const api = { output, koreanTime };
  if (node) module.exports = api; else root.BatteryResults = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
