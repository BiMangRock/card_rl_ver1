'use strict';
// 번호표(game\card_registry.json) 만들기/갱신. 번호는 한 번 정하면 절대 바뀌지 않고, 새 항목은 맨 뒤에만 붙는다.
//   카드 이름 → 번호 (names), 효과 종류 → 번호 (effs), 카드 키워드 → 특징 칸 번호 (kws)
// 사용:
//   node tools\update_registry.js                       현재 엔진(engine_config.json)의 새 카드·효과·키워드를 뒤에 추가
//   node tools\update_registry.js game\engine_v89.js game\engine_v112.js
//                                                       처음 만들 때: 앞쪽 엔진부터 순서대로 번호를 붙임 (v89 모델 이식용)
//   --check   파일을 바꾸지 않고 추가될 것만 보여 줌
// 이름을 바꾼 카드는 game\card_aliases.json 에 "새이름": "옛이름" 을 먼저 적어 둘 것 (새 번호를 받지 않고 옛 번호를 이어받음).
const fs = require('node:fs');
const path = require('node:path');

const CAPS = { names: 1024, effs: 512, kws: 160 };
const REG_FILE = process.env.CARD_REGISTRY || path.join(__dirname, '..', 'game', 'card_registry.json');
const ALIAS_FILE = path.join(__dirname, '..', 'game', 'card_aliases.json');
// 카드 데이터의 구조용 키(특징으로 쓰지 않음)와, 인게임 하수인에만 생기는 상태 키 중 의미 있는 것
const STRUCT = new Set(['type', 'name', 'cost', 'atk', 'hp', 'maxHp', 'effect', 'school', 'runes', 'rc', 'tribe', 'rarity', 'id']);
const RUNTIME_KEYS = ['stealth', 'stealthTemp', 'poison', 'wfUsed', 'tempAtk', 'shieldHits', 'echoTemp', 'isMini', 'hatchLeft', 'infect'];

const args = process.argv.slice(2);
const check = args.includes('--check');
let engines = args.filter(a => !a.startsWith('--'));
if (!engines.length) engines = [path.join(__dirname, '..', 'game', 'engine_current.js')];

const reg = fs.existsSync(REG_FILE) ? JSON.parse(fs.readFileSync(REG_FILE, 'utf8'))
  : { _설명: '번호는 절대 바꾸지 말 것. 새 항목은 맨 뒤에만 추가됨 (tools\\update_registry.js). 배열 위치+1 = 번호(names, effs), 위치 = 칸 번호(kws).', caps: CAPS, names: [], effs: [], kws: [] };
if (!fs.existsSync(REG_FILE)) console.log('번호표가 없어서 새로 만듭니다: ' + REG_FILE);
const aliases = (fs.existsSync(ALIAS_FILE) ? JSON.parse(fs.readFileSync(ALIAS_FILE, 'utf8')).aliases : {}) || {};
for (const [nw, old] of Object.entries(aliases)) {
  if (!reg.names.includes(old)) { console.error(`별칭 오류: "${nw}" → "${old}" (옛 이름이 번호표에 없음)`); process.exit(1); }
}

const added = { names: [], effs: [], kws: [] };
for (const file of engines) {
  const f = path.resolve(file);
  const E = require(f);
  const pool = E.CARD_POOL;
  const nameSet = new Set(reg.names);
  for (const c of pool) {                                           // 이름: 카드 목록 순서(처음 나온 순)
    if (aliases[c.name]) continue;
    if (!nameSet.has(c.name)) { reg.names.push(c.name); nameSet.add(c.name); added.names.push(c.name); }
  }
  const effSet = new Set(reg.effs);
  const newEffs = [...new Set(pool.map(c => c.effect && c.effect.type).filter(Boolean))].filter(t => !effSet.has(t)).sort();
  for (const t of newEffs) { reg.effs.push(t); added.effs.push(t); }   // 효과: 새 것끼리 가나다순으로 뒤에
  const kwSet = new Set(reg.kws);
  const keys = [];
  for (const c of pool) for (const k of Object.keys(c)) if (!STRUCT.has(k) && c[k] && !keys.includes(k)) keys.push(k);
  for (const k of [...keys, ...RUNTIME_KEYS]) if (!kwSet.has(k)) { reg.kws.push(k); kwSet.add(k); added.kws.push(k); }
}
for (const [what, cap0] of Object.entries(CAPS)) {
  const cap = reg.caps[what] || cap0, room = what === 'kws' ? cap : cap - 1;   // 이름·효과는 0번이 '모름' 자리
  if (reg[what].length > room) {
    console.error(`오류: ${what} 가 용량(${room})을 넘었습니다. 용량을 늘리려면 tools\\update_registry.js 의 CAPS 를 키우고 train\\migrate.py 로 모델을 옮기세요.`);
    process.exit(1);
  }
}
console.log(`추가됨: 카드 ${added.names.length}, 효과 ${added.effs.length}, 키워드 ${added.kws.length}`);
if (added.names.length) console.log('  새 카드: ' + added.names.slice(0, 12).join(', ') + (added.names.length > 12 ? ` 외 ${added.names.length - 12}장` : ''));
console.log(`현재: 카드 ${reg.names.length}/${reg.caps.names}  효과 ${reg.effs.length}/${reg.caps.effs}  키워드 ${reg.kws.length}/${reg.caps.kws}`);
if (check) { console.log('(--check: 파일은 바꾸지 않았습니다)'); process.exit(0); }
const structNow = JSON.stringify([...STRUCT]);
if (JSON.stringify(reg.struct) !== structNow) { reg.struct = [...STRUCT]; added.kws.length || (added.struct = true); }
if (added.names.length || added.effs.length || added.kws.length || added.struct || !fs.existsSync(REG_FILE)) {
  fs.writeFileSync(REG_FILE, JSON.stringify(reg, null, 1), 'utf8');
  console.log('번호표 저장: ' + REG_FILE);
} else console.log('바뀐 것이 없어서 저장하지 않았습니다.');
