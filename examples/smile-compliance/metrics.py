#!/usr/bin/env python3
# metrics.py —— 《微笑合规》Riso 口径自检。颜色合规 / 网点覆盖 / 套色错位 / 内容区帧差。
import glob, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
frames = sorted(glob.glob(os.path.join(HERE, 'frames', 'frame_*.png')))
assert len(frames) == 900, f'帧数 {len(frames)} != 900'

# NEAREST 下采样（P9：禁双三次，否则纯色盒全丢）
SW, SH = 240, 135
imgs = np.zeros((len(frames), SH, SW, 3), dtype=np.float32)
for i, f in enumerate(frames):
    imgs[i] = np.asarray(Image.open(f).convert('RGB').resize((SW, SH), Image.NEAREST), dtype=np.float32)

R, G, B = imgs[..., 0], imgs[..., 1], imgs[..., 2]
paper = np.array([241, 231, 210.])
pink = np.array([255, 77, 141.])
blue = np.array([30, 90, 168.])

ok = True

# ---------- 1. 颜色合规：检出第四专色外的跑色块（黄/绿/纯黑） ----------
# 只统计大面积“异常纯色”，抗锯齿边缘不计。
r, g, b = R, G, B
yellow = (r > 180) & (g > 170) & (b < 120)          # 黄
green  = (g > 130) & (r < 120) & (b < 130)         # 绿
black  = (r < 35) & (g < 35) & (b < 35)            # 纯黑（禁）
off = (yellow | green | black)
off_pct = off.mean() * 100
color_pass = off_pct < 0.5
ok &= color_pass
print(f'颜色合规(跑色黄/绿/黑) : {off_pct:6.3f}%  阈值 <0.5% -> {"PASS" if color_pass else "FAIL"}')

# 四色占比
def near(px, c, tol=26):
    return (np.abs(px[..., 0]-c[0]) < tol) & (np.abs(px[..., 1]-c[1]) < tol) & (np.abs(px[..., 2]-c[2]) < tol)
pink_frac = near(imgs, pink).mean() * 100
blue_frac = near(imgs, blue).mean() * 100
paper_frac = near(imgs, paper).mean() * 100
print(f'   占比 粉{pink_frac:.1f}% 蓝{blue_frac:.1f}% 纸{paper_frac:.1f}%')

# ---------- 2. 网点覆盖：腮红暗部 dot 覆盖率（只在回合段 3–26s 采样） ----------
box = (slice(146, 166), slice(139, 212))
round_slice = slice(int(3.0 * 30), int(26.0 * 30))
stage_frames = imgs[round_slice]
pink_in_box = near(stage_frames[:, 73:83, 70:106], pink, tol=30).mean(axis=(1, 2))
dot_cov = float(np.median(pink_in_box)) * 100
dot_pass = 25 <= dot_cov <= 70
ok &= dot_pass
print(f'网点(腮红)覆盖率      : {dot_cov:6.1f}%  阈值 25–70% -> {"PASS" if dot_pass else "FAIL"}')

# ---------- 3. 套色错位：粉色边缘 1–3px 内有蓝（halo） ----------
# 在脸盒内统计：粉色像素 3px 邻域内出现蓝的比例
face = imgs[30:100, 55:140]
fr, fg, fb = face[..., 0], face[..., 1], face[..., 2]
pm = (np.abs(fr-pink[0])<30) & (np.abs(fg-pink[1])<30) & (np.abs(fb-pink[2])<30)
bm = (np.abs(fr-blue[0])<30) & (np.abs(fg-blue[1])<30) & (np.abs(fb-blue[2])<30)
# 简单膨胀 3px
bm_d = np.zeros_like(bm)
for dy in range(-3, 4):
    for dx in range(-3, 4):
        bm_d |= np.roll(np.roll(bm, dy, 0), dx, 1)
halo = (pm & bm_d).mean() / max(pm.mean(), 1e-6) * 100
halo_pass = halo > 8
ok &= halo_pass
print(f'套色错位 halo(粉邻蓝) : {halo:6.1f}%  阈值 >8%   -> {"PASS" if halo_pass else "FAIL"}')

# ---------- 4. 内容区帧差：mask 掉网点抖动/套色漂移，只看主体 ----------
d = np.abs(np.diff(imgs, axis=0)).mean(axis=3)   # 相邻帧 RGB 均值差
# 内容掩码：非纸底；排除常驻顶/底 UI 条（非主体运动）
nonpaper = (np.abs(R - paper[0]) > 18) | (np.abs(G - paper[1]) > 18) | (np.abs(B - paper[2]) > 18)
nonpaper[:, :12, :] = False; nonpaper[:, 126:, :] = False
content = nonpaper[1:] | nonpaper[:-1]
# 只算强变化（>28），滤掉网点/套色微动；内容区口径（P11）
strong = (d > 28) & content
changed = strong.sum(axis=(1, 2)) / np.maximum(content.sum(axis=(1, 2)), 1) * 100
avg_changed = changed.mean()
# 真死帧：内容区连续变化 <2%（署名 28.9s 后为表达性定格，豁免）
dead = (changed < 2.0).copy()
dead[int(28.9 * 30):] = False
run = 0; maxrun = 0
i = 0
while i < len(dead):
    if dead[i]:
        j = i
        while j < len(dead) and dead[j]: j += 1
        maxrun = max(maxrun, j - i)
        i = j
    else: i += 1
dead_max_s = maxrun / 30.0
dead_pass = dead_max_s <= 0.4
ok &= dead_pass
print(f'内容区平均变化占比    : {avg_changed:6.2f}%  (内容区口径)')
print(f'内容真死帧最长连续    : {dead_max_s:6.2f}s  阈值 <=0.4s -> {"PASS" if dead_pass else "FAIL"}')

print('\n==>', 'ALL PASS' if ok else 'HAS FAIL')
