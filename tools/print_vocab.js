'use strict';
// 옛 방식(v1, features.js)의 번호 순서를 엔진 파일에서 재현해 JSON 으로 출력: {names:[...], effs:[...]}  (번호 = 위치+1)
// 사용: node tools\print_vocab.js game\engine_v89.js
const path = require('node:path');
const E = require(path.resolve(process.argv[2]));
const names = [], seen = new Set();
E.CARD_POOL.forEach(c => { if (!seen.has(c.name)) { seen.add(c.name); names.push(c.name); } });
const effs = [...new Set(E.CARD_POOL.map(c => c.effect && c.effect.type).filter(Boolean))].sort();
process.stdout.write(JSON.stringify({ version: E.VERSION, names, effs }) + '\n');
