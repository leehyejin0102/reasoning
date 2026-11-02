# 자극책자 → 온라인 문항 변환 도구 (Python)

ko/<소검사>/images/*.jpg 와 data.js(선택 영역·정답)는 이 도구로 자극책자 PDF 와 개발시트(엑셀)에서 만들었습니다.
베트남어 자극책자로 vi/ 버전을 만들 때 같은 순서로 다시 실행하면 됩니다. (필요: Python 3, opencv-python, numpy, scipy, openpyxl, Pillow, poppler-utils)

| 순서 | 파일 | 하는 일 |
|---|---|---|
| 1 | (터미널) `pdftoppm -r 150 -png <책자.pdf> pages/core/p` | 책자 페이지를 그림으로 저장 |
| 2 | `pagemap.py` | 소검사별 페이지 번호(표지·지시문·예제1·해설·예제2·해설·문항 20) |
| 3 | `extract.py` | 문항 번호 표시를 지우고, 보기 칸(테두리 상자)을 자동으로 찾아 `det/*.json` 저장 |
| 4 | `overlay.py <소검사>` | 찾은 칸을 빨간 상자로 그려 확인용 그림 생성 |
| 5 | `build_data.py <소검사…>` | 엑셀 개발시트의 정답·난이도·제한시간과 칸을 합쳐 `data/*.json` |
| 6 | `length_map.py` | 물리적 길이 전이: 반쪽 칸마다 어떤 사물(A~E)인지(눈으로 확인해 적은 값) |
| 7 | `keysheet.py <소검사>` | 정답 칸을 초록색으로 표시한 정답 확인 그림 |
| 8 | `export.py` | 그림을 잘라 `ko/<소검사>/images/` 와 `data.js` 로 내보냄 |

- 경로는 작업 환경 기준(`/home/claude/work`, `/home/claude/reasoning`)으로 적혀 있으니 각 파일 위쪽의 경로만 바꿔 쓰세요.
- `data/` 에는 최종 정답 자료(JSON)가 있습니다. 개발시트와 다르게 처리한 2곳은 source/ANSWER_KEY.md 맨 위에 적어 두었습니다.
