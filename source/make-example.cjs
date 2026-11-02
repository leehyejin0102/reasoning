// 가상 예시 자료 생성: node source/make-example.cjs  → examples/EXAMPLE_P001_results.json / .xlsx
const fs = require('fs'), path = require('path'), E = require('./export.js'), C = require('./convert.js'), { session } = require('./tests/fixtures.cjs');
const out = path.resolve(__dirname, '..', 'examples'); fs.mkdirSync(out, { recursive: true });
const s = session(undefined, { participant_id: 'EXAMPLE_P001', session_id: 'a1111111-2222-4000-8000-000000000001', data_role: 'test' });
const json = E.cleanResult(s); fs.writeFileSync(path.join(out, 'EXAMPLE_P001_results.json'), JSON.stringify(json, null, 2));
fs.writeFileSync(path.join(out, 'EXAMPLE_P001_results.xlsx'), C.convert([json]).bytes);
fs.writeFileSync(path.join(out, 'README.txt'), '가상 예시 자료입니다(실제 참가자 아님). 앱이 저장하는 결과 JSON 과, 그 JSON 을 json_to_excel.html 로 변환한 엑셀입니다.\n브라우저 자동 실행으로 받은 CSV 일부(공통그림찾기 3문항, 예측추론 3문항, 물리적 길이 전이 5문항(중지 규칙), 패턴 2문항(누락 1))로 만들었습니다.\n');
console.log('examples written');
