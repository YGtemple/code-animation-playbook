#!/usr/bin/env python3
# filmify.py —— 黑白默片皮肤：Rec.601 灰度 + S 曲线 + 逐帧颗粒 + 划痕/脏点 + 暗角 + gate weave + flicker + 跳格。
# 直接把 filmify 后的帧以 RGB24 管道喂给 ffmpeg（不落颗粒帧到磁盘），同时在流上累计黑白 metrics。
import os, sys, subprocess
import numpy as np
from PIL import Image
from scipy.ndimage import shift as ndshift

D = os.path.dirname(os.path.abspath(__file__))
H, W = 1080, 1920
TOTAL = 900
FPS = 30

# ---- 可调胶片参数 ----
GRAIN_SIG = 6.0          # 注入颗粒 σ（像素，0-255）；平坦区实测应≈5.5–8.5
PRINT_K = 1.0            # 打印密度重映射斜率：保留高光到 ~232（P95 目标 218–232）
PRINT_LIFT = 0.0         # 整体附加亮度偏移
VIGN_DARK = 0.60         # 四角压到中心的比例（mask_min≈0.40）
FLICKER_SIG = 0.045      # 整帧亮度游走 σ
WEAVE_X = 2.2            # gate weave Δx ±
WEAVE_Y = 1.0           # gate weave Δy ±
JUMP_FRAMES = {150, 330, 540, 760}   # 放映跳格：此处复用前一帧内容（颗粒仍逐帧全新）
rng = np.random.default_rng(20261006)

def read_raw(i):
    p = os.path.join(D, 'frames', f'frame_{i:04d}.png')
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.float64)

def to_gray(rgb):
    return 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]

def old_film_curve(y):
    y = y / 255.0
    y = 0.5 + (y - 0.5) * 1.18
    y = y + 0.018 * np.sign(y - 0.5) * np.abs(y - 0.5) ** 3
    y = np.clip(y, 12 / 255, 232 / 255)
    y = y ** 1.26                          # gamma：压中间调、保高光
    y = (14 + 228 * y) * PRINT_K + PRINT_LIFT
    return np.clip(y, 12, 238)

# 径向暗角 mask（中心1，四角~0.50；聚光式，压暗四周同时保留中心高光）
yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
cx, cy = W / 2, H / 2
r = np.sqrt(((xx - cx) / (W / 2)) ** 2 + ((yy - cy) / (H / 2)) ** 2)
_fall = np.clip(r / 1.25, 0, 1) ** 1.8
VIGN = 0.50 + 0.50 * (1 - _fall)

def filmify(i, prev=None):
    """返回 (gray 0-255 float, meta)。prev 为上一帧 gray（用于运动计量）。"""
    src = i
    if i in JUMP_FRAMES:
        src = i - 1
    rgb = read_raw(src)
    g = to_gray(rgb)
    g = old_film_curve(g)
    # 整帧 flicker
    fl = 1.0 + rng.normal(0, FLICKER_SIG)
    g = g * fl
    # 暗角
    g = g * VIGN
    # gate weave 全局平移（黑位填充）
    dx = rng.uniform(-WEAVE_X, WEAVE_X)
    dy = rng.uniform(-WEAVE_Y, WEAVE_Y)
    g = ndshift(g, (dy, dx), order=1, mode='constant', cval=12.0)
    # 逐帧全新颗粒
    g = g + rng.standard_normal((H, W)) * GRAIN_SIG
    # 竖划痕
    if rng.random() < 0.8:
        nscr = rng.integers(2, 5)
        for _ in range(nscr):
            sx = int(rng.uniform(0, W))
            sw = 1 if rng.random() < 0.7 else 2
            op = rng.uniform(15, 30) / 100.0
            shade = rng.uniform(60, 180)
            g[:, sx:sx + sw] = g[:, sx:sx + sw] * (1 - op) + shade * op
    # 脏点
    nd = rng.integers(3, 9)
    for _ in range(nd):
        dy2 = int(rng.uniform(0, H)); dx2 = int(rng.uniform(0, W))
        s = rng.integers(1, 4)
        g[dy2:dy2 + s, dx2:dx2 + s] = rng.uniform(0, 255)
    g = np.clip(g, 0, 255)
    meta = {'dx': dx, 'dy': dy, 'fl': fl}
    return g, meta

