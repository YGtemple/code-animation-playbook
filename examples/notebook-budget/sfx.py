#!/usr/bin/env python3
# sfx.py —— 第18支《这个月，我要纯过日子》：ukulele+口哨 BPM112 + 手绘涂鸦音效。全代码合成。
import json, os
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(round(DUR * SR))
rng = np.random.default_rng(20261006)

def white(n, r=rng): return r.standard_normal(n).astype(np.float64)
def t_arr(sec): return np.linspace(0, sec, int(round(sec * SR)), endpoint=False)

def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    b = [1 - a]; ac = [1, -a]
    return signal.lfilter(b, ac, x)

def bandpass(x, lo, hi):
    lo = max(20.0, lo); hi = min(SR / 2 - 100, hi)
    sos = signal.butter(4, [lo / (SR / 2), hi / (SR / 2)], btype='band', output='sos')
    return signal.sosfilt(sos, x)

def lowpass(x, c):
    sos = signal.butter(4, min(c, SR / 2 - 100) / (SR / 2), output='sos')
    return signal.sosfilt(sos, x)

def smooth_env(x): return np.clip(np.sin(np.clip(x, 0, 1) * np.pi), 0, 1)
def hz(n): return 440 * 2 ** ((n - 69) / 12)

# ---------------- 涂鸦音效 ----------------
def s_write(p=1.0):       # 写字沙沙：带通白噪 2-5kHz 断续短
    d = 0.12; t = t_arr(d)
    y = bandpass(white(len(t)), 2200, 5200) * np.exp(-t * 30)
    return y * 0.35 * p

def s_nib(p=1.0):         # 笔尖嗒
    d = 0.03; t = t_arr(d)
    y = np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 120)
    return y * 0.5 * p

def s_check(p=1.0):       # 打钩唰：快速噪声上扫 + 脆响
    d = 0.18; t = t_arr(d)
    y = bandpass(white(len(t)), 1500, 6000) * (t / d) ** 1.5
    y += np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 40) * 0.3
    return y * 0.5 * p

def s_cross(p=1.0):       # 划掉：铅笔唰
    d = 0.22; t = t_arr(d)
    y = bandpass(white(len(t)), 800, 3600) * np.sin(np.clip(t / d, 0, 1) * np.pi)
    return y * 0.5 * p

def s_stickypop(p=1.0):   # 便利贴啪
    d = 0.08; t = t_arr(d)
    y = np.sin(2 * np.pi * (500 - 250 * t / d) * t) * np.exp(-t * 55)
    y += bandpass(white(len(t)), 1200, 4000) * np.exp(-t * 60) * 0.5
    return y * 0.7 * p

def s_stickylift(p=1.0):  # 撕便利贴/掀开
    d = 0.45; t = t_arr(d)
    y = bandpass(white(len(t)), 1000, 5000) * smooth_env(np.clip(t / d, 0, 1))
    return y * 0.45 * p

def s_pageopen(p=1.0):    # 纸页翻开
    d = 0.5; t = t_arr(d)
    y = bandpass(white(len(t)), 600, 3200) * (np.sin(np.clip(t / d, 0, 1) * np.pi) ** 1.5)
    return y * 0.5 * p

def s_pageflip(p=1.0):    # 翻页哗啦
    d = 0.6; t = t_arr(d)
    seg = 0.05
    out = np.zeros(int(d * SR))
    for i in range(int(d / seg)):
        i0 = int(i * seg * SR)
        ln = int(seg * SR * 1.3)
        if i0 + ln > len(out): break
        burst = bandpass(white(ln), 1800, 6500) * np.exp(-np.linspace(0, 1, ln) * 30)
        out[i0:i0 + ln] += burst
    return out * 0.6 * p

def s_stamp(p=1.0):       # 盖章咚
    d = 0.25; t = t_arr(d)
    y = np.sin(2 * np.pi * (140 - 70 * t / d) * t) * np.exp(-t * 14)
    y += bandpass(white(len(t)), 400, 1400) * np.exp(-t * 50) * 0.6
    return y * 0.8 * p

