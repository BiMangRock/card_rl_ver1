"""카드 대전 강화학습: DQN(Q-러닝) / SARSA / 몬테카를로 — 같은 Q 네트워크, 다른 학습 목표.

사용 예 (C:\\card_rl 에서):
    python train\\train.py --algo dqn  --games 20000
    python train\\train.py --algo sarsa --games 20000
    python train\\train.py --algo mc   --games 20000
    python train\\train.py --algo dqn --games 200 --eval-every 100 --eval-games 20   (짧은 동작 확인)
"""
import argparse
import csv
import os
import random
import time
from collections import deque

import numpy as np
import torch
import torch.nn.functional as Fn

from common import QNet, VecEnv, collate, evaluate, export_json, greedy_actions
from registry_sync import sync_state_dict

p = argparse.ArgumentParser()
p.add_argument("--algo", required=True, choices=["dqn", "sarsa", "mc"])
p.add_argument("--games", type=int, default=20000, help="학습 중 끝나는 총 경기 수")
p.add_argument("--minutes", type=float, default=0, help="시간 제한(분), 0=없음")
p.add_argument("--procs", type=int, default=max(1, min(5, (os.cpu_count() or 2) - 1)), help="Node 프로세스 수")
p.add_argument("--envs", type=int, default=16, help="프로세스당 동시 게임 수")
p.add_argument("--deck", default="random", choices=["random", "fixed"], help="fixed: 에이전트 덱 고정(상대는 랜덤)")
p.add_argument("--opp", default="rule2:0.5,rule:0.3,random:0.2", help="학습 상대 비율")
p.add_argument("--shape", type=float, default=0.5, help="HP 차이 보조 보상 크기 (0=승패 보상만)")
p.add_argument("--gamma", type=float, default=None, help="할인율 (기본: dqn/sarsa 0.99, mc 1.0)")
p.add_argument("--lr", type=float, default=3e-4)
p.add_argument("--batch", type=int, default=256)
p.add_argument("--buffer", type=int, default=100000)
p.add_argument("--reuse", type=float, default=4.0, help="경험 1개당 평균 학습 재사용 횟수 (DQN/MC)")
p.add_argument("--warmup", type=int, default=5000, help="DQN/MC 학습 시작 전 최소 경험 수")
p.add_argument("--target-every", type=int, default=500, help="타깃 네트워크 복사 주기(업데이트 횟수)")
p.add_argument("--eps-start", type=float, default=1.0)
p.add_argument("--eps-end", type=float, default=0.05)
p.add_argument("--eps-frac", type=float, default=0.4, help="전체 경기 중 이 비율까지 탐험률 감소")
p.add_argument("--eval-every", type=int, default=2000)
p.add_argument("--eval-games", type=int, default=100)
p.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models"))
p.add_argument("--resume", action="store_true")
p.add_argument("--name", default="", help="저장 폴더 이름 (models\\<이름>). 비우면 알고리즘 이름. 같은 이름이면 덮어쓰거나(--resume 없이) 이어서 학습")
p.add_argument("--seed", type=int, default=0)
p.add_argument("--device", default="auto")
args = p.parse_args()
if args.gamma is None:
    args.gamma = 1.0 if args.algo == "mc" else 0.99

random.seed(args.seed); np.random.seed(args.seed); torch.manual_seed(args.seed)
dev = torch.device("cuda" if (args.device == "auto" and torch.cuda.is_available()) else (args.device if args.device != "auto" else "cpu"))
torch.set_num_threads(2)
opp_mix = {k: float(v) for k, v in (kv.split(":") for kv in args.opp.split(","))}
out_dir = os.path.join(args.out, args.name or args.algo)
os.environ["MODELS_DIR"] = os.path.abspath(args.out)   # Node 환경이 상대 봇(rl_*)을 같은 models 폴더에서 찾도록
os.makedirs(out_dir, exist_ok=True)

print(f"[{args.algo}] 장치={dev}  Node {args.procs}개 × 동시 {args.envs}판  덱={args.deck}  상대={opp_mix}", flush=True)
venv = VecEnv(args.procs, args.envs, deck=args.deck, opp=opp_mix, shape=args.shape, gamma=args.gamma, seed=args.seed)
eval_env = VecEnv(2, 8, deck=args.deck, opp={"rule": 1.0}, shape=0.0, gamma=args.gamma, seed=args.seed + 777)
F = venv.F
print(f"엔진 {venv.meta['engine']} · 특징 {venv.meta.get('fmt', 'v1')} · 저장 폴더 {out_dir}", flush=True)
net = QNet(venv.meta).to(dev)
tgt = QNet(venv.meta).to(dev)
opt = torch.optim.Adam(net.parameters(), lr=args.lr)
games_done = 0
best_score = -1.0
ckpt_path = os.path.join(out_dir, "model.pt")
if args.resume and os.path.exists(ckpt_path):
    ck = torch.load(ckpt_path, map_location=dev)
    net.load_state_dict(sync_state_dict(ck["net"], ck.get("meta"), venv.meta)); games_done = ck.get("games", 0); best_score = ck.get("best", -1.0)
    print(f"이어서 학습: 이미 {games_done}판", flush=True)
