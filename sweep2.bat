@echo off
set PATH=C:\Users\changmin\anaconda3\envs\cardrl;C:\Users\changmin\anaconda3\envs\cardrl\Library\bin;C:\Users\changmin\anaconda3\envs\cardrl\Scripts;C:\Program Files\nodejs;%PATH%
cd /d C:\card_rl
for %%M in (4 6 8 12) do (
  set SEARCH_K=2
  set SEARCH_M=%%M
  echo ===== K=2 M=%%M =====
  node train\eval_search.js search_dqn_v112_best rl_dqn_v112_best --games=300
)
pause