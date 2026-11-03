@echo off
rem ===== K/M sweep for search_dqn_v113_best, 1000 games each, no time limit =====
set PATH=C:\Users\changmin\anaconda3\envs\cardrl;C:\Users\changmin\anaconda3\envs\cardrl\Library\bin;C:\Users\changmin\anaconda3\envs\cardrl\Scripts;C:\Program Files\nodejs;%PATH%
cd /d C:\card_rl

set GAMES=1000
set OUT=grid_result_v113_%GAMES%.txt

for %%K in (2 4 6 8 10 12 14 16) do (
  for %%M in (2 4 6 8 10 12 14 16) do (
    set SEARCH_K=%%K
    set SEARCH_M=%%M
    echo ===== K=%%K M=%%M ===== >> %OUT%
    node train\eval_search.js search_dqn_v113_best rl_dqn_v112_best --games=%GAMES% >> %OUT%
  )
)
echo ALL DONE
pause
