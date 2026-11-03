@echo off
set PATH=C:\Users\changmin\anaconda3\envs\cardrl;C:\Users\changmin\anaconda3\envs\cardrl\Library\bin;C:\Users\changmin\anaconda3\envs\cardrl\Scripts;C:\Program Files\nodejs;%PATH%
cd /d C:\card_rl

rem K 스윕 (M=4 고정)
for %%K in (2 4 6 9) do (
  set SEARCH_K=%%K
  set SEARCH_M=4
  echo ===== K=%%K M=4 =====
  node train\eval_search.js search_dqn_v112_best rl_dqn_v112_best --games=200
)

rem M 스윕 (K=6 고정)
for %%M in (2 3 6) do (
  set SEARCH_K=6
  set SEARCH_M=%%M
  echo ===== K=6 M=%%M =====
  node train\eval_search.js search_dqn_v112_best rl_dqn_v112_best --games=200
)
pause