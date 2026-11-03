카드 대전 강화학습 (DQN=Q러닝 / SARSA / 몬테카를로)
==================================================

폴더 구조 (C:\card_rl 기준)
  game\   engine_v89.js(기존), analyze_v89.js(수정본), features.js, rl_bot.js
  train\  common.py, train.py, env_server.js, eval_js.js
  models\ dqn\  sarsa\  mc\     ← 학습 결과가 여기에 저장됨

설치: 이 zip 을 C:\card_rl 에 풀면 위 구조에 맞게 들어갑니다(analyze_v89.js 는 덮어쓰기).

실행 (anaconda_prompt 에서 C:\card_rl\start.bat 실행 후)
  1) 먼저 동작 확인 (몇 분):
       python train\train.py --algo dqn --games 200 --eval-every 100 --eval-games 20 --warmup 1000
  2) 본 학습 (알고리즘별로 각각):
       python train\train.py --algo dqn   --games 20000
       python train\train.py --algo sarsa --games 20000
       python train\train.py --algo mc    --games 20000
     - 화면에 "N 결정/초" 가 보입니다. 한 판 ≈ 40~60 결정이므로 판/초 ≈ (결정/초) ÷ 50.
     - 2000판마다 탐험 없이 random / rule / rule2 와 대결해 승률을 출력·저장합니다.
     - Ctrl+C 로 멈추면 그 시점까지 저장하고 끝납니다. 이어서: 같은 명령에 --resume 추가.
  3) 학습된 모델을 게임 코드(JS)로 직접 대결시켜 확인:
       node train\eval_js.js dqn 500          (최신 모델)
       node train\eval_js.js dqn 500 best     (평가 최고 모델)
  4) 분석기에서 봇 이름으로 사용: rl_dqn, rl_sarsa, rl_mc, rl_dqn_best ... (analyze_v89.js 는 모델이 있으면 자동 등록)
       node game\analyze_v89.js 1000 rl_dqn      (같은 봇끼리 미러전이라 상대 비교용은 eval_js.js 를 쓰세요)

주요 옵션
  --deck random|fixed   random: 매판 양쪽 랜덤 덱 / fixed: 에이전트 덱 고정(상대는 랜덤)
  --opp rule2:0.5,rule:0.3,random:0.2   학습 상대 비율
  --shape 0.5           HP 차이 보조 보상(0 이면 승패만)
  --procs 5 --envs 16   Node 프로세스 수 × 프로세스당 동시 게임 (CPU 코어에 맞게)
  --minutes 120         시간 제한
  --eval-every 2000 --eval-games 100

알아둘 점
  - 학습된 모델은 엔진 버전/카드 구성에 묶입니다. 카드·규칙을 바꾸면 다시 학습해야 하고,
    카드 수가 달라지면 rl_bot.js 가 "엔진과 맞지 않습니다" 오류를 냅니다.
  - 화면(이펙트·이미지) 수정은 학습과 무관합니다. 엔진 규칙은 학습 중 건드리지 마세요.
  - MC 는 할인율 1.0, DQN/SARSA 는 0.99 가 기본입니다(MC 에 0.99 를 쓰면 "턴만 넘기는" 쪽으로 쏠립니다).


[추가] 치트 봇 / 강화학습 모델 상대 / 자동 난이도 상승
==================================================
한 번에 이어서 실행: cmd(anaconda_prompt)에서는 ; 가 아니라 & 를 씁니다. 그냥 run_all.bat 을 실행하면 됩니다.
    python train\train.py --algo dqn --games 20000 & python train\train.py --algo sarsa --games 20000 & python train\train.py --algo mc --games 20000
  (& 는 앞이 실패해도 다음 실행, && 는 앞이 성공해야 다음 실행)

