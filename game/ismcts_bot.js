'use strict';
// 탐색 봇: 학습된 RL 모델(가중치는 그대로)에 "앞을 시뮬레이션해 보는 계산"을 얹는다.  (새 학습 없음)
//
// 한 번 결정할 때마다
//   1) 안 보이는 정보(상대 손패·덱, 내 덱 순서)를 무작위로 다시 뽑아 "가상의 세계"를 K개 만들고
//   2) 후보 행동(모델 점수 상위 M개 + 턴 종료)을 각 세계에서 실제 엔진으로 실행한 뒤
//      내 턴이 끝날 때까지는 모델이 직접 두게 하고
//   3) 끝난 상태를 같은 모델의 Q 값으로 평가해서(상대 차례면 부호 반대) 세계들의 평균이 가장 높은 행동을 고른다.
//
// 사용: const { register } = require('./ismcts_bot.js'); register(E);   (rl_bot.js 의 register 다음에 호출)
//   → 'rl_dqn_v112_best' 가 있으면 'search_dqn_v112_best' 봇이 추가된다. (모든 rl_*_best 에 대해 같은 방식)
// decide(view, state): 두 번째 인자로 "실제 전체 상태"를 받아야 한다. 단, 상대 손패/덱은 그대로 쓰지 않고
//   장수만 유지한 채 새로 뽑아 쓴다(= 안 보이는 정보를 훔쳐보지 않음).
// 환경변수: SEARCH_K(가상 세계 수, 기본 6)  SEARCH_M(후보 행동 수, 기본 4)  SEARCH_STEPS(한 시뮬레이션 최대 행동 수, 기본 40)

const path = require('node:path');

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function makeSearchBot(E, base, opt = {}) {
  const K = opt.K || Number(process.env.SEARCH_K) || 6;
  const M = opt.M || Number(process.env.SEARCH_M) || 4;
  const MAXSTEPS = opt.steps || Number(process.env.SEARCH_STEPS) || 40;
  const WIN = 1.5;                                   // 승패가 확정된 상태의 값 (Q 값 범위보다 약간 크게)
  const net = base.net, m = net.meta;
  const FZ = m.fmt === 'v2'
    ? require(path.join(__dirname, 'features2.js')).makeFeaturizer(E)
    : require(path.join(__dirname, 'features.js')).makeFeaturizer(E);
  const encode = m.fmt === 'v2' ? FZ.encodeDense : FZ.encode;
  const qOf = view => net.scores(encode(view));
  const argmax = q => { let b = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[b]) b = i; return b; };

  // 가상의 세계: 상대 손패·덱 내용과 내 덱 순서를 새로 뽑는다 (장수·이미 공개된 정보는 유지)
  function determinize(s, me) {
    const t = structuredClone(s);
    t.seed = Math.floor(Math.random() * 2147483646) + 1;
    shuffle(t.seats[me].deck, Math.random);            // 내 덱 순서는 나도 모른다
    const O = t.seats[1 - me];
    const hidden = O.hand.filter(c => c.inDeck);       // 덱에서 온 손패만 바꾼다 (동전·생성 카드는 유지)
    const nHand = hidden.length, nDeck = O.deck.length;
    const need = nHand + nDeck;
    let names = [];
    while (names.length < need) names = names.concat(E.buildRandomDeck());
    shuffle(names, Math.random);
    const cd = (O.mods && O.mods.costDown) || 0;
    const mk = n => {
      const c = E.CARD_POOL.find(x => x.name === n);
      return { ...structuredClone(c), inDeck: true, cost: c.type === 'spell' ? c.cost : Math.max(0, c.cost - cd), id: t.nextId++ };
    };
    const fresh = names.slice(0, need).map(mk);
    const keep = O.hand.filter(c => !c.inDeck);
    O.hand = [...fresh.slice(0, nHand), ...keep];
    O.deck = fresh.slice(nHand);
    return t;
  }

  // 내 차례가 끝날 때까지(또는 게임이 끝날 때까지) 모델이 직접 둔다
  function finishTurn(s, me) {
    for (let i = 0; i < MAXSTEPS && !s.over && s.turn === me; i++) {
      const v = E.viewFor(s, me);
      if (!v.legal.length) break;
      const r = E.apply(s, v.legal[argmax(qOf(v))], me);
      if (!r.ok) break;
      s = r.state;
    }
    return s;
  }

  // 상태 값 (me 입장)
  function value(s, me) {
    if (s.over) return s.winner === null ? 0 : (s.winner === me ? WIN : -WIN);
    const v = E.viewFor(s, s.turn);
    if (!v.legal.length) return 0;
    const q = Math.max(...qOf(v));
    return s.turn === me ? q : -q;
  }

  function decide(view, state) {
    const legal = view.legal;
    if (!legal || !legal.length) return { type: 'END_TURN' };
    if (legal.length === 1) return legal[0];
    const q0 = qOf(view);
    if (!state) return legal[argmax(q0)];              // 전체 상태를 못 받으면 모델 단독으로 둔다
    const me = view.seat;
    // 후보: 모델 점수 상위 M개 + 턴 종료
    const order = q0.map((q, i) => i).sort((a, b) => q0[b] - q0[a]);
    const cand = order.slice(0, M);
    const endIdx = legal.findIndex(a => a.type === 'END_TURN');
    if (endIdx >= 0 && !cand.includes(endIdx)) cand.push(endIdx);
    if (cand.length === 1) return legal[cand[0]];
    const sum = new Float64Array(cand.length);
    for (let k = 0; k < K; k++) {
      const w = determinize(state, me);
      for (let c = 0; c < cand.length; c++) {
        const r = E.apply(w, legal[cand[c]], me);
        if (!r.ok) { sum[c] -= 10; continue; }
        sum[c] += value(finishTurn(r.state, me), me);
      }
    }
    let best = 0;
    for (let c = 1; c < cand.length; c++) {
      if (sum[c] > sum[best] + 1e-9 || (Math.abs(sum[c] - sum[best]) <= 1e-9 && q0[cand[c]] > q0[cand[best]])) best = c;
    }
    return legal[cand[best]];
  }
  return { decide, net, isSearch: true };
}

// rl_<이름>_best / rl_<이름> 봇마다 search_<이름>... 봇을 하나씩 더 등록한다
function register(E, opt) {
  const added = [];
  for (const name of Object.keys(E.BotPlayers)) {
    if (!name.startsWith('rl_') || !E.BotPlayers[name].net || E.BotPlayers[name].isSearch) continue;
    const sn = 'search_' + name.slice(3);
    E.BotPlayers[sn] = makeSearchBot(E, E.BotPlayers[name], opt);
    added.push(sn);
  }
  return added;
}

module.exports = { makeSearchBot, register };
