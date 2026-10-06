#!/usr/bin/env python3
# metrics.py —— 定格步进口径（旧逐帧差作废）。
# pose p_i = frame(2i) 共 450；按 #E8A87C±12 掩膜，提质心(cx,cy)、外接框比 sq=H/W、16 射线 r(θ)。
# 活 pose（任一）：质心位移≥4px / (1-corr(r_i,r_{i+1}))≥0.03 / |Δsq|≥0.025。
# 窗口=30 pose(1s)，窗口 alive 需 active pose≥3；全片 alive 窗口占比≥0.85。
import glob, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
frames = sorted(glob.glob(os.path.join(HERE, 'frames', 'frame_*.png')))
assert len(frames) == 900, f'expected 900 frames, got {len(frames)}'

SR_W, SR_H = 480, 270   # 下采样（NEAREST，保色盒）
POSES = 450

# 色盒 #E8A87C ±12
T_R, T_G, T_B = 232, 168, 124
TOL = 12

def pose_features(frame_idx):
    im = Image.open(frames[frame_idx]).convert('RGB').resize((SR_W, SR_H), Image.NEAREST)
    a = np.asarray(im, dtype=np.int16)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mask = (np.abs(R - T_R) <= TOL) & (np.abs(G - T_G) <= TOL) & (np.abs(B - T_B) <= TOL)
    ys, xs = np.nonzero(mask)
    if len(xs) < 80:
        return None
    cx = xs.mean(); cy = ys.mean()
    h_ = ys.max() - ys.min(); w_ = xs.max() - xs.min()
    sq = h_ / max(w_, 1)
    # 16 射线
    rays = np.zeros(16)
    yy, xx = np.nonzero(mask)
    for k in range(16):
        th = k * np.pi / 8
        dx, dy = np.cos(th), np.sin(th)
        proj = (xx - cx) * dx + (yy - cy) * dy
        rays[k] = proj.max()
    return cx, cy, sq, rays

feat = [pose_features(2 * i) for i in range(POSES)]

# 相邻 pose 活性
active = np.zeros(POSES - 1, dtype=bool)
for i in range(POSES - 1):
    f0, f1 = feat[i], feat[i + 1]
    if f0 is None or f1 is None:
        active[i] = False
        continue
    cx0, cy0, sq0, r0 = f0; cx1, cy1, sq1, r1 = f1
    disp = np.hypot(cx1 - cx0, cy1 - cy0)
    rc = np.corrcoef(r0, r1)[0, 1]
    rc = 0.0 if np.isnan(rc) else rc
    ds = abs(sq1 - sq0)
    active[i] = (disp >= 4.0) or ((1 - rc) >= 0.03) or (ds >= 0.025)

# 窗口 30 pose（1s）
WIN = 30
nwin = (POSES - 1) // WIN
alive_win = []
for w in range(nwin):
    seg = active[w * WIN:(w + 1) * WIN]
    alive_win.append(seg.sum() >= 3)
alive_win = np.array(alive_win)
ratio = alive_win.mean()

# 白名单：660–900 帧 = pose 330..449（假胜利白球 + 结尾负鼠定格）
WL_POSE_START = 330
wl_windows = [w for w in range(nwin) if (w * WIN) >= WL_POSE_START]
non_wl = [w for w in range(nwin) if w not in wl_windows]
dead_nonwl = [w for w in non_wl if not alive_win[w]]

print(f'active poses 总数: {active.sum()} / {POSES-1}')
print(f'alive 窗口占比   : {ratio*100:.1f}%  目标 >=85%  -> {"PASS" if ratio>=0.85 else "FAIL"}')
print(f'白名单窗口(>=pose{WL_POSE_START}, 约4s): {len(wl_windows)} 个')
print(f'白名单外死窗口   : {len(dead_nonwl)} 个 {dead_nonwl}')
# 禁白名单外连续 2 个窗口 active=0
consec_dead = False
for k in range(len(non_wl) - 1):
    if (not alive_win[non_wl[k]]) and (not alive_win[non_wl[k+1]]):
        consec_dead = True
print(f'白名单外连续2死窗: {"是 -> FAIL" if consec_dead else "否 -> PASS"}')
# 各窗口活性明细
detail = [(w, int(active[w*WIN:(w+1)*WIN].sum())) for w in range(nwin)]
print('窗口活性明细(窗口, active pose数):', detail)
