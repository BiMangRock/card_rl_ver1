"""학습 로그 그래프: models\\<알고리즘>\\ 의 CSV 를 읽어 PNG 로 저장한다.

사용 (C:\\card_rl 에서):
    pip install matplotlib                 (처음 한 번)
    python train\\plot_log.py               → models\\plots\\ 에 compare.png / hard.png / train.png 저장
    python train\\plot_log.py --all         판 수가 0 으로 되돌아간 이전 학습 구간도 흐리게 함께 표시
    python train\\plot_log.py --show        저장 후 창으로도 열기

읽는 파일 (알고리즘별):
    eval_log.csv   평가 기록 (없으면 예전 형식의 log.csv 를 대신 사용)
    log_hard.csv   치트 봇 / 강화학습 상대 평가 (curriculum 사용 시)
    train_log.csv  20초마다 기록한 학습 중 승률·속도
기본은 가장 최근의 연속된 학습 구간만 그린다 (--resume 없이 다시 시작해 판 수가 줄어든 지점에서 구간을 나눔).
"""
import argparse
import csv
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--models", default=os.path.join(HERE, "..", "models"))
ap.add_argument("--all", action="store_true", help="이전 구간도 흐리게 표시")
ap.add_argument("--show", action="store_true")
args = ap.parse_args()

try:
    import matplotlib
    if not args.show:
        matplotlib.use("Agg")
    import matplotlib.pyplot as plt
except ImportError:
    sys.exit("matplotlib 이 없습니다.  pip install matplotlib  후 다시 실행하세요.")

import logging
import warnings
from matplotlib import font_manager
logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
warnings.filterwarnings("ignore")
_have = {f.name for f in font_manager.fontManager.ttflist}
_ko = next((n for n in ("Malgun Gothic", "AppleGothic", "NanumGothic", "Noto Sans CJK KR") if n in _have), None)
if _ko:
    plt.rcParams["font.family"] = _ko
KO = _ko is not None          # 한글 폰트가 없으면 영어 라벨로 대체
T = lambda ko, en: ko if KO else en
plt.rcParams["axes.unicode_minus"] = False
COLORS = {"dqn": "#1f77b4", "sarsa": "#d62728", "mc": "#2ca02c"}
ALGOS = ["dqn", "sarsa", "mc"]
models = os.path.abspath(args.models)
plots = os.path.join(models, "plots")
os.makedirs(plots, exist_ok=True)


def read(algo, *names):
    for n in names:
        f = os.path.join(models, algo, n)
        if os.path.exists(f):
            with open(f, encoding="utf-8-sig", newline="") as fh:
                return n, list(csv.DictReader(fh))
    return None, []


def segments(rows):
    """판 수(games)가 줄어드는 지점에서 구간을 나눈다."""
    segs, prev = [], None
    for r in rows:
        g = float(r["games"])
        if prev is None or g < prev:
            segs.append([])
        segs[-1].append(r)
        prev = g
    return segs


def pick(rows):
    segs = segments(rows)
    if not segs:
        return [], []
    return segs[-1], segs[:-1]


def col(rows, k):
    return [float(r[k]) for r in rows]


def stage_lines(ax, rows, color):
    if not rows or "stage" not in rows[0]:
        return
    prev = None
    for r in rows:
        st = int(float(r["stage"]))
        if prev is not None and st > prev:
            ax.axvline(float(r["games"]), color=color, ls=":", lw=1, alpha=0.6)
            ax.text(float(r["games"]), 1.0, T(f"단계{st}", f"stage {st}"), color=color, fontsize=7, va="top", ha="right", rotation=90,
                    transform=ax.get_xaxis_transform())
        prev = st


data = {a: read(a, "eval_log.csv", "log.csv") for a in ALGOS}
if not any(rows for _, rows in data.values()):
    sys.exit(f"로그가 없습니다: {models}\\<알고리즘>\\eval_log.csv 또는 log.csv")

