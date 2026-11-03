'use strict';
// 상대 지정 문법 (학습/평가 공용)
//   "rule2"            규칙 봇 그대로
//   "rule2+c2"         rule2 가 치트 c2 를 받고 둔다
//   "rl_dqn_best"      학습된 강화학습 모델(models\dqn\best.json)
//   "rl_sarsa+c1"      강화학습 모델 + 치트 c1
// 치트는 엔진의 newGame(opts.mods) 기능을 그대로 쓴다 (엔진 수정 없음).
// 세기 참고(rule2 끼리 300판, 치트 쪽 승률): c1 ≈ 63%, c2 ≈ 73%, c3 ≈ 97%
const CHEATS = {
  c1: { hp: 5, startHand: 1 },
  c2: { hp: 10, manaBonus: 1, startHand: 1 },
  c3: { hp: 15, manaBonus: 2, startHand: 2, costDown: 1, extraDraw: true },
};

function parseSpec(spec) {
  const [name, cheat] = String(spec).split('+');
  if (cheat && !CHEATS[cheat]) throw new Error(`알 수 없는 치트: ${cheat} (사용 가능: ${Object.keys(CHEATS).join(', ')})`);
  return { name, cheat: cheat || null, mods: cheat ? CHEATS[cheat] : null };
}

module.exports = { CHEATS, parseSpec };
