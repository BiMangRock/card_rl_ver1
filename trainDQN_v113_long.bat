@echo off
rem ===== DQN only (dqn_v113): long run, no practical time limit. Best model is saved as rl_dqn_v113_best =====
set PATH=C:\Users\changmin\anaconda3\envs\cardrl;C:\Users\changmin\anaconda3\envs\cardrl\Library\bin;C:\Users\changmin\anaconda3\envs\cardrl\Scripts;C:\Program Files\nodejs;%PATH%
cd /d C:\card_rl

rem TAG: change it each run so the summary is not mixed up.
set TAG=r4
rem M: time limit per stage in minutes. Set very high (10000 = about 166 hours) so stages end only when the target games are reached.
set M=10000

rem ===== TARGET GAMES (TOTAL count, must be BIGGER than the current count) =====
rem Current count of dqn_v113: 100000. Each stage now ends only when its target is reached.
set DQN_1=200000
set DQN_2=300000
set DQN_3=400000

set RUN=python train\run_logged.py

rem ===== OPPONENT MIX: mostly RL bots (same in all 3 stages) =====
set OPP1=rule:5,rule2:10,rl_dqn_v112_best:30,rl_sarsa_v112_best:20,rl_mc_v112_best:15,rl_ppo_v112_best:20
set OPP2=%OPP1%
set OPP3=%OPP1%

%RUN% %TAG%_dqn_1 python train\train.py --algo dqn --name dqn_v113 --games %DQN_1% --minutes %M% --resume --opp %OPP1% || goto fail
%RUN% %TAG%_dqn_2 python train\train.py --algo dqn --name dqn_v113 --games %DQN_2% --minutes %M% --resume --opp %OPP2% || goto fail
%RUN% %TAG%_dqn_3 python train\train.py --algo dqn --name dqn_v113 --games %DQN_3% --minutes %M% --resume --opp %OPP3% || goto fail

rem ---------- FINAL EVALUATION of the best model (delete this line if not needed) ----------
%RUN% %TAG%_eval_dqn node train\eval_vs.js rl_dqn_v113_best --games=500 || goto fail

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
