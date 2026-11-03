"""카드 대전 강화학습: PPO (정책 경사, Actor-Critic) — 기존 dqn/sarsa/mc 와 별개로 추가된 알고리즘.

핵심
  - 신경망: QNet 과 같은 구조(합법 행동마다 점수)를 '정책 로짓'으로 쓰고, 상태 인코딩 위에 가치(V) 머리를 하나 더 붙임.
    → 정책 부분은 QNet 과 가중치 이름이 같아서 JS(rl_bot.js)에서 그대로 읽힘 (봇 이름: rl_ppo, rl_ppo_best).
  - 상대: 기본은 이미 학습된 DQN(rl_dqn_best)을 '고정된 상대'로 둠. 상대 가중치는 Node 쪽이 JSON 으로 읽기 때문에
    --resume 없이도 됨. (--resume 은 'PPO 자신의' 이어서 학습용)
  - 시작 가중치: 기본은 무작위. --init-from dqn_best 를 주면 DQN 가중치로 정책을 초기화(웜스타트).

사용 예 (C:\\card_rl 에서):
    python train\\ppo.py --games 20000                                  (DQN 상대, 처음부터)
    python train\\ppo.py --games 20000 --init-from dqn_best             (DQN 가중치로 시작 + DQN 상대)
    python train\\ppo.py --games 20000 --resume                         (models\\ppo 에서 이어서)
    python train\\ppo.py --games 300 --eval-every 100 --eval-games 20   (짧은 동작 확인)
"""
import argparse
import csv
import os
import random
import time
from collections import deque, defaultdict

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as Fn

from common import D, QNet, VecEnv, collate, evaluate, export_json, S
from registry_sync import model_json_compatible, sync_state_dict

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, "..", "models")


# ----------------------------------------------------------------------------- 신경망
class PolicyValueNet(QNet):
    """QNet 과 동일한 정책 몸통 + 가치 머리. forward() 는 로짓만 반환 → common.evaluate/greedy_actions 와 호환."""

    def __init__(self, meta):
        super().__init__(meta)
        self.v1 = nn.Linear(S, 128)
        self.v2 = nn.Linear(128, 1)

    def forward_pv(self, b, detach_value=False):
        """반환: (로짓 [B,A] — 불법/패딩은 -1e9, 가치 [B])"""
        Amax = b["at"].shape[1]
        ent_in = torch.cat([b["x"], self.name_emb(b["nm"]), self.eff_emb(b["ef"])], -1)
        enc = Fn.relu(self.ent2(Fn.relu(self.ent1(ent_in))))
        pools = []
        for gi in range(3):
            m = (b["grp"] == gi).unsqueeze(-1).to(enc.dtype)
            pools.append((enc * m).sum(1) / 5.0)
        s = Fn.relu(self.st2(Fn.relu(self.st1(torch.cat([b["g"]] + pools, -1)))))

        def pick(idx):
            safe = idx.clamp(min=0).unsqueeze(-1).expand(-1, -1, D)
            return torch.gather(enc, 1, safe) * (idx >= 0).unsqueeze(-1).to(enc.dtype)

        a_in = torch.cat([Fn.one_hot(b["at"], self.meta["nTypes"]).to(enc.dtype),
                          Fn.one_hot(b["tk"], self.meta["nTk"]).to(enc.dtype),
                          pick(b["src"]), pick(b["tgt"])], -1)
        a = Fn.relu(self.act1(a_in))
        logit = self.q2(Fn.relu(self.q1(torch.cat([s.unsqueeze(1).expand(-1, Amax, -1), a], -1)))).squeeze(-1)
        logit = logit.masked_fill(~b["am"], -1e9)
        sv = s.detach() if detach_value else s
        v = self.v2(Fn.relu(self.v1(sv))).squeeze(-1)
        return logit, v


