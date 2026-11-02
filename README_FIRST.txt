한국추론능력검사 온라인 v1.0.0 — (사)중앙임상심리연구소 연구실 공통 형식(지능검사 샘플과 같은 구조)

이 폴더 전체가 GitHub Pages 에 올리는 저장소 내용입니다.

1. 시작: 저장소 루트의 index.html → 표지 → 언어 선택(한국어 / Tiếng Việt) → 소검사 선택 · 참가자 정보(코드·이름·생년월일).
   베트남어는 아직 '준비 중' 화면만 나옵니다(source/config.js 의 readyLanguages).
2. 소검사 13개: 핵심 8개(처음부터 모두 선택) + 보충 5개(검사자가 눌러서 선택). 실시 순서는 '추론능력검사 요약서' 탭의 소검사 배열 순서.
   화면은 ko/<소검사>/ (index.html + data.js + images/), 공통 동작은 assets/engine.js · engine.css.
3. 각 소검사: 첫 화면(지시문·시작하기) → 예제 1·해설 → 예제 2·해설 → 시작 안내('설명 다시 보기'/'검사 시작') → 본 문항 20개.
   문항마다 제한시간(하 20초·중 30초·상/최상 50초). 다 풀면 '다음'으로 바로 넘어가고, 시간이 지나면 자동으로 넘어갑니다.
   본 문항 연속 3문항 0점이면 그 소검사는 중지(예측추론의 1점은 0점이 아니므로 중지에 세지 않음).
4. 저장: 검사가 끝나면 결과 JSON 1개(코드_시각_ID_results.json)가 DataPipe(실험 ID XfGPyXaYmLqT)로 한 번 전송됩니다.
   DataPipe 실험 설정의 Required fields 는 result. 결과 화면에서 같은 JSON 을 내려받을 수도 있습니다.
5. 엑셀: json_to_excel.html 에 결과 JSON 을 선택하면 sessions · trials 두 시트 엑셀이 만들어집니다.
6. 정답 확인: source/ANSWER_KEY.md (개발시트와 다르게 처리한 2곳이 맨 위에 있음).
7. 문서: README.md, source/ 의 CSV_FORMAT · DATA_DICTIONARY · METRICS · VALIDATION_v1.0.0 · DIFFERENCES_FROM_REFERENCE.
   문구 수정: source/pages/make-pages.py (지시문·예제 해설), 그림·정답 다시 만들기: source/booklet-tools/.
8. 테스트: node --test source/tests/*.test.cjs   /   로컬 확인: node source/serve.cjs → http://127.0.0.1:4173
