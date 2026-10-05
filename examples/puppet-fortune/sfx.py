#!/usr/bin/env python3
# sfx.py —— 皮影后台轻场：板胡短弓点奏 + 木鱼/梆子 + 一声大锣。全代码合成，无外部素材。
import json, os
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(round(DUR * SR))
rng = np.random.default_rng(20261005)

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

# ---------------- 皮影后台音色 ----------------
def s_board(p=1.0):   # 木板台脚步
    d = 0.09; t = t_arr(d)
    y = bandpass(white(len(t)), 300, 900) * np.exp(-t * 40)
    y += np.sin(2 * np.pi * 170 * t) * np.exp(-t * 45) * 0.6
    return y * 0.8 * p

def s_clatter(p=1.0):  # 签筒哗啦（木签碰撞）
    d = 0.12; t = t_arr(d)
    y = np.zeros(len(t))
    burst_n = 7
    for i in range(burst_n):
        i0 = int(i * len(t) / burst_n)
        seg = int(len(t) / burst_n)
        y[i0:i0 + seg] += bandpass(white(seg), 1500, 4200) * np.exp(-np.linspace(0, 1, seg) * 22)
    return y * 0.7 * p

def s_dong(p=1.0):     # 盖章“咚”
    d = 0.3; t = t_arr(d)
    y = np.sin(2 * np.pi * (130 - 60 * t / d) * t) * np.exp(-t * 12)
    y += bandpass(white(len(t)), 500, 1600) * np.exp(-t * 40) * 0.5
    return y * 0.9 * p

def s_muyu(p=1.0):     # 木鱼
    d = 0.12; t = t_arr(d)
    y = np.sin(2 * np.pi * 420 * t) * np.exp(-t * 45)
    y += np.sin(2 * np.pi * 710 * t) * np.exp(-t * 60) * 0.4
    return y * 0.7 * p

def s_bang(p=1.0):     # 梆子
    d = 0.07; t = t_arr(d)
    y = bandpass(white(len(t)), 900, 2600) * np.exp(-t * 70)
    y += np.sin(2 * np.pi * 950 * t) * np.exp(-t * 80) * 0.5
    return y * 0.7 * p

def s_tick(p=1.0):
    d = 0.04; t = t_arr(d)
    y = np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 90)
    return y * 0.4 * p

def s_thud(p=1.0):
    d = 0.28; t = t_arr(d)
    f = 150 - 90 * np.clip(t / d, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 12)
    y += lowpass(white(len(t)), 500) * np.exp(-t * 30) * 0.4
    return y * p

def s_low(p=1.0):
    d = 0.9; t = t_arr(d)
    y = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 5)
    y += np.sin(2 * np.pi * 41 * t) * np.exp(-t * 4) * 0.6
    return y * p

def s_ding(p=1.0):
    d = 1.2; t = t_arr(d)
    base = 880
    y = np.zeros(len(t))
    for r, a in zip([1, 2.0, 2.76, 4.1], [1, 0.4, 0.25, 0.1]):
        y += np.sin(2 * np.pi * base * r * t) * a * np.exp(-t * (3.5 + r * 2))
    return y * 0.6 * p

def s_snap(p=1.0):
    d = 0.09; t = t_arr(d)
    y = bandpass(white(len(t)), 1800, 6000) * np.exp(-t * 90)
    return y * 0.7 * p

def s_creak(p=1.0):    # 提线木柄吱呀
    d = 0.7; t = t_arr(d)
    x = white(len(t))
    f = 400 + 500 * np.sin(2 * np.pi * 3.5 * t)
    # 简单扫频带通
    sos = signal.butter(4, [600 / (SR / 2), 1600 / (SR / 2)], btype='band', output='sos')
    y = signal.sosfilt(sos, x)
    g = (np.sin(2 * np.pi * 3.5 * t) > 0).astype(float) * 0.7 + 0.3
    return y * g * 0.25 * p

def s_boom(p=1.0):
    d = 0.8; t = t_arr(d)
    y = np.sin(2 * np.pi * 65 * t) * np.exp(-t * 5)
    y += lowpass(white(len(t)), 300) * np.exp(-t * 6) * 0.8
    return y * 0.9 * p

def s_gong(p=1.0):     # 大锣
    d = 2.6; t = t_arr(d)
    base = 196
    y = np.zeros(len(t))
    for r, a in zip([1, 2.76, 5.4, 8.9, 12.3], [1, 0.55, 0.3, 0.16, 0.08]):
        y += np.sin(2 * np.pi * base * r * t + r) * a * np.exp(-t * (1.1 + r * 0.15))
    y += bandpass(white(len(t)), 2000, 8000) * np.exp(-t * 8) * 0.2
    return y * 0.9 * p

def s_whoosh(dur, p=1.0):
    seg = 0.045; nseg = max(2, int(dur / seg))
    out = np.zeros(0)
    fl = np.geomspace(200, 2400, nseg)
    for i in range(nseg):
        L = int(seg * SR * 1.6)
        x = white(L)
        x = bandpass(x, fl[i] * 0.5, fl[i] * 1.5)
        w = np.hanning(L)
        if i == 0: out = x * w
        else:
            ov = L // 2
            out = np.concatenate([out, np.zeros(L - ov)])
            out[i * (L - ov): i * (L - ov) + L] += x * w
    env = np.linspace(0.2, 1.0, len(out)) ** 1.4
    return out * env * 0.7 * p

