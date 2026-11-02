# 소검사 페이지 ↔ 셸 약속 (CSV_FORMAT)

소검사 화면(`ko/<소검사>/index.html`)은 끝날 때 전역 함수 `buildFilteredCSVString()`(assets/engine.js)이 만든 **문항별 CSV 문자열**을
`assets/flow.js` 를 통해 셸(부모 창)로 보냅니다.

```js
window.parent.postMessage({ vit: true, type: "done", testId, lang, csv }, "*");
```

셸이 `{ vit: true, type: "snapshot" }` 를 보내면(검사 중단) 그 시점까지의 CSV 를 `type: "snapshot"` 으로 돌려줍니다.

## CSV 규칙

- 첫 줄은 열 이름(영문), 한 줄 = 본 문항 1개(20줄). 예제(연습) 문항은 저장하지 않습니다. UTF-8, 쉼표 구분, 쉼표·따옴표·줄바꿈이 있는 값은 `"…"`.
- `true/false` 는 논리값, 시간은 ms 정수, 빈칸은 없음(null).
- 중지 규칙으로 **실시하지 않은 문항**은 `administered=false` 로 한 줄을 남기고, 셸은 결과에서 뺍니다.
- 문항 trial 의 `data.phase` 는 `<폴더>_item` 이므로 `flow.js` 가 `valid_trial`, `interruption_count` 를 자동으로 넣습니다.

## 열 (13개 소검사 공통)

`code_name, language, item_index, difficulty, question, time_limit_sec, correct_answer, answer_text, response, response_text, correct, omission, false_alarm, partial, score, rt, decision_time, total_rt, change_count, change_count_correct, change_count_false_alarm, response_history, administered, valid_trial, interruption_count`

| 소검사 | `response` / `correct_answer` 형식 |
|---|---|
| 보기 1개 선택 (문제해결·레이븐·언어 단서·패턴·A:B·3차원·더비셔·언어적 추론·숫자연속) | 보기 번호 `1`~`5` (화면의 ①②③④ 순서) |
| 공통그림찾기 | 줄마다 고른 그림 번호를 `-` 로 연결, 예 `2-1-3` (고르지 않은 줄은 `-`) |
| 차례맞추기 | 누른 카드 번호 순서, 예 `3-1-2` |
| 예측추론 | 선지 번호 `1`~`4`, `correct_answer` 는 2점 선지 번호. `partial` = 1점 선지를 고름 |
| 물리적 길이 전이 | 사물 기호 `A`~`E`(짧은 것부터), 17·18번은 `짧은것-긴것` 예 `A-E`. `response_text`·`answer_text` 에 사물 이름 |
