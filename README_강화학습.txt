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
