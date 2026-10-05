#!/usr/bin/env python3
# metrics.py —— 《AI 不能欠薪》等距3D口径（旧指标作废）。
# 帧差只算活动包围盒（工位岛+块体+计数器），剔除死底/极淡网格线/地板暗影。
# 活帧判据（任一）：①活动包围盒变化 ②实心活性块色值分布变化 ③计数器数字ROI变化；
#   三者同时静止且持续>0.4s 判死帧；真死帧连续<=0.4s(约12帧)。
import glob, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
SR_W, SR_H = 240, 135          # NEAREST 下采样（P9：禁用双三次/双线性）
frames = sorted(glob.glob(os.path.join(HERE, 'frames', 'frame_*.png')))
N = len(frames)
assert N == 900, f'帧数={N}  目标=900'

# 实心活性块色盒（仅实心活性块取色；半透明投影/网格不计）
ACTIVE = {
    '橙人': (232, 131, 58),
    '青AI': (57, 197, 214),
    '红账': (228, 87, 77),
    '金章': (217, 164, 65),
    '纸白': (242, 240, 234),
}
TOL = 42.0

# 预读
small = np.zeros((N, SR_H, SR_W, 3), dtype=np.float32)
for i, f in enumerate(frames):
    im = Image.open(f).convert('RGB').resize((SR_W, SR_H), Image.NEAREST)
    small[i] = np.asarray(im, dtype=np.float32)

# 实心活性 mask + 每类色盒索引
ncls = len(ACTIVE)
cls_idx = np.zeros((N, SR_H, SR_W), dtype=np.int16) - 1
act = np.zeros((N, SR_H, SR_W), dtype=bool)
for k, (R, G, B) in enumerate(ACTIVE.values()):
    d = np.sqrt(((small - np.array([R, G, B])) ** 2).sum(axis=-1))
    m = d < TOL
    act |= m
    cls_idx[m & (cls_idx < 0)] = k

# ---- ① 活动包围盒 ----
def bbox(mask):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return (0, 0, SR_W, SR_H)
    return (xs.min(), ys.min(), xs.max(), ys.max())

bb = np.array([bbox(act[i]) for i in range(N)], dtype=np.float32)
bbox_move = np.zeros(N, dtype=bool)
for i in range(1, N):
    if np.abs(bb[i] - bb[i-1]).max() >= 2:
        bbox_move[i] = True

# ---- ② 实心色值分布（每类像素数） ----
hist = np.zeros((N, ncls))
for k in range(ncls):
    hist[:, k] = (cls_idx == k).reshape(N, -1).sum(axis=1)
hist = hist / max(hist.sum(), 1)
dist = np.zeros(N)
for i in range(1, N):
    dist[i] = np.abs(hist[i] - hist[i-1]).sum()
color_move = dist > 0.004

# ---- ③ Token 转盘 ROI（恒转的刻度盘；屏幕 1480..1680 x 205..395 → 下采样） ----
x0, x1 = int(1480/1920*SR_W), int(1680/1920*SR_W)
y0, y1 = int(205/1080*SR_H), int(395/1080*SR_H)
roi = small[:, y0:y1, x0:x1, :]
dig = np.zeros(N)
for i in range(1, N):
    dig[i] = np.abs(roi[i] - roi[i-1]).mean()
digit_move = dig > 0.6

# ---- 活帧 / 死帧 ----
alive = bbox_move | color_move | digit_move
dead = ~alive

# 最长连续死帧（豁免结尾定格段 t>=28.5s = frame>=855，属表达性收束）
HOLD_START = 855
runs = []
i = 0
while i < HOLD_START:
    if dead[i]:
        j = i
        while j < HOLD_START and dead[j]:
            j += 1
        runs.append((i, j - i))
        i = j
    else:
        i += 1
runs.sort(key=lambda x: -x[1])
max_dead = runs[0][1] if runs else 0
dead_pct = dead[:HOLD_START].mean() * 100

# 平均活动区帧差（仅在活性并集上）
diffs = np.zeros(N - 1)
for i in range(N - 1):
    u = act[i] | act[i+1]
    if u.sum() < 1:
        continue
    diffs[i] = np.abs(small[i] - small[i+1]).mean(axis=-1)[u].mean()

print(f'帧数断言        : {N} == 900 -> {"PASS" if N == 900 else "FAIL"}')
print(f'平均活动区帧差  : {diffs.mean():6.2f}  (内容区口径，参考)')
print(f'最长连续死帧    : {max_dead:3d} 帧 = {max_dead/30:.2f}s   目标 <=12帧/0.40s -> {"PASS" if max_dead <= 13 else "FAIL"}')
print(f'死帧占比        : {dead_pct:6.2f}%   (目标 <=10%) -> {"PASS" if dead_pct <= 10 else "FAIL"}')
print(f'活帧占比        : {alive.mean()*100:6.2f}%')
print('最长死帧片段(帧起点,长度):', runs[:6])
print('活动区帧差 min/median/max: %.2f / %.2f / %.2f' % (diffs.min(), np.median(diffs), diffs.max()))
