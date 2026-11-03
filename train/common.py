"""공통 모듈: 신경망(Q 네트워크), 관측 배치 변환, Node 벡터 환경, 모델 내보내기."""
import json
import os
import shutil
import subprocess
import sys

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as Fn

HERE = os.path.dirname(os.path.abspath(__file__))
ENV_SERVER = os.path.join(HERE, "env_server.js")
NODE = shutil.which("node") or "node"

D, S, A, Q, H = 64, 128, 128, 128, 256   # 개체 임베딩 / 상태 / 행동 / Q 은닉 / 상태 은닉
NE, EE = 24, 12                            # 카드 이름 임베딩 / 효과 종류 임베딩


# ----------------------------------------------------------------------------- 관측
def parse_obs(d, F):
    n = len(d["nm"])
    out = {
        "g": np.asarray(d["g"], np.float32),
        "nm": np.asarray(d["nm"], np.int16),
        "ef": np.asarray(d["ef"], np.int16),
        "grp": np.asarray(d["grp"], np.int8),
        "at": np.asarray(d["at"], np.int8),
        "src": np.asarray(d["src"], np.int16),
        "tgt": np.asarray(d["tgt"], np.int16),
        "tk": np.asarray(d["tk"], np.int8),
    }
    if "kwi" in d:   # 번호표 방식(v2): 개체 기본 특징 + 키워드 희소 표현 → 메모리를 아끼려고 collate 에서 펼친다
        out["f0"] = int(d["f0"])
        out["x"] = np.asarray(d["x"], np.float32).reshape(n, out["f0"])
        out["kwi"] = np.asarray(d["kwi"], np.int32)
        out["kws"] = np.asarray(d["kws"], np.int32)
        out["kwv"] = np.asarray(d["kwv"], np.float32)
    else:            # 옛 방식(v1)
        out["x"] = np.asarray(d["x"], np.float32).reshape(n, F)
    return out


def collate(obs, F, dev):
    """관측 리스트 → 패딩된 텐서 딕셔너리."""
    B = len(obs)
    E = max(1, max(len(o["nm"]) for o in obs))
    Amax = max(1, max(len(o["at"]) for o in obs))
    g = np.stack([o["g"] for o in obs])
    nm = np.zeros((B, E), np.int64)
    ef = np.zeros((B, E), np.int64)
    x = np.zeros((B, E, F), np.float32)
    grp = np.full((B, E), -1, np.int64)
    at = np.zeros((B, Amax), np.int64)
    src = np.full((B, Amax), -1, np.int64)
    tgt = np.full((B, Amax), -1, np.int64)
    tk = np.zeros((B, Amax), np.int64)
    am = np.zeros((B, Amax), np.bool_)
    for i, o in enumerate(obs):
        n = len(o["nm"])
        k = len(o["at"])
        nm[i, :n] = o["nm"]
        ef[i, :n] = o["ef"]
        if "kwi" in o:
            f0 = o["f0"]
            x[i, :n, :f0] = o["x"]
            if len(o["kwi"]):
                x[i, o["kwi"], f0 + o["kws"]] = o["kwv"]
        else:
            x[i, :n] = o["x"]
        grp[i, :n] = o["grp"]
        at[i, :k] = o["at"]
        src[i, :k] = o["src"]
        tgt[i, :k] = o["tgt"]
        tk[i, :k] = o["tk"]
        am[i, :k] = True
    t = lambda a: torch.from_numpy(a).to(dev)
    return {"g": t(g), "nm": t(nm), "ef": t(ef), "x": t(x), "grp": t(grp),
            "at": t(at), "src": t(src), "tgt": t(tgt), "tk": t(tk), "am": t(am)}


# ----------------------------------------------------------------------------- 신경망
class QNet(nn.Module):
    """Q(s, a): 상태를 인코딩하고, 합법 행동마다 점수를 매긴다 (행동 수가 가변이어도 OK)."""

    def __init__(self, meta):
        super().__init__()
        self.meta = meta
        self.F = meta["F"]
        self.name_emb = nn.Embedding(meta["nameCount"], NE)
        self.eff_emb = nn.Embedding(meta["effCount"], EE)
        self.ent1 = nn.Linear(self.F + NE + EE, D)
        self.ent2 = nn.Linear(D, D)
        self.st1 = nn.Linear(meta["G"] + 3 * D, H)
        self.st2 = nn.Linear(H, S)
        self.act1 = nn.Linear(meta["nTypes"] + meta["nTk"] + 2 * D, A)
        self.q1 = nn.Linear(S + A, Q)
        self.q2 = nn.Linear(Q, 1)

    def forward(self, b):
        Amax = b["at"].shape[1]
        ent_in = torch.cat([b["x"], self.name_emb(b["nm"]), self.eff_emb(b["ef"])], -1)
        enc = Fn.relu(self.ent2(Fn.relu(self.ent1(ent_in))))                    # [B,E,D]
        pools = []
        for gi in range(3):
            m = (b["grp"] == gi).unsqueeze(-1).to(enc.dtype)
            pools.append((enc * m).sum(1) / 5.0)
        s = Fn.relu(self.st2(Fn.relu(self.st1(torch.cat([b["g"]] + pools, -1)))))  # [B,S]

        def pick(idx):
            safe = idx.clamp(min=0).unsqueeze(-1).expand(-1, -1, D)
            return torch.gather(enc, 1, safe) * (idx >= 0).unsqueeze(-1).to(enc.dtype)

        a_in = torch.cat([Fn.one_hot(b["at"], self.meta["nTypes"]).to(enc.dtype),
                          Fn.one_hot(b["tk"], self.meta["nTk"]).to(enc.dtype),
                          pick(b["src"]), pick(b["tgt"])], -1)
        a = Fn.relu(self.act1(a_in))                                            # [B,A,A]
        q = self.q2(Fn.relu(self.q1(torch.cat([s.unsqueeze(1).expand(-1, Amax, -1), a], -1)))).squeeze(-1)
        return q.masked_fill(~b["am"], -1e9)


