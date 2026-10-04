#!/usr/bin/env python3
# metrics.py —— 《养龙虾》像素片风格指标。舞台区帧差 / 静止帧 / 活性色占比。
import glob, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
SR_W, SR_H = 480, 270                      # 缩小后分辨率
HUD_TOP = int(round(96/1080*SR_H))         # 顶部 HUD 排除
BOT_BOT = SR_H - int(round(64/1080*SR_H))  # 底部条排除
R0, R1 = HUD_TOP, BOT_BOT                  # 舞台区行范围

frames = sorted(glob.glob(os.path.join(HERE, 'frames', 'frame_*.png')))
assert len(frames) == 900, f'帧数 {len(frames)} != 900'

small = np.zeros((len(frames), SR_H, SR_W, 3), dtype=np.float32)
for i, f in enumerate(frames):
    im = Image.open(f).convert('RGB').resize((SR_W, SR_H), Image.NEAREST)
    small[i] = np.asarray(im, dtype=np.float32)

stage = small[:, R0:R1, :, :]              # 舞台区（排除 HUD/底条；扫描线被下采样均摊）

# ---- 1) 平均帧差（舞台区）----
d = np.abs(np.diff(stage, axis=0)).mean(axis=(1, 2, 3))
avg_diff = d.mean()

# ---- 2) 连续静止帧：舞台区 >=6 帧(0.2s) 掩码零位移 ----
static = d < 0.5
dead = np.zeros(len(frames), dtype=bool)
i = 0
while i < len(static):
    if static[i]:
        j = i
        while j < len(static) and static[j]:
            j += 1
        if (j - i) >= 6:
            dead[i:j] = True
        i = j
    else:
        i += 1
dead_pct = dead.mean() * 100

# ---- 3) 活性色像素占比（4 个矩形色盒任一命中，舞台区）----
R = stage[:, :, :, 0]; G = stage[:, :, :, 1]; B = stage[:, :, :, 2]
red    = (R>=247)&(R<=255)&(G>=0)&(G<=85)&(B>=69)&(B<=85)
yellow = (R>=247)&(R<=255)&(G>=228)&(G<=244)&(B>=31)&(B<=47)
green  = (R>=0)&(R<=8)&(G>=220)&(G<=236)&(B>=28)&(B<=44)
orange = (R>=247)&(R<=255)&(G>=155)&(G<=171)&(B>=0)&(B<=8)
active = red|yellow|green|orange
act_mean = active.mean()*100

# 三个高潮帧：BOSS WARNING ~19s、YOU ARE FIRED ~25s、GAME OVER ~27.5s
def act_at(t):
    fr = int(round(t*30))
    return active[fr].mean()*100
a_warn = act_at(19.0)
a_fire = act_at(25.0)
a_over = act_at(27.5)

print(f'[1] 平均帧差(舞台区) : {avg_diff:6.2f}   目标 >= 6    -> {"PASS" if avg_diff>=6 else "FAIL"}')
print(f'[2] 连续静止帧占比   : {dead_pct:6.2f}%  目标 <= 10%  -> {"PASS" if dead_pct<=10 else "FAIL"}')
print(f'[3] 活性色占比(均值) : {act_mean:6.2f}%  目标 >= 6%   -> {"PASS" if act_mean>=6 else "FAIL"}')
print(f'    高潮帧 19.0s WARNING : {a_warn:5.2f}%  目标>=15% -> {"PASS" if a_warn>=15 else "FAIL"}')
print(f'    高潮帧 25.0s FIRED   : {a_fire:5.2f}%  目标>=15% -> {"PASS" if a_fire>=15 else "FAIL"}')
print(f'    高潮帧 27.5s GAMEOVER: {a_over:5.2f}%  目标>=15% -> {"PASS" if a_over>=15 else "FAIL"}')

# 最长静止 run
runs=[]; i=0
while i < len(static):
    if static[i]:
        j=i
        while j<len(static) and static[j]: j+=1
        runs.append((i,j-i)); i=j
    else: i+=1
runs.sort(key=lambda x:-x[1])
print('最长静止片段:', [(round(a/30,2), round(l/30,2)) for a,l in runs[:5]])

# 可选：调色板合规抽样（排除扫描线半透明行；舞台区主要色应落在 PICO-8 16 色）
PAL = np.array([[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],
 [194,195,199],[255,241,232],[255,0,77],[255,163,0],[255,236,39],
 [0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170],[0,0,0]],dtype=float)
def pal_ok(img):
    flat = img.reshape(-1,3)
    d2 = ((flat[:,None,:]-PAL[None,:,:])**2).sum(axis=2)
    near = (d2.min(axis=1) < 40**2).mean()
    return near
sample = np.stack([small[f] for f in range(0,900,90)])
print(f'[4] 调色板合规(抽样近16色占比): {pal_ok(sample)*100:.1f}% (参考, 扫描线除外)')
