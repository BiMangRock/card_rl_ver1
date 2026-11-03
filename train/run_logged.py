# -*- coding: utf-8 -*-
"""
학습/평가 명령을 감싸서 실행한다.
  1) 화면에 그대로 출력하고, 같은 내용을 logs\\train_YYYYMMDD.txt 에 이어서 기록
  2) 단계별 소요 시간을 출력하고 models\\train_history.csv 에 한 줄씩 기록
  3) 끝날 때 해당 모델 log.csv 의 마지막 평가 결과를 같이 출력/기록
  4) Ctrl+C 를 누르면 학습은 저장하고 끝나며, 이 스크립트는 종료코드 130 을 돌려줘서 bat 의 나머지 단계가 멈춘다

사용:
  python train\\run_logged.py <라벨> <실행할 명령...>
    예) python train\\run_logged.py r1_mc_1 python train\\train.py --algo mc --name mc_v112 --games 10000 --resume
  python train\\run_logged.py --summary <태그>     태그_ 로 시작하는 라벨의 모델별 총 소요시간
"""
import csv
import datetime
import os
import subprocess
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LOG_DIR = os.path.join(ROOT, "logs")
HIST = os.path.join(ROOT, "models", "train_history.csv")
COLS = ["label", "model", "start", "end", "elapsed_sec", "elapsed", "exit_code", "last_eval"]


def fmt(sec):
    sec = int(sec)
    h, r = divmod(sec, 3600)
    m, s = divmod(r, 60)
    return f"{h}시간 {m:02d}분 {s:02d}초" if h else f"{m}분 {s:02d}초"


def model_name(cmd):
    if "--name" in cmd:
        i = cmd.index("--name")
        return cmd[i + 1] if i + 1 < len(cmd) else ""
    if any(c.endswith("ppo.py") for c in cmd):
        return "ppo"
    if "--algo" in cmd:
        i = cmd.index("--algo")
        return cmd[i + 1] if i + 1 < len(cmd) else ""
    return ""


def last_eval(name):
    p = os.path.join(ROOT, "models", name, "log.csv")
    if not name or not os.path.exists(p):
        return ""
    with open(p, encoding="utf-8-sig", newline="") as f:
        rows = [r for r in csv.reader(f) if r]
    if len(rows) < 2:
        return ""
    return "  ".join(f"{k}={v}" for k, v in zip(rows[0], rows[-1]))


def append_history(row):
    os.makedirs(os.path.dirname(HIST), exist_ok=True)
    new = not os.path.exists(HIST)
    with open(HIST, "a", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(COLS)
        w.writerow([row[c] for c in COLS])


def summary(tag):
    if not os.path.exists(HIST):
        print("기록 없음:", HIST)
        return 0
    tot, cnt = {}, {}
    with open(HIST, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if not r["label"].startswith(tag + "_"):
                continue
            k = r["model"] or "(평가 등)"
            tot[k] = tot.get(k, 0) + float(r["elapsed_sec"])
            cnt[k] = cnt.get(k, 0) + 1
    if not tot:
        print(f"태그 '{tag}' 로 시작하는 기록이 없습니다.")
        return 0
    print(f"=== 시간 요약 (태그 {tag}) ===")
    for k, v in tot.items():
        print(f"  {k:<14} {fmt(v)}  ({cnt[k]}단계)")
    print(f"  {'합계':<14} {fmt(sum(tot.values()))}")
    return 0


def run(label, cmd):
    if cmd and os.path.basename(cmd[0]).lower() in ("python", "python.exe"):
        cmd = [sys.executable] + cmd[1:]
    os.makedirs(LOG_DIR, exist_ok=True)
    log_path = os.path.join(LOG_DIR, "train_" + datetime.date.today().strftime("%Y%m%d") + ".txt")
    env = dict(os.environ, PYTHONUNBUFFERED="1", PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
    name = model_name(cmd)
    start = datetime.datetime.now()
    t0 = time.time()
    interrupted = False

    with open(log_path, "a", encoding="utf-8") as lf:
        def out(s=""):
            try:
                print(s, flush=True)
            except Exception:
                print(s.encode("ascii", "replace").decode(), flush=True)
            lf.write(s + "\n")
            lf.flush()

        out("")
        out("=" * 78)
        out(f"[{label}] 시작 {start:%Y-%m-%d %H:%M:%S}")
        out("명령: " + " ".join(cmd[1:] if cmd and cmd[0] == sys.executable else cmd))
        out("=" * 78)

        p = subprocess.Popen(cmd, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        while True:
            try:
                raw = p.stdout.readline()
            except KeyboardInterrupt:
                interrupted = True
                out("  (Ctrl+C 감지: 학습이 저장하고 끝나기를 기다립니다. 남은 단계는 실행하지 않습니다)")
                continue
            if not raw:
                break
            out(raw.decode("utf-8", "replace").rstrip("\r\n"))
        while True:
            try:
                p.wait()
                break
            except KeyboardInterrupt:
                interrupted = True

        elapsed = time.time() - t0
        end = datetime.datetime.now()
        code = 130 if interrupted else p.returncode
        le = last_eval(name)
        out("-" * 78)
        out(f"[{label}] 끝 {end:%H:%M:%S}   소요 {fmt(elapsed)}   종료코드 {code}")
        if le:
            out(f"[{label}] 마지막 평가: {le}")
        out("-" * 78)

    append_history(dict(label=label, model=name, start=f"{start:%Y-%m-%d %H:%M:%S}", end=f"{end:%Y-%m-%d %H:%M:%S}",
                        elapsed_sec=int(elapsed), elapsed=fmt(elapsed), exit_code=code, last_eval=le))
    return code


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--summary":
        sys.exit(summary(sys.argv[2]))
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    sys.exit(run(sys.argv[1], sys.argv[2:]))
