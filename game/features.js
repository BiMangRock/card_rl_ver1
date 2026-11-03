'use strict';
// 상태/행동 → 숫자 특징 변환. 학습(env_server.js)과 추론(rl_bot.js)이 같은 코드를 쓴다.
// 엔진 규칙·카드·view 형식이 바뀌면 학습된 모델과 맞지 않으므로 다시 학습해야 한다.

const ACTION_TYPES = ['END_TURN', 'PLAY_CARD', 'ATTACK', 'CHOOSE', 'TARGET', 'HERO_ATTACK'];
const TK = { NONE: 0, HERO_ME: 1, HERO_OPP: 2, MINION_ME: 3, MINION_OPP: 4 };
const GRP = { HAND: 0, MY_BOARD: 1, OPP_BOARD: 2, OTHER: 3 };
const F = 24; // 개체(카드/하수인) 숫자 특징 수

const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
const r4 = v => Math.round(v * 1e4) / 1e4;

function makeFeaturizer(E) {
  const nameIdx = new Map(); // 0 = 풀에 없는 카드(토큰 등)
  E.CARD_POOL.forEach((c, i) => { if (!nameIdx.has(c.name)) nameIdx.set(c.name, nameIdx.size + 1); });
  const effTypes = [...new Set(E.CARD_POOL.map(c => c.effect && c.effect.type).filter(Boolean))].sort();
  const effIdx = new Map(effTypes.map((t, i) => [t, i + 1])); // 0 = 효과 없음/모름

  const DEATH = ['deathCopy', 'deathGain', 'deathArmor', 'deathBuffAll', 'deathGrave'];
  const TRIG = ['spellburst', 'spellAura', 'onSpellDraw', 'onSpellFireball', 'endCast', 'endRecast', 'endAttack',
    'endCorpses', 'endScatter', 'endBait', 'endSteal', 'startSpend', 'leechBoost', 'rc', 'runes'];

  function entity(c) {
    const e = c.effect;
    const x = [
      num(c.cost) / 10, num(c.atk) / 10, num(c.hp) / 10, num(c.maxHp) / 10,
      c.type === 'minion' ? 1 : 0, c.type === 'spell' ? 1 : 0,
      c.shield ? 1 : 0, c.taunt ? 1 : 0, c.charge ? 1 : 0, c.rush ? 1 : 0,
      c.lifesteal ? 1 : 0, c.elusive ? 1 : 0, c.revive ? 1 : 0,
      DEATH.some(k => c[k]) ? 1 : 0, c.onAttackCopy ? 1 : 0, c.twin ? 1 : 0,
      num(c.overload) / 5, num(c.lifeCost) / 5, e ? num(e.value) / 10 : 0,
      c.attacked ? 1 : 0, c.summoned ? 1 : 0, c.frozen ? 1 : 0,
      c.dynCost ? 1 : 0, TRIG.some(k => c[k]) ? 1 : 0,
    ];
    return { nm: nameIdx.get(c.name) || 0, ef: (e && effIdx.get(e.type)) || 0, x };
  }

  function globalVec(view) {
    const me = view.me, op = view.opp, p = view.pending;
    return [
      me.hp / 30, num(me.armor) / 20, num(me.mana) / 10, num(me.maxMana) / 10,
      me.hand.length / 10, num(me.deckCount) / 30, num(me.heroAtk) / 10, me.heroAttacked ? 1 : 0,
      num(me.fatigue) / 5, num(me.corpses) / 10, num(me.overloadNext) / 5, num(me.locked) / 5,
      me.board.length / 7, (me.grave ? me.grave.length : 0) / 10, me.eclipse ? 1 : 0, num(me.spellTax) / 5,
      op.hp / 30, num(op.armor) / 20, num(op.mana) / 10, num(op.maxMana) / 10,
      num(op.handCount) / 10, num(op.deckCount) / 30, num(op.heroAtk) / 10, num(op.fatigue) / 5,
      num(op.corpses) / 10, op.board.length / 7, op.eclipse ? 1 : 0,
      Math.min(view.turnNo, 60) / 60, view.first === view.seat ? 1 : 0,
      p && p.kind === 'discover' ? 1 : 0, p && p.kind === 'target' ? 1 : 0,
      view.legal.length / 30,
    ].map(r4);
  }

  // view → 관측. 행동 i 는 view.legal[i] 에 대응한다.
  function encode(view) {
    const ents = [], grp = [];
    const hand = new Map(), mine = new Map(), theirs = new Map();
    const add = (c, g, map) => { if (map && c.id != null) map.set(c.id, ents.length); ents.push(entity(c)); grp.push(g); return ents.length - 1; };
    for (const c of view.me.hand) add(c, GRP.HAND, hand);
    for (const c of view.me.board) add(c, GRP.MY_BOARD, mine);
    for (const c of view.opp.board) add(c, GRP.OPP_BOARD, theirs);
    const p = view.pending;
    const optIdx = p && p.options ? p.options.map(c => add(c, GRP.OTHER, null)) : [];
    const pendCard = p && p.card ? add(p.card, GRP.OTHER, null) : -1;

    const at = [], src = [], tgt = [], tk = [];
    const seat = view.seat;
    const tgtOf = t => {
      if (!t) return [-1, TK.NONE];
      if (t.kind === 'hero') return [-1, t.seat === seat ? TK.HERO_ME : TK.HERO_OPP];
      if (t.kind === 'minion') {
        if (t.seat === seat) return [mine.has(t.id) ? mine.get(t.id) : -1, TK.MINION_ME];
        return [theirs.has(t.id) ? theirs.get(t.id) : -1, TK.MINION_OPP];
      }
      return [-1, TK.NONE];
    };
    for (const l of view.legal) {
      const ti = Math.max(0, ACTION_TYPES.indexOf(l.type));
      let s = -1;
      if (l.type === 'PLAY_CARD') s = hand.has(l.cardId) ? hand.get(l.cardId) : -1;
      else if (l.type === 'ATTACK') s = mine.has(l.attackerId) ? mine.get(l.attackerId) : -1;
      else if (l.type === 'CHOOSE') s = optIdx[l.index] != null ? optIdx[l.index] : -1;
      else if (l.type === 'TARGET') s = pendCard;
      const [t, k] = tgtOf(l.target);
      at.push(ti); src.push(s); tgt.push(t); tk.push(k);
    }
    const x = [];
    for (const e of ents) for (const v of e.x) x.push(r4(v));
    return { g: globalVec(view), nm: ents.map(e => e.nm), ef: ents.map(e => e.ef), x, grp, at, src, tgt, tk };
  }

  const probe = { me: { hp: 1, hand: [], board: [] }, opp: { hp: 1, board: [] }, pending: null, legal: [], turnNo: 0, first: 0, seat: 0 };
  const meta = {
    F, G: globalVec(probe).length, nameCount: nameIdx.size + 1, effCount: effTypes.length + 1,
    nTypes: ACTION_TYPES.length, nTk: 5, engine: String(E.VERSION),
  };
  return { encode, meta, ACTION_TYPES };
}

module.exports = { makeFeaturizer, ACTION_TYPES, TK, GRP, F };
