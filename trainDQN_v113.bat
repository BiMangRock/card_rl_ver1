@echo off
rem ===== DQN only: continue training from a COPY (dqn_v113). Original dqn_v112 is untouched. =====
set PATH=C:\Users\changmin\anaconda3\envs\cardrl;C:\Users\changmin\anaconda3\envs\cardrl\Library\bin;C:\Users\changmin\anaconda3\envs\cardrl\Scripts;C:\Program Files\nodejs;%PATH%
cd /d C:\card_rl

rem TAG: name of this run. Change it each run.
set TAG=r3
rem M: max minutes per stage (3 stages). 60 = up to 3 hours worst case.
set M=60

rem ===== TARGET GAMES (TOTAL count, must be BIGGER than the current count of the copied model) =====
rem Current dqn count when allTrain.bat was written: 69252
set DQN_1=80000
set DQN_2=90000
set DQN_3=100000

set RUN=python train\run_logged.py

rem ===== OPPONENT MIX (same as allTrain.bat; rl_*_v112_best are the original models) =====
set OPP1=random:10,rule:20,rule2:30,rl_dqn_v112_best:10,rl_sarsa_v112_best:10,rl_mc_v112_best:10,rl_ppo_v112_best:10
set OPP2=random:5,rule:10,rule2:25,rl_dqn_v112_best:15,rl_sarsa_v112_best:15,rl_mc_v112_best:15,rl_ppo_v112_best:15
set OPP3=rule:5,rule2:15,rl_dqn_v112_best:20,rl_sarsa_v112_best:20,rl_mc_v112_best:20,rl_ppo_v112_best:20

rem ---------- DQN (new name dqn_v113) ----------
%RUN% %TAG%_dqn_1 python train\train.py --algo dqn --name dqn_v113 --games %DQN_1% --minutes %M% --resume --opp %OPP1% || goto fail
%RUN% %TAG%_dqn_2 python train\train.py --algo dqn --name dqn_v113 --games %DQN_2% --minutes %M% --resume --opp %OPP2% || goto fail
%RUN% %TAG%_dqn_3 python train\train.py --algo dqn --name dqn_v113 --games %DQN_3% --minutes %M% --resume --opp %OPP3% || goto fail

rem ---------- FINAL EVALUATION (delete this line if not needed) ----------
%RUN% %TAG%_eval_dqn node train\eval_vs.js rl_dqn_v113_best --games=200 || goto fail

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
