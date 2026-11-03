'use strict';
// 이식 검증: 옛 모델(v1)과 이식된 모델(v2)이 같은 상태에서 같은 점수를 내는지 비교한다 (옛 엔진 위에서).
// 사용: node tools\verify_migration.js <옛 model/best.json> <새 model/best.json> [옛 엔진=game\engine_v89.js] [판수=60]
const path = require('node:path');
const [oldJ, newJ, engArg, gArg] = process.argv.slice(2);
if (!oldJ || !newJ) { console.error('사용: node tools\\verify_migration.js <옛.json> <새.json> [옛엔진.js] [판수]'); process.exit(1); }
const E = require(path.resolve(engArg || path.join(__dirname, '..', 'game', 'engine_v89.js')));
const { loadNet } = require('../game/rl_bot.js');
const FZ1 = require('../game/features.js').makeFeaturizer(E);
const FZ2 = require('../game/features2.js').makeFeaturizer(E);
const a = loadNet(path.resolve(oldJ)), b = loadNet(path.resolve(newJ));
const why = FZ2.compat(b.meta);
if (why) { console.error('새 모델이 현재 번호표와 호환되지 않습니다: ' + why); process.exit(1); }
const games = Number(gArg || 60);
let n = 0, maxd = 0, arg = 0, skipped = 0;
for (let g = 0; g < games; g++) {
  let s = E.newGame(Math.random, { decks: [E.buildRandomDeck(), E.buildRandomDeck()] });
  const bots = [E.BotPlayers.rule2, E.BotPlayers.rule]; let st = 0;
  while (!s.over && s.turnNo <= 200 && st++ < 3000) {
    const v = E.viewFor(s, s.turn);
    // 손패 카드를 대상으로 하는 행동은 옛 방식이 '대상 없음'으로 뭉갰고 새 방식은 구분함(의도된 개선) → 비교에서 제외
    if (v.legal.some(l => l.target && l.target.kind === 'hand')) skipped++;
    else if (v.legal.length) {
      const qa = a.scores(FZ1.encode(v)), qb = b.scores(FZ2.encodeDense(v));
      let ia = 0, ib = 0;
      for (let i = 0; i < qa.length; i++) { maxd = Math.max(maxd, Math.abs(qa[i] - qb[i])); if (qa[i] > qa[ia]) ia = i; if (qb[i] > qb[ib]) ib = i; }
      if (ia !== ib) arg++;
      n++;
    }
    const r = E.apply(s, bots[s.turn].decide(v), s.turn); if (!r.ok) break; s = r.state;
  }
}
console.log(`비교한 결정 ${n}개 (손패 대상 상태 ${skipped}개 제외): 점수 최대 차이 ${maxd.toExponential(2)}, 선택이 달라진 결정 ${arg}개`);
console.log(arg === 0 && maxd < 1e-6 ? '✔ 이식 정상: 옛 모델과 같은 판단을 합니다' : '✘ 차이가 있습니다 — 이식 과정을 확인하세요');
