// 엑셀 변환기를 json_to_excel.html 한 파일로 묶습니다: node source/build-converter.cjs
const fs = require('fs'), path = require('path'), source = __dirname, root = path.resolve(source, '..');
let html = fs.readFileSync(path.join(source, 'convert-page.html'), 'utf8');
const names = ['tasks.js', 'participant.js', 'analysis.js', 'workbook.js', 'data-tables.js', 'convert.js'];
const scripts = names.map(n => '<script>' + fs.readFileSync(path.join(source, n), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>').join('\n');
html = html.replace('<script>', () => scripts + '\n<script>');
fs.writeFileSync(path.join(root, 'json_to_excel.html'), html);
console.log(path.join(root, 'json_to_excel.html'));