def calib():
    samples = [20, 100, 160, 360, 560, 675, 810, 885]
    means, stds, p5s, p95s, grains = [], [], [], [], []
    for i in samples:
        g, _ = filmify(i)
        means.append(g.mean()); stds.append(g.std())
        p5s.append(np.percentile(g, 5)); p95s.append(np.percentile(g, 95))
        corner = g[100:228, 100:228]
        grains.append(corner.std())
        Image.fromarray(g.astype(np.uint8)).save(os.path.join(D, 'qc', f'calib_{i:04d}.png'))
    print('--- CALIB ---')
    for i, m, s, p5, p9, gr in zip(samples, means, stds, p5s, p95s, grains):
        print(f'f{i:4d} mean={m:6.1f} std={s:5.1f} P5={p5:6.1f} P95={p9:6.1f} flatσ={gr:4.1f}')
    print(f'OVER mean={np.mean(means):.1f} std={np.mean(stds):.1f} P5={np.mean(p5s):.1f} P95={np.mean(p95s):.1f} flatσ={np.mean(grains):.1f}')

# 插卡帧区间（用于平坦区颗粒采样）
CARD_RANGES = [(0,60),(84,120),(660,690),(780,840),(868,900)]
def is_card(i):
    for a,b in CARD_RANGES:
        if a<=i<b: return True
    return False

STILLS = [20,70,100,160,250,360,450,560,650,675,720,810,860,885]

def encode_pipeline():
    cmd = ['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24',
           '-s',f'{W}x{H}','-r',str(FPS),'-i','-',
           '-an','-c:v','libx264','-preset','medium','-crf','18','-profile:v','high',
           '-pix_fmt','yuv420p', os.path.join(D,'content_video.mp4')]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    pool = []   #  pooled 像素（子采样）算全片直方图
    flat_grains, net_motions, flickers = [], [], []
    dead = 0
    prev = None; prev_meta = None
    MU_G = GRAIN_SIG * 2 / np.sqrt(np.pi)   # 纯颗粒相邻帧平均|差|
    for i in range(TOTAL):
        g, meta = filmify(i)
        if prev is not None:
            # 配准：撤销 gate weave 后再算帧差
            dy = -(meta['dy'] - prev_meta['dy'])
            dx = -(meta['dx'] - prev_meta['dx'])
            al = ndshift(prev, (dy, dx), order=1, mode='constant', cval=12.0)
            dmat = np.abs(g - al)
            net = dmat.mean() - MU_G
            net_motions.append(net)
        prev = g; prev_meta = meta
        pool.append(g[::8, ::8].ravel())
        flickers.append(meta['fl'])
        # 平坦区颗粒（在插卡黑底上采样才真平）
        if is_card(i):
            corner = g[100:228, 100:228]
            fg = corner.std()
            flat_grains.append(fg)
            if fg < 1.0: dead += 1
        rgb = np.repeat(g[:,:,None],3,axis=2).astype(np.uint8)
        p.stdin.write(rgb.tobytes())
        if i in STILLS:
            Image.fromarray(rgb).save(os.path.join(D,'qc',f'still_{i:04d}.png'))
        if i % 150 == 0: print('encoded frame', i)
    p.stdin.close(); p.wait()
    pool = np.concatenate(pool)
    net = np.array(net_motions); fl = np.array(flickers)
    print('=== BLACK & WHITE METRICS (pooled film-wide) ===')
    print(f"mean Y        : {pool.mean():6.1f}   target 100-115")
    print(f"std Y         : {pool.std():6.1f}   target 58-70")
    print(f"P5            : {np.percentile(pool,5):6.1f}   target 12-22")
    print(f"P95           : {np.percentile(pool,95):6.1f}   target 218-232")
    print(f"高光溢出>238  : {(pool>238).mean()*100:5.2f}%  target <1%")
    print(f"平坦区颗粒σ   : {np.mean(flat_grains):6.2f}  target 5.5-8.5")
    print(f"净运动 中位    : {np.median(net):6.2f}   静场≈0-3")
    print(f"净运动 p90     : {np.percentile(net,90):6.2f}   动作戏 8-25")
    print(f"净运动 p99     : {np.percentile(net,99):6.2f}   (含硬切尖峰)")
    print(f"flicker σ(Y)  : {pool.mean()*fl.std():6.2f}  target 3-6")
    print(f"死帧数        : {dead}   target 0")
    print('=== WROTE content_video.mp4 ===')

if __name__ == '__main__':
    if '--calib' in sys.argv:
        calib()
    elif '--encode' in sys.argv:
        encode_pipeline()
    else:
        print('use --calib to tune; --encode to build content_video.mp4 + metrics')