def s_eraser(p=1.0):      # 涂改液咻啪
    d = 0.3; t = t_arr(d)
    swoosh = bandpass(white(len(t)), 700, 2400) * np.clip(t / 0.15, 0, 1)
    pop = np.sin(2 * np.pi * 600 * (t - 0.18)) * np.exp(-(t - 0.18) * 40)
    pop = np.where(t >= 0.18, pop, 0)
    return (swoosh * 0.5 + pop * 0.6) * p

def s_ding(p=1.0):        # 星星叮
    d = 0.6; t = t_arr(d)
    base = 1320
    y = np.zeros(len(t))
    for r, a in zip([1, 2.0, 2.76, 4.07], [1, 0.4, 0.2, 0.08]):
        y += np.sin(2 * np.pi * base * r * t + r) * a * np.exp(-t * (4 + r * 2))
    return y * 0.4 * p

def s_pop(p=1.0):         # 啵
    d = 0.08; t = t_arr(d)
    f = 300 + 500 * t / d
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 35)
    return y * 0.6 * p

def s_runsteps(p=1.0):    # 跑步脚步（4步）
    out = np.zeros(int(0.6 * SR))
    for i in range(4):
        i0 = int(i * 0.13 * SR)
        seg = int(0.05 * SR)
        if i0 + seg > len(out): break
        t = np.arange(seg) / SR
        out[i0:i0 + seg] += (bandpass(white(seg), 500, 1500) * np.exp(-t * 60))
    return out * 0.4 * p

def s_cartbump(p=1.0):    # 购物车咚
    d = 0.12; t = t_arr(d)
    y = np.sin(2 * np.pi * 220 * t) * np.exp(-t * 30)
    y += bandpass(white(len(t)), 800, 2500) * np.exp(-t * 50) * 0.4
    return y * 0.5 * p

def s_recordscrach(p=1.0): # 唱片刮/口哨泄气尾音
    d = 0.5; t = t_arr(d)
    y = bandpass(white(len(t)), 1200, 3500) * (1 - smooth_env(np.clip(t / d, 0, 1)))
    return y * 0.4 * p

def s_deflate(p=1.0):      # 破防泄气：音高下滑
    d = 0.8; t = t_arr(d)
    f = 600 * (0.3 + 0.7 * np.exp(-t * 3))
    phase = np.cumsum(f) / SR
    y = np.sin(2 * np.pi * phase) * np.exp(-t * 2.2)
    y += bandpass(white(len(t)), 900, 2600) * np.exp(-t * 3) * 0.3
    return y * 0.5 * p

def s_room(p=1.0):
    y = onepole_lp(white(N), 2400)
    y2 = onepole_lp(white(N), 380)
    return (y * 0.5 + y2 * 0.5) * 0.016 * p

SYNTH = {
    'write': lambda c: s_write(c.get('vol', 1.0)),
    'nib': lambda c: s_nib(),
    'check': lambda c: s_check(),
    'cross': lambda c: s_cross(),
    'stickypop': lambda c: s_stickypop(),
    'stickylift': lambda c: s_stickylift(),
    'pageopen': lambda c: s_pageopen(),
    'pageflip': lambda c: s_pageflip(),
    'stamp': lambda c: s_stamp(),
    'eraser': lambda c: s_eraser(),
    'ding': lambda c: s_ding(),
    'pop': lambda c: s_pop(),
    'runsteps': lambda c: s_runsteps(),
    'cartbump': lambda c: s_cartbump(),
    'recordscrach': lambda c: s_recordscrach(),
    'deflate': lambda c: s_deflate(),
}

