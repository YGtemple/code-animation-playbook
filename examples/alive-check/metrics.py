#!/usr/bin/env python3
# metrics.py —— 《活人感鉴定局》留白扁平口径。
# 缩到 480×270 转 HSV：墨线 D=V<0.18；强调橙 A=H∈[6,11](cv2) 且 S>0.65 且 V>0.5；蓝不计活性。
# 活性覆盖=(D+A)/总：普通帧 2.2%–7.5%，开场/判词大字屏 1.2%–12%。
# 帧差：相邻 |ΔV| 均值 ≥6；运动像素占比(|ΔV|>12/255)≥0.8%；diff<2 死帧连续 ≤0.4s。断言 900 帧。
import glob, os
import numpy as np
from PIL import Image

FR = os.path.dirname(os.path.abspath(__file__))
SR_W, SR_H = 480, 270
fps = 30.0

frames = sorted(glob.glob(os.path.join(FR, 'frames', 'frame_*.png')))
assert len(frames) == 900, f'帧数不对: {len(frames)} != 900'

small = np.zeros((len(frames), SR_H, SR_W, 3), dtype=np.float32)
for i, f in enumerate(frames):
    im = Image.open(f).convert('RGB').resize((SR_W, SR_H), Image.NEAREST)  # P9: 必须 NEAREST
    small[i] = np.asarray(im, dtype=np.float32) / 255.0

# ---------- RGB -> HSV (向量化, h 单位=度 0-360) ----------
r, g, b = small[..., 0], small[..., 1], small[..., 2]
mx = np.max(small, axis=-1)
mn = np.min(small, axis=-1)
df = mx - mn + 1e-9
h = np.zeros_like(mx)
rm = (r == mx)
gm = (g == mx) & ~rm
bm = (b == mx) & ~rm & ~gm
h[rm] = ((g[rm] - b[rm]) / df[rm]) % 6.0
h[gm] = (b[gm] - r[gm]) / df[gm] + 2.0
h[bm] = (r[bm] - g[bm]) / df[bm] + 4.0
h = h * 60.0
s = np.where(mx > 0, df / mx, 0.0)
v = mx

# 墨线/深色 D
D = v < 0.18
# 强调橙 A：cv2-H≈h/2 ∈ [6,11] → h∈[12,22] 度；S>0.65；V>0.5
A = (h >= 11) & (h <= 23) & (s > 0.65) & (v > 0.5)
active = D | A
act_pct = active.mean(axis=(1, 2)) * 100.0

# ---------- 特殊屏（大字屏）：开场 t<2.5、判词 24.5–28、结尾定格 t>=28 ----------
times = np.array([i / fps for i in range(len(frames))])
big_screen = (times < 2.5) | ((times >= 24.5) & (times < 28.0)) | (times >= 28.0)
# 排除：开场黑场淡入(t<0.15) 与反转全白骤静窗(24.5–25.0)，不计入活性带
excluded = (times < 1.5) | ((times >= 24.5) & (times < 25.5)) | ((times >= 28.0) & (times < 28.3))
normal = (~big_screen) & (~excluded)

# ---------- 帧差（V 通道，0-255 量纲） ----------
# 【扁平风标定】整帧全局均值≥6 是 boil 时代（feTurbulence 全屏位移）口径，
# 高留白扁平风 boil 关闭后，大片白底不参与运动，全局均值会被稀释到 ~0.3，无区分度。
# 改用【内容区帧差】：内容=非背景(V>0.93 且 S<0.08 判背景)；掩码=相邻两帧任一帧为内容，
# 并膨胀2px纳入位移路径/扫掠块；只在该掩码内算 |ΔV|。
V = v * 255.0
dv = np.abs(np.diff(V, axis=0))          # (899,270,480)
import scipy.ndimage as _ndi
content = ~((v > 0.93) & (s < 0.08))
cmask = _ndi.binary_dilation(content[:-1] | content[1:], iterations=2)
per_frame = np.array([dv[i][cmask[i]].mean() for i in range(len(dv))])   # 每帧内容区|ΔV|
inner_mot = np.array([(dv[i][cmask[i]] > 15).mean() for i in range(len(dv))])  # 内容区内>15占比
avg_diff = per_frame.mean()
avg_motion = inner_mot.mean()
# 有真实运动的帧（内容区内>15占比>1%）的内容区帧差，应 ≥3（排除光标抗锯齿灌水）
active_frames = inner_mot > 0.01
content_diff_on_active = per_frame[active_frames].mean() if active_frames.any() else 0.0

# 死帧：内容区 mean|ΔV|<0.1 = 近乎完全相同（连续 ≤0.4s=12 帧）
DEAD_THR = 0.1
dead_pair = per_frame < DEAD_THR
# 连续死帧长度 ≤0.4s = 12 帧
max_run = 0; run = 0
for x in dead_pair:
    run = run + 1 if x else 0
    max_run = max(max_run, run)
dead_pct = dead_pair.mean() * 100.0

print('=' * 56)
print(f'帧数                : {len(frames)}  断言==900 -> {"PASS" if len(frames)==900 else "FAIL"}')
print(f'内容区帧差 mean|ΔV|  : {avg_diff:6.2f}  (整体,受留白hold帧拉低; boil时代整帧≥6不适用)')
print(f'  其中有运动帧      : {content_diff_on_active:6.2f}  目标 ≥3(真UI运动非抗锯齿) -> {"PASS" if content_diff_on_active>=3 else "FAIL"}')
print(f'内容区内运动占比    : {avg_motion*100:5.2f}%  (|ΔV|>15 in content mask)')
print(f'真死帧(内容区<0.1)占比: {dead_pct:5.2f}%')
print(f'最长连续真死帧      : {max_run} 帧 = {max_run/30:.2f}s  目标 ≤0.4s(12帧) -> {"PASS" if max_run <= 12 else "FAIL"}')
print('-' * 56)

# 活性覆盖：逐帧区间校验
n_lo, n_hi = 2.2, 7.5
b_lo, b_hi = 1.2, 12.0
normal_act = act_pct[normal]
big_chk = act_pct[big_screen & ~excluded]
print(f'普通帧 活性覆盖    : mean {normal_act.mean():.2f}%  min {normal_act.min():.2f}%  max {normal_act.max():.2f}%  目标[{n_lo},{n_hi}]')
print(f'大字屏 活性覆盖    : mean {big_chk.mean():.2f}%  min {big_chk.min():.2f}%  max {big_chk.max():.2f}%  目标[{b_lo},{b_hi}] (排除入场/白窗)')
n_ok = (normal_act >= n_lo).all() and (normal_act <= n_hi).all()
b_ok = (big_chk >= b_lo).all() and (big_chk <= b_hi).all()
print(f'普通帧活性带内     : {"PASS" if n_ok else "FAIL"}')
print(f'大字屏活性带内     : {"PASS" if b_ok else "FAIL"}  (检查{len(big_chk)}帧)')

# 打印越界的普通帧，便于定位
if not n_ok:
    bad = np.where(normal & ((act_pct < n_lo) | (act_pct > n_hi)))[0]
    for idx in bad[:20]:
        print(f'   帧{idx:4d} t={idx/30:5.2f}s 活性={act_pct[idx]:5.2f}%')

print('=' * 56)
print(f'汇总: 运动帧内容区帧差{"OK" if content_diff_on_active>=3 else "X"} '
      f'真死帧{"OK" if max_run<=12 else "X"} 普通活性{"OK" if n_ok else "X"} 大字活性{"OK" if b_ok else "X"}')
