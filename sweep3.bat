@echo off
set PATH=C:\Users\changmin\anaconda3\envs\cardrl;C:\Users\changmin\anaconda3\envs\cardrl\Library\bin;C:\Users\changmin\anaconda3\envs\cardrl\Scripts;C:\Program Files\nodejs;%PATH%
cd /d C:\card_rl
for %%K in (2 4 6 8 10 12 14) do (
  for %%M in (2 4 6 8 12 16) do (
    set SEARCH_K=%%K
    set SEARCH_M=%%M
    echo ===== K=%%K M=%%M ===== >> grid_result.txt
    node train\eval_search.js search_dqn_v112_best rl_dqn_v112_best --games=200 >> grid_result.txt
  )
)
pause