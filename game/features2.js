'use strict';
// 상태/행동 → 숫자 특징 변환 (번호표 방식, v2). features.js(v1) 는 그대로 두고 따로 추가된 파일.
//  - 카드 이름·효과 종류·키워드의 번호는 game\card_registry.json 에서 읽는다 (번호 고정, 새 항목은 맨 뒤).
//  - 신경망 크기는 번호표 '용량'으로 고정 → 카드가 추가돼도 모델 크기가 안 바뀐다.
//  - 개체 특징: 앞 24개는 v1 과 동일 + 키워드 칸(희소 형태로 전송, 파이썬에서 펼침).
//  - 전역 특징: 앞 32개는 v1 과 동일 + 여유 16칸(일부는 대기 선택 종류 표시, 나머지는 0).
//  - 대상 종류에 '손패 카드(HAND)' 추가.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ACTION_TYPES = ['END_TURN', 'PLAY_CARD', 'ATTACK', 'CHOOSE', 'TARGET', 'HERO_ATTACK'];
const TK = { NONE: 0, HERO_ME: 1, HERO_OPP: 2, MINION_ME: 3, MINION_OPP: 4, HAND: 5 };
const N_TK = 6;
const GRP = { HAND: 0, MY_BOARD: 1, OPP_BOARD: 2, OTHER: 3 };
const F0 = 24;          // 개체 기본 특징 수 (v1 과 같음)
const G_TOTAL = 48;     // 전역 특징 수 = v1 32 + 여유 16
const REG_FILE = process.env.CARD_REGISTRY || path.join(__dirname, 'card_registry.json');
const ALIAS_FILE = path.join(__dirname, 'card_aliases.json');

const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
const r4 = v => Math.round(v * 1e4) / 1e4;

function loadRegistry() {
  if (!fs.existsSync(REG_FILE)) throw new Error('번호표가 없습니다: ' + REG_FILE + '  → node tools\\update_registry.js 를 먼저 실행하세요.');
  return JSON.parse(fs.readFileSync(REG_FILE, 'utf8'));
}
function prefixHash(reg, counts) {  // 번호표 앞부분(저장된 모델이 아는 만큼)이 바뀌지 않았는지 확인하는 지문
  const j = JSON.stringify([reg.names.slice(0, counts.names), reg.effs.slice(0, counts.effs), reg.kws.slice(0, counts.kws)]);
  return crypto.createHash('sha1').update(j).digest('hex').slice(0, 16);
}

