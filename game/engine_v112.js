// [extract_engine] 화면 스크립트에 있던 정의를 엔진 앞에 복사함: RUNE_NAME
const RUNE_NAME={unholy:'부정', frost:'냉기', blood:'혈기'};
// [extract_engine] 화면 스크립트에 있던 정의를 엔진 앞에 복사함: RUNE_ORDER
const RUNE_ORDER=['부정','냉기','혈기'];
// [extract_engine] 화면 스크립트에 있던 정의를 엔진 앞에 복사함: runeOf
function runeOf(c){
  const set=new Set();
  if(c.runes) Object.keys(c.runes).forEach(k=>set.add(RUNE_NAME[k]||k));
  if(c.rc) Object.keys(c.rc).forEach(k=>set.add(RUNE_NAME[k]||k));
  return RUNE_ORDER.filter(r=>set.has(r));
}

// engine.js — 규칙·카드·봇 (화면 없음, 브라우저/Node 공용). 작업용 최신 엔진이며 analyze.js 가 이 파일을 쓴다.
// 새 버전을 낼 때 이 내용 전체를 vNN.html 의 <script id="engine"> 안에 그대로 복사해 넣는다 (그래서 각 html 은 단독으로 열리고 그 버전의 규칙이 보존된다).
// 규칙·카드를 고칠 때는 이 파일에서 고친 뒤, 새 버전 html 에 통째로 복사해 넣는다.
const VERSION = 'v112';   // ★ 버전을 올릴 때는 여기 한 줄만 고친다 (분석 결과·화면 배지에 자동 반영)
const CONFIG = {HERO_HP:30, MAX_MANA:10, MAX_HAND:10, MAX_BOARD:7, START_HAND:3, START_HAND_MAX:7, COPIES:2, DECK_SIZE:30,
  SECOND_HAND:1, COIN_MANA:2};
// 후공 보정: 시작 손패 +SECOND_HAND장, 그리고 주문 카드 '동전'(이번 턴 마나 +COIN_MANA) 1장. 선·후공 승률은 selfPlay(N, bot, bot)의 firstWins 로 잰다.
// 측정(같은 봇끼리, 선공 승률 / 초급·중급·중급2): 손패+1·동전+1 → 51 / 50 / 62%,  손패+1·동전+2 → 50 / 46 / 52% (채택),  손패+2·동전+1 → 44 / 40 / 50%

const CARD_POOL = [
  {type:'minion', name:"들쥐", cost:1, atk:1, hp:2},
  {type:'minion', name:"책벌레", cost:1, atk:1, hp:1, effect:{type:'draw', value:1}},
  {type:'minion', name:"은빛 신병", cost:1, atk:1, hp:1, shield:true},
  {type:'minion', name:"돌담 견습병", cost:1, atk:1, hp:3, taunt:true},
  {type:'minion', name:"견습 검사", cost:2, atk:2, hp:2},
  {type:'minion', name:"방패병", cost:2, atk:1, hp:4},
  {type:'minion', name:"약초꾼", cost:2, atk:1, hp:3, effect:{type:'heal', value:3}},
  {type:'minion', name:"훈련 교관", cost:2, atk:2, hp:1, effect:{type:'buff', value:1}},
  {type:'minion', name:"빛나는 파수병", cost:2, atk:1, hp:4, taunt:true},
  {type:'minion', name:"매의 눈 궁수", cost:2, atk:2, hp:1, effect:{type:'damage', value:1}},
  {type:'minion', name:"숲 늑대", cost:3, atk:3, hp:3},
  {type:'minion', name:"화염 정령", cost:3, atk:4, hp:2, effect:{type:'damage', value:2}},
  {type:'minion', name:"부족의 주술사", cost:3, atk:2, hp:3, effect:{type:'buff', value:1}},
  {type:'minion', name:"수정 골렘", cost:3, atk:2, hp:4, shield:true},
  {type:'minion', name:"강철 파수대장", cost:3, atk:2, hp:5, taunt:true},
  {type:'minion', name:"떠돌이 치유사", cost:3, atk:2, hp:2, effect:{type:'heal', value:4}},
  {type:'minion', name:"돌 골렘", cost:4, atk:3, hp:6},
  {type:'minion', name:"용병대장", cost:4, atk:4, hp:4, effect:{type:'draw', value:1}},
  {type:'minion', name:"대지 정령", cost:4, atk:4, hp:6, taunt:true},
  {type:'minion', name:"빛의 수호자", cost:4, atk:3, hp:4, shield:true},
  {type:'minion', name:"불사조", cost:4, atk:3, hp:3, charge:true, revive:true},
  {type:'minion', name:"늙은 사자", cost:5, atk:5, hp:5},
  {type:'minion', name:"벼락 마법사", cost:5, atk:4, hp:4, effect:{type:'damage', value:4}},
  {type:'minion', name:"시간의 마법사", cost:5, atk:2, hp:3, effect:{type:'gainMana', value:3}},
  {type:'minion', name:"서리 거인", cost:6, atk:6, hp:7},
  {type:'minion', name:"폭풍 부르는 자", cost:6, atk:5, hp:5, effect:{type:'damage', value:5}},
  {type:'minion', name:"심판관", cost:6, atk:4, hp:5, effect:{type:'sweep', value:3}},
  {type:'minion', name:"고대 용", cost:7, atk:8, hp:8, effect:{type:'buff', value:2}},
  {type:'minion', name:"고대의 수호룡", cost:7, atk:6, hp:9, taunt:true, shield:true},
  {type:'minion', name:"날쌘 척후병", cost:2, atk:1, hp:3, rush:true},
  {type:'minion', name:"대마법학자 롬메스", cost:9, atk:5, hp:7, effect:{type:'recastLog'}},   // v56: 시작 덱에 없던 주문 중 내가 손패에서 낸 것을 낸 횟수만큼 다시 시전
  {type:'minion', name:"주문 직조사", cost:4, atk:3, hp:5, effect:{type:'seedDeck', value:10}},                      // v57: 무작위 주문 10장을 내 덱에 섞어 넣는다 (이름은 임의로 정함)
  {type:'minion', name:"회귀의 사서", cost:3, atk:2, hp:2, effect:{type:'recycle', value:3, draw:3}},               // v57: 손패를 덱에 섞고, 덱 전체 비용 -3, 카드 3장 뽑기 (이름은 임의로 정함. 능력치 2/2 는 '22>' 를 그렇게 읽음)
  {type:'minion', name:"유물 수집가", cost:2, atk:3, hp:2, deathCopy:true},                                      // v58: 죽음의 메아리 — 내 손패에서 비용이 가장 높은 주문 1장을 복사 (이름은 임의로 정함)
  {type:'minion', name:"성소의 수습사제", cost:2, atk:1, hp:4, effect:{type:'healHoly', value:3}},                 // v58: 전투의 함성 — 대상 체력 3 회복(v59: 약초꾼처럼 대상을 직접 선택), 무작위 신성 주문 1장을 손패로 (이름은 임의로 정함)
  {type:'minion', name:"명암의 사도", cost:3, atk:3, hp:4, deathGain:true},                                       // v59: 죽음의 메아리 — 무작위 암흑 주문 1장과 무작위 신성 주문 1장을 손패로 (이름은 임의로 정함)
  {type:'minion', name:"분열하는 점액", cost:1, atk:2, hp:2, onAttackCopy:true},                                  // v59: 이 하수인이 공격할 때마다 복사본(모든 강화 유지)을 비용 1로 손패에 (이름은 임의로 정함)
  {type:'minion', name:"요그사론", cost:10, atk:7, hp:7, effect:{type:'yogg'}},                 // v56: 내가 손패에서 낸 주문 수만큼 무작위 주문 시전 (비용·능력치는 임의로 정함)
  {type:'spell', name:"대마법 보호막", cost:3, runes:{unholy:1}, school:['암흑'], effect:{type:'massElusive', value:1}},
  {type:'spell', name:"탈란지의 최후의 저항", cost:5, runes:{unholy:2}, effect:{type:'massDeathSummonCost', value:4}},
  {type:'spell', name:"냉혹한 겨울", cost:4, runes:{frost:1}, school:['냉기'], effect:{type:'enemySweepDraw', value:2}},
  // ---- 주문: 전장에 남지 않고 효과만 쓰고 사라진다. 수치는 잠정치 — selfPlay 로 재 가며 조정할 것 ----
  {type:'spell', name:"치유의 빛",   cost:1, school:['신성'], effect:{type:'heal', value:5}},
  {type:'spell', name:"침묵",        cost:1, school:['신성'], effect:{type:'silence'}},
  {type:'spell', name:"불꽃 화살",   cost:2, school:['화염'], effect:{type:'damage', value:3}},
  {type:'spell', name:"지식의 서",   cost:2, school:['비전'], effect:{type:'draw', value:2}},
  {type:'spell', name:"수호의 장벽", cost:2, school:['신성'], effect:{type:'giveShield'}},
  {type:'spell', name:"급습",       cost:2, effect:{type:'haste'}},
  {type:'spell', name:"처형",       cost:3, school:['암흑'], effect:{type:'execute', value:5}},
  {type:'spell', name:"불의 비",    cost:4, school:['화염'], effect:{type:'rain', value:2}},
  {type:'spell', name:"첫 번째 불꽃", cost:1, school:['화염'], effect:{type:'firstFlame', value:2}},
  {type:'spell', name:"매서운 한파", cost:1, school:['냉기'], effect:{type:'frostbite'}},
  {type:'spell', name:"눈보라", cost:6, school:['냉기'], effect:{type:'blizzard', value:2}},
  {type:'spell', name:"냉기 돌풍", cost:3, school:['냉기'], effect:{type:'coldFront', value:1}},
  {type:'spell', name:"신비술사의 고서", cost:4, school:['비전'], effect:{type:'arcaneTome'}},
  {type:'spell', name:"주머니 차원", cost:4, school:['비전'], effect:{type:'pocketDimension'}},
  {type:'spell', name:"주문술사의 흐름", cost:4, school:['비전'], effect:{type:'spellFlow'}},
  {type:'spell', name:"비전 수호자", cost:8, school:['비전'], effect:{type:'arcaneGuardian'}},
  {type:'spell', name:"서리",       cost:2, school:['냉기'], effect:{type:'freeze'}},
  {type:'spell', name:"복제",       cost:2, school:['비전'], effect:{type:'copy'}},
  {type:'spell', name:"강화",       cost:2, school:['비전'], effect:{type:'enhance', value:2}},
  {type:'spell', name:"회수",       cost:2, school:['비전'], effect:{type:'recall'}},
  {type:'spell', name:"변이",       cost:3, school:['비전'], effect:{type:'transform'}},
  {type:'spell', name:"번개",       cost:1, school:['자연'], effect:{type:'bolt', value:2}},
  {type:'spell', name:"화염구",     cost:4, school:['화염'], effect:{type:'damage', value:6}},
  {type:'spell', name:"대폭발",     cost:6, school:['비전'], effect:{type:'wipe', value:6}},
  {type:'spell', name:"주문 발견",  cost:1, school:['비전'], effect:{type:'discover', value:1}},   // value = 비용 할인
  {type:'spell', name:"피의 서약",  cost:2, school:['암흑'], lifeCost:true, effect:{type:'discover', min:5, value:2}},   // lifeCost: 마나 대신 생명력으로 지불 / min·max: 발견할 주문의 비용 범위
  {type:'spell', name:"불꽃 점괘",  cost:3, school:['화염'], effect:{type:'damageDiscover', value:2, max:3}},
  {type:'spell', name:"사냥개 떼",  cost:4, school:['자연'], effect:{type:'summon', count:3, atk:3, hp:1, token:'질주 사냥개'}},   // 속공 3/1 세 마리 소환 (이름은 임의로 정함)
  {type:'spell', name:"철벽 소집", cost:6, school:['신성'], effect:{type:'muster', total:6}},                                      // v26: 비용 합 6이 되도록 하수인 무작위 소환 + 도발 (이름은 임의로 정함)
  {type:'spell', name:"혼돈의 주문서", cost:10, school:['지옥'], effect:{type:'chaos', value:10}},                                  // v26: 무작위 주문 10회 사용 (이름은 임의로 정함)
  {type:'spell', name:"고대의 축복", cost:3, school:['자연'], twin:true, effect:{type:'massEnhance', value:1}},                    // v42: 이중 주문 — 모든 아군 하수인 +1/+1
  {type:'spell', name:"숲의 지원군", cost:8, school:['자연'], twin:true, effect:{type:'summon', count:5, atk:2, hp:2, token:'나무정령', rush:false}},   // v28: 이중 주문 — 2/2 나무정령 5기 소환 (속공 아님)
  {type:'spell', name:"일식",       cost:2, school:['자연'], effect:{type:'eclipse'}},                                                         // v28: 이번 턴에 시전하는 다음 주문을 2번 시전
  {type:'spell', name:"금단의 과일", cost:0, school:['자연'], effect:{type:'fruit'}},                                                   // v29: 마나를 모두 소모. 선택 — 아군 하수인 1기 이번 턴 공격력 +소모한 마나 / 방어도 +2배
  {type:'spell', name:"번개 개화",   cost:0, school:['자연'], overload:2, effect:{type:'bloom', value:2}},                                   // v29: 이번 턴 마나 +2 (동전처럼 얻는다) / 과부하 (2)
  {type:'spell', name:"생물학 프로젝트", cost:1, school:['자연'], effect:{type:'growth', value:2}},                                         // v29: 각 플레이어 마나 수정 +2
  {type:'spell', name:"대지의 비늘", cost:2, school:['자연'], effect:{type:'scale', value:1}},                                         // v32: 아군 하수인 +1/+1, 그 하수인의 공격력만큼 방어도
  {type:'spell', name:"급속 성장",   cost:2, school:['자연'], effect:{type:'crystal', value:1}},                                       // v32: 빈 마나 수정 1개 (최대 마나만 +1)
  {type:'spell', name:"등산용 간식", cost:2, school:['자연'], effect:{type:'snack', value:2}},                                         // v32: 다음 턴에만 마나 +2
  {type:'spell', name:"키틴질 껍질", cost:2, school:['자연'], effect:{type:'carapace', value:4}},                                     // v32: 방어도 +4, 내 다음 턴 시작에 +4 더 (속성은 말씀에 없어 자연으로 정함)
  {type:'spell', name:"퇴비 만들기", cost:2, school:['자연'], effect:{type:'compost', value:1}},                                       // v32: 내 하수인 전체에 죽음의 메아리: 카드 1장 뽑기
  {type:'spell', name:"새로운 경지", cost:3, school:['자연'], effect:{type:'ascend', value:3}},                                       // v35: 최대 마나 +3 (10 초과 가능) 후 빈 마나 수정 1개 (10 상한). 속성은 말씀에 없어 자연으로 정함
  {type:'spell', name:"숲의 영혼",   cost:3, school:['자연'], effect:{type:'forestSoul', value:1}},                                   // v35: 내 하수인 전체에 죽음의 메아리: 2/2 나무정령 소환
  {type:'spell', name:"야생의 포효", cost:3, school:['자연'], effect:{type:'roar', value:2}},                                         // v35: 이번 턴 내 하수인 전체 공격력 +2 (영웅은 공격하지 않으므로 하수인만). 속성은 자연으로 정함
  {type:'spell', name:"휘둘러치기", cost:3, school:['자연'], effect:{type:'cleave', value:4, other:1}},                               // v38: 적 하나에 피해 4, 다른 모든 적에게 피해 1 (속성은 자연으로 정함)
  {type:'spell', name:"줄이기",     cost:3, school:['자연'], effect:{type:'shrink', value:1}},                                       // v38: 내 덱의 하수인들 비용·공격력 -1 (최소 0)
  {type:'spell', name:"흉포한 울음소리", cost:3, school:['자연'], effect:{type:'furyCry', value:1}},                                  // v38: 카드 1장 뽑고, 손패 1장당 방어도 +1 (속성은 자연으로 정함)
  {type:'spell', name:"대지의 수호", cost:5, school:['자연'], effect:{type:'guardian', armor:5, cost:5}},                              // v38: 방어도 5 + 비용 5 하수인 무작위 소환·도발
  {type:'spell', name:"덱 탐색",     cost:2, school:['비전'], effect:{type:'deckDiscover', value:2}},                                 // v40: 내 덱에서 서로 다른 카드 최대 3장 중 1장을 복사하여 발견, 비용 -2 (이름·속성은 임의로 정함)
  {type:'spell', name:"공중활강",   cost:7, school:['자연'], effect:{type:'glide', atk:1, hp:1, token:'활강병'}},
  {type:'spell', name:"육성", cost:5, school:['자연'], effect:{type:'choice', options:[{name:'마나 수정 2개', effect:{type:'choiceMana', value:2}},{name:'카드 3장 뽑기', effect:{type:'draw', value:3}}]}},
  {type:'spell', name:"딱정벌레술", cost:5, effect:{type:'choice', options:[{name:'방어도 +12', effect:{type:'choiceArmor', value:12}},{name:'도발 딱정벌레 둘 소환', effect:{type:'summon', count:2, atk:3, hp:3, token:'딱정벌레', taunt:true, rush:false}}]}},
  {type:'spell', name:"숨겨진 오아시스", cost:6, school:['자연'], effect:{type:'choice', options:[{name:'도발 6/6 고대정령 소환', effect:{type:'summon', count:1, atk:6, hp:6, token:'고대정령', taunt:true, rush:false}},{name:'생명력 12 회복', effect:{type:'choiceHeal', value:12}}]}},                    // 속공 1/1 로 전장을 가득 채움. 이번 턴에 모두 죽으면 같은 수만큼 다시 소환
  {type:'spell', name:"영원의 불화살", cost:3, school:['화염'], effect:{type:'eternalBolt', value:3}},                       // v61: 생명력 흡수. 하수인에게 피해 3, 그 하수인이 죽으면 내 턴 종료 시 이 주문을 손패로 되돌림
  {type:'spell', name:"아달의 수호자", cost:2, school:['신성'], effect:{type:'adalGuardian', atk:2, hp:1, draw:1}},          // v61: 하수인 +2/+1, 카드 1장 뽑기
  {type:'spell', name:"시간대 수선", cost:3, school:['신성'], effect:{type:'timeMend', count:2, discount:3}},                 // v61: 무작위 신성 주문 2장 → 그 비용 합만큼 영웅 회복 → 그 주문들 비용 -3
  {type:'spell', name:"가시가 돋친 탈것", cost:5, school:['신성'], effect:{type:'thornMount', atk:2, hp:6}},                       // v61: 하수인 +2/+6·도발, 죽으면 스테고돈(도발 2/6) 소환 (v62: 신성)
  {type:'spell', name:"분파", cost:4, school:['암흑'], effect:{type:'splitCopy', atk:2, hp:3}},                       // v62: 아군 하수인 +2/+3·모면, 그 하수인을 복사하여 소환
  {type:'spell', name:"저지해라!", cost:4, school:['신성'], effect:{type:'holdLine', atk:5, hp:5}},                     // v62: 하수인 +5/+5·생명력 흡수
  {type:'spell', name:"아마라의 이야기", cost:10, school:['신성'], effect:{type:'amaraTale', value:40}},                              // v62: 내 영웅의 생명력을 40으로 (신성)
  {type:'spell', name:"데자뷔", cost:1, school:['암흑'], effect:{type:'handDiscover', value:1}},                                       // v62: 상대 손패에서 3장 중 1장을 복사하여 발견, 비용 -1 (암흑)
  {type:'spell', name:"번개 폭풍", cost:3, school:['자연'], overload:1, effect:{type:'rain', value:3}},               // v63: 모든 적 하수인에게 피해 3 / 과부하 (1)
  {type:'spell', name:"뒤틀린 황천", cost:8, school:['암흑'], effect:{type:'destroyAll'}},                              // v63: 모든 하수인 파괴
  {type:'spell', name:"일거리가 있다던데", cost:1, effect:{type:'tauntDiscover', atk:1, hp:2}},                         // v63: 도발 하수인 발견 + 그 하수인에 +1/+2 (무속성)
  {type:'spell', name:"물 공급지", cost:8, effect:{type:'resurrect', count:3}},                                         // v63: 비용이 가장 높은 내 서로 다른 죽은 도발 하수인 3기 부활 (무속성)
  {type:'spell', name:"적자생존", cost:10, effect:{type:'survival', atk:4, hp:4}},                                      // v64: 내 손·덱·전장의 모든 하수인 +4/+4 (무속성)
  {type:'spell', name:"야생의 선물", cost:8, school:['자연'], effect:{type:'wildGift', atk:2, hp:2}},                    // v64: 내 하수인들 +2/+2·도발
  {type:'spell', name:"궁극의 역병", cost:10, effect:{type:'ultPlague', value:5, draw:5, armor:5, atk:5, hp:5}},         // v64: 피해 5, 5장 뽑기, 방어도 5, 5/5 구울 소환 (무속성)
  {type:'spell', name:"퍼져나가는 역병", cost:6, school:['자연'], effect:{type:'spreadPlague', atk:1, hp:5}},                // v65: 도발 1/5 딱정벌레 소환, 상대 하수인이 더 많으면 한 번 더
  {type:'spell', name:"톨비르 대적", cost:3, effect:{type:'replayOne'}},                                                   // v65: 이번 게임에서 낸 비용 1 카드 하나를 다시 냄 (무속성)
  {type:'minion', name:"신비한 양초맨", cost:2, atk:3, hp:2, lifesteal:true, school:['비전'], effect:{type:'scatter', value:3}},   // v65: 전투의 함성 — 모든 적에게 피해 3을 무작위로 나눔 (생명력 흡수 적용)
  {type:'spell', name:"되감기", cost:2, school:['비전'], effect:{type:'rewind', value:2}},                                  // v65: 이번 게임에 내가 시전한 다른 주문을 발견·복사, 비용 -2
  {type:'spell', name:"극한 반복", cost:2, rarity:'전설', effect:{type:'loopDiscover', value:2}},                          // v66: 주문 발견(비용 -2), 내 턴이 끝나면 이 카드를 손패로 되돌림 (무속성)
  {type:'spell', name:"박학다식", cost:2, rarity:'희귀', effect:{type:'learned', max:3, count:2, swap:true}},             // v66: 비용 3 이하 주문을 둘 발견, 그 두 주문의 비용을 서로 바꿈 (v67 수정)
  {type:'spell', name:"마나 흡수", cost:2, rarity:'일반', school:['비전'], effect:{type:'manaDrain', value:2}},               // v66: 피해 2, 이 피해로 하수인이 죽으면 내 손의 모든 주문 비용 -1
  {type:'spell', name:"열광의 덱", cost:2, rarity:'전설', effect:{type:'frenzyDeck', value:3}},                            // v66: 내 덱의 주문을 비용 +3 높은 주문으로 변신 (실제 비용 유지) (무속성)
  {type:'spell', name:"점화", cost:2, school:['화염'], effect:{type:'ignite', value:2}},                                     // v68: 피해 2, 피해가 1 더 큰 점화를 내 덱에 섞어 넣음 (섞인 점화도 같은 효과로 계속 커짐)
  {type:'spell', name:"얼음 회오리", cost:3, school:['냉기'], effect:{type:'iceTornado'}},                                   // v68: 모든 적 하수인 빙결
  {type:'spell', name:"초신성", cost:5, school:['화염'], effect:{type:'supernova', cost:1}},                                  // v68: 손을 무작위 화염 주문으로 가득 채움, 그 주문들의 비용 1
  {type:'spell', name:"은하계 투영 구슬", cost:10, rarity:'전설', school:['비전'], effect:{type:'galaxyOrb'}},                  // v68: 이번 게임에 시전한 각 비용의 무작위 주문을 다시 시전 (가능하면 적을 대상으로)
  {type:'spell', name:"왕의 축복", cost:4, school:['신성'], effect:{type:'grantBuff', atk:4, hp:4}},                          // v70: 하수인 +4/+4
  {type:'spell', name:"망자 되살리기", cost:1, school:['암흑'], effect:{type:'raiseDead', max:3}},                            // v70: 비용 3 이하 죽은 아군 하수인 1기 부활
  {type:'spell', name:"방부 의식", cost:1, effect:{type:'grantBuff', atk:0, hp:0, revive:true}},                           // v70: 하수인에게 환생 (무속성)
  {type:'spell', name:"유령 출몰", cost:3, school:['암흑'], effect:{type:'grantBuff', atk:2, hp:3, revive:true, taunt:true}},   // v70: 하수인 +2/+3, 환생·도발
  {type:'spell', name:"빛폭탄", cost:6, school:['신성'], effect:{type:'lightBomb'}},                                     // v71: 모든 하수인이 자신의 공격력만큼 피해
  {type:'spell', name:"영혼의 절규", cost:7, school:['암흑'], effect:{type:'soulScream'}},                              // v71: 모든 하수인을 상대편의 덱에 섞어 넣음
  {type:'spell', name:"패거리", cost:2, effect:{type:'gang', count:3}},                                                // v71: 하수인 하나를 셋 복사하여 내 덱에 섞어 넣음 (무속성)
  {type:'spell', name:"소멸", cost:6, effect:{type:'vanishAll'}},                                                      // v72: 모든 하수인을 주인의 손으로 (무속성)
  {type:'spell', name:"파괴의 정기", cost:3, school:['자연'], overload:2, effect:{type:'essence', min:4, max:5}},          // v72: 모든 하수인에게 피해 4~5 (하수인마다 따로 무작위) / 과부하 (2)
  {type:'spell', name:"선조의 부름", cost:4, effect:{type:'ancestors'}},                                                 // v72: 각 플레이어 손의 무작위 하수인 소환 (무속성)
  {type:'spell', name:"용의자 줄 세우기", cost:8, overload:2, effect:{type:'lineUp', count:3}},                          // v72: 아군 하수인을 셋 복사하여 소환 / 과부하 (2) (무속성)
  // ---- v74 ----
  {type:'spell', name:"방패 올리기", cost:2, effect:{type:'raiseShield', armor:5, draw:1}},
  {type:'spell', name:"태양샘", cost:9, rarity:'전설', school:['신성'], dynCost:true, effect:{type:'sunwell'}},
  {type:'minion', name:"교도소 마나스톰", cost:4, atk:5, hp:5, rarity:'전설', effect:{type:'manastorm'}},
  {type:'minion', name:"대마법사 안토니다스", cost:6, atk:5, hp:7, rarity:'전설', onSpellFireball:true},
  {type:'minion', name:"속임수 토템", cost:2, atk:0, hp:3, tribe:'토템', endCast:3},
  // ---- v75 ----
  {type:'minion', name:"대마법사 바르고스", cost:3, atk:2, hp:6, rarity:'전설', elusive:true, endRecast:true},
  {type:'minion', name:"로데브", cost:5, atk:5, hp:5, rarity:'전설', effect:{type:'spellTax', value:5}},
  // ---- v76 (룬은 주문 속성 자리에 school 로 넣음) ----
  {type:'minion', name:"노움 쩝쩝이", cost:6, atk:5, hp:6, taunt:true, lifesteal:true, tribe:'언데드', endAttack:true},   // 내 턴이 끝날 때 생명력이 가장 낮은 적을 공격
  {type:'minion', name:"흉측한 허물", cost:6, atk:3, hp:5, school:['혈기'], rc:{'혈기':1}, tribe:'언데드 / 야수', leechBoost:true, effect:{type:'leechSummon', count:2}},   // 룬: 혈기 1개. 거머리가 1 더 훔침 / 전투의 함성: 0/2 거머리 둘
  {type:'spell', name:"흡혈", cost:2, school:['혈기'], rc:{'혈기':3}, effect:{type:'bloodSip', value:5, corpses:3}},                                      // 룬: 혈기 3개
  {type:'spell', name:"피의 역병", cost:5, school:['혈기'], rc:{'혈기':2}, effect:{type:'bloodPlague', draw:2, count:2}},                                // 룬: 혈기 2개
  {type:'spell', name:"공기 누출", cost:6, school:['혈기','부정'], rc:{'혈기':1,'부정':1}, effect:{type:'airLeak', atk:5, hp:5, life:5, corpses:5}},               // 룬: 혈기 1개, 부정 1개
  // ---- v78 ----
  {type:'minion', name:"혈기술사", cost:2, atk:2, hp:3, school:['혈기'], rc:{'혈기':1}, effect:{type:'bloodDiscover', corpses:2}},                      // 시체를 소모해 혈기 카드 발견 (소모 수는 임의로 2)
  {type:'minion', name:"마우와 파우", cost:4, atk:2, hp:8, rarity:'전설', school:['혈기','부정'], rc:{'혈기':1,'부정':1}, tribe:'언데드', endCorpses:5, startSpend:{corpses:5, life:5}},
  {type:'minion', name:"그훈", cost:8, atk:8, hp:1, rarity:'전설', school:['혈기'], rc:{'혈기':3}, effect:{type:'bloodDrain', value:6}},
  {type:'minion', name:"전장의 강령술사", cost:2, atk:2, hp:2, school:['부정'], runes:{unholy:1}, endRaise:true},
  {type:'minion', name:"소리치는 요들러", cost:4, atk:3, hp:4, tribe:'언데드', effect:{type:'yodel'}},
  {type:'minion', name:"악성 공포물", cost:4, atk:2, hp:4, tribe:'언데드', revive:true, endCopy:{corpses:4}},
  {type:'minion', name:"어둠가시 바느질꾼", cost:4, atk:2, hp:4, tribe:'언데드 / 가시멧돼지', school:['부정'], runes:{unholy:1}, endScatter:'atk'},
  {type:'spell', name:"시체 폭발", cost:5, school:['암흑'], runes:{blood:2}, effect:{type:'corpseBlast'}},
  {type:'minion', name:"피의 기록관 말라코르", cost:2, atk:2, hp:3, school:['혈기'], rc:{'혈기':1}, effect:{type:'malakor'}},   // v97
  {type:'minion', name:"거머리 어미 발토라", cost:6, atk:5, hp:5, school:['혈기'], rc:{'혈기':1}, effect:{type:'valtora'}},   // v97
  {type:'spell', name:"피의 소용돌이", cost:5, school:['암흑'], runes:{blood:2}, rarity:'특급', effect:{type:'bloodVortex'}},   // v97
  {type:'minion', name:"시초자", cost:7, atk:7, hp:9, effect:{type:'originator'}},   // v97
  // ---- v79 악마 ----
  {type:'minion', name:"분노의 여사제", cost:7, atk:6, hp:7, tribe:'악마', endScatter:6},
  {type:'minion', name:"신화의 공포", cost:7, atk:4, hp:10, lifesteal:true, tribe:'악마 / 야수', endBait:true},
  {type:'minion', name:"타락심장 심문관", cost:8, atk:8, hp:8, taunt:true, tribe:'악마', spellAura:2},
  {type:'minion', name:"고대의 공허 사냥개", cost:9, atk:10, hp:10, tribe:'악마', endSteal:true},
  {type:'minion', name:"원한 맺힌 소환사", cost:5, atk:4, hp:4, effect:{type:'revealSummon'}},
  {type:'minion', name:"가젯잔 경매인", cost:5, atk:4, hp:4, onSpellDraw:true},
  {type:'minion', name:"비전 거인", cost:12, atk:8, hp:8, dynCost:'cast'},
  {type:'spell', name:"엄폐", cost:1, effect:{type:'cover'}},
  // ---- v80 ----
  {type:'minion', name:"별 관측자", cost:8, atk:8, hp:8, rarity:'희귀', tribe:'야수', taunt:true, elusive:true, spellburst:{heroAtk:8, armor:8}},   // 주문폭주: 내가 주문을 시전한 뒤 1회 — 이번 턴 영웅 공격력 +8, 방어도 +8 (발동 후 키워드 사라짐)
  {type:'minion', name:"지저왕", cost:7, atk:6, hp:6, rarity:'특급', tribe:'언데드', rush:true, effect:{type:'armorCry', value:6}, deathArmor:6},   // 속공 / 전투의 함성과 죽음의 메아리: 방어도 6
  // ---- v81 ----
  {type:'minion', name:"지진발", cost:8, atk:8, hp:8, rarity:'희귀', tribe:'야수', taunt:true, elusive:true, deathBuffAll:3},   // 죽음의 메아리: 내 손과 덱의 모든 하수인 +3/+3
  {type:'minion', name:"하드로녹스", cost:9, atk:3, hp:7, rarity:'전설', tribe:'야수', deathGrave:true},   // 죽음의 메아리: 이번 게임에 죽은 내 도발 하수인들을 소환
  {type:'minion', name:"아비아나", cost:9, atk:5, hp:5, rarity:'전설', costOne:true},   // 내 하수인(카드)의 비용이 1
  {type:'minion', name:"티란투스", cost:10, atk:14, hp:14, rarity:'전설', tribe:'야수', taunt:true, elusive:true},
  {type:'minion', name:"잊힌 왕 쿤", cost:10, atk:7, hp:7, rarity:'전설', tribe:'언데드', effect:{type:'kuhn'}},
  // ---- v100 독성 / 연꽃 / 독사 (이미지 연결 없음. 비용·능력치·주문 이름은 임의로 정함) ----
  {type:'minion', name:"왕궁정원사", cost:4, atk:2, hp:4, endLotus:true},   // 내 턴이 끝날 때마다 「피어오르는 연꽃」(0/2, 은신, 내 턴 시작 시 피해 입은 아군 무작위 1명 3 회복) 소환
  {type:'minion', name:"뱀사육사", cost:5, atk:2, hp:4, endViper:true},      // 내 턴이 끝날 때 「치명적인 독사」(1/1 속공·은신·독성) 1마리 소환
  // ---- v103 (비용·능력치는 지정값) ----
  {type:'spell', name:"공허의 영혼", cost:1, effect:{type:'voidSoul', value:1}},   // 비용 N 무작위 하수인 소환 → 미래의 공허의 영혼 개선(N+1), 내 턴이 끝나면 손패로 돌아온다
  {type:'minion', name:"카인 선퓨리", cost:4, atk:3, hp:5, charge:true, ignoreTaunt:true},
  {type:'minion', name:"강철나무 골렘", cost:4, atk:3, hp:6, taunt:true, needArmor:3},
  {type:'minion', name:"여름의 평화수호자", cost:5, atk:4, hp:5, effect:{type:'peaceDraw', min:6, count:2, discount:2}},
  // ---- v104 ----
  {type:'minion', name:"늘푸른 수사슴", cost:6, atk:6, hp:7, tribe:'야수', elusive:true, lifesteal:true, taunt:true},
  {type:'minion', name:"재생의 드루이드", cost:5, atk:3, hp:5, school:['자연'], effect:{type:'natureCast', count:3}},
  {type:'minion', name:"토이란투스", cost:6, atk:7, hp:7, tribe:'야수', taunt:true, elusive:true, effect:{type:'crystalBuff', need:10, value:7}},
  {type:'minion', name:"날개 달린 수호자", cost:7, atk:6, hp:8, tribe:'야수', taunt:true, revive:true, reviveFull:true, elusive:true},
  {type:'spell', name:"독사 떼", cost:4, school:['자연'], hunter:true, effect:{type:'summon', count:3, atk:1, hp:1, token:'치명적인 독사', kw:['은신','독성'], extra:{stealth:true, poison:true}}},   // 속공·은신·독성 1/1 세 마리 소환   // 선택: 방어도 +10 / 마나 수정 모두 회복
  // ---- v105 사냥꾼 (hunter:true 는 '사냥꾼 카드' 표시. 야수 하수인도 모두 사냥꾼 카드로 친다 — isHunter 참고) ----
  {type:'spell', name:"실탄 장전", cost:0, hunter:true, effect:{type:'bulletLoad'}},   // 이번 턴에 내가 주문을 시전할 때마다 무작위 사냥꾼 카드를 손패로
  {type:'spell', name:"성게 가시", cost:1, hunter:true, effect:{type:'spellPoison'}},   // 이번 턴에 내 주문이 독성을 가짐
  {type:'minion', name:"사스퀙", cost:7, atk:4, hp:5, tribe:'야수', hunter:true, effect:{type:'repeatLast'}},   // 전투의 함성: 이전 턴에 낸 모든 카드를 반복
  {type:'minion', name:"골드린", cost:9, atk:9, hp:9, tribe:'야수', hunter:true, rush:true, beastDouble:true},   // 속공 / 아군 야수가 주는 피해 2배
  {type:'minion', name:"왕 크루쉬", cost:9, atk:8, hp:8, tribe:'야수', hunter:true, charge:true},
  // ---- v106 ----
  {type:'minion', name:"밴조사우루스", cost:10, atk:5, hp:6, tribe:'야수', rush:true, onAttackBeast:true},
  {type:'minion', name:"에메리스", cost:10, atk:8, hp:8, tribe:'용족', effect:{type:'doubleHand'}},
  {type:'minion', name:"불꽃꼬리 전사", cost:3, atk:2, hp:4, onSpellScatter:2},
  {type:'minion', name:"주문사수", cost:3, atk:3, hp:4, effect:{type:'spellHunt'}},
  {type:'minion', name:"깊은물 기원사", cost:4, atk:3, hp:4, tribe:'해적', effect:{type:'drawSpellArmor'}},
  {type:'minion', name:"바르덴 던그래스프", cost:4, atk:3, hp:3, effect:{type:'frostWarden', value:4}},
  {type:'minion', name:"요그사론의 종복", cost:5, atk:5, hp:4, elusive:true, endCastMin:5},
  {type:'minion', name:"진눈깨비 스케이터", cost:5, atk:3, hp:4, tribe:'정령', mini:true, effect:{type:'sleetFreeze'}},
  {type:'minion', name:"시프", cost:6, atk:4, hp:6, spellDmgSchools:true},
  {type:'minion', name:"회색 현자 앵무새", cost:6, atk:4, hp:5, tribe:'야수', effect:{type:'parrot', min:6}},
  // ---- v108 ----
  {type:'spell', name:"대규모 변이", cost:7, school:['비전'], effect:{type:'massTransform'}},   // 모든 하수인(양쪽 전부)을 1/1 양으로
  {type:'minion', name:"용소환사 알라나", cost:9, atk:3, hp:3, effect:{type:'alana', min:5}},   // 전투의 함성: 이번 게임에 내가 비용 5 이상 주문을 시전한 횟수만큼 5/5 용 소환
  {type:'minion', name:"화염용", cost:5, atk:5, hp:5, tribe:'용족'},
  {type:'minion', name:"불굴의 토레스", cost:5, atk:3, hp:4, taunt:true, shield:true, shieldAura:3},   // 내 보호막들은 세 번 피해를 받아야 부서진다
  // ---- v109 ----
  {type:'minion', name:"태양지기 타림", cost:6, atk:3, hp:7, taunt:true, effect:{type:'tarim', value:3}},   // 전투의 함성: 다른 모든 하수인의 공격력·생명력을 3으로
  {type:'minion', name:"성기사 에드릭", cost:7, atk:3, hp:7, effect:{type:'edric', value:1}},   // 전투의 함성: 모든 적 하수인의 공격력을 1로
  {type:'minion', name:"안녕극단", cost:9, atk:3, hp:6, tribe:'기계', taunt:true, shield:true, deathMachines:3},   // 죽음의 메아리: 도발·보호막 1/2 기계 셋
  {type:'minion', name:"정신의 창조술사", cost:1, atk:1, hp:2, tribe:'언데드', effect:{type:'mindCopy'}},   // 전투의 함성: 상대 덱의 카드를 복사해 내 손으로
  {type:'minion', name:"세데크 장막직공", cost:2, atk:2, hp:3, spellWeave:true},   // 내가 하수인에게 주문을 시전한 후, 하수인을 대상으로 지정할 수 있는 주문을 손으로
  // ---- v110 ----
  {type:'spell', name:"영혼 채찍", cost:2, school:['암흑'], effect:{type:'soulWhip', value:1}},   // 생명력 흡수, 모든 하수인에게 피해 1
  {type:'spell', name:"생각 훔치기", cost:2, school:['암흑'], effect:{type:'mindSteal', value:2}},   // 상대 덱에서 카드 2장 복사해 손으로
  {type:'spell', name:"정신 분열", cost:2, school:['암흑'], effect:{type:'mindBlast', value:5}},   // 적 영웅에게 피해 5
  {type:'spell', name:"천상의 정신", cost:2, school:['신성'], effect:{type:'divineSpirit'}},   // 하수인의 생명력 2배
  {type:'minion', name:"대주교 베네딕투스", cost:7, atk:4, hp:6, effect:{type:'benedictus', value:1}},   // 전투의 함성: 상대 덱을 복사해 내 덱에 섞고 그 카드들의 비용 -1
  // ---- v111 ----
  {type:'spell', name:"암흑의 정수", cost:7, school:['암흑'], effect:{type:'darkEssence'}},   // 내 덱의 무작위 하수인을 복사해 5/5로 소환
  {type:'minion', name:"그훈의 피", cost:9, atk:8, hp:8, tribe:'정령', taunt:true, endDeckCopy:true},   // 내 턴이 끝날 때 내 덱의 하수인을 복사해 5/5로 소환
  {type:'minion', name:"흑요석 석상", cost:9, atk:4, hp:8, taunt:true, lifesteal:true, deathKill:true},   // 죽음의 메아리: 무작위 적 하수인 처치
  {type:'spell', name:"대규모 부활", cost:9, school:['신성'], effect:{type:'massRaise', count:3}},   // 이번 게임에 죽은 아군 하수인 셋을 무작위로 소환
  {type:'minion', name:"무덤괴수", cost:12, atk:7, hp:8, tribe:'언데드', taunt:true, dynCost:'cast'},   // 도발, 이번 게임에 내가 시전한 주문 1개당 비용 -1 (비전 거인과 같은 방식)
  {type:'spell', name:"칼날 부채", cost:2, effect:{type:'fanKnives'}},   // 모든 적 하수인에게 피해 1, 카드 1장 뽑기
  {type:'spell', name:"타르막", cost:1, effect:{type:'tarmak'}},   // 이번 턴 하수인이 받는 피해 2배, 대상에게 피해 1
  {type:'minion', name:"얼굴 수집가", cost:3, atk:2, hp:2, echo:true, effect:{type:'faceCollector', min:5, discount:5}},   // 잔상 / 전투의 함성: 비용 5 이상 무작위 하수인을 손으로 (비용 -5)
  {type:'minion', name:"소냐 워터댄서", cost:4, atk:3, hp:3, sonya:true},   // 비용 1 하수인을 낸 후, 그 하수인의 비용 0 복사본을 손으로
  {type:'minion', name:"엘프 음악가", cost:3, atk:3, hp:3, effect:{type:'comboDraw', count:2}},   // 연계: 내 덱에서 하수인 둘 뽑기
  {type:'minion', name:"무역왕 갤리윅스", cost:6, atk:5, hp:8, gally:true},   // 상대가 주문을 시전할 때마다 그 주문을 복사해 내 손으로, 상대에게 동전
  {type:'spell', name:"전력 질주", cost:5, effect:{type:'draw', value:4}},
  {type:'spell', name:"환영의 물약", cost:4, school:['비전'], effect:{type:'illusionPotion'}},   // 아군 하수인을 1/1 비용 1 복사본으로 손패에
  {type:'spell', name:"오메가 조립 시설", cost:1, effect:{type:'omegaFacility'}},   // 기계 발견 (마나 수정 10개면 3장 모두)
  {type:'minion', name:"겁에 질린 조합원", cost:2, atk:2, hp:3, taunt:true, effect:{type:'tauntDiscoverBc'}},   // 도발 / 전투의 함성: 도발 하수인 발견
  {type:'spell', name:"용의 포효", cost:2, effect:{type:'dragonRoar', count:2}},   // 무작위 용족 둘을 손으로
  {type:'minion', name:"대장군 분", cost:4, atk:4, hp:3, effect:{type:'copyDragons'}},   // 전투의 함성: 내 손의 모든 용족을 복사
  {type:'spell', name:"앙심", cost:4, effect:{type:'grudge'}},   // 모든 하수인에게 피해 2, 처치한 하수인 하나당 방어도 +2
  {type:'minion', name:"다리우스 크롤리", cost:5, atk:4, hp:5, rush:true, crowley:2},   // 속공 / 공격으로 다른 하수인을 처치하면 +2/+2
  {type:'minion', name:"대지조각가 이프", cost:8, atk:4, hp:8, endArmorSummon:true},   // 내 턴이 끝날 때 방어도(최대 10)와 같은 비용의 무작위 하수인 소환
  {type:'minion', name:"토르톨라", cost:10, atk:1, hp:30, tribe:'야수', taunt:true, elusive:true, tortola:true},   // 도발·모면 / 피해를 받으면 방어도 +1, 공격력 +1
  {type:'minion', name:"문제아", cost:8, atk:6, hp:8, endBully:true},   // 내 턴이 끝날 때 무작위 적을 공격하는 3/3 불량배 둘 소환
  {type:'minion', name:"두억시니", cost:9, atk:6, hp:6, effect:{type:'repeatAll'}},   // 전투의 함성: 이번 게임에 내가 낸 다른 전투의 함성 효과들을 반복 (대상 무작위)
  {type:'spell', name:"해일", cost:8, school:['자연'], effect:{type:'soulWhip', value:3}},   // 생명력 흡수, 모든 하수인에게 피해 3
  {type:'minion', name:"걸어 다니는 샘", cost:8, atk:4, hp:8, tribe:'정령', lifesteal:true, rush:true, windfury:true},   // 생명력 흡수, 속공, 질풍
  {type:'minion', name:"눈사태 수호자", cost:6, atk:5, hp:5, tribe:'정령', effect:{type:'avalancheFreeze'}},   // 전투의 함성: 다른 모든 하수인 빙결
  {type:'spell', name:"퇴화", cost:2, school:['자연'], effect:{type:'devolve'}},   // 모든 적 하수인을 비용이 (1) 낮은 무작위 하수인으로 변신
  // ---- v112 ----
  {type:'spell', name:"불안정한 진화", cost:1, school:['자연'], echo:true, effect:{type:'upgradeMinion'}},   // 잔상 / 아군 하수인을 비용이 (1) 높은 무작위 하수인으로 변신
  {type:'minion', name:"깊은무쇠 트로그", cost:1, atk:1, hp:2, trogg:true},   // 상대편이 주문을 시전한 후에, 다른 깊은무쇠 트로그를 소환
  {type:'minion', name:"교단 수련사", cost:2, atk:3, hp:2, effect:{type:'spellTax', value:1}},   // 전투의 함성: 다음 턴 상대 주문 비용 +1
  {type:'minion', name:"보석 박힌 딱정벌레", cost:2, atk:1, hp:1, tribe:'야수', effect:{type:'discoverCost', cost:3}},   // 전투의 함성: 비용 3인 카드 발견
  {type:'minion', name:"비겁한 밀고자", cost:2, atk:2, hp:6, taunt:true, effect:{type:'snitch'}},   // 도발 / 전투의 함성: 상대가 손에서 무작위 하수인을 소환 (그 하수인의 전투의 함성은 발동 안 함)
  {type:'minion', name:"안녕로봇", cost:2, atk:1, hp:2, tribe:'기계', taunt:true, shield:true},   // 도발, 천상의 보호막(=보호막)
  {type:'minion', name:"데스윙", cost:10, atk:12, hp:12, tribe:'용족', effect:{type:'deathwing'}},   // 전투의 함성: 다른 모든 하수인 처치, 내 손패 모두 버림
  {type:'minion', name:"광염의 피락", cost:8, atk:7, hp:7, tribe:'용족', fireImmune:true, effect:{type:'pyroar', total:15}},   // 화염 주문 면역 / 전투의 함성: 마나 합 15의 화염 주문들을 무작위 적에게 시전
  {type:'minion', name:"해방된 분노 이샤라즈", cost:10, atk:10, hp:10, endDeckSummon:true},   // 내 턴이 끝날 때 내 덱에서 하수인 소환
  {type:'minion', name:"허기진 포식자", cost:9, atk:4, hp:4, infuse:5, effect:{type:'devour', value:5}},   // 적 하수인을 잡아먹고 능력치 획득 / 주입(5): 양옆도 잡아먹음
  {type:'minion', name:"부상당한 크발디르", cost:1, atk:2, hp:4, tribe:'언데드', effect:{type:'selfHurt', value:3}},   // 전투의 함성: 내 영웅에게 피해 3
  {type:'minion', name:"부정한 알", cost:1, atk:0, hp:2, tribe:'언데드', eggChicken:true},   // 죽음의 메아리: 3/3 언데드 닭 소환 / 내 턴이 끝날 때마다 그 닭 +1/+1
  {type:'minion', name:"불안정한 프로토타입", cost:1, atk:0, hp:1, tribe:'기계', revive:true, deathProto:true},   // 환생 / 죽음의 메아리: 하수인 뽑기, 손패 하수인 전체 +1/+1
  {type:'minion', name:"검 제작의 대가", cost:2, atk:1, hp:3, endSword:true},   // 내 턴이 끝날 때 다른 무작위 아군 하수인 둘의 공격력 +1
  {type:'minion', name:"공작 켈레세스", cost:2, atk:2, hp:2, tribe:'언데드', effect:{type:'deckBuff', value:1}},   // 전투의 함성: 내 덱의 모든 하수인 +1/+1
  // ---- 추가 카드 ----
  {type:'minion', name:"곰팡이술사", cost:4, atk:2, hp:2, effect:{type:'adjBuffCry', value:2}, deathAdjBuff:2},   // 전투의 함성·죽음의 메아리: 양옆 하수인 +2/+2
  {type:'minion', name:"깔깔대는 발명가", cost:5, atk:2, hp:1, effect:{type:'machinesCry', count:2}},   // 전투의 함성: 도발·보호막 1/2 기계 둘 소환
  {type:'minion', name:"기사대장", cost:5, atk:3, hp:3, rush:true, crowley:3, effect:{type:'damage', value:3}},   // 속공 / 공격으로 적 하수인을 처치하면 +3/+3 / 전투의 함성: 피해 3
  {type:'minion', name:"누더기골렘", cost:5, atk:4, hp:4, tribe:'언데드', taunt:true, revive:true, deathAoe:2},   // 도발, 환생 / 죽음의 메아리: 모든 캐릭터에게 피해 2
  {type:'minion', name:"공격대장", cost:3, atk:2, hp:3, atkAura:1, effect:{type:'spiritsCry', count:2, atk:1, hp:1, aura:1}},   // 내 다른 하수인 공격력 +1 / 전투의 함성: 1/1 나무정령 둘
  {type:'minion', name:"공중급수체", cost:3, atk:2, hp:2, deathSummon:1, effect:{type:'spiritsCry', count:1, atk:2, hp:2, death:true}},   // 전투의 함성·죽음의 메아리: 2/2 나무정령
  {type:'minion', name:"나무정령", cost:1, atk:2, hp:2},   // 토큰 (일반 하수인)
  {type:'minion', name:"지하군주", cost:3, atk:1, hp:6, tribe:'언데드', taunt:true, lordGrow:1},   // 도발 / 내 하수인이 소환된 후 생명력 +1
  {type:'minion', name:"마력 깃든 까마귀", cost:1, atk:2, hp:2, tribe:'야수'},   // 일반 하수인
  {type:'minion', name:"부화장 도우미", cost:3, atk:2, hp:3, effect:{type:'hatchCry', value:1, max:2}},   // 전투의 함성: 공격력 2 이하 내 다른 하수인 +1/+1, 도발
  {type:'minion', name:"비명익룡 알", cost:3, atk:0, hp:2, deathPtero:4, pteroEgg:3},   // 죽음의 메아리: 2/1 새끼 넷 / 내 턴이 3번 끝나면 알이 깨져 내 전장을 4/4 익룡으로 채움
  {type:'minion', name:"엘룬의 예언자", cost:3, atk:2, hp:4, copyLow:2},   // 비용 2 이하 하수인을 손에서 낸 후, 그 하수인을 복사해 소환
  {type:'minion', name:"오늘의 월척", cost:1, atk:3, hp:3, tribe:'야수', rush:true, fishHeal:true, effect:{type:'wormCry'}},   // 속공 / 전투의 함성: 상대에게 2/1 지렁이 / 공격으로 하수인 처치 시 생명력 전부 회복
  {type:'minion', name:"브롤 베어맨틀", cost:5, atk:3, hp:5, onSpellBeast:3},   // 내가 주문을 시전한 후, 비용 3 이하 야수 소환
  {type:'minion', name:"그물거미", cost:1, atk:1, hp:1, tribe:'야수', deathBeast:true},   // 죽음의 메아리: 무작위 야수를 얻음
  {type:'minion', name:"여명회 파수병", cost:2, atk:3, hp:2, effect:{type:'shieldCry'}},   // 전투의 함성: 아군 하수인에게 보호막
  {type:'spell', name:"채광 사상자", cost:2, effect:{type:'summon', count:2, atk:1, hp:1, token:'은빛 성기사단 신병', rush:false, extra:{deathGhoul:1}, text:"'죽음의 메아리: 1/1 취약한 구울을 소환함' 능력이 있는 1/1 은빛 성기사단 신병을 둘 소환합니다"}},   // 죽으면 1/1 구울을 남기는 신병 둘
  {type:'spell', name:"평등", cost:2, school:['신성'], effect:{type:'equality'}},   // 모든 하수인의 생명력을 1로
  {type:'minion', name:"대사제 데칼", cost:3, atk:3, hp:4, effect:{type:'decalCry'}},   // 전투의 함성: 내 영웅 생명력 1, 감소한 만큼 방어도
  {type:'spell', name:"병력 소집", cost:3, effect:{type:'summon', count:4, atk:1, hp:1, token:'은빛 성기사단 신병', rush:false, text:"1/1 은빛 성기사단 신병을 4명 소환합니다"}},
  {type:'spell', name:"신의 은총", cost:3, school:['신성'], effect:{type:'divineFavor'}},   // 상대 손패 수와 같아질 때까지 뽑기
  {type:'minion', name:"거품로봇", cost:4, atk:4, hp:4, tribe:'기계', effect:{type:'bubbleCry'}},   // 전투의 함성: 내 다른 기계에게 보호막·도발
  {type:'minion', name:"창심장 파수병", cost:4, atk:3, hp:4, tribe:'용족', endSpellGain:{school:'신성', discount:3}},   // 내 턴이 끝날 때 무작위 신성 주문 (비용 -3)
  {type:'minion', name:"부두 토템", cost:2, atk:0, hp:4, tribe:'토템', endSpellGain:{school:'암흑', discount:0}},   // 내 턴이 끝날 때 무작위 암흑 주문
  {type:'minion', name:"거대한 토템 아이스오르", cost:3, atk:0, hp:4, tribe:'토템', endTotemBuff:1},   // 내 턴이 끝날 때 손·덱·전장의 다른 토템 +1/+1
  {type:'minion', name:"불꽃의 토템", cost:2, atk:0, hp:3, tribe:'토템', adjAtkAura:2},   // 양옆 하수인 공격력 +2
  {type:'minion', name:"물 공급 토템", cost:2, atk:0, hp:3, tribe:'토템', endAdjBuff:1},   // 내 턴이 끝날 때 양옆 하수인 +1/+1
  // ---- v113 ----
  {type:'minion', name:"스테레오 토템", cost:2, atk:0, hp:3, tribe:'토템', endHandBuff:2},   // 내 턴이 끝날 때 내 손의 무작위 하수인 +2/+2
  {type:'minion', name:"죄악석 토템", cost:1, atk:0, hp:3, tribe:'토템', endSelfHp:1},   // 내 턴이 끝날 때 생명력 +1
  {type:'minion', name:"토템 골렘", cost:2, atk:3, hp:4, tribe:'토템', overload:1},   // 과부하 (1)
  {type:'minion', name:"돌장인", cost:4, atk:5, hp:4, effect:{type:'stoneCry', value:2}},   // 전투의 함성: 이번 게임 동안 내 토템 공격력 +2
  {type:'minion', name:"칼바람 폭풍소환사", cost:5, atk:5, hp:5, effect:{type:'stormCry', need:4}},   // 전투의 함성: 내 전장에 토템 4기 이상이면 알아키르 소환
  {type:'minion', name:"바람의 군주 알아키르", cost:8, atk:3, hp:6, tribe:'정령', windfury:true, charge:true, taunt:true, shield:true},   // 질풍, 돌진, 도발, 천상의 보호막
];
const EFFECT_TEXT = {
  selfHurt: v=>`전투의 함성: 내 영웅에게 피해를 ${v} 줍니다`,
  stoneCry: v=>`전투의 함성: 이번 게임 동안 내 토템들이 공격력을 +${v} 얻습니다`,
  stormCry: (v,e)=>`전투의 함성: 내 전장에 토템이 ${['','하나','둘','셋','넷'][e.need]||e.need+'기'} 이상 있으면, 바람의 군주 알아키르를 소환합니다`,
  deckBuff: v=>`전투의 함성: 내 덱에 있는 모든 하수인에게 +${v}/+${v}을 부여합니다`,
  adjBuffCry: v=>`전투의 함성과 죽음의 메아리: 양옆의 하수인들에게 +${v}/+${v}을 부여합니다`,
  decalCry: ()=>`전투의 함성: 내 영웅의 생명력을 1로 만듭니다. 감소한 생명력만큼 방어도를 얻습니다`,
  bubbleCry: ()=>`전투의 함성: 내 다른 기계들에게 보호막과 도발을 부여합니다`,
  shieldCry: ()=>`전투의 함성: 아군 하수인에게 보호막을 부여합니다`,
  hatchCry: (v,e)=>`전투의 함성: 공격력이 ${e.max} 이하인 내 다른 하수인들에게 +${v}/+${v}과 도발을 부여합니다`,
  wormCry: ()=>`전투의 함성: 상대편에게 2/1 지렁이를 소환해줍니다`,
  spiritsCry: (v,e)=>`${e.aura?`내 다른 하수인들이 공격력을 +${e.aura} 얻습니다. `:''}${e.death?'전투의 함성과 죽음의 메아리':'전투의 함성'}: ${e.atk}/${e.hp} 나무정령을 ${['','하나','둘','셋'][e.count]||e.count+'기'} 소환합니다`,
  machinesCry: (v,e)=>`전투의 함성: 도발과 보호막 능력이 있는 1/2 기계를 ${['','하나','둘','셋'][e.count]||e.count+'기'} 소환합니다`,
  snitch: ()=>`전투의 함성: 상대편이 손에서 무작위 하수인을 소환합니다`,
  deathwing: ()=>`전투의 함성: 전장의 다른 모든 하수인을 처치하고 내 손에 있는 카드를 모두 버립니다`,
  pyroar: (v,e)=>`전투의 함성: 무작위 적들에게 마나의 합이 ${e.total}인 화염 주문들을 시전합니다`,
  devour: (v,e)=>`전투의 함성: 적 하수인을 잡아먹고 그 하수인의 능력치를 얻습니다. 주입 (${e.value}): 그 양옆의 하수인들도 잡아먹습니다`,
  discoverCost: (v,e)=>`전투의 함성: 비용이 (${e.cost})인 카드를 발견합니다`,
  kuhn: ()=>`선택 - 방어도를 +10 얻습니다. 또는 내 마나 수정을 모두 회복합니다`,
  spellTax: v=>`전투의 함성: 다음 턴에 상대편이 시전하는 주문의 비용이 ${v} 증가합니다`,
  revealSummon: ()=>`전투의 함성: 내 덱의 주문 하나를 공개해, 같은 비용의 무작위 하수인을 소환합니다`,
  manastorm: ()=>`전투의 함성: 이번 게임 동안 내가 주문을 시전한 후에, 그 주문의 비용과 같은 무작위 하수인을 소환합니다`,
  spellHunt: ()=>`전투의 함성: 무작위 주문을 얻습니다. 상대 손패보다 내 손패가 적다면, 계속 반복합니다`,
  drawSpellArmor: ()=>`전투의 함성: 주문을 뽑습니다. 그 주문의 비용만큼 방어도를 얻습니다`,
  frostWarden: v=>`전투의 함성: 모든 적 하수인을 빙결 상태로 만듭니다. 이미 빙결 상태라면, 피해를 ${v} 줍니다`,
  doubleHand: ()=>`전투의 함성: 내 손에 있는 모든 하수인의 공격력과 생명력을 2배 증가시킵니다`,
  sleetFreeze: ()=>`전투의 함성: 적 하수인을 빙결 상태로 만듭니다. 그 하수인의 공격력만큼 방어도를 얻습니다`,
  faceCollector: (v,e)=>`전투의 함성: 비용이 (${e.min}) 이상인 무작위 하수인을 내 손으로 가져옵니다. 그 하수인의 비용이 (${e.discount}) 감소합니다`,
  comboDraw: (v,e)=>`연계: 내 덱에서 하수인을 ${['','하나','둘','셋'][e.count]||e.count+'기'} 뽑습니다`,
  tauntDiscoverBc: ()=>`전투의 함성: 도발 하수인을 발견합니다`,
  copyDragons: ()=>`전투의 함성: 내 손에 있는 모든 용족을 복사합니다`,
  repeatAll: ()=>`전투의 함성: 이번 게임에서 내가 낸 다른 전투의 함성 효과들을 반복합니다. (대상은 무작위로 선택)`,
  avalancheFreeze: ()=>`전투의 함성: 다른 모든 하수인을 빙결 상태로 만듭니다`,
  benedictus: v=>`전투의 함성: 상대편의 덱을 복사하여 내 덱에 섞어 넣습니다. 그 카드들의 비용이 (${v}) 감소합니다`,
  tarim: v=>`전투의 함성: 다른 모든 하수인의 공격력과 생명력을 ${v}으로 만듭니다`,
  edric: v=>`전투의 함성: 모든 적 하수인의 공격력을 ${v}로 바꿉니다`,
  mindCopy: ()=>`전투의 함성: 상대편의 덱에서 카드를 복사하여 내 손으로 가져옵니다`,
  alana: (v,e)=>`전투의 함성: 이번 게임에서 내가 비용이 (${e.min}) 이상인 주문을 시전한 만큼 5/5 용을 소환합니다`,
  parrot: (v,e)=>`전투의 함성: 내가 마지막으로 시전한 비용이 (${e.min}) 이상인 주문을 반복합니다`,
  mana: v=>`주문: 이번 턴 마나 ${v} 얻기`,
  gainMana: v=>`전투의 함성: 이번 턴 마나 +${v}`,
  sweep: v=>`전투의 함성: 적 하수인 전체에 ${v} 피해`,
  scatter: v=>`전투의 함성: 모든 적에게 ${v}의 피해를 무작위로 나누어 입힙니다`,
  draw: v=>`전투의 함성: 카드 ${v}장 뽑기`,
  damage: v=>`전투의 함성: 대상에게 ${v} 피해`,
  heal: v=>`전투의 함성: 대상 체력 ${v} 회복`,
  buff: v=>`전투의 함성: 아군 하수인 +${v}/+${v}`,
  recastLog: ()=>`전투의 함성: 게임이 시작될 때 내 덱에 없던 주문을 다시 시전합니다`,
  yogg: ()=>`전투의 함성: 내가 시전한 주문만큼 무작위 주문을 시전합니다`,
  healHoly: v=>`전투의 함성: 대상 체력 ${v} 회복. 무작위 신성 주문 1장을 손패로 가져옵니다`,
  seedDeck: v=>`전투의 함성: 무작위 주문 ${v}장을 내 덱에 섞어 넣습니다`,
  bloodDiscover: (v,e)=>`전투의 함성: 시체를 ${e.corpses}개 소모해 혈기 룬 카드를 발견합니다`,
  bloodDrain: v=>`전투의 함성: 생명력이 가장 낮은 적에게서 생명력 ${v}을 가져옵니다. 내가 낸 혈기 룬 수만큼 강화됩니다`,
  malakor: ()=>`전투의 함성: 내 덱에 있는 모든 카드를 무작위 혈기 룬 카드로 바꿉니다. 그 카드들의 비용이 (1) 감소합니다`,
  valtora: ()=>`전투의 함성: 이번 게임 동안 내가 혈기 룬 카드를 낼 때마다 0/2 거머리를 소환합니다`,
  peaceDraw: (v,e)=>`전투의 함성: 내 덱에서 비용이 (${e.min}) 이상인 카드를 ${e.count}장 뽑습니다. 그 카드들의 비용이 (${e.discount}) 감소합니다`,
  natureCast: (v,e)=>`전투의 함성: 무작위 자연 주문을 ${e.count}개 시전합니다`,
  crystalBuff: (v,e)=>`전투의 함성: 내 마나 수정이 ${e.need}개이면, +${e.value}/+${e.value}을 얻습니다`,
  originator: ()=>`전투의 함성: 하수인 하나를 제거합니다. 그 하수인의 능력치만큼 내 영웅의 생명력을 증가시킵니다`,
  yodel: ()=>`전투의 함성: 아군 하수인의 죽음의 메아리 능력을 2번 발동시킵니다`,
  leechSummon: ()=>`내 거머리들이 희생자의 생명력을 1 더 훔칩니다. 전투의 함성: 0/2 거머리를 둘 소환합니다`,
  armorCry: v=>`전투의 함성과 죽음의 메아리: 방어도를 ${v} 얻습니다`,
  repeatLast: ()=>`전투의 함성: 내가 이전 턴에 낸 모든 카드를 반복합니다`,
  recycle: (v,e)=>`전투의 함성: 손패를 덱에 섞어 넣습니다. 덱의 모든 카드 비용이 ${v}만큼 감소합니다. 카드 ${e.draw}장을 뽑습니다`,
};
// ---- 주문 효과 레지스트리: 효과 하나 = 한 덩어리 ----------------------------------------------
// 새 주문 효과를 만들 때는 여기에 항목 하나만 추가하면 된다 (CARD_POOL 에 카드 한 줄은 별도).
//   text(v)                       카드에 표시되는 문구
//   needsTarget                   true 면 대상이 하나도 없을 때 낼 수 없다
//   targets(s, seat, e)           선택 가능한 대상 목록 (없으면 대상 없는 주문)
//   blocked(s, seat)              (선택) 지금 쓰면 안 되는 이유(문자열) — 낭비 방지용
//   cast(s, seat, c, target, ev, src)   실제 효과 적용
//   rank                          (선택) rule2 봇이 내는 순서: 낮을수록 먼저
//   worth(view, card, t, ctx, h)  (선택) rule2 봇의 대상 점수. 3 이상이면 낼 가치가 있다고 본다 (h = {val, W, m, mineSide})
//   ruleUse(view, acts, h)        (선택) rule 봇의 사용 규칙. 행동 하나 또는 null (h = {minionOf, cardOf})
// 아래 기존 10종(damage~copy)의 봇 로직은 아직 봇 안에 있고, 새 효과(enhance/recall/transform)부터 레지스트리에 둔다.
function nextRand(s){ let t=(s.seed=(s.seed+0x6D2B79F5)|0); t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }   // 상태 안의 seed 로 만드는 난수 (mulberry32)
// ---- v27 주문 속성: 카드의 school 배열 (비어 있거나 없으면 무속성). 한 카드가 속성을 둘 이상 가질 수도 있다 ----
const SCHOOLS = ['비전','지옥','화염','냉기','신성','암흑','자연','혈기','부정'];   // Arcane · Fel · Fire · Frost · Holy · Shadow · Nature
function spellPool(o={}){                                      // 주문 후보를 한 곳에서 고른다. o: {school, min, max, skip(제외할 효과 종류 배열)}
  return CARD_POOL.filter(x=>x.type==='spell' && x.effect && !(o.skip||[]).includes(x.effect.type)
    && (!o.school || (x.school||[]).includes(o.school)) && x.cost>=(o.min||0) && x.cost<=(o.max ?? 99));
}
const DISCOVER_FX = ['discover','damageDiscover','deckDiscover','handDiscover','tauntDiscover','omegaFacility','rewind','loopDiscover','learned'];            // 발견 카드끼리는 서로의 후보가 되지 않는다
function startDiscover(s, seat, e, ev, src, auto){             // e: {kind, min, max, value(비용 할인)} / auto: true 면 선택 창 없이 3장 중 무작위로 바로 고른다 (혼돈의 주문서 안에서)
  const all=spellPool({skip:DISCOVER_FX, school:e.school});   // 전체 주문풀 (발견 카드끼리는 제외. e.school 이 있으면 그 속성만)
  const lo=e.min||0, hi=e.max ?? 99, inRange=x=>x.cost>=lo && x.cost<=hi, opts=[];
  const take=bag=>{ const o={...bag.splice(Math.floor(nextRand(s)*bag.length),1)[0]}; delete o.lifeCost; opts.push(o); };   // 발견한 카드는 마나로 쓴다
  const main=all.filter(inRange);
  while(opts.length<3 && main.length) take(main);                // 1) 비용 범위 안의 주문에서 무작위로
  const rest=all.filter(x=>!inRange(x)), dist=x=>x.cost<lo ? lo-x.cost : x.cost-hi;
  while(opts.length<3 && rest.length){                           // 2) 범위 안이 3장보다 적으면, 범위에 가장 가까운(비싼) 주문으로 채워 항상 3장 중 선택하게 한다
    const near=Math.min(...rest.map(dist)), tier=rest.filter(x=>dist(x)===near);
    const pick=tier[Math.floor(nextRand(s)*tier.length)]; rest.splice(rest.indexOf(pick),1);
    const o={...pick}; delete o.lifeCost; opts.push(o);
  }
  finishDiscover(s, seat, opts, e, ev, src, auto);
}
function finishDiscover(s, seat, opts, e, ev, src, auto){       // v40: 발견 후보가 정해진 뒤의 공통 처리 (주문 발견과 덱 탐색이 같이 쓴다)
  if(!opts.length){ ev.push({type:'ignored', seat, src}); return; }
  if(auto){                                                      // 분기: 혼돈의 주문서 안에서는 pending 을 만들지 않고 무작위로 하나를 손에 넣는다 (CHOOSE 와 같은 처리)
    const o=opts[Math.floor(nextRand(s)*opts.length)], P=s.seats[seat], card={...o, cost:e.setCost!==undefined ? e.setCost : Math.max(0, o.cost-(e.value||0)), id:s.nextId++};
    const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
    if(e.swap && e.prevId!==undefined){ const pc=P.hand.find(x=>x.id===e.prevId), mine=card.cost; card.cost=e.prevCost; if(pc) pc.cost=mine; }   // v67 박학다식: 두 발견 카드의 비용을 서로 바꿈
    ev.push({type:'discoverPick', seat, name:card.name, cost:card.cost, burned, auto:true,...(burned?{card:card}:{})});
    if(e.again>0) startDiscover(s, seat, {...e, again:e.again-1, prevId:card.id, prevCost:card.cost}, ev, src, true);   // v66 박학다식: 두 번째 발견
    return;
  }
  s.pending={kind:'discover', seat, discount:e.value||0, setCost:e.setCost, again:e.again||0, e, src, options:opts};
  ev.push({type:'discover', seat, src});
}
function startDeckDiscover(s, seat, e, ev, src, auto){          // v40: 내 덱에서 서로 다른 카드 최대 3장을 복사해 보여 주고 하나를 고른다 (덱의 카드는 그대로 남는다)
  const P=s.seats[seat], idx=P.deck.map((_,i)=>i);
  for(let i=idx.length-1;i>0;i--){ const j=Math.floor(nextRand(s)*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  const opts=[], names=new Set();
  for(const i of idx){ if(opts.length>=3) break; const c=P.deck[i]; if(names.has(c.name)) continue; names.add(c.name);
    const o={...c}; delete o.id; delete o.lifeCost; delete o.inDeck; opts.push(o); }                // 발견한 카드는 마나로 쓴다 (복사본은 생성된 카드라 inDeck 표시를 지운다)
  finishDiscover(s, seat, opts, e, ev, src, auto);
}
function startHandDiscover(s, seat, e, ev, src, auto){          // v62 데자뷔: 상대 손패에서 서로 다른 카드 최대 3장을 복사해 보여 주고 하나를 고른다 (상대 손패는 그대로)
  const H=s.seats[1-seat].hand, idx=H.map((_,i)=>i);
  for(let i=idx.length-1;i>0;i--){ const j=Math.floor(nextRand(s)*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  const opts=[], names=new Set();
  for(const i of idx){ if(opts.length>=3) break; const c=H[i]; if(names.has(c.name)) continue; names.add(c.name);
    const o=structuredClone(c); for(const k of ['id','lifeCost','inDeck','auto']) delete o[k]; opts.push(o); }
  finishDiscover(s, seat, opts, e, ev, src, auto);
}
function startBloodDiscover(s, seat, e, ev, src, auto){         // v78 혈기술사: 혈기 룬(속성) 카드(하수인·주문) 최대 3장 중 1장 발견
  const bag=CARD_POOL.filter(c=>(c.school||[]).includes('혈기') && !c.generatedOnly), opts=[];
  while(opts.length<3 && bag.length){ const o=structuredClone(bag.splice(Math.floor(nextRand(s)*bag.length),1)[0]); delete o.lifeCost; opts.push(o); }
  finishDiscover(s, seat, opts, {value:0}, ev, src, auto);
}
function startTauntDiscover(s, seat, e, ev, src, auto){         // v63: 도발 하수인 최대 3장(서로 다른 카드) 중 1장 발견. 후보 카드에 +atk/+hp 가 이미 반영돼 보인다
  const bag=CARD_POOL.filter(c=>c.type==='minion' && c.taunt && !c.generatedOnly), opts=[];
  while(opts.length<3 && bag.length){ const o=structuredClone(bag.splice(Math.floor(nextRand(s)*bag.length),1)[0]); delete o.lifeCost; o.atk+=e.atk; o.hp+=e.hp; opts.push(o); }
  finishDiscover(s, seat, opts, {value:0}, ev, src, auto);
}
function startCostDiscover(s, seat, e, ev, src, auto){          // v112 보석 박힌 딱정벌레: 비용이 e.cost 인 카드(하수인·주문 모두) 최대 3장 중 1장 발견
  const bag=CARD_POOL.filter(c=>c.cost===e.cost && !c.generatedOnly), opts=[];
  while(opts.length<3 && bag.length){ const o=structuredClone(bag.splice(Math.floor(nextRand(s)*bag.length),1)[0]); delete o.lifeCost; opts.push(o); }
  finishDiscover(s, seat, opts, {value:0}, ev, src, auto);
}
function resurrectPick(s, seat, n){                             // v63 물 공급지: 이번 판에 죽은 내 도발 하수인 중 서로 다른 카드, 비용 높은 순 n장 (같은 비용이면 무작위)
  const seen=new Set(), c=[];
  for(const g of (s.seats[seat].grave||[])){ if(!g.taunt || seen.has(g.name)) continue; const base=CARD_POOL.find(x=>x.type==='minion' && x.name===g.name); if(!base) continue; seen.add(g.name); c.push({g, base, r:nextRand(s)}); }
  c.sort((a,b)=>b.base.cost-a.base.cost || a.r-b.r);
  return c.slice(0, n);
}
function startRewindDiscover(s, seat, e, ev, src, auto){          // v65 되감기 (v69: 시전한 모습 그대로 — 점화처럼 효과가 달라진 같은 이름 카드는 서로 다른 후보)
  const bag=(s.seats[seat].castCards||[]).filter(x=>x.name!=='되감기').map(x=>{ const y=structuredClone(x), pb=CARD_POOL.find(q=>q.type==='spell' && q.name===y.name); if(pb) y.cost=pb.cost; return y; }), opts=[];   // v112 되감기: 비용 할인 없이 원래 비용 기준
  while(opts.length<3 && bag.length) opts.push(bag.splice(Math.floor(nextRand(s)*bag.length),1)[0]);
  finishDiscover(s, seat, opts, e, ev, src, auto);
}
function replayOne(s, seat, ev, src){                           // v65 톨비르 대적: 이번 게임에 낸 비용 1 카드 중 하나를 무작위로 다시 낸다 (대상·발견도 무작위)
  const log=s.seats[seat].playedOnes||[]; if(!log.length){ ev.push({type:'ignored', seat, src}); return; }
  const snap=structuredClone(log[Math.floor(nextRand(s)*log.length)]), P=s.seats[seat];
  if(snap.type==='spell'){ autoCastMany(s, seat, [snap], ev, src.name); return; }
  if(P.board.length>=CONFIG.MAX_BOARD){ ev.push({type:'ignored', seat, src}); return; }
  const bf=(P.mods&&P.mods.buff)||0, m={...snap, maxHp:snap.hp+bf, hp:snap.hp+bf, id:s.nextId++, attacked:false, summoned:true};
  P.board.push(m); ev.push({type:'summon', seat, id:m.id, name:m.name, src});
  const ts=m.effect ? cardTargets(s, seat, m) : []; battlecry(s, seat, m, ts.length ? ts[Math.floor(nextRand(s)*ts.length)] : null, ev);
}
const boltTargets = board => [...board].sort((a,b)=>b.atk-a.atk).slice(0,2);   // 번개: 공격력이 높은 둘 (동률이면 먼저 낸 하수인)
const minsOf = (s, sd) => s.seats[sd].board.map(m=>minionT(sd, m.id));
const onMinion = fn => (s, seat, c, target, ev, src) => {           // 대상 하수인이 없으면 '효과 무시'
  const t = target && target.kind==='minion' ? findMinion(s, target.seat, target.id) : null;
  if(!t){ ev.push({type:'ignored', seat, src}); return; }
  fn(t, s, seat, c, target, ev, src);
};
const viaBattlecry = (s, seat, c, target, ev) => battlecry(s, seat, {name:c.name, effect:c.effect, spell:true, school:c.school}, target, ev);   // 피해·회복·드로우는 전투의 함성과 같은 처리

function hitTarget(s, t, amount, ev, src){                      // v38: 영웅 또는 하수인 한 곳에 피해
  if(t.kind==='hero') hurtHero(s, t.seat, amount, ev, 'battlecry', src);
  else { const m=findMinion(s, t.seat, t.id); if(m) hurtMinion(s, t.seat, m, amount, ev, 'battlecry', src); }
}
// ---- v24 소환 주문 도우미 ----
const freeSlots = (s, seat) => CONFIG.MAX_BOARD - s.seats[seat].board.length;
function handMax(P){ return CONFIG.MAX_HAND+((P && P.mods && P.mods.handUp)||0); }   // v99 치트 도서관: 손패 상한 +N
function cheatMinion(P, m){                                  // v98 소환되는 하수인 치트: 돌진 부대 / 강철 갑옷 / 맹공 (체력 강화 buff 는 각 소환 코드가 따로 처리)
  applyTotemAtk(P, m);
  const md=P.mods; if(!md) return;
  if(md.chargeAll) m.charge=true;
  if(md.shieldAll) m.shield=true;
  if(md.atkUp) m.atk+=md.atkUp;
}
function applyTotemAtk(P, m){ if(P.totemAtk && (m.tribe||'').includes('토템')){ m.atk+=P.totemAtk-(m.tb||0); m.tb=P.totemAtk; } }   // v113 돌장인: 이번 게임 내 토템 공격력 보너스 (중복 적용 방지용 m.tb)
function summonTokens(s, seat, n, tok, ev){                    // tok: {name, atk, hp}. 빈 자리만큼만 소환한다 (속공)
  const P=s.seats[seat], ids=[], bf=(P.mods&&P.mods.buff)||0;
  for(let i=0; i<n && P.board.length<CONFIG.MAX_BOARD; i++){
    const m={type:'minion', name:tok.name, cost:1, atk:tok.atk, hp:tok.hp+bf, maxHp:tok.hp+bf, id:s.nextId++, attacked:false, summoned:true};
    if(tok.taunt) m.taunt=true;
    if(tok.rush!==false) m.rush=true;                          // tok.rush===false 면 속공 없는 토큰 (숲의 지원군)
    cheatMinion(P, m);                                         // v98 치트(돌진·보호막·공격력) 반영
    if(tok.extra) Object.assign(m, tok.extra);                 // v76: 종족·턴 종료 능력 등 토큰 고유 속성 (거머리·언데드)
    P.board.push(m); ids.push(m.id);
    ev.push({type:'summon', seat, id:m.id, name:m.name});
  }
  return ids;
}
// v94: 하수인이 가진 '추가 효과' 키 목록 (침묵이 제거하고, 영혼의 절규가 토큰을 카드로 만들 때 옮겨 담는다). 능력치·이름·종족은 해당하지 않는다.
const ABILITY_KEYS=['taunt','shield','charge','rush','revive','elusive','stealth','stealthTemp','frozen','lifesteal','spellburst','effect','leechBoost','costOne','dynCost',
  'deathDraw','deathSummon','deathSummonCost','deathCopy','deathGain','deathStego','deathArmor','deathBuffAll','deathGrave',
  'onAttackCopy','endCastMin','spellDmgSchools','onSpellFireball','onSpellScatter','onAttackBeast','onSpellDraw','endCast','endRecast','endAttack','endDrain','endCorpses','startSpend','endScatter','endBait','endSteal','spellAura','endRaise','endCopy','poison','endLotus','endViper','startHeal','ignoreTaunt','needArmor','reviveFull','beastDouble','shieldAura','deathMachines','spellWeave','deathKill','endDeckCopy','sonya','gally','crowley','tortola','endArmorSummon','endBully','windfury','trogg','fireImmune','endDeckSummon','eggChicken','eggBonus','deathProto','endSword','deathAdjBuff','deathAoe','atkAura','lordGrow','deathPtero','pteroEgg','hatchLeft','copyLow','fishHeal','onSpellBeast','deathBeast','deathGhoul','endSpellGain','endTotemBuff','adjAtkAura','endAdjBuff','endHandBuff','endSelfHp'];
const hasAbility=m=>ABILITY_KEYS.some(k=>m[k]);
function stripAbilities(m){ for(const k of ABILITY_KEYS) delete m[k]; delete m.shieldHits; if(m.tempAtk) m.tempAtk=0; }
function checkGlide(s, ev){                                    // 공중활강: 그 턴에 소환한 하수인이 모두 죽으면 같은 수만큼 한 번 더 소환
  for(const seat of [0,1]){
    const P=s.seats[seat], g=P.glide;
    if(!g) continue;
    if(g.turnNo!==s.turnNo){ delete P.glide; continue; }       // 턴이 넘어가면 효과 끝
    for(const x of ev) if(x.type==='death' && x.seat===seat && g.ids.includes(x.id) && !g.dead.includes(x.id)) g.dead.push(x.id);
    if(g.dead.length>=g.ids.length){
      delete P.glide;                                          // 한 번만
      ev.push({type:'glide', seat, count:g.n, name:g.src});
      summonTokens(s, seat, g.n, g.tok, ev);
    }
  }
}

// ---- v26 철벽 소집 / 혼돈의 주문서 도우미 ----
function musterPick(s, total, slots){                          // 비용 합이 정확히 total 이 되는 하수인 조합 (0코스트 제외, 최대 slots 기)
  const pool=CARD_POOL.filter(c=>c.type==='minion' && c.cost>=1), out=[];
  let rem=total, k=slots;
  const ok=(r,n)=> r===0 || (n>0 && r<=7*n);                   // 남은 비용을 남은 자리로 채울 수 있는가 (1~7코가 모두 있으므로 7*n 이하면 항상 가능)
  while(rem>0 && k>0){
    const cands=pool.filter(c=>c.cost<=rem && ok(rem-c.cost, k-1));
    if(!cands.length) break;
    const c=cands[Math.floor(nextRand(s)*cands.length)];
    out.push(c); rem-=c.cost; k--;
  }
  return out;
}
function summonMuster(s, seat, cards, ev){                      // 도발을 얻은 채 소환 (전투의 함성은 발동하지 않는다)
  const P=s.seats[seat], bf=(P.mods&&P.mods.buff)||0;
  for(const c of cards){
    if(P.board.length>=CONFIG.MAX_BOARD) break;
    const m={type:'minion', name:c.name, cost:c.cost, atk:c.atk, hp:c.hp+bf, maxHp:c.hp+bf, taunt:true, id:s.nextId++, attacked:false, summoned:true};
    if(c.onSpellFireball) m.onSpellFireball=true; if(c.endCastMin) m.endCastMin=c.endCastMin; if(c.spellDmgSchools) m.spellDmgSchools=true; if(c.onSpellScatter) m.onSpellScatter=c.onSpellScatter; if(c.onAttackBeast) m.onAttackBeast=true; if(c.onSpellDraw) m.onSpellDraw=true; if(c.endRecast) m.endRecast=true; if(c.elusive) m.elusive=true; if(c.endCast) m.endCast=c.endCast; if(c.tribe) m.tribe=c.tribe; if(c.shield) m.shield=true; if(c.charge) m.charge=true; if(c.rush) m.rush=true; if(c.revive) m.revive=true;
    if(c.lifesteal) m.lifesteal=true; if(c.sonya) m.sonya=true; if(c.gally) m.gally=true; if(c.crowley) m.crowley=c.crowley; if(c.tortola) m.tortola=true; if(c.endArmorSummon) m.endArmorSummon=true; if(c.endBully) m.endBully=true; if(c.windfury) m.windfury=true; if(c.endAttack) m.endAttack=true; if(c.endDrain) m.endDrain=true; if(c.leechBoost) m.leechBoost=true; if(c.endCorpses) m.endCorpses=c.endCorpses; if(c.startSpend) m.startSpend=c.startSpend; if(c.endScatter) m.endScatter=c.endScatter; if(c.endBait) m.endBait=true; if(c.endRaise) m.endRaise=true; if(c.endCopy) m.endCopy=c.endCopy; if(c.endSteal) m.endSteal=true; if(c.poison) m.poison=true; if(c.reviveFull) m.reviveFull=true; if(c.ignoreTaunt) m.ignoreTaunt=true; if(c.needArmor) m.needArmor=c.needArmor; if(c.endLotus) m.endLotus=true; if(c.endViper) m.endViper=true; if(c.spellAura) m.spellAura=c.spellAura; if(c.deathBuffAll) m.deathBuffAll=c.deathBuffAll; if(c.deathGrave) m.deathGrave=true; if(c.costOne) m.costOne=true; if(c.spellburst) m.spellburst={...c.spellburst}; if(c.deathArmor) m.deathArmor=c.deathArmor; if(c.shieldAura) m.shieldAura=c.shieldAura; if(c.deathMachines) m.deathMachines=c.deathMachines; if(c.spellWeave) m.spellWeave=true; if(c.deathKill) m.deathKill=true; if(c.endDeckCopy) m.endDeckCopy=true; if(c.trogg) m.trogg=true; if(c.fireImmune) m.fireImmune=true; if(c.endDeckSummon) m.endDeckSummon=true; if(c.eggChicken) m.eggChicken=true; if(c.deathProto) m.deathProto=true; if(c.endSword) m.endSword=true; if(c.deathAdjBuff) m.deathAdjBuff=c.deathAdjBuff; if(c.deathAoe) m.deathAoe=c.deathAoe; if(c.atkAura) m.atkAura=c.atkAura; if(c.lordGrow) m.lordGrow=c.lordGrow; if(c.deathPtero) m.deathPtero=c.deathPtero; if(c.pteroEgg) m.pteroEgg=c.pteroEgg; if(c.copyLow) m.copyLow=c.copyLow; if(c.fishHeal) m.fishHeal=true; if(c.onSpellBeast) m.onSpellBeast=c.onSpellBeast; if(c.deathBeast) m.deathBeast=true; if(c.endSpellGain) m.endSpellGain={...c.endSpellGain}; if(c.endTotemBuff) m.endTotemBuff=c.endTotemBuff; if(c.adjAtkAura) m.adjAtkAura=c.adjAtkAura; if(c.endAdjBuff) m.endAdjBuff=c.endAdjBuff;   // v76·v78·v80·v108
    P.board.push(m);
    ev.push({type:'summon', seat, id:m.id, name:m.name});
  }
}
const CHAOS_SKIP = ['chaos'];                                   // 혼돈의 주문서가 뽑지 않는 주문: 자기 자신뿐 (발견 계열도 뽑히되 auto 로 무작위 선택)
function boardSnap(s){                                          // v39: 화면이 혼돈의 주문서 중간 상태를 그대로 그리도록, 주문 하나가 끝날 때마다 전장·체력·방어도를 이벤트로 남긴다
  return {type:'board', seats:[0,1].map(i=>({hp:s.seats[i].hp, armor:s.seats[i].armor||0, heroAtk:s.seats[i].heroAtk||0, mana:s.seats[i].mana, maxMana:s.seats[i].maxMana, deckCount:s.seats[i].deck.length, hand:JSON.parse(JSON.stringify(s.seats[i].hand.map(c=>({...c, cost:effCost(s.seats[i],c)})))), board:JSON.parse(JSON.stringify(s.seats[i].board))}))};   // v55: 손패·마나·덱 장수도 남겨 화면이 주문 순서대로 보여 주게 한다 (서버로 옮길 때 상대 hand 는 장수만 보낼 것)
}
function castChaos(s, seat, c, ev){
  // v27: 후보는 자기 자신을 뺀 모든 주문. 자리·대상이 없어 쓸 수 없는 주문이 뽑히면 그 시전은 불발(1회로 센다)
  const times=c.effect.value, pool=spellPool({skip:CHAOS_SKIP});
  for(let i=0;i<times;i++){
    sweepDead(s, ev); checkGlide(s, ev);                        // 앞 주문으로 죽은 하수인을 치우고, 그 다음 주문을 고른다
    if(i>0) ev.push(boardSnap(s));
    if(s.seats[0].hp<=0 || s.seats[1].hp<=0) break;             // 영웅이 쓰러지면 중단
    const sp=pool[Math.floor(nextRand(s)*pool.length)], fx=SPELL_FX[sp.effect.type], ts=cardTargets(s, seat, sp);
    ev.push({type:'spell', seat, name:sp.name, gain:0, chaos:true, card:{type:'spell', name:sp.name, cost:sp.cost, effect:sp.effect, twin:sp.twin}});
    const fizzle = (fx.needsTarget && ts.length===0) || (fx.blocked && fx.blocked(s, seat))
                || (sp.effect.type==='recall' && s.seats[seat].hand.length>=handMax(s.seats[seat]));   // 대상 없음 · 전장이 가득/비어 있음 · 손패가 가득 찬 회수
    if(fizzle){ ev.push({type:'ignored', seat, fizzle:true, src:{seat, name:sp.name}}); continue; }
    const target=ts.length ? ts[Math.floor(nextRand(s)*ts.length)] : null;   // 대상도 무작위 (아군도 맞을 수 있다)
    castSpell(s, seat, {...sp, auto:true}, target, ev);         // auto: 발견 계열이 선택 창 대신 무작위로 고르게 한다
  }
  sweepDead(s, ev); checkGlide(s, ev); ev.push(boardSnap(s));   // 마지막 주문의 결과까지 반영한 상태
}
// ---- v56 롬메스·요그사론 공용: 주문 목록을 차례로 자동 시전한다 (혼돈의 주문서와 같은 방식 — 대상도 무작위, 발견·선택은 자동, 자리·대상이 없으면 불발) ----
// 여기서 시전한 주문은 '손패에서 낸 주문'이 아니므로 시전 기록(castLog)·시전 횟수(spellCount)에 들어가지 않는다 (기록은 apply 의 PLAY_CARD 에서만).
function autoCastMany(s, seat, list, ev, tag, preferEnemy){
  for(let i=0;i<list.length;i++){
    sweepDead(s, ev); checkGlide(s, ev);
    ev.push(boardSnap(s));
    if(s.seats[0].hp<=0 || s.seats[1].hp<=0) break;
    const sp=list[i], fx=SPELL_FX[sp.effect.type], ts=cardTargets(s, seat, sp);
    ev.push({type:'spell', seat, name:sp.name, gain:0, tag, card:{type:'spell', name:sp.name, cost:sp.cost, school:sp.school, runes:sp.runes, overload:sp.overload, effect:sp.effect, twin:sp.twin}});
    const fizzle = (fx.needsTarget && ts.length===0) || (fx.blocked && fx.blocked(s, seat))
                || (sp.effect.type==='recall' && s.seats[seat].hand.length>=handMax(s.seats[seat]));
    if(fizzle){ ev.push({type:'ignored', seat, fizzle:true, src:{seat, name:sp.name}}); continue; }
    const en=preferEnemy ? ts.filter(t=>t.seat!==seat) : [], tp=(preferEnemy==='only') ? en : (en.length ? en : ts);   // v68 은하계 투영 구슬: 가능하면 적을 대상으로
    const target=tp.length ? tp[Math.floor(nextRand(s)*tp.length)] : null;
    castSpell(s, seat, {...sp, auto:true, id:s.nextId++}, target, ev);
  }
  sweepDead(s, ev); checkGlide(s, ev); ev.push(boardSnap(s));
}
// ---- v29 금단의 과일 도우미 ----
function startFruit(s, seat, ev, src, auto){
  const P=s.seats[seat], N=P.mana;
  if(N<=0){ ev.push({type:'ignored', seat, src}); return; }     // 소모할 마나가 없으면 효과 없음 (일식의 두 번째 시전 등)
  P.mana=0; ev.push({type:'fruit', seat, amount:N, src});
  const hasMin=P.board.length>0, atkO={type:'spell', name:`공격력 +${N}`, cost:0, sub:true, school:['자연'], effect:{type:'fruitAtk', value:N}},
        arO={type:'spell', name:`방어도 +${2*N}`, cost:0, sub:true, school:['자연'], effect:{type:'fruitArmor', value:2*N}};
  const opts=hasMin ? [atkO, arO] : [arO];                       // 아군 하수인이 없으면 공격력 선택지는 없다
  if(opts.length===1 || auto){                                   // 선택지가 하나이거나 혼돈 안이면 바로 처리
    const o=opts[Math.floor(nextRand(s)*opts.length)], fx=SPELL_FX[o.effect.type];
    ev.push({type:'fruitPick', seat, name:o.name});
    const ts=fx.targets ? fx.targets(s, seat, o.effect) : [];
    fx.cast(s, seat, o, ts.length ? ts[Math.floor(nextRand(s)*ts.length)] : null, ev, src);
    return;
  }
  s.pending={kind:'fruit', seat, options:opts};
  ev.push({type:'fruitWait', seat, src});
}
function fruitOk(view){                                         // 봇: 금단의 과일을 쓸 만한가 (마나 3 이상 남았고, 마무리가 보이거나 체력이 낮을 때)
  const me=view.me, op=view.opp, ready=me.board.filter(m=>!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush)).reduce((a,m)=>a+m.atk,0);
  return me.mana>=3 && ((me.board.length>0 && !op.board.some(m=>m.taunt) && ready+me.mana>=op.hp) || me.hp<=14);
}
function chooseFruit(view){
  const me=view.me, op=view.opp, opts=view.pending.options, ai=opts.findIndex(o=>o.effect.type==='fruitAtk'), ri=opts.findIndex(o=>o.effect.type==='fruitArmor');
  if(ai<0) return {type:'CHOOSE', index:ri};
  const N=opts[ai].effect.value, ready=me.board.filter(m=>!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush)).reduce((a,m)=>a+m.atk,0);
  return {type:'CHOOSE', index:(!op.board.some(m=>m.taunt) && ready+N>=op.hp) ? ai : ri};
}
// ---- v28 일식 도우미: 일식을 낸 뒤 2번 시전할 만한 주문이 손패에 있고 마나가 남는가 (봇 판단용) ----
const ECLIPSE_BAD = ['mana','bloom','growth','crystal','fruit','eclipse','glide','haste'];       // 2번 시전해도 이득이 없는 주문
function eclipseHasPartner(view, c){
  if(view.me.eclipse) return false;                           // 이미 걸려 있으면 또 쓰지 않는다
  const left=view.me.mana-c.cost;
  return view.me.hand.some(x=>x.id!==c.id && x.type==='spell' && !x.lifeCost && x.effect && x.cost<=left && !ECLIPSE_BAD.includes(x.effect.type)
    && (!needsTarget(x) || view.legal.some(a=>a.type==='PLAY_CARD' && a.cardId===x.id)));
}
const addMax=(P,n)=>{ if(P.maxMana<CONFIG.MAX_MANA) P.maxMana=Math.min(CONFIG.MAX_MANA, P.maxMana+n); };   // v35: '마나 수정을 얻는다'는 최대 10까지만 (이미 10 이상이면 그대로). 최대 마나 '증가' 효과만 10을 넘길 수 있다
const WOOD_SPIRIT={name:'나무정령', atk:2, hp:2, rush:false};
const STEGODON={name:'스테고돈', atk:2, hp:6, taunt:true, rush:false};   // v61 가시가 돋친 탈것의 죽음의 메아리 토큰
function effCost(P, c){                                      // v74 태양샘(손의 다른 카드 1장당 -1) / v75 비전 거인(시전한 주문 1개당 -1) / v75 로데브(주문 비용 증가)
  let k=c.cost;
  if(c.dynCost===true) k-=P.hand.length-1; else if(c.dynCost==='cast') k-=(P.castTotal||0);
  k=Math.max(0, k);
  if(c.type==='spell'){
    k+=(P.spellTax||0)+(P.auraTax||0);   // v79 타락심장 심문관
    if(P.mods && P.mods.spellDown && !c.lifeCost && !(c.effect && c.effect.type==='mana')) k=Math.max(0, k-P.mods.spellDown);   // v98 치트 주문 할인 (생명력 주문·동전 제외)
  }
  else if(c.type==='minion'){
    if(P.board.some(m=>m.costOne && m.hp>0)) k=1;   // v81 아비아나: 내 하수인 카드의 비용이 1
    if(P.freeMinion) k=Math.max(0, k-P.freeMinion);   // v98 치트 무료 첫 하수인: 매 턴 처음 내는 하수인 비용 -N
  }
  return k;
}
function summonSameCost(s, seat, k, ev, src){                // v74·v75: 비용이 k 인 무작위 하수인 소환 (없으면 k/k 「이름 없는 하수인」). 전투의 함성은 발동하지 않음
  const P=s.seats[seat];
  if(!(k>0) || P.board.length>=CONFIG.MAX_BOARD){ ev.push({type:'ignored', seat, src}); return; }
  const pool=CARD_POOL.filter(x=>x.type==='minion' && x.cost===k), bf=(P.mods&&P.mods.buff)||0;
  const base=pool.length ? pool[Math.floor(nextRand(s)*pool.length)] : {type:'minion', name:'이름 없는 하수인', cost:k, atk:k, hp:k};
  const mm={...structuredClone(base), id:s.nextId++, maxHp:base.hp+bf, hp:base.hp+bf, attacked:false, summoned:true}; delete mm.effect;
  P.board.push(mm); ev.push({type:'summon', seat, id:mm.id, name:mm.name, src});
}
function spellburstFire(s, seat, c, ev){                         // v80 주문폭주: 내가 주문을 시전한 뒤 딱 한 번 발동하고 키워드가 사라진다 (동전·선택지 내부 효과 제외 — 안토니다스와 같은 기준)
  if(c.sub || !c.effect || c.effect.type==='mana') return;
  const P=s.seats[seat];
  for(const m of [...P.board]){
    if(!m.spellburst || m.hp<=0) continue;
    const b=m.spellburst; delete m.spellburst;
    const src={seat, name:m.name};
    ev.push({type:'spellburst', seat, id:m.id, name:m.name});
    if(b.heroAtk){ P.heroAtk=(P.heroAtk||0)+b.heroAtk; ev.push({type:'heroAtk', seat, amount:b.heroAtk, src}); }
    if(b.armor){ P.armor=(P.armor||0)+b.armor; ev.push({type:'armor', seat, amount:b.armor, src}); }
  }
}
const isHunter = c => !!(c.hunter || (c.tribe||'').includes('야수'));   // v105 사냥꾼 카드: hunter 표시가 있거나 야수 하수인
function hunterGain(s, seat, ev, src){                       // v106 실탄 장전: 무작위 야수 1장을 손패로, 그 비용 -2 (가득이면 소각)
  const pool=CARD_POOL.filter(x=>x.type==='minion' && (x.tribe||'').includes('야수') && !x.generatedOnly); if(!pool.length) return;
  const P=s.seats[seat], card={...structuredClone(pool[Math.floor(nextRand(s)*pool.length)]), id:s.nextId++}, burned=P.hand.length>=handMax(P);
  card.cost=Math.max(0, card.cost-2); delete card.inDeck;
  if(!burned) P.hand.push(card);
  ev.push({type:'generated', seat, name:card.name, burned, src, ...(burned?{card}:{})});
}
const dmgOf=(s, seat, m)=> m.atk * ((m.tribe||'').includes('야수') ? Math.pow(2, s.seats[seat].board.filter(x=>x.beastDouble && x.hp>0).length) : 1);   // v106 골드린: 아군 야수가 주는 피해 2배, 여러 마리면 2의 거듭제곱(2^마리 수)
function repeatLastTurn(s, seat, ev, src){                    // v105 사스퀙: 이전 턴에 손에서 낸 카드를 순서대로 반복 (주문은 대상 무작위로 시전, 하수인은 복사본을 소환해 전투의 함성도 발동)
  const P=s.seats[seat], list=(P.lastPlays||[]).map(x=>structuredClone(x));
  if(!list.length){ ev.push({type:'ignored', seat, src}); return; }
  for(const snap of list){
    if(s.seats[0].hp<=0 || s.seats[1].hp<=0 || s.pending) break;
    if(snap.type==='spell'){ autoCastMany(s, seat, [snap], ev, src.name); continue; }
    if(P.board.length>=CONFIG.MAX_BOARD) continue;
    const bf=(P.mods&&P.mods.buff)||0, m={...snap, maxHp:snap.hp+bf, hp:snap.hp+bf, id:s.nextId++, attacked:false, summoned:true};
    P.board.push(m); ev.push({type:'summon', seat, id:m.id, name:m.name, src});
    if(m.effect && m.effect.type!=='repeatLast'){ const ts=cardTargets(s, seat, m); battlecry(s, seat, m, ts.length ? ts[Math.floor(nextRand(s)*ts.length)] : null, ev); sweepDead(s, ev); }
  }
}
function summonRandomBeast(s, seat, maxCost, ev, src){           // 브롤 베어맨틀: 비용 maxCost 이하 무작위 야수 소환 (전투의 함성은 발동 안 함)
  const P=s.seats[seat], pool=CARD_POOL.filter(c=>c.type==='minion' && (c.tribe||'').includes('야수') && c.cost<=maxCost && !c.generatedOnly);
  if(!pool.length || P.board.length>=CONFIG.MAX_BOARD){ ev.push({type:'ignored', seat, src}); return; }
  const c=pool[Math.floor(nextRand(s)*pool.length)], bf=(P.mods&&P.mods.buff)||0;
  const m={...structuredClone(c), id:s.nextId++, maxHp:c.hp+bf, hp:c.hp+bf, attacked:false, summoned:true}; delete m.effect; cheatMinion(P, m);
  P.board.push(m); ev.push({type:'summon', seat, id:m.id, name:m.name, src});
}
function giveRandomBeast(s, seat, ev, src){                     // 그물거미: 무작위 야수를 손으로
  const P=s.seats[seat], pool=CARD_POOL.filter(c=>c.type==='minion' && (c.tribe||'').includes('야수') && !c.generatedOnly);
  if(!pool.length) return;
  const copy={...structuredClone(pool[Math.floor(nextRand(s)*pool.length)]), id:s.nextId++}, burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(copy);
  ev.push({type:'generated', seat, name:copy.name, burned, src, ...(burned?{card:copy}:{})});
}
function spellTrigger(s, seat, c, ev){                       // v74 안토니다스: 내가 주문을 시전할 때마다 화염구를 손으로 (동전·선택지 내부 효과 제외)
  if(c.sub || !c.effect || c.effect.type==='mana') return;
  { const OP=s.seats[other(seat)];                          // v113 무역왕 갤리윅스: 상대가 주문을 시전할 때마다 같은 주문을 내 손으로, 상대에게 동전 (갤리윅스 한 명당 한 번)
    for(const g of [...OP.board]){
      if(!g.gally || g.hp<=0) continue;
      const pb=CARD_POOL.find(x=>x.type==='spell' && x.name===c.name), cp=structuredClone(c); for(const k of ['inDeck','auto','sub','echoTemp']) delete cp[k];
      cp.id=s.nextId++; cp.cost=pb?pb.cost:cp.cost;
      const burned=OP.hand.length>=handMax(OP); if(!burned) OP.hand.push(cp);
      ev.push({type:'generated', seat:other(seat), name:cp.name, burned, src:{seat:other(seat), name:g.name}, ...(burned?{card:cp}:{})});
      const coin={...makeCoin(), id:s.nextId++}, cb=s.seats[seat].hand.length>=handMax(s.seats[seat]); if(!cb) s.seats[seat].hand.push(coin);
      ev.push({type:'generated', seat, name:'동전', burned:cb, src:{seat:other(seat), name:g.name}, ...(cb?{card:coin}:{})});
    } }
  { const OP2=s.seats[other(seat)], ts=OP2.board.filter(x=>x.trogg && x.hp>0);   // v112 깊은무쇠 트로그: 상대가 주문을 시전한 후, 각 트로그마다 다른 트로그를 소환 (새로 생긴 트로그는 이번 주문에 반응하지 않는다)
    for(const g of ts){ if(s.seats[0].hp<=0 || s.seats[1].hp<=0) break; summonTokens(s, other(seat), 1, {name:g.name, atk:1, hp:2, rush:false, extra:{trogg:true}}, ev); } }
  const P=s.seats[seat], base=CARD_POOL.find(x=>x.type==='spell' && x.name==='화염구');
  if(P.bulletLoad && c.effect.type!=='bulletLoad') for(let i=0;i<P.bulletLoad;i++) hunterGain(s, seat, ev, {seat, name:'실탄 장전'});   // v105 실탄 장전
  if(P.stormCount && c.cost>0) for(let i=0;i<P.stormCount;i++){ if(s.seats[0].hp<=0 || s.seats[1].hp<=0) break; summonSameCost(s, seat, c.cost, ev, {seat, name:'교도소 마나스톰'}); }   // v106 교도소 마나스톰: 이번 게임 동안, 주문을 시전한 뒤 그 비용과 같은 하수인 소환 (마나스톰이 죽어도 유지)
  { const pb=CARD_POOL.find(x=>x.type==='spell' && x.name===c.name), sn=structuredClone(c); for(const k of ['id','auto','inDeck','lifeCost','sub']) delete sn[k]; sn.cost=pb?pb.cost:c.cost; (P.castHist=P.castHist||[]).push(sn); }   // v106 회색 현자 앵무새용
  P.castTotal=(P.castTotal||0)+1;                            // v75 비전 거인: 이번 게임에 시전한 주문 수
  { const sn=structuredClone(c); for(const k of ['id','auto','inDeck','lifeCost','sub']) delete sn[k]; (P.turnCasts=P.turnCasts||[]).push(sn); }   // v75 바르고스: 이번 턴에 시전한 주문 기록
  for(const m of [...P.board]){
    if(m.onSpellBeast && m.hp>0) summonRandomBeast(s, seat, m.onSpellBeast, ev, {seat, name:m.name});   // 브롤 베어맨틀
    if(m.onSpellDraw && m.hp>0) drawCards(s, seat, 1, ev, {seat, name:m.name});   // v75 가젯잔 경매인
    if(m.onSpellScatter && m.hp>0) endScatterRun(s, seat, m, m.onSpellScatter, ev);   // v106 불꽃꼬리 전사: 주문을 시전한 후 모든 적에게 피해를 무작위로 나눔
    if(!m.onSpellFireball || m.hp<=0) continue;
    const copy={...base, id:s.nextId++}, burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(copy);
    ev.push({type:'generated', seat, name:base.name, burned, src:{seat, name:m.name}, ...(burned?{card:copy}:{})});
  }
}
const SPELL_FX = {
  bloodSip:{ text:(v,e)=>`내 영웅에게 생명력을 +${e.value} 부여합니다. 시체를 ${e.corpses}개 소모해 생명력을 +${e.value} 더 얻고 카드를 뽑습니다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ const e=c.effect; increaseLife(s, seat, e.value, ev, src);
              if(spendCorpses(s, seat, e.corpses, ev, src)){ increaseLife(s, seat, e.value, ev, src); drawCards(s, seat, 1, ev, src); } },
            spellWorth:(c,view)=>{ const me=view.me, miss=(me.maxHp||30)-me.hp; return miss<=0 ? 0 : (miss>=5 ? 3.5 : 1.5)+((me.corpses||0)>=c.effect.corpses && me.hand.length<=8 && me.deckCount>=1 ? 2.5 : 0); },
            ruleUse:(view,acts)=> acts.length && (view.me.maxHp||30)-view.me.hp>=4 ? acts[0] : null },
  bloodVortex:{ text:()=>`생명력 흡수. 모든 적 하수인을 감염시킵니다. 내 턴이 끝날 때마다, 감염된 하수인에게 피해를 2 줍니다`, rank:4,
            blocked:(s,seat)=> s.seats[other(seat)].board.length ? null : '감염시킬 적 하수인이 없습니다.',
            cast:(s,seat,c,target,ev,src)=>{ for(const x of s.seats[other(seat)].board){ x.infect={by:seat}; ev.push({type:'buff', target:minionT(other(seat), x.id), name:x.name, value:0, hpValue:0, src}); } },
            spellWorth:(c,view)=>{ const t=view.opp.board.length; return t? Math.min(12, 2+t*2.2) : 0; },
            ruleUse:(view,acts)=> acts.length && view.opp.board.length>=2 ? acts[0] : null },
  corpseBlast:{ text:()=>`시체를 터뜨려 모든 하수인에게 피해를 1 줍니다. 살아있는 하수인이 있으면, 반복합니다`, rank:4,
            cast:(s,seat,c,target,ev,src)=>{ for(let i=0;i<40;i++){
                if(![0,1].some(sd=>s.seats[sd].board.some(x=>x.hp>0))) break;
                for(const sd of [0,1]) for(const x of [...s.seats[sd].board]) if(x.hp>0) hurtMinion(s, sd, x, 1, ev, 'spell', src);
                sweepDead(s, ev); } },
            spellWorth:(c,view)=>{ const mine=view.me.board.reduce((a,x)=>a+x.hp,0), theirs=view.opp.board.reduce((a,x)=>a+x.hp,0); return Math.max(0, Math.min(14, theirs*1.2-mine*1.2)); },
            ruleUse:(view,acts)=> acts.length && view.opp.board.length>=view.me.board.length+2 ? acts[0] : null },
  bloodPlague:{ text:(v,e)=>`카드를 ${e.draw}장 뽑습니다. 0/2 거머리를 둘 소환합니다`, rank:2.5, summons:true,
            cast:(s,seat,c,target,ev,src)=>{ const e=c.effect; drawCards(s, seat, e.draw, ev, src); summonTokens(s, seat, e.count, LEECH, ev); },
            spellWorth:(c,view)=>{ const slots=CONFIG.MAX_BOARD-view.me.board.length; return (view.me.hand.length<=8 && view.me.deckCount>=2 ? 3.5 : 1)+Math.min(2, slots)*1.5; },
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=7 && view.me.deckCount>=2 && view.me.board.length<=5 ? acts[0] : null },
  airLeak:{ text:(v,e)=>`도발 능력이 있는 ${e.atk}/${e.hp} 언데드를 소환하고 내 영웅에게 생명력을 +${e.life} 부여합니다. 시체를 ${e.corpses}개 소모해 계속 반복합니다`, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const e=c.effect, once=()=>{ summonTokens(s, seat, 1, {...UNDEAD5, atk:e.atk, hp:e.hp}, ev); increaseLife(s, seat, e.life, ev, src); };
              once(); for(let g=0; g<50 && spendCorpses(s, seat, e.corpses, ev, src); g++) once(); },     // 시체 5개를 쓰면 한 번 더 (소환은 자리가 있을 때만)
            spellWorth:(c,view,ctx,h)=>{ const slots=CONFIG.MAX_BOARD-view.me.board.length; if(slots<1) return 0;
              const one=h.val({atk:c.effect.atk, hp:c.effect.hp, taunt:true})+((view.me.maxHp||30)-view.me.hp>=5?1:0); return Math.min(20, one*((view.me.corpses||0)>=c.effect.corpses && slots>=2 ? 2 : 1)); },
            ruleUse:(view,acts)=> acts.length ? acts[0] : null },
  cover:{ text:()=>`내 하수인들에게 다음 내 턴이 시작될 때까지 은신을 부여합니다`, rank:4,
            blocked:(s,seat)=> s.seats[seat].board.length===0 ? '아군 하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ for(const m of s.seats[seat].board){ if(!m.stealth) m.stealthTemp=true; m.stealth=true; ev.push({type:'grant', target:minionT(seat,m.id), name:m.name, kws:['은신'], src}); } },
            spellWorth:(c,view)=>{ const n=view.me.board.filter(m=>m.summoned && !m.charge && !m.rush && !m.stealth).length; return n>=2 && view.opp.board.some(m=>m.atk>0) ? Math.min(9, n*1.8) : 0; },
            ruleUse:(view,acts)=> acts.length && view.me.board.filter(m=>m.summoned && !m.charge && !m.rush && !m.stealth).length>=2 && view.opp.board.some(m=>m.atk>0) ? acts[0] : null },
  raiseShield:{ text:(v,e)=>`방어도를 ${e.armor} 얻습니다. 카드를 ${e.draw}장 뽑습니다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], e=c.effect; P.armor=(P.armor||0)+e.armor; ev.push({type:'armor', seat, amount:e.armor, src}); drawCards(s, seat, e.draw, ev, src); },
            spellWorth:(c,view)=> 3+(view.me.hp<=22?1:0)+(view.me.hand.length<=8&&view.me.deckCount>=1?1.5:0),
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=8 && view.me.deckCount>=1 && view.me.hp<=24 ? acts[0] : null },
  sunwell:{ text:()=>`내 손을 무작위 주문으로 가득 채웁니다. 내 손에 있는 다른 카드 1장당 이 카드의 비용이 1 감소합니다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], pool=spellPool({}).filter(x=>!x.generatedOnly && x.name!==c.name);
              if(!pool.length || P.hand.length>=handMax(P)){ ev.push({type:'ignored', seat, src}); return; }
              while(P.hand.length<handMax(P)){ const x=pool[Math.floor(nextRand(s)*pool.length)], copy={...x, id:s.nextId++}; P.hand.push(copy); ev.push({type:'generated', seat, name:x.name, burned:false, src}); } },
            spellWorth:(c,view)=>{ const n=CONFIG.MAX_HAND-(view.me.hand.length-1); return n>=4 ? Math.min(12, n*1.5) : 0; },
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=6 ? acts[0] : null },
  arcaneTome:{text:()=>`무작위 비전 주문을 셋 얻습니다`, rank:0,
    spellWorth:(c,view)=>view.me.hand.length<=7?5:1,
    cast:(s,seat,c,target,ev,src)=>{const P=s.seats[seat],pool=CARD_POOL.filter(x=>x.type==='spell'&&(x.school||[]).includes('비전')&&x.name!=='신비술사의 고서'&&!x.generatedOnly);for(let i=0;i<3&&pool.length;i++){const x=pool[Math.floor(nextRand(s)*pool.length)],copy={...x,id:s.nextId++};const burned=P.hand.length>=handMax(P);if(!burned)P.hand.push(copy);ev.push({type:'generated',seat,name:x.name,burned,src,...(burned?{card:copy}:{})});}}},
  pocketDimension:{text:()=>`주문을 발견합니다. 그 주문의 비용이 4 감소합니다. 이미 발견한 주문이 다시 나올 때까지 반복합니다`, rank:0,
    spellWorth:(c,view)=>view.me.hand.length<=7?5:1,
    cast:(s,seat,c,target,ev,src)=>{
      if(c.auto){   // v53: 혼돈의 주문서 안에서도 반복한다. 선택 창 없이 무작위로 고르며, 이미 발견한 주문이 다시 나오거나 손패가 가득 차면 끝낸다
        const P=s.seats[seat], seen=[];
        for(let i=0;i<200;i++){
          if(i>0 && P.hand.length>=handMax(P)) break;
          const from=ev.length; startDiscover(s,seat,{value:4},ev,src,true);
          const pk=ev.slice(from).find(x=>x.type==='discoverPick'); if(!pk) break;
          pk.pocketDimension=true; pk.repeated=seen.includes(pk.name); seen.push(pk.name);
          if(pk.repeated) break;
        }
        return;
      }
      startDiscover(s,seat,{value:4},ev,src,c.auto); if(s.pending && s.pending.kind==='discover'){s.pending.kind='pocketDimension';s.pending.seen=[];s.pending.src=src;}}},
  spellFlow:{text:()=>`내 덱에 있는 주문들의 비용이 (1) 감소합니다`, rank:0,
    spellWorth:(c,view)=>view.me.deckCount>0?3:0,
    cast:(s,seat,c,target,ev,src)=>{const P=s.seats[seat];let n=0;for(const d of P.deck)if(d.type==='spell'){d.cost=Math.max(0,d.cost-1);n++;}ev.push({type:'deckSpellCost',seat,count:n,src});}},
  arcaneGuardian:{text:()=>`도발과 모면 능력이 있는 5/6 골렘을 둘 소환합니다`, rank:4,
    spellWorth:(c,view)=>Math.min(2,7-view.me.board.length)*4.5,
    cast:(s,seat,c,target,ev,src)=>{const ids=summonTokens(s,seat,2,{name:'비전 골렘',atk:5,hp:6,taunt:true,rush:false},ev);for(const id of ids){const m=findMinion(s,seat,id);if(m)m.elusive=true;}}},
  firstFlame: {text:()=>`하수인에게 피해를 2 줍니다. 두 번째 불꽃을 내 손으로 가져옵니다`, needsTarget:true, rank:1,
    targets:(s,seat)=>[...minsOf(s,0), ...minsOf(s,1)],
    spellWorth:(c,view)=>view.me.board.concat(view.opp.board).reduce((n,m)=>n+(!m.shield&&m.hp<=2?m.atk+m.hp+2:0.7),0),
    cast:(s,seat,c,target,ev,src)=>{const t=target&&target.kind==='minion'?findMinion(s,target.seat,target.id):null;if(t)hurtMinion(s,target.seat,t,2,ev,'spell',src);const P=s.seats[seat];const copy={type:'spell',name:'두 번째 불꽃',cost:1,school:['화염'],effect:{type:'secondFlame',value:2},id:s.nextId++};const burned=P.hand.length>=handMax(P);if(!burned)P.hand.push(copy);ev.push({type:'generated',seat,name:'두 번째 불꽃',burned,src,...(burned?{card:copy}:{})});}},
  secondFlame: {text:()=>`하수인에게 피해를 2 줍니다`, needsTarget:true, rank:1,
    targets:(s,seat)=>[...minsOf(s,0), ...minsOf(s,1)],
    spellWorth:(c,view)=>view.me.board.concat(view.opp.board).reduce((n,m)=>n+(!m.shield&&m.hp<=2?m.atk+m.hp+2:0.7),0),
    cast:(s,seat,c,target,ev,src)=>{const t=target&&target.kind==='minion'?findMinion(s,target.seat,target.id):null;if(t)hurtMinion(s,target.seat,t,2,ev,'spell',src);}},
  frostbite: {text:()=>`적 하수인을 빙결 상태로 만듭니다. 무작위 냉기 주문을 얻습니다`, needsTarget:true, rank:1,
    targets:(s,seat)=>s.seats[other(seat)].board.filter(m=>!m.frozen).map(m=>minionT(other(seat),m.id)),
    spellWorth:(c,view)=>view.opp.board.some(m=>!m.frozen)?4:0,
    cast:(s,seat,c,target,ev,src)=>{const t=target&&target.kind==='minion'?findMinion(s,target.seat,target.id):null;if(t){t.frozen=true;ev.push({type:'freeze',target,name:t.name,src});}const P=s.seats[seat],pool=CARD_POOL.filter(x=>x.type==='spell'&&x.school&&x.school.includes('냉기')&&x.name!=='매서운 한파'&&!x.generatedOnly);if(pool.length){const x=pool[Math.floor(nextRand(s)*pool.length)],copy={...x,id:s.nextId++};const burned=P.hand.length>=handMax(P);if(!burned)P.hand.push(copy);ev.push({type:'generated',seat,name:x.name,burned,src,...(burned?{card:copy}:{})});}}},
  blizzard: {text:v=>`모든 적 하수인에게 피해 ${v}를 주고 빙결 상태로 만듭니다`, rank:1,
    blocked:(s,seat)=>s.seats[other(seat)].board.length===0?'적 하수인이 없습니다.':null,
    spellWorth:(c,view)=>view.opp.board.reduce((n,m)=>n+(!m.shield&&m.hp<=c.effect.value?m.atk+m.hp+2:1.5),0),
    cast:(s,seat,c,target,ev,src)=>{const foes=[...s.seats[other(seat)].board];for(const m of foes){m.frozen=true;ev.push({type:'freeze',target:minionT(other(seat),m.id),name:m.name,src});hurtMinion(s,other(seat),m,c.effect.value,ev,'spell',src);}sweepDead(s,ev);}},
  coldFront: {text:v=>`선택한 하수인과 양옆 하수인들에게 빙결 상태를 부여하고 피해 ${v}를 줍니다`, needsTarget:true, rank:1,
    targets:(s,seat)=>[...minsOf(s,0),...minsOf(s,1)],
    spellWorth:(c,view)=>view.me.board.concat(view.opp.board).reduce((n,m)=>n+(!m.shield&&m.hp<=c.effect.value?m.atk+m.hp+2:1),0),
    cast:(s,seat,c,target,ev,src)=>{if(!target||target.kind!=='minion')return;const board=s.seats[target.seat].board,idx=board.findIndex(m=>m.id===target.id);if(idx<0)return;const affected=board.slice(Math.max(0,idx-1),Math.min(board.length,idx+2));for(const m of affected){m.frozen=true;ev.push({type:'freeze',target:minionT(target.seat,m.id),name:m.name,src});hurtMinion(s,target.seat,m,c.effect.value,ev,'spell',src);}sweepDead(s,ev);}},

  massElusive:{text:()=>`내 하수인들에게 +1/+1과 모면을 부여합니다`, rank:4,
    spellWorth:(c,view)=>view.me.board.length ? view.me.board.length*2.4 + view.me.board.filter(m=>!m.elusive).length*1.1 : 0,
    cast:(s,seat,c,target,ev,src)=>{ for(const m of s.seats[seat].board){m.atk+=1;m.hp+=1;m.maxHp+=1;m.elusive=true;ev.push({type:'buff',target:minionT(seat,m.id),name:m.name,value:1,src});} } },
  massDeathSummonCost:{text:()=>`내 하수인들에게 죽음의 메아리: 비용이 4인 무작위 하수인을 소환함`, rank:4,
    spellWorth:(c,view)=>view.me.board.length ? view.me.board.length*2.6 : 0,
    cast:(s,seat,c,target,ev,src)=>{ for(const m of s.seats[seat].board) m.deathSummonCost=c.effect.value; ev.push({type:'massDeathrattle',seat,count:s.seats[seat].board.length,src}); } },
  enemySweepDraw:{text:v=>`모든 적에게 피해 ${v}를 줍니다. 카드를 뽑습니다`, rank:1,
    spellWorth:(c,view)=>{const v=c.effect.value; let score=view.opp.hp>0?1.5:0; score+=view.opp.board.reduce((n,m)=>n+(!m.shield&&m.hp<=v?m.atk+m.hp+2:v*0.65),0); score+=(view.me.hand.length<=7&&view.me.deckCount>0?4:0); return score;},
    cast:(s,seat,c,target,ev,src)=>{ const foes=[...s.seats[other(seat)].board]; for(const m of foes) hurtMinion(s,other(seat),m,c.effect.value,ev,'spell',src); hurtHero(s,other(seat),c.effect.value,ev,'spell',src); sweepDead(s,ev); drawCards(s,seat,1,ev,src); } },
  choice:{ text:()=>`선택 — 둘 중 하나를 고릅니다`, rank:0,
    spellWorth:(c,view)=>Math.max(...c.effect.options.map(o=>choiceOptionScore(o,view))),
    ruleUse:(view,acts)=>acts.find(a=>{const c=view.me.hand.find(x=>x.id===a.cardId); return c && c.effect.options.some(o=>choiceOptionScore(o,view)>=6);})||null,
    cast:(s,seat,c,target,ev,src)=>{
      const options=c.effect.options.map(o=>({type:'spell',name:o.name,cost:0,sub:true,effect:o.effect}));
      if(c.auto){ const o=options[Math.floor(nextRand(s)*options.length)]; ev.push({type:'choicePick',seat,name:o.name,auto:true,src}); castSpell(s,seat,{...o,id:s.nextId++,auto:true},null,ev); return; }
      // 한 번의 혼돈 주문서 안에서 선택 대기가 여러 번 생기지 않도록 auto 시전은 즉시 해결한다.
      s.pending={kind:'choice',seat,options,src}; ev.push({type:'choiceWait',seat,name:c.name});
    } },
  choiceMana:{text:v=>`마나 수정 ${v}개를 얻습니다`,cast:(s,seat,c,target,ev,src)=>{const P=s.seats[seat],before=P.maxMana; addMax(P,c.effect.value); ev.push({type:'crystal',seat,amount:P.maxMana-before,src});}},
  choiceRefill:{text:()=>`내 마나 수정을 모두 회복합니다`,cast:(s,seat,c,target,ev,src)=>{const P=s.seats[seat], full=P.maxMana+((P.mods&&P.mods.manaBonus)||0)-(P.locked||0); if(P.mana<full){ ev.push({type:'mana',seat,amount:full-P.mana,src}); P.mana=full; }}},
  choiceArmor:{text:v=>`방어도 ${v}를 얻습니다`,cast:(s,seat,c)=>{s.seats[seat].armor=(s.seats[seat].armor||0)+c.effect.value;}},
  choiceHeal:{text:v=>`생명력 ${v} 회복`,cast:(s,seat,c)=>{const P=s.seats[seat]; P.hp=Math.min(P.maxHp||30,P.hp+c.effect.value);}},
  mana:   { text:v=>`주문: 이번 턴 마나 ${v} 얻기`, cast:(s,seat,c)=>{ s.seats[seat].mana+=c.effect.value; } },
  damage: { text:v=>`대상에게 ${v} 피해`, needsTarget:true, rank:1, cast:viaBattlecry,
            targets:(s,seat)=>[heroT(other(seat)), ...minsOf(s,other(seat)), heroT(seat), ...minsOf(s,seat)] },
  heal:   { text:v=>`대상 체력 ${v} 회복`, needsTarget:true, rank:3, cast:viaBattlecry,
            targets:(s,seat)=>[heroT(seat), ...minsOf(s,seat)] },
  draw:   { text:v=>`카드 ${v}장 뽑기`, rank:0, cast:viaBattlecry },
  silence:{ text:()=>`적 하수인 하나의 모든 추가 효과(도발·보호막·빙결·죽음의 메아리 등) 제거`, needsTarget:true, rank:1,
            targets:(s,seat)=>s.seats[other(seat)].board.filter(hasAbility).map(m=>minionT(other(seat), m.id)),
            cast:(s,seat,c,target,ev,src)=>{const t=target&&target.kind==='minion'?findMinion(s,target.seat,target.id):null; if(!t){ev.push({type:'ignored',seat,src});return;} stripAbilities(t);ev.push({type:'silence',target,name:t.name,src});} },
  giveShield:{ text:()=>`아군 하수인에게 보호막 부여`, needsTarget:true, rank:4,
            targets:(s,seat)=>s.seats[seat].board.filter(m=>!m.shield).map(m=>minionT(seat, m.id)),
            cast:(s,seat,c,target,ev,src)=>{const t=target&&target.kind==='minion'?findMinion(s,target.seat,target.id):null; if(!t){ev.push({type:'ignored',seat,src});return;} t.shield=true;ev.push({type:'shieldGain',target,name:t.name,src});} },
  haste:  { text:()=>`방금 소환한 아군 하수인이 바로 공격 가능`, needsTarget:true, rank:5,
            targets:(s,seat)=>s.seats[seat].board.filter(m=>m.summoned && !m.charge).map(m=>minionT(seat, m.id)),
            cast:(s,seat,c,target,ev,src)=>{const t=target&&target.kind==='minion'?findMinion(s,target.seat,target.id):null; if(!t){ev.push({type:'ignored',seat,src});return;} t.summoned=false;ev.push({type:'haste',target,name:t.name,src});} },
  execute:{ text:v=>`공격력 ${v} 이상인 적 하수인을 보호막을 무시하고 처치`, needsTarget:true, rank:1,
            targets:(s,seat,e)=>s.seats[other(seat)].board.filter(m=>m.atk>=e.value).map(m=>minionT(other(seat), m.id)),   // 공격력 기준 이상인 적만
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const amt=t.hp; t.shield=false; t.hp=0;                              // 보호막 무시 (환생은 sweepDead 에서 평소대로)
              ev.push({type:'damage', target, name:t.name, amount:amt, absorbed:false, cause:'battlecry', src}); }) },
  freeze: { text:()=>`적 하수인 하나를 얼려 다음 턴 공격하지 못하게 한다`, needsTarget:true, rank:1,
            targets:(s,seat)=>s.seats[other(seat)].board.filter(m=>!m.frozen).map(m=>minionT(other(seat), m.id)),           // 아직 얼지 않은 적만
            cast:onMinion(t=>{ t.frozen=true; }) },
  copy:   { text:()=>`손패의 하수인 한 장을 복제`, needsTarget:true, rank:0,
            targets:(s,seat)=>s.seats[seat].hand.filter(c=>c.type!=='spell').map(c=>({kind:'hand', seat, id:c.id})),       // 손패의 하수인 (대상이 손패 카드)
            cast:(s,seat,c,target,ev,src)=>{
              const P=s.seats[seat], orig = target && target.kind==='hand' ? P.hand.find(x=>x.id===target.id) : null;
              if(!orig || P.hand.length>=handMax(P)){ ev.push({type:'ignored', seat, src}); return; }
              P.hand.push({...orig, id:s.nextId++});
              ev.push({type:'copy', seat, name:orig.name, src}); } },            // name: 상대가 쓴 경우 화면에서 숨긴다
  rain:   { text:v=>`적 하수인 전체에 ${v} 피해`, rank:1,
            blocked:(s,seat)=> s.seats[other(seat)].board.length===0 ? '적 하수인이 없습니다.' : null,                         // 적 필드가 비면 낭비라 막는다
            cast:(s,seat,c,target,ev,src)=>{
              const foes=[...s.seats[other(seat)].board];
              if(!foes.length){ ev.push({type:'ignored', seat, src}); return; }
              foes.forEach(t=>hurtMinion(s, other(seat), t, c.effect.value, ev, 'battlecry', src)); } },
  fatigue:{ text:v=>`덱이 비어 영웅이 ${v} 피해를 입는다` },                       // 표시 전용 (탈진 연출 카드)

  deckDiscover:{ text:(v)=>`내 덱에서 카드 1장을 복사하여 발견한다. 비용이 ${v}만큼 감소한다`, rank:0,
            blocked:(s,seat)=> s.seats[seat].deck.length===0 ? '덱이 비어 있습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>startDeckDiscover(s, seat, {value:c.effect.value}, ev, src, c.auto),
            spellWorth:(c,view)=> view.me.hand.length<=8 && view.me.deckCount>=3 ? 4 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=8 && view.me.deckCount>=3 ? acts[0] : null },
  // ---- v20 발견: 주문을 내면 무작위 3장이 제시되고, 하나를 고를 때까지 게임이 멈춘다 (state.pending) ----
  discover:{ text:(v,e)=>`${e.min?`비용 ${e.min} 이상 `:''}${e.max!==undefined?`비용 ${e.max} 이하 `:''}주문 1장을 발견합니다. 3장 중 선택${v?`, 비용 -${v}`:''}`, rank:0,
            cast:(s,seat,c,target,ev,src)=>startDiscover(s, seat, {kind:c.effect.kind, min:c.effect.min, max:c.effect.max, value:c.effect.value}, ev, src, c.auto),
            spellWorth:(c,view)=> view.me.hand.length<=8 && (!c.lifeCost || view.me.hp>c.cost+10) ? 4 : 0,                         // 생명력 비용 카드는 체력이 넉넉할 때만
            ruleUse:(view,acts)=> acts.find(a=>{ const c=view.me.hand.find(x=>x.id===a.cardId); return view.me.hand.length<=8 && (!c.lifeCost || view.me.hp>c.cost+10); }) || null },
  damageDiscover:{ text:(v,e)=>`대상에게 ${v} 피해를 주고, 비용 ${e.max} 이하 주문 1장을 발견합니다`, needsTarget:true, rank:1,
            targets:(s,seat)=>[heroT(other(seat)), ...minsOf(s,other(seat)), heroT(seat), ...minsOf(s,seat)],
            cast:(s,seat,c,target,ev,src)=>{ battlecry(s, seat, {name:c.name, effect:{type:'damage', value:c.effect.value}, spell:true, school:c.school}, target, ev);
              startDiscover(s, seat, {kind:'spell', max:c.effect.max, value:0}, ev, src, c.auto); },
            worth:(view,card,t,ctx,h)=>{ if(h.mineSide) return -1000; const v=card.effect.value, bonus=view.me.hand.length<=8 ? 3 : 0;   // 피해 + 발견의 가치
              if(t.kind==='hero') return (v>=view.opp.hp ? 1000 : v*ctx.faceW)+bonus;
              if(h.m.shield) return 1+bonus;
              return (h.m.hp<=v ? h.val(h.m)+h.W.tempo : v*0.4)+bonus; },
            ruleUse:(view,acts,h)=>{ if(view.me.hand.length>8) return null;
              const foe=a=>a.target.seat!==view.seat;
              return acts.find(a=>a.target.kind==='minion' && foe(a) && !h.minionOf(a.target).shield && h.minionOf(a.target).hp<=2) || acts.find(a=>a.target.kind==='hero' && foe(a)) || null; } },

  // ---- v19 새 주문 (대상을 고르지 않는 광역형) ----
  bolt:   { text:v=>`적 하수인 중 공격력이 높은 둘에게 ${v} 피해`, rank:1,
            blocked:(s,seat)=> s.seats[other(seat)].board.length===0 ? '적 하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{
              boltTargets(s.seats[other(seat)].board).forEach(t=>hurtMinion(s, other(seat), t, c.effect.value, ev, 'battlecry', src)); },
            spellWorth:(c,view,ctx,h)=>{ const v=c.effect.value; let w=0;                                          // 맞는 둘 중 죽는 것의 가치
              for(const m of boltTargets(view.opp.board)) w+= (!m.shield && m.hp<=v) ? h.val(m)+h.W.tempo : v*0.4;
              return Math.min(20, w); },
            ruleUse:(view,acts)=>{ const v=view.me.hand.find(x=>x.id===acts[0]?.cardId)?.effect.value;
              return acts.length && boltTargets(view.opp.board).some(m=>!m.shield && m.hp<=v) ? acts[0] : null; } },
  wipe:   { text:v=>`양쪽의 모든 하수인에게 ${v} 피해`, rank:1,
            blocked:(s)=> s.seats[0].board.length+s.seats[1].board.length===0 ? '하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{
              for(const sd of [other(seat), seat]) [...s.seats[sd].board].forEach(t=>hurtMinion(s, sd, t, c.effect.value, ev, 'battlecry', src)); },
            spellWorth:(c,view,ctx,h)=>{ const v=c.effect.value, f=m=>(!m.shield && m.hp<=v) ? h.val(m)+h.W.tempo : v*0.4;   // 적이 입는 손해 - 내가 입는 손해
              return Math.min(20, view.opp.board.reduce((a,m)=>a+f(m),0) - view.me.board.reduce((a,m)=>a+f(m),0)); },
            ruleUse:(view,acts)=>{ const v=view.me.hand.find(x=>x.id===acts[0]?.cardId)?.effect.value, k=b=>b.filter(m=>!m.shield && m.hp<=v).length;
              return acts.length && k(view.opp.board)-k(view.me.board)>=2 ? acts[0] : null; } },

  // ---- v18 새 주문 ----
  massEnhance:{ text:v=>`모든 아군 하수인에게 +${v}/+${v} 부여`, rank:4,
            blocked:(s,seat)=>s.seats[seat].board.length===0 ? '아군 하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const v=c.effect.value; for(const t of [...s.seats[seat].board]){ t.atk+=v; t.hp+=v; t.maxHp+=v; ev.push({type:'buff', target:minionT(seat,t.id), name:t.name, value:v, src}); } },
            worth:(view,card,t,ctx,h)=>h.mineSide&&h.m ? 2+h.m.atk*0.4+h.m.hp*0.25 : -1000,
            ruleUse:(view,acts,h)=>acts[0]||null },
  enhance:{ text:v=>`아군 하수인 +${v}/+${v}`, needsTarget:true, rank:4,
            targets:(s,seat)=>minsOf(s,seat),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const v=c.effect.value; t.atk+=v; t.hp+=v; t.maxHp+=v;
              ev.push({type:'buff', target, name:t.name, value:v, src}); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m, ready=!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush);
              return 2+(ready?1.5:0)+m.atk*0.4+m.hp*0.25+(m.taunt?0.5:0); },
            ruleUse:(view,acts,h)=>{ let best=null, ba=1;                            // 바로 공격할 수 있는 공격력 2 이상 하수인 중 가장 센 것
              for(const a of acts){ const m=h.minionOf(a.target); if(m && !m.attacked && !m.frozen && (!m.summoned||m.charge||m.rush) && m.atk>ba){ ba=m.atk; best=a; } }
              return best; } },
  recall: { text:()=>`아군 하수인 하나를 손패로 되돌린다`, needsTarget:true, rank:1,
            targets:(s,seat)=>minsOf(s,seat),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{
              const P=s.seats[seat], base=CARD_POOL.find(x=>x.name===t.name);
              const card = base ? {...base} : {type:'minion', name:t.name, cost:t.cost, atk:t.atk, hp:t.maxHp};   // 원래 능력치로 돌아간다 (성장·피해는 사라짐)
              card.cost=t.cost; card.id=s.nextId++;                                                              // 비용 감소 같은 보정은 유지
              P.board=P.board.filter(x=>x.id!==t.id); P.hand.push(card);
              ev.push({type:'recall', target, name:t.name, src}); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m, base=CARD_POOL.find(x=>x.name===m.name);
              return (m.hp*2<=m.maxHp ? 2.5 : 0) + (base&&base.effect ? 2.5 : 0) + (m.hp<=1 ? 1 : 0); },       // 죽어 가는 하수인을 살리거나 전투의 함성을 다시 쓸 때
            ruleUse:(view,acts,h)=>{ const hurt=acts.filter(a=>{ const m=h.minionOf(a.target); return m && m.hp*2<=m.maxHp && m.cost>=2; });
              return hurt.length ? hurt.reduce((x,y)=>h.minionOf(x.target).cost>=h.minionOf(y.target).cost?x:y) : null; } },
  transform:{ text:()=>`적 하수인 하나를 1/1 양으로 바꾼다`, needsTarget:true, rank:1,
            targets:(s,seat)=>minsOf(s,other(seat)),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const from=t.name;
              delete t.deathDraw; delete t.deathSummon; delete t.deathSummonCost; delete t.deathCopy; delete t.deathGain; delete t.deathStego; delete t.onAttackCopy; delete t.endCastMin; delete t.spellDmgSchools; delete t.spellDmg; delete t.mini; delete t.onSpellFireball; delete t.onSpellScatter; delete t.onAttackBeast; delete t.onSpellDraw; delete t.endRecast; delete t.stealth; delete t.stealthTemp; delete t.infect; delete t.ignoreTaunt; delete t.needArmor; delete t.beastDouble; delete t.poison; delete t.endLotus; delete t.endViper; delete t.startHeal; delete t.endCast; delete t.endAttack; delete t.endDrain; delete t.leechBoost; delete t.endCorpses; delete t.startSpend; delete t.endScatter; delete t.endBait; delete t.endSteal; delete t.spellAura; delete t.lifesteal; delete t.spellburst; delete t.deathArmor; delete t.deathBuffAll; delete t.deathGrave; delete t.costOne; delete t.sonya; delete t.gally; delete t.crowley; delete t.tortola; delete t.endArmorSummon; delete t.endBully; delete t.windfury; delete t.deathMachines; delete t.deathKill; delete t.endDeckCopy; delete t.spellWeave; delete t.shieldAura; delete t.shieldHits; delete t.trogg; delete t.fireImmune; delete t.endDeckSummon; delete t.eggChicken; delete t.eggBonus; delete t.deathProto; delete t.endSword; delete t.tribe; t.name='양'; t.atk=1; t.hp=1; t.maxHp=1; t.taunt=false; t.shield=false; t.charge=false; t.rush=false; t.revive=false; t.elusive=false; t.frozen=false; if(t.tempAtk) t.tempAtk=0; delete t.effect;   // v53: 모면·빙결·이번 턴 공격력 보정도 함께 제거
              ev.push({type:'transform', target, name:from, to:'양', src}); }),
            worth:(view,card,t,ctx,h)=>{ if(h.mineSide||!h.m) return -1000; const m=h.m;                         // 비싼 하수인일수록 가치가 크다
              return Math.max(0, h.val(m)-5) + (m.taunt&&ctx.readyAtk>0 ? 1 : 0) + (ctx.danger ? m.atk*h.W.killThreat : 0); },
            ruleUse:(view,acts,h)=>{ const big=acts.filter(a=>{ const m=h.minionOf(a.target); return m && m.atk+m.hp>=9; });
              return big.length ? big.reduce((x,y)=>{ const a=h.minionOf(x.target), b=h.minionOf(y.target); return a.atk+a.hp>=b.atk+b.hp?x:y; }) : null; } },

  massTransform:{ text:()=>`모든 하수인을 1/1 양으로 변신시킵니다`, rank:1,
            blocked:(s)=> s.seats[0].board.length+s.seats[1].board.length===0 ? '하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ for(const sd of [other(seat), seat]) for(const m of [...s.seats[sd].board]) SPELL_FX.transform.cast(s, seat, c, minionT(sd, m.id), ev, src); },   // 양쪽 모든 하수인에게 변이와 같은 처리
            spellWorth:(c,view,ctx,h)=>{ const f=m=>Math.max(0, h.val(m)-3); return Math.min(20, view.opp.board.reduce((a,m)=>a+f(m),0) - view.me.board.reduce((a,m)=>a+f(m),0)); },
            ruleUse:(view,acts)=>{ const sum=b=>b.reduce((a,m)=>a+m.atk+m.hp,0); return acts.length && view.opp.board.length-view.me.board.length>=2 && sum(view.opp.board)-sum(view.me.board)>=8 ? acts[0] : null; } },

  soulWhip:{ text:v=>`생명력 흡수. 모든 하수인에게 피해를 ${v} 줍니다`, rank:1,
            blocked:(s)=> s.seats[0].board.length+s.seats[1].board.length===0 ? '하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ let dealt=0;                                            // 생명력 흡수: 실제로 준 피해만큼 내 영웅 회복 (보호막이 막은 피해는 0)
              for(const sd of [other(seat), seat]) for(const t of [...s.seats[sd].board]){ const before=t.hp, sh=t.shield; hurtMinion(s, sd, t, c.effect.value, ev, 'spell', src); if(!sh) dealt+=Math.max(0, before-t.hp); }
              if(dealt>0) gainLife(s, seat, dealt, ev, src); },
            spellWorth:(c,view,ctx,h)=>{ const v=c.effect.value, f=m=>(!m.shield && m.hp<=v) ? h.val(m)+h.W.tempo : v*0.4;
              return Math.min(20, view.opp.board.reduce((a,m)=>a+f(m),0) - view.me.board.reduce((a,m)=>a+f(m),0) + 1); },
            ruleUse:(view,acts)=>{ const k=b=>b.filter(m=>!m.shield && m.hp<=1).length; return acts.length && k(view.opp.board)-k(view.me.board)>=2 ? acts[0] : null; } },
  mindSteal:{ text:v=>`상대편의 덱에서 카드를 ${v}장 복사하여 내 손으로 가져옵니다`, rank:0,
            blocked:(s,seat)=> s.seats[other(seat)].deck.length ? null : '상대 덱에 카드가 없습니다.',
            cast:(s,seat,c,target,ev,src)=>{ stealDeckCards(s, seat, c.effect.value, ev, src); },
            spellWorth:(c,view)=> view.me.hand.length<=7 ? 3.5 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=7 ? acts[0] : null },
  mindBlast:{ text:v=>`적 영웅에게 피해를 ${v} 줍니다`, rank:3,
            cast:(s,seat,c,target,ev,src)=>{ hurtHero(s, other(seat), c.effect.value, ev, 'spell', src); },
            spellWorth:(c,view)=> view.opp.hp<=c.effect.value ? 20 : 2.5,
            ruleUse:(view,acts)=> acts.length && view.opp.hp<=8 ? acts[0] : null },
  divineSpirit:{ text:()=>`하수인의 생명력을 2배 증가시킵니다`, needsTarget:true, rank:4,
            targets:(s,seat)=>[...minsOf(s,seat), ...minsOf(s,other(seat))],
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const add=Math.max(0,t.hp); t.hp+=add; t.maxHp+=add;
              ev.push({type:'buff', target, name:t.name, value:0, hpValue:add, src}); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m; return 1.5+m.hp*0.5+m.atk*0.3+(m.taunt?1:0); },
            ruleUse:(view,acts,h)=>{ let best=null, bs=3; for(const a of acts){ const m=h.minionOf(a.target); if(m && m.hp>=4 && m.atk+m.hp>bs){ bs=m.atk+m.hp; best=a; } } return best; } },

  equality:{ text:()=>`모든 하수인의 생명력을 1로 바꿉니다`, rank:2,
            blocked:(s,seat)=> (s.seats[0].board.length+s.seats[1].board.length) ? null : '하수인이 없습니다.',
            spellWorth:(c,view)=>{ const f=b=>b.reduce((a,m)=>a+Math.max(0,m.hp-1)*(0.6+m.atk*0.25),0), net=f(view.opp.board)-f(view.me.board); return net>=5 ? Math.min(14, net) : 0; },
            cast:(s,seat,c,target,ev,src)=>{ for(const sd of [0,1]) for(const m of s.seats[sd].board){ if(m.hp<=0) continue; m.hp=1; m.maxHp=1;
                ev.push({type:'statSet', target:minionT(sd, m.id), name:m.name, atk:m.atk, hp:1, src}); } } },
  divineFavor:{ text:()=>`상대편 손에 있는 카드와 같은 수가 될 때까지 카드를 뽑습니다`, rank:0,
            spellWorth:(c,view)=>{ const n=view.opp.handCount-(view.me.hand.length-1); return n>=2 && view.me.deckCount>=n ? Math.min(10, n*1.6) : 0; },
            cast:(s,seat,c,target,ev,src)=>{ const n=s.seats[other(seat)].hand.length-s.seats[seat].hand.length;
              if(n>0) drawCards(s, seat, n, ev, src); else ev.push({type:'ignored', seat, src}); } },
  darkEssence:{ text:()=>`내 덱에서 무작위 하수인을 복사하여 5/5 하수인으로 소환합니다`, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : (s.seats[seat].deck.some(c=>c.type==='minion') ? null : '덱에 하수인이 없습니다.'),
            cast:(s,seat,c,target,ev,src)=>{ summonDeckCopy(s, seat, ev, src); },
            spellWorth:(c,view)=> CONFIG.MAX_BOARD-view.me.board.length>=1 && view.me.deckCount>=3 ? 5 : 0,
            ruleUse:(view,acts)=> acts.length && CONFIG.MAX_BOARD-view.me.board.length>=1 && view.me.deckCount>=3 ? acts[0] : null },
  upgradeMinion:{ text:()=>`아군 하수인을 비용이 (1) 높은 무작위 하수인으로 변신시킵니다`, needsTarget:true, rank:4,
            targets:(s,seat)=>minsOf(s,seat).filter(t=>{ const m=findMinion(s,seat,t.id); return m && CARD_POOL.some(x=>x.type==='minion' && x.cost===(m.cost||0)+1 && !x.generatedOnly); }),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const P=s.seats[seat], bf=(P.mods&&P.mods.buff)||0,
              pool=CARD_POOL.filter(x=>x.type==='minion' && x.cost===(t.cost||0)+1 && !x.generatedOnly);
              if(!pool.length){ ev.push({type:'ignored', seat, src}); return; }
              const base=pool[Math.floor(nextRand(s)*pool.length)], idx=P.board.indexOf(t);
              const nm={...structuredClone(base), id:t.id, maxHp:base.hp+bf, hp:base.hp+bf, attacked:t.attacked, summoned:t.summoned}; delete nm.effect; delete nm.inDeck; cheatMinion(P, nm);   // 새 하수인 (전투의 함성은 없음, 공격 여부는 유지)
              P.board[idx]=nm; ev.push({type:'transform', target, name:t.name, to:base.name, src}); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m, b=CARD_POOL.find(x=>x.name===m.name);
              const lost=b ? Math.max(0,(m.atk+m.maxHp)-(b.atk+b.hp)) : 0;                          // 강화·성장은 사라진다
              return 3.4 - lost*0.8 - (m.shield||m.revive?1.5:0) + (m.cost<=2?0.6:0); },
            ruleUse:(view,acts,h)=>{ let best=null, bc=99; for(const a of acts){ const m=h.minionOf(a.target), b=m && CARD_POOL.find(x=>x.name===m.name);
                if(m && b && m.cost<=3 && m.atk===b.atk && m.maxHp===b.hp && !m.shield && !m.revive && m.cost<bc){ bc=m.cost; best=a; } } return best; } },
  devolve:{ text:()=>`모든 적 하수인을 비용이 (1) 낮은 무작위 하수인으로 변신시킵니다`, rank:1,
            blocked:(s,seat)=> s.seats[other(seat)].board.length ? null : '적 하수인이 없습니다.',
            spellWorth:(c,view)=>{ const b=view.opp.board.filter(m=>m.cost>=3); return b.length>=2 ? Math.min(10, b.length*2.5) : 0; },
            cast:(s,seat,c,target,ev,src)=>{ const sd=other(seat), P=s.seats[sd], bf=(P.mods&&P.mods.buff)||0;
              for(const m of [...P.board]){
                let k=Math.max(0, (m.cost||0)-1), pool=[]; while(k>=0 && !(pool=CARD_POOL.filter(x=>x.type==='minion' && x.cost===k && !x.generatedOnly)).length) k--;
                if(!pool.length) continue;
                const base=pool[Math.floor(nextRand(s)*pool.length)], idx=P.board.indexOf(m);
                const nm={...structuredClone(base), id:m.id, maxHp:base.hp+bf, hp:base.hp+bf, attacked:false, summoned:m.summoned}; delete nm.effect;
                P.board[idx]=nm; ev.push({type:'transform', target:minionT(sd, m.id), name:m.name, to:base.name, src}); } } },
  grudge:{ text:()=>`모든 하수인에게 피해를 2 줍니다. 처치한 하수인 하나당 방어도를 +2 얻습니다`, rank:2,
            blocked:(s,seat)=> (s.seats[0].board.length+s.seats[1].board.length) ? null : '하수인이 없습니다.',
            spellWorth:(c,view)=>{ const k=b=>b.filter(m=>!m.shield && m.hp<=2).length, op=view.opp.board, me=view.me.board;
              const net=k(op)*3+op.length*0.6-(k(me)*3+me.length*0.5); return net>=4 ? Math.min(14, net) : 0; },
            cast:(s,seat,c,target,ev,src)=>{ const all=[]; for(const sd of [0,1]) for(const m of s.seats[sd].board) all.push([sd,m]);
              let kills=0; for(const [sd,m] of all){ hurtMinion(s, sd, m, 2, ev, 'spell', src); if(m.hp<=0) kills++; }
              if(kills){ const P=s.seats[seat]; P.armor=(P.armor||0)+2*kills; ev.push({type:'armor', seat, amount:2*kills, src}); }
              sweepDead(s, ev); } },
  omegaFacility:{ text:()=>`기계를 발견합니다. 내 마나 수정이 10개면, 카드 3장을 모두 가집니다`, rank:0,
            spellWorth:(c,view)=> view.me.hand.length<=8 ? 3.5 : 0,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], bag=CARD_POOL.filter(x=>x.type==='minion' && (x.tribe||'').includes('기계') && !x.generatedOnly), opts=[];
              while(opts.length<3 && bag.length){ const o=structuredClone(bag.splice(Math.floor(nextRand(s)*bag.length),1)[0]); delete o.lifeCost; opts.push(o); }
              if(!opts.length){ ev.push({type:'ignored', seat, src}); return; }
              if(P.maxMana>=10){                                    // 마나 수정 10개: 후보 3장을 모두 얻는다
                for(const o of opts){ const card={...o, id:s.nextId++}, burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
                  ev.push({type:'generated', seat, name:card.name, burned, src, ...(burned?{card}:{})}); }
                return; }
              finishDiscover(s, seat, opts, {value:0}, ev, src, !!c.auto || !!s.pending); } },
  dragonRoar:{ text:(v,e)=>`무작위 용족 ${['','하나를','둘을','셋을'][e.count]||e.count+'기를'} 내 손으로 가져옵니다`, rank:0,
            spellWorth:(c,view)=> CONFIG.MAX_HAND-(view.me.hand.length-1)>=2 ? 4 : 0,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], pool=CARD_POOL.filter(x=>x.type==='minion' && (x.tribe||'').includes('용족') && !x.generatedOnly);
              if(!pool.length){ ev.push({type:'ignored', seat, src}); return; }
              for(let i=0;i<c.effect.count;i++){ const card={...structuredClone(pool[Math.floor(nextRand(s)*pool.length)]), id:s.nextId++}; delete card.inDeck;
                const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
                ev.push({type:'generated', seat, name:card.name, burned, src, ...(burned?{card}:{})}); } } },
  illusionPotion:{ text:()=>`아군 하수인들을 1/1 하수인으로 복사하여 내 손으로 가져옵니다. 그 하수인들의 비용이 (1)이 됩니다`, rank:2.5,
            blocked:(s,seat)=> s.seats[seat].board.some(m=>m.hp>0) ? null : '복사할 아군 하수인이 없습니다.',
            spellWorth:(c,view)=>{ const n=view.me.board.length, room=CONFIG.MAX_HAND-(view.me.hand.length-1); return n>=2 && room>=2 ? Math.min(8, 2+Math.min(n,room)*1.2) : 0; },
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat]; let n=0;
              for(const m of [...P.board]){ if(m.hp<=0) continue;
                const base=CARD_POOL.find(x=>x.type==='minion' && x.name===m.name);
                let card;
                if(base) card={...structuredClone(base)};
                else { card={type:'minion', name:m.name}; if(m.tribe) card.tribe=m.tribe; for(const k of ABILITY_KEYS) if(m[k] && !['frozen','stealthTemp','effect'].includes(k)) card[k]=structuredClone(m[k]); }
                delete card.inDeck; delete card.dynCost; card.id=s.nextId++; card.atk=1; card.hp=1; card.cost=1; n++;
                const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
                ev.push({type:'generated', seat, name:card.name, burned, src, ...(burned?{card}:{})}); }
              if(!n) ev.push({type:'ignored', seat, src}); } },
  fanKnives:{ text:()=>`모든 적 하수인에게 피해를 1 줍니다. 카드를 뽑습니다`, rank:1,
            spellWorth:(c,view)=>{ const b=view.opp.board; return (view.me.hand.length-1<CONFIG.MAX_HAND && view.me.deckCount>=1 ? 3 : 0) + b.length*0.8 + b.filter(m=>!m.shield && m.hp<=1).length*2; },
            cast:(s,seat,c,target,ev,src)=>{ for(const m of [...s.seats[other(seat)].board]) hurtMinion(s, other(seat), m, 1, ev, 'spell', src); sweepDead(s, ev); drawCards(s, seat, 1, ev, src); } },
  tarmak:{ text:()=>`이번 턴에 하수인들이 받는 피해가 2배 증가합니다. 대상에게 피해를 1 줍니다`, needsTarget:true, rank:1,
            targets:(s,seat)=>[heroT(other(seat)), ...minsOf(s,other(seat)), heroT(seat), ...minsOf(s,seat)],
            worth:(view,card,t,ctx,h)=>{ if(h.mineSide) return -1000; if(!h.m) return 0.5; return (!h.m.shield && h.m.hp<=2 ? h.val(h.m)+h.W.tempo : 0.3); },
            cast:(s,seat,c,target,ev,src)=>{ s.dmgDoubleTurn=s.turnNo; ev.push({type:'dmgDouble', seat, src});          // 이번 턴 동안 모든 하수인이 받는 피해 2배 (턴이 바뀌면 자동 종료)
              battlecry(s, seat, {name:c.name, effect:{type:'damage', value:1}, spell:true}, target, ev); } },
  massRaise:{ text:(v,e)=>`이번 게임에서 죽은 무작위 아군 하수인 ${['','하나를','둘을','셋을'][e.count]||e.count+'기를'} 소환합니다`, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : (raiseDeadList(s,seat,99).length ? null : '부활시킬 아군 하수인이 없습니다.'),
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], bf=(P.mods&&P.mods.buff)||0; let n=0;
              for(let k=0;k<c.effect.count && P.board.length<CONFIG.MAX_BOARD;k++){
                const list=raiseDeadList(s, seat, 99); if(!list.length) break;
                const p=list[Math.floor(nextRand(s)*list.length)], m={...structuredClone(p.base), id:s.nextId++, maxHp:p.base.hp+bf, hp:p.base.hp+bf, attacked:false, summoned:true}; delete m.effect;
                P.board.push(m); ev.push({type:'summon', seat, id:m.id, name:m.name, src}); n++;
                const i=P.grave.indexOf(p.g); if(i>=0) P.grave.splice(i,1); }          // 같은 죽음은 한 번만 부활
              if(!n) ev.push({type:'ignored', seat, src}); },
            spellWorth:(c,view)=>{ const free=CONFIG.MAX_BOARD-view.me.board.length, g=(view.me.grave||[]).length; return free>=2 && g>=2 ? Math.min(14, 3+Math.min(free,g,3)*3) : 0; },
            ruleUse:(view,acts)=> acts.length && CONFIG.MAX_BOARD-view.me.board.length>=3 && (view.me.grave||[]).length>=3 ? acts[0] : null },

  // ---- v26 ----
  muster: { text:(v,e)=>`비용의 합이 ${e.total}이 되도록 하수인을 무작위로 소환하고, 모두 도발을 얻는다. 0코스트는 제외하고 전투의 함성은 발동하지 않는다`, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ summonMuster(s, seat, musterPick(s, c.effect.total, freeSlots(s,seat)), ev); },
            spellWorth:(c,view)=>{ const n=CONFIG.MAX_BOARD-view.me.board.length; return n>=2 ? 5 : n===1 ? 3 : 0; },
            ruleUse:(view,acts)=> acts.length && CONFIG.MAX_BOARD-view.me.board.length>=2 ? acts[0] : null },
  chaos:  { text:v=>`무작위 주문을 ${v}회 사용한다. 대상도 무작위이고 발견은 자동으로 선택하며, 자리나 대상이 없으면 불발이 된다`, rank:2,
            cast:(s,seat,c,target,ev,src)=>{ castChaos(s, seat, c, ev); },
            spellWorth:()=>4,
            ruleUse:(view,acts)=> acts[0] || null },
  // ---- v28 일식: 이번 턴에 손에서 내는 다음 주문을 2번 시전 (apply 의 PLAY_CARD 가 플래그를 소모하고 state.recast 를 만든다) ----
  eclipse:{ text:()=>`이번 턴에 시전하는 다음 주문을 2번 시전한다. 대상은 다시 고르고 발견은 한 번 더 한다`, rank:-0.5,
            cast:(s,seat,c,target,ev,src)=>{ s.seats[seat].eclipse=true; ev.push({type:'eclipse', seat, src}); },
            spellWorth:(c,view)=> eclipseHasPartner(view, c) ? 4 : 0,
            ruleUse:(view,acts)=>{ const c=acts.length && view.me.hand.find(x=>x.id===acts[0].cardId); return c && eclipseHasPartner(view, c) ? acts[0] : null; } },
  // ---- v29 ----
  bloom:  { text:v=>`이번 턴 마나 ${v}를 동전처럼 얻는다`, cast:(s,seat,c,target,ev,src)=>{ s.seats[seat].mana+=c.effect.value; ev.push({type:'mana', seat, amount:c.effect.value, src}); } },   // 봇은 동전처럼 취급 (isCoin)
  growth: { text:v=>`각 플레이어가 마나 수정 ${v}개를 얻는다. 최대 ${CONFIG.MAX_MANA}개까지이고 내 이번 턴 마나도 +${v}`, rank:-0.8,
            cast:(s,seat,c,target,ev,src)=>{ const v=c.effect.value;
              for(const sd of [0,1]) addMax(s.seats[sd], v);
              s.seats[seat].mana+=v; ev.push({type:'growth', seat, amount:v, src}); },
            spellWorth:(c,view)=> view.me.maxMana<=6 ? 3.5 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.maxMana<=6 ? acts[0] : null },
  fruit:  { text:()=>`마나를 모두 소모한다. 선택 — 소모한 마나만큼 이번 턴 아군 하수인 1기의 공격력 +N, 또는 방어도 +2N`, rank:9, spellWorth:()=>0,   // 봇은 bestPlan 이 아니라 별도 판단(fruitOk)으로 쓴다
            cast:(s,seat,c,target,ev,src)=>{ startFruit(s, seat, ev, src, c.auto); },
            ruleUse:(view,acts)=> acts.length && fruitOk(view) ? acts[0] : null },
  fruitAtk:  { text:v=>`아군 하수인 1기의 공격력을 이번 턴 동안 +${v}`, needsTarget:true, targets:(s,seat)=>minsOf(s,seat),     // 금단의 과일 선택지 (카드풀에는 없음)
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const v=c.effect.value; t.atk+=v; t.tempAtk=(t.tempAtk||0)+v; ev.push({type:'buff', target, name:t.name, value:v, src, temp:true}); }) },
  fruitArmor:{ text:v=>`방어도 ${v}를 얻는다. 영웅이 받는 피해를 먼저 흡수한다`, cast:(s,seat,c,target,ev,src)=>{ s.seats[seat].armor=(s.seats[seat].armor||0)+c.effect.value; ev.push({type:'armor', seat, amount:c.effect.value, src}); } },
  // ---- v32 ----
  scale:  { text:v=>`아군 하수인에게 +${v}/+${v}를 부여하고, 그 하수인의 공격력만큼 방어도를 얻는다`, needsTarget:true, rank:4,
            targets:(s,seat)=>minsOf(s,seat),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const v=c.effect.value; t.atk+=v; t.hp+=v; t.maxHp+=v;
              ev.push({type:'buff', target, name:t.name, value:v, src});
              if(t.atk>0){ s.seats[seat].armor=(s.seats[seat].armor||0)+t.atk; ev.push({type:'armor', seat, amount:t.atk, src}); } }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m, ready=!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush);
              return 2.5+(ready?1.5:0)+m.atk*0.5+m.hp*0.25+(m.taunt?0.5:0); },
            ruleUse:(view,acts,h)=>{ let best=null, ba=1;
              for(const a of acts){ const m=h.minionOf(a.target); if(m && m.atk>ba){ ba=m.atk; best=a; } }
              return best; } },
  crystal:{ text:v=>`빈 마나 수정을 ${v}개 얻는다. 최대 ${CONFIG.MAX_MANA}개까지`, rank:-0.6,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat]; addMax(P, c.effect.value); ev.push({type:'crystal', seat, amount:c.effect.value, src}); },   // 현재 마나는 늘지 않는다
            spellWorth:(c,view)=> view.me.maxMana<=7 ? 3.2 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.maxMana<=7 ? acts[0] : null },
  snack:  { text:v=>`다음 턴에만 마나 수정을 ${v}개 얻는다`, rank:3,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat]; P.nextMana=(P.nextMana||0)+c.effect.value; ev.push({type:'nextMana', seat, amount:c.effect.value, src}); },
            spellWorth:(c,view)=> view.me.hand.some(x=>x.cost>view.me.maxMana+1 && x.cost<=view.me.maxMana+1+c.effect.value) ? 3.2 : 0,   // 다음 턴 마나로 못 내는 비싼 카드가 손에 있을 때만
            ruleUse:(view,acts)=>{ const c=acts.length && view.me.hand.find(x=>x.id===acts[0].cardId); return c && view.me.hand.some(x=>x.id!==c.id && x.cost>view.me.maxMana+1 && x.cost<=view.me.maxMana+1+c.effect.value) ? acts[0] : null; } },
  carapace:{ text:v=>`방어도를 ${v} 얻는다. 내 다음 턴이 시작될 때 방어도를 ${v} 더 얻는다`, rank:3,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], v=c.effect.value; P.armor=(P.armor||0)+v; P.armorNext=(P.armorNext||0)+v;
              ev.push({type:'armor', seat, amount:v, src}); ev.push({type:'armorLater', seat, amount:v, src}); },
            spellWorth:(c,view)=> view.me.hp<=20 ? 3.2 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hp<=18 ? acts[0] : null },
  compost:{ text:v=>`내 하수인 전체에 "죽음의 메아리: 카드 ${v}장 뽑기"를 부여한다`, rank:2.8,
            blocked:(s,seat)=> s.seats[seat].board.length===0 ? '아군 하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat];
              if(!P.board.length){ ev.push({type:'ignored', seat, src}); return; }
              P.board.forEach(m=>{ m.deathDraw=(m.deathDraw||0)+c.effect.value; });
              ev.push({type:'compost', seat, count:P.board.length, src}); },
            spellWorth:(c,view)=> view.me.board.length>=2 && view.me.hand.length<=7 ? 3.5 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.board.length>=3 && view.me.hand.length<=7 ? acts[0] : null },
  // ---- v35 ----
  ascend: { text:v=>`내 최대 마나가 총 ${v} 증가합니다. 지금 당장은 빈 마나 수정 1개만 얻고, 나머지 ${v-1}는 다음 턴 시작에 더해집니다`, rank:-0.6,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], v=c.effect.value; P.maxMana+=1; P.ascendNext=(P.ascendNext||0)+(v-1);     // v94: 총 +v, 즉시 빈 수정 1개 / 나머지는 다음 턴 시작. 증가는 10 제한 없음
              ev.push({type:'ascend', seat, amount:1, later:v-1, now:P.maxMana, src}); },
            spellWorth:(c,view)=> view.me.maxMana<=7 ? 4 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.maxMana<=7 ? acts[0] : null },
  forestSoul:{ text:()=>`내 하수인 전체에 "죽음의 메아리: 2/2 나무정령 소환"을 부여한다`, rank:2.8,
            blocked:(s,seat)=> s.seats[seat].board.length===0 ? '아군 하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat];
              if(!P.board.length){ ev.push({type:'ignored', seat, src}); return; }
              P.board.forEach(m=>{ m.deathSummon=(m.deathSummon||0)+1; });
              ev.push({type:'forestSoul', seat, count:P.board.length, src}); },
            spellWorth:(c,view)=> view.me.board.length>=2 ? 3.5 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.board.length>=3 ? acts[0] : null },
  roar:   { text:v=>`이번 턴에 내 하수인들에게 공격력을 +${v} 부여한다`, rank:5,
            blocked:(s,seat)=> s.seats[seat].board.length===0 ? '아군 하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], v=c.effect.value;
              if(!P.board.length){ ev.push({type:'ignored', seat, src}); return; }
              P.board.forEach(m=>{ m.atk+=v; m.tempAtk=(m.tempAtk||0)+v; ev.push({type:'buff', target:minionT(seat, m.id), name:m.name, value:v, src, temp:true}); }); },
            spellWorth:(c,view)=>{ const n=view.me.board.filter(m=>!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush)).length; return n>=2 ? Math.min(8, n*2) : 0; },
            ruleUse:(view,acts)=> acts.length && view.me.board.filter(m=>!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush)).length>=3 ? acts[0] : null },
  // ---- v38 ----
  cleave: { text:(v,e)=>`적에게 피해를 ${v} 주고 다른 모든 적에게 피해를 ${e.other} 준다`, needsTarget:true, rank:1,
            targets:(s,seat)=>[heroT(other(seat)), ...minsOf(s,other(seat))],                        // 적 영웅과 적 하수인 중 하나
            cast:(s,seat,c,target,ev,src)=>{
              if(!target){ ev.push({type:'ignored', seat, src}); return; }
              const foe=other(seat), e=c.effect;
              hitTarget(s, target, e.value, ev, src);
              if(!(target.kind==='hero')) hurtHero(s, foe, e.other, ev, 'battlecry', src);           // 다른 모든 적: 적 영웅
              [...s.seats[foe].board].forEach(m=>{ if(!(target.kind==='minion' && target.id===m.id)) hurtMinion(s, foe, m, e.other, ev, 'battlecry', src); });
            },
            worth:(view,card,t,ctx,h)=>{ const e=card.effect; if(h.mineSide) return -1000;
              const foes=view.opp.board, others=h.m ? foes.filter(x=>x.id!==h.m.id) : foes; let w=0;
              for(const x of others) w+= (!x.shield && x.hp<=e.other) ? h.val(x)+h.W.tempo : e.other*0.4;
              if(h.m){ w+= (!h.m.shield && h.m.hp<=e.value) ? h.val(h.m)+h.W.tempo : e.value*0.4; w+=e.other*0.5; }
              else { w+= view.opp.hp<=e.value ? 20 : e.value*0.3; }
              return Math.min(20, w); },
            ruleUse:(view,acts,h)=>{ let best=null, bv=-1;                                             // 4 이하 체력의 적 하수인 중 공격력이 가장 센 것을 처치
              for(const a of acts){ const m=a.target.kind==='minion' && h.minionOf(a.target); if(m && !m.shield && m.hp<=4 && m.atk>bv){ bv=m.atk; best=a; } }
              if(!best && !view.opp.board.length){ best=acts.find(a=>a.target.kind==='hero')||null; }   // 적 하수인이 없으면 영웅
              return best; } },
  shrink: { text:v=>`내 덱에 있는 하수인들의 비용과 공격력이 ${v} 감소한다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ const v=c.effect.value; let n=0;
              for(const d of s.seats[seat].deck){ if(d.type==='minion'){ d.cost=Math.max(0, d.cost-v); d.atk=Math.max(0, d.atk-v); n++; } }
              ev.push({type:'shrink', seat, count:n, amount:v, src}); },
            spellWorth:(c,view)=> view.me.deckCount>=8 && view.me.hand.length<=6 ? 3 : 0,
            ruleUse:(view,acts)=> null },
  furyCry:{ text:v=>`카드를 ${v}장 뽑는다. 내 손에 있는 카드 1장당 방어도를 +1 얻는다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat];
              drawCards(s, seat, c.effect.value, ev, src);
              const n=P.hand.length;
              if(n>0){ P.armor=(P.armor||0)+n; ev.push({type:'armor', seat, amount:n, src}); } },
            spellWorth:(c,view)=> view.me.deckCount>=1 && view.me.hand.length<=8 ? (view.me.hand.length>=4 ? 4 : 3) : 0,
            ruleUse:(view,acts)=> acts.length && view.me.deckCount>=1 && view.me.hand.length>=4 && view.me.hand.length<=8 ? acts[0] : null },
  guardian:{ text:(v,e)=>`방어도를 ${e.armor} 얻는다. 비용이 ${e.cost}인 무작위 하수인을 소환하고 도발을 부여한다`, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], e=c.effect;
              P.armor=(P.armor||0)+e.armor; ev.push({type:'armor', seat, amount:e.armor, src});
              const pool=CARD_POOL.filter(x=>x.type==='minion' && x.cost===e.cost);                    // 전투의 함성은 발동하지 않는다 (철벽 소집과 같음)
              if(pool.length && freeSlots(s,seat)>0) summonMuster(s, seat, [pool[Math.floor(nextRand(s)*pool.length)]], ev); },
            spellWorth:(c,view)=> CONFIG.MAX_BOARD-view.me.board.length>=1 ? 5 : 0,
            ruleUse:(view,acts)=> acts.length && CONFIG.MAX_BOARD-view.me.board.length>=1 ? acts[0] : null },
  // ---- v24 소환 주문 (속공 하수인) ----
  summon: { text:(v,e)=>{ const kws=[e.rush===false?null:'속공', ...(e.kw||[])].filter(Boolean); return `${kws.length?kws.join(', ')+' ':''}${e.atk}/${e.hp} 「${e.token}」 ${e.count}마리를 소환한다. 빈 자리만큼만 소환한다`; }, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ summonTokens(s, seat, c.effect.count, {name:c.effect.token, atk:c.effect.atk, hp:c.effect.hp, rush:c.effect.rush, taunt:c.effect.taunt, extra:c.effect.extra}, ev); },
            spellWorth:(c,view,ctx,h)=>{ const e=c.effect, n=Math.min(e.count, CONFIG.MAX_BOARD-view.me.board.length);
              return n>=2 ? Math.min(20, n*h.val({atk:e.atk, hp:e.hp})) : 0; },
            ruleUse:(view,acts)=> acts.length && CONFIG.MAX_BOARD-view.me.board.length>=2 ? acts[0] : null },
  glide:  { text:(v,e)=>`속공 ${e.atk}/${e.hp} 「${e.token}」으로 내 전장을 가득 채운다. 이번 턴에 모두 죽으면 같은 수만큼 다시 소환한다`, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{
              const e=c.effect, tok={name:e.token, atk:e.atk, hp:e.hp}, ids=summonTokens(s, seat, freeSlots(s,seat), tok, ev);
              if(ids.length) s.seats[seat].glide={turnNo:s.turnNo, ids, n:ids.length, tok, dead:[], src:c.name}; },
            spellWorth:(c,view,ctx,h)=>{ const e=c.effect, n=CONFIG.MAX_BOARD-view.me.board.length;
              return n>=3 ? Math.min(20, n*h.val({atk:e.atk, hp:e.hp})+2) : 0; },
            ruleUse:(view,acts)=> acts.length && CONFIG.MAX_BOARD-view.me.board.length>=3 ? acts[0] : null },
  // ---- v61 ----
  eternalBolt:{ text:v=>`생명력 흡수. 하수인에게 피해를 ${v} 줍니다. 그 하수인이 죽으면 내 턴이 끝날 때 이 주문을 손패로 다시 가져옵니다`, needsTarget:true, rank:1,
            targets:(s,seat)=>[...minsOf(s,0), ...minsOf(s,1)],
            cast:onMinion((t,s,seat,c,target,ev,src)=>{
              const v=c.effect.value, P=s.seats[seat], shielded=t.shield;
              hurtMinion(s, target.seat, t, v, ev, 'spell', src);
              if(!shielded){                                                             // 생명력 흡수: 실제로 준 피해만큼 내 영웅 회복 (보호막이 막으면 0)
                const before=P.hp; P.hp=Math.min(P.maxHp ?? CONFIG.HERO_HP, P.hp+v);
                if(P.hp>before) ev.push({type:'heal', target:heroT(seat), name:null, amount:P.hp-before, src});
              }
              const base=CARD_POOL.find(x=>x.name===c.name) || c, back={...base, cost:c.cost}; delete back.id; delete back.auto; delete back.lifeCost; if(c.inDeck) back.inDeck=true;
              (s.returns=s.returns||[]).push({owner:seat, seat:target.seat, id:t.id, dead:false, card:back});   // 이번 턴에 대상이 죽으면 내 턴이 끝날 때 손패로 (returnEternal)
            }),
            worth:(view,card,t,ctx,h)=>{ if(h.mineSide||!h.m) return -1000; const m=h.m, v=card.effect.value;
              if(m.shield) return 1.5;
              const heal=Math.min(v,(view.me.maxHp||30)-view.me.hp)*0.4;
              return m.hp<=v ? h.val(m)+h.W.tempo+2.5+heal+(ctx.danger?m.atk*h.W.killThreat:0) : v*0.4+heal; },   // 처치하면 주문이 돌아오므로 +2.5
            ruleUse:(view,acts,h)=>{ if(!acts.length) return null; const v=h.cardOf(acts[0]).effect.value; let best=null, bv=-1;
              for(const a of acts){ const m=a.target.seat!==view.seat && h.minionOf(a.target); if(m && !m.shield && m.hp<=v && m.atk+m.hp>bv){ bv=m.atk+m.hp; best=a; } }
              return best; } },
  adalGuardian:{ text:(v,e)=>`하수인에게 +${e.atk}/+${e.hp}을 부여합니다. 카드를 뽑습니다`, needsTarget:true, rank:4,
            targets:(s,seat)=>minsOf(s,seat),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const e=c.effect; t.atk+=e.atk; t.hp+=e.hp; t.maxHp+=e.hp;
              ev.push({type:'buff', target, name:t.name, value:e.atk, hpValue:e.hp, src});
              drawCards(s, seat, e.draw, ev, src); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m, ready=!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush);
              return 2.2+(ready?1.5:0)+m.atk*0.4+m.hp*0.25+(m.taunt?0.5:0)+(view.me.hand.length<=8&&view.me.deckCount>0?1.5:0); },
            ruleUse:(view,acts,h)=>{ if(view.me.hand.length>8 || view.me.deckCount<1) return null; let best=null, ba=-1;
              for(const a of acts){ const m=h.minionOf(a.target); if(m && m.atk+m.hp>ba){ ba=m.atk+m.hp; best=a; } }
              return best; } },
  timeMend:{ text:(v,e)=>`무작위 신성 주문을 ${e.count}장 얻습니다. 그 카드들의 비용만큼 내 영웅의 생명력을 회복시킵니다. 그 주문들의 비용이 ${e.discount} 감소합니다`, rank:0,
            spellWorth:(c,view)=> view.me.hand.length<=7 ? 5 : 1,
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=7 ? acts[0] : null,
            cast:(s,seat,c,target,ev,src)=>{                                          // 1) 신성 주문 N장 획득 2) 그 원래 비용 합만큼 영웅 회복 3) 그 카드들 비용 -3
              const P=s.seats[seat], e=c.effect, pool=spellPool({school:'신성'}).filter(x=>!x.generatedOnly && x.name!=='시간대 수선');
              if(!pool.length){ ev.push({type:'ignored', seat, src}); return; }
              let total=0; const got=[];
              for(let i=0;i<e.count;i++){
                const x=pool[Math.floor(nextRand(s)*pool.length)], copy={...x, id:s.nextId++}, burned=P.hand.length>=handMax(P);
                total+=x.cost; if(!burned) P.hand.push(copy); got.push({copy, burned});
                ev.push({type:'generated', seat, name:x.name, burned, src,...(burned?{card:copy}:{})});
              }
              const before=P.hp; P.hp=Math.min(P.maxHp ?? CONFIG.HERO_HP, P.hp+total);
              ev.push({type:'heal', target:heroT(seat), name:null, amount:P.hp-before, src});
              for(const g of got) g.copy.cost=Math.max(0, g.copy.cost-e.discount);
              ev.push({type:'cardsDiscount', seat, count:got.length, amount:e.discount, src});
            } },
  thornMount:{ text:(v,e)=>`하수인에게 +${e.atk}/+${e.hp}과 도발을 부여합니다. 그 하수인이 죽으면 스테고돈(도발 ${STEGODON.atk}/${STEGODON.hp})을 소환합니다`, needsTarget:true, rank:4,
            targets:(s,seat)=>minsOf(s,seat),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const e=c.effect; t.atk+=e.atk; t.hp+=e.hp; t.maxHp+=e.hp; t.taunt=true; t.deathStego=(t.deathStego||0)+1;
              ev.push({type:'buff', target, name:t.name, value:e.atk, hpValue:e.hp, src});
              ev.push({type:'mount', target, name:t.name, src}); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m, ready=!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush);
              return 3+(ready?1.5:0)+card.effect.atk*0.4+m.atk*0.3+(m.taunt?0:1.2)+1.5; },
            ruleUse:(view,acts,h)=>{ let best=null, ba=-1;
              for(const a of acts){ const m=h.minionOf(a.target); if(m && m.atk+m.hp>ba){ ba=m.atk+m.hp; best=a; } }
              return best; } },
  // ---- v70 ----
  grantBuff:{ text:(v,e)=>{ const st=(e.atk||e.hp) ? `+${e.atk}/+${e.hp}` : '', kw=[e.revive?'환생':'', e.taunt?'도발':''].filter(Boolean).join('과 ');
              return `하수인에게 ${st && kw ? `${st}, ${kw}을` : st ? `${st}를` : `${kw}을`} 부여합니다`; }, needsTarget:true, rank:4,
            targets:(s,seat)=>minsOf(s,seat),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const e=c.effect, kws=[];
              if(e.atk||e.hp){ t.atk+=e.atk; t.hp+=e.hp; t.maxHp+=e.hp; ev.push({type:'buff', target, name:t.name, value:e.atk, hpValue:e.hp, src}); }
              if(e.revive){ t.revive=true; kws.push('환생'); }
              if(e.taunt){ t.taunt=true; kws.push('도발'); }
              if(kws.length) ev.push({type:'grant', target, name:t.name, kws, src}); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m, e=card.effect, ready=!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush);
              return e.atk*0.45+e.hp*0.35+(e.revive&&!m.revive?2.2:0)+(e.taunt&&!m.taunt?1.2:0)+(ready?1:0)+(m.atk+m.hp)*0.25; },
            ruleUse:(view,acts,h)=>{ let best=null, ba=-1; for(const a of acts){ const m=h.minionOf(a.target); if(m && m.atk+m.hp>ba){ ba=m.atk+m.hp; best=a; } } return best; } },
  raiseDead:{ text:(v,e)=>`비용이 ${e.max} 이하인 아군 하수인을 부활시킵니다`, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : (raiseDeadList(s,seat,3).length ? null : '부활시킬 아군 하수인이 없습니다.'),
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], list=raiseDeadList(s, seat, c.effect.max);
              if(!list.length || P.board.length>=CONFIG.MAX_BOARD){ ev.push({type:'ignored', seat, src}); return; }
              const p=list[Math.floor(nextRand(s)*list.length)], bf=(P.mods&&P.mods.buff)||0, m={...structuredClone(p.base), id:s.nextId++, maxHp:p.base.hp+bf, hp:p.base.hp+bf, attacked:false, summoned:true}; delete m.effect;
              P.board.push(m); ev.push({type:'summon', seat, id:m.id, name:m.name, src});
              const i=P.grave.indexOf(p.g); if(i>=0) P.grave.splice(i,1); },
            spellWorth:(c,view)=>{ if(CONFIG.MAX_BOARD-view.me.board.length<=0) return 0; const v=Math.max(0,...(view.me.grave||[]).map(g=>{ const b=CARD_POOL.find(x=>x.type==='minion'&&x.name===g.name); return b && b.cost<=c.effect.max ? b.atk+b.hp : 0; })); return v>=4 ? Math.min(12, v*0.8) : 0; },
            ruleUse:(view,acts)=>{ const ok=CONFIG.MAX_BOARD-view.me.board.length>0 && (view.me.grave||[]).some(g=>{ const b=CARD_POOL.find(x=>x.type==='minion'&&x.name===g.name); return b && b.cost<=3 && b.atk+b.hp>=4; }); return acts.length && ok ? acts[0] : null; } },
  // ---- v72 ----
  vanishAll:{ text:()=>`모든 하수인을 주인의 손으로 돌려보냅니다`, rank:1,
            blocked:(s)=> s.seats[0].board.length+s.seats[1].board.length===0 ? '하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{                                                           // 회수와 같은 카드 모습(원래 능력치·비용 보정 유지, 전투의 함성 다시 가능). 손패가 가득이면 소멸
              for(const sd of [other(seat), seat]){
                const P=s.seats[sd], all=P.board; P.board=[];
                for(const t of all){
                  const base=CARD_POOL.find(x=>x.name===t.name);
                  const card = base ? {...base} : {type:'minion', name:t.name, cost:t.cost, atk:t.atk, hp:t.maxHp};
                  card.cost=t.cost; card.id=s.nextId++;
                  const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
                  ev.push({type:'bounce', target:minionT(sd,t.id), seat:sd, name:t.name, burned, src, ...(burned?{card}:{})});
                }
              } },
            spellWorth:(c,view,ctx,h)=>{ const f=m=>{ const b=CARD_POOL.find(x=>x.name===m.name); return m.cost + (b ? Math.max(0,(m.atk+m.hp)-(b.atk+b.hp)) : 0) + (m.shield?1:0); };
              return Math.min(20, view.opp.board.reduce((a,m)=>a+f(m),0) - view.me.board.reduce((a,m)=>a+f(m),0)*0.5 - 3); },
            ruleUse:(view,acts)=>{ const sum=b=>b.reduce((a,m)=>a+m.cost,0); return acts.length && view.opp.board.length-view.me.board.length>=2 && sum(view.opp.board)-sum(view.me.board)>=8 ? acts[0] : null; } },
  essence:{ text:(v,e)=>`모든 하수인에게 피해를 ${e.min}-${e.max} 줍니다.(랜덤)`, rank:1,
            blocked:(s)=> s.seats[0].board.length+s.seats[1].board.length===0 ? '하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const e=c.effect;                                          // 하수인마다 따로 4~5 를 굴린다
              for(const sd of [other(seat), seat]) [...s.seats[sd].board].forEach(t=>hurtMinion(s, sd, t, e.min+Math.floor(nextRand(s)*(e.max-e.min+1)), ev, 'battlecry', src)); },
            spellWorth:(c,view,ctx,h)=>{ const e=c.effect, f=m=>m.shield ? 1 : m.hp<=e.min ? h.val(m)+h.W.tempo : m.hp<=e.max ? (h.val(m)+h.W.tempo)*0.5 : e.min*0.4;
              return Math.min(20, view.opp.board.reduce((a,m)=>a+f(m),0) - view.me.board.reduce((a,m)=>a+f(m),0)); },
            ruleUse:(view,acts)=>{ const k=b=>b.filter(m=>!m.shield && m.hp<=4).length; return acts.length && k(view.opp.board)-k(view.me.board)>=2 ? acts[0] : null; } },
  ancestors:{ text:()=>`각 플레이어의 손에 있는 무작위 하수인을 소환합니다`, rank:2.5, summons:true,
            cast:(s,seat,c,target,ev,src)=>{ let n=0;                                                    // 낸 것이 아니라 소환이라 전투의 함성은 없다. 손에 하수인이 없거나 전장이 가득이면 그쪽은 없음
              for(const sd of [seat, other(seat)]){
                const P=s.seats[sd], mins=P.hand.filter(x=>x.type==='minion');
                if(!mins.length || P.board.length>=CONFIG.MAX_BOARD) continue;
                const pick=mins[Math.floor(nextRand(s)*mins.length)], bf=(P.mods&&P.mods.buff)||0;
                P.hand=P.hand.filter(x=>x.id!==pick.id);
                const m={...pick, maxHp:pick.hp+bf, hp:pick.hp+bf, attacked:false, summoned:true}; for(const k of ['lifeCost','auto','inDeck']) delete m[k];
                P.board.push(m); ev.push({type:'summon', seat:sd, id:m.id, name:m.name}); n++;
              }
              if(!n) ev.push({type:'ignored', seat, src}); },
            spellWorth:(c,view)=>{ const slots=CONFIG.MAX_BOARD-view.me.board.length, mins=view.me.hand.filter(x=>x.type==='minion'); if(!mins.length||slots<=0) return 0;
              const mine=mins.reduce((a,x)=>a+x.atk+x.hp,0)/mins.length*0.9, theirs=(view.opp.handCount>=3 && view.opp.board.length<CONFIG.MAX_BOARD) ? 3.5 : 1.5; return Math.min(20, mine-theirs+2); } },
  lineUp:{ text:(v,e)=>`아군 하수인을 선택합니다. 그 하수인을 ${['','하나','둘','셋'][e.count]||e.count} 복사하여 소환합니다`, needsTarget:true, rank:4, summons:true,
            targets:(s,seat)=>minsOf(s,seat),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const P=s.seats[seat];                           // 지금 모습 그대로(강화·키워드 유지) 빈 자리만큼 복사 소환
              for(let i=0;i<(c.effect.count||3) && P.board.length<CONFIG.MAX_BOARD;i++){
                const cp=structuredClone(t); cp.id=s.nextId++; cp.attacked=false; cp.summoned=true; cp.frozen=false; cp.atk-=(t.tempAtk||0); delete cp.tempAtk;
                P.board.push(cp); ev.push({type:'summon', seat, id:cp.id, name:cp.name});
              } }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const room=CONFIG.MAX_BOARD-view.me.board.length; return room>=2 ? Math.min(20, h.val(h.m)*Math.min(3,room)*0.6) : 0; },
            ruleUse:(view,acts,h)=>{ if(CONFIG.MAX_BOARD-view.me.board.length<2) return null; let best=null, ba=5; for(const a of acts){ const m=h.minionOf(a.target); if(m && m.atk+m.hp>ba){ ba=m.atk+m.hp; best=a; } } return best; } },
  // ---- v71 ----
  lightBomb:{ text:()=>`모든 하수인이 자신의 공격력만큼 피해를 받습니다`, rank:1,
            blocked:(s)=> [0,1].some(sd=>s.seats[sd].board.some(m=>m.atk>0)) ? null : '공격력이 있는 하수인이 없습니다.',
            cast:(s,seat,c,target,ev,src)=>{ const hits=[];                                          // 먼저 모두의 공격력을 정해 두고 한꺼번에 피해 (공격력 0 은 피해도 보호막 소모도 없음)
              for(const sd of [other(seat), seat]) for(const m of s.seats[sd].board) if(m.atk>0) hits.push([sd, m, m.atk]);
              for(const [sd,m,a] of hits) hurtMinion(s, sd, m, a, ev, 'battlecry', src); },
            spellWorth:(c,view,ctx,h)=>{ const f=m=>m.atk<=0 ? 0 : m.shield ? 1 : m.hp<=m.atk ? h.val(m)+h.W.tempo : m.atk*0.4;   // 적이 입는 손해 - 내가 입는 손해
              return Math.min(20, view.opp.board.reduce((a,m)=>a+f(m),0) - view.me.board.reduce((a,m)=>a+f(m),0)); },
            ruleUse:(view,acts)=>{ const k=b=>b.filter(m=>m.atk>0 && !m.shield && m.hp<=m.atk).length;
              return acts.length && k(view.opp.board)-k(view.me.board)>=2 ? acts[0] : null; } },
  soulScream:{ text:()=>`모든 하수인(토큰 포함)을 상대편의 덱에 섞어 넣습니다`, rank:1,
            blocked:(s)=> s.seats[0].board.length+s.seats[1].board.length===0 ? '하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const D=s.seats[other(seat)];                          // 양쪽 하수인 전부가 시전자의 상대편 덱으로. 죽는 것이 아니라서 죽음의 메아리·환생·무덤 기록은 없다
              for(const sd of [other(seat), seat]){
                const P=s.seats[sd], all=P.board; P.board=[];
                for(const m of all){
                  const base=CARD_POOL.find(x=>x.type==='minion' && x.name===m.name);                    // 카드풀 하수인은 강화 없는 기본 카드 모습으로
                  ev.push({type:'toDeck', target:minionT(sd,m.id), seat:other(seat), name:m.name, vanish:false, src});
                  let card;
                  if(base) card={...structuredClone(base), id:s.nextId++};
                  else{                                                                                  // v94: 카드풀에 없는 토큰(딱정벌레·언데드 등)도 사라지지 않고 카드가 되어 덱에 섞인다
                    const bf=(P.mods&&P.mods.buff)||0, hp=Math.max(1,(m.maxHp||m.hp)-bf), atk=Math.max(0,m.atk-(m.tempAtk||0));
                    card={type:'minion', name:m.name, cost:Math.max(1,Math.min(10,Math.round((atk+hp)/2))), atk, hp, id:s.nextId++};
                    for(const k of ABILITY_KEYS) if(m[k] && k!=='frozen' && k!=='stealth') card[k]=structuredClone(m[k]);
                    if(m.tribe) card.tribe=m.tribe; }
                  D.deck.splice(Math.floor(nextRand(s)*(D.deck.length+1)), 0, card);
                }
              } },
            spellWorth:(c,view,ctx,h)=>{ const f=m=>h.val(m)+h.W.tempo;
              return Math.min(20, view.opp.board.reduce((a,m)=>a+f(m),0) - view.me.board.reduce((a,m)=>a+f(m),0) - 2); },
            ruleUse:(view,acts)=>{ const sum=b=>b.reduce((a,m)=>a+m.atk+m.hp,0); return acts.length && view.opp.board.length-view.me.board.length>=2 && sum(view.opp.board)-sum(view.me.board)>=8 ? acts[0] : null; } },
  gang:{ text:(v,e)=>`하수인을 선택합니다. 그 하수인을 ${['','하나','둘','셋'][e.count]||e.count} 복사하여 내 덱에 섞어 넣습니다`, needsTarget:true, rank:0,
            targets:(s,seat)=>[...minsOf(s,0), ...minsOf(s,1)],
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const P=s.seats[seat], owner=s.seats[target.seat], n=c.effect.count||3;
              const base=CARD_POOL.find(x=>x.type==='minion' && x.name===t.name), bf=(owner.mods&&owner.mods.buff)||0;
              for(let i=0;i<n;i++){                                                                   // 지금 모습 그대로(강화·키워드 유지) 카드로 복사. 비용은 카드 원래 비용, 전투의 함성도 카드에 있다
                const cp=structuredClone(t); cp.id=s.nextId++; cp.cost=base ? base.cost : t.cost;
                cp.atk=t.atk-(t.tempAtk||0); cp.hp=t.maxHp-bf; if(base && base.effect && !cp.effect) cp.effect=structuredClone(base.effect);
                for(const k of ['maxHp','summoned','attacked','frozen','tempAtk','inDeck','lifeCost','auto']) delete cp[k];
                P.deck.splice(Math.floor(nextRand(s)*(P.deck.length+1)), 0, cp);
              }
              ev.push({type:'deckCopy', seat, target, name:t.name, count:n, src}); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.m) return -1000; return 1+h.val(h.m)*0.4; },
            ruleUse:(view,acts,h)=>{ let best=null, ba=5; for(const a of acts){ const m=h.minionOf(a.target); if(m && m.atk+m.hp>ba){ ba=m.atk+m.hp; best=a; } } return best; } },
  // ---- v68 ----
  ignite:{ text:v=>`피해를 ${v} 줍니다. 피해를 1 더 주는 점화를 내 덱에 섞어 넣습니다`, needsTarget:true, rank:1,
            targets:(s,seat)=>[heroT(other(seat)), ...minsOf(s,other(seat))],
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], v=c.effect.value;
              if(!target){ ev.push({type:'ignored', seat, src}); return; }
              hitTarget(s, target, v, ev, src);
              const base=CARD_POOL.find(x=>x.name===c.name)||c, nc={...base, effect:{...base.effect, value:v+1}, id:s.nextId++}; for(const k of ['lifeCost','inDeck','auto']) delete nc[k];
              P.deck.splice(Math.floor(nextRand(s)*(P.deck.length+1)), 0, nc);
              ev.push({type:'deckAdd', seat, name:nc.name, src}); },
            worth:(view,card,t,ctx,h)=>{ if(h.mineSide) return -1000; const v=card.effect.value;
              if(t.kind==='hero') return v>=view.opp.hp ? 1000 : v*ctx.faceW;
              const m=h.m; return m.shield ? 1 : m.hp<=v ? h.val(m)+h.W.tempo+1 : v*0.4; },
            ruleUse:(view,acts,h)=>{ if(!acts.length) return null; const v=h.cardOf(acts[0]).effect.value; let best=null, bv=-1;
              for(const a of acts){ if(a.target.kind==='hero'){ if(v>=view.opp.hp) return a; continue; }
                const m=a.target.seat!==view.seat && h.minionOf(a.target); if(m && !m.shield && m.hp<=v && m.atk+m.hp>bv){ bv=m.atk+m.hp; best=a; } }
              return best; } },
  iceTornado:{ text:()=>`모든 적 하수인을 빙결 상태로 만듭니다`, rank:1,
            blocked:(s,seat)=> s.seats[other(seat)].board.length===0 ? '적 하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ for(const m of s.seats[other(seat)].board){ m.frozen=true; ev.push({type:'freeze', target:minionT(other(seat),m.id), name:m.name, src}); } },
            spellWorth:(c,view)=>{ const f=view.opp.board.filter(m=>!m.frozen); return f.length>=2 ? Math.min(20, f.length*1.8+f.reduce((a,m)=>a+m.atk*0.3,0)) : 0; },
            ruleUse:(view,acts)=> acts.length && view.opp.board.filter(m=>!m.frozen).length>=2 ? acts[0] : null },
  supernova:{ text:(v,e)=>`내 손을 무작위 화염 주문으로 가득 채웁니다. 그 주문들은 비용이 ${e.cost}입니다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], pool=spellPool({school:'화염'}).filter(x=>!x.generatedOnly && x.name!==c.name);
              if(!pool.length || P.hand.length>=handMax(P)){ ev.push({type:'ignored', seat, src}); return; }
              while(P.hand.length<handMax(P)){ const x=pool[Math.floor(nextRand(s)*pool.length)], copy={...x, id:s.nextId++, cost:c.effect.cost}; for(const k of ['lifeCost','inDeck','auto']) delete copy[k];
                P.hand.push(copy); ev.push({type:'generated', seat, name:x.name, burned:false, src}); } },
            spellWorth:(c,view)=>{ const n=CONFIG.MAX_HAND-(view.me.hand.length-1); return n>=4 ? Math.min(12, n*1.5) : 0; },
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=5 ? acts[0] : null },
  galaxyOrb:{ text:()=>`이번 게임에서 내가 시전한 각 비용의 무작위 주문을 다시 시전합니다. (가능하다면 적을 대상으로 선택)`, rank:2,
            blocked:(s,seat)=> (s.seats[seat].castAll||[]).some(n=>n!=='은하계 투영 구슬' && CARD_POOL.some(x=>x.type==='spell' && x.name===n)) ? null : '이번 게임에서 시전한 주문이 없습니다.',
            cast:(s,seat,c,target,ev,src)=>{ const byCost={};
              for(const b of (s.seats[seat].castCards||[])){ if(b.name==='은하계 투영 구슬') continue; (byCost[b.cost]=byCost[b.cost]||[]).push(b); }   // v69: 시전한 모습 그대로
              const list=Object.keys(byCost).map(Number).sort((a,b)=>a-b).map(k=>structuredClone(byCost[k][Math.floor(nextRand(s)*byCost[k].length)]));   // 비용마다 무작위 1장, 낮은 비용부터
              if(!list.length){ ev.push({type:'ignored', seat, src}); return; }
              autoCastMany(s, seat, list, ev, c.name, true); },
            spellWorth:(c,view)=> (view.me.castN||0)>=4 ? Math.min(20, (view.me.castN||0)*2) : 0,
            ruleUse:(view,acts)=> acts.length && (view.me.castN||0)>=4 ? acts[0] : null },
  // ---- v66 ----
  loopDiscover:{ text:v=>`주문 1장을 발견합니다. 그 주문의 비용이 ${v} 감소합니다. 턴이 끝나면 이 카드를 내 손으로 다시 가져옵니다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ startDiscover(s, seat, {value:c.effect.value}, ev, src, c.auto);
              const base=CARD_POOL.find(x=>x.name===c.name)||c; s.endReturns=s.endReturns||[];
              if(!s.endReturns.some(r=>r.owner===seat && r.card.name===c.name)) s.endReturns.push({owner:seat, card:{...base, cost:c.cost}}); },   // 일식으로 두 번 시전해도 한 장만 돌아온다
            spellWorth:(c,view)=> view.me.hand.length<=8 ? 3.5 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=8 ? acts[0] : null },
  learned:{ text:(v,e)=>`비용이 ${e.max} 이하인 주문을 ${e.count===2?'둘':e.count+'장'} 발견합니다. 그 주문들의 비용을 서로 바꿉니다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ const e=c.effect; startDiscover(s, seat, {max:e.max, value:0, again:e.count-1, swap:true}, ev, src, c.auto); },
            spellWorth:(c,view)=> view.me.hand.length<=7 ? 4.5 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=7 ? acts[0] : null },
  manaDrain:{ text:v=>`캐릭터에게 피해를 ${v} 줍니다. 이 피해로 하수인이 죽으면, 내 손에 있는 모든 주문의 비용이 1 감소합니다`, needsTarget:true, rank:1,
            targets:(s,seat)=>[heroT(other(seat)), heroT(seat), ...minsOf(s,other(seat)), ...minsOf(s,seat)],   // v94: 모든 캐릭터(양쪽 영웅·하수인)
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat];
              if(!target){ ev.push({type:'ignored', seat, src}); return; }
              hitTarget(s, target, c.effect.value, ev, src);
              const m=target.kind==='minion' ? findMinion(s, target.seat, target.id) : null;
              if(m && m.hp<=0){ const sp=P.hand.filter(x=>x.type==='spell'); for(const x of sp) x.cost=Math.max(0, x.cost-1);
                if(sp.length) ev.push({type:'handDiscount', seat, count:sp.length, amount:1, src}); } },
            worth:(view,card,t,ctx,h)=>{ if(h.mineSide) return -1000; const v=card.effect.value, sp=view.me.hand.filter(x=>x.type==='spell').length;
              if(t.kind==='hero') return v>=view.opp.hp ? 1000 : v*ctx.faceW;
              const m=h.m; return m.shield ? 1 : m.hp<=v ? h.val(m)+h.W.tempo+sp*0.4 : v*0.4; },
            ruleUse:(view,acts,h)=>{ if(!acts.length) return null; const v=h.cardOf(acts[0]).effect.value; let best=null, bv=-1;
              for(const a of acts){ const m=a.target.seat!==view.seat && h.minionOf(a.target); if(m && !m.shield && m.hp<=v && m.atk+m.hp>bv){ bv=m.atk+m.hp; best=a; } }
              return best; } },
  frenzyDeck:{ text:v=>`내 덱에 있는 주문들을 비용이 ${v} 높은 주문들로 변신시킵니다. (실제 비용은 변하지 않습니다)`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat]; let n=0;
              P.deck=P.deck.map(x=>{ if(x.type!=='spell') return x;
                const pool=spellPool({min:x.cost+c.effect.value, max:x.cost+c.effect.value}).filter(y=>!y.generatedOnly);
                if(!pool.length) return x;                                                   // 그 비용의 주문이 없으면 그대로
                const y=pool[Math.floor(nextRand(s)*pool.length)], z={...y, id:x.id, cost:x.cost}; delete z.lifeCost; if(x.lifeCost) z.lifeCost=true; if(x.inDeck) z.inDeck=true; n++; return z; });
              ev.push({type:'deckTransform', seat, count:n, src}); },
            spellWorth:(c,view)=> view.me.deckCount>=8 ? 3 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.deckCount>=8 ? acts[0] : null },
  // ---- v65 ----
  spreadPlague:{ text:(v,e)=>`도발 능력이 있는 ${e.atk}/${e.hp} 딱정벌레를 소환합니다. 상대편의 하수인이 더 많으면, 이 주문을 계속 반복합니다`, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const e=c.effect, tok={name:'딱정벌레', atk:e.atk, hp:e.hp, taunt:true, rush:false};
              summonTokens(s, seat, 1, tok, ev);
              for(let g=0; g<20 && s.seats[other(seat)].board.length > s.seats[seat].board.length && freeSlots(s,seat)>0; g++) summonTokens(s, seat, 1, tok, ev); },   // v94: 상대 하수인이 더 많은 동안 계속 반복 시전
            spellWorth:(c,view,ctx,h)=> CONFIG.MAX_BOARD-view.me.board.length>=1 ? Math.min(20, h.val({atk:1,hp:5,taunt:true})*Math.max(1, Math.min(CONFIG.MAX_BOARD-view.me.board.length, view.opp.board.length-view.me.board.length+1))) : 0,
            ruleUse:(view,acts)=> acts.length && CONFIG.MAX_BOARD-view.me.board.length>=1 ? acts[0] : null },
  bulletLoad:{ text:()=>`이번 턴에 내가 주문을 시전할 때마다 무작위 야수를 얻습니다. 그 야수의 비용이 (2) 감소합니다`, rank:-0.5,
            cast:(s,seat)=>{ const P=s.seats[seat]; P.bulletLoad=(P.bulletLoad||0)+1; },
            spellWorth:(c,view)=> view.me.hand.some(x=>x.id!==c.id && x.type==='spell' && x.effect && x.effect.type!=='mana') ? 4 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hand.some(x=>x.id!==acts[0].cardId && x.type==='spell' && x.effect && x.effect.type!=='mana') ? acts[0] : null },
  spellPoison:{ text:()=>`이번 턴에 내 주문이 독성 능력을 가집니다`, rank:-0.4,
            cast:(s,seat)=>{ s.seats[seat].spellPoison=true; },
            spellWorth:(c,view)=> view.opp.board.length && view.me.hand.some(x=>x.id!==c.id && x.type==='spell' && x.effect && ['damage','rain','bolt','cleave','freeze','storm'].includes(x.effect.type)) ? 4 : 0,
            ruleUse:(view,acts)=> null },
  voidSoul:{ text:v=>`비용이 ${v}인 무작위 하수인을 소환합니다. 미래의 내 공허의 영혼을 개선합니다. 내 턴이 끝날 때, 이 카드를 내 손으로 가져옵니다`, rank:2.5, summons:true,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], lvl=c.effect.value, maxC=Math.max(...CARD_POOL.filter(x=>x.type==='minion').map(x=>x.cost));
              let cost=Math.min(lvl, maxC), pool=[]; while(cost>=0 && !(pool=CARD_POOL.filter(x=>x.type==='minion' && x.cost===cost)).length) cost--;   // 그 비용 하수인이 없으면 가장 가까운 낮은 비용
              if(pool.length && P.board.length<CONFIG.MAX_BOARD){ const b=pool[Math.floor(nextRand(s)*pool.length)], bf=(P.mods&&P.mods.buff)||0;
                const m={...structuredClone(b), id:s.nextId++, maxHp:b.hp+bf, hp:b.hp+bf, attacked:false, summoned:true}; delete m.effect; cheatMinion(P, m); P.board.push(m); ev.push({type:'summon', seat, id:m.id, name:m.name, src}); }
              const nl=Math.min(lvl+1, maxC);                                                      // 개선: 손패·덱의 공허의 영혼과 이번 턴 끝에 돌아올 카드가 모두 +1 (최대 하수인 비용까지)
              for(const x of [...P.hand, ...P.deck]) if(x.name===c.name && x.effect.value<nl) x.effect={...x.effect, value:nl};
              const base=CARD_POOL.find(x=>x.name===c.name)||c; s.endReturns=s.endReturns||[];
              const ex=s.endReturns.find(r=>r.owner===seat && r.card.name===c.name);
              if(ex) ex.card.effect={...ex.card.effect, value:Math.max(ex.card.effect.value, nl)}; else s.endReturns.push({owner:seat, card:{...base, cost:c.cost, effect:{...base.effect, value:nl}}}); },
            spellWorth:(c,view)=> view.me.board.length<CONFIG.MAX_BOARD ? 1.5+c.effect.value*1.2 : 0.5,
            ruleUse:(view,acts)=> acts.length && view.me.board.length<CONFIG.MAX_BOARD ? acts[0] : null },
  replayOne:{ text:()=>`이번 게임에서 내가 낸 비용이 1인 카드를 다시 냅니다`, rank:2.5,
            blocked:(s,seat)=> (s.seats[seat].playedOnes||[]).length===0 ? '이번 게임에서 낸 비용 1인 카드가 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>replayOne(s, seat, ev, src),
            spellWorth:(c,view)=> (view.me.ones||0)>0 ? 3.5 : 0,
            ruleUse:(view,acts)=> acts.length && (view.me.ones||0)>0 ? acts[0] : null },
  rewind:{ text:v=>`이번 게임에서 내가 시전한 다른 주문을 발견해서 복사해옵니다. 그 주문의 비용이 ${v} 감소합니다`, rank:0,
            blocked:(s,seat)=> (s.seats[seat].castAll||[]).some(n=>n!=='되감기') ? null : '이번 게임에서 시전한 다른 주문이 없습니다.',
            cast:(s,seat,c,target,ev,src)=>startRewindDiscover(s, seat, {value:c.effect.value}, ev, src, c.auto),
            spellWorth:(c,view)=> view.me.hand.length<=8 && (view.me.castN||0)>=1 ? 3.5 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=8 && (view.me.castN||0)>=1 ? acts[0] : null },
  // ---- v64 ----
  survival:{ text:(v,e)=>`내 손, 덱, 전장에 있는 모든 하수인에게 +${e.atk}/+${e.hp}를 부여합니다`, rank:4,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], e=c.effect;
              for(const x of [...P.hand, ...P.deck]) if(x.type==='minion'){ x.atk+=e.atk; x.hp+=e.hp; }       // 손·덱의 카드는 기본 공격력·체력이 오른다
              for(const m of P.board){ m.atk+=e.atk; m.hp+=e.hp; m.maxHp+=e.hp; ev.push({type:'buff', target:minionT(seat,m.id), name:m.name, value:e.atk, hpValue:e.hp, src}); } },
            spellWorth:(c,view)=>{ const n=view.me.board.length+view.me.hand.filter(x=>x.type==='minion').length; return Math.min(20, n*3.5); },
            ruleUse:(view,acts)=> acts.length && view.me.board.length+view.me.hand.filter(x=>x.type==='minion').length>=3 ? acts[0] : null },
  wildGift:{ text:(v,e)=>`내 하수인들에게 +${e.atk}/+${e.hp}와 도발을 부여합니다`, rank:4,
            blocked:(s,seat)=> s.seats[seat].board.length===0 ? '내 하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ const e=c.effect; for(const m of s.seats[seat].board){ m.atk+=e.atk; m.hp+=e.hp; m.maxHp+=e.hp; m.taunt=true; ev.push({type:'buff', target:minionT(seat,m.id), name:m.name, value:e.atk, hpValue:e.hp, src}); } },
            spellWorth:(c,view)=> view.me.board.length>=2 ? Math.min(20, view.me.board.length*3.5) : 0,
            ruleUse:(view,acts)=> acts.length && view.me.board.length>=2 ? acts[0] : null },
  ultPlague:{ text:(v,e)=>`적에게 피해를 ${e.value} 주고, 카드를 ${e.draw}장 뽑고, 방어도를 ${e.armor} 얻고, ${e.atk}/${e.hp} 구울을 소환합니다`, needsTarget:true, rank:2,
            targets:(s,seat)=>[heroT(other(seat)), ...minsOf(s,other(seat))],
            cast:(s,seat,c,target,ev,src)=>{ const e=c.effect, P=s.seats[seat];
              if(target) hitTarget(s, target, e.value, ev, src);                                                      // 1) 피해 (적 영웅 또는 적 하수인)
              drawCards(s, seat, e.draw, ev, src);                                                                    // 2) 카드 5장
              P.armor=(P.armor||0)+e.armor; ev.push({type:'armor', seat, amount:e.armor, src});                      // 3) 방어도
              summonTokens(s, seat, 1, {name:'구울', atk:e.atk, hp:e.hp, rush:false}, ev); },                         // 4) 5/5 구울 (속공 없음, 자리가 없으면 소환 안 됨)
            worth:(view,card,t,ctx,h)=>{ if(h.mineSide) return -1000; const v=card.effect.value;
              if(t.kind==='hero') return v>=view.opp.hp ? 1000 : 4;
              const m=h.m; return m.shield ? 3 : m.hp<=v ? 4+h.val(m)+h.W.tempo : 4; },
            ruleUse:(view,acts,h)=>{ if(!acts.length) return null; const v=h.cardOf(acts[0]).effect.value; let best=null, bv=-1;
              for(const a of acts){ if(a.target.kind==='hero'){ if(v>=view.opp.hp) return a; continue; }
                const m=a.target.seat!==view.seat && h.minionOf(a.target); if(m && !m.shield && m.hp<=v && m.atk+m.hp>bv){ bv=m.atk+m.hp; best=a; } }
              return best || acts.find(a=>a.target.kind==='hero') || acts[0]; } },
  // ---- v63 ----
  destroyAll:{ text:()=>`모든 하수인을 파괴합니다`, rank:1,
            blocked:(s)=> s.seats[0].board.length+s.seats[1].board.length===0 ? '하수인이 없습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>{ for(const sd of [other(seat), seat]) for(const m of s.seats[sd].board) m.hp=0; },   // 보호막과 상관없이 파괴 (환생은 발동)
            spellWorth:(c,view,ctx,h)=>{ const f=m=>h.val(m)+h.W.tempo; return Math.min(20, view.opp.board.reduce((a,m)=>a+f(m),0) - view.me.board.reduce((a,m)=>a+f(m),0)); },
            ruleUse:(view,acts)=>{ const sum=b=>b.reduce((a,m)=>a+m.atk+m.hp,0); return acts.length && view.opp.board.length-view.me.board.length>=2 && sum(view.opp.board)-sum(view.me.board)>=8 ? acts[0] : null; } },
  tauntDiscover:{ text:(v,e)=>`도발 하수인 1장을 발견합니다. 그 하수인에게 +${e.atk}/+${e.hp}를 부여합니다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>startTauntDiscover(s, seat, c.effect, ev, src, c.auto),
            spellWorth:(c,view)=> view.me.hand.length<=8 ? 3.5 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=8 ? acts[0] : null },
  resurrect:{ text:(v,e)=>`비용이 가장 높은 내 서로 다른 도발 하수인 ${e.count}기를 부활시킵니다`, rank:2.5, summons:true,
            blocked:(s,seat)=> freeSlots(s,seat)<=0 ? '전장이 가득 찼습니다.' : (resurrectPick(s,seat,1).length ? null : '부활시킬 도발 하수인이 없습니다.'),
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], bf=(P.mods&&P.mods.buff)||0, picks=resurrectPick(s, seat, Math.min(c.effect.count, freeSlots(s,seat)));
              if(!picks.length){ ev.push({type:'ignored', seat, src}); return; }
              for(const p of picks){ const m={...structuredClone(p.base), id:s.nextId++, maxHp:p.base.hp+bf, hp:p.base.hp+bf, attacked:false, summoned:true, taunt:true}; delete m.effect;
                P.board.push(m); ev.push({type:'summon', seat, id:m.id, name:m.name, src});
                const i=P.grave.indexOf(p.g); if(i>=0) P.grave.splice(i,1); } },
            spellWorth:(c,view,ctx,h)=>{ const n=Math.min(new Set((view.me.grave||[]).filter(g=>g.taunt).map(g=>g.name)).size, 3, CONFIG.MAX_BOARD-view.me.board.length); return n>=2 ? Math.min(20, n*4) : 0; },
            ruleUse:(view,acts)=>{ const n=Math.min(new Set((view.me.grave||[]).filter(g=>g.taunt).map(g=>g.name)).size, 3, CONFIG.MAX_BOARD-view.me.board.length); return acts.length && n>=2 ? acts[0] : null; } },
  // ---- v62 ----
  splitCopy:{ text:(v,e)=>`아군 하수인에게 +${e.atk}/+${e.hp}과 모면을 부여합니다. 그 뒤, 그 하수인을 복사하여 소환합니다`, needsTarget:true, rank:4,
            targets:(s,seat)=>minsOf(s,seat),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const e=c.effect, P=s.seats[seat];
              t.atk+=e.atk; t.hp+=e.hp; t.maxHp+=e.hp; t.elusive=true;
              ev.push({type:'buff', target, name:t.name, value:e.atk, hpValue:e.hp, src});
              if(P.board.length>=CONFIG.MAX_BOARD) return;                              // 빈 자리가 없으면 복사 소환은 없음
              const cp=structuredClone(t); cp.id=s.nextId++; cp.attacked=false; cp.summoned=true; cp.frozen=false; cp.atk-=(t.tempAtk||0); delete cp.tempAtk;
              P.board.push(cp); ev.push({type:'summon', seat, id:cp.id, name:cp.name}); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m, e=card.effect, ready=!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush), room=CONFIG.MAX_BOARD-view.me.board.length>0;
              return 2+(ready?1.5:0)+(room ? h.val({atk:m.atk+e.atk, hp:m.hp+e.hp, elusive:true})*0.7 : 0)+m.atk*0.3; },
            ruleUse:(view,acts,h)=>{ let best=null, ba=-1; for(const a of acts){ const m=h.minionOf(a.target); if(m && m.atk+m.hp>ba){ ba=m.atk+m.hp; best=a; } } return best; } },
  holdLine:{ text:(v,e)=>`하수인에게 +${e.atk}/+${e.hp}과 생명력 흡수를 부여합니다`, needsTarget:true, rank:4,
            targets:(s,seat)=>minsOf(s,seat),
            cast:onMinion((t,s,seat,c,target,ev,src)=>{ const e=c.effect; t.atk+=e.atk; t.hp+=e.hp; t.maxHp+=e.hp; t.lifesteal=true;
              ev.push({type:'buff', target, name:t.name, value:e.atk, hpValue:e.hp, src}); }),
            worth:(view,card,t,ctx,h)=>{ if(!h.mineSide||!h.m) return -1000; const m=h.m, ready=!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush);
              return 3.5+(ready?1.5:0)+m.atk*0.3+(m.lifesteal?0:1)+(view.me.hp<=15?1.5:0); },
            ruleUse:(view,acts,h)=>{ let best=null, ba=-1; for(const a of acts){ const m=h.minionOf(a.target); if(m && m.atk+m.hp>ba){ ba=m.atk+m.hp; best=a; } } return best; } },
  amaraTale:{ text:v=>`내 영웅의 생명력을 ${v}으로 만듭니다`, rank:0,
            cast:(s,seat,c,target,ev,src)=>{ const P=s.seats[seat], before=P.hp; P.maxHp=Math.max(P.maxHp ?? CONFIG.HERO_HP, c.effect.value); P.hp=c.effect.value;
              if(P.hp>before) ev.push({type:'heal', target:heroT(seat), name:null, amount:P.hp-before, src}); },
            spellWorth:(c,view)=> view.me.hp<=26 ? 6 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hp<=26 ? acts[0] : null },
  handDiscover:{ text:v=>`상대편의 손에서 카드 1장을 복사하여 발견합니다. 비용이 ${v} 감소합니다`, rank:0,
            blocked:(s,seat)=> s.seats[1-seat].hand.length===0 ? '상대의 손패가 비어 있습니다.' : null,
            cast:(s,seat,c,target,ev,src)=>startHandDiscover(s, seat, {value:c.effect.value}, ev, src, c.auto),
            spellWorth:(c,view)=> view.me.hand.length<=8 && view.opp.handCount>=2 ? 3.5 : 0,
            ruleUse:(view,acts)=> acts.length && view.me.hand.length<=8 && view.opp.handCount>=2 ? acts[0] : null },
};
// 동전: 덱(CARD_POOL)에는 들어가지 않고, 후공이 시작할 때 손패로 받는다. (그 밖의 주문은 CARD_POOL 에 있어 덱에 넣을 수 있다)
function makeCoin(){ return {type:'spell', name:'동전', cost:0, effect:{type:'mana', value:CONFIG.COIN_MANA}}; }
// ---- v40 카드 문구: 길게 풀어 쓰지 않고 짧게. 상세 규칙은 설명 txt 에 있다. (이 표가 위 정의의 text 를 덮어쓴다) ----
const SPELL_TEXT = {
  muster:   (v,e)=>`비용 합이 ${e.total}이 되도록 하수인을 무작위로 소환하고 모두 도발을 부여한다`,
  chaos:    v=>`무작위 주문을 ${v}회 시전한다`,
  fruit:    ()=>`마나를 모두 소모한다. 소모한 마나만큼 이번 턴 하수인 1기의 공격력 증가, 또는 2배만큼 방어도 획득`,
  fruitAtk: v=>`하수인 1기의 공격력 +${v}. 이번 턴만`,
  fruitArmor:v=>`방어도 ${v} 획득`,
  glide:    ()=>`속공 1/1 「활강병」으로 전장을 채운다. 이번 턴에 모두 죽으면 한 번 다시 소환`,
  discover: (v,e)=>`${e.min?`비용 ${e.min} 이상 `:''}${e.max!==undefined?`비용 ${e.max} 이하 `:''}주문 1장을 발견한다${v?`. 비용이 ${v}만큼 감소한다`:''}`,
  damageDiscover:(v,e)=>`대상에게 ${v} 피해. 비용 ${e.max} 이하 주문 1장을 발견한다`,
  eclipse:  ()=>`이번 턴에 시전하는 다음 주문을 2번 시전한다`,
  growth:   v=>`각 플레이어가 마나 수정 ${v}개를 얻는다. 나는 마나 ${v}도 얻는다`,
  scale:    v=>`하수인에게 +${v}/+${v}을 부여하고 그 공격력만큼 방어도를 얻는다`,
  summon:   (v,e)=>{ if(e.text) return e.text; const kws=[e.rush===false?null:'속공', ...(e.kw||[])].filter(Boolean); return `${kws.length?kws.join(', ')+' ':''}${e.atk}/${e.hp} 「${e.token}」 ${e.count}마리를 소환한다`; },
  guardian: (v,e)=>`방어도를 ${e.armor} 얻고 비용 ${e.cost} 하수인을 무작위로 소환해 도발을 부여한다`,
  carapace: v=>`방어도를 ${v} 얻는다. 내 다음 턴 시작에 ${v} 더 얻는다`,
  forestSoul:()=>`내 하수인 전체에 "죽음의 메아리: 2/2 나무정령 소환"을 부여한다`,
  furyCry:  v=>`카드 ${v}장을 뽑고 손패 1장당 방어도 +1`,
  compost:  v=>`내 하수인 전체에 "죽음의 메아리: 카드 ${v}장 뽑기"를 부여한다`,
  cleave:   (v,e)=>`적에게 ${v} 피해, 다른 모든 적에게 ${e.other} 피해`,
  execute:  v=>`공격력 ${v} 이상인 적 하수인 처치. 보호막 무시`,
  freeze:   ()=>`적 하수인 하나를 얼린다. 다음 턴 공격 불가`,
  bloom:    v=>`이번 턴 마나 ${v} 획득`,
  ascend:   v=>`최대 마나 총 ${v} 증가. 지금 빈 마나 수정 1개, 나머지 ${v-1}는 다음 턴 시작`,
  shrink:   v=>`내 덱 하수인의 비용과 공격력이 ${v}만큼 감소`,
  roar:     v=>`이번 턴 내 하수인의 공격력 +${v}`,
  crystal:  v=>`빈 마나 수정 ${v}개 획득`,
  snack:    v=>`다음 턴에만 마나 수정 ${v}개 획득`,
  bolt:     v=>`적 하수인 중 공격력 높은 둘에게 ${v} 피해`,
  haste:    ()=>`방금 소환한 하수인이 바로 공격 가능`,
};
for(const k in SPELL_TEXT) SPELL_FX[k].text = SPELL_TEXT[k];
function effectText0(c){ const runeText=''; if(!c.effect){ if(c.eggChicken) return '죽음의 메아리: 3/3 언데드 닭을 소환합니다. 내 턴이 끝날 때마다 닭이 +1/+1'+(c.eggBonus?` (현재 +${c.eggBonus})`:''); if(c.deathProto) return '죽음의 메아리: 하수인을 뽑습니다. 내 손에 있는 모든 하수인에게 +1/+1을 부여합니다'; if(c.endSword) return '내 턴이 끝날 때, 다른 무작위 아군 하수인 둘에게 공격력을 +1 부여합니다'; if(c.endDeckSummon) return '내 턴이 끝날 때, 내 덱에서 하수인을 소환합니다'; if(c.trogg) return '상대편이 주문을 시전한 후에, 다른 깊은무쇠 트로그를 소환합니다'; if(c.crowley) return `이 하수인은 공격하여 다른 하수인을 처치한 후에 +${c.crowley}/+${c.crowley}를 얻습니다`; if(c.endArmorSummon) return '내 턴이 끝날 때, 내 방어도와 같은 비용의 무작위 하수인을 소환합니다. (최대 10)'; if(c.tortola) return '이 하수인이 피해를 받은 후 방어도를 1 얻고, 이 하수인에게 공격력을 +1 부여합니다'; if(c.endBully) return '내 턴이 끝날 때, 무작위 적을 공격하는 3/3 불량배를 둘 소환합니다'; if(c.gally) return '상대편이 주문을 시전할 때마다 동일한 주문을 내 손으로 가져오고 상대편에게 동전을 줍니다'; if(c.sonya) return '내가 비용이 (1)인 하수인이나 주문을 낸 후에, 그 카드를 비용이 (0)인 카드로 복사하여 얻습니다'; if(c.endSpellGain) return `내 턴이 끝날 때, 무작위 ${c.endSpellGain.school} 주문을 얻습니다.${c.endSpellGain.discount?` 그 주문의 비용이 (${c.endSpellGain.discount}) 감소합니다.`:''}`; if(c.endHandBuff) return `내 턴이 끝날 때, 내 손에 있는 무작위 하수인에게 +${c.endHandBuff}/+${c.endHandBuff}을 부여합니다`; if(c.endSelfHp) return `내 턴이 끝날 때, 생명력을 +${c.endSelfHp} 얻습니다`; if(c.overload) return `과부하: (${c.overload})`; if(c.endTotemBuff) return `내 턴이 끝날 때, 내 손, 덱, 전장에 있는 다른 모든 토템에게 +${c.endTotemBuff}/+${c.endTotemBuff}을 부여합니다`; if(c.adjAtkAura) return `양옆의 하수인들이 공격력을 +${c.adjAtkAura} 얻습니다`; if(c.endAdjBuff) return `내 턴이 끝날 때, 양옆의 하수인들에게 +${c.endAdjBuff}/+${c.endAdjBuff}을 부여합니다`; if(c.onSpellBeast) return `내가 주문을 시전한 후에, 비용이 (${c.onSpellBeast}) 이하인 야수를 소환합니다`; if(c.deathBeast) return '죽음의 메아리: 무작위 야수를 얻습니다'; if(c.pteroEgg) return `죽음의 메아리: 2/1 새끼 비명익룡을 ${['','하나','둘','셋','넷'][c.deathPtero]||c.deathPtero+'기'} 소환합니다. 내 턴이 끝날 때마다 알이 깨지는 시간이 줄어들고(${c.hatchLeft ?? c.pteroEgg}턴 남음), 깨지면 내 전장을 4/4 다 자란 비명익룡으로 가득 채웁니다`; if(c.copyLow) return `내가 비용이 (${c.copyLow}) 이하인 하수인을 낸 후에, 그 하수인을 복사하여 소환합니다`; if(c.lordGrow) return `내 하수인이 소환된 후에, 이 하수인이 생명력을 +${c.lordGrow} 얻습니다`; if(c.deathAoe) return `죽음의 메아리: 모든 캐릭터에게 피해를 ${c.deathAoe} 줍니다`; if(c.deathKill) return '죽음의 메아리: 무작위 적 하수인을 처치합니다'; if(c.endDeckCopy) return '내 턴이 끝날 때, 내 덱에서 하수인을 복사하여 5/5 하수인으로 소환합니다'; if(c.deathMachines) return `죽음의 메아리: 도발과 보호막 능력이 있는 1/2 기계를 ${['','하나','둘','셋'][c.deathMachines]||c.deathMachines} 소환합니다`; if(c.spellWeave) return '내가 하수인에게 주문을 시전한 후에, 하수인을 대상으로 지정할 수 있는 주문을 내 손으로 가져옵니다'; if(c.shieldAura) return `내 보호막들이 ${['','한','두','세'][c.shieldAura]||c.shieldAura} 번 피해를 받아야 부서집니다`; if(c.beastDouble) return '아군 야수들이 주는 피해가 2배 증가합니다'; if(c.reviveFull) return '이 하수인은 최대 체력으로 환생합니다'; if(c.ignoreTaunt) return '내 캐릭터들의 공격이 도발을 무시합니다'; if(c.needArmor) return `내 방어도가 ${c.needArmor} 이상일 때에만 공격할 수 있습니다`; if(c.endLotus) return '턴 종료 시 피어오르는 연꽃을 소환합니다'; if(c.endViper) return '내 턴이 끝날 때, 속공·은신·독성 능력이 있는 1/1 치명적인 독사를 1마리 소환합니다'; if(c.startHeal) return `내 턴이 시작될 때, 피해를 입은 아군 1명을 무작위로 ${c.startHeal} 회복합니다`; if(c.endRaise) return '내 턴이 끝날 때, 시체를 1개 소모해 도발 능력이 있는 1/3 되살아난 보병을 소환합니다'; if(c.endCopy) return `내 턴이 끝날 때, 시체를 ${c.endCopy.corpses}개 소모해 이 하수인을 복사하여 소환합니다`; if(c.endScatter==='atk') return '내 턴이 끝날 때, 적들에게 이 하수인의 공격력만큼의 피해를 무작위로 나누어 입힙니다'; if(c.deathBuffAll) return `죽음의 메아리: 내 손과 덱에 있는 모든 하수인에게 +${c.deathBuffAll}/+${c.deathBuffAll}을 부여합니다`; if(c.deathGrave) return '죽음의 메아리: 이번 게임에서 죽은 내 도발 하수인들을 소환합니다'; if(c.costOne) return '내 하수인들의 비용이 (1)이 됩니다'; if(c.spellburst) return `이번 턴에 내 영웅에게 공격력을 +${c.spellburst.heroAtk} 부여하고 방어도를 ${c.spellburst.armor} 얻습니다`; if(c.endScatter) return `내 턴이 끝날 때, 모든 적에게 ${c.endScatter}의 피해를 무작위로 나누어 입힙니다`; if(c.endBait) return '내 턴이 끝날 때, 모든 적 하수인이 이 하수인을 공격하게 만듭니다'; if(c.spellAura) return `상대편이 시전하는 주문의 비용이 (${c.spellAura}) 증가합니다`; if(c.endSteal) return '내 턴이 끝날 때, 모든 적 하수인으로부터 공격력과 생명력을 1씩 가져옵니다'; if(c.endCorpses) return `내 턴이 끝날 때, 시체를 ${c.endCorpses}개 얻습니다. 내 턴이 시작될 때, 시체를 ${c.startSpend.corpses}개 소모해 내 영웅에게 생명력을 +${c.startSpend.life} 부여합니다`; if(c.endAttack) return '내 턴이 끝날 때, 생명력이 가장 낮은 적을 공격합니다'; if(c.endDrain) return '내 턴이 끝날 때 생명력이 가장 낮은 적에게서 생명력을 1 가져옵니다'; if(c.deathCopy) return '죽음의 메아리: 손패에서 비용이 가장 높은 주문 1장을 복사합니다'; if(c.deathGain) return '죽음의 메아리: 무작위 암흑 주문 1장과 무작위 신성 주문 1장을 손패로 가져옵니다'; if(c.onAttackCopy) return '이 하수인이 공격할 때마다, 이 하수인의 복사본을 내 손으로 가져옵니다(강화효과 유지)'; if(c.endRecast) return '내 턴이 끝날 때, 이번 턴에 내가 시전한 주문 중 하나를 시전합니다. (대상은 무작위로 선택)'; if(c.onSpellScatter) return `내가 주문을 시전한 후에, 모든 적에게 ${c.onSpellScatter}의 피해를 무작위로 나누어 입힙니다`; if(c.onAttackBeast) return '이 하수인은 공격할 때마다 야수를 뽑고 그 능력치를 얻습니다'; if(c.onSpellDraw) return '내가 주문을 시전할 때마다 카드를 뽑습니다'; if(c.dynCost==='cast') return '이번 게임에서 내가 시전한 주문 1개당 이 카드의 비용이 1 감소합니다'; if(c.onSpellFireball) return '내가 주문을 시전할 때마다 「화염구」 주문을 내 손으로 가져옵니다'; if(c.endCastMin) return `내 턴이 끝날 때 비용이 (${c.endCastMin}) 이상인 무작위 주문을 시전합니다. (대상은 무작위로 선택)`; if(c.spellDmgSchools) return '주문 공격력 +1 (이번 게임에서 내가 시전한 주문의 속성 종류만큼 강화됩니다)'; if(c.endCast) return `내 턴이 끝날 때, 비용이 ${c.endCast} 이하인 무작위 주문을 시전합니다`; } return c.effect ? runeText + (c.fireImmune ? '화염 주문에 면역입니다. ' : '') + (c.echo && c.type==='spell' ? '잔상. ' : '') + (c.twin ? '이중 주문. ' : '') + (c.lifeCost ? `생명력 ${c.cost} 지불. ` : '') + (c.overload ? `과부하: (${c.overload}). ` : '') + (c.type==='spell' ? SPELL_FX[c.effect.type].text : EFFECT_TEXT[c.effect.type])(c.effect.value, c.effect) + (c.infuse && c.id!==undefined ? (c.infused ? ' [주입됨]' : ` [${c.infuseN||0}/${c.infuse}]`) : '') : ''; }
function effectText(c){ let t=effectText0(c); if(c.effect && c.crowley) t+=`. 이 하수인이 적 하수인을 처치하면 +${c.crowley}/+${c.crowley}를 얻습니다`; if(c.effect && c.fishHeal) t+='. 이 하수인이 공격한 뒤 하수인을 처치하면 생명력을 모두 회복합니다'; return t; }   // 효과가 있는 카드에도 크롤리 계열 문구를 덧붙임
const needsTarget = c => c.type==='spell' && !!(SPELL_FX[c.effect.type] && SPELL_FX[c.effect.type].needsTarget);   // 대상이 하나도 없으면 낼 수 없는 주문
const NO_TARGET_FX=['natureCast','crystalBuff','peaceDraw','armorCry','draw','sweep','scatter','gainMana','recastLog','yogg','seedDeck','recycle','manastorm','spellTax','revealSummon','leechSummon','bloodDiscover','bloodDrain','yodel','malakor','valtora','repeatLast','parrot','spellHunt','drawSpellArmor','frostWarden','doubleHand','alana','tarim','edric','mindCopy','benedictus','faceCollector','comboDraw','tauntDiscoverBc','copyDragons','repeatAll','avalancheFreeze','discoverCost','snitch','deathwing','pyroar','selfHurt','deckBuff','adjBuffCry','machinesCry','spiritsCry','hatchCry','wormCry','shieldCry','decalCry','bubbleCry','stoneCry','stormCry'];   // 대상을 고르지 않는 전투의 함성

// ---- 덱 목록: 카드 이름의 배열 (같은 카드는 이름이 여러 번 나온다). 서버에서도 같은 검증을 쓴다 ----
function validateDeckList(names){
  if(!Array.isArray(names)) return '덱 형식이 올바르지 않습니다.';
  if(names.length!==CONFIG.DECK_SIZE) return `덱은 정확히 ${CONFIG.DECK_SIZE}장이어야 합니다.`;
  const cnt={};
  for(const n of names){
    if(!CARD_POOL.some(c=>c.name===n)) return '존재하지 않는 카드가 있습니다.';
    cnt[n]=(cnt[n]||0)+1;
    if(cnt[n]>CONFIG.COPIES) return `같은 카드는 최대 ${CONFIG.COPIES}장까지 넣을 수 있습니다.`;
  }
  return null;
}
// 추천 덱: 하수인 11종 × 2장 + 주문 8장 = 30장 (마나 곡선 1코 5 · 2코 9 · 3코 4 · 4코 4 · 5코 4 · 6코 2 · 7코 2)
const DEFAULT_DECK_PAIRS=["돌담 견습병","견습 검사","빛나는 파수병","숲 늑대","화염 정령",
  "불사조","대지 정령","늙은 사자","벼락 마법사","서리 거인","고대 용"];
const DEFAULT_DECK_SPELLS=["불꽃 화살","불꽃 화살","치유의 빛","치유의 빛","지식의 서","지식의 서","침묵","수호의 장벽"];
const defaultDeckList = () => [...DEFAULT_DECK_PAIRS.flatMap(n=>[n,n]), ...DEFAULT_DECK_SPELLS];   // DECK_SIZE 를 바꾸면 같이 맞출 것

// ---- AI 랜덤 덱 빌더 (v17) ----
// 카드 이름이 아니라 cost/type 속성만 본다 → CARD_POOL 에 카드를 추가해도 이 코드는 고칠 필요가 없다.
// 마나 곡선 틀(합 DECK_SIZE)을 게임마다 조금 흔든 뒤, 코스트별로 카드를 무작위 추첨한다.
const AI_CURVE = {1:5, 2:7, 3:6, 4:5, 5:3, 6:2, 7:2};      // 합 30, 평균 코스트 약 3.3 (DECK_SIZE 를 바꾸면 같이 맞출 것)
const AI_DECK_RULE = {minMinions:16, minCheap:18, cheapCost:4, tries:10};
function buildRandomDeck(rng=Math.random){
  const costs=[...new Set(CARD_POOL.map(c=>c.cost))].sort((a,b)=>a-b);
  let best=null;
  for(let t=0;t<AI_DECK_RULE.tries;t++){
    const curve={...AI_CURVE};
    for(let i=0;i<3;i++){                                    // 곡선 흔들기: 한 칸에서 빼서 다른 칸에 더함 (합 유지)
      const a=costs[Math.floor(rng()*costs.length)], b=costs[Math.floor(rng()*costs.length)];
      if((curve[a]||0)>1){ curve[a]--; curve[b]=(curve[b]||0)+1; }
    }
    const deck=[], used={};
    const take=c=>{ deck.push(c.name); used[c.name]=(used[c.name]||0)+1; };
    const free=c=>(used[c.name]||0)<CONFIG.COPIES;
    for(const cost of costs){
      for(let need=curve[cost]||0; need>0; need--){
        const pool=CARD_POOL.filter(c=>c.cost===cost && free(c));
        if(!pool.length) break;                              // 이 코스트 카드가 모자라면 아래에서 보충
        take(pool[Math.floor(rng()*pool.length)]);
      }
    }
    while(deck.length<CONFIG.DECK_SIZE){                     // 부족분 보충: 남은 카드 중 무작위
      const pool=CARD_POOL.filter(free);
      if(!pool.length) break;
      take(pool[Math.floor(rng()*pool.length)]);
    }
    best=deck;
    const cards=deck.map(n=>CARD_POOL.find(c=>c.name===n));
    const minions=cards.filter(c=>c.type==='minion').length;
    const cheap=cards.filter(c=>c.cost<=AI_DECK_RULE.cheapCost).length;
    if(deck.length===CONFIG.DECK_SIZE && minions>=AI_DECK_RULE.minMinions && cheap>=AI_DECK_RULE.minCheap) break;   // 합격
  }
  return best;
}

const other = seat => 1 - seat;
const tkey = t => t ? `${t.kind}:${t.seat}:${t.id ?? ''}` : 'none';
const heroT = seat => ({kind:'hero', seat});
const minionT = (seat, id) => ({kind:'minion', seat, id});
const findMinion = (s, seat, id) => s.seats[seat].board.find(m=>m.id===id);

function shuffle(a, rng){
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// ---- 게임 생성 ----
// opts.mods = [좌석0 치트, 좌석1 치트]. 치트는 좌석에 붙는 데이터일 뿐이고, 비어 있으면 기본 규칙과 완전히 같다.
//   hp(영웅 체력+N) startMana(첫 턴 마나 N) startHand(시작 손패+N, 최대 START_HAND_MAX) startBoard(시작 하수인 N기)
//   costDown(덱 하수인 비용-N) manaBonus(매 턴 추가 마나+N) buff(소환 시 체력 +N) armor(영웅 받는 피해-N)
//   extraDraw(N: 이 좌석의 첫 N턴 동안 매 턴 2장 / true: 영구) doubleBattlecry(true: 전투의 함성 두 번)
//   v99: startArmor(시작 방어도 N) handUp(손패 상한 +N) bloodHeal/frostArmor/unholyCorpse(혈기·냉기·부정 룬 카드를 낼 때 체력/방어도/시체 +N) spellCopy(매 턴 첫 주문 복사본)
//   v98: chargeAll(돌진) shieldAll(보호막) atkUp(공격력+N) legion(하수인 낼 때 1/1 병사 N기) reinforce(죽은 하수인 복사본 손패로, 턴당 1회) phoenix(N: 쓰러질 때 1회 체력 N 부활)
//        thorns(영웅 공격한 하수인에 N 피해) regen(턴 시작 체력+N) burn(턴 시작 상대 영웅 N 피해) spellDown(주문 비용-N) refund(하수인 낼 때 확률 마나+1) noFatigue firstMinion(첫 하수인 비용-N)
function newGame(rng=Math.random, opts={}){
  // 선공: opts.first(0|1)로 지정하지 않으면 무작위. 후공 좌석은 보정(시작 손패 +, 동전)을 받는다.
  const first = (opts.first===0 || opts.first===1) ? opts.first : (rng()<0.5 ? 0 : 1);
  const s = {turn:first, first, turnNo:0, over:false, winner:null, nextId:1, seats:[], seed:Math.floor(rng()*2147483646)+1, pending:null, recast:null};   // pending: 선택 대기 — 발견 {kind:'discover', seat, discount, options} / v28 대상 {kind:'target', seat, card, targets}. recast: 일식의 두 번째 시전 예약 {seat, card}
  for(let seat=0; seat<2; seat++){
    const mods={...((opts.mods && opts.mods[seat]) || {})};
    const deck=[];
    // opts.decks[seat] = 카드 이름 배열. 없거나 규칙에 어긋나면 기본 덱(모든 카드 COPIES장씩)을 쓴다.
    const wanted=(opts.decks && opts.decks[seat]) || null;
    const freeOk=!!(opts.freeDeck && opts.freeDeck[seat]) && Array.isArray(wanted) && wanted.length>0 && wanted.every(n=>CARD_POOL.some(c=>c.name===n));   // v54: 테스트 덱은 크기·같은 카드 장수 제한 없이 카드 이름만 확인
    const names=(wanted && (freeOk || !validateDeckList(wanted))) ? wanted : null;
    const src=names ? names.map(n=>CARD_POOL.find(c=>c.name===n)) : CARD_POOL.flatMap(c=>Array(CONFIG.COPIES).fill(c));
    src.forEach(c=>deck.push({...c, inDeck:true, cost:c.type==='spell' ? c.cost : Math.max(0, c.cost-(mods.costDown||0)), id:s.nextId++}));   // inDeck: 게임 시작 때 덱에 있던 카드 (v56 롬메스는 이 표시가 없는 주문만 다시 시전)   // costDown 은 하수인만
    shuffle(deck, rng);
    const maxHp=CONFIG.HERO_HP+(mods.hp||0);
    s.seats.push({hp:maxHp, maxHp, armor:mods.startArmor||0, mana:0, maxMana:mods.startMana?Math.max(0, mods.startMana-1):0, deck, hand:[], board:[], mods});
  }
  for(let seat=0; seat<2; seat++){
    const P=s.seats[seat];
    drawCards(s, seat, Math.min(CONFIG.START_HAND_MAX, CONFIG.START_HAND+(seat===first ? 0 : CONFIG.SECOND_HAND)+(P.mods.startHand||0)), null);
    P.startIds=P.hand.map(c=>c.id);                                    // v77 멀리건: 시작 카드(동전·첫 턴 드로우 제외)
    if(seat!==first) P.hand.push({...makeCoin(), id:s.nextId++});      // 후공: 동전 1장
    for(let k=0;k<(P.mods.startBoard||0) && P.board.length<CONFIG.MAX_BOARD;k++)
      P.board.push({id:s.nextId++, name:'보초병', cost:1, atk:1, hp:2, maxHp:2, attacked:false, summoned:false});
  }
  startTurn(s, first, []);      // 선공도 정상적으로 턴 시작 처리(마나 1)
  refreshAura(s);
  return s;
}

// ---- 내부 변경 함수 (복제본 s 에만 사용) ----
function drawCards(s, seat, n, ev, src){
  const P=s.seats[seat]; let drawn=0, burned=0; const bcards=[];
  for(let i=0;i<n;i++){
    if(!P.deck.length){      // 탈진: 덱이 빈 채로 카드를 뽑아야 할 때마다 영웅이 피해를 입는다. 1, 2, 3, ... 으로 계속 늘어난다 (좌석별)
      if(P.mods && P.mods.noFatigue) continue;   // v98 치트 피로 면역
      P.fatigue=(P.fatigue||0)+1;
      const evs=ev||[];
      evs.push({type:'fatigue', seat, amount:P.fatigue});
      hurtHero(s, seat, P.fatigue, evs, 'fatigue', src);
      continue;
    }
    const c=P.deck.pop();
    if(P.hand.length<handMax(P)){ P.hand.push(c); drawn++; } else { burned++; bcards.push(c); }
  }
  if(ev && (drawn||burned)) ev.push({type:'draw', seat, count:drawn, burned, src:src||null, ...(burned?{burnedCards:bcards}:{})});
}
function mulliganHand(s, seat, ids){                            // v77 멀리건: 고른 시작 카드만 새로 뽑고, 버린 카드는 덱에 섞는다 (제자리 교체). 바꾼 장수를 돌려줌
  const P=s.seats[seat], ok=new Set(P.startIds||[]);
  const out=P.hand.filter(c=>ids.includes(c.id) && ok.has(c.id));
  P.startIds=[];
  if(!out.length) return 0;
  const drawn=[]; for(let i=0;i<out.length && P.deck.length;i++) drawn.push(P.deck.pop());
  const gone=new Set(drawn.length ? out.slice(0, drawn.length).map(c=>c.id) : []);
  let k=0; P.hand=P.hand.map(c=> gone.has(c.id) ? drawn[k++] : c);
  P.deck.push(...out.filter(c=>gone.has(c.id))); shuffle(P.deck, ()=>nextRand(s));
  return drawn.length;
}
function startTurn(s, seat, ev){
  const P=s.seats[seat];
  s.turn=seat; s.turnNo++;
  if(P.ascendNext){ P.maxMana+=P.ascendNext; P.ascendNext=0; }   // v94 새로운 경지: 예약된 최대 마나 증가
  addMax(P, 1);   // 마나는 플레이어별로 따로 관리 (v35: 최대 마나가 10을 넘은 상태면 깎지 않고 그대로)
  const md=P.mods||{};
  P.turns=(P.turns||0)+1;                              // 이 좌석이 진행한 턴 수
  const lock=Math.min(P.overloadNext||0, P.maxMana+(md.manaBonus||0)); P.overloadNext=0; P.locked=lock;   // v29 과부하: 지난 턴에 쌓인 만큼 이번 턴 마나가 잠긴다
  const snack=P.nextMana||0; P.nextMana=0; P.spellTax=P.taxNext||0; P.taxNext=0;   // v75 로데브: 예약된 주문 비용 증가가 이 턴에 적용               // v32 등산용 간식: 이 턴에만 마나 +N
  P.mana=P.maxMana+(md.manaBonus||0)+snack-lock;      // 추가 마나는 그 턴에만 (최대 마나는 늘리지 않음)
  if(P.armorNext){ P.armor=(P.armor||0)+P.armorNext; ev.push({type:'armor', seat, amount:P.armorNext, src:{seat, name:'키틴질 껍질'}}); P.armorNext=0; }   // v32 키틴질 껍질: 내 턴 시작에 방어도
  P.board.forEach(m=>{ m.attacked=false; m.wfUsed=false; m.summoned=false; if(m.stealthTemp){ delete m.stealth; delete m.stealthTemp; } });   // v100: 은신은 공격할 때까지 유지, 엄폐(stealthTemp)만 내 다음 턴 시작에 풀림
  P.heroAtk=0; P.heroAttacked=false;   // v80 영웅 공격: 공격력은 그 턴에만, 공격은 턴마다 1번
  for(const lo of [...P.board]){                       // v100 피어오르는 연꽃: 내 턴이 시작될 때 피해 입은 아군(영웅·하수인) 무작위 1명을 회복
    if(!lo.startHeal || lo.hp<=0) continue;
    const src={seat, name:lo.name}, cap=P.maxHp ?? CONFIG.HERO_HP;
    const cand=[]; if(P.hp>0 && P.hp<cap) cand.push(heroT(seat));
    for(const x of P.board) if(x.hp>0 && x.hp<x.maxHp) cand.push(minionT(seat, x.id));
    if(!cand.length) continue;
    const t=cand[Math.floor(nextRand(s)*cand.length)];
    if(t.kind==='hero') gainLife(s, seat, lo.startHeal, ev, src);
    else { const x=findMinion(s, seat, t.id), b=x.hp; x.hp=Math.min(x.maxHp, x.hp+lo.startHeal); ev.push({type:'heal', target:t, name:x.name, amount:x.hp-b, src}); }
  }
  for(const m of [...P.board]) if(m.startSpend && m.hp>0 && spendCorpses(s, seat, m.startSpend.corpses, ev, {seat, name:m.name})) increaseLife(s, seat, m.startSpend.life, ev, {seat, name:m.name});   // v78 마우와 파우: 내 턴 시작 시체 소모 → 생명력   // v75: 은신은 내 다음 턴이 시작될 때까지
  ev.push({type:'turn_start', seat, turnNo:s.turnNo});
  P.freeMinion=md.firstMinion||0;                      // v98 치트 무료 첫 하수인: 이 턴에 처음 내는 하수인만 (하수인을 내면 0)
  if(md.regen && P.hp>0 && P.hp<P.maxHp){ const b=P.hp; P.hp=Math.min(P.maxHp, P.hp+md.regen); ev.push({type:'heal', target:heroT(seat), name:null, amount:P.hp-b, src:{seat, name:'재생'}}); }   // v98 치트 재생
  if(md.burn && P.turns>1){ const fo=other(seat); hurtHero(s, fo, md.burn, ev, 'burn', {seat, name:'영웅 일격'}); }   // v98 치트 영웅 일격: 내 턴 시작에 상대 영웅 N 피해 (첫 턴 제외, 방어도로 막힘)
  drawCards(s, seat, (md.extraDraw && (md.extraDraw===true || P.turns<=md.extraDraw)) ? 2 : 1, ev);
}
function lifestealHeal(s, seat, m, amount, ev){                    // v62 하수인의 생명력 흡수: 준 피해만큼 주인 영웅 회복 (최대 체력까지)
  if(!m.lifesteal || amount<=0) return;
  const P=s.seats[seat], before=P.hp; P.hp=Math.min(P.maxHp ?? CONFIG.HERO_HP, P.hp+amount);
  if(P.hp>before) ev.push({type:'heal', target:heroT(seat), name:null, amount:P.hp-before, ls:true, src:{seat, name:m.name}});
}
function spellPower(s, seat){                                  // v106 주문 공격력: 내 하수인들의 주문 공격력 합 (시프는 1 + 이번 게임에 시전한 주문의 속성 종류 수)
  const P=s.seats[seat]; let n=0;
  for(const m of P.board){ if(m.hp<=0) continue; if(m.spellDmg) n+=m.spellDmg; if(m.spellDmgSchools) n+=1+(P.schoolsCast||[]).length; }
  return n;
}
function hurtHero(s, seat, amount, ev, cause, src){
  if(src && src.spell && amount>0) amount+=spellPower(s, src.seat);
  amount=Math.max(0, amount-((s.seats[seat].mods||{}).armor||0));
  const A=s.seats[seat].armor||0, ab=Math.min(A, amount);          // v29 방어도: 피해를 먼저 흡수한다
  if(ab){ s.seats[seat].armor=A-ab; amount-=ab; }
  s.seats[seat].hp -= amount;
  ev.push({type:'damage', target:heroT(seat), name:null, amount, absorbed:false, armorAbsorbed:ab, cause, src:src||null});
}
const shieldNeed=(s, seat)=> s.seats[seat].board.reduce((mx,x)=> (x.shieldAura && x.hp>0) ? Math.max(mx, x.shieldAura) : mx, 1);   // v108 불굴의 토레스: 내 보호막이 부서지기까지 필요한 피해 횟수 (여럿이어도 겹치지 않고 가장 큰 값)
function hurtMinion(s, seat, m, amount, ev, cause, src, by){
  const target=minionT(seat, m.id);
  if(m.fireImmune && src && src.spell && (src.school||[]).includes('화염')){ ev.push({type:'damage', target, name:m.name, amount:0, absorbed:false, immune:true, cause, src}); return; }   // v112 광염의 피락: 화염 주문 면역
  if(m.shield){
    const need=shieldNeed(s, seat); m.shieldHits=(m.shieldHits||0)+1;     // 피해를 받을 때마다 1회 소모 (피해량과 무관), 토레스가 사라지면 남은 횟수와 상관없이 다음 피해에 부서진다
    const left=need-m.shieldHits;
    if(left<=0){ m.shield=false; delete m.shieldHits; }
    ev.push({type:'damage', target, name:m.name, amount:0, absorbed:true, cause, src:src||null, ...(left>0?{shieldLeft:left}:{})});
    return;
  }
  if(src && src.spell && amount>0) amount+=spellPower(s, src.seat);   // v106 주문 공격력
  if(s.dmgDoubleTurn===s.turnNo && amount>0) amount*=2;   // v112 타르막: 이번 턴에 하수인이 받는 피해 2배
  m.hp -= amount;
  const venom = !!(((by && by.poison) || (src && src.spell && s.seats[src.seat] && s.seats[src.seat].spellPoison)) && amount>0);   // v105 성게 가시: 이번 턴 내 주문도 독성                       // v100 독성: 하수인에게 피해를 주면(보호막이 막은 경우 제외) 그 하수인을 처치
  if(venom && m.hp>0) m.hp=0;
  ev.push({type:'damage', target, name:m.name, amount, absorbed:false, cause, src:src||null, ...(venom?{poison:true}:{})});
  if(m.tortola && amount>0){ const P=s.seats[seat]; P.armor=(P.armor||0)+1; m.atk+=1; ev.push({type:'armor', seat, amount:1, src:{seat, name:m.name}}); ev.push({type:'buff', target, name:m.name, value:1, hpValue:0, src:{seat, name:m.name}}); }   // v115 토르톨라: 피해를 받은 후 방어도 +1, 공격력 +1
}
function copyTopSpell(s, seat, ev, src){                      // v58: 손패의 주문 중 비용이 가장 높은 것 1장을 복사(같은 비용이면 무작위). 복사본은 생성된 카드(inDeck 없음), 손패가 가득이면 소각
  const P=s.seats[seat], sp=P.hand.filter(c=>c.type==='spell');
  if(!sp.length){ ev.push({type:'ignored', seat, src}); return; }
  const top=Math.max(...sp.map(c=>c.cost)), cand=sp.filter(c=>c.cost===top);
  const base=cand[Math.floor(nextRand(s)*cand.length)], copy=structuredClone(base); copy.id=s.nextId++; delete copy.inDeck;
  const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(copy);
  ev.push({type:'generated', seat, name:base.name, burned, src,...(burned?{card:copy}:{})});
}
function gainSpells(s, seat, ev, src, schools){                 // v59: 속성마다 무작위 주문 1장씩 손패로 (손패가 가득이면 소각)
  const P=s.seats[seat];
  for(const sc of schools){
    const pool=spellPool({school:sc}).filter(x=>!x.generatedOnly); if(!pool.length) continue;
    const x=pool[Math.floor(nextRand(s)*pool.length)], copy={...x, id:s.nextId++}, burned=P.hand.length>=handMax(P);
    if(!burned) P.hand.push(copy);
    ev.push({type:'generated', seat, name:x.name, burned, src,...(burned?{card:copy}:{})});
  }
}
function gainSpellDisc(s, seat, school, discount, ev, src){       // 창심장 파수병·부두 토템: 해당 속성 무작위 주문 1장을 손패로 (비용 -discount, 가득이면 소각)
  const P=s.seats[seat], pool=spellPool({school}).filter(x=>!x.generatedOnly); if(!pool.length) return;
  const x=pool[Math.floor(nextRand(s)*pool.length)], copy={...structuredClone(x), id:s.nextId++}, burned=P.hand.length>=handMax(P);
  copy.cost=Math.max(0, copy.cost-(discount||0));
  if(!burned) P.hand.push(copy);
  ev.push({type:'generated', seat, name:x.name, burned, src, ...(burned?{card:copy}:{})});
}
function attackBeast(s, seat, m, ev){                          // v106 밴조사우루스: 공격할 때마다 덱에서 야수를 뽑고 그 능력치를 얻는다
  const P=s.seats[seat], src={seat, name:m.name};
  const idx=P.deck.map((c,k)=>(c.type==='minion' && (c.tribe||'').includes('야수'))?k:-1).filter(k=>k>=0);
  if(!idx.length){ ev.push({type:'ignored', seat, src}); return; }
  const c=P.deck.splice(idx[Math.floor(nextRand(s)*idx.length)],1)[0], burned=P.hand.length>=handMax(P);
  if(!burned) P.hand.push(c);
  ev.push({type:'draw', seat, count:burned?0:1, burned:burned?1:0, src, ...(burned?{burnedCards:[c]}:{})});
  m.atk+=c.atk; m.hp+=c.hp; m.maxHp+=c.hp;
  ev.push({type:'buff', target:minionT(seat, m.id), name:m.name, value:c.atk, hpValue:c.hp, src});
}
function attackCopy(s, seat, m, ev){                             // v59: 공격할 때마다 이 하수인의 복사본(현재 공격력·체력 등 모든 강화 유지)을 비용 1로 손패에
  const P=s.seats[seat], bf=(P.mods&&P.mods.buff)||0, copy=structuredClone(m);
  copy.id=s.nextId++; copy.cost=1; copy.atk=m.atk-(m.tempAtk||0); copy.hp=m.maxHp-bf;
  for(const k of ['maxHp','summoned','attacked','frozen','tempAtk','inDeck']) delete copy[k];
  const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(copy);
  ev.push({type:'generated', seat, name:m.name, burned, src:{seat, name:m.name},...(burned?{card:copy}:{})});
}
function returnEternal(s, seat, ev){                         // v61 영원의 불화살: 내 턴이 끝날 때, 이번 턴에 대상이 죽었다면 이 주문을 손패로 되돌린다 (손패가 가득이면 소각). 죽지 않았으면 효과 종료
  const list=(s.returns||[]).filter(r=>r.owner===seat); if(!list.length) return;
  const P=s.seats[seat];
  for(const r of list){
    if(!r.dead) continue;
    const copy={...r.card, id:s.nextId++}, burned=P.hand.length>=handMax(P);
    if(!burned) P.hand.push(copy);
    ev.push({type:'generated', seat, name:copy.name, burned, src:{seat, name:copy.name}, returned:true,...(burned?{card:copy}:{})});
  }
  s.returns=s.returns.filter(r=>r.owner!==seat);
}
function raiseDeadList(s, seat, max){                          // v70 망자 되살리기: 이번 판에 죽은 내 하수인 중 비용이 max 이하인 것 (카드풀에 있는 카드 하수인만)
  const out=[]; for(const g of (s.seats[seat].grave||[])){ const base=CARD_POOL.find(x=>x.type==='minion' && x.name===g.name); if(base && base.cost<=max) out.push({g, base}); }
  return out;
}
function returnLoop(s, seat, ev){                              // v66 극한 반복: 내 턴이 끝나면 이번 턴에 쓴 이 카드를 손패로 되돌린다 (손패가 가득이면 소각)
  const list=(s.endReturns||[]).filter(r=>r.owner===seat); if(!list.length) return;
  const P=s.seats[seat];
  for(const r of list){ const copy={...r.card, id:s.nextId++}, burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(copy);
    ev.push({type:'generated', seat, name:copy.name, burned, src:{seat, name:copy.name}, returned:true,...(burned?{card:copy}:{})}); }
  s.endReturns=s.endReturns.filter(r=>r.owner!==seat);
}
// ---- v76 시체·거머리·턴 종료 공격 ----
const LOTUS={name:'피어오르는 연꽃', atk:0, hp:2, rush:false, extra:{stealth:true, startHeal:3}};   // v100 왕궁정원사: 0/2 은신. 내 턴이 시작될 때 피해 입은 아군 무작위 1명을 3 회복
const VIPER={name:'치명적인 독사', atk:1, hp:1, extra:{stealth:true, poison:true}};   // v100 뱀사육사: 1/1 속공(summonTokens 기본)·은신·독성
const LEECH={name:'불어오른 거머리', atk:0, hp:2, rush:false, extra:{tribe:'야수', endDrain:true}};   // 0/2 야수. 내 턴이 끝날 때 가장 약한 적에게서 생명력을 훔침
const RAISED={name:'되살아난 보병', atk:1, hp:3, taunt:true, rush:false, extra:{tribe:'언데드'}};   // v96
const GHOUL={name:'취약한 구울', atk:1, hp:1, rush:false};   // 채광 사상자의 신병이 죽으면
const PTERO_BABY={name:'새끼 비명익룡', atk:2, hp:1, rush:false};   // 비명익룡 알 죽음의 메아리
const PTERO={name:'다 자란 비명익룡', atk:4, hp:4, rush:false};   // 비명익룡 알이 깨졌을 때
const MACHINE={name:'기계', atk:1, hp:2, rush:false, taunt:true, extra:{tribe:'기계', shield:true}};   // v109 안녕극단: 도발·보호막 1/2 기계
const _mtCache={};
function canHitMinion(s, c){                                    // v109 세데크 장막직공: 하수인을 대상으로 지정할 수 있는 주문인가 (양쪽 전장에 하수인이 있는 가상 상태로 대상 목록을 물어 본다)
  if(c.name in _mtCache) return _mtCache[c.name];
  let ok=false; const fx=SPELL_FX[c.effect.type];
  if(fx && fx.targets){ try{ const dm=()=>({id:-1, name:'x', atk:1, hp:1, maxHp:1}), P=()=>({board:[dm()], hand:[], deck:[], hp:30, armor:0, mods:{}});
    ok=fx.targets({...s, seats:[P(),P()]}, 0, c.effect).some(t=>t.kind==='minion'); }catch(e){ ok=false; } }
  return (_mtCache[c.name]=ok);
}
function weaverTrigger(s, seat, c, target, ev){               // v109 세데크 장막직공: 내가 하수인에게 주문을 시전한 후, 하수인 대상 주문 1장을 손패로 (장막직공마다 1장)
  if(c.sub || !c.effect || c.effect.type==='mana' || !target || target.kind!=='minion') return;
  const P=s.seats[seat];
  for(const m of [...P.board]){
    if(!m.spellWeave || m.hp<=0) continue;
    const pool=CARD_POOL.filter(x=>x.type==='spell' && !x.generatedOnly && canHitMinion(s, x)); if(!pool.length) continue;
    const card={...structuredClone(pool[Math.floor(nextRand(s)*pool.length)]), id:s.nextId++}, burned=P.hand.length>=handMax(P);
    if(!burned) P.hand.push(card);
    ev.push({type:'generated', seat, name:card.name, burned, src:{seat, name:m.name}, ...(burned?{card}:{})});
  }
}
function stealDeckCards(s, seat, n, ev, src){                    // v110 생각 훔치기: 상대 덱의 서로 다른 위치 카드 n장을 복사해 내 손으로 (상대 덱은 그대로, 손패가 가득이면 소각)
  const D=s.seats[other(seat)].deck, P=s.seats[seat], idx=D.map((_,i)=>i);
  for(let i=idx.length-1;i>0;i--){ const j=Math.floor(nextRand(s)*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  for(const i of idx.slice(0,n)){
    const card=structuredClone(D[i]); card.id=s.nextId++; delete card.inDeck; delete card.auto;
    const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
    ev.push({type:'generated', seat, name:card.name, burned, src, ...(burned?{card}:{})});
  }
  return Math.min(n, idx.length);
}
function summonFromDeck(s, seat, ev, src){                       // v112 이샤라즈: 내 덱의 무작위 하수인을 (덱에서 꺼내) 소환. 전투의 함성은 발동하지 않음
  const P=s.seats[seat], idx=P.deck.map((c,i)=>c.type==='minion'?i:-1).filter(i=>i>=0);
  if(!idx.length || P.board.length>=CONFIG.MAX_BOARD){ ev.push({type:'ignored', seat, src}); return false; }
  const bf=(P.mods&&P.mods.buff)||0, c0=P.deck.splice(idx[Math.floor(nextRand(s)*idx.length)],1)[0];
  const m={...c0, maxHp:c0.hp+bf, hp:c0.hp+bf, attacked:false, summoned:true}; delete m.effect; delete m.inDeck; delete m.auto; delete m.lifeCost; cheatMinion(P, m);
  P.board.push(m); ev.push({type:'summon', seat, id:m.id, name:m.name, src}); return true;
}
function summonDeckCopy(s, seat, ev, src){                      // v111 암흑의 정수·그훈의 피: 내 덱의 무작위 하수인을 복사해 5/5 로 소환 (전투의 함성은 발동하지 않음). 덱에 하수인이 없거나 자리가 없으면 불발
  const P=s.seats[seat], idx=P.deck.map((c,i)=>c.type==='minion'?i:-1).filter(i=>i>=0);
  if(!idx.length || P.board.length>=CONFIG.MAX_BOARD){ ev.push({type:'ignored', seat, src}); return false; }
  const bf=(P.mods&&P.mods.buff)||0, c0=P.deck[idx[Math.floor(nextRand(s)*idx.length)]];
  const m={...structuredClone(c0), id:s.nextId++, atk:5, hp:5+bf, maxHp:5+bf, attacked:false, summoned:true}; delete m.effect; delete m.inDeck; delete m.auto;
  P.board.push(m); ev.push({type:'summon', seat, id:m.id, name:m.name, src}); return true;
}
const DRAGON={name:'용', atk:5, hp:5, rush:false, extra:{tribe:'용족'}};   // v108 용소환사 알라나: 속공 없는 5/5 용족
const UNDEAD5={name:'언데드', atk:5, hp:5, taunt:true, rush:false, extra:{tribe:'언데드'}};
function gainLife(s, seat, n, ev, src){                         // 영웅 생명력 +n (최대 체력까지)
  const P=s.seats[seat], before=P.hp; P.hp=Math.min(P.maxHp ?? CONFIG.HERO_HP, P.hp+n);
  if(P.hp>before) ev.push({type:'heal', target:heroT(seat), name:null, amount:P.hp-before, src});
}
function increaseLife(s, seat, n, ev, src){                      // v87: '증가'(그훈·거머리·흡혈·공기 누출·마우와 파우)는 회복과 달리 최대 체력을 넘어 영웅 생명력을 늘린다 (최대 체력도 같이 올라가므로 이후 회복도 그 한도까지)
  if(n<=0) return;
  const P=s.seats[seat]; P.hp+=n; P.maxHp=Math.max(P.maxHp ?? CONFIG.HERO_HP, P.hp);
  ev.push({type:'heal', target:heroT(seat), name:null, amount:n, src});
}
function spendCorpses(s, seat, n, ev, src){                     // 시체가 n개 이상이면 소모하고 true
  const P=s.seats[seat]; if((P.corpses||0)<n) return false;
  P.corpses-=n; ev.push({type:'corpseSpend', seat, amount:n, src}); return true;
}
function lowestFoe(s, seat){                                    // 생명력이 가장 낮은 적 (영웅 포함, 같으면 무작위). 대상 객체를 돌려줌
  const fo=other(seat), F=s.seats[fo];
  const list=[{t:heroT(fo), hp:F.hp}, ...F.board.filter(m=>m.hp>0).map(m=>({t:minionT(fo, m.id), hp:m.hp}))];
  const lo=Math.min(...list.map(x=>x.hp)), ties=list.filter(x=>x.hp===lo);
  return ties[Math.floor(nextRand(s)*ties.length)].t;
}
function leechDrain(s, seat, m, ev){                            // 불어오른 거머리: 가장 약한 적에게서 생명력 1(흉측한 허물 1기당 +1)을 가져온다
  const P=s.seats[seat], fo=other(seat), n=1+P.board.filter(x=>x.leechBoost && x.hp>0).length, src={seat, name:m.name};
  const t=lowestFoe(s, seat);
  if(t.kind==='hero'){ hurtHero(s, fo, n, ev, 'battlecry', src); increaseLife(s, seat, n, ev, src); }
  else { const d=findMinion(s, fo, t.id), sh=d.shield; hurtMinion(s, fo, d, n, ev, 'battlecry', src); if(!sh) increaseLife(s, seat, n, ev, src); }   // 보호막이 막으면 훔치지 못함
}
function endBullies(s, seat, m, ev){                             // v115 문제아: 3/3 불량배 둘을 소환하고, 각각 무작위 적(영웅 또는 하수인, 도발 무시)을 공격한다
  const fo=other(seat), ids=summonTokens(s, seat, 2, {name:'불량배', atk:3, hp:3, rush:false}, ev);
  for(const id of ids){
    if(s.seats[0].hp<=0 || s.seats[1].hp<=0) break;
    const b=findMinion(s, seat, id); if(!b || b.hp<=0 || b.frozen || b.atk<=0) continue;
    const foes=[heroT(fo), ...s.seats[fo].board.filter(x=>x.hp>0 && !x.stealth).map(x=>minionT(fo, x.id))], t=foes[Math.floor(nextRand(s)*foes.length)];
    if(t.kind==='hero'){
      ev.push({type:'attack', seat, attackerId:b.id, name:b.name, target:t, targetName:null});
      const ma=dmgOf(s, seat, b); hurtHero(s, fo, ma, ev, 'combat'); lifestealHeal(s, seat, b, ma, ev);
    } else {
      const d=findMinion(s, fo, t.id);
      ev.push({type:'attack', seat, attackerId:b.id, name:b.name, target:t, targetName:d.name});
      const ma=dmgOf(s, seat, b), dAtk=dmgOf(s, fo, d), dShield=d.shield, bShield=b.shield;
      hurtMinion(s, fo, d, ma, ev, 'combat', null, b); hurtMinion(s, seat, b, dAtk, ev, 'combat', null, d);
      if(!dShield) lifestealHeal(s, seat, b, ma, ev);
      if(!bShield) lifestealHeal(s, fo, d, dAtk, ev);
    }
    sweepDead(s, ev);
  }
}
function endAttack(s, seat, m, ev){
  if(m.atk<=0) return;                                           // 공격력 0 이면 공격하지 못함                             // 노움 쩝쩝이: 내 턴이 끝날 때 생명력이 가장 낮은 적을 공격 (도발 무시, 빙결이면 공격 못함)
  if(m.frozen) return;
  const fo=other(seat), t=lowestFoe(s, seat);
  if(t.kind==='hero'){
    ev.push({type:'attack', seat, attackerId:m.id, name:m.name, target:t, targetName:null});
    { const ma=dmgOf(s, seat, m); hurtHero(s, fo, ma, ev, 'combat'); lifestealHeal(s, seat, m, ma, ev); }
  } else {
    const d=findMinion(s, fo, t.id);
    ev.push({type:'attack', seat, attackerId:m.id, name:m.name, target:t, targetName:d.name});
    const ma=dmgOf(s, seat, m), dAtk=dmgOf(s, fo, d), dShield=d.shield, mShield=m.shield;
    hurtMinion(s, fo, d, ma, ev, 'combat', null, m); hurtMinion(s, seat, m, dAtk, ev, 'combat', null, d);
    if(!dShield) lifestealHeal(s, seat, m, ma, ev);
    if(!mShield) lifestealHeal(s, fo, d, dAtk, ev);
  }
  delete m.stealth; delete m.stealthTemp;
}
function endScatterRun(s, seat, m, n, ev){                       // v79 분노의 여사제: 적 영웅·적 하수인 중 무작위로 피해 1씩 n번
  const fo=other(seat), src={seat, name:m.name};
  for(let i=0;i<n;i++){
    if(s.seats[fo].hp<=0) break;
    const alive=s.seats[fo].board.filter(x=>x.hp>0), k=Math.floor(nextRand(s)*(alive.length+1));
    if(k===alive.length) hurtHero(s, fo, 1, ev, 'battlecry', src);
    else hurtMinion(s, fo, alive[k], 1, ev, 'battlecry', src);
  }
}
function endBait(s, seat, m, ev){                               // v79 신화의 공포: 모든 적 하수인이 이 하수인을 차례로 공격 (빙결된 하수인은 공격하지 못함)
  const fo=other(seat);
  for(const a of [...s.seats[fo].board]){
    if(m.hp<=0) break;
    if(a.hp<=0 || a.frozen) continue;   // 신화의 공포는 예외: 공격력 0 하수인도 강제로 공격한다
    ev.push({type:'attack', seat:fo, attackerId:a.id, name:a.name, target:minionT(seat, m.id), targetName:m.name});
    const mAtk=dmgOf(s, seat, m), aAtk=dmgOf(s, fo, a), aShield=a.shield, mShield=m.shield;
    hurtMinion(s, seat, m, aAtk, ev, 'combat', null, a); hurtMinion(s, fo, a, mAtk, ev, 'combat', null, m);
    if(!mShield) lifestealHeal(s, fo, a, aAtk, ev);
    if(!aShield) lifestealHeal(s, seat, m, mAtk, ev);
  }
}
function endSteal(s, seat, m, ev){                              // v79 고대의 공허 사냥개: 모든 적 하수인에게서 공격력·생명력 1씩 (공격력은 1 이상일 때만, 생명력이 0이 되면 죽음) 가져와 자신이 얻는다
  const fo=other(seat); let ga=0, gh=0;
  for(const t of s.seats[fo].board){
    if(t.hp<=0) continue;
    const a=t.atk>0?1:0; t.atk-=a; t.hp-=1; t.maxHp=Math.max(1, (t.maxHp||t.hp+1)-1); ga+=a; gh+=1;
    ev.push({type:'shrinkStat', target:minionT(fo, t.id), name:t.name, atk:a, hp:1, src:{seat, name:m.name}});
  }
  if(gh){ m.atk+=ga; m.hp+=gh; m.maxHp+=gh; ev.push({type:'buff', target:minionT(seat, m.id), name:m.name, value:ga, hpValue:gh, src:{seat, name:m.name}}); }
}
function refreshAura(s, ev){                                        // v79 타락심장 심문관: 상대 전장의 spellAura 합만큼 내 주문 비용 증가 (apply 가 끝날 때마다 갱신)
  for(const seat of [0,1]) s.seats[seat].auraTax=s.seats[other(seat)].board.filter(m=>m.spellAura && m.hp>0).reduce((a,m)=>a+m.spellAura, 0);
  for(const seat of [0,1]){ const P=s.seats[seat];
    const lords=P.board.filter(y=>y.atkAura && y.hp>0);                // 공격대장: 내 다른 하수인 공격력 +N (오라 — 사라지면 함께 사라짐)
    P.board.forEach((x,i)=>{ const nb=[P.board[i-1], P.board[i+1]];                      // 불꽃의 토템: 양옆 하수인 공격력 +N (오라)
      const want=lords.reduce((a,y)=>a+(y!==x?y.atkAura:0), 0)+nb.reduce((a,y)=>a+(y && y.hp>0 && y.adjAtkAura ? y.adjAtkAura : 0), 0), have=x.auraGiven||0;
      if(want!==have){ x.atk+=want-have; x.auraGiven=want; } });
    const ids=P.board.map(x=>x.id);                                    // 지하군주: 내 하수인이 새로 소환될 때마다 생명력 +N
    if(P.seenIds){ const fresh=P.board.filter(x=>x.hp>0 && !P.seenIds.includes(x.id)).length;
      if(fresh) for(const y of P.board) if(y.lordGrow && y.hp>0 && P.seenIds.includes(y.id)){ const g=y.lordGrow*fresh; y.hp+=g; y.maxHp+=g;
        if(ev) ev.push({type:'buff', target:minionT(seat, y.id), name:y.name, value:0, hpValue:g, src:{seat, name:y.name}}); } }
    P.seenIds=ids; }
}
const hasDeathFx=m=>!!(m.deathDraw||m.deathSummon||m.deathSummonCost||m.deathStego||m.deathArmor||m.deathBuffAll||m.deathGrave||m.deathCopy||m.deathGain||m.deathMachines||m.deathKill||m.eggChicken||m.deathProto||m.deathAdjBuff||m.deathAoe||m.deathPtero||m.deathBeast||m.deathGhoul);
function runDeath(s, seat, m, ev, sm){
  const P=s.seats[seat];
      if(m.deathDraw) drawCards(s, seat, m.deathDraw, ev, {seat, name:m.name});   // v34 죽음의 메아리: 죽을 때마다, 환생보다 먼저 발동
      if(m.deathSummon) sm.push({n:m.deathSummon, name:m.name});   // 죽음의 메아리: 나무정령 소환
      if(m.deathSummonCost) sm.push({cost:m.deathSummonCost, name:m.name, randomCost:true});
      if(m.deathStego) sm.push({n:m.deathStego, name:m.name, stego:true});   // v61 죽음의 메아리: 스테고돈 소환
      if(m.deathArmor){ P.armor=(P.armor||0)+m.deathArmor; ev.push({type:'armor', seat, amount:m.deathArmor, src:{seat, name:m.name}}); }   // v80 지저왕 죽음의 메아리: 방어도
      if(m.deathBuffAll){ for(const x of [...P.hand, ...P.deck]) if(x.type==='minion'){ x.atk+=m.deathBuffAll; x.hp+=m.deathBuffAll; } ev.push({type:'handBuff', seat, amount:m.deathBuffAll, src:{seat, name:m.name}}); }   // v81 지진발
      if(m.deathGrave) sm.push({grave:true, name:m.name}); if(m.deathMachines) sm.push({n:m.deathMachines, name:m.name, machines:true});
      if(m.deathGhoul) sm.push({n:m.deathGhoul, name:m.name, ghoul:true});   // 채광 사상자 신병: 1/1 취약한 구울
      if(m.deathBeast) giveRandomBeast(s, seat, ev, {seat, name:m.name});     // 그물거미: 무작위 야수를 손으로
      if(m.deathPtero) sm.push({n:m.deathPtero, name:m.name, ptero:true});   // 비명익룡 알: 2/1 새끼
      if(m.eggChicken) sm.push({chicken:true, b:m.eggBonus||0, name:m.name});   // v113 부정한 알: 쌓인 만큼 커진 닭
      if(m.deathProto){                                                  // v113 불안정한 프로토타입: 덱에서 하수인 하나를 뽑고, 손의 모든 하수인 +1/+1
        const idx=P.deck.map((c,k)=>c.type==='minion'?k:-1).filter(k=>k>=0);
        if(idx.length){ const c=P.deck.splice(idx[Math.floor(nextRand(s)*idx.length)],1)[0], burned=P.hand.length>=handMax(P);
          if(!burned) P.hand.push(c);
          ev.push({type:'draw', seat, count:burned?0:1, burned:burned?1:0, src:{seat, name:m.name}, ...(burned?{burnedCards:[c]}:{})}); }
        let n=0; for(const x of P.hand) if(x.type==='minion'){ x.atk+=1; x.hp+=1; n++; }
        if(n) ev.push({type:'handBuff', seat, amount:1, hand:true, src:{seat, name:m.name}}); }
      if(m.deathKill){                                                   // v111 흑요석 석상: 무작위 적 하수인 처치 (보호막 무시, 환생은 평소대로)
        const foe=s.seats[other(seat)], cand=foe.board.filter(x=>x.hp>0);
        if(cand.length){ const x=cand[Math.floor(nextRand(s)*cand.length)], amt=x.hp; x.shield=false; x.hp=0; s.sweepAgain=true;
          ev.push({type:'damage', target:minionT(other(seat), x.id), name:x.name, amount:amt, absorbed:false, cause:'battlecry', src:{seat, name:m.name}}); } }   // v109 안녕극단   // v81 하드로녹스
      if(m.deathAdjBuff){                                                // 곰팡이술사 죽음의 메아리: 죽는 순간 양옆의 하수인 +N/+N
        const i=P.board.indexOf(m);
        if(i>=0) for(const x of [P.board[i-1], P.board[i+1]]){ if(!x || x.hp<=0) continue; x.atk+=m.deathAdjBuff; x.hp+=m.deathAdjBuff; x.maxHp+=m.deathAdjBuff;
          ev.push({type:'buff', target:minionT(seat, x.id), name:x.name, value:m.deathAdjBuff, hpValue:m.deathAdjBuff, src:{seat, name:m.name}}); } }
      if(m.deathAoe){                                                    // 누더기골렘 죽음의 메아리: 모든 캐릭터(영웅·하수인)에게 피해 N
        const dsrc={seat, name:m.name};
        for(const sd of [other(seat), seat]){ hurtHero(s, sd, m.deathAoe, ev, 'battlecry', dsrc);
          for(const x of [...s.seats[sd].board]) if(x!==m && x.hp>0) hurtMinion(s, sd, x, m.deathAoe, ev, 'battlecry', dsrc); }
        s.sweepAgain=true; }
      if(m.deathCopy) copyTopSpell(s, seat, ev, {seat, name:m.name});
      if(m.deathGain) gainSpells(s, seat, ev, {seat, name:m.name}, ['암흑','신성']);   // v59 죽음의 메아리: 속성별 무작위 주문 1장씩   // v58 죽음의 메아리: 손패에서 비용이 가장 높은 주문 복사
}
function runSummons(s, seat, sm, ev){
  const P=s.seats[seat];
    for(const d of sm){
      if(d.chicken){ summonTokens(s, seat, 1, {name:'언데드 닭', atk:3+d.b, hp:3+d.b, rush:false, extra:{tribe:'언데드'}}, ev); continue; }
      if(d.grave){
        const bf=(P.mods&&P.mods.buff)||0;
        for(const g of [...(P.grave||[])]){ if(!g.taunt) continue; if(P.board.length>=CONFIG.MAX_BOARD) break;
          const base=CARD_POOL.find(x=>x.type==='minion' && x.name===g.name); if(!base) continue;
          const m2={...structuredClone(base), id:s.nextId++, maxHp:base.hp+bf, hp:base.hp+bf, attacked:false, summoned:true, taunt:true}; delete m2.effect;
          P.board.push(m2); ev.push({type:'summon', seat, id:m2.id, name:m2.name, src:{seat, name:d.name}}); }
      } else if(d.randomCost){
        const pool=CARD_POOL.filter(c=>c.type==='minion'&&c.cost===d.cost);
        if(pool.length && P.board.length<CONFIG.MAX_BOARD){ const c=pool[Math.floor(nextRand(s)*pool.length)]; const bf=(P.mods&&P.mods.buff)||0; const m={...c,id:s.nextId++,maxHp:c.hp+bf,hp:c.hp+bf,atk:c.atk,attacked:false,summoned:true}; delete m.effect; delete m.deathSummonCost; P.board.push(m); ev.push({type:'summon',seat,id:m.id,name:m.name,src:{seat,name:d.name}}); }
      } else if(d.ghoul) summonTokens(s, seat, d.n, GHOUL, ev);
      else if(d.ptero) summonTokens(s, seat, d.n, PTERO_BABY, ev);
      else if(d.machines) summonTokens(s, seat, d.n, MACHINE, ev);
      else if(d.stego) summonTokens(s, seat, d.n, STEGODON, ev);
      else summonTokens(s, seat, d.n, WOOD_SPIRIT, ev);
    }
}
function sweepDead(s, ev){
  for(const seat of [0,1]){
    const P=s.seats[seat], sm=[];
    P.board = P.board.filter(m=>{
      if(m.hp>0) return true;
      for(const sd of [0,1]) for(const hc of s.seats[sd].hand) if(hc.infuse && !hc.infused){ hc.infuseN=(hc.infuseN||0)+1; if(hc.infuseN>=hc.infuse) hc.infused=true; }   // v112 주입: 내 손에 있는 동안 하수인이 (양쪽 합쳐) n마리 죽으면 발동
      P.corpses=(P.corpses||0)+1;   // v76 시체: 내 하수인이 죽을 때마다 +1 (환생으로 되살아나도 죽은 것으로 센다)
      runDeath(s, seat, m, ev, sm);   // v96: 죽음의 메아리 (소리치는 요들러도 이 함수를 다시 부른다)
      if(m.revive){ m.revive=false; m.hp=m.reviveFull ? m.maxHp : 1; m.shield=false; delete m.shieldHits; ev.push({type:'revive', seat, id:m.id, name:m.name}); return true; }   // 환생: 1회, 체력 1로 (돌진은 유지)
      if(CARD_POOL.some(c=>c.type==='minion' && c.name===m.name)) (P.grave=P.grave||[]).push({name:m.name, taunt:!!m.taunt});   // v63 물 공급지용 무덤
      if(P.mods && P.mods.reinforce && P.reinfTurn!==s.turnNo && P.hand.length<handMax(P)){   // v98 치트 후속 지원: 내 하수인이 죽으면 그 카드의 복사본 1장을 손패로 (턴당 1회)
        const base=CARD_POOL.find(x=>x.type==='minion' && x.name===m.name);
        if(base){ P.reinfTurn=s.turnNo; P.hand.push({...structuredClone(base), id:s.nextId++}); ev.push({type:'generated', seat, name:base.name, burned:false, src:{seat, name:'후속 지원'}}); }
      }
      ev.push({type:'death', seat, id:m.id, name:m.name, dr:!!(m.deathDraw||m.deathSummon||m.deathSummonCost||m.deathStego||m.deathArmor||m.deathBuffAll||m.deathGrave||m.deathCopy||m.deathGain||m.deathMachines||m.deathKill||m.eggChicken||m.deathProto||m.deathAdjBuff||m.deathAoe||m.deathPtero||m.deathBeast||m.deathGhoul)});
      for(const r of (s.returns||[])) if(r.seat===seat && r.id===m.id) r.dead=true;   // v61 영원의 불화살: 대상이 죽었다
      return false;
    });
    runSummons(s, seat, sm, ev);
  }
  if(s.sweepAgain){ s.sweepAgain=false; sweepDead(s, ev); }   // v111 죽음의 메아리로 새로 죽은 하수인도 바로 정리
}
function checkEnd(s, ev){
  if(s.over) return;
  for(const sd of [0,1]){                              // v98 치트 불굴: 쓰러질 때 1회 한정으로 체력 N 으로 부활
    const Q=s.seats[sd];
    if(Q.hp<=0 && Q.mods && Q.mods.phoenix && !Q.phoenixUsed){ Q.phoenixUsed=true; Q.hp=Q.mods.phoenix; if(Q.maxHp<Q.hp) Q.maxHp=Q.hp; ev.push({type:'phoenix', seat:sd, hp:Q.hp}); }
  }
  const d0=s.seats[0].hp<=0, d1=s.seats[1].hp<=0;
  if(d0||d1){
    s.over=true;
    s.winner = (d0&&d1) ? null : (d0 ? 1 : 0);
    ev.push({type:'game_over', winner:s.winner});
  }
}

// ---- 전투의 함성 ----
// 카드를 낼 때 선택 가능한 대상(소환 전 상태 기준). 비어 있으면 대상 없음.
function cardTargets(s, seat, card){                         // v75 은신: 적의 은신한 하수인은 대상으로 고를 수 없다
  return cardTargetsRaw(s, seat, card).filter(t=>{ if(t.kind!=='minion' || t.seat===seat) return true; const m=findMinion(s, t.seat, t.id); return !(m && m.stealth); });
}
function cardTargetsRaw(s, seat, card){
  const e=card.effect; if(!e) return [];
  const mins = sd => s.seats[sd].board.map(m=>minionT(sd, m.id));
  if(card.type==='spell'){ const fx=SPELL_FX[e.type]; const ts=fx && fx.targets ? fx.targets(s, seat, e) : []; return ts.filter(t=>t.kind!=='minion' || !findMinion(s,t.seat,t.id)?.elusive); }
  if(e.type==='heal' || e.type==='healHoly')   return [heroT(seat), ...mins(seat)];
  if(e.type==='buff' || e.type==='shieldCry')   return mins(seat);   // 여명회 파수병: 아군 하수인
  if(e.type==='sleetFreeze') return mins(other(seat));   // v106 진눈깨비 스케이터: 적 하수인
  if(e.type==='devour') return mins(other(seat));   // v112 허기진 포식자: 적 하수인만
  if(e.type==='originator') return [...mins(other(seat)), ...mins(seat)];   // v97 시초자: 적·아군 하수인 모두 (소환 전이라 자신은 제외)
  // 피해: 적·아군 모두 대상 가능 (소환 전 상태 기준이라 방금 낸 자기 자신은 대상이 아님)
  if(e.type==='damage') return [heroT(other(seat)), ...mins(other(seat)), heroT(seat), ...mins(seat)];
  return [];   // draw
}
function battlecry(s, seat, m, target, ev){
  const e=m.effect; if(!e) return;
  const src={seat, name:m.name, ...(m.spell?{spell:true, school:m.school}:{})};
  if(e.type==='repeatLast'){ repeatLastTurn(s, seat, ev, src); return; }   // v105 사스퀙
  if(e.type==='tarim' || e.type==='edric'){                      // v109 태양지기 타림: 다른 모든 하수인의 공격력·생명력을 3으로 / 성기사 에드릭: 모든 적 하수인의 공격력을 1로
    const sds=e.type==='tarim' ? [other(seat), seat] : [other(seat)]; let n=0;
    for(const sd of sds) for(const x of s.seats[sd].board){
      if(x===m || x.hp<=0) continue; n++;
      x.atk=e.value; x.tempAtk=0; if(e.type==='tarim'){ x.hp=e.value; x.maxHp=e.value; }
      ev.push({type:'statSet', target:minionT(sd, x.id), name:x.name, atk:e.value, ...(e.type==='tarim'?{hp:e.value}:{}), src}); }
    if(!n) ev.push({type:'ignored', seat, src}); return; }
  if(e.type==='benedictus'){                                     // v110 대주교 베네딕투스: 상대 덱 전체를 복사해 내 덱에 섞고, 그 카드들의 비용 -value (최소 0)
    const D=s.seats[other(seat)].deck, P=s.seats[seat];
    if(!D.length){ ev.push({type:'ignored', seat, src}); return; }
    for(const c0 of D){ const cp=structuredClone(c0); cp.id=s.nextId++; delete cp.inDeck; delete cp.auto; cp.cost=Math.max(0, cp.cost-e.value); P.deck.push(cp); }
    shuffle(P.deck, ()=>nextRand(s));
    ev.push({type:'deckCopy', seat, count:D.length, src}); return; }
  if(e.type==='mindCopy'){                                       // v109 정신의 창조술사: 상대 덱의 무작위 카드 1장을 복사해 내 손으로 (상대 덱은 그대로)
    const D=s.seats[other(seat)].deck, P=s.seats[seat];
    if(!D.length){ ev.push({type:'ignored', seat, src}); return; }
    const card=structuredClone(D[Math.floor(nextRand(s)*D.length)]); card.id=s.nextId++; delete card.inDeck; delete card.auto;
    const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
    ev.push({type:'generated', seat, name:card.name, burned, src, ...(burned?{card}:{})}); return; }
  if(e.type==='alana'){                                          // v108 용소환사 알라나: 이번 게임에 시전한 비용 min 이상 주문 수(castHist, 카드 원래 비용 기준)만큼 5/5 용 소환 (빈 자리만큼만)
    const n=(s.seats[seat].castHist||[]).filter(x=>x.cost>=e.min).length;
    if(!n || freeSlots(s, seat)<=0){ ev.push({type:'ignored', seat, src}); return; }
    summonTokens(s, seat, n, DRAGON, ev); return; }
  if(e.type==='doubleHand'){                                     // v106 에메리스: 내 손의 모든 하수인 공격력·생명력 2배
    const mins=s.seats[seat].hand.filter(x=>x.type==='minion');
    if(!mins.length){ ev.push({type:'ignored', seat, src}); return; }
    for(const x of mins){ x.atk*=2; x.hp*=2; }
    ev.push({type:'handDouble', seat, count:mins.length, src}); return; }
  if(e.type==='parrot'){                                         // v106 회색 현자 앵무새: 내가 마지막으로 시전한 비용 min 이상 주문을 반복
    const hist=s.seats[seat].castHist||[]; let pick=null;
    for(let i=hist.length-1;i>=0;i--) if(hist[i].cost>=e.min){ pick=hist[i]; break; }
    if(!pick){ ev.push({type:'ignored', seat, src}); return; }
    autoCastMany(s, seat, [structuredClone(pick)], ev, m.name); return; }
  if(e.type==='spellHunt'){                                      // v106 주문사수: 무작위 주문 획득, 내 손패가 상대 손패보다 적으면 계속 반복
    const P=s.seats[seat], O=s.seats[other(seat)], pool=spellPool({}).filter(x=>!x.generatedOnly);
    if(!pool.length){ ev.push({type:'ignored', seat, src}); return; }
    for(let i=0;i<30;i++){
      const x=pool[Math.floor(nextRand(s)*pool.length)], copy={...x, id:s.nextId++}, burned=P.hand.length>=handMax(P);
      if(!burned) P.hand.push(copy);
      ev.push({type:'generated', seat, name:x.name, burned, src, ...(burned?{card:copy}:{})});
      if(!(P.hand.length<O.hand.length)) break;
    }
    return; }
  if(e.type==='drawSpellArmor'){                                 // v106 깊은물 기원사: 덱에서 주문을 뽑고 그 비용만큼 방어도
    const P=s.seats[seat], idx=P.deck.map((c,k)=>c.type==='spell'?k:-1).filter(k=>k>=0);
    if(!idx.length){ ev.push({type:'ignored', seat, src}); return; }
    const c=P.deck.splice(idx[Math.floor(nextRand(s)*idx.length)],1)[0], burned=P.hand.length>=handMax(P);
    if(!burned) P.hand.push(c);
    ev.push({type:'draw', seat, count:burned?0:1, burned:burned?1:0, src, ...(burned?{burnedCards:[c]}:{})});
    if(c.cost>0){ P.armor=(P.armor||0)+c.cost; ev.push({type:'armor', seat, amount:c.cost, src}); }
    return; }
  if(e.type==='frostWarden'){                                    // v106 바르덴 던그래스프: 적 하수인 빙결, 이미 빙결이면 피해
    const fo=other(seat), foes=[...s.seats[fo].board];
    if(!foes.length){ ev.push({type:'ignored', seat, src}); return; }
    for(const t of foes){ if(t.frozen) hurtMinion(s, fo, t, e.value, ev, 'battlecry', src); else { t.frozen=true; ev.push({type:'freeze', target:minionT(fo, t.id), name:t.name, src}); } }
    return; }
  if(e.type==='bloodDiscover'){                                  // v78 혈기술사: 시체가 모자라면 발견하지 못한다
    if(!spendCorpses(s, seat, e.corpses, ev, src)){ ev.push({type:'ignored', seat, src}); return; }
    startBloodDiscover(s, seat, e, ev, src, false); return; }
  if(e.type==='bloodDrain'){                                     // v78 그훈: 생명력이 가장 낮은 적에게서 1씩 6번 (적 영웅 방어도가 막은 만큼은 못 가져옴) → 가져온 만큼 내 영웅 회복, 낸 혈기 룬 수만큼 강화
    const fo=other(seat), F=s.seats[fo]; let taken=0;
    for(let i=0;i<e.value;i++){
      const t=lowestFoe(s, seat);
      if(t.kind==='hero'){ const b=F.hp; hurtHero(s, fo, 1, ev, 'battlecry', src); taken+=Math.max(0, b-F.hp); }
      else { const d=findMinion(s, fo, t.id), sh=d.shield; hurtMinion(s, fo, d, 1, ev, 'battlecry', src); if(!sh) taken++; }
    }
    increaseLife(s, seat, taken, ev, src);
    const n=s.seats[seat].bloodRunes||0;
    if(n>0){ m.atk+=n; m.hp+=n; m.maxHp+=n; ev.push({type:'buff', target:minionT(seat, m.id), name:m.name, value:n, src}); }
    return; }
  if(e.type==='kuhn'){                                           // v81 잊힌 왕 쿤: 선택 — 방어도 +10 / 마나 수정 모두 회복
    const options=[{type:'spell',name:'방어도 +10',cost:0,sub:true,effect:{type:'choiceArmor',value:10}},{type:'spell',name:'마나 수정 모두 회복',cost:0,sub:true,effect:{type:'choiceRefill'}}];
    s.pending={kind:'choice',seat,options,src}; ev.push({type:'choiceWait',seat,name:m.name}); return; }
  if(e.type==='armorCry'){ const P=s.seats[seat]; P.armor=(P.armor||0)+e.value; ev.push({type:'armor', seat, amount:e.value, src}); return; }   // v80 지저왕
  if(e.type==='malakor'){                                          // v97: 덱의 모든 카드 → 무작위 혈기 룬 카드, 비용 -1
    const P=s.seats[seat], bag=CARD_POOL.filter(c=>runeOf(c).includes('혈기') && !c.generatedOnly && !c.fatigue); let n=0;
    if(!bag.length || !P.deck.length){ ev.push({type:'ignored', seat, src}); return; }
    P.deck=P.deck.map(x=>{ const y=structuredClone(bag[Math.floor(nextRand(s)*bag.length)]); const z={...y, id:x.id, cost:Math.max(0, y.cost-1)}; delete z.lifeCost; if(x.inDeck) z.inDeck=true; n++; return z; });
    ev.push({type:'deckTransform', seat, count:n, src}); return; }
  if(e.type==='valtora'){ const P=s.seats[seat]; P.leechMom=(P.leechMom||0)+1; ev.push({type:'ignored', seat, src, note:'valtora'}); return; }   // v97: 이후 혈기 룬 카드를 낼 때마다 거머리
  if(e.type==='originator'){                                       // v97 시초자: 하수인 제거 → 공격력+생명력 만큼 생명력 증가
    const t=target, d=t && t.kind==='minion' ? findMinion(s, t.seat, t.id) : null;
    if(!d || d.hp<=0){ ev.push({type:'ignored', seat, src}); return; }
    const gain=Math.max(0,d.atk)+Math.max(0,d.hp);
    ev.push({type:'damage', target:minionT(t.seat, d.id), name:d.name, amount:d.hp, absorbed:false, cause:'battlecry', src}); d.hp=0;
    sweepDead(s, ev); increaseLife(s, seat, gain, ev, src); return; }
  if(e.type==='yodel'){
    const sm=[]; let any=false;
    for(const x of [...s.seats[seat].board]){ if(x.id===m.id || x.hp<=0 || !hasDeathFx(x)) continue; any=true; runDeath(s, seat, x, ev, sm); runDeath(s, seat, x, ev, sm); }
    if(!any){ ev.push({type:'ignored', seat, src}); return; }
    runSummons(s, seat, sm, ev); return; }
  if(e.type==='leechSummon'){ summonTokens(s, seat, e.count, LEECH, ev); return; }   // v76 흉측한 허물: 0/2 거머리 둘
  if(e.type==='repeatAll'){                                        // v116 두억시니: 이번 게임에 내가 손에서 낸 다른 전투의 함성 효과를 낸 순서대로 반복 (대상 무작위, 선택 대기 중이면 건너뜀)
    const P=s.seats[seat], list=(P.bcLog||[]).map(x=>structuredClone(x)), saved=m.effect;
    if(!list.length){ ev.push({type:'ignored', seat, src}); return; }
    for(const eff of list){
      if(s.seats[0].hp<=0 || s.seats[1].hp<=0) break;
      if(s.pending) continue;
      m.effect=eff; const ts=cardTargets(s, seat, m);
      battlecry(s, seat, m, ts.length ? ts[Math.floor(nextRand(s)*ts.length)] : null, ev); sweepDead(s, ev);
    }
    m.effect=saved; return; }
  if(e.type==='selfHurt'){ hurtHero(s, seat, e.value, ev, 'battlecry', src); return; }   // v113 부상당한 크발디르 (방어도가 먼저 흡수)
  if(e.type==='adjBuffCry'){                                       // 곰팡이술사: 양옆의 하수인 +value/+value
    const P=s.seats[seat], i=P.board.indexOf(m); let n=0;
    if(i>=0) for(const x of [P.board[i-1], P.board[i+1]]){ if(!x || x.hp<=0) continue; x.atk+=e.value; x.hp+=e.value; x.maxHp+=e.value; n++;
      ev.push({type:'buff', target:minionT(seat, x.id), name:x.name, value:e.value, hpValue:e.value, src}); }
    if(!n) ev.push({type:'ignored', seat, src}); return; }
  if(e.type==='decalCry'){                                         // 대사제 데칼: 내 영웅 생명력 1, 감소한 만큼 방어도
    const P=s.seats[seat], loss=Math.max(0, P.hp-1);
    if(!loss){ ev.push({type:'ignored', seat, src}); return; }
    P.hp=1; ev.push({type:'damage', target:heroT(seat), name:null, amount:loss, absorbed:false, armorAbsorbed:0, cause:'battlecry', src});
    P.armor=(P.armor||0)+loss; ev.push({type:'armor', seat, amount:loss, src}); return; }
  if(e.type==='bubbleCry'){                                        // 거품로봇: 내 다른 기계에게 보호막·도발
    const P=s.seats[seat]; let n=0;
    for(const x of P.board){ if(x===m || x.hp<=0 || !(x.tribe||'').includes('기계')) continue; x.shield=true; x.taunt=true; n++;
      ev.push({type:'shieldGain', target:minionT(seat, x.id), name:x.name, src}); }
    if(!n) ev.push({type:'ignored', seat, src}); return; }
  if(e.type==='hatchCry'){                                         // 부화장 도우미: 공격력 max 이하인 내 다른 하수인 +N/+N, 도발
    const P=s.seats[seat]; let n=0;
    for(const x of [...P.board]){ if(x===m || x.hp<=0 || x.atk>e.max) continue; x.atk+=e.value; x.hp+=e.value; x.maxHp+=e.value; x.taunt=true; n++;
      ev.push({type:'buff', target:minionT(seat, x.id), name:x.name, value:e.value, hpValue:e.value, src}); }
    if(!n) ev.push({type:'ignored', seat, src}); return; }
  if(e.type==='wormCry'){                                          // 오늘의 월척: 상대편에게 2/1 지렁이 소환
    const ids=summonTokens(s, other(seat), 1, {name:'지렁이', atk:2, hp:1, rush:false}, ev);
    if(!ids.length) ev.push({type:'ignored', seat, src}); return; }
  if(e.type==='spiritsCry'){                                       // 공격대장·공중급수체: 나무정령 소환
    const ids=summonTokens(s, seat, e.count, {name:'나무정령', atk:e.atk, hp:e.hp, rush:false}, ev);
    if(!ids.length) ev.push({type:'ignored', seat, src}); return; }
  if(e.type==='machinesCry'){                                      // 깔깔대는 발명가: 도발·보호막 1/2 기계 count 기 소환
    const ids=summonTokens(s, seat, e.count, MACHINE, ev);
    if(!ids.length) ev.push({type:'ignored', seat, src}); return; }
  if(e.type==='stoneCry'){                                         // v113 돌장인: 이번 게임 동안 내 토템들이 공격력 +value (손·덱·전장, 이후 소환·획득하는 토템도)
    const P=s.seats[seat], isT=c=>(c.tribe||'').includes('토템'); P.totemAtk=(P.totemAtk||0)+e.value; let hd=0;
    for(const c of [...P.hand, ...P.deck]) if(c.type==='minion' && isT(c)){ const d=P.totemAtk-(c.tb||0); if(d>0){ c.atk+=d; c.tb=P.totemAtk; hd++; } }
    for(const y of P.board) if(y!==m && y.hp>0 && isT(y)){ const d=P.totemAtk-(y.tb||0); if(d>0){ y.atk+=d; y.tb=P.totemAtk; ev.push({type:'buff', target:minionT(seat, y.id), name:y.name, value:d, hpValue:0, src}); } }
    ev.push({type:'totemAtk', seat, amount:e.value, count:hd, src}); return; }
  if(e.type==='stormCry'){                                         // v113 칼바람 폭풍소환사: 내 전장에 토템 4기 이상이면 바람의 군주 알아키르 소환
    const P=s.seats[seat], n=P.board.filter(x=>x!==m && x.hp>0 && (x.tribe||'').includes('토템')).length;
    if(n<e.need || P.board.length>=CONFIG.MAX_BOARD){ ev.push({type:'ignored', seat, src}); return; }
    summonTokens(s, seat, 1, {name:'바람의 군주 알아키르', atk:3, hp:6, taunt:true, rush:false, extra:{cost:8, tribe:'정령', windfury:true, charge:true, shield:true}}, ev); return; }
  if(e.type==='deckBuff'){                                         // v113 공작 켈레세스: 내 덱의 모든 하수인 +value/+value
    let n=0; for(const x of s.seats[seat].deck) if(x.type==='minion'){ x.atk+=e.value; x.hp+=e.value; n++; }
    if(!n){ ev.push({type:'ignored', seat, src}); return; }
    ev.push({type:'deckBuff', seat, count:n, amount:e.value, src}); return; }
  if(e.type==='snitch'){                                           // v112 비겁한 밀고자: 상대가 손에서 무작위 하수인을 소환 (전투의 함성은 발동하지 않음)
    const fo=other(seat), O=s.seats[fo], mins=O.hand.filter(x=>x.type==='minion');
    if(!mins.length || O.board.length>=CONFIG.MAX_BOARD){ ev.push({type:'ignored', seat, src}); return; }
    const pick=mins[Math.floor(nextRand(s)*mins.length)], bf=(O.mods&&O.mods.buff)||0;
    O.hand=O.hand.filter(x=>x.id!==pick.id);
    const mm={...pick, maxHp:pick.hp+bf, hp:pick.hp+bf, attacked:false, summoned:true}; for(const k of ['lifeCost','auto','inDeck','echoTemp','effect']) delete mm[k]; cheatMinion(O, mm);
    O.board.push(mm); ev.push({type:'summon', seat:fo, id:mm.id, name:mm.name, src}); return; }
  if(e.type==='deathwing'){                                        // v112 데스윙: 다른 모든 하수인 처치(보호막 무시, 환생은 평소대로) + 내 손패 모두 버림
    for(const sd of [other(seat), seat]) for(const x of s.seats[sd].board){
      if(x.id===m.id || x.hp<=0) continue;
      const amt=x.hp; x.shield=false; x.hp=0;
      ev.push({type:'damage', target:minionT(sd, x.id), name:x.name, amount:amt, absorbed:false, cause:'battlecry', src}); }
    const P=s.seats[seat], n=P.hand.length; P.hand=[];
    ev.push({type:'discard', seat, count:n, src}); return; }
  if(e.type==='pyroar'){                                           // v112 광염의 피락: 비용 합이 정확히 total 이 되도록 무작위 화염 주문을 골라, 무작위 적(영웅·하수인)에게 차례로 시전
    const pool=spellPool({school:'화염', skip:CHAOS_SKIP}).filter(x=>!x.generatedOnly && x.cost>=1), list=[]; let r=e.total;
    while(r>0 && list.length<30){ const cs=pool.filter(x=>x.cost<=r); if(!cs.length) break; const sp=cs[Math.floor(nextRand(s)*cs.length)]; list.push(structuredClone(sp)); r-=sp.cost; }
    if(!list.length){ ev.push({type:'ignored', seat, src}); return; }
    autoCastMany(s, seat, list, ev, m.name, 'only'); return; }
  if(e.type==='discoverCost'){ startCostDiscover(s, seat, e, ev, src, !!s.pending); return; }   // v112
  if(e.type==='avalancheFreeze'){                                  // v116 눈사태 수호자: 나를 제외한 모든 하수인(양쪽) 빙결
    let n=0;
    for(const sd of [other(seat), seat]) for(const t of s.seats[sd].board){ if(t===m || t.id===m.id || t.hp<=0) continue; t.frozen=true; n++; ev.push({type:'freeze', target:minionT(sd, t.id), name:t.name, src}); }
    if(!n) ev.push({type:'ignored', seat, src}); return; }
  if(e.type==='tauntDiscoverBc'){                                  // v114 겁에 질린 조합원: 도발 하수인 발견 (이미 선택 대기 중이면 무작위로 바로 고른다)
    startTauntDiscover(s, seat, {atk:0, hp:0}, ev, src, !!s.pending); return; }
  if(e.type==='copyDragons'){                                      // v114 대장군 분: 내 손의 모든 용족 하수인을 복사해 손으로 (손패가 가득이면 소각)
    const P=s.seats[seat], ds=P.hand.filter(x=>x.type==='minion' && (x.tribe||'').includes('용족'));
    if(!ds.length){ ev.push({type:'ignored', seat, src}); return; }
    for(const d of ds){
      const cp=structuredClone(d); for(const k of ['inDeck','auto','echoTemp']) delete cp[k]; cp.id=s.nextId++;
      const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(cp);
      ev.push({type:'generated', seat, name:cp.name, burned, src, ...(burned?{card:cp}:{})});
    }
    return; }
  if(e.type==='comboDraw'){                                        // v113 엘프 음악가 연계: 이 카드 앞에 이번 턴 다른 카드를 냈다면 덱에서 하수인 count장을 뽑는다 (덱에 모자라면 있는 만큼, 탈진 없음)
    const P=s.seats[seat], tp=P.turnPlays||[];
    if(!(tp.length>=2 && tp[tp.length-1].name===m.name)){ ev.push({type:'ignored', seat, src}); return; }
    let drawn=0, burned=0; const bcards=[];
    for(let i=0;i<e.count;i++){
      const idx=P.deck.map((c,k)=>c.type==='minion'?k:-1).filter(k=>k>=0); if(!idx.length) break;
      const c=P.deck.splice(idx[Math.floor(nextRand(s)*idx.length)],1)[0];
      if(P.hand.length<handMax(P)){ P.hand.push(c); drawn++; } else { burned++; bcards.push(c); }
    }
    if(drawn||burned) ev.push({type:'draw', seat, count:drawn, burned, src, ...(burned?{burnedCards:bcards}:{})}); else ev.push({type:'ignored', seat, src});
    return; }
  if(e.type==='faceCollector'){                                    // v112 얼굴 수집가: 비용 min 이상 무작위 하수인을 손으로, 그 비용 -discount (최소 0). 손패가 가득이면 소각
    const P=s.seats[seat], pool=CARD_POOL.filter(x=>x.type==='minion' && x.cost>=e.min && !x.generatedOnly);
    if(!pool.length){ ev.push({type:'ignored', seat, src}); return; }
    const base=pool[Math.floor(nextRand(s)*pool.length)], card={...structuredClone(base), id:s.nextId++}; delete card.inDeck;
    card.cost=Math.max(0, card.cost-e.discount);
    const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
    ev.push({type:'generated', seat, name:card.name, burned, src, ...(burned?{card}:{})}); return; }
  if(e.type==='peaceDraw'){                                        // v103 여름의 평화수호자: 덱에서 비용 min 이상인 카드를 무작위로 count장 뽑고 비용 -discount (덱에 모자라면 있는 만큼, 탈진 없음)
    const P=s.seats[seat]; let drawn=0, burned=0; const bcards=[];
    for(let i=0;i<e.count;i++){
      const idx=P.deck.map((c,k)=>c.cost>=e.min?k:-1).filter(k=>k>=0); if(!idx.length) break;
      const c=P.deck.splice(idx[Math.floor(nextRand(s)*idx.length)],1)[0]; c.cost=Math.max(0, c.cost-e.discount);
      if(P.hand.length<handMax(P)){ P.hand.push(c); drawn++; } else { burned++; bcards.push(c); }
    }
    if(drawn||burned) ev.push({type:'draw', seat, count:drawn, burned, src, ...(burned?{burnedCards:bcards}:{})}); else ev.push({type:'ignored', seat, src});
    return; }
  if(e.type==='natureCast'){                                       // v104 재생의 드루이드: 무작위 자연 주문을 count번 시전 (대상도 무작위, 불발 가능)
    const pool=spellPool({school:'자연', skip:CHAOS_SKIP}), list=[];
    for(let i=0;i<e.count && pool.length;i++) list.push(pool[Math.floor(nextRand(s)*pool.length)]);
    if(!list.length){ ev.push({type:'ignored', seat, src}); return; }
    autoCastMany(s, seat, list, ev, m.name); return; }
  if(e.type==='crystalBuff'){                                      // v104 토이란투스: 마나 수정이 need개면 +value/+value
    if(s.seats[seat].maxMana<e.need){ ev.push({type:'ignored', seat, src}); return; }
    m.atk+=e.value; m.hp+=e.value; m.maxHp+=e.value;
    ev.push({type:'buff', target:minionT(seat, m.id), name:m.name, value:e.value, hpValue:e.value, src}); return; }
  if(e.type==='draw'){ drawCards(s, seat, e.value, ev, src); return; }
  if(e.type==='sweep'){
    const foes=[...s.seats[other(seat)].board];
    if(!foes.length){ ev.push({type:'ignored', seat, src}); return; }
    foes.forEach(t=>hurtMinion(s, other(seat), t, e.value, ev, 'battlecry', src));
    return;
  }
  if(e.type==='scatter'){                                      // v65 신비한 양초맨: 피해 1씩 e.value 번, 적 영웅·적 하수인 중 무작위. 생명력 흡수 적용(보호막이 막으면 회복 없음)
    const fo=other(seat);
    for(let i=0;i<e.value;i++){
      const alive=s.seats[fo].board.filter(x=>x.hp>0), k=Math.floor(nextRand(s)*(alive.length+1));
      if(k===alive.length){ hurtHero(s, fo, 1, ev, 'battlecry', src); lifestealHeal(s, seat, m, 1, ev); }
      else { const t=alive[k], sh=t.shield; hurtMinion(s, fo, t, 1, ev, 'battlecry', src); if(!sh) lifestealHeal(s, seat, m, 1, ev); }
    }
    return;
  }
  if(e.type==='gainMana'){ s.seats[seat].mana+=e.value; ev.push({type:'mana', seat, amount:e.value, src}); return; }
  if(e.type==='manastorm'){                                    // v74 교도소 마나스톰
    s.seats[seat].stormCount=(s.seats[seat].stormCount||0)+1; ev.push({type:'storm', seat, src}); return;
  }
  if(e.type==='spellTax'){                                     // v75 로데브: 상대의 다음 턴 주문 비용 +N
    const O=s.seats[other(seat)]; O.taxNext=(O.taxNext||0)+e.value; ev.push({type:'spellTax', seat:other(seat), amount:e.value, src}); return;
  }
  if(e.type==='revealSummon'){                                 // v75 원한 맺힌 소환사: 내 덱의 주문 하나를 공개(덱에는 그대로 남음), 같은 비용의 무작위 하수인 소환
    const sp=s.seats[seat].deck.filter(x=>x.type==='spell');
    if(!sp.length){ ev.push({type:'ignored', seat, src}); return; }
    const pick=sp[Math.floor(nextRand(s)*sp.length)];
    ev.push({type:'reveal', seat, name:pick.name, cost:pick.cost, src});
    summonSameCost(s, seat, pick.cost, ev, src); return;
  }
  if(e.type==='recastLog'){                                    // v56 롬메스: 시작 덱에 없던 주문 중 손패에서 낸 것을, 낸 순서·횟수대로 다시 시전
    const log=(s.seats[seat].castLog||[]).map(x=>structuredClone(x));
    if(!log.length){ ev.push({type:'ignored', seat, src}); return; }
    autoCastMany(s, seat, log, ev, m.name); return;
  }
  if(e.type==='healHoly'){                                     // v59: 대상(내 영웅·내 하수인) 체력 회복 + 무작위 신성 주문 1장을 손패로 (손패가 가득이면 소각)
    if(target) battlecry(s, seat, {name:m.name, effect:{type:'heal', value:e.value}}, target, ev);
    const P=s.seats[seat], pool=spellPool({school:'신성'}).filter(x=>!x.generatedOnly);
    if(pool.length){
      const x=pool[Math.floor(nextRand(s)*pool.length)], copy={...x, id:s.nextId++}, burned=P.hand.length>=handMax(P);
      if(!burned) P.hand.push(copy);
      ev.push({type:'generated', seat, name:x.name, burned, src,...(burned?{card:copy}:{})});
    }
    return;
  }
  if(e.type==='seedDeck'){                                     // v57: 무작위 주문(전체 주문풀, 중복 가능)을 덱에 섞어 넣는다. 생성된 카드라 inDeck 표시 없음
    const P=s.seats[seat], pool=spellPool({});
    for(let i=0;i<e.value;i++){ const x=pool[Math.floor(nextRand(s)*pool.length)]; P.deck.push({...x, id:s.nextId++}); }
    shuffle(P.deck, ()=>nextRand(s));
    ev.push({type:'deckAdd', seat, count:e.value, src}); return;
  }
  if(e.type==='recycle'){                                      // v57: 손패 → 덱에 섞기 → 덱 전체 비용 감소(최소 0, 방금 섞은 카드 포함) → 뽑기
    const P=s.seats[seat], n=P.hand.length;
    if(n){ P.deck.push(...P.hand); P.hand=[]; }
    for(const d of P.deck) d.cost=Math.max(0, d.cost-e.value);
    shuffle(P.deck, ()=>nextRand(s));
    ev.push({type:'recycle', seat, count:n, amount:e.value, src});
    drawCards(s, seat, e.draw, ev, src); return;
  }
  if(e.type==='yogg'){                                         // v56 요그사론: 내가 손패에서 낸 주문 수만큼 무작위 주문 (혼돈의 주문서는 뽑히지 않음)
    const n=s.seats[seat].spellCount||0;
    if(!n){ ev.push({type:'ignored', seat, src}); return; }
    const pool=spellPool({skip:CHAOS_SKIP}), list=[];
    for(let i=0;i<n;i++) list.push(pool[Math.floor(nextRand(s)*pool.length)]);
    autoCastMany(s, seat, list, ev, m.name); return;
  }
  if(!target){ ev.push({type:'ignored', seat, src}); return; }
  if(e.type==='devour'){                                           // v112 허기진 포식자: 적 하수인을 잡아먹고(보호막 무시) 능력치를 얻는다. 주입되었으면 양옆 하수인도
    const t2=target.kind==='minion' ? findMinion(s, target.seat, target.id) : null;
    if(!t2 || t2.hp<=0){ ev.push({type:'ignored', seat, src}); return; }
    const B=s.seats[target.seat].board, i=B.indexOf(t2), vs=[t2];
    if(m.infused){ if(B[i-1] && B[i-1].hp>0) vs.unshift(B[i-1]); if(B[i+1] && B[i+1].hp>0) vs.push(B[i+1]); }
    let ga=0, gh=0;
    for(const d of vs){ ga+=Math.max(0,d.atk); gh+=Math.max(0,d.hp);
      ev.push({type:'damage', target:minionT(target.seat, d.id), name:d.name, amount:d.hp, absorbed:false, cause:'battlecry', src}); d.shield=false; d.hp=0; }
    if(ga||gh){ m.atk+=ga; m.hp+=gh; m.maxHp+=gh; ev.push({type:'buff', target:minionT(seat, m.id), name:m.name, value:ga, hpValue:gh, src}); }
    sweepDead(s, ev); return; }
  if(e.type==='sleetFreeze'){                                    // v106 진눈깨비 스케이터: 적 하수인 빙결, 그 공격력만큼 방어도
    const t2=target.kind==='minion' ? findMinion(s, target.seat, target.id) : null;
    if(!t2){ ev.push({type:'ignored', seat, src}); return; }
    t2.frozen=true; ev.push({type:'freeze', target, name:t2.name, src});
    if(t2.atk>0){ const P=s.seats[seat]; P.armor=(P.armor||0)+t2.atk; ev.push({type:'armor', seat, amount:t2.atk, src}); }
    return; }
  if(e.type==='damage'){
    if(target.kind==='hero') hurtHero(s, target.seat, e.value, ev, 'battlecry', src);
    else { const t=findMinion(s, target.seat, target.id); if(t) hurtMinion(s, target.seat, t, e.value, ev, 'battlecry', src);
      if(t && m.crowley && target.seat!==seat && t.hp<=0 && m.hp>0){ m.atk+=m.crowley; m.hp+=m.crowley; m.maxHp+=m.crowley;   // 기사대장: 전투의 함성으로 적 하수인을 처치해도 +N/+N
        ev.push({type:'buff', target:minionT(seat, m.id), name:m.name, value:m.crowley, hpValue:m.crowley, src:{seat, name:m.name}}); } }
  } else if(e.type==='heal'){
    if(target.kind==='hero'){
      const P=s.seats[target.seat]; const before=P.hp;
      P.hp=Math.min(P.maxHp ?? CONFIG.HERO_HP, P.hp+e.value);
      ev.push({type:'heal', target, name:null, amount:P.hp-before, src});
    } else {
      const t=findMinion(s, target.seat, target.id);
      if(t){ const before=t.hp; t.hp=Math.min(t.maxHp, t.hp+e.value);
        ev.push({type:'heal', target, name:t.name, amount:t.hp-before, src}); }
    }
  } else if(e.type==='shieldCry'){
    const t=findMinion(s, target.seat, target.id);
    if(t){ t.shield=true; ev.push({type:'shieldGain', target, name:t.name, src}); }
  } else if(e.type==='buff'){
    const t=findMinion(s, target.seat, target.id);
    if(t){ t.atk+=e.value; t.hp+=e.value; t.maxHp+=e.value;
      ev.push({type:'buff', target, name:t.name, value:e.value, src}); }
  }
}

// ---- 주문 ----
// 피해·회복·드로우는 전투의 함성과 같은 처리를 쓰고(이름만 주문 이름), 침묵·보호막 부여는 여기서 직접 처리한다.
function castSpell(s, seat, c, target, ev){
  const fx=SPELL_FX[c.effect.type];
  if(!c.sub && c.effect.type!=='mana'){ const P0=s.seats[seat]; for(const sc of (c.school||[])) if(!(P0.schoolsCast=P0.schoolsCast||[]).includes(sc)) P0.schoolsCast.push(sc); }   // v106 시프: 시전한 주문의 속성 종류
  if(fx && fx.cast) fx.cast(s, seat, c, target, ev, {seat, name:c.name, spell:true, school:c.school});   // v105: spell 표시 → 성게 가시(독성) 판정
  if(c.overload){ const P=s.seats[seat]; P.overloadNext=(P.overloadNext||0)+c.overload; ev.push({type:'overload', seat, name:c.name, amount:c.overload}); }   // v29 과부하: 다음 턴 마나 수정 N개가 잠긴다
  if(c.twin) twinCopy(s, seat, c, ev); spellTrigger(s, seat, c, ev); spellburstFire(s, seat, c, ev); weaverTrigger(s, seat, c, target, ev);          // v28 이중 주문: 시전될 때마다(손에서 낸 것·혼돈·일식의 두 번째 시전 모두) 이중 주문이 없는 사본이 손패에 들어온다. 손패가 가득이면 소각
}
function twinCopy(s, seat, c, ev){
  const base=CARD_POOL.find(x=>x.name===c.name) || c, P=s.seats[seat];
  const copy={...base, cost:c.cost, id:s.nextId++}; delete copy.twin; delete copy.auto;
  const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(copy);
  ev.push({type:'twin', seat, name:c.name, burned,...(burned?{card:copy}:{})});
}
// v28 일식의 두 번째 시전: 첫 시전(과 그 발견)이 끝나면 호출된다. 대상이 필요하면 선택 대기(kind:'target')를 만들고 플레이어가 TARGET 으로 고른다
function resolveRecast(s, ev){
  const rc=s.recast; if(!rc || s.pending) return;
  s.recast=null;
  const {seat, card}=rc, P=s.seats[seat];
  if(s.seats[0].hp<=0 || s.seats[1].hp<=0) return;
  const fx=SPELL_FX[card.effect.type], ts=cardTargets(s, seat, card);
  ev.push({type:'recast', seat, name:card.name});
  const fizzle=(fx.needsTarget && ts.length===0) || (fx.blocked && fx.blocked(s, seat)) || (card.effect.type==='recall' && P.hand.length>=handMax(P));
  if(fizzle){ ev.push({type:'ignored', seat, fizzle:true, src:{seat, name:card.name}}); return; }
  if(ts.length){ s.pending={kind:'target', seat, card, targets:ts}; ev.push({type:'targetWait', seat, name:card.name}); return; }
  castSpell(s, seat, card, null, ev);
}

// ---- 검증: 오류 문자열 또는 null(합법) ----
function validate(s, a, actor){
  if(!a || typeof a!=='object') return '잘못된 행동입니다.';
  if(s.over) return '게임이 끝났습니다.';
  if(a.type==='SURRENDER') return null;          // 항복은 어느 시점이든 가능. legalActions 에는 넣지 않는다 (봇은 항복하지 않음)
  if(actor!==s.turn) return '상대 턴입니다.';
  if(s.pending && s.pending.kind==='target'){      // v28 일식의 두 번째 대상 선택 중에는 TARGET 만 가능
    if(a.type!=='TARGET') return '먼저 두 번째 시전의 대상을 선택해야 합니다.';
    if(s.pending.seat!==actor || !a.target || !s.pending.targets.some(t=>tkey(t)===tkey(a.target))) return '올바른 대상을 선택해야 합니다.';
    return null;
  }
  if(s.pending){                                  // 발견 선택 중에는 CHOOSE 만 가능
    if(a.type!=='CHOOSE') return '먼저 발견할 카드를 선택해야 합니다.';
    if(s.pending.seat!==actor || !Number.isInteger(a.index) || !s.pending.options[a.index]) return '잘못된 선택입니다.';
    return null;
  }
  if(a.type==='CHOOSE' || a.type==='TARGET') return '선택할 것이 없습니다.';
  const P=s.seats[actor], O=s.seats[other(actor)];
  switch(a.type){
    case 'END_TURN': return null;
    case 'PLAY_CARD': {
      const c=P.hand.find(x=>x.id===a.cardId);
      if(!c) return '손패에 없는 카드입니다.';
      if(c.lifeCost ? P.hp<=effCost(P,c) : effCost(P,c)>P.mana) return c.lifeCost ? '체력이 부족합니다.' : '마나가 부족합니다.';   // 생명력 비용은 죽을 만큼은 낼 수 없다
      if(c.type!=='spell' && P.board.length>=CONFIG.MAX_BOARD) return '전장이 가득 찼습니다.';   // 하수인만 전장 자리 필요
      const ts=cardTargets(s, actor, c);
      if(ts.length===0){
        if(needsTarget(c)) return '대상이 될 수 있는 하수인이 없습니다.';   // 대상이 필수인 주문
        if(c.type==='spell'){ const b=SPELL_FX[c.effect.type].blocked; const why=b && b(s, actor); if(why) return why; }   // 광역 주문 등 '지금 쓰면 낭비'인 경우
        return a.target ? '대상이 필요 없는 카드입니다.' : null;
      }
      if(!a.target || !ts.some(t=>tkey(t)===tkey(a.target))) return '올바른 대상을 선택해야 합니다.';
      return null;
    }
    case 'ATTACK': {
      const m=P.board.find(x=>x.id===a.attackerId);
      if(!m) return '내 하수인이 아닙니다.';
      if(m.summoned && !m.charge && !m.rush) return '소환 직후에는 공격할 수 없습니다.';   // 속공(rush): 낸 턴에는 하수인만 공격 가능
      if(m.atk<=0) return '공격력이 0인 하수인은 공격할 수 없습니다.';
      if(m.attacked) return '이미 공격했습니다.';
      if(m.frozen) return '얼어 있어 공격할 수 없습니다.';
      if(m.needArmor && (P.armor||0)<m.needArmor) return `방어도가 ${m.needArmor} 이상일 때에만 공격할 수 있습니다.`;   // v103 강철나무 골렘
      const t=a.target;
      if(!t || t.seat!==other(actor)) return '공격 대상이 올바르지 않습니다.';
      const taunts=P.board.some(x=>x.ignoreTaunt && x.hp>0) ? [] : O.board.filter(x=>x.taunt && !x.stealth);   // v103 카인 선퓨리
      if(t.kind==='hero'){
        if(m.summoned && !m.charge) return '속공 하수인은 낸 턴에 영웅을 공격할 수 없습니다.';
        return taunts.length ? '도발 하수인을 먼저 공격해야 합니다.' : null;
      }
      if(t.kind==='minion'){
        const d=O.board.find(x=>x.id===t.id);
        if(!d) return '존재하지 않는 대상입니다.';
        if(d.stealth) return '은신한 하수인은 공격할 수 없습니다.';
        if(taunts.length && !d.taunt) return '도발 하수인을 먼저 공격해야 합니다.';
        return null;
      }
      return '공격 대상이 올바르지 않습니다.';
    }
    case 'HERO_ATTACK': {                                  // v80 영웅 공격: 영웅 공격력이 있을 때 턴마다 한 번
      if(!(P.heroAtk>0)) return '영웅에게 공격력이 없습니다.';
      if(P.heroAttacked) return '영웅은 이미 공격했습니다.';
      const t=a.target;
      if(!t || t.seat!==other(actor)) return '공격 대상이 올바르지 않습니다.';
      const taunts=P.board.some(x=>x.ignoreTaunt && x.hp>0) ? [] : O.board.filter(x=>x.taunt && !x.stealth);
      if(t.kind==='hero') return taunts.length ? '도발 하수인을 먼저 공격해야 합니다.' : null;
      if(t.kind==='minion'){
        const d=O.board.find(x=>x.id===t.id);
        if(!d) return '존재하지 않는 대상입니다.';
        if(d.stealth) return '은신한 하수인은 공격할 수 없습니다.';
        if(taunts.length && !d.taunt) return '도발 하수인을 먼저 공격해야 합니다.';
        return null;
      }
      return '공격 대상이 올바르지 않습니다.';
    }
    default: return '알 수 없는 행동입니다.';
  }
}

// ---- 합법 행동 목록 (서버 검증·봇·클라이언트 하이라이트 공통 사용 / AI 학습의 action mask 원천) ----
function legalActions(s, actor){
  if(s.over || s.turn!==actor) return [];
  if(s.pending) return s.pending.kind==='target' ? s.pending.targets.map(t=>({type:'TARGET', target:t})) : s.pending.options.map((_,i)=>({type:'CHOOSE', index:i}));
  const P=s.seats[actor], O=s.seats[other(actor)], out=[];
  for(const c of P.hand){
    const ts=cardTargets(s, actor, c);
    for(const t of (ts.length ? ts : [null])){
      const a={type:'PLAY_CARD', cardId:c.id, target:t};
      if(!validate(s,a,actor)) out.push(a);
    }
  }
  const targets=[heroT(other(actor)), ...O.board.map(m=>minionT(other(actor), m.id))];
  for(const m of P.board) for(const t of targets){
    const a={type:'ATTACK', attackerId:m.id, target:t};
    if(!validate(s,a,actor)) out.push(a);
  }
  if(P.heroAtk>0 && !P.heroAttacked) for(const t of targets){ const a={type:'HERO_ATTACK', target:t}; if(!validate(s,a,actor)) out.push(a); }   // v80
  out.push({type:'END_TURN'});
  return out;
}

// ---- 핵심: 행동 적용. 입력 state 는 수정하지 않고 새 state 를 반환 ----
function apply(state, a, actor){
  const err=validate(state, a, actor);
  if(err) return {ok:false, error:err, state, events:[]};
  const s=structuredClone(state), ev=[], P=s.seats[actor];
  if(a.type==='PLAY_CARD'){
    const c=P.hand.find(x=>x.id===a.cardId);
    const baseCost=c.cost; c.cost=effCost(P,c);   // v74·v75: 지금 기준의 실제 비용을 확정 (하수인은 필드에 올릴 때 원래 비용으로 되돌림)
    if(c.lifeCost){ P.hp-=c.cost; ev.push({type:'damage', target:heroT(actor), name:null, amount:c.cost, absorbed:false, cause:'lifecost', src:{seat:actor, name:c.name}}); }   // 마나 대신 생명력 (방어 효과 무시)
    else P.mana-=c.cost;
    P.hand=P.hand.filter(x=>x.id!==c.id);
    { const pl=structuredClone(c); for(const k of ['id','inDeck','auto','lifeCost']) delete pl[k]; pl.cost=baseCost; (P.turnPlays=P.turnPlays||[]).push(pl); }   // v105 사스퀙: 이번 턴에 손에서 낸 카드 기록
    if(P.mods && (P.mods.bloodHeal || P.mods.frostArmor || P.mods.unholyCorpse)){   // v99 룬 치트: 손에서 낸 룬 카드마다 (카드 한 장당 한 번)
      const rn=runeOf(c), me={seat:actor};
      if(P.mods.bloodHeal && rn.includes('혈기')) increaseLife(s, actor, P.mods.bloodHeal, ev, {seat:actor, name:'혈기 가속'});
      if(P.mods.frostArmor && rn.includes('냉기')){ P.armor=(P.armor||0)+P.mods.frostArmor; ev.push({type:'armor', seat:actor, amount:P.mods.frostArmor, src:{seat:actor, name:'냉기 갑옷'}}); }
      if(P.mods.unholyCorpse && rn.includes('부정')){ P.corpses=(P.corpses||0)+P.mods.unholyCorpse; ev.push({type:'corpseGain', seat:actor, amount:P.mods.unholyCorpse, src:{seat:actor, name:'부정한 부활'}}); }
    }
    const momN=P.leechMom||0;   // v97 발토라: 이 카드를 내기 전에 이미 걸려 있던 효과만 (발토라 자신은 제외)
    if(c.rc && c.rc['혈기']) P.bloodRunes=(P.bloodRunes||0)+c.rc['혈기'];   // v78 그훈: 내가 손에서 낸 카드의 혈기 룬 수
    if(c.cost===1 && !(c.effect&&c.effect.type==='mana')){ const sn=structuredClone(c); for(const k of ['id','inDeck','auto','lifeCost']) delete sn[k]; (P.playedOnes=P.playedOnes||[]).push(sn); }   // v65 톨비르 대적용: 이번 게임에 손에서 낸 비용 1 카드
    if(c.type==='spell' && c.effect.type!=='mana') { (P.castAll=P.castAll||[]).push(c.name);
      const sn=structuredClone(c); for(const k of ['id','inDeck','auto','lifeCost']) delete sn[k]; const pb=CARD_POOL.find(x=>x.name===c.name); sn.cost=pb?pb.cost:baseCost;   // v69 시전한 모습 그대로(예: 커진 점화) 기록, 비용은 원래 비용
      const key=x=>x.name+JSON.stringify(x.effect); P.castCards=P.castCards||[]; if(!P.castCards.some(x=>key(x)===key(sn))) P.castCards.push(sn); }                                                               // v65 되감기용: 손에서 낸 주문 이름
    if(c.type==='spell'){
      // 주문: 전장에 남지 않고 효과만 적용된 뒤 사라진다. card 는 화면에서 "무슨 주문을 썼는지" 보여주기 위한 사본.
      ev.push({type:'spell', seat:actor, name:c.name, gain:c.effect.type==='mana'?c.effect.value:0, card:{type:c.type, name:c.name, cost:c.cost, lifeCost:c.lifeCost, effect:c.effect, twin:c.twin}});
      if(P.eclipse && c.effect.type!=='mana'){        // v28 일식: 손에서 낸 다음 주문(동전 제외)을 2번 시전 — 두 번째는 첫 시전이 끝난 뒤 resolveRecast 가 처리
        P.eclipse=false; s.recast={seat:actor, card:{...c}};
        ev.push({type:'eclipseUse', seat:actor, name:c.name});
      }
      P.spellCount=(P.spellCount||0)+1; if(c.effect.type!=='mana') P.lastSpellCost=c.cost;   // v74 교도소 마나스톰용
                      // v56 요그사론용: 손패에서 낸 주문 수 (동전 포함, 일식의 두 번째 시전·혼돈·롬메스·요그사론이 시전한 주문은 세지 않음)
      if(!c.inDeck){ (P.castLog=P.castLog||[]).push({type:'spell', name:c.name, cost:c.cost, school:c.school, runes:c.runes, overload:c.overload, effect:c.effect, twin:c.twin}); }   // v56 롬메스용: 시작 덱에 없던 주문 (같은 이름이어도 생성된 카드면 해당)
      if(P.mods && P.mods.spellCopy && P.copyTurn!==s.turnNo && c.effect.type!=='mana'){   // v99 치트 카드 복사: 매 턴 처음 쓰는 주문의 복사본 1장을 손패로 (가득이면 소각)
        P.copyTurn=s.turnNo;
        const cp=structuredClone(c); cp.id=s.nextId++; cp.cost=baseCost; delete cp.inDeck; delete cp.auto;
        const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(cp);
        ev.push({type:'generated', seat:actor, name:c.name, burned, src:{seat:actor, name:'카드 복사'}, ...(burned?{card:cp}:{})});
      }
      const sonyaN=(c.cost===1 && c.effect.type!=='mana') ? P.board.filter(x=>x.sonya && x.hp>0).length : 0;   // v112 소냐 워터댄서: 현재 비용이 1인 주문 (시전 전에 있던 소냐만)
      castSpell(s, actor, c, a.target, ev);
      if(c.echo){                                         // v112 주문의 잔상: 이번 턴에 같은 주문(원래 비용)을 한 장 더 낼 수 있다. 내 턴이 끝나면 사라진다
        const ec=structuredClone(c); for(const k of ['inDeck','auto','lifeCost','sub']) delete ec[k];
        ec.id=s.nextId++; ec.cost=baseCost; ec.echoTemp=true;
        if(P.hand.length<handMax(P)){ P.hand.push(ec); ev.push({type:'echoCopy', seat:actor, name:ec.name}); }
      }
      for(let i=0;i<sonyaN;i++){
        const sc=structuredClone(c); for(const k of ['inDeck','auto','sub','echoTemp']) delete sc[k];
        sc.id=s.nextId++; sc.cost=0;
        const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(sc);
        ev.push({type:'generated', seat:actor, name:sc.name, burned, src:{seat:actor, name:'소냐 워터댄서'}, ...(burned?{card:sc}:{})});
      }
    } else {
    const m={...c, maxHp:c.hp, attacked:false, summoned:true}; m.cost=baseCost;
    const bf=(P.mods&&P.mods.buff)||0;
    if(bf){ m.hp+=bf; m.maxHp+=bf; }
    cheatMinion(P, m);                                    // v98 돌진 부대·강철 갑옷·맹공
    P.freeMinion=0;                                       // v98 무료 첫 하수인은 이 턴에 한 번만
    P.board.push(m);
    ev.push({type:'summon', seat:actor, id:m.id, name:m.name});
    if(c.overload){ P.overloadNext=(P.overloadNext||0)+c.overload; ev.push({type:'overload', seat:actor, name:c.name, amount:c.overload}); }   // v113 토템 골렘: 하수인 과부하
    if(P.mods && P.mods.refund && nextRand(s)<P.mods.refund){ P.mana+=1; ev.push({type:'refund', seat:actor, name:m.name}); }   // v98 마나 환급
    if(P.mods && P.mods.legion && P.board.length<CONFIG.MAX_BOARD) summonTokens(s, actor, P.mods.legion, {name:'병사', atk:1, hp:1, rush:false}, ev);   // v98 군단: 하수인을 낼 때 1/1 병사 추가 (빈 자리가 있을 때)
    battlecry(s, actor, m, a.target, ev);
    if(m.effect && m.effect.type!=='repeatAll' && m.effect.type!=='repeatLast') (P.bcLog=P.bcLog||[]).push(structuredClone(m.effect));   // v116 두억시니: 이번 게임에 낸 전투의 함성 기록
    if(P.mods && P.mods.doubleBattlecry && m.effect){
      const t=a.target, alive = !t || t.kind==='hero' || (findMinion(s, t.seat, t.id)?.hp>0);
      if(alive && (t || NO_TARGET_FX.includes(m.effect.type))){ ev.push({type:'echo', seat:actor, name:m.name}); battlecry(s, actor, m, t, ev); }
    }
    if(c.mini && !c.isMini){                              // v106 미니미: 이 카드를 내면 1/1 비용 1 복사본(전투의 함성 유지)을 손패로
      const mc=structuredClone(c); for(const k of ['id','inDeck','auto','lifeCost','mini']) delete mc[k];
      mc.id=s.nextId++; mc.cost=1; mc.atk=1; mc.hp=1; mc.isMini=true; mc.name=c.name+' (미니)';
      const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(mc);
      ev.push({type:'generated', seat:actor, name:mc.name, burned, src:{seat:actor, name:c.name}, ...(burned?{card:mc}:{})});
    }
    if(c.echo){                                           // v112 잔상: 이번 턴에 이 카드를 또 낼 수 있도록 같은 카드(원래 비용)를 손패로. 내 턴이 끝나면 사라진다
      const ec=structuredClone(c); for(const k of ['inDeck','auto','lifeCost']) delete ec[k];
      ec.id=s.nextId++; ec.cost=baseCost; ec.echoTemp=true;
      if(P.hand.length<handMax(P)){ P.hand.push(ec); ev.push({type:'echoCopy', seat:actor, name:ec.name}); }
    }
    if(c.cost===1){                                       // v112 소냐 워터댄서: (현재 비용 기준) 비용 1 하수인을 낸 후, 그 하수인을 비용 0으로 복사해 얻는다 (소냐 한 명당 1장)
      const n=P.board.filter(x=>x.sonya && x.hp>0 && x.id!==m.id).length;
      for(let i=0;i<n;i++){
        const sc=structuredClone(c); for(const k of ['inDeck','auto','lifeCost','echoTemp']) delete sc[k];
        sc.id=s.nextId++; sc.cost=0;
        const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(sc);
        ev.push({type:'generated', seat:actor, name:sc.name, burned, src:{seat:actor, name:'소냐 워터댄서'}, ...(burned?{card:sc}:{})});
      }
    }
    { const pr=P.board.filter(x=>x.copyLow && x.hp>0 && x.id!==m.id && c.cost<=x.copyLow);   // 엘룬의 예언자: 손에서 비용 N 이하 하수인을 낸 후, 그 하수인을 복사해 소환 (전투의 함성은 발동 안 함)
      for(const x of pr){ if(P.board.length>=CONFIG.MAX_BOARD || m.hp<=0) break;
        const cp=structuredClone(m); cp.id=s.nextId++; cp.attacked=false; cp.summoned=true; cp.hp=Math.max(1,cp.hp); delete cp.auraGiven; delete cp.frozen;
        P.board.push(cp); ev.push({type:'summon', seat:actor, id:cp.id, name:cp.name, src:{seat:actor, name:x.name}}); } }
    }   // end 하수인
    if(momN && runeOf(c).includes('혈기') && s.seats[0].hp>0 && s.seats[1].hp>0) summonTokens(s, actor, momN, LEECH, ev);   // v97 발토라
  } else if(a.type==='ATTACK'){
    const m=P.board.find(x=>x.id===a.attackerId), t=a.target;
    if(t.kind==='hero'){
      ev.push({type:'attack', seat:actor, attackerId:m.id, name:m.name, target:t, targetName:null});
      if(m.onAttackCopy) attackCopy(s, actor, m, ev); if(m.onAttackBeast) attackBeast(s, actor, m, ev);
      const ma=dmgOf(s, actor, m);
      hurtHero(s, t.seat, ma, ev, 'combat'); lifestealHeal(s, actor, m, ma, ev);
      const th=(s.seats[t.seat].mods||{}).thorns; if(th && m.atk>0) hurtMinion(s, actor, m, th, ev, 'combat');   // v98 치트 가시 갑옷: 영웅을 때린 하수인에게 N 피해
    } else {
      const d=findMinion(s, t.seat, t.id);
      ev.push({type:'attack', seat:actor, attackerId:m.id, name:m.name, target:t, targetName:d.name});
      if(m.onAttackCopy) attackCopy(s, actor, m, ev); if(m.onAttackBeast) attackBeast(s, actor, m, ev);
      const ma=dmgOf(s, actor, m), dAtk=dmgOf(s, t.seat, d), dShield=d.shield, mShield=m.shield;   // v105 골드린: 야수가 주는 피해 2배
      hurtMinion(s, t.seat, d, ma, ev, 'combat', null, m);
      hurtMinion(s, actor, m, dAtk, ev, 'combat', null, d);
      if(m.crowley && d.hp<=0 && m.hp>0){ m.atk+=m.crowley; m.hp+=m.crowley; m.maxHp+=m.crowley; ev.push({type:'buff', target:minionT(actor, m.id), name:m.name, value:m.crowley, hpValue:m.crowley, src:{seat:actor, name:m.name}}); }   // v115 다리우스 크롤리: 공격으로 다른 하수인을 처치하면 +2/+2
      if(m.fishHeal && d.hp<=0 && m.hp>0 && m.hp<m.maxHp){ const before=m.hp; m.hp=m.maxHp; ev.push({type:'heal', target:minionT(actor, m.id), name:m.name, amount:m.hp-before, src:{seat:actor, name:m.name}}); }   // 오늘의 월척: 공격으로 하수인을 처치하면 생명력 전부 회복
      if(!dShield) lifestealHeal(s, actor, m, ma, ev);            // v62: 보호막이 막은 피해는 흡수하지 않음
      if(!mShield) lifestealHeal(s, t.seat, d, dAtk, ev);
    }
    if(m.windfury && !m.wfUsed) m.wfUsed=true; else m.attacked=true;   // v116 질풍: 턴마다 두 번 공격 (첫 공격에서는 아직 공격한 것으로 치지 않는다)
    delete m.stealth; delete m.stealthTemp;   // v75: 공격하면 은신이 풀린다
  } else if(a.type==='HERO_ATTACK'){                                   // v80 영웅 공격: 하수인을 치면 그 하수인의 공격력만큼 반격 피해(방어도가 먼저 흡수)
    const t=a.target, amt=P.heroAtk;
    if(t.kind==='hero'){
      ev.push({type:'attack', seat:actor, attackerId:'hero', name:'영웅', target:t, targetName:null});
      hurtHero(s, t.seat, amt, ev, 'combat');
    } else {
      const d=findMinion(s, t.seat, t.id), dAtk=dmgOf(s, t.seat, d);
      ev.push({type:'attack', seat:actor, attackerId:'hero', name:'영웅', target:t, targetName:d.name});
      hurtMinion(s, t.seat, d, amt, ev, 'combat');
      if(dAtk>0) hurtHero(s, actor, dAtk, ev, 'combat');
      if(dAtk>0) lifestealHeal(s, t.seat, d, dAtk, ev);
    }
    P.heroAttacked=true;
  } else if(a.type==='CHOOSE' && s.pending.kind==='fruit'){          // v29 금단의 과일 선택
    const pd=s.pending, o=pd.options[a.index]; s.pending=null;
    ev.push({type:'fruitPick', seat:actor, name:o.name});
    if(o.effect.type==='fruitArmor') castSpell(s, actor, o, null, ev);
    else { const ts=minsOf(s, actor); s.pending={kind:'target', seat:actor, card:o, targets:ts}; ev.push({type:'fruitTargetWait', seat:actor}); }
  } else if(a.type==='CHOOSE' && s.pending.kind==='choice'){
    const pd=s.pending, o=pd.options[a.index]; s.pending=null;
    ev.push({type:'choicePick', seat:actor, name:o.name});
    castSpell(s, actor, {...o, id:s.nextId++}, null, ev);
  } else if(a.type==='CHOOSE' && s.pending.kind==='pocketDimension'){
    const pd=s.pending, o=pd.options[a.index], card={...o, cost:Math.max(0, o.cost-(pd.discount||4)), id:s.nextId++};
    const repeated=(pd.seen||[]).includes(card.name), seen=[...(pd.seen||[]),card.name];
    s.pending=null;
    const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
    ev.push({type:'discoverPick', seat:actor, name:card.name, cost:card.cost, burned, pocketDimension:true, repeated,...(burned?{card:card}:{})});
    // 손패가 가득 차면 더 이상 발견을 진행하지 않는다. 방금 손패가 10장이 된 경우도 포함.
    if(!repeated && P.hand.length<handMax(P)){ startDiscover(s,actor,{value:4},ev,pd.src||'주머니 차원',false); if(s.pending && s.pending.kind==='discover'){s.pending.kind='pocketDimension';s.pending.seen=seen;s.pending.src=pd.src||'주머니 차원';} }
  } else if(a.type==='CHOOSE'){
    const pd=s.pending, o=pd.options[a.index], card={...o, cost:pd.setCost!==undefined ? pd.setCost : Math.max(0, o.cost-pd.discount), id:s.nextId++};
    s.pending=null;
    const burned=P.hand.length>=handMax(P); if(!burned) P.hand.push(card);
    if(pd.e && pd.e.swap && pd.e.prevId!==undefined){ const pc=P.hand.find(x=>x.id===pd.e.prevId), mine=card.cost; card.cost=pd.e.prevCost; if(pc) pc.cost=mine; }   // v67 박학다식: 두 발견 카드의 비용을 서로 바꿈
    ev.push({type:'discoverPick', seat:actor, name:card.name, cost:card.cost, burned,...(burned?{card:card}:{})});
    if(pd.again>0) startDiscover(s, actor, {...pd.e, again:pd.again-1, prevId:card.id, prevCost:card.cost}, ev, pd.src, false);   // v66 박학다식: 두 번째 발견   // name: 상대에게는 화면에서 숨긴다 (서버로 옮길 때는 name 을 빼고 보낼 것)
  } else if(a.type==='TARGET'){                     // v28 일식의 두 번째 시전 대상 선택
    const pd=s.pending; s.pending=null;
    ev.push({type:'targetPick', seat:actor, name:pd.card.name});
    castSpell(s, actor, pd.card, a.target, ev);
  } else if(a.type==='SURRENDER'){
    s.over=true; s.winner=other(actor);              // 항복 = 즉시 패배 (체력은 건드리지 않음)
    ev.push({type:'surrender', seat:actor});
    ev.push({type:'game_over', winner:s.winner});
  } else if(a.type==='END_TURN'){
    ev.push({type:'turn_end', seat:actor});
    for(const x of [...P.board]) if(x.pteroEgg && x.hp>0){                         // 비명익룡 알: 내 턴이 끝날 때마다 카운트 — 0이 되면 알이 깨지고(죽음의 메아리 없음) 내 전장을 4/4 익룡으로 가득 채운다
      x.hatchLeft=(x.hatchLeft ?? x.pteroEgg)-1;
      if(x.hatchLeft<=0){ P.board=P.board.filter(y=>y!==x); ev.push({type:'death', seat:actor, id:x.id, name:x.name, dr:false});
        summonTokens(s, actor, CONFIG.MAX_BOARD-P.board.length, PTERO, ev); } }
    for(const x of [...P.board]){ if(x.hp<=0 || !(x.endSpellGain||x.endTotemBuff||x.endAdjBuff||x.endHandBuff||x.endSelfHp)) continue; const tsrc={seat:actor, name:x.name};   // 창심장 파수병·부두 토템·아이스오르·물 공급 토템
      if(x.endSpellGain) gainSpellDisc(s, actor, x.endSpellGain.school, x.endSpellGain.discount, ev, tsrc);
      if(x.endTotemBuff){ const v=x.endTotemBuff, isT=c=>(c.tribe||'').includes('토템'); let hd=0;
        for(const c of [...P.hand, ...P.deck]) if(c.type==='minion' && isT(c)){ c.atk+=v; c.hp+=v; hd++; }
        if(hd) ev.push({type:'handBuff', seat:actor, amount:v, src:tsrc});
        for(const y of P.board) if(y!==x && y.hp>0 && isT(y)){ y.atk+=v; y.hp+=v; y.maxHp+=v; ev.push({type:'buff', target:minionT(actor, y.id), name:y.name, value:v, hpValue:v, src:tsrc}); } }
      if(x.endHandBuff){ const v=x.endHandBuff, mins=P.hand.filter(c=>c.type==='minion');   // v113 스테레오 토템: 손의 무작위 하수인 +v/+v
        if(mins.length){ const c=mins[Math.floor(nextRand(s)*mins.length)]; c.atk+=v; c.hp+=v; ev.push({type:'handBuff', seat:actor, amount:v, hand:true, src:tsrc}); } }
      if(x.endSelfHp){ x.hp+=x.endSelfHp; x.maxHp+=x.endSelfHp; ev.push({type:'buff', target:minionT(actor, x.id), name:x.name, value:0, hpValue:x.endSelfHp, src:tsrc}); }   // v113 죄악석 토템: 생명력 +1
      if(x.endAdjBuff){ const i=P.board.indexOf(x);
        if(i>=0) for(const y of [P.board[i-1], P.board[i+1]]){ if(!y || y.hp<=0) continue; y.atk+=x.endAdjBuff; y.hp+=x.endAdjBuff; y.maxHp+=x.endAdjBuff; ev.push({type:'buff', target:minionT(actor, y.id), name:y.name, value:x.endAdjBuff, hpValue:x.endAdjBuff, src:tsrc}); } } }
    for(const x of P.board) if(x.eggChicken && x.hp>0){ x.eggBonus=(x.eggBonus||0)+1; ev.push({type:'eggGrow', seat:actor, name:x.name, bonus:x.eggBonus}); }   // v113 부정한 알: 내 턴이 끝날 때마다 닭이 +1/+1
    { const past=(P.turnCasts||[]).map(x=>structuredClone(x));            // v75 바르고스: 이번 턴에 시전한 주문 기록 (이 단계에서 새로 시전되는 주문은 포함하지 않음)
      const ids=P.board.filter(m=>m.endCast||m.endCastMin||m.endRecast||m.endAttack||m.endDrain||m.endCorpses||m.endScatter||m.endBait||m.endSteal||m.endRaise||m.endCopy||m.endLotus||m.endViper||m.endDeckCopy||m.endArmorSummon||m.endBully||m.endDeckSummon||m.endSword).map(m=>({sword:m.endSword, dsum:m.endDeckSummon, arm:m.endArmorSummon, bully:m.endBully, dcopy:m.endDeckCopy, lotus:m.endLotus, viper:m.endViper, raise:m.endRaise, cp:m.endCopy, sc:m.endScatter, bait:m.endBait, steal:m.endSteal, corp:m.endCorpses, id:m.id, max:m.endCast, min:m.endCastMin, rec:m.endRecast, att:m.endAttack, dr:m.endDrain, name:m.name}));   // v74 속임수 토템 / v75 바르고스
      for(const t of ids){
        if(s.seats[0].hp<=0 || s.seats[1].hp<=0) break;
        const mm=findMinion(s, actor, t.id); if(!mm || mm.hp<=0) continue;
        if(t.arm){ summonSameCost(s, actor, Math.min(10, P.armor||0), ev, {seat:actor, name:t.name}); continue; }   // v115 대지조각가 이프
        if(t.bully){ endBullies(s, actor, mm, ev); sweepDead(s, ev); continue; }   // v115 문제아
        if(t.sword){ const others=P.board.filter(x=>x.id!==t.id && x.hp>0);   // v113 검 제작의 대가: 다른 무작위 아군 둘의 공격력 +1
          for(let k=0;k<2 && others.length;k++){ const x=others.splice(Math.floor(nextRand(s)*others.length),1)[0]; x.atk+=1; ev.push({type:'buff', target:minionT(actor, x.id), name:x.name, value:1, hpValue:0, src:{seat:actor, name:t.name}}); }
          continue; }
        if(t.dsum){ summonFromDeck(s, actor, ev, {seat:actor, name:t.name}); continue; }   // v112 이샤라즈
        if(t.dcopy){ summonDeckCopy(s, actor, ev, {seat:actor, name:t.name}); continue; }                     // v111 그훈의 피
        if(t.lotus){ summonTokens(s, actor, 1, LOTUS, ev); continue; }                     // v100 왕궁정원사
        if(t.viper){ summonTokens(s, actor, 1, VIPER, ev); continue; }                     // v100 뱀사육사
        if(t.raise){ if(spendCorpses(s, actor, 1, ev, {seat:actor, name:t.name})) summonTokens(s, actor, 1, RAISED, ev); continue; }
        if(t.cp){ if(P.board.length<CONFIG.MAX_BOARD && spendCorpses(s, actor, t.cp.corpses, ev, {seat:actor, name:t.name})){ const base=CARD_POOL.find(x=>x.type==='minion' && x.name===t.name);
            if(base){ const bf=(P.mods&&P.mods.buff)||0; const c2={...structuredClone(base), id:s.nextId++, maxHp:base.hp+bf, hp:base.hp+bf, attacked:false, summoned:true}; delete c2.effect; P.board.push(c2); ev.push({type:'summon', seat:actor, id:c2.id, name:c2.name, src:{seat:actor, name:t.name}}); } } continue; }
        if(t.corp){ P.corpses=(P.corpses||0)+t.corp; ev.push({type:'corpseGain', seat:actor, amount:t.corp, src:{seat:actor, name:t.name}}); continue; }   // v78 마우와 파우
        if(t.sc){ endScatterRun(s, actor, mm, t.sc==='atk'?mm.atk:t.sc, ev); sweepDead(s, ev); continue; }       // v79
        if(t.bait){ endBait(s, actor, mm, ev); sweepDead(s, ev); continue; }
        if(t.steal){ endSteal(s, actor, mm, ev); sweepDead(s, ev); continue; }
        if(t.att){ endAttack(s, actor, mm, ev); sweepDead(s, ev); continue; }       // v76 노움 쩝쩝이
        if(t.dr){ leechDrain(s, actor, mm, ev); sweepDead(s, ev); continue; }       // v76 불어오른 거머리
        if(t.max){ const pool=spellPool({max:t.max}); if(pool.length) autoCastMany(s, actor, [pool[Math.floor(nextRand(s)*pool.length)]], ev, t.name); }
        else if(t.min){ const pool=spellPool({min:t.min, skip:CHAOS_SKIP}); if(pool.length) autoCastMany(s, actor, [pool[Math.floor(nextRand(s)*pool.length)]], ev, t.name); }
        else if(t.rec && past.length) autoCastMany(s, actor, [structuredClone(past[Math.floor(nextRand(s)*past.length)])], ev, t.name);
      }
      P.turnCasts=[]; }
    { const fo=other(actor); let ticked=false;                  // v97 피의 소용돌이: 감염된 적 하수인에게 2 피해, 실제로 준 만큼 내 영웅 회복
      for(const x of [...s.seats[fo].board]){ if(s.seats[0].hp<=0 || s.seats[1].hp<=0) break; if(!(x.infect && x.infect.by===actor && x.hp>0)) continue;
        const dealt=x.shield?0:Math.min(2, x.hp), src={seat:actor, name:'피의 소용돌이'}; hurtMinion(s, fo, x, 2, ev, 'spell', src); if(dealt) gainLife(s, actor, dealt, ev, src); ticked=true; }
      if(ticked) sweepDead(s, ev); }
    P.lastPlays=P.turnPlays||[]; P.turnPlays=[]; P.bulletLoad=0; P.spellPoison=false;   // v105 이번 턴 기록은 '이전 턴'으로, 실탄 장전·성게 가시는 턴 종료와 함께 끝
    P.spellTax=0;                                  // v75 로데브: 주문 비용 증가는 그 턴이 끝나면 사라진다
    P.hand=P.hand.filter(x=>!x.echoTemp);          // v112 잔상: 쓰지 않은 잔상 복사본은 턴이 끝나면 사라진다
    P.eclipse=false;                              // v28 일식은 그 턴이 끝나면 사라진다
    P.heroAtk=0; P.heroAttacked=false;             // v80 영웅 공격력은 이번 턴만
    P.board.forEach(m=>{ if(m.tempAtk){ m.atk-=m.tempAtk; m.tempAtk=0; } });   // v29 금단의 과일의 공격력은 이번 턴만
    P.board.forEach(m=>{ m.frozen=false; });      // 얼음은 그 하수인 주인의 한 턴이 끝나면 풀린다
    returnEternal(s, actor, ev); returnLoop(s, actor, ev);   // v66 극한 반복                  // v61 영원의 불화살
    if(s.seats[0].hp>0 && s.seats[1].hp>0) startTurn(s, other(actor), ev);
  }
  sweepDead(s, ev);
  checkGlide(s, ev);
  resolveRecast(s, ev);                           // v28 일식: 첫 시전이 끝났으면 두 번째 시전 (대상 선택 대기가 생길 수 있다)
  sweepDead(s, ev);
  checkGlide(s, ev);
  checkEnd(s, ev);
  refreshAura(s, ev);
  return {ok:true, state:s, events:ev};
}

// ---- GameView: 특정 좌석에게 보내는 시점 정보 (상대 손패·덱 내용 제외) ----
function viewFor(s, seat){
  const me=s.seats[seat], op=s.seats[other(seat)];
  return structuredClone({
    seat, turn:s.turn, turnNo:s.turnNo, first:s.first, over:s.over, winner:s.winner,
    // deckCards: 내 남은 덱 구성. 뽑는 순서가 드러나지 않도록 id 를 빼고 코스트·이름순으로 정렬해서 보낸다.
    me:{heroAtk:me.heroAtk||0, heroAttacked:!!me.heroAttacked, corpses:me.corpses||0, spellTax:(me.spellTax||0)+(me.auraTax||0), taxNext:me.taxNext||0, lastSpellCost:me.lastSpellCost ?? -1, hp:me.hp, maxHp:me.maxHp, nextMana:me.nextMana||0, ascendNext:me.ascendNext||0, armorNext:me.armorNext||0, armor:me.armor||0, locked:me.locked||0, overloadNext:me.overloadNext||0, ones:(me.playedOnes||[]).length, castN:(me.castAll||[]).length, grave:(me.grave||[]).map(g=>({...g})), mods:me.mods, eclipse:!!me.eclipse, fatigue:me.fatigue||0, spellCount:me.spellCount||0, recastCount:(me.castLog||[]).length, mana:me.mana, maxMana:me.maxMana, hand:me.hand.map(c=>({...c, cost:effCost(me,c)})), board:me.board, deckCount:me.deck.length,
        deckCards:me.deck.map(({id, ...rest})=>rest).sort((a,b)=>a.cost-b.cost || (a.name<b.name?-1:a.name>b.name?1:0))},
    opp:{heroAtk:op.heroAtk||0, heroAttacked:!!op.heroAttacked, corpses:op.corpses||0, spellTax:(op.spellTax||0)+(op.auraTax||0), taxNext:op.taxNext||0, hp:op.hp, maxHp:op.maxHp, nextMana:op.nextMana||0, armorNext:op.armorNext||0, armor:op.armor||0, locked:op.locked||0, overloadNext:op.overloadNext||0, mods:op.mods, eclipse:!!op.eclipse, fatigue:op.fatigue||0, mana:op.mana, maxMana:op.maxMana, handCount:op.hand.length, board:op.board, deckCount:op.deck.length},
    pending: s.pending ? (s.pending.seat===seat
      ? (s.pending.kind==='target'
          ? {kind:'target', seat, card:{name:s.pending.card.name, cost:s.pending.card.cost, effect:s.pending.card.effect, school:s.pending.card.school, twin:s.pending.card.twin}, targets:s.pending.targets}
          : {kind:s.pending.kind||'discover', seat, options:s.pending.options.map(o=>({...o, cost:Math.max(0, o.cost-(s.pending.discount||0)), id:-1}))})   // 고르는 본인에게만 선택지를 보여 준다
      : {kind:s.pending.kind||'discover', seat:s.pending.seat}) : null,
    legal:legalActions(s, seat)
  });
}

// ---- Player: decide(view) → action. 사람(소켓)·봇이 같은 인터페이스를 따른다 ----
function hpOfTarget(view, t){
  const list = t.seat===view.seat ? view.me.board : view.opp.board;
  const m=list.find(x=>x.id===t.id); return m ? m.hp : Infinity;
}
function pickCardTarget(entries, view){
  const card=view.me.hand.find(c=>c.id===entries[0].cardId), type=card.effect.type;
  const minionOf=t=>(t.seat===view.seat?view.me.board:view.opp.board).find(m=>m.id===t.id);
  let score;
  if(type==='heal'||type==='healHoly')        score=a=>a.target.kind==='hero' ? ((view.me.maxHp||CONFIG.HERO_HP)-view.me.hp) : (minionOf(a.target).maxHp-minionOf(a.target).hp);
  else if(type==='buff' || type==='shieldCry')   score=a=>minionOf(a.target).atk;
  else                     score=a=> a.target.seat===view.seat ? -1000                               // 피해: 아군은 피하고
                                   : (a.target.kind==='minion' ? 100-minionOf(a.target).hp : 0);   // 적의 약한 하수인 우선
  return entries.reduce((best,a)=>score(a)>score(best)?a:best);
}
// 발견 선택: 지금 상황에 가장 쓸모 있어 보이는 카드를 고른다 (두 봇 공통)
function discoverScore(c, view){
  if(c.type!=='spell') return 1+(c.atk+c.hp)/2-c.cost*0.3;           // v40: 덱 탐색은 하수인도 후보가 된다
  const me=view.me, op=view.opp, foes=op.board.length, mine=me.board.length, t=c.effect.type;
  if(['damage','bolt','execute','transform','freeze','eternalBolt'].includes(t)) return foes ? 3+foes*0.5 : 0.5;
  if(t==='rain') return foes>=2 ? 4+foes : 0;
  if(t==='wipe') return foes-mine>=2 ? 5 : 0.5;
  if(t==='heal') return me.hp<=15 ? 4 : 1;
  if(t==='draw') return me.hand.length<=5 ? 3.5 : 1;
  if(['enhance','scale','giveShield','haste','adalGuardian','thornMount','splitCopy','holdLine','grantBuff','lineUp'].includes(t)) return mine ? 3 : 0.5;
  if(t==='amaraTale') return me.hp<=26 ? 4 : 0.5;
  if(t==='handDiscover') return 2;
  if(t==='raiseDead') return (me.grave||[]).length ? 3 : 0.5;
  if(t==='lightBomb' || t==='soulScream' || t==='vanishAll' || t==='essence') return foes-mine>=2 ? 4 : 0.5;
  if(t==='ancestors') return me.hand.some(x=>x.type==='minion') ? 3 : 0.5;
  if(t==='gang') return mine+foes>0 ? 2.5 : 0.5;
  if(t==='ignite') return foes ? 3+foes*0.5 : 0.5;
  if(t==='iceTornado') return foes>=2 ? 4 : 0.5;
  if(t==='supernova') return me.hand.length<=4 ? 5 : 1;
  if(t==='galaxyOrb') return 2;
  if(t==='loopDiscover'||t==='learned') return 4;
  if(t==='cover') return mine>=2 ? 2.5 : 0.5;
  if(t==='raiseShield') return me.hp<=20 ? 4 : 2.5;
  if(t==='sunwell') return me.hand.length<=4 ? 4 : 1.5;
  if(t==='manaDrain') return foes ? 3+foes*0.5 : 0.5;
  if(t==='frenzyDeck') return 2;
  if(t==='spreadPlague') return mine<=5 ? 4 : 1;
  if(t==='replayOne') return (me.ones||0)>0 ? 3 : 0.5;
  if(t==='rewind') return 2.5;
  if(t==='survival') return me.hand.filter(x=>x.type==='minion').length+mine>=3 ? 4 : 0.5;
  if(t==='wildGift') return mine>=2 ? 4 : 0.5;
  if(t==='ultPlague') return 4.5;
  if(t==='destroyAll') return foes-mine>=2 ? 5 : 0.5;
  if(t==='tauntDiscover') return 3;
  if(t==='resurrect') return (me.grave||[]).some(g=>g.taunt) ? 3 : 0.5;
  if(t==='timeMend') return me.hand.length<=7 ? 3.5 : 0.5;
  if(['compost','forestSoul','roar'].includes(t)) return mine>=2 ? 3 : 0.5;
  if(t==='copy') return me.hand.some(x=>x.type!=='spell') ? 2.5 : 0.5;
  if(t==='silence') return op.board.some(m=>m.taunt) ? 3 : 0.5;
  if(t==='summon') return mine<=4 ? 4 : 1;
  if(t==='glide') return mine<=3 ? 4.5 : 1;
  if(t==='muster') return mine<=5 ? 4 : 1;
  if(t==='chaos') return 3;
  if(t==='eclipse') return 2;
  if(t==='bloodSip' || t==='bloodPlague' || t==='airLeak') return 3.5;   // v76
  return 1;
}
function chooseTarget(view){                                    // v28 일식의 두 번째 시전 대상 (두 봇 공통). 후보 중 가장 점수 높은 것
  const pd=view.pending, e=pd.card.effect, ts=pd.targets, me=view.me, op=view.opp, ty=e.type;
  const mine=t=>t.seat===view.seat;
  const minion=t=>t.kind==='minion' ? (mine(t)?me.board:op.board).find(m=>m.id===t.id) : null;
  const sc=t=>{
    const m=minion(t);
    if(ty==='heal') return !mine(t) ? -1000 : t.kind==='hero' ? (me.maxHp||CONFIG.HERO_HP)-me.hp : m.maxHp-m.hp;
    if(['enhance','scale','giveShield','haste','fruitAtk','adalGuardian','thornMount','splitCopy','holdLine','grantBuff','lineUp'].includes(ty)) return mine(t)&&m ? m.atk*2+m.hp : -1000;
    if(ty==='recall') return mine(t)&&m ? (m.hp*2<=m.maxHp?5:0)-m.atk : -1000;
    if(ty==='gang') return m ? m.atk+m.hp : -1000;                 // v71 패거리: 가장 큰 하수인을 복사 (양쪽 모두)
    if(ty==='copy'){ const c=me.hand.find(x=>x.id===t.id); return c ? c.cost : -1000; }
    if(['transform','freeze','silence','execute'].includes(ty)) return !mine(t)&&m ? m.atk+m.hp : -1000;
    if(mine(t)) return -1000;                                     // 피해 계열: 아군은 피하고
    if(t.kind==='hero') return (e.value>=op.hp) ? 1000 : 0;
    return m.shield ? 1 : (m.hp<=e.value ? 50+m.atk+m.hp : 20-m.hp);
  };
  let best=ts[0], bs=-Infinity;
  for(const t of ts){ const x=sc(t); if(x>bs){ bs=x; best=t; } }
  return {type:'TARGET', target:best};
}
function choosePending(view){ return view.pending.kind==='target' ? chooseTarget(view) : view.pending.kind==='fruit' ? chooseFruit(view) : view.pending.kind==='choice' ? chooseChoice(view) : chooseDiscover(view); }
// v45: 선택 주문은 현재 체력·방어도·마나·손패·전장 상황을 비교해 두 봇이 직접 효과를 고른다.
function choiceOptionScore(o, view){
  const me=view.me, op=view.opp, e=o.effect||{}, t=e.type;
  const slots=Math.max(0, CONFIG.MAX_BOARD-me.board.length);
  const incoming=op.board.filter(m=>!m.frozen).reduce((n,m)=>n+m.atk,0);
  if(t==='choiceMana') return (me.maxMana<10 ? Math.min(e.value,10-me.maxMana)*2.2 + (me.maxMana<=5?2:0) : 0) + (me.mana<me.maxMana?1:0);
  if(t==='draw') return me.hand.length<=5 && me.deckCount>=e.value && me.hand.length+e.value<=CONFIG.MAX_HAND ? 7+(5-me.hand.length)*0.5 : 0;
  if(t==='choiceRefill') return Math.max(0, me.maxMana-me.mana)*1.2;
  if(t==='choiceArmor') return e.value*(me.hp<=12?1.0:me.hp<=20?0.7:incoming>=me.hp?0.8:0.35);
  if(t==='summon') { const n=Math.min(e.count||1,slots); if(!n) return -10; const stats=(e.atk+e.hp)*n*0.8; const taunt=(e.taunt && (me.hp<=incoming+4 || op.board.some(m=>!m.frozen)))?n*3:0; return stats+taunt; }
  if(t==='choiceHeal') return Math.min(e.value,Math.max(0,(me.maxHp||CONFIG.HERO_HP)-me.hp))*(me.hp<=12?1.5:me.hp<=20?1.1:0.65);
  return 0;
}
function chooseChoice(view){
  const opts=view.pending.options||[]; let best=0, score=-Infinity;
  opts.forEach((o,i)=>{const v=choiceOptionScore(o,view); if(v>score){score=v;best=i;}});
  return {type:'CHOOSE', index:best};
}
function chooseDiscover(view){
  const opts=view.pending.options; let bi=0, bs=-Infinity;
  opts.forEach((c,i)=>{ const sc=discoverScore(c, view); if(sc>bs){ bs=sc; bi=i; } });
  return {type:'CHOOSE', index:bi};
}
// 주문(동전) 보조: 동전은 "지금 마나로는 못 내는 하수인을 낼 수 있게 될 때"만 쓴다 (그냥 쓰면 마나가 낭비된다)
const isSpellCard = c => c.type==='spell';
const isCoin = c => c.type==='spell' && (c.effect.type==='mana' || c.effect.type==='bloom');   // v29 번개 개화도 봇은 동전처럼 쓴다
function coinUnlocks(view){
  const me=view.me, coin=me.hand.find(isCoin);
  if(!coin || me.board.length>=CONFIG.MAX_BOARD) return false;
  return me.hand.some(c=>!isSpellCard(c) && c.cost>me.mana && c.cost<=me.mana+coin.effect.value);
}
// 중급 봇의 주문 사용 규칙 (낼 만한 때만 낸다. 없으면 null)
//  불꽃 화살: 영웅을 쓰러뜨릴 수 있거나 적 하수인을 처치할 때 / 침묵: 도발 벽이 있고 공격할 하수인이 있을 때
//  치유의 빛: 내 영웅이 4 이상 다쳤을 때 / 수호의 장벽: 공격력 2 이상 하수인에게 / 지식의 서: 손패가 8장 이하일 때
function ruleSpell(view){
  const me=view.me, op=view.opp;
  const cardOf=a=>me.hand.find(c=>c.id===a.cardId);
  const acts=view.legal.filter(a=>a.type==='PLAY_CARD' && isSpellCard(cardOf(a)) && !isCoin(cardOf(a)));
  const ofType=t=>acts.filter(a=>cardOf(a).effect.type===t);
  const minionOf=t=>(t.seat===view.seat?me.board:op.board).find(m=>m.id===t.id);
  const dm=ofType('damage');
  if(dm.length){
    const v=cardOf(dm[0]).effect.value;
    const face=dm.find(a=>a.target.kind==='hero' && a.target.seat!==view.seat);
    if(face && v>=op.hp) return face;
    const kills=dm.filter(a=>a.target.kind==='minion' && a.target.seat!==view.seat && !minionOf(a.target).shield && minionOf(a.target).hp<=v);
    if(kills.length) return kills.reduce((x,y)=>minionOf(x.target).atk>=minionOf(y.target).atk?x:y);
  }
  const si=ofType('silence');
  if(si.length && me.board.some(m=>!m.attacked && !m.frozen && (!m.summoned || m.charge))){
    const walls=si.filter(a=>minionOf(a.target).taunt);
    if(walls.length) return walls.reduce((x,y)=>minionOf(x.target).hp<=minionOf(y.target).hp?x:y);
  }
  const he=ofType('heal').find(a=>a.target.kind==='hero');
  if(he && (me.maxHp||CONFIG.HERO_HP)-me.hp>=4) return he;
  const gs=ofType('giveShield').filter(a=>minionOf(a.target).atk>=2);
  if(gs.length) return gs.reduce((x,y)=>minionOf(x.target).atk>=minionOf(y.target).atk?x:y);
  const ex=ofType('execute');
  if(ex.length) return ex.reduce((x,y)=>minionOf(x.target).atk+minionOf(x.target).hp>=minionOf(y.target).atk+minionOf(y.target).hp?x:y);   // 가장 큰 카드부터
  const rn=ofType('rain');
  if(rn.length){
    const v=cardOf(rn[0]).effect.value;
    const kills=op.board.filter(m=>!m.shield && m.hp<=v).length;
    if(kills>=2 || (op.board.length>=3 && kills>=1)) return rn[0];
  }
  const hs=ofType('haste').filter(a=>minionOf(a.target).atk>=3);
  if(hs.length) return hs.reduce((x,y)=>minionOf(x.target).atk>=minionOf(y.target).atk?x:y);
  const fr=ofType('freeze').filter(a=>minionOf(a.target).atk>=3);          // 공격력 3 이상인 적을 얼린다
  if(fr.length) return fr.reduce((x,y)=>minionOf(x.target).atk>=minionOf(y.target).atk?x:y);
  const cp=ofType('copy');                                                 // 하수인을 다 낸 뒤 남는 마나로, 비싼(3코 이상) 하수인을 복제
  if(cp.length){
    const costOf=a=>me.hand.find(c=>c.id===a.target.id).cost;
    const b=cp.reduce((x,y)=>costOf(x)>=costOf(y)?x:y);
    if(costOf(b)>=3) return b;
  }
  const dr=ofType('draw');
  if(dr.length && me.hand.length<=8 && me.deckCount>=cardOf(dr[0]).effect.value) return dr[0];   // 덱이 모자라면 탈진 피해만 입는다
  for(const [type,fx] of Object.entries(SPELL_FX)){                        // 레지스트리에 규칙이 있는 주문 (강화·회수·변이 ...)
    if(!fx.ruleUse) continue;
    const a=fx.ruleUse(view, ofType(type), {minionOf, cardOf}); if(a) return a;
  }
  return null;
}
const BotPlayers = {
  // 규칙 기반: 가장 비싼 카드부터 내고, 약한 하수인을 우선 공격, 없으면 영웅 공격
  rule:{ decide(view){
    if(view.pending && view.pending.seat===view.seat) return choosePending(view);
    const L=view.legal;
    const cardOf=a=>view.me.hand.find(c=>c.id===a.cardId);
    const spellOf=a=>isSpellCard(cardOf(a));
    const coinAct=L.find(a=>a.type==='PLAY_CARD' && isCoin(cardOf(a)));
    if(coinAct && coinUnlocks(view)) return coinAct;                      // 동전을 써야 더 낼 수 있을 때만
    const plays=L.filter(a=>a.type==='PLAY_CARD' && !spellOf(a));        // 하수인만 (주문은 아래에서 따로 판단)
    if(plays.length){
      const costOf=a=>view.me.hand.find(c=>c.id===a.cardId).cost;
      const best=Math.max(...plays.map(costOf));
      const cardId=plays.find(a=>costOf(a)===best).cardId;
      const entries=plays.filter(a=>a.cardId===cardId);
      return entries.length===1 ? entries[0] : pickCardTarget(entries, view);
    }
    const sp=ruleSpell(view);          // 남은 마나로 쓸 만한 주문이 있으면 쓴다
    if(sp) return sp;
    const atks=L.filter(a=>a.type==='ATTACK');
    if(atks.length){
      const entries=atks.filter(a=>a.attackerId===atks[0].attackerId);
      const mt=entries.filter(a=>a.target.kind==='minion');
      if(mt.length) return mt.reduce((x,y)=>hpOfTarget(view,x.target)<=hpOfTarget(view,y.target)?x:y);
      return entries[0];
    }
    return {type:'END_TURN'};
  }},
  // 무작위: 합법 행동 중 하나 (엔진 시험·부하용)
  random:{ decide(view){ return view.legal[Math.floor(Math.random()*view.legal.length)]; } }
};

// ---- 규칙 봇 2 (중급2): 중급(rule)보다 한 수 앞을 보는 규칙 기반 봇 ----
//  1) 마무리: 이번 턴에 상대 영웅을 쓰러뜨릴 수 있으면 곧바로 영웅을 공격한다.
//  2) 카드: 마나를 가장 알차게 쓰는 조합을 고르고, 드로우 → 피해 → 하수인 → 회복 → 강화 순으로 낸다.
//  3) 공격: 모든 (공격자, 대상) 조합을 점수로 비교한다. 이득 보는 교환 > 영웅 공격 > 손해 보는 교환(생략).
//  4) 위기: 상대 필드의 공격력 합이 내 체력에 닿으면 영웅 공격을 줄이고 위협적인 하수인을 먼저 처리한다.
// 점수 가중치는 아래 W 한 곳에 모아두었다. selfPlay 로 승률을 재 가며 이 표만 고치면 된다.
const Rule2 = (()=>{
  const W = {
    atk:1.2, hp:0.8, taunt:1.5, shield:1.5,     // 하수인 가치 = 공격력·체력·도발·보호막
    face:0.9, faceLow:1.4, faceCrit:2.0,        // 영웅 공격 1당 점수 (상대 체력이 낮을수록 커짐)
    faceDanger:0.4,                             // 내가 위기일 때 영웅 공격 점수
    tempo:1.0, killThreat:1.0,                  // 처치 보너스 / 위기 때 처치한 하수인 공격력 보너스
  };
  const val = m => m.atk*W.atk + m.hp*W.hp + (m.taunt?W.taunt:0) + (m.shield?W.shield:0) + (m.revive?1.5:0) + (m.elusive?1.8:0) + (m.deathSummonCost?2.5:0) + (m.deathCopy?1.5:0) + (m.deathGain?2.5:0) + (m.deathStego?2.5*m.deathStego:0) + (m.onAttackCopy?2:0) + (m.lifesteal?1.5:0) + (m.poison?3:0) + (m.charge?0.8:0) + (m.onSpellFireball?3:0) + (m.onSpellScatter?4:0) + (m.onAttackBeast?3:0) + (m.endCastMin?3:0) + (m.spellDmgSchools?3:0) + (m.endCast?2:0) + (m.onSpellDraw?2:0) + (m.endRecast?2:0) + (m.endAttack?2.5:0) + (m.endScatter?4:0) + (m.endBait?2:0) + (m.spellAura?1.5:0) + (m.endSteal?4:0) + (m.endCorpses?2:0) + (m.endDrain?1.5:0) + (m.leechBoost?1.5:0) + (m.spellburst?3:0) + (m.deathArmor?2:0) + (m.deathBuffAll?3:0) + (m.deathGrave?3:0) + (m.costOne?4:0) + (m.trogg?3:0) + (m.endDeckSummon?5:0) + (m.fireImmune?1:0) + (m.eggChicken?2:0) + (m.deathProto?2:0) + (m.endSword?3:0);

  function context(view){
    const me=view.me, op=view.opp;
    const threat=op.board.filter(m=>!m.frozen).reduce((s,m)=>s+m.atk,0);   // 얼린 하수인은 다음 턴 공격하지 못한다
    const danger = threat >= me.hp-2 && !me.board.some(m=>m.taunt);
    const faceW = danger ? W.faceDanger : op.hp<=6 ? W.faceCrit : op.hp<=12 ? W.faceLow : W.face;
    const ready = m => !m.attacked && !m.frozen && (!m.summoned || m.charge);
    const readyAtk = me.board.filter(ready).reduce((s,m)=>s+m.atk,0);   // 이번 턴 공격할 수 있는 공격력 합
    const taunts = op.board.filter(m=>m.taunt).length;
    return {danger, faceW, readyAtk, taunts};
  }

  // 카드 한 장의 가치 (낼지 말지가 아니라 "어떤 조합이 더 좋은가"를 비교하는 용도)
  const SPELL_MIN = 3;    // 주문은 "낼 가치"가 이 점수 이상일 때만 쓴다 (카드 한 장을 소모하므로 전투의 함성보다 기준이 높다)
  function spellWorth(c, view, ctx){
    const e=c.effect;
    if(e.type==='draw') return (view.me.hand.length-1+e.value<=CONFIG.MAX_HAND && view.me.deckCount>=e.value) ? 5 : 0;   // 손패가 넘치거나 덱이 모자라면 쓰지 않는다
    const entries=view.legal.filter(a=>a.type==='PLAY_CARD' && a.cardId===c.id);
    if(!entries.length) return -Infinity;                                                    // 지금은 낼 수 없음 (마나·대상)
    { const fx=SPELL_FX[e.type]; if(fx && fx.spellWorth) return fx.spellWorth(c, view, ctx, {val, W}); }   // 레지스트리의 대상 없는 주문
    if(e.type==='rain'){                                                                     // 광역: 처치한 수가 많을수록 가치가 크다
      let kills=0, sum=0;
      for(const m of view.opp.board){ if(!m.shield && m.hp<=e.value){ kills++; sum+=val(m)+W.tempo; } else sum+=e.value*0.4; }
      return Math.min(20, kills>=2 ? sum : sum*0.5);
    }
    const targeted=entries.filter(a=>a.target);
    return targeted.length ? Math.min(20, Math.max(...targeted.map(a=>targetScore(c, a.target, view, ctx)))) : 0;
  }
  function cardValue(c, view, ctx){
    if(c.type==='spell') return spellWorth(c, view, ctx);
    const me=view.me, e=c.effect;
    let v=c.atk+c.hp+(c.shield?W.shield:0)+(c.taunt?(ctx.danger?3:1):0)+(c.revive?2:0)+(c.elusive?1.8:0)+(c.deathSummonCost?2.5:0)+(c.deathCopy?1.5:0)+(c.deathGain?2.5:0)+(c.onAttackCopy?2:0)+(c.lifesteal?1.5:0)+(c.poison?3:0)+(c.charge?1.5:0)+(c.rush?1:0)+(c.onSpellFireball?3+Math.min(3,me.hand.filter(x=>x.type==='spell').length):0)+(c.onSpellScatter?4:0)+(c.onAttackBeast?4:0)+(c.endCastMin?4:0)+(c.spellDmgSchools?3:0)+(e&&e.type==='parrot'?((me.castN||0)>=2?3:0):0)+(e&&e.type==='sleetFreeze'?Math.min(8,view.opp.board.reduce((a,x)=>Math.max(a,x.atk),0)*1.2):0)+(e&&e.type==='doubleHand'?Math.min(8,me.hand.filter(x=>x.type==='minion').length*2.5):0)+(e&&e.type==='spellHunt'?3:0)+(e&&e.type==='drawSpellArmor'?(me.deckCards.some(x=>x.type==='spell')?3:-1):0)+(e&&e.type==='frostWarden'?Math.min(8,view.opp.board.length*2):0)+(c.endCast?3:0)+(e&&e.type==='manastorm'?4+Math.min(4,me.hand.filter(x=>x.type==='spell').length):0)+(c.onSpellDraw?3:0)+(c.endRecast?2.5:0)+(c.endAttack?3:0)+(c.endScatter?5:0)+(c.endBait?3:0)+(c.spellAura?2:0)+(c.endSteal?5:0)+(c.endCorpses?3:0)+(e&&e.type==='bloodDrain'?5:0)+(e&&e.type==='bloodDiscover'?((me.corpses||0)>=e.corpses?2.5:0):0)+(e&&e.type==='leechSummon'?4:0)+(e&&e.type==='spellTax'?2:0)+(e&&e.type==='revealSummon'?(me.deckCards.some(x=>x.type==='spell')?4:-1):0)+(c.spellburst?3:0)+(e&&e.type==='armorCry'?3:0)+(c.deathArmor?1.5:0)+(c.deathBuffAll?3:0)+(c.deathGrave?3:0)+(c.costOne?4:0)+(e&&e.type==='kuhn'?4:0)+(c.trogg?3:0)+(c.endDeckSummon?5:0)+(c.eggChicken?3:0)+(c.deathProto?3:0)+(c.endSword?4:0)+(e&&e.type==='deckBuff'?Math.min(4,me.deckCount*0.15):0)+(e&&e.type==='selfHurt'?(me.hp<=8?-8:-1):0)+(e&&e.type==='devour'?6:0)+(e&&e.type==='pyroar'?Math.min(10,view.opp.board.length*2+3):0)+(e&&e.type==='snitch'?-1:0)+(e&&e.type==='discoverCost'?(me.hand.length<=8?2.5:0):0);
    if(e){
      if(e.type==='draw')   v+= me.deckCount>=e.value ? 2.5 : -3;      // 덱이 비었으면 탈진 피해
      if(e.type==='damage') v+=e.value*1.2;
      if(e.type==='heal')   v+=Math.min(e.value, (me.maxHp||30)-me.hp)*0.8;
      if(e.type==='buff')   v+= me.board.length ? e.value*2 : 0;
      if(e.type==='healHoly') v+= Math.min(e.value, (me.maxHp||30)-me.hp)*0.8 + (me.hand.length<=8 ? 2.5 : 0);   // v59: 대상 선택으로 바뀜   // v58
      if(e.type==='alana') v+= 4;
      if(e.type==='mindCopy') v+= 2;
      if(e.type==='benedictus') v+= 3;                                                 // v108: 비싼 주문을 낸 만큼 5/5 용
      if(e.type==='seedDeck') v+= 2;                                              // v57: 덱이 두꺼워져 탈진이 늦어진다
      if(e.type==='recycle')  v+= (me.deckCount>=4 ? (me.hand.length-1<=2 ? 5 : me.hand.length-1<=4 ? 1 : -3) : -4);   // 손패가 적을 때만 이득 (손패를 덱에 섞기 때문)
      if(e.type==='recastLog') v+= Math.min(8, (me.recastCount||0)*2);   // v56
      if(e.type==='yogg') v+= Math.min(10, (me.spellCount||0)*1.5);
      if(e.type==='sweep')  v+= view.opp.board.reduce((s,m)=>s+(m.shield?1:(m.hp<=e.value ? m.atk+m.hp : e.value*0.5)),0);
      if(e.type==='gainMana') v+= e.value;
    }
    return v;
  }

  // 마나 budget 안에서 낼 수 있는 하수인 조합 중 마나를 가장 많이 쓰고(1순위) 가치가 가장 큰(2순위) 것
  // (budget 을 mana+동전으로 넣어 보면 "동전을 쓰면 얼마나 더 쓰는지" 비교할 수 있다)
  const planCost = plan => plan.reduce((s,c)=>s+c.cost,0);
  function bestPlan(view, ctx, budget){
    const me=view.me;
    // 적 필드가 비어 있으면 광역 피해 카드는 아껴 둔다
    // (동전은 따로 판단하고, 그 밖의 주문은 낼 가치가 SPELL_MIN 이상일 때만 후보에 넣는다)
    const cards=me.hand.filter(c=>!isCoin(c) && !c.lifeCost && c.cost<=budget && !(c.effect&&c.effect.type==='selfHurt' && me.hp+(me.armor||0)<=6) && !(c.effect&&c.effect.type==='deathwing' && !(me.hand.length-1<=2 || (view.opp.board.length-me.board.length>=2 && me.hand.length-1<=4))) && !(c.effect&&c.effect.type==='sweep'&&view.opp.board.length===0)
                                  && (c.type!=='spell' || spellWorth(c, view, ctx)>=SPELL_MIN));
    const gain=c=>(c.effect&&(c.effect.type==='gainMana'||c.effect.type==='growth'))?c.effect.value:0;   // 마나를 돌려주는 카드는 실질 비용이 낮다
    const slots=CONFIG.MAX_BOARD-me.board.length, n=cards.length;
    const vals=cards.map(c=>cardValue(c, view, ctx));
    let best=null, bc=-1, bv=-1;
    for(let mask=1; mask<(1<<n); mask++){
      let cost=0, net=0, cnt=0, v=0;
      for(let i=0;i<n;i++) if(mask&(1<<i)){ cost+=cards[i].cost; net+=cards[i].cost-gain(cards[i]); if(cards[i].type!=='spell' || (SPELL_FX[cards[i].effect.type]||{}).summons) cnt++; v+=vals[i]; }   // 전장 자리는 하수인만 차지
      if(net>budget || cnt>slots) continue;
      if(cost>bc || (cost===bc && v>bv)){ bc=cost; bv=v; best=mask; }
    }
    if(best===null) return [];
    return cards.filter((_,i)=>best&(1<<i));
  }
  // 낼 순서: 드로우(선택지 늘리기) → 피해(적 정리) → 하수인 → 회복 → 강화(마지막에 낸 아군에게도 쓸 수 있게)
  const rankOf = c => { const t=c.effect&&c.effect.type; const fx=c.type==='spell'&&SPELL_FX[t]; if(fx&&fx.rank!==undefined) return fx.rank; return t==='gainMana'?-1 : (t==='draw'||t==='copy')?0 : (t==='damage'||t==='sweep'||t==='silence'||t==='rain'||t==='execute'||t==='freeze')?1 : t==='heal'?3 : (t==='buff'||t==='giveShield')?4 : t==='haste'?5 : 2; };   // 급습은 하수인을 다 낸 뒤에

  // 전투의 함성 대상 고르기
  function targetScore(card, t, view, ctx){
    const me=view.me, op=view.opp, e=card.effect, v=e.value;
    const mineSide = t.seat===view.seat;
    const list = mineSide ? me.board : op.board;
    const m = t.kind==='minion' ? list.find(x=>x.id===t.id) : null;
    if(e.type==='damage'){
      if(mineSide) return -1000;                                   // 아군은 때리지 않는다
      if(t.kind==='hero') return (v>=op.hp ? 1000 : v*ctx.faceW);  // 마무리가 되면 최우선
      if(m.shield) return 1.0;                                     // 보호막만 깬다
      if(m.hp<=v)  return val(m)+W.tempo+(ctx.danger?m.atk*W.killThreat:0);
      return v*0.4+(m.taunt?1:0);                                  // 못 죽이면 약하게 만들어 두기
    }
    if(e.type==='heal' || e.type==='healHoly'){
      if(!mineSide) return -1000;
      if(t.kind==='hero') return Math.min(v,(me.maxHp||30)-me.hp)*(ctx.danger?1.5:0.8);
      return Math.min(v, m.maxHp-m.hp)*0.6;
    }
    if(e.type==='shieldCry'){ if(!mineSide) return -1000; return m.atk*0.4+m.hp*0.2+(m.taunt?0.8:0); }
    if(e.type==='buff'){
      if(!mineSide) return -1000;
      const ready=!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush);
      return (ready?1.5:0)+(m.atk>=3?1:0)+m.atk*0.3+m.hp*0.2+(m.taunt?0.5:0);
    }
    if(e.type==='freeze'){                                         // 공격력이 높은 적을 얼릴수록 가치가 크다 (내가 위기면 더)
      if(mineSide) return -1000;
      return m.atk*0.9 + (ctx.danger ? m.atk*0.8 : 0) + (m.atk>=4 ? 1 : 0);
    }
    if(e.type==='copy'){                                           // 손패에서 가장 가치 있는 하수인의 복사본 (대상이 손패 카드)
      const hc=me.hand.find(c=>c.id===t.id);
      return hc ? cardValue(hc, view, ctx)*0.45 : -1000;
    }
    if(e.type==='execute'){                                        // 보호막을 무시하고 큰 카드를 처치
      if(mineSide) return -1000;
      return val(m)+W.tempo+(ctx.danger?m.atk*W.killThreat:0);
    }
    if(e.type==='haste'){                                          // 소환 직후 공격력이 높은 하수인일수록 가치가 크다. 영웅을 노릴 수 있으면 더 크다
      if(!mineSide) return -1000;
      return m.atk*0.9 + (ctx.taunts===0 ? m.atk*0.5 : 0) + (m.atk>=op.hp ? 10 : 0);
    }
    if(e.type==='silence'){                                        // 도발 벽을 뚫어 공격할 하수인이 있을 때 가치가 크다 (마지막 벽이면 영웅까지 열린다)
      if(mineSide) return -1000;
      return (m.taunt && ctx.readyAtk>0 ? 3+(ctx.taunts===1?1.5:0) : 0) + (m.shield?1:0);
    }
    if(e.type==='giveShield'){                                     // 공격력이 높고 바로 싸울 하수인일수록 보호막 가치가 크다
      if(!mineSide) return -1000;
      const ready=!m.attacked&&!m.frozen&&(!m.summoned||m.charge||m.rush);
      return 1+m.atk*0.6+m.hp*0.2+(ready?1:0)+(m.taunt?1:0);
    }
    if(e.type==='sleetFreeze') return mineSide ? -1000 : m.atk*1.2+(m.frozen?-1:1);
    if(e.type==='devour') return (mineSide||!m) ? -1000 : val(m)+W.tempo;
    const fx=SPELL_FX[e.type]; if(fx && fx.worth) return fx.worth(view, card, t, ctx, {val, W, m, mineSide});   // 레지스트리의 주문
    return 0;
  }

  // 공격 한 건의 점수
  function attackScore(a, view, ctx){
    const me=view.me, op=view.opp;
    const m=me.board.find(x=>x.id===a.attackerId);
    if(a.target.kind==='hero') return m.atk>=op.hp ? 1000 : m.atk*ctx.faceW;
    const d=op.board.find(x=>x.id===a.target.id);
    const kill=!d.shield && !d.revive && m.atk>=d.hp;
    const die =!m.shield && !m.revive && d.atk>=m.hp;
    let s=0;
    if(kill) s+=val(d)+W.tempo+(ctx.danger?d.atk*W.killThreat:0);
    else     s+= d.shield ? 0.8 : m.atk*0.25;
    if(die) s-=val(m);
    else if(m.shield && d.atk>0) s-=0.8;
    else s-=d.atk*0.3;
    return s;
  }

  function decide(view){
    if(view.pending && view.pending.seat===view.seat) return choosePending(view);
    const L=view.legal, me=view.me, op=view.opp;
    const allPlays=L.filter(a=>a.type==='PLAY_CARD'), atks=L.filter(a=>a.type==='ATTACK');
    const coinAct=allPlays.find(a=>isCoin(me.hand.find(c=>c.id===a.cardId)));
    const plays=allPlays.filter(a=>a!==coinAct);                         // 하수인 + 동전 외의 주문
    const ctx=context(view);

    // 1) 마무리 확인 (상대 도발이 없을 때만 영웅을 칠 수 있다). 불꽃 화살 같은 직접 피해도 마무리에 계산한다.
    const heroHits=atks.filter(a=>a.target.kind==='hero');
    const ids=[...new Set(heroHits.map(a=>a.attackerId))];
    const total=ids.reduce((s,id)=>s+me.board.find(m=>m.id===id).atk,0);
    if(heroHits.length && total>=op.hp) return heroHits[0];
    const burn=plays.filter(a=>a.target && a.target.kind==='hero' && a.target.seat!==view.seat);
    if(burn.length){
      const dmg=a=>me.hand.find(c=>c.id===a.cardId).effect.value;
      const b=burn.reduce((x,y)=>dmg(x)>=dmg(y)?x:y);
      if(total+dmg(b)>=op.hp) return b;
    }
    // 1-1) 급습으로 소환 직후 하수인이 공격할 수 있게 되어 이번 턴에 끝낼 수 있을 때
    if(ctx.taunts===0){
      const hs=plays.filter(a=>{ const e=me.hand.find(c=>c.id===a.cardId).effect; return e && e.type==='haste'; });
      const best=hs.reduce((b,a)=>{ const m=me.board.find(x=>x.id===a.target.id); return (!b || m.atk>me.board.find(x=>x.id===b.target.id).atk) ? a : b; }, null);
      if(best && total+me.board.find(x=>x.id===best.target.id).atk>=op.hp) return best;
    }
    // 1-2) 침묵으로 마지막 도발 벽을 걷어 내면 이번 턴에 끝낼 수 있을 때
    if(ctx.taunts===1 && ctx.readyAtk>=op.hp){
      const si=plays.find(a=>{ const e=me.hand.find(c=>c.id===a.cardId).effect; return e && e.type==='silence' && a.target && op.board.find(m=>m.id===a.target.id).taunt; });
      if(si) return si;
    }

    // 2) 동전: 쓰면 마나를 더 많이 쓸 수 있을 때만 (낭비 방지). 쓰고 나면 다음 판단에서 그 마나로 카드를 낸다.
    if(coinAct){
      const coin=me.hand.find(isCoin);   // v29: 손패의 첫 주문이 아니라 동전류를 본다
      if(planCost(bestPlan(view, ctx, me.mana+coin.effect.value)) > planCost(bestPlan(view, ctx, me.mana))) return coinAct;
    }

    // 2-1) 생명력 비용 주문: 체력이 넉넉할 때만 (마나 계획과 따로 판단)
    const lc=plays.find(a=>{ const c=me.hand.find(x=>x.id===a.cardId), fx=c.lifeCost && SPELL_FX[c.effect.type]; return fx && fx.spellWorth && fx.spellWorth(c, view, ctx, {val, W})>=SPELL_MIN; });
    if(lc) return lc;

    // 3) 카드 내기
    if(plays.length){
      const plan=bestPlan(view, ctx, me.mana);
      if(plan.length){
        plan.sort((x,y)=>rankOf(x)-rankOf(y) || y.cost-x.cost);
        const card=plan[0];
        const entries=plays.filter(a=>a.cardId===card.id);
        if(entries.length===1) return entries[0];
        return entries.reduce((b,a)=>targetScore(card,a.target,view,ctx)>targetScore(card,b.target,view,ctx)?a:b);
      }
    }

    // 3-1) 금단의 과일: 남은 마나로 더 낼 카드가 없고, 마무리가 보이거나 체력이 낮을 때
    { const fr=plays.find(a=>me.hand.find(c=>c.id===a.cardId).effect.type==='fruit'); if(fr && fruitOk(view)) return fr; }

    // 4) 공격 (가장 점수 높은 한 건. 손해만 보는 공격은 하지 않는다)
    if(atks.length){
      let best=null, bs=-Infinity;
      for(const a of atks){ const s=attackScore(a, view, ctx); if(s>bs){ bs=s; best=a; } }
      if(best && bs>0) return best;
    }
    return {type:'END_TURN'};
  }
  return {decide, W};
})();
BotPlayers.rule2 = { decide: Rule2.decide };

// v80 영웅 공격: 두 규칙 봇은 하던 대로 행동하다가 턴을 끝내기 직전, 영웅 공격력이 남아 있으면 한 번 휘두른다.
//  마무리 가능 → 영웅 / 반격에 죽지 않고 처치할 수 있는 하수인 → 가장 센 것 / 아니면 영웅 / 도발 때문에 하수인뿐이면 반격이 가장 약한 것 (반격에 죽으면 안 침)
function heroAttackPick(view){
  const L=view.legal.filter(a=>a.type==='HERO_ATTACK'); if(!L.length) return null;
  const me=view.me, op=view.opp, atk=me.heroAtk, myLife=me.hp+(me.armor||0);
  const face=L.find(a=>a.target.kind==='hero');
  if(face && atk>=op.hp+(op.armor||0)) return face;
  const mins=L.filter(a=>a.target.kind==='minion').map(a=>({a, d:op.board.find(x=>x.id===a.target.id)})).filter(x=>x.d);
  const kills=mins.filter(x=>!x.d.shield && atk>=x.d.hp && x.d.atk<myLife);
  if(kills.length) return kills.reduce((p,q)=>(q.d.atk+q.d.hp>p.d.atk+p.d.hp)?q:p).a;
  if(face) return face;
  const safe=mins.filter(x=>x.d.atk<myLife);
  return safe.length ? safe.reduce((p,q)=>q.d.atk<p.d.atk?q:p).a : null;
}
for(const k of ['rule','rule2']){
  const orig=BotPlayers[k];
  BotPlayers[k]={...orig, decide(view){
    const a=orig.decide(view);
    if(a && a.type==='END_TURN' && !(view.pending && view.pending.seat===view.seat)){ const hh=heroAttackPick(view); if(hh) return hh; }
    return a;
  }};
}

// ---- 헤드리스 자동 대전 (엔진 검증 / 전적 데이터 생성용). 콘솔: selfPlay(1000) ----
function selfPlay(games=1000, botA=BotPlayers.rule, botB=BotPlayers.random, maxTurns=200, opts={}){
  const st={games, wins:[0,0], firstWins:0, draws:0, stalled:0, errors:0, avgTurns:0}; let turns=0;   // firstWins: 선공이 이긴 판 수
  for(let g=0; g<games; g++){
    let s=newGame(Math.random, opts.deckGen ? {...opts, decks:opts.deckGen()} : opts);   // opts.deckGen: 판마다 [덱0, 덱1] 을 만들어 주는 함수 (예: ()=>[buildRandomDeck(), buildRandomDeck()])
    while(!s.over && s.turnNo<=maxTurns){
      const bot = s.turn===0 ? botA : botB;
      const r=apply(s, bot.decide(viewFor(s, s.turn)), s.turn);
      if(!r.ok){ st.errors++; break; }
      s=r.state;
    }
    turns+=s.turnNo;
    if(s.over){ if(s.winner===null) st.draws++; else { st.wins[s.winner]++; if(s.winner===s.first) st.firstWins++; } } else if(st.errors===0 || s.turnNo>maxTurns) st.stalled++;
  }
  st.avgTurns=+(turns/games).toFixed(1);
  return st;
}

if (typeof module !== 'undefined') {
  module.exports = {VERSION, CONFIG, CARD_POOL, BotPlayers, newGame, apply, viewFor, selfPlay, mulliganHand,
                    buildRandomDeck, validateDeckList, shuffle};
}
