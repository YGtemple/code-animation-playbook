#!/usr/bin/env python3
# metrics.py —— 第18支涂鸦笔记本五指标。先 mask 背景（纸/横线/红竖线/便利贴底），只在内容区算。
import glob, os
import numpy as np
from PIL import Image
from scipy import ndimage

SR_W, SR_H = 480, 270
FDIR = os.path.join(os.path.dirname(__file__), 'frames')
frames = sorted(glob.glob(os.path.join(FDIR, 'frame_*.png')))
assert len(frames) == 900, len(frames)

def load(i):
    return np.asarray(Image.open(frames[i]).convert('RGB').resize((SR_W, SR_H)), dtype=np.float32)

# 背景参考色
PAPER = np.array([0xf7, 0xf1, 0xe3], dtype=np.float32)
LINE  = np.array([0xc9, 0xd6, 0xe8], dtype=np.float32)
MARG  = np.array([0xe0, 0x8a, 0x8a], dtype=np.float32)
STICK = np.array([0xf5, 0xe6, 0xa3], dtype=np.float32)

def bg_mask(a):
    d_paper = np.abs(a - PAPER).sum(axis=2)
    d_line  = np.abs(a - LINE).sum(axis=2)
    d_marg  = np.abs(a - MARG).sum(axis=2)
    d_stick = np.abs(a - STICK).sum(axis=2)
    bg = (d_paper < 36) | (d_line < 40) | (d_marg < 60) | (d_stick < 45)
    return bg

# 预载
seq = np.zeros((len(frames), SR_H, SR_W, 3), dtype=np.float32)
for i, f in enumerate(frames):
    seq[i] = load(i)

content = np.zeros((len(frames), SR_H, SR_W), dtype=bool)
ink_ratio = np.zeros(len(frames))
for i in range(len(frames)):
    bg = bg_mask(seq[i])
    cm = ~bg
    content[i] = cm
    ink_ratio[i] = cm.mean() * 100

# 1 ink_ratio
ir_mean = ink_ratio.mean()
ir_ok = 0.6 <= ir_mean <= 3.5

# 2 ink_texture：内容区拉普拉斯绝对值均值（手写活性）
from scipy.ndimage import laplace
tex_vals = []
for i in range(0, len(frames), 10):
    gray = seq[i].mean(axis=2)
    lp = np.abs(laplace(gray))
    m = content[i]
    if m.sum() > 20:
        tex_vals.append(lp[m].mean())
ink_texture = np.mean(tex_vals)

# 3 content_diff：只在内容区差分（纸色区置0）
Y = seq.mean(axis=3)
cdiff = np.zeros(len(frames))
for i in range(1, len(frames)):
    d = np.abs(Y[i] - Y[i-1])
    region = content[i] | content[i-1]
    cdiff[i] = d[region].mean() if region.sum() > 20 else 0.0
cdiff_peak = cdiff.max()

# 4 sticker_motion：黄色连通域质心轨迹（便利贴一次性到位）
def sticker_track():
    cents = []
    for i in range(0, len(frames), 3):
        a = seq[i]
        d = np.abs(a - STICK).sum(axis=2)
        m = d < 40
        lab, n = ndimage.label(m)
        best = None; bestsize = 0
        for lb in range(1, n+1):
            sz = (lab == lb).sum()
            if sz > bestsize:
                bestsize = sz; best = lb
        if best is not None and bestsize > 80:
            ys, xs = np.where(lab == best)
            cents.append((i, xs.mean(), ys.mean()))
    if len(cents) < 2: return None
    cents = np.array([[c[1], c[2]] for c in cents])
    disp = np.sqrt(((cents[1:] - cents[:-1]) ** 2).sum(axis=1))
    return disp.max(), len(cents)
sticker = sticker_track()

# 5 dead：连续60帧(2s) content_diff 无峰值且 ink_ratio 无增长
PEAK_TH = 1.5
dead_runs = []
run = 0
for i in range(len(frames)):
    growth = ink_ratio[i] - (ink_ratio[i-6] if i >= 6 else 0)
    quiet = (cdiff[i] < PEAK_TH) and (growth < 0.05)
    if quiet:
        run += 1
    else:
        if run >= 60: dead_runs.append((i-run, run))
        run = 0
if run >= 60: dead_runs.append((len(frames)-run, run))
dead_max = max([r[1] for r in dead_runs], default=0)

print(f'1 ink_ratio 均值     : {ir_mean:5.2f}%   目标 0.6–3.5%  -> {"PASS" if ir_ok else "CHECK"}')
print(f'2 ink_texture 拉普拉斯: {ink_texture:5.2f}        (越高越有手写活性)')
print(f'3 content_diff 峰值   : {cdiff_peak:5.2f}   写字beat应有尖峰, 均值 {cdiff.mean():.2f}')
if sticker:
    print(f'4 sticker_motion 最大位移: {sticker[0]:.1f}px  采样点 {sticker[1]} (一次性到位后静止)')
else:
    print('4 sticker_motion     : 未检到便利贴黄色块')
print(f'5 dead 最长连续静默   : {dead_max} 帧 ({dead_max/30:.2f}s)  阈值<60帧(2.0s) -> {"PASS" if dead_max < 60 else "CHECK"}')
print('ink_ratio 随时间(首/中/尾):', round(ink_ratio[10],2), round(ink_ratio[450],2), round(ink_ratio[890],2))
