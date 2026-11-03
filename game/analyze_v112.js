#!/usr/bin/env node
'use strict';
// 현재 엔진(game\engine_config.json 의 engine) 호환 분석기 — random / rule / rule2 봇용
// 사용법: node analyze_v112.js [판수=1000] [봇=rule|rule2|random] [--no-save]
// JSON 저장은 기존처럼 유지하며, db-config.json 설정이 있으면 MySQL에도 완료 경기를 저장합니다.
const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');
const E = require('./engine_current.js');   // engine_config.json 의 엔진(v112)을 자동 사용
const mysql = require('mysql2/promise');

async function createDbTables(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS analysis_runs (
    run_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    engine_version VARCHAR(64) NOT NULL,
    bot_type VARCHAR(32) NOT NULL,
    requested_games INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
  ) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS games (
    game_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    run_id BIGINT UNSIGNED NOT NULL,
    game_number INT NOT NULL,
    engine_version VARCHAR(64) NOT NULL,
    winner_seat SMALLINT NOT NULL,
    turns INT NOT NULL,
    played_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_run_game (run_id, game_number),
    CONSTRAINT fk_games_run FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id)
  ) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS game_players (
    game_id BIGINT UNSIGNED NOT NULL,
    seat SMALLINT NOT NULL,
    player_type VARCHAR(16) NOT NULL DEFAULT 'bot',
    bot_type VARCHAR(32) NOT NULL,
    is_winner BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (game_id, seat),
    CONSTRAINT fk_gp_game FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS cards (
    card_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    card_key VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL,
    card_type VARCHAR(32) NULL,
    cost INT NULL
  ) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS game_cards (
    game_id BIGINT UNSIGNED NOT NULL,
    seat SMALLINT NOT NULL,
    card_id BIGINT UNSIGNED NOT NULL,
    deck_count INT NOT NULL DEFAULT 0,
    opening_count INT NOT NULL DEFAULT 0,
    played_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (game_id, seat, card_id),
    CONSTRAINT fk_gc_player FOREIGN KEY (game_id, seat)
      REFERENCES game_players(game_id, seat) ON DELETE CASCADE,
    CONSTRAINT fk_gc_card FOREIGN KEY (card_id) REFERENCES cards(card_id)
  ) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS game_actions (
    game_id BIGINT UNSIGNED NOT NULL,
    seq INT NOT NULL,
    seat SMALLINT NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    card_name VARCHAR(191) NULL,
    PRIMARY KEY (game_id, seq),
    CONSTRAINT fk_ga_game FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  // 기존 테이블에 새 컬럼 추가 (이미 있으면 건너뜀). 기존 행은 NULL = '기록 안 됨'.
  await ensureColumn(conn, 'games', 'first_seat', 'SMALLINT NULL');
  await ensureColumn(conn, 'game_players', 'final_hp', 'INT NULL');
  await ensureColumn(conn, 'game_players', 'final_hand', 'INT NULL');
  await ensureColumn(conn, 'game_players', 'final_board', 'INT NULL');
  await ensureColumn(conn, 'game_cards', 'was_seen', 'TINYINT NULL');
}

async function ensureColumn(conn, table, column, definition) {
  const [rows] = await conn.execute(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  if (!rows.length) await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

// 한 판 저장을 하나의 트랜잭션으로 묶는다: 전부 성공하면 commit, 하나라도 실패하면 rollback.
async function saveCompletedGame(conn, runId, game) {
  await conn.beginTransaction();
  try {
    await saveCompletedGameRows(conn, runId, game);
    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    throw err;
  }
}

const cardIdCache = new Map();
async function getCardId(conn, name) {
  if (cardIdCache.has(name)) return cardIdCache.get(name);
  const [rows] = await conn.execute('SELECT card_id FROM cards WHERE card_key = ?', [name]);
  const id = rows.length ? rows[0].card_id : null;
  cardIdCache.set(name, id);
  return id;
}

async function saveCompletedGameRows(conn, runId, game) {
  const [res] = await conn.execute(
    'INSERT INTO games (run_id, game_number, engine_version, winner_seat, turns, first_seat) VALUES (?, ?, ?, ?, ?, ?)',
    [runId, game.gameNumber, game.engineVersion, game.winner, game.turns, game.first ?? null]
  );
  const gameId = res.insertId;
  for (let seat = 0; seat < 2; seat++) {
    const f = (game.final && game.final[seat]) || {};
    await conn.execute(
      'INSERT INTO game_players (game_id, seat, player_type, bot_type, is_winner, final_hp, final_hand, final_board) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [gameId, seat, 'bot', game.botType, seat === game.winner, f.hp ?? null, f.hand ?? null, f.board ?? null]
    );
  }
  const deckCounts = [new Map(), new Map()];
  const openingCounts = [new Map(), new Map()];
  const playedCounts = [new Map(), new Map()];
  for (let seat = 0; seat < 2; seat++) {
    for (const name of game.decks[seat]) deckCounts[seat].set(name, (deckCounts[seat].get(name) || 0) + 1);
    for (const name of game.opening[seat]) openingCounts[seat].set(name, (openingCounts[seat].get(name) || 0) + 1);
    for (const action of game.actions) {
      if (action.seat === seat && action.type === 'PLAY_CARD' && action.card) {
        playedCounts[seat].set(action.card, (playedCounts[seat].get(action.card) || 0) + 1);
      }
    }
    // 덱에 없던 카드(생성 카드 등)도 관측/사용됐다면 기록하도록 합집합으로 순회
    const seenSet = (game.seen && game.seen[seat]) || new Set();
    const names = new Set([...deckCounts[seat].keys(), ...openingCounts[seat].keys(), ...playedCounts[seat].keys(), ...seenSet]);
    for (const name of names) {
      const cardId = await getCardId(conn, name);
      if (cardId === null) continue;
      await conn.execute(
        'INSERT INTO game_cards (game_id, seat, card_id, deck_count, opening_count, played_count, was_seen) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, seat, cardId, deckCounts[seat].get(name) || 0, openingCounts[seat].get(name) || 0, playedCounts[seat].get(name) || 0, seenSet.has(name) ? 1 : 0]
      );
    }
  }
  if (game.actions.length) {
    const rows = game.actions.map((a, i) => [gameId, i + 1, a.seat, a.type, a.card || null]);
    await conn.query('INSERT INTO game_actions (game_id, seq, seat, action_type, card_name) VALUES ?', [rows]);
  }
}

async function main() {
const args = process.argv.slice(2);
const numArg = args.find(x => /^\d+$/.test(x));
const GAMES = Math.max(1, Math.min(1000000, Number(numArg || 1000)));
const BOT_NAME = args.find(x => !x.startsWith('--') && !/^\d+$/.test(x)) || 'rule';
const BOT = E.BotPlayers[BOT_NAME];
const SAVE = !args.includes('--no-save');
const MAX_TURNS = 200;
if (!BOT) {
  console.error(`없는 봇: ${Object.keys(E.BotPlayers).join(', ')}`);
  process.exit(1);
}
const configPath = path.join(__dirname, 'db-config.json');
if (!fs.existsSync(configPath)) {
  console.error('db-config.json 파일이 없습니다. 제공된 db-config.example.json을 복사해 db-config.json을 만들고 MySQL 접속 정보를 입력하세요.');
  process.exitCode = 1;
  return;
}
let dbConfig;
try { dbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
catch (err) { console.error('db-config.json 읽기 실패:', err.message); process.exitCode = 1; return; }
let db;
let runId;
try {
  db = await mysql.createConnection(dbConfig);
  await createDbTables(db);
  for (const c of E.CARD_POOL) {
    await db.execute(
      'INSERT INTO cards (card_key, name, card_type, cost) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), card_type=VALUES(card_type), cost=VALUES(cost)',
      [c.name, c.name, c.type || null, Number.isFinite(Number(c.cost)) ? Number(c.cost) : null]
    );
  }
  const [runResult] = await db.execute(
    'INSERT INTO analysis_runs (engine_version, bot_type, requested_games, status) VALUES (?, ?, ?, ?)',
    [String(E.VERSION), BOT_NAME, GAMES, 'running']
  );
  runId = runResult.insertId;
  console.log(`MySQL 연결 성공 · analysis_run=${runId}`);
} catch (err) {
  console.error('MySQL 초기화 실패:', err.message);
  if (db) await db.end().catch(() => {});
  process.exitCode = 1;
  return;
}
const names = E.CARD_POOL.map(c => c.name);
const defs = Object.fromEntries(E.CARD_POOL.map(c => [c.name, c]));
const stats = Object.fromEntries(names.map(name => [name, {
  name, deckGames: 0, deckWins: 0, absentGames: 0, absentWins: 0,
  openingGames: 0, openingWins: 0, seenGames: 0, seenWins: 0,
  playedGames: 0, playedWins: 0, plays: 0, deckCopies: 0
}]));
const costStats = new Map(), typeStats = new Map(), actionCounts = new Map(), eventCounts = new Map(), turnFlow = new Map();
const pairs = new Map();
const outcome = {games:GAMES, completed:0, draws:0, stalled:0, errors:0, firstWins:0, secondWins:0, turnSum:0, turns:[]};
const pct = (n,d) => d ? (100*n/d).toFixed(1)+'%' : 'n/a';
const ci95 = (w,n) => {
  if (!n) return 'n/a';
  const z=1.96,p=w/n,den=1+z*z/n,mid=(p+z*z/(2*n))/den;
  const rad=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;
  return `${(Math.max(0,mid-rad)*100).toFixed(1)}–${(Math.min(1,mid+rad)*100).toFixed(1)}%`;
};
const table = (title, rows) => { console.log(`\n== ${title} ==`); if (!rows.length) console.log('(표본 없음)'); else console.table(rows); };
const reportGames = [];

for (let g=0; g<GAMES; g++) {
  // v89 엔진의 권장 무작위 덱 생성기를 사용한다. 양쪽 모두 같은 봇으로 미러전.
  let s = E.newGame(Math.random, {decks:[E.buildRandomDeck(), E.buildRandomDeck()]});
  const initialDecks = s.seats.map(p => p.deck.map(c => c.name));
  const opening = s.seats.map(p => {
    const ids = new Set(p.startIds || []);
    return p.hand.filter(c => ids.has(c.id)).map(c => c.name);
  });
  const seen = [new Set(opening[0]), new Set(opening[1])];
  const played = [new Set(), new Set()];
  const actions = [];
  let gameErrors = 0, guard = 0;

  while (!s.over && s.turnNo <= MAX_TURNS && guard++ < 5000) {
    const seat = s.turn;
    const view = E.viewFor(s, seat);
    let action;
    try { action = BOT.decide(view); }
    catch (err) { gameErrors++; break; }
    if (!action || !action.type) { gameErrors++; break; }
    const card = action.cardId != null ? s.seats[seat].hand.find(c => c.id === action.cardId) : null;
    const cardName = card && card.name;
    const oldHandIds = s.seats.map(p => new Set(p.hand.map(c => c.id)));
    const r = E.apply(s, action, seat);
    actions.push({type:action.type, seat, card:cardName || null});
    actionCounts.set(action.type, (actionCounts.get(action.type)||0)+1);
    if (!r.ok) { gameErrors++; break; }
    for (const ev of (r.events || [])) {
      eventCounts.set(ev.type, (eventCounts.get(ev.type)||0)+1);
    }
    // 이벤트의 name 필드는 드로우된 카드가 아니라 효과를 발생시킨 카드일 수 있으므로,
    // 상태 전후의 손패 ID 차이로 실제 새 손패 카드를 추적한다.
    for (let owner=0; owner<2; owner++) {
      for (const c of r.state.seats[owner].hand) {
        if (!oldHandIds[owner].has(c.id) && c.name) seen[owner].add(c.name);
      }
    }
    if (cardName && action.type === 'PLAY_CARD') {
      played[seat].add(cardName);
      if (stats[cardName]) stats[cardName].plays++;
    }
    s = r.state;
  }
  outcome.errors += gameErrors;
  if (!s.over) { outcome.stalled++; continue; }
  if (s.winner === null) { outcome.draws++; continue; }
  outcome.completed++;
  const winner = s.winner;
  if (winner === s.first) outcome.firstWins++; else outcome.secondWins++;
  outcome.turnSum += s.turnNo;
  outcome.turns.push(s.turnNo);

  for (let seat=0; seat<2; seat++) {
    const deckSet = new Set(initialDecks[seat]);
    for (const n of deckSet) if (stats[n]) {
      stats[n].deckGames++; stats[n].deckCopies += initialDecks[seat].filter(x=>x===n).length;
      if (seat===winner) stats[n].deckWins++;
    }
    for (const n of names) if (!deckSet.has(n) && stats[n]) {
      stats[n].absentGames++; if (seat===winner) stats[n].absentWins++;
    }
    for (const n of new Set(opening[seat])) if (stats[n]) {
      stats[n].openingGames++; if (seat===winner) stats[n].openingWins++;
    }
    for (const n of seen[seat]) if (stats[n]) {
      stats[n].seenGames++; if (seat===winner) stats[n].seenWins++;
    }
    for (const n of played[seat]) if (stats[n]) {
      stats[n].playedGames++; if (seat===winner) stats[n].playedWins++;
    }
    for (const n of deckSet) {
      const d=defs[n]; if (!d) continue;
      const ck=String(d.cost), cs=costStats.get(ck)||{cost:d.cost,games:0,wins:0};
      cs.games++; if(seat===winner)cs.wins++; costStats.set(ck,cs);
      const tk=d.type==='spell'?'주문':'하수인', ts=typeStats.get(tk)||{type:tk,games:0,wins:0};
      ts.games++; if(seat===winner)ts.wins++; typeStats.set(tk,ts);
    }
    const list=[...deckSet].sort();
    for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++) {
      const key=list[i]+'\u0000'+list[j], p=pairs.get(key)||{a:list[i],b:list[j],games:0,wins:0};
      p.games++; if(seat===winner)p.wins++; pairs.set(key,p);
    }
  }
  const gameRecord = {game:g+1, winner, first:s.first, turns:s.turnNo, opening, decks:initialDecks, actions, final:s.seats.map(p=>({hp:p.hp, hand:p.hand.length, board:p.board.length}))};
  try {
    await saveCompletedGame(db, runId, {gameNumber:g+1, engineVersion:String(E.VERSION), winner, turns:s.turnNo, first:s.first, decks:initialDecks, opening, seen, actions, final:gameRecord.final, botType:BOT_NAME});
  } catch (err) {
    console.error(`MySQL 경기 ${g+1} 저장 실패:`, err.message);
    throw err;
  }
  if (SAVE) reportGames.push(gameRecord);
}

const total = outcome.completed;
console.log(`\n##### ${E.VERSION} 심층 분석 · ${new Date().toLocaleString('ko-KR')} · 봇=${BOT_NAME} · 요청 ${GAMES}판 #####`);
console.log(`완료 ${total}, 무승부 ${outcome.draws}, 멈춤 ${outcome.stalled}, 오류 ${outcome.errors}`);
console.log(`선공 승률 ${pct(outcome.firstWins,total)} (${outcome.firstWins}/${total}), 후공 승률 ${pct(outcome.secondWins,total)}; 평균 경기 턴 ${total?(outcome.turnSum/total).toFixed(1):'n/a'}`);

const cardTable = names.map(n => {
  const s=stats[n], d=defs[n], wr=s.deckGames?s.deckWins/s.deckGames:0, absent=s.absentGames?s.absentWins/s.absentGames:0;
  const diff=s.deckGames&&s.absentGames?(wr-absent)*100:null;
  return {카드:n,코스트:d.cost,종류:d.type==='spell'?'주문':'하수인',덱포함승률:pct(s.deckWins,s.deckGames),미포함승률:pct(s.absentWins,s.absentGames),'차이(%p)':diff===null?'n/a':+diff.toFixed(1),포함표본:s.deckGames,신뢰구간95:ci95(s.deckWins,s.deckGames),초기손패경기:s.openingGames,초기손패승률:pct(s.openingWins,s.openingGames),관측경기:s.seenGames,관측승률:pct(s.seenWins,s.seenGames),사용경기:s.playedGames,사용했을때승률:pct(s.playedWins,s.playedGames),사용횟수:s.plays};
}).sort((a,b)=>(Number(b['차이(%p)'])||-999)-(Number(a['차이(%p)'])||-999));
table('카드별 성능 (덱 포함/미포함 · 초기 손패/관측/실제 사용)',cardTable);
const minSample=Math.max(30,Math.floor(total*0.1));
table(`표본 ${minSample} 이상 카드 후보 (인과관계 아님)`,cardTable.filter(r=>r.포함표본>=minSample&&r['차이(%p)']!=='n/a').sort((a,b)=>a['차이(%p)']-b['차이(%p)']).slice(0,10));
table('코스트별 덱 포함 성적',[...costStats.values()].sort((a,b)=>a.cost-b.cost).map(x=>({코스트:x.cost,포함표본:x.games,승률:pct(x.wins,x.games),신뢰구간95:ci95(x.wins,x.games)})));
table('카드 종류별 덱 포함 성적',[...typeStats.values()].map(x=>({종류:x.type,표본:x.games,승률:pct(x.wins,x.games),신뢰구간95:ci95(x.wins,x.games)})));
table('행동 종류 집계',[...actionCounts.entries()].map(([행동,횟수])=>({행동,횟수})).sort((a,b)=>b.횟수-a.횟수));
table('이벤트 종류 집계',[...eventCounts.entries()].map(([이벤트,횟수])=>({이벤트,횟수})).sort((a,b)=>b.횟수-a.횟수).slice(0,30));
const pairRows=[...pairs.values()].filter(p=>p.games>=Math.max(20,Math.floor(total*0.05))).map(p=>{
 const a=stats[p.a],b=stats[p.b],actual=p.wins/p.games*100,baseA=a.deckGames?a.deckWins/a.deckGames*100:50,baseB=b.deckGames?b.deckWins/b.deckGames*100:50;
 return {조합:p.a+' + '+p.b,실제승률:+actual.toFixed(1),개별기준평균:+((baseA+baseB)/2).toFixed(1),'시너지추정(%p)':+(actual-(baseA+baseB)/2).toFixed(1),표본:p.games};
}).sort((a,b)=>b['시너지추정(%p)']-a['시너지추정(%p)']);
table('시너지 상위 15 (탐색용 추정치 · 인과효과 아님)',pairRows.slice(0,15));
table('시너지 하위 10',pairRows.slice(-10).reverse());
console.log('\n※ 승률 차이와 시너지는 v89 엔진의 무작위 덱 및 선택한 봇 환경에서의 연관성입니다. 인과 효과를 확정하지 않습니다.');
console.log('※ v89 엔진은 기존 v72 기록 API와 달라 후속 드로우·턴별 전황을 동일한 방식으로 복원할 수 없습니다. 이 버전은 엔진이 실제로 내보내는 상태와 이벤트만 집계합니다.');
if (SAVE) {
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const summary={version:E.VERSION,bot:BOT_NAME,requested:GAMES,outcome,cardTable,costStats:[...costStats.values()],typeStats:[...typeStats.values()],actions:[...actionCounts],events:[...eventCounts],synergy:pairRows};
  fs.appendFileSync(path.join(__dirname,'분석결과_'+E.VERSION+'.json'),JSON.stringify(summary,null,2)+'\n','utf8');
  fs.appendFileSync(path.join(__dirname,'경기기록_'+E.VERSION+'.jsonl'),reportGames.map(x=>JSON.stringify(x)).join('\n')+(reportGames.length?'\n':''),'utf8');
  console.log('\n저장: 분석결과_'+E.VERSION+'.json, 경기기록_'+E.VERSION+'.jsonl');
}

try {
  await db.execute("UPDATE analysis_runs SET status='completed', completed_at=CURRENT_TIMESTAMP WHERE run_id=?", [runId]);
} finally {
  await db.end();
}
}

main().catch(err => {
  console.error('분석 실행 중 오류:', err.stack || err.message || err);
  process.exitCode = 1;
});