# ----------------------------------------------------------------------------- 인자
p = argparse.ArgumentParser()
p.add_argument("--games", type=int, default=20000, help="학습 중 끝나는 총 경기 수")
p.add_argument("--minutes", type=float, default=0, help="시간 제한(분), 0=없음")
p.add_argument("--procs", type=int, default=max(1, min(5, (os.cpu_count() or 2) - 1)), help="Node 프로세스 수")
p.add_argument("--envs", type=int, default=16, help="프로세스당 동시 게임 수")
p.add_argument("--deck", default="random", choices=["random", "fixed"])
p.add_argument("--opp", default="rl_dqn_best:0.7,rule2:0.2,rule:0.1",
               help="학습 상대 비율. 순수 DQN 상대: rl_dqn_best:1.0  (rl_dqn = 최신 DQN)")
p.add_argument("--shape", type=float, default=0.5, help="HP 차이 보조 보상 크기 (0=승패만)")
p.add_argument("--gamma", type=float, default=0.99)
p.add_argument("--lam", type=float, default=0.95, help="GAE λ")
p.add_argument("--lr", type=float, default=2.5e-4)
p.add_argument("--rollout", type=int, default=128, help="환경당 한 번에 모으는 스텝 수 (한 업데이트 = rollout × 환경 수)")
p.add_argument("--epochs", type=int, default=4, help="수집한 데이터를 몇 번 반복 학습할지")
p.add_argument("--minibatch", type=int, default=1024)
p.add_argument("--clip", type=float, default=0.2)
p.add_argument("--ent", type=float, default=0.01, help="엔트로피 보너스 계수 (탐험 유지)")
p.add_argument("--vf", type=float, default=0.5, help="가치 손실 계수")
p.add_argument("--max-grad", type=float, default=0.5)
p.add_argument("--target-kl", type=float, default=0.03, help="이 값을 넘으면 그 업데이트의 에폭을 일찍 끝냄")
p.add_argument("--init-from", default="", help="시작 가중치: dqn | dqn_best | sarsa | mc | .pt 파일 경로 (비우면 무작위)")
p.add_argument("--warm-scale", type=float, default=10.0, help="--init-from 일 때 Q값→로짓 배율 (softmax(scale·Q)). 클수록 DQN 처럼 탐욕적")
p.add_argument("--vf-warmup", type=int, default=5, help="처음 N 번 업데이트는 가치 머리만 학습(정책 고정) — 웜스타트 보호")
p.add_argument("--eval-every", type=int, default=2000)
p.add_argument("--eval-games", type=int, default=100)
p.add_argument("--out", default=MODELS)
p.add_argument("--resume", action="store_true", help="models\\<name>\\model.pt 에서 PPO 자신을 이어서 학습")
p.add_argument("--name", default="ppo", help="저장 폴더 이름 (models\\<이름>). 같은 이름이면 덮어쓰거나(--resume 없이) 이어서 학습")
p.add_argument("--eval-vs", default="rl_dqn_best", help="평가 때 맞붙일 RL 봇 (모델이 없거나 현재 엔진과 안 맞으면 생략)")
p.add_argument("--seed", type=int, default=0)
p.add_argument("--device", default="auto")
args = p.parse_args()

random.seed(args.seed); np.random.seed(args.seed); torch.manual_seed(args.seed)
dev = torch.device("cuda" if (args.device == "auto" and torch.cuda.is_available()) else (args.device if args.device != "auto" else "cpu"))
torch.set_num_threads(2)
opp_mix = {k: float(v) for k, v in (kv.split(":") for kv in args.opp.split(","))}
out_dir = os.path.join(args.out, args.name)
os.environ["MODELS_DIR"] = os.path.abspath(args.out)   # Node 환경이 상대 봇(rl_*)을 같은 models 폴더에서 찾도록
os.makedirs(out_dir, exist_ok=True)

