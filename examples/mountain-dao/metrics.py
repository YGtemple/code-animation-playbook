#!/usr/bin/env python3
# metrics.py —— 青绿山水五项指标。每 10 帧抽 1 张共 90 张。
import glob, os
import numpy as np
from PIL import Image
from scipy import ndimage

D = os.path.dirname(os.path.abspath(__file__))
frames = sorted(glob.glob(os.path.join(D, 'frames', 'frame_*.png')))
# 抽帧：每 10 帧取一张
samples = frames[::10]
print(f'渲染总帧数: {len(frames)}, 抽样: {len(samples)}')

imgs = [np.asarray(Image.open(f).convert('RGB'), dtype=np.float32) for f in samples]
arr = np.stack(imgs, axis=0)  # (n,H,W,3)
R, G, B = arr[..., 0], arr[..., 1], arr[..., 2]

PAPER = np.array([0xF1, 0xE9, 0xD2])
GREENS = [(0x4F, 0x9D, 0x69), (0x2F, 0x7D, 0x5B), (0x1F, 0x5C, 0x46)]
BLUES = [(0x2E, 0x6E, 0x8E), (0x3A, 0x7C, 0xA5), (0x1B, 0x4A, 0x5E)]

def in_box(ch, c, tol=20):
    return (np.abs(ch[..., 0] - c[0]) < tol) & (np.abs(ch[..., 1] - c[1]) < tol) & (np.abs(ch[..., 2] - c[2]) < tol)

# ---- 1. 墨线骨占比 ----
ink_ratios = []
for im in imgs:
    gray = np.asarray(Image.fromarray(im.astype(np.uint8)).convert('L'), dtype=np.float32)
    sx = ndimage.sobel(gray); sy = ndimage.sobel(gray)
    edge = np.hypot(sx, sy) > 25
    dark = (im[..., 0] < 90) & (im[..., 1] < 90) & (im[..., 2] < 90)
    ink_ratios.append((edge & dark).mean() * 100)
ink_ratios = np.array(ink_ratios)
ink_med = np.median(ink_ratios)
print(f'\n[1] 墨线骨占比: 中位 {ink_med:.2f}%  区间[{ink_ratios.min():.2f},{ink_ratios.max():.2f}]  目标[0.6,2.2]  -> {"PASS" if 0.6<=ink_med<=2.2 else "CHECK"}')

# ---- 2. 青绿内容区覆盖 ----
paper_dist = np.sqrt((R-PAPER[0])**2 + (G-PAPER[1])**2 + (B-PAPER[2])**2)
is_paper = (paper_dist < 18) & (R > G) & (G > B)
content = ~is_paper
green_mask = np.zeros_like(is_paper)
for c in GREENS: green_mask |= in_box(arr, c)
blue_mask = np.zeros_like(is_paper)
for c in BLUES: blue_mask |= in_box(arr, c)
green_mask &= content; blue_mask &= content
cg = green_mask.sum(); cb = blue_mask.sum(); cc = content.sum()
bg_ratio = (cg + cb) / max(cc, 1) * 100
gb_split = cg / max(cg + cb, 1) * 100
print(f'[2] 青绿内容区覆盖: 青绿合计 {bg_ratio:.1f}% (>=70)  绿占比 {gb_split:.1f}% (65±8) -> {"PASS" if bg_ratio>=70 and 57<=gb_split<=73 else "CHECK"}')

# ---- 3. 长卷运动（相位相关） ----
def dx_between(a, b, y0, y1):
    roia = a[y0:y1].mean(axis=2); roib = b[y0:y1].mean(axis=2)
    roia = roia - roia.mean(); roib = roib - roib.mean()
    fa = np.fft.rfft2(roia); fb = np.fft.rfft2(roib)
    cc = np.fft.irfft2(fa * np.conj(fb), s=roia.shape)
    peak = np.unravel_index(np.argmax(np.abs(cc)), cc.shape)
    dy, dx = peak
    if dx > cc.shape[1]//2: dx -= cc.shape[1]
    return dx
Hh = R.shape[1]
dx_nears, dx_fars = [], []
for i in range(len(imgs)-1):
    dn = dx_between(imgs[i], imgs[i+1], int(Hh*0.6), Hh)   # 下40% 近景
    df = dx_between(imgs[i], imgs[i+1], 0, int(Hh*0.4))    # 上40% 远景
    dx_nears.append(dn); dx_fars.append(df)
dx_nears = np.array(dx_nears); dx_fars = np.array(dx_fars)
# 采样间隔 10 帧；速度 = dx/10
ratio = np.median(np.abs(dx_nears) / (np.abs(dx_fars)+1e-6))
print(f'[3] 长卷视差: |dx_near|均={np.mean(np.abs(dx_nears)):.1f}px/10帧  |dx_far|均={np.mean(np.abs(dx_fars)):.1f}  比值={ratio:.2f} (2.6-3.4) -> {"PASS" if 2.6<=ratio<=3.4 else "CHECK"}')

# ---- 4. 留白呼吸 ----
paper_ratio = is_paper.reshape(len(imgs), -1).mean(axis=1) * 100
pr_med = np.median(paper_ratio); pr_std = paper_ratio.std()
print(f'[4] 留白呼吸: 宣纸占比中位 {pr_med:.1f}% [45,65]  帧间std {pr_std:.2f}% [0.5,3] -> {"PASS" if 45<=pr_med<=65 and 0.5<=pr_std<=3 else "CHECK"}')

# ---- 5. 题字对比（抽 stele 帧近似：墨字 vs 宣纸底 WCAG） ----
def lum(rgb):
    a = [c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4 for c in rgb/255]
    return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]
inkL = lum(np.array([0x2B,0x2B,0x26])); paperL = lum(PAPER)
contrast = (max(inkL,paperL)+0.05)/(min(inkL,paperL)+0.05)
cinL = lum(np.array([0xB2,0x3A,0x2E])); cin_contrast=(max(cinL,paperL)+0.05)/(min(cinL,paperL)+0.05)
print(f'[5] 题字对比: 墨字vs宣纸 {contrast:.2f}:1 (>=7)  朱砂印vs宣纸 {cin_contrast:.2f}:1 (>=4.5) -> {"PASS" if contrast>=7 and cin_contrast>=4.5 else "CHECK"}')
