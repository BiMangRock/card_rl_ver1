'use strict';
// 학습된 모델을 JS(게임과 같은 코드)로 직접 돌려 rule/rule2/random 봇과 대결시킨다.
// 사용: node train\eval_js.js <dqn|sarsa|mc> [판수=200] [best]
const path = require('node:path');
const E = require(path.join(__dirname, '..', 'game', 'engine_current.js'));
const { register } = require(path.join(__dirname, '..', 'game', 'rl_bot.js'));
const { playGames } = require(path.join(__dirname, 'play_util.js'));
const algo = process.argv[2] || 'dqn';
const games = Number(process.argv[3] || 200);
const key = 'rl_' + algo + (process.argv[4] === 'best' ? '_best' : '');
const loaded = register(E);
if (!E.BotPlayers[key]) { console.error(`모델 없음: ${key} (불러온 봇: ${loaded.join(', ') || '없음'})`); process.exit(1); }
const ci = (w, n) => { const z = 1.96, p = w / n, d = 1 + z * z / n, m = (p + z * z / (2 * n)) / d, r = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / d; return `${((m - r) * 100).toFixed(1)}–${((m + r) * 100).toFixed(1)}%`; };
for (const opp of ['random', 'rule', 'rule2']) {
  const t = Date.now();
  const r = playGames(E, games, E.BotPlayers[key], E.BotPlayers[opp], 200, { deckGen: () => [E.buildRandomDeck(), E.buildRandomDeck()] });
  const n = r.games - r.draws - r.stalled;
  console.log(`${key} vs ${opp}: ${(100 * r.wins[0] / Math.max(1, n)).toFixed(1)}% (${r.wins[0]}/${n}, 95%CI ${ci(r.wins[0], Math.max(1, n))}) 무 ${r.draws} 멈춤 ${r.stalled} 오류 ${r.errors}  ${((Date.now() - t) / 1000).toFixed(0)}s`);
  for (const m of r.stallInfo) console.log('    멈춤 예시: ' + m);
}
