베트남어(Tiếng Việt) 버전 자리입니다. 아직 비어 있습니다.

만드는 방법
1. ko/<소검사>/ 폴더를 vi/<소검사>/ 로 복사합니다(13개).
2. 그림 안에 한국어 글자가 있는 소검사(언어 단서 결합, A:B, 언어적 추론, 물리적 길이 전이의 질문 줄, 레이븐·패턴 예제 문구 등)는
   베트남어 자극책자에서 같은 방식으로 그림(images/)과 data.js 를 다시 만듭니다(work 도구: source/pages/README 참고).
3. source/pages/make-pages.py 에 베트남어 문구(지시문·예제 해설·안내)를 넣어 vi/<소검사>/index.html 을 만듭니다.
   공통 버튼 문구(시작하기·다음·처음부터 다시 등)는 CFG.text 로 바꿀 수 있습니다(assets/engine.js 맨 위 T 참고).
4. source/config.js 의 readyLanguages 에 "vi" 를 추가하고, tasks 의 name/desc/meta 의 vi 문구를 채운 뒤
   node source/build-single.cjs 로 index.html 을 다시 만듭니다.
