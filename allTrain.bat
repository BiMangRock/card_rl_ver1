@echo off
rem ===== EDIT ONLY THIS FILE (targets, opponent ratios, minutes) =====
set PATH=C:\Users\changmin\anaconda3\envs\cardrl;C:\Users\changmin\anaconda3\envs\cardrl\Library\bin;C:\Users\changmin\anaconda3\envs\cardrl\Scripts;C:\Program Files\nodejs;%PATH%
cd /d C:\card_rl

rem TAG: name of this run (used in labels and the time summary). Change it each run.
set TAG=r2
rem M: max minutes per stage (12 stages). 60 = up to 12 hours worst case. Lower it (5 = about 1 hour total) for a short run.
set M=60

rem ===== TARGET GAMES (TOTAL count, must be BIGGER than the current count) =====
rem Current counts when this was written: mc 18232 / dqn 69252 / sarsa 74199 / ppo 74686
rem To train more next time: check the current counts, then raise these numbers.
set MC_1=30000
set MC_2=40000
set MC_3=50000
set DQN_1=80000
set DQN_2=90000
set DQN_3=100000
set SARSA_1=85000
set SARSA_2=95000
set SARSA_3=105000
set PPO_1=85000
set PPO_2=95000
set PPO_3=105000

rem Shortcut for the logger. Every stage is shown on screen and saved to logs\train_YYYYMMDD.txt
set RUN=python train\run_logged.py

rem ===== OPPONENT MIX: every algorithm trains against ALL opponents =====
rem Numbers are weights (any scale). Stage 1 = mostly built-in bots, stage 3 = mostly RL bots.
set OPP1=random:10,rule:20,rule2:30,rl_dqn_v112_best:10,rl_sarsa_v112_best:10,rl_mc_v112_best:10,rl_ppo_v112_best:10
set OPP2=random:5,rule:10,rule2:25,rl_dqn_v112_best:15,rl_sarsa_v112_best:15,rl_mc_v112_best:15,rl_ppo_v112_best:15
set OPP3=rule:5,rule2:15,rl_dqn_v112_best:20,rl_sarsa_v112_best:20,rl_mc_v112_best:20,rl_ppo_v112_best:20

rem ---------- MC ----------
%RUN% %TAG%_mc_1 python train\train.py --algo mc --name mc_v112 --games %MC_1% --minutes %M% --resume --opp %OPP1% || goto fail
%RUN% %TAG%_mc_2 python train\train.py --algo mc --name mc_v112 --games %MC_2% --minutes %M% --resume --opp %OPP2% || goto fail
%RUN% %TAG%_mc_3 python train\train.py --algo mc --name mc_v112 --games %MC_3% --minutes %M% --resume --opp %OPP3% || goto fail

rem ---------- DQN ----------
%RUN% %TAG%_dqn_1 python train\train.py --algo dqn --name dqn_v112 --games %DQN_1% --minutes %M% --resume --opp %OPP1% || goto fail
%RUN% %TAG%_dqn_2 python train\train.py --algo dqn --name dqn_v112 --games %DQN_2% --minutes %M% --resume --opp %OPP2% || goto fail
%RUN% %TAG%_dqn_3 python train\train.py --algo dqn --name dqn_v112 --games %DQN_3% --minutes %M% --resume --opp %OPP3% || goto fail

rem ---------- SARSA ----------
%RUN% %TAG%_sarsa_1 python train\train.py --algo sarsa --name sarsa_v112 --games %SARSA_1% --minutes %M% --resume --opp %OPP1% || goto fail
%RUN% %TAG%_sarsa_2 python train\train.py --algo sarsa --name sarsa_v112 --games %SARSA_2% --minutes %M% --resume --opp %OPP2% || goto fail
%RUN% %TAG%_sarsa_3 python train\train.py --algo sarsa --name sarsa_v112 --games %SARSA_3% --minutes %M% --resume --opp %OPP3% || goto fail

rem ---------- PPO ----------
%RUN% %TAG%_ppo_1 python train\ppo.py --name ppo_v112 --games %PPO_1% --minutes %M% --resume --opp %OPP1% --eval-vs rl_dqn_v112_best || goto fail
%RUN% %TAG%_ppo_2 python train\ppo.py --name ppo_v112 --games %PPO_2% --minutes %M% --resume --opp %OPP2% --eval-vs rl_dqn_v112_best || goto fail
%RUN% %TAG%_ppo_3 python train\ppo.py --name ppo_v112 --games %PPO_3% --minutes %M% --resume --opp %OPP3% --eval-vs rl_dqn_v112_best || goto fail

rem ---------- FINAL EVALUATION: each model vs random / rule / rule2 / all other RL models ----------
rem Takes extra time. Delete these 4 lines if you do not want it.
%RUN% %TAG%_eval_dqn node train\eval_vs.js rl_dqn_v112_best --games=200 || goto fail
%RUN% %TAG%_eval_sarsa node train\eval_vs.js rl_sarsa_v112_best --games=200 || goto fail
%RUN% %TAG%_eval_mc node train\eval_vs.js rl_mc_v112_best --games=200 || goto fail
%RUN% %TAG%_eval_ppo node train\eval_vs.js rl_ppo_v112_best --games=200 || goto fail

echo.
python train\run_logged.py --summary %TAG%
echo ALL DONE. log: C:\card_rl\logs   history: C:\card_rl\models\train_history.csv
pause
exit /b 0

:fail
echo.
echo STOPPED (error or Ctrl+C). Completed stages are recorded in the log.
python train\run_logged.py --summary %TAG%
pause
exit /b 1
