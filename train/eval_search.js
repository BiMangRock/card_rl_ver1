'use strict';
// 탐색 봇 평가 (여러 프로세스로 나눠 돌린다). eval_vs.js 와 같은 방식: 좌석 반반 교대, 양쪽 랜덤 덱.
// 사용: node train\eval_search.js <탐색봇> [상대 ...] [--games=100] [--workers=5]
//   예) node train\eval_search.js search_dqn_v112_best rl_dqn_v112_best rule2 --games=100
//   상대를 안 쓰면: rl_dqn_v112_best(= 탐색 없는 같은 모델), rule2, rule 과 대결
// 탐색 강도: 환경변수 SEARCH_K(가상 세계 수), SEARCH_M(후보 수).  예) set SEARCH_K=10
const path = require('node:path');
const os = require('node:os');
const { fork } = require('node:child_process');

const argv = process.argv.slice(2);
const opt = n => { const a = argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : null; };
const names = argv.filter(a => !a.startsWith('--'));

function playOne(E, A, B, aSeat, maxTurns = 200, maxSteps = 3000) {
  let s = E.newGame(Math.random, { decks: [E.buildRandomDeck(), E.buildRandomDeck()] });
  for (let steps = 0; !s.over && s.turnNo <= maxTurns; steps++) {
    if (steps > maxSteps) return 'stall';
    const bot = s.turn === aSeat ? A : B;
    let a;
    try { a = bot.decide(E.viewFor(s, s.turn), s); } catch (e) { return 'error'; }
    const r = E.apply(s, a, s.turn);
    if (!r.ok) return 'error';
    s = r.state;
  }
  if (!s.over) return 'stall';
  return s.winner === null ? 'draw' : (s.winner === aSeat ? 'win' : 'lose');
}

function loadAll() {
  const E = require(path.join(__dirname, '..', 'game', 'engine_current.js'));
  process.env.RL_QUIET = '1';
  const loaded = require(path.join(__dirname, '..', 'game', 'rl_bot.js')).register(E);
  const searchLoaded = require(path.join(__dirname, '..', 'game', 'ismcts_bot.js')).register(E);
  return { E, loaded, searchLoaded };
}

if (process.argv.includes('--child')) {            // ---- 작업 프로세스 ----
  const { E } = loadAll();
  const [A, B, nStr, offStr] = [opt('a'), opt('b'), opt('n'), opt('off')];
  const r = { win: 0, lose: 0, draw: 0, stall: 0, error: 0 };
  for (let g = 0; g < Number(nStr); g++) r[playOne(E, E.BotPlayers[A], E.BotPlayers[B], (g + Number(offStr)) % 2)]++;
  process.send(r);
  process.exit(0);
} else {                                           // ---- 부모 ----
  const { E, loaded, searchLoaded } = loadAll();
  const A = names[0];
  if (!A || !E.BotPlayers[A]) { console.error(`봇 없음: ${A || '(지정 안 함)'}\n  탐색 봇: ${searchLoaded.join(', ') || '없음'}\n  RL 봇: ${loaded.join(', ') || '없음'}`); process.exit(1); }
  let opps = names.slice(1);
  if (!opps.length) opps = [A.replace(/^search_/, 'rl_'), 'rule2', 'rule'].filter(n => E.BotPlayers[n]);
  for (const o of opps) if (!E.BotPlayers[o]) { console.error(`상대 봇 없음: ${o}`); process.exit(1); }
  const games = Number(opt('games') || 100);
  const W = Math.max(1, Number(opt('workers') || Math.max(1, os.cpus().length - 1)));
  const ci = (w, n) => { const z = 1.96, p = w / n, d = 1 + z * z / n, m = (p + z * z / (2 * n)) / d, r = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / d; return `${((m - r) * 100).toFixed(1)}–${((m + r) * 100).toFixed(1)}%`; };
  console.log(`${A}: 각 상대와 ${games}판 (좌석 반반 교대, 양쪽 랜덤 덱, 작업 프로세스 ${W}개, K=${process.env.SEARCH_K || 6} M=${process.env.SEARCH_M || 4})`);
  (async () => {
    for (const o of opps) {
      const t = Date.now();
      const per = Array.from({ length: W }, (_, i) => Math.floor(games / W) + (i < games % W ? 1 : 0));
      let off = 0;
      const results = await Promise.all(per.map(n => {
        const myOff = off; off += n;
        return new Promise(res => {
          if (!n) return res({ win: 0, lose: 0, draw: 0, stall: 0, error: 0 });
          const c = fork(__filename, ['--child', `--a=${A}`, `--b=${o}`, `--n=${n}`, `--off=${myOff}`]);
          c.on('message', res); c.on('error', () => res({ win: 0, lose: 0, draw: 0, stall: 0, error: n }));
        });
      }));
      const T = results.reduce((a, r) => { for (const k in r) a[k] = (a[k] || 0) + r[k]; return a; }, {});
      const n = Math.max(1, T.win + T.lose);
      console.log(`  vs ${o.padEnd(22)} ${(100 * T.win / n).toFixed(1).padStart(5)}%  (${T.win}승 ${T.lose}패, 95%CI ${ci(T.win, n)})  무 ${T.draw} 멈춤 ${T.stall} 오류 ${T.error}  ${((Date.now() - t) / 1000).toFixed(0)}s`);
    }
  })();
}
