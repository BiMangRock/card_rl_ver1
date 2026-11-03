'use strict';
// Python 학습 코드와 stdin/stdout(JSON 한 줄씩)으로 통신하는 벡터 환경 서버.
// 한 프로세스가 K개의 게임을 동시에 진행한다. 에이전트가 아닌 쪽은 내부 봇이 알아서 둔다.
const readline = require('node:readline');
const path = require('node:path');
// 엔진: game\engine_config.json (또는 환경변수 CARD_ENGINE), 특징 변환: 기본 v2(번호표). 옛 방식은 환경변수 FEATURES=v1
const E = require(path.join(__dirname, '..', 'game', 'engine_current.js'));
const { makeFeaturizer } = require(path.join(__dirname, '..', 'game', process.env.FEATURES === 'v1' ? 'features.js' : 'features2.js'));
const FZ = makeFeaturizer(E);

// 저장된 RL 모델(models/<알고리즘>/model.json, best.json)을 상대 봇으로 등록 → --opp 에 rl_dqn_best:0.3 처럼 사용 가능
// 등록 가능한 이름: rl_dqn, rl_dqn_best, rl_sarsa, rl_sarsa_best, rl_mc, rl_mc_best (해당 모델 파일이 있을 때만)
try {
  const loaded = require(path.join(__dirname, '..', 'game', 'rl_bot.js')).register(E);
  if (loaded.length) process.stderr.write('[env] RL 상대 봇 등록: ' + loaded.join(', ') + '\n');
} catch (e) { process.stderr.write('[env] RL 봇 등록 실패(무시하고 계속): ' + e.message + '\n'); }

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cfg = { n: 0, deck: 'random', opp: { rule2: 0.5, rule: 0.3, random: 0.2 }, shape: 0.5, gamma: 0.99, maxTurns: 200, maxAgentSteps: 1500 };
let envs = [];
let rng = Math.random;
let fixedDeck = null;
const stats = { invalid: 0, errors: 0, stalls: 0 };

const clone = o => JSON.parse(JSON.stringify(o));
function pickOpp() {
  const entries = Object.entries(cfg.opp);
  const tot = entries.reduce((a, [, w]) => a + w, 0);
  let r = rng() * tot;
  for (const [name, w] of entries) { r -= w; if (r <= 0) return name; }
  return entries[0][0];
}
const phi = env => {
  const s = env.s, me = s.seats[env.agentSeat], op = s.seats[1 - env.agentSeat];
  const d = ((me.hp + (me.armor || 0)) - (op.hp + (op.armor || 0))) / 60;
  return Math.max(-1, Math.min(1, d));
};

function advance(env) {
  let guard = 0;
  while (!env.s.over && env.s.turnNo <= cfg.maxTurns && env.s.turn !== env.agentSeat && guard++ < 5000) {
    const seat = env.s.turn;
    let a;
    try { a = env.bot.decide(E.viewFor(env.s, seat)); } catch (e) { env.err = true; stats.errors++; return; }
    if (!a || !a.type) { env.err = true; stats.errors++; return; }
    const r = E.apply(env.s, a, seat);
    if (!r.ok) { env.err = true; stats.errors++; return; }
    env.s = r.state;
  }
}

function startGame(env) {
  env.agentSeat = (env.counter++ + env.id) % 2;
  const decks = [E.buildRandomDeck(rng), E.buildRandomDeck(rng)];
  if (cfg.deck === 'fixed') decks[env.agentSeat] = clone(fixedDeck);
  env.s = E.newGame(rng, { decks });
  env.oppName = pickOpp();
  env.bot = E.BotPlayers[env.oppName];
  env.steps = 0; env.err = false;
  advance(env);
  env.phi = phi(env);
}

const finished = env => env.s.over || env.err || env.s.turnNo > cfg.maxTurns || env.steps >= cfg.maxAgentSteps;
const obsOf = env => FZ.encode(E.viewFor(env.s, env.agentSeat));

function doStep(env, idx) {
  const view = E.viewFor(env.s, env.agentSeat);
  let action = view.legal[idx];
  if (!action) { stats.invalid++; action = view.legal.find(l => l.type === 'END_TURN') || view.legal[0]; }
  const r = action ? E.apply(env.s, action, env.agentSeat) : { ok: false };
  if (!r.ok) { stats.invalid++; env.err = true; } else env.s = r.state;
  env.steps++;
  if (!env.err) advance(env);
  let reward, done = false, win = 0, turns = env.s.turnNo;
  if (finished(env)) {
    done = true;
    if (env.s.over && env.s.winner !== null && !env.err) win = env.s.winner === env.agentSeat ? 1 : -1;
    else stats.stalls++;
    reward = win + cfg.shape * (0 - env.phi);
  } else {
    const p = phi(env);
    reward = cfg.shape * (cfg.gamma * p - env.phi);
    env.phi = p;
  }
  const info = done ? { win, turns, opp: env.oppName, seat: env.agentSeat } : undefined;
  if (done) startGame(env);
  return { obs: obsOf(env), r: Math.round(reward * 1e5) / 1e5, done, info };
}

function reset(msg) {
  cfg = { ...cfg, ...msg };
  // 존재하지 않는 상대 이름(모델 파일 없음 등)은 빼고 경고만 출력
  const okOpp = {};
  for (const [name, w] of Object.entries(cfg.opp)) {
    if (E.BotPlayers[name]) okOpp[name] = w;
    else process.stderr.write('[env] 경고: 상대 "' + name + '" 없음 → 제외 (모델 파일이 있는지 확인)\n');
  }
  if (!Object.keys(okOpp).length) throw new Error('사용 가능한 상대가 하나도 없습니다: ' + JSON.stringify(cfg.opp));
  cfg.opp = okOpp;
  rng = mulberry32((cfg.seed != null ? cfg.seed : (Math.random() * 2 ** 31) | 0));
  if (cfg.deck === 'fixed') fixedDeck = E.buildRandomDeck(mulberry32(cfg.fixedSeed != null ? cfg.fixedSeed : 12345));
  envs = [];
  for (let i = 0; i < cfg.n; i++) { const env = { id: i, counter: 0 }; startGame(env); envs.push(env); }
  return { obs: envs.map(obsOf) };
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', line => {
  if (!line.trim()) return;
  let msg, out;
  try {
    msg = JSON.parse(line);
    if (msg.cmd === 'meta') out = { meta: FZ.meta };
    else if (msg.cmd === 'reset') out = reset(msg);
    else if (msg.cmd === 'step') out = { res: msg.actions.map((a, i) => doStep(envs[i], a)), stats };
    else if (msg.cmd === 'close') { process.exit(0); }
    else out = { error: 'unknown cmd' };
  } catch (e) { out = { error: String(e && e.stack || e) }; }
  process.stdout.write(JSON.stringify(out) + '\n');
});
