"""옛 모델(v89, 카드 목록 순서 번호 방식)을 번호표 방식(v2)으로 옮긴다. 가중치를 이름으로 짝지어 옮기므로 카드 번호가 밀려도 안전하다.

사용 (C:\\card_rl 에서):
    python train\\migrate.py --src dqn --name dqn_v112            models\\dqn  →  models\\dqn_v112
    python train\\migrate.py --src ppo --name ppo_v112
    python train\\migrate.py --src dqn --name dqn_v112 --overwrite   같은 이름의 새 폴더가 이미 있어도 덮어쓰기
옮긴 뒤 이어서 학습:
    python train\\train.py --algo dqn --name dqn_v112 --resume --games 20000 --eps-start 0.05
    python train\\ppo.py --name ppo_v112 --resume --games 20000
이식 직후 모델은 옛 모델과 같은 판단을 한다 (새 카드·키워드는 학습하면서 반영). 확인:
    node tools\\verify_migration.js models\\dqn\\best.json models\\dqn_v112\\best.json
원본 폴더는 건드리지 않는다 (--name 이 --src 와 같으면 자동 백업 후 덮어씀).
"""
import argparse
import json
import os
import shutil
import subprocess

import numpy as np
import torch

from common import NODE, QNet, export_json
from migrate_core import migrate_state, reg_counts
from registry_sync import REG_FILE

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")

p = argparse.ArgumentParser()
p.add_argument("--src", required=True, help="옮길 모델 폴더 이름 (models\\<이름>), 예: dqn")
p.add_argument("--name", required=True, help="새 폴더 이름 (models\\<이름>), 예: dqn_v112")
p.add_argument("--old-engine", default=os.path.join(ROOT, "game", "engine_v89.js"),
               help="옛 형식 모델이 학습된 엔진 파일 (카드 번호 순서를 재현하는 데 필요)")
p.add_argument("--models", default=os.path.join(ROOT, "models"))
p.add_argument("--overwrite", action="store_true", help="같은 이름의 폴더가 이미 있어도 덮어쓰기")
args = p.parse_args()

src_dir = os.path.join(args.models, args.src)
dst_dir = os.path.join(args.models, args.name)
if not os.path.isdir(src_dir):
    raise SystemExit(f"원본 폴더가 없습니다: {src_dir}")
files = [f for f in ("model.pt", "best.pt") if os.path.exists(os.path.join(src_dir, f))]
if not files:
    raise SystemExit(f"{src_dir} 에 model.pt / best.pt 가 없습니다.")
if os.path.exists(os.path.join(dst_dir, "model.pt")) or os.path.exists(os.path.join(dst_dir, "best.pt")):
    if not args.overwrite:
        raise SystemExit(f"{dst_dir} 에 이미 모델이 있습니다. 덮어쓰려면 --overwrite 를 붙이세요 (다른 이름을 쓰려면 --name).")
if os.path.abspath(src_dir) == os.path.abspath(dst_dir):
    bak, k = src_dir + "_backup", 1
    while os.path.exists(bak):
        k += 1; bak = f"{src_dir}_backup{k}"
    shutil.copytree(src_dir, bak)
    print(f"원본과 같은 이름이라 먼저 백업했습니다: {bak}", flush=True)
os.makedirs(dst_dir, exist_ok=True)

new_meta = json.loads(subprocess.check_output([NODE, os.path.join(ROOT, "tools", "print_meta.js")]).decode("utf-8"))
print(f"새 설정: 엔진 {new_meta['engine']}, 번호표 카드 {new_meta['reg']['names']}장 · 효과 {new_meta['reg']['effs']}개 · 키워드 {new_meta['reg']['kws']}개 "
      f"(용량 {new_meta['nameCount']}/{new_meta['effCount']}/{new_meta['F'] - new_meta['F0']})", flush=True)


def vocab_maps(om):
    """옛 형식(v1) 모델: 옛 엔진에서 카드·효과 번호 순서를 재현해 이름으로 새 번호에 짝짓는다."""
    if om.get("fmt") == "v2":
        return None, None
    reg = json.load(open(REG_FILE, encoding="utf-8"))
    ali = json.load(open(os.path.join(ROOT, "game", "card_aliases.json"), encoding="utf-8")).get("aliases", {})
    voc = json.loads(subprocess.check_output([NODE, os.path.join(ROOT, "tools", "print_vocab.js"), args.old_engine]).decode("utf-8"))
    on, oe, _ = reg_counts(om)
    if len(voc["names"]) != on or len(voc["effs"]) != oe:
        raise SystemExit(f"--old-engine({args.old_engine}) 의 카드 {len(voc['names'])}장/효과 {len(voc['effs'])}개가 모델이 아는 "
                         f"{on}장/{oe}개와 다릅니다. 이 모델이 학습된 엔진 파일을 지정하세요.")
    nid = {n: i + 1 for i, n in enumerate(reg["names"])}
    eid = {t: i + 1 for i, t in enumerate(reg["effs"])}
    name_map = [0] + [nid.get(ali.get(n, n), -1) for n in voc["names"]]
    eff_map = [0] + [eid.get(t, -1) for t in voc["effs"]]
    lost = [n for n, m in zip(voc["names"], name_map[1:]) if m < 0] + [t for t, m in zip(voc["effs"], eff_map[1:]) if m < 0]
    if lost:
        print(f"주의: 새 번호표에 없는 옛 카드/효과 {len(lost)}개는 이식되지 않습니다: {', '.join(lost[:8])}", flush=True)
    return name_map, eff_map


def convert(fname):
    ck = torch.load(os.path.join(src_dir, fname), map_location="cpu")
    om = ck["meta"]
    nmap, emap = vocab_maps(om)
    old = {k: v.detach().cpu().numpy() for k, v in ck["net"].items()}
    new = migrate_state(old, om, new_meta, nmap, emap)
    out = dict(ck)
    out["net"] = {k: torch.from_numpy(np.ascontiguousarray(v)) for k, v in new.items()}
    out["meta"] = new_meta
    out["games"] = 0
    out["best"] = -1.0
    out.pop("opt", None)
    if "updates" in out:
        out["updates"] = 0
    out["migrated_from"] = {"src": args.src, "engine": om.get("engine"), "games": ck.get("games", 0)}
    torch.save(out, os.path.join(dst_dir, fname))
    q = QNet(new_meta)
    q.load_state_dict({k: v for k, v in out["net"].items() if k in q.state_dict()})   # PPO 의 가치 머리(v1/v2)는 JSON 에서 제외
    algo = (ck.get("args") or {}).get("algo", "ppo" if "updates" in ck else args.src)
    export_json(q, os.path.join(dst_dir, fname.replace(".pt", ".json")),
                {"algo": algo, "migrated_from": args.src, "from_engine": om.get("engine"), "games": 0, "engine": new_meta["engine"]})
    print(f"  {fname}: 옛 {om.get('engine')}({ck.get('games', '?')}판) → 새 {new_meta['engine']} 완료", flush=True)


for f in files:
    convert(f)
print(f"\n완료: {dst_dir}\n확인:  node tools\\verify_migration.js models\\{args.src}\\best.json models\\{args.name}\\best.json\n"
      f"이어서 학습 예:  python train\\train.py --algo <dqn|sarsa|mc> --name {args.name} --resume --games 20000 --eps-start 0.05\n"
      f"                 python train\\ppo.py --name {args.name} --resume --games 20000", flush=True)
