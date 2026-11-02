# 한국추론능력검사 (온라인 실시) — ccpi 공통 형식

(사)중앙임상심리연구소의 아동용 추론능력검사(만 2~11세, 13개 소검사)를 온라인·태블릿으로 실시하는 저장소입니다.
연구실 공통 형식 샘플(지능검사 v1.0.0)의 셸·저장·엑셀 변환을 그대로 쓰고, 소검사 화면만 새로 만들었습니다.

## 구성

| 위치 | 내용 |
|---|---|
| `index.html` | 셸(표지 → 언어 선택 → 소검사 선택·참가자 정보 → 실행 → 결과). `source/` 로 만든 단일 파일 — 직접 고치지 않습니다 |
| `json_to_excel.html` | 결과 JSON → 엑셀 변환기(단일 파일) |
| `ko/<소검사>/` | 소검사 화면: `index.html`(문구) + `data.js`(문항 그림·선택 영역·정답, 자동 생성) + `images/`(자극책자 그림) |
| `vi/` | 베트남어 버전 자리(준비 중, `vi/README.txt`) |
| `assets/engine.js`, `engine.css` | 13개 소검사 공통 엔진(응답 방식·제한시간·중지 규칙·CSV) |
| `assets/flow.js` | 소검사 화면 공통 스크립트(끝나면 결과 CSV 를 셸로 전달, 화면 전환 감지) |
| `vendor/` | jsPsych 8.3.0 (인터넷 없이 동작) |
| `source/` | 셸·변환기 원본, 빌드 스크립트, 테스트, 문서, 문구 생성기(`pages/`), 책자 변환 도구(`booklet-tools/`) |
| `examples/` | 가상 예시 JSON·엑셀 |

## 소검사와 실시 순서

| 순서 | 폴더 | 코드 | 소검사 | 구분 | 응답 방식 |
|---|---|---|---|---|---|
| 1 | picture_concepts | PC | 공통그림찾기 | 핵심 | 줄마다 그림 1개씩 선택 → 다음 |
| 2 | problem_solving | PS | 문제해결 | 핵심 | 그림 보기 1개 → 다음 |
| 3 | raven | RPM | 레이븐 추론 | 핵심 | 보기 1개 → 다음 |
| 4 | verbal_cue | VCI | 언어 단서 결합 추론 과제 | 핵심 | 그림 1개 → 다음 |
| 5 | pattern | PAT | 패턴 검사_반복/성장 | 핵심 | 보기 1개 → 다음 |
| 6 | analogy | ANA | A:B = C:D (단어유추) | 핵심 | 4지선다(A:B 슬라이드) → 다음 |
| 7 | rotation | ROT | 3차원 회전 | 핵심 | 보기 1개 → 다음 |
| 8 | picture_arrangement | PA | 차례맞추기 | 핵심 | 카드를 순서대로 누름, '처음부터 다시' → 다음 |
| 9 | dls | DLS | 더비셔 언어 체계 검사 | 보충(만 2~5세) | 그림 1개 → 다음 |
| 10 | verbal_reasoning | VR | 언어적 추론 | 보충(만 6~11세) | 문장 1개 → 다음 |
| 11 | number_series | NS | 숫자연속추론 | 보충(만 6~11세) | 숫자 1개 → 다음 |
| 12 | predictive | PI | 예측추론 과제 | 보충(만 6~11세) | 4지선다(선지별 0/1/2점) → 다음 |
| 13 | length | PT | 물리적 길이 전이 과제 | 보충(만 6~11세) | 자극 그림 속 사물을 직접 누름(17·18번: 가장 짧은 것·가장 긴 것) → 다음 |

## 배포 (GitHub Pages)

1. 이 폴더 전체를 저장소 루트에 올립니다(`.nojekyll` 포함). 파일이 많아 GitHub 웹 업로드(한 번 100개 제한)는 폴더별로 나눠 올리거나 GitHub Desktop 을 쓰세요.
2. Settings → Pages → Deploy from a branch → main / (root) → Save. 주소: `https://<계정>.github.io/<저장소>/`
3. DataPipe 실험 ID 는 `source/config.js` 의 `dataPipeExperimentId`(현재 `XfGPyXaYmLqT`). 바꾸면 `node source/build-single.cjs` 후 `index.html` 교체.
   (첫 화면 오른쪽 위 ⚙ 에서 브라우저별로 임시 변경 가능)

## 로컬 확인·테스트·빌드

```
node source/serve.cjs                       # http://127.0.0.1:4173
node --test source/tests/*.test.cjs
node source/build-single.cjs && node source/build-converter.cjs
python3 source/pages/make-pages.py          # 지시문·예제 해설을 고친 뒤 ko/*/index.html 다시 만들기
node source/make-example.cjs
```

## 알려진 제한

- 음성 제시 없음(요청에 따라 텍스트만). 언어 단서 결합·더비셔·예측추론의 지시문·질문은 화면 글자로 제시됩니다.
- 그림은 자극책자 PDF 를 그대로 잘라 쓴 것입니다(새 그림 없음).
- 인터넷이 필요한 것은 DataPipe 전송뿐입니다.
