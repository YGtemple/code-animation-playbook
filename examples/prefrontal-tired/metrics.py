#!/usr/bin/env python3
# metrics.py —— 水彩口径：墨线+主晕染覆盖比(HSV色盒)、帧差、静止帧、峰值段长死帧。
import glob, os
import numpy as np
from PIL import Image, ImageDraw

SR_W, SR_H = 160, 90
HERE = os.path.dirname(__file__)
frames = sorted(glob.glob(os.path.join(HERE, 'frames', 'frame_*.png')))
assert len(frames) == 900, f'帧数={len(frames)} 应为900'

# 用 NEAREST 下采样（P9：水彩有羽化，不用双三次糊色）
small = np.zeros((len(frames), SR_H, SR_W, 3), dtype=np.float32)
for i, f in enumerate(frames):
    im = Image.open(f).convert('RGB').resize((SR_W, SR_H), Image.NEAREST)
    small[i] = np.asarray(im, dtype=np.float32)  # 0..255 量纲

# ---------- RGB→HSV 向量化 ----------
def rgb_to_hsv(arr):
    # arr: (...,3) in [0,1]
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = np.max(arr, axis=-1); mn = np.min(arr, axis=-1)
    v = mx
    s = np.where(mx > 1e-6, (mx - mn) / np.where(mx < 1e-6, 1e-6, mx), 0)
    h = np.zeros_like(mx)
    d = mx - mn
    mask = d > 1e-6
    # where max==r
    mr = mask & (mx == r)
    h[mr] = (60.0 * ((g[mr] - b[mr]) / d[mr]) + 360) % 360
    mg = mask & (mx == g)
    h[mg] = 60.0 * ((b[mg] - r[mg]) / d[mg]) + 120
    mb = mask & (mx == b)
    h[mb] = 60.0 * ((r[mb] - g[mb]) / d[mb]) + 240
    return h, s, v

h, s, v = rgb_to_hsv(small / 255.0)

# ---------- 活性色掩码：墨线 / 焦虑晕染 / 崩溃红 任一命中 ----------
ink = (h >= 10) & (h <= 30) & (s >= 0.05) & (s <= 0.25) & (v >= 0.15) & (v <= 0.45)
wash = (h >= 10) & (h <= 25) & (s >= 0.35) & (s <= 0.60) & (v >= 0.50) & (v <= 0.75)
red = (h <= 10) & (s >= 0.45) & (s <= 0.70) & (v >= 0.45) & (v <= 0.70)
active = ink | wash | red

# 排除：纸底 / 降温青
paper = (h >= 30) & (h <= 50) & (s >= 0.08) & (s <= 0.20) & (v >= 0.85) & (v <= 0.98)
teal = (h >= 160) & (h <= 180) & (s >= 0.25) & (s <= 0.40) & (v >= 0.50) & (v <= 0.65)
nonpaper = ~paper

# 覆盖率 = 活性 / (总像素 − 纸底)，逐帧取均值
cov = (active & nonpaper).sum(axis=(1, 2)) / np.maximum(nonpaper.sum(axis=(1, 2)), 1)
cov_pct = cov.mean() * 100

# ---------- 帧差 ----------
d = np.abs(np.diff(small, axis=0)).mean(axis=(1, 2, 3))
avg_diff = d.mean()

# ---------- 静止帧（相邻帧差 < 0.5 视为无变化） ----------
static = d < 0.5
dead = np.zeros(len(frames), dtype=bool)
i = 0
while i < len(static):
    if static[i]:
        j = i
        while j < len(static) and static[j]: j += 1
        if (j - i) >= 3: dead[i:j] = True   # 连续≥3帧(0.1s)
        i = j
    else:
        i += 1
dead_pct = dead.mean() * 100

# ---------- 峰值段(19–23s = 帧570–690)最长连续完全静止 ----------
peak_static = static[570:690]
max_peak_run = 0
cur = 0
for x in peak_static:
    cur = cur + 1 if x else 0
    max_peak_run = max(max_peak_run, cur)
max_peak_sec = max_peak_run / 30.0

print(f'墨线+晕染覆盖比: {cov_pct:6.2f}%   目标 ≥ 8%  -> {"PASS" if cov_pct >= 8 else "FAIL"}')
print(f'平均帧差        : {avg_diff:6.2f}   目标 ≥ 6   -> {"PASS" if avg_diff >= 6 else "FAIL"}')
print(f'连续静止帧占比  : {dead_pct:6.2f}%  目标 ≤ 12% -> {"PASS" if dead_pct <= 12 else "FAIL"}')
print(f'峰值段最长静止  : {max_peak_sec:6.2f}s  目标 ≤ 0.6s -> {"PASS" if max_peak_sec <= 0.6 else "FAIL"}')
# 最长静止片段
runs = []
i = 0
while i < len(static):
    if static[i]:
        j = i
        while j < len(static) and static[j]: j += 1
        runs.append((i, j - i)); i = j
    else:
        i += 1
runs.sort(key=lambda x: -x[1])
print('最长静止(帧起点,长度):', [(a, l) for a, l in runs[:5]],
      '时间:', [(round(a/30, 2), round(l/30, 2)) for a, l in runs[:5]])
