'use strict';
// 두 봇을 직접 대결시킨다 (게임과 같은 JS 코드). 좌석(0/1)을 반반 바꿔서 선·후공 유리함을 상쇄한다.
// 사용: node train\eval_vs.js <봇A> [봇B ...] [--games=400]
//   예) node train\eval_vs.js rl_ppo_best                      → random / rule / rule2 / rl_dqn_best 전부와 대결
//       node train\eval_vs.js rl_ppo_best rl_dqn_best          → 지정한 상대만
//       node train\eval_vs.js rl_ppo rl_dqn_best --games=1000
// 봇 이름: random, rule, rule2, rl_dqn(_best), rl_sarsa(_best), rl_mc(_best), rl_ppo(_best)
const path = require('node:path');
const E = require(path.join(__dirname, '..', 'game', 'engine_current.js'));
const { register } = require(path.join(__dirname, '..', 'game', 'rl_bot.js'));
const { playGames } = require(path.join(__dirname, 'play_util.js'));

const argv = process.argv.slice(2);
const gArg = argv.find(a => a.startsWith('--games='));
const games = gArg ? Number(gArg.split('=')[1]) : 400;
const names = argv.filter(a => !a.startsWith('--'));
const loaded = register(E);
const A = names[0];
if (!A || !E.BotPlayers[A]) {
  console.error(`봇 없음: ${A || '(지정 안 함)'}  불러온 RL 봇: ${loaded.join(', ') || '없음'}`);
  process.exit(1);
}
let opps = names.slice(1);
if (!opps.length) opps = ['random', 'rule', 'rule2', ...loaded.filter(n => n !== A)];
for (const o of opps) if (!E.BotPlayers[o]) { console.error(`상대 봇 없음: ${o}`); process.exit(1); }

const ci = (w, n) => { const z = 1.96, p = w / n, d = 1 + z * z / n, m = (p + z * z / (2 * n)) / d, r = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / d; return `${((m - r) * 100).toFixed(1)}–${((m + r) * 100).toFixed(1)}%`; };
const opts = { deckGen: () => [E.buildRandomDeck(), E.buildRandomDeck()] };

console.log(`${A}: 각 상대와 ${games}판 (좌석 반반 교대, 양쪽 랜덤 덱)`);
for (const o of opps) {
  const t = Date.now();
  const h = Math.floor(games / 2);
  const r1 = playGames(E, h, E.BotPlayers[A], E.BotPlayers[o], 200, opts);              // A = 좌석 0
  const r2 = playGames(E, games - h, E.BotPlayers[o], E.BotPlayers[A], 200, opts);      // A = 좌석 1
  const w = r1.wins[0] + r2.wins[1], l = r1.wins[1] + r2.wins[0];
  const draws = r1.draws + r2.draws, stalled = r1.stalled + r2.stalled, errors = r1.errors + r2.errors;
  const n = Math.max(1, w + l);                       // 무승부·멈춤은 승률 계산에서 제외 (eval_js.js 와 같은 방식)
  console.log(`  vs ${o.padEnd(12)} ${(100 * w / n).toFixed(1).padStart(5)}%  (${w}승 ${l}패, 95%CI ${ci(w, n)})  무 ${draws} 멈춤 ${stalled} 오류 ${errors}  ${((Date.now() - t) / 1000).toFixed(0)}s`);
  for (const m of [...r1.stallInfo, ...r2.stallInfo].slice(0, 2)) console.log('    멈춤 예시: ' + m);
}
