'use strict';
// 게임 HTML(<script id="engine">)에서 엔진을 뽑아 Node 용 파일로 저장한다.
// 엔진 블록이 화면 스크립트에 정의된 함수/상수(예: runeOf)를 쓰고 있으면 HTML 에서 찾아 앞에 붙여 준다.
// 사용: node tools\extract_engine.js <게임.html> [저장경로]      (저장경로 기본값: game\engine_<VERSION>.js)
const fs = require('node:fs');
const path = require('node:path');

const htmlFile = process.argv[2];
if (!htmlFile) { console.error('사용: node tools\\extract_engine.js <게임.html> [저장경로]'); process.exit(1); }
const html = fs.readFileSync(htmlFile, 'utf8');
const start = html.indexOf('<script id="engine">');
if (start < 0) { console.error('<script id="engine"> 를 찾지 못했습니다.'); process.exit(1); }
const bodyStart = html.indexOf('>', start) + 1;
const bodyEnd = html.indexOf('</script>', bodyStart);
const engine = html.slice(bodyStart, bodyEnd);
const ver = (engine.match(/const VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1];
if (!ver) { console.error('VERSION 을 찾지 못했습니다.'); process.exit(1); }

// 선언문 하나를 괄호 균형을 맞춰 잘라낸다 (function X(...){...} 또는 const X = ...;)
function grabDecl(name) {
  const re = new RegExp(`(?:^|\\n)((?:async\\s+)?function\\s+${name}\\s*\\(|(?:const|let|var)\\s+${name}\\s*=)`);
  const m = re.exec(html);
  if (!m) return null;
  const s = m.index + (m[0].startsWith('\n') ? 1 : 0);
  const isFn = /function/.test(m[1]);
  let i = s, depth = 0, q = null, seenBody = false;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; }
    if ('([{'.includes(ch)) { depth++; if (ch === '{') seenBody = true; }
    else if (')]}'.includes(ch)) { depth--; if (isFn && seenBody && depth === 0) { i++; break; } }
    else if (!isFn && ch === ';' && depth === 0) { i++; break; }
  }
  return html.slice(s, i);
}

function trial(code) { // 코드를 불러와 판을 돌려 보며 정의되지 않은 이름(ReferenceError)을 찾는다
  const mod = { exports: {} };
  try { new Function('module', code)(mod); } catch (e) { return e; }   // Node 전역(structuredClone 등)을 그대로 쓴다
  const E = mod.exports;
  try {
    for (let g = 0; g < 40; g++) {
      let s = E.newGame(Math.random, { decks: [E.buildRandomDeck(), E.buildRandomDeck()] });
      let st = 0; const bots = [E.BotPlayers.rule2, E.BotPlayers.rule];
      while (!s.over && s.turnNo <= 200 && st++ < 3000) {
        const r = E.apply(s, bots[s.turn].decide(E.viewFor(s, s.turn)), s.turn);
        if (!r.ok) break; s = r.state;
      }
    }
  } catch (e) { return e; }
  return null;
}

let code = engine, added = [];
for (let it = 0; it < 15; it++) {
  const err = trial(code);
  if (!err) break;
  const m = /^ReferenceError: (\w+) is not defined/.exec(String(err));
  if (!m || added.includes(m[1])) { console.error('엔진을 실행하지 못했습니다:', String(err).split('\n')[0]); process.exit(1); }
  const decl = grabDecl(m[1]);
  if (!decl) { console.error(`'${m[1]}' 가 엔진 블록에 없고 HTML 에서도 찾지 못했습니다.`); process.exit(1); }
  added.push(m[1]);
  code = `// [extract_engine] 화면 스크립트에 있던 정의를 엔진 앞에 복사함: ${m[1]}\n${decl}\n` + code;
}
if (trial(code)) { console.error('엔진 검증 실패'); process.exit(1); }

const out = process.argv[3] || path.join(__dirname, '..', 'game', `engine_${ver}.js`);
fs.writeFileSync(out, code, 'utf8');
console.log(`엔진 ${ver} 저장: ${out}  (${code.split('\n').length}줄)`);
console.log(added.length ? `화면 쪽에서 가져온 정의: ${added.join(', ')}` : '추가로 가져온 정의 없음');
console.log('검증: 규칙 봇 40판 오류 없이 완주');
