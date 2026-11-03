"""이어서 학습(--resume) 할 때, 저장된 가중치를 현재 번호표/용량에 맞춘다 (번호표에 카드가 추가된 경우 등).
같으면 그대로 돌려주고, v2 → v2 에서 번호표가 늘었으면 새 카드 행은 '모름' 행으로 채우고 새 키워드 칸은 0 으로 둔다."""
import hashlib
import json
import os

import numpy as np

from migrate_core import migrate_state

HERE = os.path.dirname(os.path.abspath(__file__))
REG_FILE = os.environ.get("CARD_REGISTRY") or os.path.join(HERE, "..", "game", "card_registry.json")
KEYS = ("F", "F0", "G", "nameCount", "effCount", "nTypes", "nTk", "fmt")


def prefix_hash(reg, counts):
    """JS(features2.js)의 prefixHash 와 같은 값"""
    j = json.dumps([reg["names"][:counts["names"]], reg["effs"][:counts["effs"]], reg["kws"][:counts["kws"]]],
                   ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha1(j.encode("utf-8")).hexdigest()[:16]


def check_registry(meta):
    if not os.path.exists(REG_FILE):
        raise SystemExit("번호표 파일이 없습니다: " + REG_FILE)
    reg = json.load(open(REG_FILE, encoding="utf-8"))
    r = meta["reg"]
    if (r["names"] > len(reg["names"]) or r["effs"] > len(reg["effs"]) or r["kws"] > len(reg["kws"])
            or prefix_hash(reg, r) != r["hash"]):
        raise SystemExit("번호표(card_registry.json)가 이 모델이 학습될 때와 다릅니다. 번호표는 뒤에 추가만 해야 합니다 — 파일을 확인하세요.")


def sync_state_dict(sd, old_meta, new_meta):
    """sd: {키: tensor 또는 ndarray}. 반환: 현재 메타에 맞는 {키: tensor}"""
    if old_meta is None:
        return sd
    if old_meta.get("fmt") != new_meta.get("fmt"):
        raise SystemExit("저장된 모델의 형식이 현재 설정과 다릅니다(옛 v1 모델 ↔ 번호표 v2).\n"
                         "  → python train\\migrate.py --src <옛 폴더> --name <새 이름>  으로 먼저 옮기세요.\n"
                         "  (옛 방식으로 계속하려면 환경변수 CARD_ENGINE=v89 FEATURES=v1 로 실행)")
    if new_meta.get("fmt") != "v2":
        return sd
    check_registry(old_meta)
    if all(old_meta.get(k) == new_meta.get(k) for k in KEYS) and old_meta.get("reg") == new_meta.get("reg"):
        return sd
    import torch
    old = {k: (v.detach().cpu().numpy() if hasattr(v, "detach") else np.asarray(v)) for k, v in sd.items()}
    new = migrate_state(old, old_meta, new_meta)
    r0, r1 = old_meta["reg"], new_meta["reg"]
    print(f"번호표가 늘어서 가중치를 맞춥니다: 카드 {r0['names']}→{r1['names']}, 효과 {r0['effs']}→{r1['effs']}, 키워드 {r0['kws']}→{r1['kws']}", flush=True)
    return {k: torch.from_numpy(np.ascontiguousarray(v)) for k, v in new.items()}


def model_json_compatible(path, meta):
    """models\\<폴더>\\*.json 이 현재 엔진/번호표 설정으로 읽히는 모델인지 대략 확인 (상대·평가용 모델 존재 확인에 사용)"""
    try:
        m = json.load(open(path, encoding="utf-8"))["meta"]
    except Exception:
        return False
    if m.get("fmt") != meta.get("fmt"):
        return False
    if meta.get("fmt") == "v2":
        return all(m.get(k) == meta.get(k) for k in KEYS) and m.get("reg", {}).get("names", 0) <= meta["reg"]["names"]
    return m.get("nameCount") == meta.get("nameCount") and m.get("effCount") == meta.get("effCount")