print(f"[ppo] 장치={dev}  Node {args.procs}개 × 동시 {args.envs}판  덱={args.deck}  상대={opp_mix}", flush=True)
venv = VecEnv(args.procs, args.envs, deck=args.deck, opp=opp_mix, shape=args.shape, gamma=args.gamma, seed=args.seed)
# 평가용 환경: 상대 이름은 evaluate() 가 매번 바꿔서 지정한다
eval_env = VecEnv(2, 8, deck=args.deck, opp={"rule": 1.0}, shape=0.0, gamma=args.gamma, seed=args.seed + 777)
F = venv.F
N = venv.size
print(f"엔진 {venv.meta['engine']} · 특징 {venv.meta.get('fmt', 'v1')} · 저장 폴더 {out_dir}", flush=True)
net = PolicyValueNet(venv.meta).to(dev)
opt = torch.optim.Adam(net.parameters(), lr=args.lr, eps=1e-5)
games_done = 0
updates = 0
best_score = -1.0
ckpt_path = os.path.join(out_dir, "model.pt")


def load_init(spec):
    if spec.endswith(".pt"):
        path = spec
    else:
        is_best = spec.endswith("_best")
        path = os.path.join(args.out, spec[:-5] if is_best else spec, "best.pt" if is_best else "model.pt")
    if not os.path.exists(path):
        raise SystemExit(f"--init-from 파일이 없습니다: {path}")
    ck0 = torch.load(path, map_location=dev)
    sd = sync_state_dict(ck0["net"], ck0.get("meta"), venv.meta)
    own = net.state_dict()
    n_ok = 0
    for k, v in sd.items():
        if k in own and own[k].shape == v.shape:
            own[k] = v.clone(); n_ok += 1
    net.load_state_dict(own)
    # Q값은 폭이 좁아서(대략 ±1) 그대로 로짓으로 쓰면 거의 균등분포 → 마지막 층을 배율만큼 키움
    with torch.no_grad():
        net.q2.weight.mul_(args.warm_scale); net.q2.bias.mul_(args.warm_scale)
    print(f"웜스타트: {path} 에서 가중치 {n_ok}개 로드, 로짓 배율 ×{args.warm_scale}", flush=True)


resumed = bool(args.resume and os.path.exists(ckpt_path))
if resumed:
    ck = torch.load(ckpt_path, map_location=dev)
    net.load_state_dict(sync_state_dict(ck["net"], ck.get("meta"), venv.meta))
    if "opt" in ck:
        opt.load_state_dict(ck["opt"])
    games_done = ck.get("games", 0); updates = ck.get("updates", 0); best_score = ck.get("best", -1.0)
    print(f"이어서 학습: 이미 {games_done}판, 업데이트 {updates}번", flush=True)
elif os.path.exists(ckpt_path) and not args.init_from:
    print(f"주의: {out_dir} 에 이미 모델이 있어 이번 학습이 덮어씁니다 (이어서 하려면 --resume, 다른 이름은 --name).", flush=True)
elif args.init_from:
    load_init(args.init_from)
    if args.vf_warmup <= 0:
        print("주의: 웜스타트인데 --vf-warmup 이 0 이라 가치 머리가 무작위인 채로 정책이 바로 갱신됩니다.", flush=True)


# ----------------------------------------------------------------------------- 롤아웃
@torch.no_grad()
def act(obs):
    b = collate(obs, F, dev)
    logit, v = net.forward_pv(b)
    dist = torch.distributions.Categorical(logits=logit)
    a = dist.sample()
    return a.cpu().numpy(), dist.log_prob(a).cpu().numpy(), v.cpu().numpy()


def gae(rew, val, done, last_v):
    """rew/val/done: [T,N], last_v: [N]. 반환 (advantage, return) [T,N]"""
    T = rew.shape[0]
    adv = np.zeros_like(rew)
    last = np.zeros(rew.shape[1], np.float32)
    for t in reversed(range(T)):
        nv = last_v if t == T - 1 else val[t + 1]
        nonterm = 1.0 - done[t]
        delta = rew[t] + args.gamma * nv * nonterm - val[t]
        last = delta + args.gamma * args.lam * nonterm * last
        adv[t] = last
    return adv, adv + val


