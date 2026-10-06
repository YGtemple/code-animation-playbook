#!/usr/bin/env python3
# post_vhs.py —— 对干净 SVG 帧批量施加 VHS 失真。读取 frames/ -> 写出 frames_post/。
# 全帧确定性（按帧号 seed），不依赖任何外部素材。
import os, sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

D = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(D, 'frames')
DST = os.path.join(D, 'frames_post')
os.makedirs(DST, exist_ok=True)

W, H = 1920, 1080
FPS = 30

# ---- VHS 后处理参数（照规格） ----
BLEED_SIGMA = 3.5       # chroma bleed：U/V 水平高斯 sigma
BLEED_MIX = 0.5         # 40-60%
RGB_SPLIT = 1.75        # R/B 水平错位 ±px
Y_SOFT = 1.2            # Y 轻糊 sigma
SAT = 0.62              # 饱和度降到 60-65%
WARM_R, WARM_B = 9.0, -3.0   # 暖漂：R-B 净 +12
SCAN_DARK = 0.32        # 隔行压暗 25-40%
GRAIN_SIG = 10.0        # 加性高斯磁噪 σ8-12
TRACK_H = 72            # 底部 tracking 带 px（正常）
TRACK_H_BAD = 120       # 故障加宽

# 径向暗角（一次性预算）
yy, xx = np.mgrid[0:H, 0:W]
cx, cy = W / 2, H / 2
r = np.sqrt(((xx - cx) / (W / 2)) ** 2 + ((yy - cy) / (H / 2)) ** 2)
VIG = 1.0 - 0.10 * np.clip(r - 0.55, 0, 1) / 0.45   # 四角 ~-10%

def frame_state(f):
    """返回本帧的 VHS 强度档位。"""
    if 330 <= f < 375:   return 'glitch1'   # 小 glitch tear + dropout
    if 570 <= f < 615:   return 'trackbad'  # tracking 加宽、雪花加重
    if 840 <= f < 855:   return 'snowout'   # 全雪花卷带
    if f >= 855:         return 'freeze'    # 定格（轻噪）
    return 'normal'

def process(fidx):
    rng = np.random.default_rng(fidx * 2654435761 % (2**32))
    im = Image.open(os.path.join(SRC, f'frame_{fidx:04d}.png')).convert('RGB')
    rgb = np.asarray(im, dtype=np.float64)
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    state = frame_state(fidx)

    # 1) YCbCr（BT.601，VHS 时代）
    Y = 0.299 * R + 0.587 * G + 0.114 * B
    Cb = (B - Y) * 0.564 + 128.0
    Cr = (R - Y) * 0.713 + 128.0

    # 2) chroma bleed：只糊 U/V 水平，Y 不糊
    Cb_b = gaussian_filter(Cb, sigma=(0, BLEED_SIGMA))
    Cr_b = gaussian_filter(Cr, sigma=(0, BLEED_SIGMA))
    Cb = Cb + (Cb_b - Cb) * BLEED_MIX
    Cr = Cr + (Cr_b - Cr) * BLEED_MIX

    # 3) Y 轻糊
    Y = gaussian_filter(Y, sigma=(0, Y_SOFT))

    # 回 RGB
    R2 = Y + 1.402 * (Cr - 128.0)
    B2 = Y + 1.772 * (Cb - 128.0)
    G2 = (Y - 0.299 * R2 - 0.114 * B2) / 0.587
    out = np.stack([R2, G2, B2], axis=-1)

    # 4) RGB split：R 右移、B 左移（高对比边缘可见）
    sp = int(round(RGB_SPLIT))
    out[..., 0] = np.roll(out[..., 0], sp, axis=1)
    out[..., 2] = np.roll(out[..., 2], -sp, axis=1)

    # 5) 降饱和（先做），暖漂（后做，避免被饱和度缩放吃掉）
    gray = (0.299 * out[..., 0] + 0.587 * out[..., 1] + 0.114 * out[..., 2])[..., None]
    out = gray + (out - gray) * SAT
    out[..., 0] += WARM_R
    out[..., 2] += WARM_B

    # 6) 隔行扫描线压暗
    out[1::2, :, :] *= (1.0 - SCAN_DARK)

    # 7) 全帧加性高斯磁噪（逐帧随机）
    gsig = GRAIN_SIG
    if state == 'trackbad': gsig = 16.0
    if state == 'snowout':  gsig = 30.0
    if state == 'freeze':   gsig = 9.0
    noise = rng.normal(0, gsig, size=(H, W, 1))
    out = out + noise

    # 8) 底部 tracking 带：行级水平错位 + 强噪，缓慢垂直滚动
    track_h = TRACK_H_BAD if state in ('trackbad', 'snowout') else TRACK_H
    track_y0 = H - track_h
    roll = (fidx * 0.7) % track_h
    for y in range(track_y0, H):
        # 行级错位：随帧与行号缓变，制造波浪
        shift = int(round(6 * np.sin((y + fidx * 0.9) * 0.15) + 4 * (rng.random() - 0.5)))
        out[y, :, :] = np.roll(out[y, :, :], shift, axis=0)
        # 带内强噪
        out[y, :, :] += rng.normal(0, gsig * 1.6, size=(W, 3))

    # 9) tape dropout：随机亮水平短划
    if state != 'freeze' or rng.random() < 0.5:
        ndrop = 1 if rng.random() < 0.6 else 0
        for _ in range(ndrop):
            dy = int(rng.integers(60, H - track_h - 30))
            dl = int(rng.integers(40, 200))
            dx = int(rng.integers(0, W - dl))
            out[dy:dy+2, dx:dx+dl, :] += 90.0

    # 10) glitch tear：单帧水平撕裂（整段行偏 4-10px）
    if state in ('glitch1', 'snowout'):
        ntear = 2 if state == 'snowout' else 1
        for _ in range(ntear):
            ty = int(rng.integers(100, H - 200))
            th = int(rng.integers(6, 26))
            ts = int(rng.integers(-10, 11))
            out[ty:ty+th, :, :] = np.roll(out[ty:ty+th, :, :], ts, axis=1)

    # 11) 暗角
    out *= VIG[..., None]

    out = np.clip(out, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(DST, f'frame_{fidx:04d}.png'))

def main():
    frames = sorted(f for f in os.listdir(SRC) if f.startswith('frame_') and f.endswith('.png'))
    n = len(frames)
    print(f'processing {n} frames -> frames_post')
    for i, fn in enumerate(frames):
        process(i)
        if i % 100 == 0:
            print(f'  {i}/{n}', flush=True)
    print('DONE post_vhs')

if __name__ == '__main__':
    main()
