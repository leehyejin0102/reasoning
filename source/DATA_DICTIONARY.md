# 데이터 사전 (DATA_DICTIONARY)

앱이 저장하는 **결과 JSON 1개**의 구조입니다. 파일 이름: `<코드>_<시작시각>_<세션8자>_results.json`.

```
{
  "result":   { "<검사일>": { "<검사 코드>": [ { 한글 항목… } ] } },   ← 사람이 읽는 결과
  "analysis": { schema_version "2.0", rt_definitions, session, summary, summary_details, trials }   ← 분석·엑셀 변환용
}
```

검사 코드: `PC` 공통그림찾기 · `PS` 문제해결 · `RPM` 레이븐 추론 · `VCI` 언어 단서 결합 추론 과제 · `PAT` 패턴 검사_반복/성장 · `ANA` A:B=C:D ·
`ROT` 3차원 회전 · `PA` 차례맞추기 · `DLS` 더비셔 언어 체계 검사 · `VR` 언어적 추론 · `NS` 숫자연속추론 · `PI` 예측추론 과제 · `PT` 물리적 길이 전이 과제.
선택하지 않은 소검사는 나타나지 않습니다.

## 1. result (한글 항목)

| 항목 | 설명 |
|---|---|
| 참가자 번호 / 이름 / 생년월일 | 입력값 (이름은 비워도 됨) |
| 만 나이 / 총 월령 / 생후 일수 | 검사일(한국 시간) 기준 자동 계산 |
| 검사 버전 / 검사 언어 / 세션 아이디 | `config.js` 버전, `ko`/`vi`, 세션 고유 12자리 |
| 검사명 / 검사일 / 세션 시작·종료 시간 / 표시 시간대 | 한국 시간(Asia/Seoul) |
| 검사 완료 여부 | 소검사를 끝까지 마쳤으면 true, 연구자가 '검사 중단'을 눌렀으면 false |
| 중지 규칙 적용 여부 | 연속 3문항 0점으로 중지되었으면 true |
| 총점 · 정반응 수 · 실패 횟수 · 누락오류 수 · 오경보오류 수 · 본시행 수 · 유효/제외 시행 수 | METRICS.md |
| 부분점수(1점) 반응 수 | 예측추론만 |
| 요약 측정치 → 전체 | 정확도, 평균 첫 반응시간·결정시간·총 반응시간, 응답 변경 횟수 합계 등 |
| 문항별 상세 결과 | 실시한 문항마다 1줄 (아래) |

### 문항별 상세 결과 (13개 소검사 공통)

| CSV 열 | 결과 JSON 항목 |
|---|---|
| (자동) | 문항 아이디(`PC_001` …), 문항 번호 |
| `difficulty` | 난이도(하/중/상/최상) |
| `question` | 문항(지시문·자극 내용) |
| `time_limit_sec` | 제한시간(초) |
| `correct_answer` / `answer_text` | 정답 / 정답 내용 |
| `response` / `response_text` | 문항 응답 / 응답 내용 |
| `correct` / `omission` / `false_alarm` | 정답 여부 / 누락오류 / 오경보오류 |
| `score` | 문항 점수 |
| `partial` | 부분점수(1점) 반응 — 예측추론만 |
| `rt` / `decision_time` / `total_rt` | 첫 반응시간 / 결정시간 / 총 반응시간 |
| `change_count` / `change_count_correct` / `change_count_false_alarm` | 응답 변경 횟수 / 정반응 시 / 오경보오류 시 |
| `response_history` | 응답 이력(선택 순서, `>` 로 연결, 차례맞추기의 `R` = 처음부터 다시) |
| `valid_trial` / `interruption_count` | 분석 포함 여부 / 화면 전환 횟수 |

## 2. analysis

| 항목 | 설명 |
|---|---|
| `session` | participant_id, session_id, test_date, age_years/months/days, language, version, session_complete, participant_name, birth_date, started_at, completed_at, selected_tasks, data_role |
| `summary` | 소검사별 1줄 — 영문 키(`n_correct`, `n_omissions`, `n_false_alarms`, `total_score`, `n_partial`, `stopped_by_rule`, `change_count_correct_total` …) |
| `trials` | 실시한 문항마다 1줄 (아래 3절 열) |

## 3. 엑셀 (json_to_excel.html)

- **sessions** (세션당 1행): `participant_id, session_id, test_date, age_years, language, version`
- **trials** (실시 문항당 1행, 25열): `participant_id, session_id, task_name, item_index, response, correct_answer, correct, omission, false_alarm, score, rt, decision_time, total_rt, difficulty, question, time_limit_sec, answer_text, response_text, partial, change_count, change_count_correct, change_count_false_alarm, response_history, valid_trial, interruption_count`
  (`task_name` 은 폴더 이름. 이름·생년월일은 넣지 않음)

## 4. 복구용 전체 기록 JSON (`_raw.json`)

세션 정보 + 소검사별 원본 CSV(`task_data.<폴더>.csv`) + 화면 전환 기록 + 전송 상태.