elif os.path.exists(ckpt_path):
    print(f"주의: {out_dir} 에 이미 모델이 있어 이번 학습이 덮어씁니다 (이어서 하려면 --resume, 다른 이름은 --name).", flush=True)
tgt.load_state_dict(net.state_dict())


def to_t(x, dtype=torch.float32):
    return torch.as_tensor(np.asarray(x), dtype=dtype, device=dev)


def q_sa(batch_obs, acts):
    q = net(collate(batch_obs, F, dev))
    return q.gather(1, to_t(acts, torch.int64).unsqueeze(1)).squeeze(1)


class Ring:
    def __init__(self, cap): self.cap, self.data, self.i = cap, [], 0
    def add(self, x):
        if len(self.data) < self.cap: self.data.append(x)
        else: self.data[self.i] = x; self.i = (self.i + 1) % self.cap
    def __len__(self): return len(self.data)
    def sample(self, n): return random.sample(self.data, min(n, len(self.data)))


class Learner:
    def __init__(self):
        self.updates = 0; self.loss_ema = None; self.credit = 0.0

    def _step(self, loss):
        opt.zero_grad(set_to_none=True); loss.backward()
        torch.nn.utils.clip_grad_norm_(net.parameters(), 10.0); opt.step()
        self.updates += 1
        l = float(loss.item())
        self.loss_ema = l if self.loss_ema is None else 0.98 * self.loss_ema + 0.02 * l
        if self.updates % args.target_every == 0: tgt.load_state_dict(net.state_dict())

    def before_step(self, obs, acts): pass


class DQN(Learner):
    """Q-러닝(오프폴리시): 목표 = r + γ·max_a' Q_target(s', a')  (Double DQN, 리플레이 버퍼)."""
    def __init__(self): super().__init__(); self.buf = Ring(args.buffer)

    def observe(self, obs, acts, res):
        for o, a, r in zip(obs, acts, res):
            self.buf.add((o, int(a), r[1], None if r[2] else r[0], r[2]))
        self.credit += len(res) * args.reuse / args.batch

    def update(self):
        if len(self.buf) < args.warmup: self.credit = 0.0; return
        while self.credit >= 1.0:
            self.credit -= 1.0
            bt = self.buf.sample(args.batch)
            obs = [t[0] for t in bt]; nobs = [t[3] if t[3] is not None else t[0] for t in bt]
            a = [t[1] for t in bt]; r = to_t([t[2] for t in bt]); done = to_t([float(t[4]) for t in bt])
            q = q_sa(obs, a)
            with torch.no_grad():
                nb = collate(nobs, F, dev)
                a_star = net(nb).argmax(1, keepdim=True)
                qn = tgt(nb).gather(1, a_star).squeeze(1)
                target = r + args.gamma * (1.0 - done) * qn
            self._step(Fn.smooth_l1_loss(q, target))


class SARSA(Learner):
    """SARSA(온폴리시): 목표 = r + γ·Q_target(s', a')  (a' 은 실제로 선택한 다음 행동, 리플레이 없음)."""
    def __init__(self): super().__init__(); self.prev = [None] * venv.size; self.buf = []

    def before_step(self, obs, acts):
        for e, pv in enumerate(self.prev):
            if pv is not None:
                self.buf.append((pv[0], pv[1], pv[2], obs[e], int(acts[e]), 0.0))
                self.prev[e] = None

    def observe(self, obs, acts, res):
        for e, (o, a, r) in enumerate(zip(obs, acts, res)):
            if r[2]: self.buf.append((o, int(a), r[1], None, 0, 1.0))
            else: self.prev[e] = (o, int(a), r[1])

    def update(self):
        if len(self.buf) < args.batch * 4: return
        random.shuffle(self.buf)
        for i in range(0, len(self.buf) - args.batch + 1, args.batch):
            bt = self.buf[i:i + args.batch]
            obs = [t[0] for t in bt]; nobs = [t[3] if t[3] is not None else t[0] for t in bt]
            a = [t[1] for t in bt]; r = to_t([t[2] for t in bt]); na = [t[4] for t in bt]; done = to_t([t[5] for t in bt])
            q = q_sa(obs, a)
            with torch.no_grad():
                qn = tgt(collate(nobs, F, dev)).gather(1, to_t(na, torch.int64).unsqueeze(1)).squeeze(1)
                target = r + args.gamma * (1.0 - done) * qn
            self._step(Fn.smooth_l1_loss(q, target))
        self.buf = []


