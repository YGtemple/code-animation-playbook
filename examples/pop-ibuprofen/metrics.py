#!/usr/bin/env python3
# metrics.py —— 波普漫画五指标。下采样 160x90 NEAREST，先归5色桶+other。
import glob, os
import numpy as np
from PIL import Image
from scipy import ndimage

SR_W, SR_H = 160, 90
HERE = os.path.dirname(__file__)
frames = sorted(glob.glob(os.path.join(HERE, 'frames', 'frame_*.png')))
assert len(frames) == 900, len(frames)

# 锁死5色
PAL = {
    'paper': (244, 237, 216),
    'ink':   (17, 17, 17),
    'red':   (226, 35, 26),
    'yellow':(244, 194, 13),
    'blue':  (30, 90, 168),
}
names = ['paper', 'ink', 'red', 'yellow', 'blue']
pal = np.array([PAL[k] for k in names], dtype=np.float32)

small = np.zeros((len(frames), SR_H, SR_W, 3), dtype=np.float32)
for i, f in enumerate(frames):
    im = Image.open(f).convert('RGB').resize((SR_W, SR_H), Image.NEAREST)
    small[i] = np.asarray(im, dtype=np.float32)

# 最近色归类（容差45，其余=other）
d = ((small[:, :, :, None, :] - pal[None, None, None, :, :]) ** 2).sum(axis=4)
idx = d.argmin(axis=3); mind = d.min(axis=3)
TOL = 45.0 * 45
masks = {k: (idx == i) & (mind < TOL) for i, k in enumerate(names)}
other = ~np.logical_or.reduce(list(masks.values()))
red, yellow, blue, ink = masks['red'], masks['yellow'], masks['blue'], masks['ink']
total = SR_W * SR_H

print(f'other 占比均值: {other.mean()*100:5.2f}%  (目标 <=2% 的量级)')

# ---- 指标1 dot_cov：原色桶 - 3x3开运算(大块实色) = 网点（逐帧）----
dots = np.zeros_like(red)
for fi in range(len(frames)):
    for m in (red, yellow, blue):
        opened = ndimage.binary_opening(m[fi], structure=np.ones((3, 3)))
        dots[fi] |= (m[fi] & ~opened)
dot_cov = dots.mean() * 100
peak_frames = dots[500:560].mean(axis=(1, 2)) * 100
dot_peak = peak_frames.max()

# ---- 指标2 ink_ratio：粗黑描边 ----
ink_ratio = ink.mean() * 100

# ---- 指标3 primary_box：三原色合计 + 各色 ----
prim = red | yellow | blue
primary_box = prim.mean() * 100
r_pct, y_pct, b_pct = red.mean()*100, yellow.mean()*100, blue.mean()*100

# ---- 内容区（裁掉面板边距，约外圈8px）----
CROP = 8
def content(a): return a[:, CROP:SR_H-CROP, CROP:SR_W-CROP]

# ---- 指标4 panel_motion：内容区帧差 >0.3%连通块，统计运动事件 ----
gray = small.mean(axis=3)
diff = np.abs(np.diff(gray, axis=0))
cdiff = content(diff)
motion_events = 0
prev_large = False
for i in range(cdiff.shape[0]):
    binm = cdiff[i] > 25   # 阈值化
    lab, n = ndimage.label(binm)
    big = 0
    if n > 0:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n+1))
        big = (sizes > 0.003 * cdiff.shape[1] * cdiff.shape[2]).sum()  # >0.3%画面
    has = big > 0
    if has and not prev_large:
        motion_events += 1
    prev_large = has

# ---- 指标5 dead：内容区帧差<1.5 连续>=40帧 ----
cdiff_mean = cdiff.mean(axis=(1, 2))
quiet = cdiff_mean < 1.5
# 连续>=40帧
dead = np.zeros(len(quiet), dtype=bool)
i = 0
while i < len(quiet):
    if quiet[i]:
        j = i
        while j < len(quiet) and quiet[j]: j += 1
        if j - i >= 40: dead[i:j] = True
        i = j
    else: i += 1
dead_pct = dead.mean() * 100

# ---- 输出 ----
print(f'\n=== 波普五指标 ===')
print(f'1 dot_cov 网点覆盖   : {dot_cov:5.2f}%  (目标 8-18%, 高潮帧>=22)  高潮帧 {dot_peak:5.2f}%')
print(f'2 ink_ratio 粗黑描边 : {ink_ratio:5.2f}%  (目标 4-7%)')
print(f'3 primary_box 三原色 : {primary_box:5.2f}%  (目标 35-55%, 各色>=8)  R{r_pct:.1f} Y{y_pct:.1f} B{b_pct:.1f}')
print(f'4 panel_motion 运动事件: {motion_events} 次  (目标 >=8)')
print(f'5 dead 死帧占比      : {dead_pct:5.2f}%  (目标 <=12%)')
