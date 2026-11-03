'use strict';
// v97.html 의 치트 표(CHEAT_TIERS / CHEATS)를 그대로 옮긴 것. 게임에서 배당 200% 이상일 때 상대 AI 에게 붙는 치트.
// ※ HTML 쪽 숫자를 고치면 여기도 같이 고쳐야 평가가 게임과 같아진다.
const CHEAT_TIERS = {
  150: { count: 0, level: -1 },
  200: { count: 1, level: 0 },
  300: { count: 2, level: 0 },
  400: { count: 2, level: 1 },
  500: { count: 2, level: 3 },
};
const CHEATS = [
  { id: 'hp',              minTier: 200, levels: [20, 30, 45, 60] },
  { id: 'startMana',       minTier: 200, levels: [2, 3, 4, 5],  group: 'economy' },
  { id: 'manaBonus',       minTier: 200, levels: [1, 1, 2, 3],  group: 'economy' },
  { id: 'costDown',        minTier: 200, levels: [1, 1, 2, 2],  group: 'economy' },
  { id: 'startHand',       minTier: 200, levels: [1, 2, 2, 3],  group: 'draw' },
  { id: 'extraDraw',       minTier: 300, levels: [2],           group: 'draw' },
  { id: 'startBoard',      minTier: 200, levels: [1, 2, 3, 4] },
  { id: 'buff',            minTier: 400, levels: [1] },
  { id: 'armor',           minTier: 200, levels: [1, 2, 3, 4] },
  { id: 'doubleBattlecry', minTier: 400, levels: [true] },
];
const val = (c, level) => c.levels[Math.min(Math.max(level, 0), c.levels.length - 1)];

// 게임 시작 때 한 번 추첨 → {hp:20, armor:1} 같은 mods 객체 (좌석에 붙이는 데이터)
function rollCheats(tier, rng = Math.random) {
  const t = CHEAT_TIERS[tier], mods = {};
  if (!t || t.count <= 0) return mods;
  const pool = CHEATS.filter(c => c.minTier <= tier);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const used = new Set(); let n = 0;
  for (const c of pool) {
    if (n >= t.count) break;
    if (c.group && used.has(c.group)) continue;
    if (c.group) used.add(c.group);
    mods[c.id] = val(c, t.level); n++;
  }
  return mods;
}
module.exports = { CHEAT_TIERS, CHEATS, rollCheats };
