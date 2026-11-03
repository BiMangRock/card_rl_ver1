카드 대전 프로젝트 — 환경·폴더·버전 정리 (다른 AI/개발자가 읽는 용도)
작성일: 2026-10-25   (표시: [확인]=사용자 출력/실행으로 확인됨, [지정]=명령으로 지정했으나 결과 미확인, [미확인])

1. 프로젝트 개요
- 하스스톤 스타일 웹 카드 게임 "카드 대전". 게임 본체는 단일 HTML(v89.html) + 이미지 폴더, 엔진 코드는 engine_v89.js(= v89.html 안의 엔진을 Node 모듈로 분리한 것).
- 현재 엔진 버전 문자열: "v89". 카드 풀 162종 [확인]. 매판 랜덤 덱 생성 가능(buildRandomDeck).
- 카드 디자인/이펙트 작업은 HTML 쪽에서 계속 진행 중. 강화학습은 HTML과 무관하게 engine_v89.js만 사용한다.
- 봇(엔진 내장): random(초급, 무작위), rule(규칙 기반), rule2(규칙 기반 개선판). 지금 만드는 것은 강화학습 "상급" 봇.
  - 이 환경(개발용 샌드박스)에서 각 300판 측정: rule vs random 승률 87%, rule2 vs rule 73% (랜덤 덱, 표본 작음).

2. 사용자 PC 환경 (Windows)
- OS: Windows (사용자 계정 이름 changmin) [확인: 경로 C:\Users\changmin]
- CPU: Intel Core i5-10500 (6코어 12스레드), RAM 16GB, GPU: NVIDIA GeForce RTX 3060 12GB [사용자 제공]
- Anaconda: C:\Users\changmin\anaconda3 [확인]
- conda 환경: cardrl, 경로 C:\Users\changmin\anaconda3\envs\cardrl [확인]. Python 3.11로 생성 지시함 [지정].
- PyTorch 2.14.1+cu126, torch.cuda.is_available()=True, 장치 "NVIDIA GeForce RTX 3060" [확인]
- numpy 설치함 [지정: pip install numpy]
- Node.js v24.22.1, 위치 C:\Program Files\nodejs [확인]
- 알려진 문제: anaconda_prompt 에서 PATH 에 powershell 과 node 가 없어서 `conda activate` 및 `node` 가 실패한다.
  해결: C:\card_rl\start.bat 이 PATH 보강 + conda activate cardrl + cd C:\card_rl 을 수행한다. 새 anaconda_prompt 를 열 때마다 `C:\card_rl\start.bat` 실행.
  start.bat 내용:
      @echo off
      set PATH=%PATH%;C:\Windows\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs
      call conda activate cardrl
      cd /d C:\card_rl

3. 폴더 구조
C:\card_rl\
  start.bat
  game\                      ← 학습용으로 "고정"한 엔진 사본 (원본 프로젝트 폴더와 별개)
    engine_v89.js            게임 엔진 (규칙·카드·봇). 학습 중 수정 금지.
    analyze_v89.js           분석기 (아래 4번). RL 봇이 있으면 자동 등록.
    features.js              상태/행동 → 숫자 특징 변환 (학습·추론 공용)
    rl_bot.js                학습된 모델 JSON 을 읽어 BotPlayers 에 rl_dqn/rl_sarsa/rl_mc(+_best) 등록
  train\
    env_server.js            Node 벡터 환경 서버 (stdin/stdout JSON 한 줄씩)
    common.py                Q 네트워크, 관측 배치 변환, VecEnv, JSON 내보내기, 평가
    train.py                 --algo dqn|sarsa|mc 학습 스크립트
    eval_js.js               학습된 모델을 JS 로 rule/rule2/random 과 대결시키는 평가
  models\
    dqn\  sarsa\  mc\        model.pt/model.json(최신), best.pt/best.json(평가 최고), log.csv
- 원본 게임 프로젝트(v89.html, images\ 등)는 C:\card_rl 밖 별도 폴더에 있음(정확한 위치 [미확인]). 화면 작업은 거기서 계속한다.
- 개발 중 이 폴더 구조의 코드는 리눅스 샌드박스(Python 3.13, Node 22, torch CPU)에서 테스트했다. 사용자 PC(Windows, GPU)에서의 실제 학습 실행은 [미확인].

4. 분석기 / DB (analyze_v89.js)
- 사용법: node analyze_v89.js [판수] [봇] [--no-save]  (예: node analyze_v89.js 1000 rule)
- 같은 봇끼리 미러전, 양쪽 랜덤 덱. 결과를 JSON(분석결과_v89.json 이어붙이기, 경기기록_v89.jsonl)과 MySQL 에 저장.
- MySQL: mysql2 패키지 필요(npm install mysql2), 같은 폴더에 db-config.json(접속 정보) 필요. 없으면 실행 불가. DB 연결 상태는 [미확인].
- DB 테이블: analysis_runs, games, game_players, cards, game_cards, game_actions. 한 판 저장은 트랜잭션 1개.
  게임 후 추가된 컬럼(기존 행은 NULL): games.first_seat, game_players.final_hp/final_hand/final_board, game_cards.was_seen.