function makeFeaturizer(E) {
  const reg = loadRegistry();
  const caps = reg.caps;
  let aliases = {};
  try { aliases = JSON.parse(fs.readFileSync(ALIAS_FILE, 'utf8')).aliases || {}; } catch (e) { /* 별칭 없음 */ }
  const nameId = new Map(reg.names.map((n, i) => [n, i + 1]));   // 0 = 번호표에 없는 카드(토큰 등)
  const effId = new Map(reg.effs.map((t, i) => [t, i + 1]));      // 0 = 효과 없음/모름
  const kws = reg.kws;
  const struct = new Set(reg.struct || []);
  const idOfName = n => nameId.get(aliases[n] || n) || 0;

  // 엔진에 번호표에 없는 카드/효과/키워드가 있으면 멈추고 안내 (조용히 틀린 번호로 학습하는 것을 막음)
  const miss = { names: new Set(), effs: new Set(), kws: new Set() };
  const kwSet = new Set(kws);
  for (const c of E.CARD_POOL) {
    if (!aliases[c.name] && !nameId.has(c.name)) miss.names.add(c.name);
    const et = c.effect && c.effect.type;
    if (et && !effId.has(et)) miss.effs.add(et);
    for (const k of Object.keys(c)) if (c[k] && !struct.has(k) && !kwSet.has(k)) miss.kws.add(k);
  }
  if (miss.names.size || miss.effs.size || miss.kws.size) {
    throw new Error(`번호표에 없는 항목이 있습니다 (카드 ${miss.names.size}, 효과 ${miss.effs.size}, 키워드 ${miss.kws.size}: ` +
      `${[...miss.names, ...miss.effs, ...miss.kws].slice(0, 6).join(', ')} ...). 카드가 추가/변경됐다면 node tools\\update_registry.js 를 실행하세요.`);
  }

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
    const kw = [];
    for (let s = 0; s < kws.length; s++) {
      const v = c[kws[s]];
      if (!v) continue;
      kw.push([s, typeof v === 'number' ? Math.max(-1, Math.min(1, v / 5)) : 1]);
    }
    return { nm: idOfName(c.name), ef: (e && effId.get(e.type)) || 0, x, kw };
  }

  function globalVec(view) {
    const me = view.me, op = view.opp, p = view.pending;
    const g = [
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
      // ---- 여기부터 v2 추가분 (여유 칸) ----
      p && p.kind === 'choice' ? 1 : 0, p && p.kind === 'pocketDimension' ? 1 : 0, p && p.kind === 'fruit' ? 1 : 0,
    ];
    while (g.length < G_TOTAL) g.push(0);
    return g.map(r4);
  }

  // view → 관측. 행동 i 는 view.legal[i] 에 대응한다.
  //  x: 개체 기본 특징(n×24 평탄화), kwi/kws/kwv: 키워드 희소 표현 [개체번호, 칸, 값]
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
      if (t.kind === 'hand') return [t.seat === seat && hand.has(t.id) ? hand.get(t.id) : -1, TK.HAND];
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
    const x = [], kwi = [], kws_ = [], kwv = [];
    ents.forEach((e, i) => {
      for (const v of e.x) x.push(r4(v));
      for (const [s, v] of e.kw) { kwi.push(i); kws_.push(s); kwv.push(r4(v)); }
    });
    return { g: globalVec(view), nm: ents.map(e => e.nm), ef: ents.map(e => e.ef), x, f0: F0, kwi, kws: kws_, kwv, grp, at, src, tgt, tk };
  }

  const F = F0 + caps.kws;
  // JS 추론(rl_bot.js)용: 키워드까지 펼친 밀집 형태
  function encodeDense(view) {
    const o = encode(view);
    const n = o.nm.length;
    const dense = new Float64Array(n * F);
    for (let i = 0; i < n; i++) for (let j = 0; j < F0; j++) dense[i * F + j] = o.x[i * F0 + j];
    for (let k = 0; k < o.kwi.length; k++) dense[o.kwi[k] * F + F0 + o.kws[k]] = o.kwv[k];
    return { ...o, x: dense };
  }

  const counts = { names: reg.names.length, effs: reg.effs.length, kws: reg.kws.length };
  const meta = {
    F, F0, G: G_TOTAL, nameCount: caps.names, effCount: caps.effs, nTypes: ACTION_TYPES.length, nTk: N_TK,
    engine: String(E.VERSION), fmt: 'v2', reg: { ...counts, hash: prefixHash(reg, counts) },
  };

  // 저장된 모델의 메타가 이 번호표와 호환되는지 검사 (문제 없으면 null, 있으면 이유 문자열)
  function compat(m) {
    for (const k of ['F', 'F0', 'G', 'nameCount', 'effCount', 'nTypes', 'nTk']) {
      if (m[k] !== meta[k]) return `모델의 ${k}(${m[k]})가 현재 설정(${meta[k]})과 다릅니다 (용량이 바뀌었으면 python train\\migrate.py 로 옮기세요)`;
    }
    const r = m.reg;
    if (!r) return '번호표 정보가 없는 모델입니다';
    if (r.names > counts.names || r.effs > counts.effs || r.kws > counts.kws) return '모델이 현재 번호표보다 더 많은 항목을 알고 있습니다 (번호표 파일이 다른 것 같습니다)';
    if (prefixHash(reg, r) !== r.hash) return '번호표 앞부분이 모델이 학습될 때와 다릅니다 (번호표가 바뀌었거나 다른 파일입니다)';
    return null;
  }

  return { encode, encodeDense, meta, ACTION_TYPES, compat, registry: reg };
}

module.exports = { makeFeaturizer, ACTION_TYPES, TK, GRP, F0, prefixHash };