class MC(Learner):
    """몬테카를로: 경기가 끝난 뒤 실제 누적 보상 G_t 를 목표로 Q(s_t, a_t) 를 회귀 (부트스트랩 없음)."""
    def __init__(self):
        super().__init__(); self.traj = [[] for _ in range(venv.size)]; self.buf = Ring(args.buffer)

    def observe(self, obs, acts, res):
        for e, (o, a, r) in enumerate(zip(obs, acts, res)):
            self.traj[e].append((o, int(a), r[1]))
            if r[2]:
                G = 0.0; out = []
                for (so, sa, sr) in reversed(self.traj[e]):
                    G = sr + args.gamma * G; out.append((so, sa, G))
                for x in out: self.buf.add(x)
                self.credit += len(out) * args.reuse / args.batch
                self.traj[e] = []

    def update(self):
        if len(self.buf) < args.warmup: self.credit = 0.0; return
        while self.credit >= 1.0:
            self.credit -= 1.0
            bt = self.buf.sample(args.batch)
            q = q_sa([t[0] for t in bt], [t[1] for t in bt])
            self._step(Fn.smooth_l1_loss(q, to_t([t[2] for t in bt])))


learner = {"dqn": DQN, "sarsa": SARSA, "mc": MC}[args.algo]()


def save(tag_info):
    torch.save({"net": net.state_dict(), "meta": venv.meta, "games": games_done, "best": best_score, "args": vars(args)}, ckpt_path)
    export_json(net, os.path.join(out_dir, "model.json"), tag_info)


def do_eval():
    global best_score
    net.eval()
    rs = {}
    for opp in ("random", "rule", "rule2"):
        rs[opp] = evaluate(net, eval_env, opp, args.eval_games, dev)["rate"]
    net.train()
    score = (rs["rule"] + rs["rule2"]) / 2
    info = {"algo": args.algo, "games": games_done, "winrate": rs, "engine": venv.meta["engine"], "deck": args.deck}
    if score > best_score:
        best_score = score
        export_json(net, os.path.join(out_dir, "best.json"), info)
        torch.save({"net": net.state_dict(), "meta": venv.meta, "games": games_done}, os.path.join(out_dir, "best.pt"))
    save(info)
    new = not os.path.exists(os.path.join(out_dir, "log.csv"))
    with open(os.path.join(out_dir, "log.csv"), "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new: w.writerow(["games", "eps", "loss", "vs_random", "vs_rule", "vs_rule2", "best_score"])
        w.writerow([games_done, round(eps, 3), round(learner.loss_ema or 0, 4), rs["random"], rs["rule"], rs["rule2"], round(best_score, 3)])
    print(f"  ▶ 평가(탐험 없음, {args.eval_games}판씩) 랜덤봇 {rs['random']:.0%} · rule {rs['rule']:.0%} · rule2 {rs['rule2']:.0%}  (best {best_score:.0%})", flush=True)


recent = deque(maxlen=500)
obs = venv.obs
t0 = time.time(); last_log = t0; steps = 0; next_eval = games_done + args.eval_every
eps = args.eps_start
try:
    while games_done < args.games and not (args.minutes and time.time() - t0 > args.minutes * 60):
        frac = min(1.0, games_done / max(1.0, args.games * args.eps_frac))
        eps = args.eps_start + (args.eps_end - args.eps_start) * frac
        acts, _ = greedy_actions(net, obs, F, dev, eps)
        learner.before_step(obs, acts)
        res = venv.step(acts)
        learner.observe(obs, acts, res)
        steps += len(res)
        for r in res:
            if r[2]:
                games_done += 1; recent.append(r[3]["win"])
        obs = [r[0] for r in res]
        learner.update()
        now = time.time()
        if now - last_log > 20:
            wr = (sum(1 for w in recent if w > 0) / len(recent)) if recent else 0
            print(f"경기 {games_done}/{args.games}  {steps / (now - t0):.0f} 결정/초  탐험 {eps:.2f}  손실 {learner.loss_ema or 0:.3f}  "
                  f"최근 학습승률(탐험 포함) {wr:.0%}", flush=True)
            last_log = now
        if games_done >= next_eval:
            do_eval(); next_eval += args.eval_every
except KeyboardInterrupt:
    print("중단 요청 — 저장하고 종료합니다.", flush=True)
finally:
    try:
        do_eval()
    finally:
        venv.close(); eval_env.close()
print(f"완료. 모델 위치: {out_dir}  (model.json=최신, best.json=평가 최고)", flush=True)