# ---------------------------------------------------------------- 1) 알고리즘 비교
fig, axes = plt.subplots(2, 2, figsize=(12, 8))
panels = [("vs_rule2", T("vs rule2 승률 (탐험 없음)", "win rate vs rule2 (greedy)")), ("vs_rule", T("vs rule 승률", "win rate vs rule")), ("vs_random", T("vs random 승률", "win rate vs random")), ("loss", T("손실(이동평균)", "loss (moving avg)"))]
for ax, (k, title) in zip(axes.ravel(), panels):
    for a in ALGOS:
        src, rows = data[a]
        cur, old = pick(rows)
        if not cur:
            continue
        if args.all:
            for seg in old:
                ax.plot(col(seg, "games"), col(seg, k), color=COLORS[a], alpha=0.2, lw=1)
        ax.plot(col(cur, "games"), col(cur, k), marker="o", ms=3, color=COLORS[a], label=a)
        if k == "vs_rule2":
            stage_lines(ax, cur, COLORS[a])
    ax.set_title(title)
    ax.set_xlabel(T("학습 경기 수", "training games"))
    ax.grid(alpha=0.3)
    if k != "loss":
        ax.set_ylim(0, 1.02)
        ax.axhline(0.5, color="gray", lw=0.8, ls="--")
    ax.legend()
fig.suptitle(T("알고리즘 비교 (평가는 판수가 적어 ±5%p 정도 흔들림)", "Algorithm comparison (eval noise about ±5%p)"))
fig.tight_layout()
fig.savefig(os.path.join(plots, "compare.png"), dpi=130)
print("저장:", os.path.join(plots, "compare.png"))

# ---------------------------------------------------------------- 2) 치트 봇 / RL 상대 승률
hard = {a: read(a, "log_hard.csv")[1] for a in ALGOS}
have = [a for a in ALGOS if hard[a]]
if have:
    fig, axes = plt.subplots(1, len(have), figsize=(6 * len(have), 4.5), squeeze=False)
    for ax, a in zip(axes[0], have):
        cur, _ = pick(hard[a])
        opps = list(dict.fromkeys(r["opponent"] for r in cur))
        for o in opps:
            rr = [r for r in cur if r["opponent"] == o]
            ax.plot(col(rr, "games"), col(rr, "winrate"), marker="o", ms=3, label=o)
        ax.set_title(T(f"{a}: 치트 봇 / 모델 상대 승률", f"{a}: win rate vs cheat bots / models"))
        ax.set_xlabel(T("학습 경기 수", "training games"))
        ax.set_ylim(0, 1.02)
        ax.axhline(0.5, color="gray", lw=0.8, ls="--")
        ax.grid(alpha=0.3)
        ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(os.path.join(plots, "hard.png"), dpi=130)
    print("저장:", os.path.join(plots, "hard.png"))
else:
    print("log_hard.csv 없음 → hard.png 생략 (--curriculum 으로 학습하면 생김)")

# ---------------------------------------------------------------- 3) 학습 중 승률 / 속도
tr = {a: read(a, "train_log.csv")[1] for a in ALGOS}
have = [a for a in ALGOS if tr[a]]
if have:
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
    for a in have:
        cur, _ = pick(tr[a])
        axes[0].plot(col(cur, "games"), col(cur, "train_winrate"), color=COLORS[a], label=a)
        axes[1].plot(col(cur, "games"), col(cur, "decisions_per_sec"), color=COLORS[a], label=a)
    axes[0].set_title(T("학습 중 승률 (탐험 포함, 최근 500판)", "training win rate (with exploration, last 500)"))
    axes[1].set_title(T("속도 (결정/초)", "speed (decisions/sec)"))
    for ax in axes:
        ax.set_xlabel(T("학습 경기 수", "training games"))
        ax.grid(alpha=0.3)
        ax.legend()
    axes[0].set_ylim(0, 1.02)
    fig.tight_layout()
    fig.savefig(os.path.join(plots, "train.png"), dpi=130)
    print("저장:", os.path.join(plots, "train.png"))
else:
    print("train_log.csv 없음 → train.png 생략 (새 train.py 로 학습하면 생김)")

# ---------------------------------------------------------------- 요약 표
print("\n알고리즘  마지막 평가 경기수   vs random  vs rule  vs rule2   best_score")
for a in ALGOS:
    cur, _ = pick(data[a][1])
    if cur:
        r = cur[-1]
        print(f"{a:<8} {int(float(r['games'])):>10}   {float(r['vs_random']):>8.0%} {float(r['vs_rule']):>8.0%} {float(r['vs_rule2']):>8.0%}   {float(r['best_score']):>8.0%}")
if args.show:
    plt.show()
