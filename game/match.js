'use strict';
// 판마다 치트를 새로 추첨하는 대전 루프 (E.selfPlay 는 옵션이 고정이라 판마다 다른 치트를 못 붙인다).
// A 봇이 이긴 판 수를 돌려준다. 좌석은 반반 교대하고, 치트는 항상 B 봇 쪽에만 붙는다.
const { rollCheats } = require('./cheats.js');
function duel(E, A, B, games, { cheatTier = 0, maxTurns = 200 } = {}) {
  const r = { win: 0, lose: 0, draws: 0, stalled: 0, errors: 0 };
  for (let g = 0; g < games; g++) {
    const aSeat = g % 2;                                   // A 가 앉을 좌석 (교대)
    const mods = [{}, {}];
    mods[1 - aSeat] = rollCheats(cheatTier);               // B 의 좌석에만 치트
    let s = E.newGame(Math.random, { decks: [E.buildRandomDeck(), E.buildRandomDeck()], mods });
    while (!s.over && s.turnNo <= maxTurns) {
      const bot = s.turn === aSeat ? A : B;
      const res = E.apply(s, bot.decide(E.viewFor(s, s.turn)), s.turn);
      if (!res.ok) { r.errors++; break; }
      s = res.state;
    }
    if (s.over) { if (s.winner === null) r.draws++; else if (s.winner === aSeat) r.win++; else r.lose++; }
    else if (!r.errors || s.turnNo > maxTurns) r.stalled++;
  }
  return r;
}
module.exports = { duel };
