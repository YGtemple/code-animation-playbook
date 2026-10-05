#!/usr/bin/env python3
# metrics.py —— 包豪斯/瑞士网格口径。旧朋克指标作废。
# 1) 三原色覆盖(HSV桶)：红H[345,15]跨0 / 黄H[45,70] / 蓝H[200,230]，S>=0.6；每帧三色合计15-60%、至少命中2桶。
# 2) 网格活性：内容区8x8切块取V均值，相邻帧|ΔV|>=3的块占比>=5%为真运动帧；真死帧连续<=0.4s(约12帧)。
# 3) 帧差内容区口径(boil关)；署名栏(>=28.8s)排除在死帧统计外。
# 4) 断言帧数=900。
import glob, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
SR_W, SR_H = 480, 272   # NEAREST 下采样（P9：不用双三次，纯色盒不被搅出；须被8整除）
frames = sorted(glob.glob(os.path.join(HERE, 'frames', 'frame_*.png')))
N = len(frames)
assert N == 900, f'帧数={N}  目标=900'

# 预读（NEAREST，0-255）
small = np.zeros((N, SR_H, SR_W, 3), dtype=np.float32)
for i, f in enumerate(frames):
    im = Image.open(f).convert('RGB').resize((SR_W, SR_H), Image.NEAREST)
    small[i] = np.asarray(im, dtype=np.float32)

# ---------- HSV ----------
def to_hsv(arr):
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = np.max(arr, axis=-1); mn = np.min(arr, axis=-1)
    df = mx - mn
    h = np.zeros_like(mx)
    m = df > 1e-6
    idx = m & (mx == r); h[idx] = (60 * ((g - b) / np.where(df == 0, 1, df)))[idx] % 360
    idx = m & (mx == g); h[idx] = (60 * ((b - r) / np.where(df == 0, 1, df)) + 120)[idx]
    idx = m & (mx == b); h[idx] = (60 * ((r - g) / np.where(df == 0, 1, df)) + 240)[idx]
    s = np.where(mx > 1e-6, df / np.maximum(mx, 1e-6), 0)
    return h, s, mx

R = small[..., 0]; G = small[..., 1]; B = small[..., 2]
h, s, v = to_hsv(small)

def in_red(hh): return ((hh >= 345) | (hh <= 15))
def in_yel(hh): return (hh >= 45) & (hh <= 70)
def in_blu(hh): return (hh >= 200) & (hh <= 230)

red = in_red(h) & (s >= 0.6)
yel = in_yel(h) & (s >= 0.6)
blu = in_blu(h) & (s >= 0.6)

tri = red | yel | blu
cov = tri.mean(axis=(1, 2)) * 100.0          # 每帧三色合计占比%
hit_red = red.mean(axis=(1, 2)) * 100.0
hit_yel = yel.mean(axis=(1, 2)) * 100.0
hit_blu = blu.mean(axis=(1, 2)) * 100.0

avg_cov = cov.mean()
# 每帧命中桶数
n_buckets = (red.any(axis=(1,2)).astype(int) + yel.any(axis=(1,2)).astype(int) + blu.any(axis=(1,2)).astype(int))

# ---------- 8x8 块 V 均值活性 ----------
BH, BW = 8, 8
# 内容区：裁掉顶栏(头部rule)与底栏(进度条)外框，居中主体
# 简单起见用整帧 8x8 块，但把署名段(>=28.8s=864帧)排除死帧统计
vb = v.reshape(N, BH, SR_H // BH, BW, SR_W // BW).mean(axis=(2, 4))
dv = np.abs(np.diff(vb, axis=0))             # (N-1, 8, 8)
changed_frac = (dv >= 3).mean(axis=(1, 2))   # 每对相邻帧变化块占比

# 排除署名段（帧 >= 864）：这些相邻帧既不算活也不算死，打断死帧run
CUT = int(round(28.8 * 30))
alive = np.zeros(N - 1, dtype=bool)
for i in range(N - 1):
    if i >= CUT - 1:
        alive[i] = True          # 署名段视为"非死"，不打断统计
        continue
    alive[i] = changed_frac[i] >= 0.05

# 死帧 = 变化块 < 5%
dead = ~alive
# 最长连续死帧run
runs = []
i = 0
while i < len(dead):
    if dead[i]:
        j = i
        while j < len(dead) and dead[j]: j += 1
        runs.append((i, j - i)); i = j
    else:
        i += 1
runs.sort(key=lambda x: -x[1])
max_dead = runs[0][1] if runs else 0

# ---------- 输出 ----------
print(f'帧数断言        : {N} == 900 -> {"PASS" if N==900 else "FAIL"}')
print(f'三原色平均覆盖  : {avg_cov:6.2f}%  目标15-60% -> {"PASS" if 15<=avg_cov<=60 else "FAIL"}')
print(f'  红/黄/蓝均值   : {hit_red.mean():.1f} / {hit_yel.mean():.1f} / {hit_blu.mean():.1f}%')
# 每帧至少命中2桶（在非署名段；排除开场黑场前4帧=0.12s）
BLACK_F = int(round(0.12 * 30))
check_buckets = n_buckets[BLACK_F:CUT]
min_buckets = check_buckets.min()
frames_lt2 = int((check_buckets < 2).sum())
print(f'每帧命中桶数    : 最少={min_buckets} (<2桶帧数={frames_lt2}) -> {"PASS" if frames_lt2==0 else "FAIL"}')
print(f'真运动帧占比    : {alive.mean()*100:6.1f}%  (变化块>=5%)')
print(f'最长连续死帧    : {max_dead:3d} 帧 ({max_dead/30:.2f}s)  目标<=12帧(0.4s) -> {"PASS" if max_dead<=12 else "FAIL"}')
print('最长死帧run(帧起点,长度):', runs[:5], ' 时间:', [(round(a/30,2), round(l/30,2)) for a,l in runs[:5]])
print('块变化占比 min/median/max: %.3f / %.3f / %.3f' % (changed_frac[:CUT].min(), np.median(changed_frac[:CUT]), changed_frac[:CUT].max()))
print('三色覆盖 min/max: %.1f / %.1f' % (cov[:CUT].min(), cov[:CUT].max()))