치트 봇 (엔진의 mods 기능 사용, 엔진 수정 없음)  ← game\opponents.js 에서 수치 조정 가능
    c1: 영웅 체력 +5, 시작 손패 +1                                  (rule2 끼리 붙이면 치트 쪽 약 63% 승)
    c2: 체력 +10, 매 턴 마나 +1, 시작 손패 +1                       (약 73%)
    c3: 체력 +15, 매 턴 마나 +2, 시작 손패 +2, 하수인 비용 -1, 매 턴 2장 드로우   (약 97%, 매우 강함)
  상대 지정 문법:  rule2+c2 (치트)  /  rl_sarsa_best (학습된 모델)  /  rl_mc+c1 (모델+치트)

자동 난이도 상승:  python train\train.py --algo dqn --games 20000 --curriculum
    단계0 기본 상대(--opp) → 평가에서 rule2 승률 60% 이상이면
    단계1 rule2+c1, rule2+c2 추가 → rule2+c2 승률 50% 이상이면
    단계2 rule2+c3 + 다른/과거 강화학습 모델(models\*\best.json) 추가 → rule2+c3 승률 45% 이상이면
    단계3 치트까지 받은 강화학습 모델 포함 최고 난이도
    기준 변경: --promote 0.6,0.5,0.45     현재 단계는 체크포인트에 저장되어 --resume 으로 이어집니다.
    추가 평가 결과는 models\<알고리즘>\log_hard.csv 에 저장됩니다 (기존 log.csv 형식은 그대로).
직접 구성:  --opp "rule2:0.4,rule2+c2:0.3,rl_sarsa_best:0.3"     추가 평가 상대: --eval-extra rule2+c2,rl_mc_best
확인:       node train\eval_js.js dqn 300 best --hard      (치트 봇 + 다른 모델과 대결)
            node train\eval_js.js dqn 300 best --opp rl_sarsa_best,rule2+c3
주의: 상대로 쓰는 RL 모델은 학습 시작 시 읽고, 평가 때 best 가 갱신되면 다시 읽습니다. 모델 파일이 없는 상대는 자동 제외됩니다.
      학습 상대 모델은 JS 로 계산하므로 RL 상대 비중이 커지면 초당 판수가 다소 줄 수 있습니다.


[추가] 학습 로그와 그래프
==================================================
학습하면 models\<알고리즘>\ 에 아래 파일이 쌓입니다.
  eval_log.csv   평가 기록: run(실행 번호), games, stage, eps, loss, vs_random, vs_rule, vs_rule2, best_score
  train_log.csv  20초마다 기록: run, time, games, decisions_per_sec, eps, loss, train_winrate(탐험 포함), stage
  log_hard.csv   치트 봇 / 모델 상대 평가(세로 형식): run, games, stage, opponent, winrate
  runs.csv       실행 이력: 시작 시각, 시작 판수, 목표 판수, --resume 여부, 덱, 상대, 커리큘럼 여부, 학습 설정
  log.csv        예전 형식 그대로 유지 (기존 기록과 이어짐)
- run 은 실행마다 다른 번호(날짜_시각)입니다. --resume 없이 다시 시작해 판 수가 0부터 다시 시작해도 구분됩니다.
- 학습이 끝날 때 방금 평가한 직후면 같은 평가를 한 번 더 하지 않습니다(중복 줄 방지).

그래프:  pip install matplotlib   (처음 한 번)
         python train\plot_log.py          → models\plots\compare.png (알고리즘 비교), hard.png (치트/모델 상대), train.png (학습 중 승률·속도)
         python train\plot_log.py --all    판 수가 0 으로 되돌아간 이전 구간도 흐리게 함께 표시
         python train\plot_log.py --show   저장 후 창으로도 열기
- 기본은 가장 최근의 연속된 학습 구간만 그립니다. 예전 log.csv 만 있어도 그려지고, eval_log.csv 가 있으면 그쪽을 씁니다.
- 한글 폰트(맑은 고딕 등)가 없으면 영어 라벨로 그려집니다.
