// 첫 화면(셸)을 index.html 한 파일로 묶습니다: node source/build-single.cjs
// → 저장소 루트의 index.html 생성 (CSS·로고·스크립트를 모두 안에 넣음)
const fs = require('node:fs'), path = require('node:path');
const root = __dirname, out = path.resolve(root, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => '<style>' + fs.readFileSync(path.join(root, 'styles.css'), 'utf8') + '</style>');
html = html.replaceAll('src="assets/institute-logo.png"', () => 'src="data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets', 'institute-logo.png')).toString('base64') + '"');
const scripts = [];
html = html.replace(/<script defer src="([^"]+)"><\/script>/g, (_, name) => { scripts.push('<script>' + fs.readFileSync(path.join(root, name), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>'); return ''; });
html = html.replace('</body>', scripts.join('\n') + '\n</body>');
const dest = path.join(out, 'index.html'); fs.writeFileSync(dest, html, 'utf8'); console.log(dest);
