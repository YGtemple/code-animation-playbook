#!/usr/bin/env python3
# metrics.py —— 皮影版指标：只对“主角+签筒+关键签”内容区做帧间 diff；镂空负形与配色纪律硬检。
import os, sys
import numpy as np
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
FD = os.path.join(D, 'frames')
FPS = 30
TOTAL = 900

# 内容 bbox：前景主角+签筒+关键签（忽略幕布/分层阴影/边框）
BOX = (420, 350, 1500, 950)   # x0,y0,x1,y1
# 镂空负形采样点（幕布色应透出；采样 5x5）
CUTOUTS = [
    (1275, 302),  # 菩萨背光莲瓣镂空
    (1275, 498),  # 菩萨工牌照片位
    (780, 892),   # 小人髋关节（跪姿 +12）
]

CREAM = np.array([0xF2, 0xE3, 0xC6])

def load(i):
    p = os.path.join(FD, f'frame_{i:04d}.png')
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.int16)

def main():
    frames = sorted(f for f in os.listdir(FD) if f.endswith('.png'))
    assert len(frames) == TOTAL, f'frame count {len(frames)} != {TOTAL}'

    # ---- 1) 内容区 diff ----
    prev = None; diffs = []
    for i in range(TOTAL):
        im = load(i)[BOX[1]:BOX[3], BOX[0]:BOX[2]]
        small = np.asarray(Image.fromarray(im.astype('uint8')).resize((96, 54), Image.NEAREST), dtype=np.int16)
        if prev is not None:
            d = np.mean(np.any(np.abs(small - prev) > 10, axis=2))   # 变化格占比
            diffs.append(d)
        prev = small
    diffs = np.array(diffs)
    alive = diffs >= 0.02
    dead = diffs < 0.005
    # 最长真死连续段（允许结尾≈15帧有意死帧）
    longest = 0; run = 0; runs = []
    for d in dead:
        run = run + 1 if d else 0
        if run > longest: longest = run
        runs.append(run)
    print(f'[diff] alive frames {alive.mean() * 100:.1f}%  median diff {np.median(diffs) * 100:.2f}%  longest dead run {longest}f ({longest / FPS:.2f}s)')
    bad_runs = [r for r in runs if r > 12]
    assert longest <= 16, f'true-dead run too long: {longest} frames'

    # ---- 2) 镂空负形均色 ----
    for (x, y) in CUTOUTS:
        patch = load(int(400))[max(0, y - 2):y + 3, max(0, x - 2):x + 3].reshape(-1, 3)
        m = patch.mean(axis=0)
        dev = np.abs(m - CREAM).max()
        assert dev < 25, f'cutout at {(x, y)} mean {m} deviates {dev} from cream'
    print('[cutout] all cutouts ≈ #F2E3C6 ±25 OK')

    # ---- 3) 配色纪律硬检（抽 30 帧） ----
    reds, greens, golds = [], [], []
    for i in np.linspace(0, TOTAL - 1, 30, dtype=int):
        im = load(i).astype(np.int16)
        R, G, B = im[..., 0], im[..., 1], im[..., 2]
        red = ((R > 175) & (G < 110) & (B < 100)).mean()
        green = ((G > 100) & (G < 160) & (R < 115) & (B < 115)).mean()
        gold = ((R > 150) & (G > 100) & (G < 175) & (B < 110)).mean()
        reds.append(red); greens.append(green); golds.append(gold)
    r, g, gl = max(reds), max(greens), max(golds)
    print(f'[palette] red<={r * 100:.1f}%  green<={g * 100:.1f}%  gold<={gl * 100:.1f}%  sum<={(r + g + gl) * 100:.1f}%')
    assert r <= 0.15, f'red {r:.3f} > 15%'
    assert g <= 0.10, f'green {g:.3f} > 10%'
    assert gl <= 0.08, f'gold {gl:.3f} > 8%'
    assert r + g + gl <= 0.25, f'chromatic sum {r + g + gl:.3f} > 25%'

    print('METRICS PASS')

if __name__ == '__main__':
    main()
