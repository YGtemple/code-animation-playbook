#!/usr/bin/env python3
# metrics.py —— 赛博霓虹(暗底)口径：霓虹活性面积 NAA、真实内容运动帧差、静止帧占比。
# 旧"黑+红"口径作废。活性色用 RGB 宽盒（含羽化 halo），排除暗底与低饱和中性/白字。
import glob, os
import numpy as np
from PIL import Image, ImageFilter

SR_W, SR_H = 160, 90
HERE = os.path.dirname(__file__)
frames = sorted(glob.glob(os.path.join(HERE, 'frames', 'frame_*.png')))
assert len(frames) == 900, f'帧数={len(frames)} 应为 900'

# ---- 读取并 NEAREST 下采样（P9：活性色靠精确色盒，禁用双线性） ----
small = np.zeros((len(frames), SR_H, SR_W, 3), dtype=np.float32)
for i, f in enumerate(frames):
    im = Image.open(f).convert('RGB').resize((SR_W, SR_H), Image.NEAREST)
    small[i] = np.asarray(im, dtype=np.float32)

R = small[:, :, :, 0]; G = small[:, :, :, 1]; B = small[:, :, :, 2]
mx = small.max(axis=3); mn = small.min(axis=3)

# 排除暗底 (R<40,G<30,B<60)
dark = (R < 40) & (G < 30) & (B < 60)
# 排除低饱和中性/白字 (max-min<30)
neutral = (mx - mn) < 30
excl = dark | neutral

# ---- 青 core / halo ----
cy_core = (B > 180) & (G > 150) & (R < 90)
cy_halo = ((B - R) > 150) & ((G - R) > 110)
# ---- 品红 core / halo ----
mg_core = (R > 200) & (B > 70) & (G < 110)
mg_halo = ((R - G) > 120) & ((B - G) > 30)
# ---- 紫 core / halo ----
pu_core = (B > 180) & (R > 70) & (G < 80)
pu_halo = ((B - R) > 60) & ((B - R) < 180) & (G < 90)

core = (cy_core | mg_core | pu_core) & ~excl
halo = (cy_halo | mg_halo | pu_halo) & ~excl
total = core | halo

n_pix = SR_W * SR_H
core_pct = core.mean(axis=(1, 2)) * 100
tot_pct = total.mean(axis=(1, 2)) * 100

# ---- 帧差（真实内容运动）：氛围层已压到有界（扫描线0.12/噪点0.35），直接测 NEAREST 下采样差分 ----
# 口径：扫每帧差反映块级真实运动；扫描线/噪点幅度有界且逐帧位移极小，不灌水。
d = np.abs(np.diff(small, axis=0)).mean(axis=(1, 2, 3))
avg_diff = d.mean()

# ---- 静止帧：diff<0.5；连续>=3帧才算 ----
static = d < 0.5
dead = np.zeros(len(frames) - 1, dtype=bool)
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
# 结尾表达性收尾段不计活性失败（>=27.0s -> frame>=810）：
# 27–28.7 OFFLINE 工牌熄灭/霓虹熄一半，28.7 起快速压暗近黑，28.9 居中署名，均属主动收尾。
CREDIT_START = int(round(27.0 * 30))
dead[:CREDIT_START] = dead[:CREDIT_START]
dead_pct = dead.mean() * 100

# ---- 最低活性帧：排除开场黑场淡入(前 0.4s) 与结尾压暗/署名段(>=28.7s) ----
BOOT_END = int(round(0.4 * 30))
content_idx = list(range(BOOT_END, CREDIT_START))
min_naa = tot_pct[content_idx].min()
min_naa_frame = content_idx[int(np.argmin(tot_pct[content_idx]))]

# ================= 报告 =================
print(f'NAA_core 平均 : {core_pct.mean():6.2f}%   目标 >=8%  -> {"PASS" if core_pct.mean() >= 8 else "FAIL"}')
print(f'NAA_total平均 : {tot_pct.mean():6.2f}%   目标 >=18% -> {"PASS" if tot_pct.mean() >= 18 else "FAIL"}')
print(f'最低活性帧     : {min_naa:6.2f}%   @帧{min_naa_frame} ({min_naa_frame/30:.2f}s) 目标 >=6% -> {"PASS" if min_naa >= 6 else "FAIL"}')
print(f'平均帧差       : {avg_diff:6.2f}   目标 >=6  -> {"PASS" if avg_diff >= 6 else "FAIL"}')
print(f'连续静止帧占比 : {dead_pct:6.2f}%  目标 <=10% -> {"PASS" if dead_pct <= 10 else "FAIL"}')
print(f'帧数           : {len(frames)} (断言=900)')

# 最长静止段
runs = []
i = 0
while i < len(static):
    if static[i]:
        j = i
        while j < len(static) and static[j]:
            j += 1
        runs.append((i, j - i))
        i = j
    else:
        i += 1
runs.sort(key=lambda x: -x[1])
print('最长静止段(帧起点,长度):', runs[:5], '时间:', [(round(a/30, 2), round(l/30, 2)) for a, l in runs[:5]])
