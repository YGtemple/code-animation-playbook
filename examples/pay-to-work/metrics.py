#!/usr/bin/env python3
# metrics.py —— 孟菲斯口径：活性色 HSV 分桶 + blob 运动 + 活性像素帧差。目标见 prompt 第四节。
import glob, os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(__file__)
SR_W, SR_H = 240, 135   # 适中分辨率做 blob 分析
frames = sorted(glob.glob(os.path.join(HERE, 'frames', 'frame_*.png')))
assert len(frames) == 900, f'帧数={len(frames)}  目标=900'

# 活性色 RGB（孟菲斯）
ACTIVE = {
    '粉': (255, 93, 162),
    '黄': (255, 210, 63),
    '青': (0, 194, 203),
    '橙': (255, 107, 53),
    '紫': (123, 44, 191),
}

def rgb_to_hsv(arr):
    # arr: (...,3) float 0-1  -> h(0-360), s, v
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = np.max(arr, axis=-1); mn = np.min(arr, axis=-1)
    df = mx - mn
    h = np.zeros_like(mx)
    mask = df > 1e-6
    idx = mask & (mx == r); h[idx] = (60 * ((g - b) / df))[idx] % 360
    idx = mask & (mx == g); h[idx] = (60 * ((b - r) / df) + 120)[idx]
    idx = mask & (mx == b); h[idx] = (60 * ((r - g) / df) + 240)[idx]
    s = np.where(mx > 1e-6, df / np.maximum(mx, 1e-6), 0)
    return h, s, mx

# 预读所有帧（NEAREST 下采样，避免插值把纯色块搅出色盒 —— P9）
N = len(frames)
small = np.zeros((N, SR_H, SR_W, 3), dtype=np.float32)
for i, f in enumerate(frames):
    im = Image.open(f).convert('RGB').resize((SR_W, SR_H), Image.NEAREST)
    small[i] = np.asarray(im, dtype=np.float32) / 255.0

# ---- 活性色 mask：按色相桶（±阈值）+ 黑描边块 ----
def active_mask(rgb):
    h, s, v = rgb_to_hsv(rgb)
    m = np.zeros(h.shape, dtype=bool)
    # 5 撞色：先按色相桶，且饱和度够高
    for name, (R, G, B) in ACTIVE.items():
        ch, _, _ = rgb_to_hsv(np.array([[[R / 255, G / 255, B / 255]]]))
        ch = ch[0, 0]
        dh = np.abs(((h - ch + 180) % 360) - 180)
        m |= (dh < 22) & (s > 0.55)
    # 黑描边块（暗且低饱和）
    m |= (v < 0.22)
    return m

masks = np.zeros((N, SR_H, SR_W), dtype=bool)
for i in range(N):
    masks[i] = active_mask(small[i])

# ---- 活性像素帧差（只在活性像素并集上算，不被奶油白底压低）----
diffs = np.zeros(N - 1)
for i in range(N - 1):
    union = masks[i] | masks[i + 1]
    if union.sum() < 1:
        diffs[i] = 0; continue
    d = np.abs(small[i] - small[i + 1]).mean(axis=-1)
    diffs[i] = d[union].mean() * 255.0   # 回到 0-255 量纲

avg_diff = diffs.mean()

# ---- blob 运动：连通域质心位移 ----
def blob_motion(a, b):
    # 返回 (max_centroid_shift, max_area_frac_change)
    la, na = ndimage.label(a)
    lb, nb = ndimage.label(b)
    if na == 0 or nb == 0:
        return (999 if na != nb else 0, 0)
    sizes_a = ndimage.sum(a, la, range(1, na + 1))
    sizes_b = ndimage.sum(b, lb, range(1, nb + 1))
    total_a = sizes_a.sum(); total_b = sizes_b.sum()
    if total_a == 0: return (0, 0)
    # 整体质心位移
    def cent(mask):
        ys, xs = np.nonzero(mask)
        return np.array([xs.mean(), ys.mean()]) if len(xs) else np.array([0.0, 0.0])
    shift = np.linalg.norm(cent(a) - cent(b))
    area_chg = abs(total_b - total_a) / total_a
    return shift, area_chg

shifts = np.zeros(N - 1)
for i in range(N - 1):
    shifts[i], _ = blob_motion(masks[i], masks[i + 1])

# ---- 静止判定：连续3帧活性blob质心位移≈0 且帧差低 ----
static = (diffs < 1.5) & (shifts < 1.5)
dead = np.zeros(N, dtype=bool)
i = 0
while i < len(static):
    if static[i]:
        j = i
        while j < len(static) and static[j]:
            j += 1
        if (j - i) >= 3:
            dead[i:j] = True
        i = j
    else:
        i += 1
dead_pct = dead.mean() * 100

# 活性色占比（均值）
act_pct = masks.mean() * 100

print(f'平均活性帧差    : {avg_diff:6.2f}   目标 ≥ 6   -> {"PASS" if avg_diff >= 6 else "FAIL"}')
print(f'连续静止帧占比  : {dead_pct:6.2f}%  目标 ≤ 10% -> {"PASS" if dead_pct <= 10 else "FAIL"}')
print(f'活性色面积占比  : {act_pct:6.2f}%  (参考，撞色+黑描边)')
print(f'帧数断言        : {N} == 900 -> {"PASS" if N == 900 else "FAIL"}')

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
print('最长静止片段(帧起点,长度):', runs[:5], ' 时间:', [(round(a / 30, 2), round(l / 30, 2)) for a, l in runs[:5]])
print('帧差 min/median/max: %.2f / %.2f / %.2f' % (diffs.min(), np.median(diffs), diffs.max()))