- JSON 이어붙이기는 의도적으로 유지(여러 번 실행하면 JSON 객체가 연달아 쌓임, 전체가 단일 JSON 은 아님).
- 엔진 이벤트 집계와 승률/시너지 요약은 JSON 에만 있고 DB 에는 없음(요약은 DB 원본으로 재계산 가능).

5. 엔진 API (engine_v89.js 가 export 하는 것)
- VERSION, CONFIG, CARD_POOL, BotPlayers, newGame(rng, {decks}), apply(state, action, seat) → {ok, state, events}, viewFor(state, seat), selfPlay, mulliganHand, buildRandomDeck(rng), validateDeckList, shuffle
- viewFor(...).legal: 합법 행동 목록. 형태:
  END_TURN / PLAY_CARD{cardId,target} / ATTACK{attackerId,target} / HERO_ATTACK{target} / CHOOSE{index}(발견 선택) / TARGET{target}(대상 선택)
  target = null | {kind:'hero',seat} | {kind:'minion',seat,id}
- 행동하는 좌석은 항상 state.turn (pending 선택 중에도 pending.seat == turn 임을 확인함).
- 상태: DECK_SIZE 30, HERO_HP 30, MAX_MANA 10, MAX_HAND 10, MAX_BOARD 7.
- 카드 이름이 CARD_POOL 에 없는 토큰/생성 카드가 있음(약 22종 관찰) → 특징 추출에서 이름 인덱스 0("모름")으로 처리.

6. 강화학습 설계
- 알고리즘 3종(공통 Q 네트워크, 학습 목표만 다름): DQN(Q-러닝, Double DQN+리플레이), SARSA(온폴리시, 다음 실제 행동 사용), MC(몬테카를로, 경기 종료 후 실제 누적 보상 회귀).
  기본 할인율: dqn/sarsa 0.99, mc 1.0 (MC 에 0.99 를 주면 "턴만 넘기는" 정책으로 쏠리는 현상을 샌드박스에서 확인).
- 이후 추가 후보: PPO(셀프플레이), MCTS(탐색, 학습 없음). 표 기반(tabular) 방식은 상태가 너무 커서 불가 → 신경망 근사 사용. 동적계획법도 불가.
- 네트워크: 카드/하수인(개체) 인코더(이름 임베딩 24 + 효과종류 임베딩 12 + 숫자특징 24 → 64), 손패/내 필드/상대 필드 합 풀링 + 전역 특징 32 → 상태 128,
  합법 행동마다(타입·대상종류 원핫 + 출처/대상 개체 인코딩) 점수 Q(s,a) 계산. 가변 행동 수 대응. 약 16만 파라미터.
- 관측 메타(현재): F=24, G=32, nameCount=163, effCount=109, nTypes=6, nTk=5. 엔진/카드가 바뀌면 이 값이 달라져 모델 로드가 거부됨.
- 보상: 승 +1 / 패 -1 / 무·멈춤 0, 보조 보상으로 HP+방어도 차이의 포텐셜 기반 shaping(--shape, 기본 0.5, 0이면 승패만).
- 학습 상대: rule2 50% / rule 30% / random 20% (--opp). 에이전트 좌석은 판마다 번갈아 배정.
- 덱: --deck random(기본, 양쪽 매판 랜덤) 또는 fixed(에이전트 덱 고정, 상대 랜덤).
- 병렬: Node 프로세스 N개 × 프로세스당 동시 K판 (기본 N=min(5, CPU수-1), K=16). 평가는 별도 환경(2×8).
- 모델 호환: 학습된 가중치는 engine 버전·카드 구성에 묶임. 카드/규칙 변경 시 재학습 필요. 화면(이펙트·이미지) 수정은 무관.
- 검증됨(샌드박스): 파이썬 모델과 JS 순전파 출력이 일치(최대 오차 약 8e-6). DQN/SARSA/MC 각 200~500판 단기 학습이 오류 없이 완주, JS 평가 정상 동작.
  단기 학습 결과의 승률은 표본(20~60판)이 작아 성능 지표가 아님.

7. 대화에서 정한 사항(결정 이력)
- 강화학습은 Anaconda 환경에서 따로 학습하고, 끝나면 모델을 게임에 얹는다. 학습 중 HTML 화면 작업은 병행해도 된다(엔진 규칙을 건드리지 않는 한).
- 상급 봇은 알고리즘별로 여러 개를 만든다: 몬테카를로, SARSA, Q-러닝(신경망 버전). 필요하면 PPO/MCTS 추가.
- 덱을 랜덤으로 할지 고정으로 시작할지는 옵션(--deck)으로 둘 다 지원, 최종 선택은 미정.