def s_riser(dur, p=1.0):
    t = t_arr(dur)
    f = 300 + (1500 - 300) * (t / dur) ** 1.5
    sine = np.sin(2 * np.pi * f * t)
    nb = bandpass(white(len(t)), 300, 4000)
    env = (t / dur) ** 1.3
    return (sine * 0.5 + nb * 0.45) * env * 0.6 * p

def s_room(p=1.0):
    y = onepole_lp(white(N), 2400)
    y2 = onepole_lp(white(N), 380)
    return (y * 0.5 + y2 * 0.5) * 0.018 * p

SYNTH = {
    'board': lambda c: s_board(), 'clatter': lambda c: s_clatter(c.get('vol', 1.0)),
    'dong': lambda c: s_dong(), 'muyu': lambda c: s_muyu(), 'bang': lambda c: s_bang(),
    'tick': lambda c: s_tick(), 'thud': lambda c: s_thud(), 'low': lambda c: s_low(),
    'ding': lambda c: s_ding(), 'snap': lambda c: s_snap(), 'creak': lambda c: s_creak(),
    'boom': lambda c: s_boom(), 'gong': lambda c: s_gong(),
    'whoosh': lambda c: s_whoosh(c.get('dur', 0.4)), 'riser': lambda c: s_riser(c.get('dur', 0.5)),
}

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
        end_aligned = name in ('whoosh', 'riser')
        t_start = c['t'] - (c.get('dur', 0) if end_aligned else 0)
        pan = 0.0
        if name in ('whoosh', 'clatter'): pan = 0.25 if idx % 2 else -0.25
        place(y, t_start, 0.9, pan)

    # 配乐床
    mL, mR = build_music()
    L += mL; R += mR

    # 锣后真静音窗 25.0–25.5
    a0 = int(25.0 * SR); a1 = int(25.5 * SR)
    L[a0:a1] = 0; R[a0:a1] = 0

    stereo = np.stack([L, R], axis=1)
    peak = np.max(np.abs(stereo))
    print('bed pre-norm peak', round(peak, 4), 'rms', round(float(np.sqrt(np.mean(stereo ** 2))), 4))
    stereo = np.tanh(stereo / (peak + 1e-9) * 1.25)
    stereo = stereo / np.max(np.abs(stereo)) * (10 ** (-1 / 20))
    stereo = stereo[:N]
    return stereo

# ---------------- 配乐：板胡后台，BPM≈76 ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    BEAT = 60 / 76          # 0.789s
    S16 = BEAT / 4
    t0 = 0.9
    end = 29.6

    def hz(n): return 440 * 2 ** ((n - 69) / 12)

    def banhu(f, d):       # 板胡短弓：锯齿波 + 振动，带通
        t = t_arr(d)
        ph = 2 * np.pi * f * t
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t)
        y = (np.mod(ph * vib / (2 * np.pi), 1) * 2 - 1)
        y = bandpass(y, 700, 2600)
        env = smooth_env(np.clip(t / 0.05, 0, 1)) * np.exp(-t * 2.2)
        return y * env * 0.5

    def muyu_m():
        d = 0.12; t = t_arr(d)
        return (np.sin(2 * np.pi * 380 * t) * np.exp(-t * 40)) * 0.5

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    # 五声音阶句子（D 宫）：MIDI
    PHRASES = [
        [74, 76, 78, 81],      # 开场疏朗
        [81, 79, 76, 74],
        [78, 81, 83, 86],      # R3 上扬
        [86, 83, 81, 78],
        [74, 74, 76, 74],      # R4 悬
        [81, 78, 76, 74],      # 收尾
    ]
    phrase_i = 0
    step = 0
    while t0 + step * S16 < end:
        ts = t0 + step * S16
        beat = step % 4            # 四分音符内位置
        bar = step // 4
        # 段落
        if ts < 15.0:
            # 正场：每拍木鱼 + 乐句点板胡
            if beat == 0: place(muyu_m(), ts, 0.5)
            if beat == 2 and bar % 2 == 0: place(muyu_m(), ts, 0.35)
            if beat == 0:
                ph = PHRASES[min(bar // 2, len(PHRASES) - 1)]
                note = ph[bar % 4]
                place(banhu(hz(note), 0.55), ts, 0.55, -0.1)
            if beat == 2 and bar % 3 == 1:
                ph = PHRASES[min(bar // 2, len(PHRASES) - 1)]
                place(banhu(hz(ph[(bar + 1) % 4]), 0.4), ts + 0.02, 0.4, 0.1)
        elif ts < 21.5:
            # 提线段：只剩稀疏板胡长弓
            if beat == 0: place(banhu(hz(69), 1.1), ts, 0.45, -0.1)
        elif ts < 25.0:
            # 反转前：低音嗡
            if beat == 0:
                t = t_arr(0.8)
                y = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 3) * 0.5
                place(y, ts, 0.5)
        elif ts < 25.5:
            pass  # 锣后留白（真静音，配合 cues）
        else:
            # 收尾：一句板胡收
            if beat == 0:
                ph = PHRASES[-1]
                place(banhu(hz(ph[bar % 4]), 0.7), ts, 0.5, -0.1)
        step += 1
    return L, R

# ---------------- 输出 ----------------
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
