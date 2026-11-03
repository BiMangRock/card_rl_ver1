'use strict';
// 봇끼리 대전 (좌석을 반반 바꿔서 공정하게). 결과는 숫자로만 출력.
// 사용:
//   node train\versus.js <봇A> <봇B> [판수=200]      예) node train\versus.js dqn_best sarsa_best 300
//   node train\versus.js <봇A> <봇B> [판수] --cheat 300   → 봇B 에게만 배당 300% 치트를 붙여 대전
//   node train\versus.js all [판수=100] [best|latest]  → 있는 모델 전부 총당 대전(자기 자신과의 대전 포함)
// 봇 이름: dqn, dqn_best, sarsa, sarsa_best, mc, mc_best, rule, rule2, random
//   (xxx = 마지막 저장 모델, xxx_best = 평가 최고 모델)
const path = require('node:path');
const E = require(path.join(__dirname, '..', 'game', 'engine_v89.js'));
const { register } = require(path.join(__dirname, '..', 'game', 'rl_bot.js'));
register(E);

const get = n => E.BotPlayers[n] || E.BotPlayers['rl_' + n];
const ci = (w, n) => { const z = 1.96, p = w / n, d = 1 + z * z / n, m = (p + z * z / (2 * n)) / d, r = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / d; return `${((m - r) * 100).toFixed(0)}–${((m + r) * 100).toFixed(0)}%`; };
const deckGen = () => [E.buildRandomDeck(), E.buildRandomDeck()];

// A 가 이긴 판 / 결정난 판 반환 (절반은 A가 0번 좌석, 절반은 1번 좌석)
const { duel: duelCheat } = require(path.join(__dirname, '..', 'game', 'match.js'));
function duel(A, B, games) { return duelCheat(E, A, B, games, { cheatTier }); }
const line = (a, b, games) => {
  const t = Date.now();
  const r = duel(get(a), get(b), games);
  const n = r.win + r.lose;
  return { a, b, rate: n ? r.win / n : 0, text: `${a} vs ${b}${cheatTier ? ' [' + b + ' 치트 ' + cheatTier + ']' : ''}: ${(100 * r.win / Math.max(1, n)).toFixed(1)}% (${r.win}/${n}, 95%CI ${ci(r.win, Math.max(1, n))}) 무 ${r.draws} 멈춤 ${r.stalled} 오류 ${r.errors}  ${((Date.now() - t) / 1000).toFixed(0)}s` };
};

const args = process.argv.slice(2);
const _ci = args.indexOf('--cheat');
const cheatTier = _ci >= 0 ? Number(args[_ci + 1]) : 0;
if (_ci >= 0) args.splice(_ci, 2);
if (args[0] === 'all') {
  const games = Number(args[1] || 100), suffix = args[2] === 'latest' ? '' : '_best';
  const names = ['dqn', 'sarsa', 'mc'].map(x => x + suffix).filter(x => get(x));
  if (names.length < 1) { console.error('불러온 RL 모델이 없습니다.'); process.exit(1); }
  console.log('참가:', names.join(', '), `(각 대전 ${games}판, 좌석 교대)`);
  const tbl = {};
  for (const a of names) for (const b of names) {
    const r = line(a, b, games); console.log(r.text); (tbl[a] = tbl[a] || {})[b] = r.rate;
  }
  console.log('\n승률표 (행이 열을 이긴 비율, 대각선은 자기 자신과의 대전)');
  console.log(['', ...names].join('\t'));
  for (const a of names) console.log([a, ...names.map(b => (100 * tbl[a][b]).toFixed(0) + '%')].join('\t'));
} else {
  const [a, b] = args, games = Number(args[2] || 200);
  if (!a || !b) { console.error('사용: node train\\versus.js <봇A> <봇B> [판수]  또는  node train\\versus.js all [판수] [best|latest]'); process.exit(1); }
  for (const n of [a, b]) if (!get(n)) { console.error(`모델/봇 없음: ${n}`); process.exit(1); }
  console.log(line(a, b, games).text);
}
