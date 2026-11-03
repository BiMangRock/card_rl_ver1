'use strict';
// E.selfPlay 와 같은 대전 루프 + "한 판 안의 행동 수 상한". 한 턴 안에서 행동만 반복하며 안 끝나는 판은
// '멈춤'으로 세고 다음 판으로 넘어간다. (엔진 파일은 수정하지 않음)
// 반환: { games, wins:[좌석0,좌석1], draws, stalled, errors, stallInfo:[...] }
function playGames(E, games, botA, botB, maxTurns, opts, maxSteps) {
  maxSteps = maxSteps || 3000;
  const st = { games, wins: [0, 0], draws: 0, stalled: 0, errors: 0, stallInfo: [] };
  for (let g = 0; g < games; g++) {
    let s = E.newGame(Math.random, opts && opts.deckGen ? { ...opts, decks: opts.deckGen() } : (opts || {}));
    let steps = 0, bad = false;
    const recent = [];
    while (!s.over && s.turnNo <= maxTurns) {
      if (++steps > maxSteps) break;
      const bot = s.turn === 0 ? botA : botB;
      let a;
      try { a = bot.decide(E.viewFor(s, s.turn)); } catch (e) { st.errors++; bad = true; break; }
      recent.push((s.turn === 0 ? 'A:' : 'B:') + (a && a.type) + (a && a.cardId != null ? '#' + a.cardId : ''));
      if (recent.length > 8) recent.shift();
      const r = E.apply(s, a, s.turn);
      if (!r.ok) { st.errors++; bad = true; break; }
      s = r.state;
    }
    if (bad) continue;
    if (s.over) { if (s.winner === null) st.draws++; else st.wins[s.winner]++; }
    else {
      st.stalled++;
      if (st.stallInfo.length < 2) st.stallInfo.push(`턴 ${s.turnNo}, 행동 ${steps > maxSteps ? '상한(' + maxSteps + ') 초과' : '턴 상한'}, 마지막 행동: ${recent.join(' ')}`);
    }
  }
  return st;
}
module.exports = { playGames };