# ---------------- 配乐：ukulele + 口哨 BPM112，C-G-Am-F ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    BEAT = 60 / 112          # 0.5357s
    S8 = BEAT / 2            # 八分音符
    t0 = 0.6
    end = 27.4               # 反转后收

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    def ukulele(note, d=0.28, gain=0.5):
        # 拨弦：三角波 + 快衰减
        t = t_arr(d)
        ph = 2 * np.pi * hz(note) * t
        y = (np.mod(ph / (2 * np.pi), 1) * 2 - 1)
        y = lowpass(y, 4200)
        env = np.exp(-t * 9)
        return y * env * gain

    def whistle(note, d=0.32, gain=0.5):
        t = t_arr(d)
        vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t)
        f = hz(note) * vib
        ph = 2 * np.pi * np.cumsum(f) / SR
        y = np.sin(ph) + 0.35 * np.sin(2 * ph)
        env = smooth_env(np.clip(t / 0.04, 0, 1)) * np.exp(-t * 1.5)
        return y * env * gain

    def shaker(d=0.06):
        t = t_arr(d)
        return bandpass(white(len(t)), 6000, 11000) * np.exp(-t * 90) * 0.3

    # 和弦进行：C(48,52,55,60) G(43,47,50,55) A(45,48,52,57) F(41,45,48,53)
    PROG = [
        [60, 64, 67, 72],   # C
        [59, 62, 67, 71],   # G
        [57, 60, 64, 69],   # Am
        [57, 60, 65, 69],   # F  (F: 53,57,60,65 简化)
    ]
    # 口哨主旋律（C大调轻快）：MIDI 音高序列（8分音符网格）
    MEL = [72, 76, 79, 76, 81, 79, 76, 74,
           72, 76, 79, 84, 81, 79, 76, 74,
           72, 76, 79, 76, 81, 84, 86, 84,
           84, 81, 79, 76, 74, 72, 0, 0]

    step = 0
    ts = t0
    while ts < end:
        beat = step % 8          # 一小节8个八分
        bar = step // 8
        chord = PROG[bar % 4]
        # ukulele 扫弦：每拍（16分）轻拨和弦内音
        if step % 2 == 0:
            place(ukulele(chord[(step // 2) % 4], 0.25, 0.4), ts, 0.55, -0.08)
        # 反拍重拨
        if step % 4 == 2:
            place(ukulele(chord[2], 0.22, 0.45), ts, 0.5, -0.1)
        # shaker 八分
        place(shaker(), ts, 0.5, 0.15)
        # 口哨主旋律
        note = MEL[step % len(MEL)]
        if note > 0:
            place(whistle(note, 0.3, 0.42), ts, 0.6, 0.12)
        step += 1
        ts = t0 + step * S8
    return L, R

# ---------------- 混音 ----------------
def build():
    L = np.zeros(N); R = np.zeros(N)

    def place(y, t_start, gain, pan=0.0):
        i0 = int(round(t_start * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    cues = json.load(open(os.path.join(os.path.dirname(__file__), 'sfx_cues.json')))
    for idx, c in enumerate(cues):
        name = c['s']
        if name == 'room':
            place(s_room(), 0, 1.0, 0); continue
        if name not in SYNTH: continue
        y = SYNTH[name](c)
        pan = 0.0
        if name in ('pageflip', 's_write', 'cross'): pan = 0.22 if idx % 2 else -0.22
        place(y, c['t'], 0.9, pan)

    # 配乐床
    mL, mR = build_music()
    L += mL; R += mR

    # 反转：26.8 涂改液后音乐收半拍（口哨泄气）
    # build_music end=27.4 已自然收；保留 recordscrach/deflate cue。

    stereo = np.stack([L, R], axis=1)
    peak = np.max(np.abs(stereo))
    print('bed pre-norm peak', round(peak, 4), 'rms', round(float(np.sqrt(np.mean(stereo ** 2))), 4))
    stereo = np.tanh(stereo / (peak + 1e-9) * 1.25)
    stereo = stereo / np.max(np.abs(stereo)) * (10 ** (-1 / 20))
    stereo = stereo[:N]
    return stereo

import wave
def write_wav(stereo, name):
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    path = os.path.join(os.path.dirname(__file__), name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', name, 'len', len(stereo) / SR)

if __name__ == '__main__':
    write_wav(build(), 'bed.wav')