def trim(b):
    """미니배치 안에서 실제로 쓰는 길이까지만 자름 (패딩 낭비 방지)"""
    ne = int((b["grp"] >= 0).sum(1).max().item()); ne = max(ne, 1)
    na = max(int(b["am"].sum(1).max().item()), 1)
    out = {}
    for k, v in b.items():
        if k in ("x", "nm", "ef", "grp"): out[k] = v[:, :ne]
        elif k in ("at", "src", "tgt", "tk", "am"): out[k] = v[:, :na]
        else: out[k] = v
    return out


def ppo_update(obs_list, acts, old_logp, adv, ret):
    """obs_list: 길이 T*N 의 관측, 나머지는 [T*N] numpy"""
    global updates
    big = collate(obs_list, F, dev)                      # 한 번에 패딩 → GPU 에서 인덱싱만
    t = lambda x: torch.as_tensor(x, dtype=torch.float32, device=dev)
    acts_t = torch.as_tensor(acts, dtype=torch.int64, device=dev)
    old_t, adv_t, ret_t = t(old_logp), t(adv), t(ret)
    n = len(obs_list)
    warm = updates < args.vf_warmup and bool(args.init_from) and not resumed
    stats = defaultdict(list)
    stop = False
    for ep in range(args.epochs):
        perm = torch.randperm(n, device=dev)
        for i in range(0, n, args.minibatch):
            idx = perm[i:i + args.minibatch]
            if len(idx) < 2: continue
            b = trim({k: v[idx] for k, v in big.items()})
            logit, v = net.forward_pv(b, detach_value=warm)
            dist = torch.distributions.Categorical(logits=logit)
            logp = dist.log_prob(acts_t[idx])
            ratio = torch.exp(logp - old_t[idx])
            a = adv_t[idx]
            a = (a - a.mean()) / (a.std() + 1e-8)
            pg = -torch.min(ratio * a, torch.clamp(ratio, 1 - args.clip, 1 + args.clip) * a).mean()
            vl = Fn.smooth_l1_loss(v, ret_t[idx])
            ent = dist.entropy().mean()
            loss = args.vf * vl if warm else pg + args.vf * vl - args.ent * ent
            opt.zero_grad(set_to_none=True)
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), args.max_grad)
            opt.step()
            with torch.no_grad():
                kl = (old_t[idx] - logp).mean().item()
                stats["pg"].append(pg.item()); stats["vl"].append(vl.item()); stats["ent"].append(ent.item())
                stats["kl"].append(kl); stats["clipfrac"].append(((ratio - 1).abs() > args.clip).float().mean().item())
        if not warm and np.mean(stats["kl"][-max(1, n // args.minibatch):]) > args.target_kl:
            stop = True
        if stop: break
    updates += 1
    return {k: float(np.mean(v)) for k, v in stats.items()}, warm


# ----------------------------------------------------------------------------- 저장 / 평가
def save(info):
    torch.save({"net": net.state_dict(), "opt": opt.state_dict(), "meta": venv.meta, "games": games_done,
                "updates": updates, "best": best_score, "args": vars(args)}, ckpt_path)
    export_policy(os.path.join(out_dir, "model.json"), info)


def export_policy(path, info):
    """가치 머리를 빼고 QNet 형식으로 내보냄 → rl_bot.js 가 그대로 읽는다"""
    q = QNet(venv.meta).to("cpu")
    sd = {k: v.detach().cpu() for k, v in net.state_dict().items() if not k.startswith("v1.") and not k.startswith("v2.")}
    q.load_state_dict(sd)
    export_json(q, path, info)


EVAL_VS = args.eval_vs
_nm = EVAL_VS[3:] if EVAL_VS.startswith("rl_") else EVAL_VS
_vs_json = os.path.join(args.out, _nm[:-5] if _nm.endswith("_best") else _nm, "best.json" if _nm.endswith("_best") else "model.json")
EVAL_OPPS = ["random", "rule", "rule2"] + ([EVAL_VS] if model_json_compatible(_vs_json, venv.meta) else [])
if len(EVAL_OPPS) == 3 and EVAL_VS:
    print(f"참고: 평가 상대 {EVAL_VS} 는 모델이 없거나 현재 엔진/번호표와 맞지 않아 평가에서 뺍니다.", flush=True)
log_path = os.path.join(out_dir, "log.csv")


def do_eval():
    global best_score
    net.eval()
    rs = {o: evaluate(net, eval_env, o, args.eval_games, dev)["rate"] for o in EVAL_OPPS}
    net.train()
    # best 기준: rule·rule2·(있으면)DQN 평균 승률
    keys = [k for k in ("rule", "rule2", EVAL_VS) if k in rs]
    score = sum(rs[k] for k in keys) / len(keys)
    info = {"algo": "ppo", "games": games_done, "updates": updates, "winrate": rs, "engine": venv.meta["engine"], "deck": args.deck, "opp": opp_mix}
    if score > best_score:
        best_score = score
        export_policy(os.path.join(out_dir, "best.json"), info)
        torch.save({"net": net.state_dict(), "meta": venv.meta, "games": games_done}, os.path.join(out_dir, "best.pt"))
    save(info)
    new = not os.path.exists(log_path)
    with open(log_path, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new: w.writerow(["games", "updates", "ent", "kl", "vs_random", "vs_rule", "vs_rule2", "vs_eval_opp", "best_score"])
        w.writerow([games_done, updates, round(last.get("ent", 0), 3), round(last.get("kl", 0), 4), rs["random"], rs["rule"], rs["rule2"],
                    rs.get(EVAL_VS, ""), round(best_score, 3)])
    txt = " · ".join(f"{k} {v:.0%}" for k, v in rs.items())
    print(f"  ▶ 평가(탐험 없음, {args.eval_games}판씩) {txt}  (best 점수 {best_score:.0%})", flush=True)


# ----------------------------------------------------------------------------- 메인 루프
recent = deque(maxlen=500)
recent_by_opp = defaultdict(lambda: deque(maxlen=200))
obs = venv.obs
T = args.rollout
t0 = time.time(); last_log = t0; steps = 0; next_eval = games_done + args.eval_every
last = {}
try:
    while games_done < args.games and not (args.minutes and time.time() - t0 > args.minutes * 60):
        buf_obs = []; buf_a = np.zeros((T, N), np.int64); buf_lp = np.zeros((T, N), np.float32)
        buf_v = np.zeros((T, N), np.float32); buf_r = np.zeros((T, N), np.float32); buf_d = np.zeros((T, N), np.float32)
        for tt in range(T):
            a, lp, v = act(obs)
            res = venv.step(a)
            buf_obs.extend(obs)                       # 순서: tt 가 바깥, 환경이 안쪽 → 인덱스 = tt*N + e
            buf_a[tt] = a; buf_lp[tt] = lp; buf_v[tt] = v
            for e, r in enumerate(res):
                buf_r[tt, e] = r[1]; buf_d[tt, e] = 1.0 if r[2] else 0.0
                if r[2]:
                    games_done += 1
                    w = r[3]["win"]; recent.append(w); recent_by_opp[r[3]["opp"]].append(w)
            steps += N
            obs = [r[0] for r in res]
        with torch.no_grad():
            _, last_v = net.forward_pv(collate(obs, F, dev))
        adv, ret = gae(buf_r, buf_v, buf_d, last_v.cpu().numpy())
        last, warm = ppo_update(buf_obs, buf_a.ravel(), buf_lp.ravel(), adv.ravel(), ret.ravel())
        now = time.time()
        if now - last_log > 20:
            def wr(d): return (sum(1 for w in d if w > 0) / len(d)) if d else 0
            per = " ".join(f"{k}:{wr(v):.0%}" for k, v in recent_by_opp.items())
            print(f"경기 {games_done}/{args.games}  {steps / (now - t0):.0f} 결정/초  업데이트 {updates}  엔트로피 {last['ent']:.2f}  KL {last['kl']:.4f}  "
                  f"가치손실 {last['vl']:.3f}  최근 학습승률 {wr(recent):.0%} ({per}){'  [가치 워밍업]' if warm else ''}", flush=True)
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
