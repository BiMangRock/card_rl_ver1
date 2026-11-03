"""모델 가중치 이식의 핵심 로직 — numpy 만 사용 (torch 없이 테스트 가능).

옛 모델(v1: 카드 목록 순서로 번호, 크기가 카드 수에 묶임) 또는 번호표 모델(v2)의 가중치를
새 메타(번호표 용량 기준)에 맞는 크기로 옮긴다. 바뀌는 층은 4곳뿐이다.
  name_emb / eff_emb : 행 = 카드/효과 번호. 아는 번호는 그대로 옮기고, 새 번호·빈 칸은 '모름(0번)' 행을 복사
  ent1.weight        : 입력 = [개체특징 | 이름임베딩 | 효과임베딩]. 개체특징 뒤쪽(키워드 칸)이 늘어남 → 새 칸은 0
  st1.weight         : 입력 = [전역특징 | 풀링 3개].  전역특징 칸이 늘어남 → 새 칸은 0
  act1.weight        : 입력 = [행동종류 | 대상종류 | 출처 | 대상].  대상종류 칸이 늘어남 → 새 칸은 0
새로 생긴 입력 칸의 가중치를 0 으로 두므로, 이식 직후 모델은 옛 모델과 같은 판단을 한다 (새 정보는 학습하면서 반영됨).
"""
import numpy as np

D, NE, EE = 64, 24, 12          # common.py 와 같은 값 (개체 임베딩 / 카드 이름 / 효과 종류)


def reg_counts(meta):
    """모델이 '알고 있는' 항목 수 (이름 수, 효과 수, 키워드 칸 수)"""
    if meta.get("fmt") == "v2":
        r = meta["reg"]
        return r["names"], r["effs"], r["kws"]
    return meta["nameCount"] - 1, meta["effCount"] - 1, 0     # v1: 번호 1..N 이 전부 쓰인 것


def _emb(w, new_rows, known, mapping):
    new = np.empty((new_rows, w.shape[1]), w.dtype)
    new[:] = w[0]                                   # 모르는 번호는 전부 '모름' 행으로 시작
    for i in range(1, known + 1):
        j = i if mapping is None else mapping[i]
        if j is not None and j >= 1:
            new[j] = w[i]
    return new


def migrate_state(old, om, nm, name_map=None, eff_map=None):
    """old: {키: ndarray}, om/nm: 옛/새 메타. name_map/eff_map: 옛 번호 → 새 번호 리스트(없으면 같은 번호)."""
    on, oe, ok = reg_counts(om)
    out = {}
    for k, w in old.items():
        w = np.asarray(w)
        if k == "name_emb.weight":
            if name_map is not None and len(name_map) < on + 1:
                raise ValueError("name_map 길이가 옛 모델의 카드 수와 맞지 않습니다")
            out[k] = _emb(w, nm["nameCount"], on, name_map)
        elif k == "eff_emb.weight":
            if eff_map is not None and len(eff_map) < oe + 1:
                raise ValueError("eff_map 길이가 옛 모델의 효과 수와 맞지 않습니다")
            out[k] = _emb(w, nm["effCount"], oe, eff_map)
        elif k == "ent1.weight":
            Fo, Fn, F0 = om["F"], nm["F"], nm.get("F0", 24)
            new = np.zeros((w.shape[0], Fn + NE + EE), w.dtype)
            c = min(Fo, Fn, F0 + ok)                 # 옛 모델이 실제로 아는 개체 특징 칸까지만 복사
            new[:, :c] = w[:, :c]
            new[:, Fn:] = w[:, Fo:Fo + NE + EE]
            out[k] = new
        elif k == "st1.weight":
            Go, Gn = om["G"], nm["G"]
            new = np.zeros((w.shape[0], Gn + 3 * D), w.dtype)
            c = min(Go, Gn)
            new[:, :c] = w[:, :c]
            new[:, Gn:] = w[:, Go:]
            out[k] = new
        elif k == "act1.weight":
            nT, to, tn = om["nTypes"], om["nTk"], nm["nTk"]
            if om["nTypes"] != nm["nTypes"]:
                raise ValueError("행동 종류 수가 달라서 이식할 수 없습니다")
            new = np.zeros((w.shape[0], nT + tn + 2 * D), w.dtype)
            new[:, :nT] = w[:, :nT]
            c = min(to, tn)
            new[:, nT:nT + c] = w[:, nT:nT + c]
            new[:, nT + tn:] = w[:, nT + to:]
            out[k] = new
        else:
            out[k] = w.copy()
    return out