def export_json(net, path, info=None):
    tensors = {k: [float(f"{v:.6g}") for v in p.detach().cpu().numpy().ravel().tolist()]
               for k, p in net.state_dict().items()}
    out = {"meta": net.meta, "dims": {"D": D, "S": S, "A": A, "Q": Q, "H": H, "NE": NE, "EE": EE},
           "info": info or {}, "tensors": tensors}
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f)
    os.replace(tmp, path)


# ----------------------------------------------------------------------------- 벡터 환경
class VecEnv:
    """Node 프로세스 nproc 개 × 프로세스당 nenv 개의 게임을 동시에 진행."""

    def __init__(self, nproc, nenv, **cfg):
        self.nproc, self.nenv = nproc, nenv
        self.procs = []
        for i in range(nproc):
            p = subprocess.Popen([NODE, ENV_SERVER], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                 stderr=sys.stderr, bufsize=0)
            self.procs.append(p)
        self.meta = self._call_one(0, {"cmd": "meta"})["meta"]
        self.F = self.meta["F"]
        base_seed = cfg.pop("seed", None)
        self.cfg = cfg
        outs = self._call_all([dict(cmd="reset", n=nenv, seed=None if base_seed is None else base_seed + 1000 * i, **cfg)
                               for i in range(nproc)])
        self.obs = [parse_obs(o, self.F) for r in outs for o in r["obs"]]
        self.size = nproc * nenv
        self.stats = {}

    def _send(self, p, msg):
        p.stdin.write((json.dumps(msg) + "\n").encode("utf-8"))
        p.stdin.flush()

    def _recv(self, p):
        line = p.stdout.readline()
        if not line:
            raise RuntimeError("Node 환경 서버가 종료되었습니다 (node 설치/경로를 확인하세요).")
        r = json.loads(line)
        if "error" in r:
            raise RuntimeError("Node 오류: " + r["error"])
        return r

    def _call_one(self, i, msg):
        self._send(self.procs[i], msg)
        return self._recv(self.procs[i])

    def _call_all(self, msgs):
        for p, m in zip(self.procs, msgs):
            self._send(p, m)
        return [self._recv(p) for p in self.procs]

    def reset(self, **cfg):
        self.cfg.update(cfg)
        outs = self._call_all([dict(cmd="reset", n=self.nenv, **self.cfg) for _ in self.procs])
        self.obs = [parse_obs(o, self.F) for r in outs for o in r["obs"]]
        return self.obs

    def step(self, actions):
        k = self.nenv
        outs = self._call_all([{"cmd": "step", "actions": [int(a) for a in actions[i * k:(i + 1) * k]]}
                               for i in range(self.nproc)])
        res = []
        for i, r in enumerate(outs):
            for x in r["res"]:
                res.append((parse_obs(x["obs"], self.F), x["r"], x["done"], x.get("info")))
            self.stats[i] = r["stats"]
        return res

    def close(self):
        for p in self.procs:
            try:
                self._send(p, {"cmd": "close"})
                p.wait(timeout=3)
            except Exception:
                p.kill()


# ----------------------------------------------------------------------------- 행동 선택 / 평가
@torch.no_grad()
def greedy_actions(net, obs, F, dev, eps=0.0, rng=np.random):
    b = collate(obs, F, dev)
    q = net(b)
    best = q.argmax(1).cpu().numpy()
    if eps <= 0:
        return best, q
    acts = best.copy()
    for i, o in enumerate(obs):
        if rng.random() < eps:
            acts[i] = rng.randint(len(o["at"]))
    return acts, q


@torch.no_grad()
def evaluate(net, venv, opp, games, dev, deck=None):
    """탐험 없이(greedy) 고정 상대와 대결. 반환: 승/무/패, 승률."""
    net.eval()
    cfg = dict(opp={opp: 1.0}, shape=0.0)
    venv.reset(**cfg)
    obs = venv.obs
    w = l = d = 0
    while w + l + d < games:
        acts, _ = greedy_actions(net, obs, venv.F, dev)
        res = venv.step(acts)
        obs = [r[0] for r in res]
        for r in res:
            if r[2] and w + l + d < games:
                win = r[3]["win"]
                if win > 0: w += 1
                elif win < 0: l += 1
                else: d += 1
    net.train()
    n = w + l + d
    return {"win": w, "loss": l, "draw": d, "rate": w / max(1, n)}
