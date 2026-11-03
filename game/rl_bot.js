'use strict';
// 학습된 모델(JSON)을 읽어 BotPlayers 에 rl_dqn / rl_sarsa / rl_mc 봇으로 등록한다.
// 사용: require('./rl_bot.js').register(E)   (E = require('./engine_v89.js'))
// 모델 위치: ../models/<알고리즘>/model.json (최신), best.json (평가 최고)
const fs = require('node:fs');
const path = require('node:path');
const { makeFeaturizer } = require('./features.js');

function linear(x, W, b, outDim, inDim) { // W: [out][in] 평탄화
  const y = new Float64Array(outDim);
  for (let o = 0; o < outDim; o++) {
    let s = b[o]; const base = o * inDim;
    for (let i = 0; i < inDim; i++) s += W[base + i] * x[i];
    y[o] = s;
  }
  return y;
}
const relu = a => { for (let i = 0; i < a.length; i++) if (a[i] < 0) a[i] = 0; return a; };

function loadNet(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const T = j.tensors, m = j.meta;
  const D = j.dims.D, S = j.dims.S, A = j.dims.A, Q = j.dims.Q, H = j.dims.H;
  const NE = j.dims.NE, EE = j.dims.EE, F = m.F, G = m.G;
  const emb = (name, idx, dim) => T[name].slice(idx * dim, idx * dim + dim);

  function encodeEnt(nm, ef, x, off) {
    const inp = new Float64Array(F + NE + EE);
    for (let i = 0; i < F; i++) inp[i] = x[off + i];
    const a = T['name_emb.weight'], b = T['eff_emb.weight'];
    for (let i = 0; i < NE; i++) inp[F + i] = a[nm * NE + i];
    for (let i = 0; i < EE; i++) inp[F + NE + i] = b[ef * EE + i];
    const h = relu(linear(inp, T['ent1.weight'], T['ent1.bias'], D, F + NE + EE));
    return relu(linear(h, T['ent2.weight'], T['ent2.bias'], D, D));
  }

  // 관측 하나에 대해 모든 합법 행동의 Q 값을 반환
  function scores(o) {
    const n = o.nm.length;
    const enc = [];
    for (let i = 0; i < n; i++) enc.push(encodeEnt(o.nm[i], o.ef[i], o.x, i * F));
    const pools = [new Float64Array(D), new Float64Array(D), new Float64Array(D)];
    for (let i = 0; i < n; i++) { const g = o.grp[i]; if (g >= 0 && g < 3) for (let d = 0; d < D; d++) pools[g][d] += enc[i][d] / 5; }
    const sin = new Float64Array(G + 3 * D);
    for (let i = 0; i < G; i++) sin[i] = o.g[i];
    for (let g = 0; g < 3; g++) for (let d = 0; d < D; d++) sin[G + g * D + d] = pools[g][d];
    const s = relu(linear(relu(linear(sin, T['st1.weight'], T['st1.bias'], H, G + 3 * D)), T['st2.weight'], T['st2.bias'], S, H));
    const out = [];
    const nA = o.at.length;
    for (let k = 0; k < nA; k++) {
      const ain = new Float64Array(m.nTypes + m.nTk + 2 * D);
      ain[o.at[k]] = 1; ain[m.nTypes + o.tk[k]] = 1;
      if (o.src[k] >= 0) for (let d = 0; d < D; d++) ain[m.nTypes + m.nTk + d] = enc[o.src[k]][d];
      if (o.tgt[k] >= 0) for (let d = 0; d < D; d++) ain[m.nTypes + m.nTk + D + d] = enc[o.tgt[k]][d];
      const a = relu(linear(ain, T['act1.weight'], T['act1.bias'], A, m.nTypes + m.nTk + 2 * D));
      const qin = new Float64Array(S + A);
      qin.set(s, 0); qin.set(a, S);
      const q = relu(linear(qin, T['q1.weight'], T['q1.bias'], Q, S + A));
      out.push(linear(q, T['q2.weight'], T['q2.bias'], 1, Q)[0]);
    }
    return out;
  }
  return { scores, meta: m, info: j.info || {} };
}

const fzCache = new Map();
function featurizerFor(E, fmt) {  // 엔진·형식별로 한 번만 만든다
  const key = fmt + ':' + E.VERSION;
  if (!fzCache.has(key)) fzCache.set(key, fmt === 'v2' ? require('./features2.js').makeFeaturizer(E) : makeFeaturizer(E));
  return fzCache.get(key);
}

function makeBot(E, file) {
  const net = loadNet(file);
  const m = net.meta;
  let FZ, encode;
  if (m.fmt === 'v2') {                       // 번호표 방식 모델 (features2.js)
    FZ = featurizerFor(E, 'v2');
    const why = FZ.compat(m);
    if (why) throw new Error(why);
    encode = FZ.encodeDense;
  } else {                                    // 옛 방식 모델 (features.js) — 엔진/카드 구성이 같아야 함
    FZ = featurizerFor(E, 'v1');
    if (m.nameCount !== FZ.meta.nameCount || m.effCount !== FZ.meta.effCount || m.G !== FZ.meta.G || m.F !== FZ.meta.F) {
      throw new Error('옛 형식 모델이라 현재 엔진과 맞지 않습니다. 카드/엔진이 바뀌었으면 python train\\migrate.py 로 옮기거나 다시 학습해야 합니다.');
    }
    encode = FZ.encode;
  }
  return {
    decide(view) {
      if (!view.legal || !view.legal.length) return { type: 'END_TURN' };
      const q = net.scores(encode(view));
      let best = 0;
      for (let i = 1; i < q.length; i++) if (q[i] > q[best]) best = i;
      return view.legal[best];
    },
    net,
  };
}

// models\<폴더>\model.json(최신) / best.json(평가 최고) 를 전부 찾아 'rl_<폴더>' / 'rl_<폴더>_best' 봇으로 등록한다.
// 폴더 이름은 학습 때 --name 으로 자유롭게 지을 수 있다 (예: --name dqn_v112 → rl_dqn_v112, rl_dqn_v112_best).
// 모델 폴더 위치: 인자 > 환경변수 MODELS_DIR > ..\models
function register(E, modelsDir) {
  modelsDir = modelsDir || process.env.MODELS_DIR || path.join(__dirname, '..', 'models');
  const loaded = [], skipped = [];
  let dirs = [];
  try { dirs = fs.readdirSync(modelsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort(); } catch (e) { /* 폴더 없음 */ }
  for (const algo of dirs) {
    for (const [suffix, file] of [['', 'model.json'], ['_best', 'best.json']]) {
      const f = path.join(modelsDir, algo, file);
      if (!fs.existsSync(f)) continue;
      const name = 'rl_' + algo + suffix;
      try { E.BotPlayers[name] = makeBot(E, f); loaded.push(name); }
      catch (err) { skipped.push([name, err.message]); }
    }
  }
  if (skipped.length && !process.env.RL_QUIET) {
    console.error(`RL 봇 ${skipped.length}개는 현재 엔진/번호표와 맞지 않아 건너뜀: ${skipped.map(x => x[0]).join(', ')}\n  이유 예: ${skipped[0][1]}`);
  }
  return loaded;
}

module.exports = { register, makeBot, loadNet };
