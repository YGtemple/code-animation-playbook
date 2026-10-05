#!/usr/bin/env python3
# sfx.py —— 《微笑合规》lo-fi chillhop (BPM84) + 判定音效，纯 numpy/scipy 合成。
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
    return signal.lfilter([1 - a], [1, -a], x)

def bandpass(x, lo, hi):
    lo = max(20.0, lo); hi = min(SR / 2 - 100, hi)
    sos = signal.butter(4, [lo / (SR / 2), hi / (SR / 2)], btype='band', output='sos')
    return signal.sosfilt(sos, x)

def lowpass(x, c):
    sos = signal.butter(4, min(c, SR / 2 - 100) / (SR / 2), output='sos')
    return signal.sosfilt(sos, x)

# ---------------- 判定音效 ----------------
def s_tick(p=1.0):
    d = 0.05; t = t_arr(d)
    y = np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 70)
    y += white(len(t)) * np.exp(-t * 110) * 0.3
    return y * 0.55 * p

def s_ding(p=1.0):  # 收银机叮：双音
    d = 0.7; t = t_arr(d)
    y = np.zeros(len(t))
    for f, a, r in [(1318, 1.0, 5.0), (1760, 0.5, 6.0), (2637, 0.25, 9.0)]:
        y += np.sin(2 * np.pi * f * t) * a * np.exp(-t * r)
    y += white(len(t)) * np.exp(-t * 60) * 0.15
    return y * 0.8 * p

def s_stamp(p=1.0):  # 盖章啪
    d = 0.22; t = t_arr(d)
    th = np.sin(2 * np.pi * (90 - 50 * t / d) * t) * np.exp(-t * 22)
    pap = bandpass(white(len(t)), 800, 4000) * np.exp(-t * 40)
    return (th * 0.9 + pap * 0.7) * p

def s_tear(p=1.0):  # 撕纸
    d = 0.4; t = t_arr(d)
    crack = (0.4 + 0.6 * (white(len(t)) > 0).astype(float))
    y = bandpass(white(len(t)) * crack, 1500, 8000)
    return y * np.clip(np.sin(np.pi * t / d), 0, 1) * 0.8 * p

def s_slide(dur, p=1.0):
    t = t_arr(dur)
    nb = white(len(t)); nb = bandpass(nb, 400, 1800)
    return nb * (t / dur) ** 1.2 * 0.5 * p

def s_type(p=1.0):
    d = 0.05; t = t_arr(d)
    y = bandpass(white(len(t)), 1000, 6000) * np.exp(-t * 90)
    return y * 0.4 * p

def s_scan(p=1.0):
    d = 0.12; t = t_arr(d)
    f = 600 + 2400 * t / d
    y = np.sin(2 * np.pi * f * t) * 0.3 + bandpass(white(len(t)), 700, 3000) * 0.4
    return y * np.exp(-t * 18) * p

def s_drop(p=1.0):
    d = 0.16; t = t_arr(d)
    f = 300 + 700 * np.sin(np.clip(t / d, 0, 1) * np.pi / 2)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 22) * 0.6 * p

def s_crack(p=1.0):
    d = 0.25; t = t_arr(d)
    bits = (white(len(t)) > 0.3).astype(float) * 2 - 1
    y = bandpass(white(len(t)) * bits, 2000, 9000)
    return y * np.exp(-t * 14) * 0.7 * p

def s_pop(p=1.0):
    d = 0.14; t = t_arr(d)
    f = 400 + 500 * np.sin(np.clip(t / d, 0, 1) * np.pi / 2)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 20) * 0.7 * p

def s_blip(p=1.0):  # 真笑 0.1s 小开心
    d = 0.12; t = t_arr(d)
    y = (np.sign(np.sin(2 * np.pi * 880 * t)) + np.sign(np.sin(2 * np.pi * 1320 * t))) / 2
    return y * np.exp(-t * 18) * 0.4 * p

def s_buzz8(p=1.0):  # 8-bit 错误蜂鸣
    d = 0.5; t = t_arr(d)
    sq = np.sign(np.sin(2 * np.pi * 220 * t))
    sq2 = np.sign(np.sin(2 * np.pi * 233 * t))
    return (sq * 0.5 + sq2 * 0.5) * np.clip(1 - t / d, 0, 1) * 0.6 * p

def s_stutter(p=1.0):  # 黑胶跳针：一小段重复
    base = t_arr(0.06)
    chunk = bandpass(white(len(base)), 2000, 6000) * np.exp(-base * 30)
    out = np.concatenate([chunk] * 5)
    return out * 0.4 * p

def s_seal(p=1.0):  # 署名轻叮
    d = 1.2; t = t_arr(d)
    y = np.sin(2 * np.pi * 1568 * t) * np.exp(-t * 4)
    y += np.sin(2 * np.pi * 2093 * t) * np.exp(-t * 6) * 0.5
    return y * 0.5 * p

def s_star(p=1.0):
    d = 0.3; t = t_arr(d)
    y = np.sin(2 * np.pi * 2000 * t) * np.exp(-t * 12)
    y += np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 16) * 0.5
    return y * 0.4 * p

def s_room(p=1.0):  # 黑胶纸噪
    y = white(N)
    y = onepole_lp(y, 5000)
    pops = (rng.random(N) > 0.9985).astype(float) * white(N)
    y = y * 0.012 + pops * 0.05
    return y * p

SYNTH = {
    'tick': lambda c: s_tick(), 'ding': lambda c: s_ding(), 'stamp': lambda c: s_stamp(),
    'tear': lambda c: s_tear(), 'slide': lambda c: s_slide(c.get('dur', 0.4)),
    'type': lambda c: s_type(), 'scan': lambda c: s_scan(), 'drop': lambda c: s_drop(),
    'crack': lambda c: s_crack(), 'pop': lambda c: s_pop(), 'blip': lambda c: s_blip(),
    'buzz8': lambda c: s_buzz8(), 'stutter': lambda c: s_stutter(),
    'seal': lambda c: s_seal(), 'star': lambda c: s_star(),
}

def build(music=False):
    L = np.zeros(N); R = np.zeros(N)
    def place(y, t_start, gain, pan=0.0):
        i0 = max(0, int(round(t_start * SR)))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    cues = json.load(open(os.path.join(os.path.dirname(__file__), 'sfx_cues.json')))
    for c in cues:
        name = c['s']
        if name == 'room':
            place(s_room(), 0, 1.0, 0); continue
        if name not in SYNTH: continue
        y = SYNTH[name](c)
        end_aligned = name in ('slide',)
        t_start = c['t'] - (c.get('dur', 0) if end_aligned else 0)
        place(y, t_start, 0.85, 0.0)

    if music:
        mL, mR = build_music()
        L += mL; R += mR

    stereo = np.stack([L, R], axis=1)
    peak = float(np.max(np.abs(stereo)))
    rms = float(np.sqrt(np.mean(stereo ** 2)))
    print(f'  pre-norm peak={peak:.3f} rms={rms:.4f}')
    stereo = np.tanh(stereo / (peak + 1e-9) * 1.2)
    stereo = stereo / np.max(np.abs(stereo)) * (10 ** (-1 / 20))
    return stereo[:N]

# ---------------- lo-fi chillhop BPM84 ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    BPM = 84
    beat = 60 / BPM          # 0.7143
    S16 = beat / 4           # 0.1786
    t0 = 0.6
    end = 29.4
    def hz(n): return 440 * 2 ** ((n - 69) / 12)

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    def kick():
        d = 0.3; t = t_arr(d); f = 110 * np.exp(-t * 10) + 45
        return np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
    def snare():
        d = 0.18; t = t_arr(d)
        return bandpass(white(len(t)), 1200, 6000) * np.exp(-t * 16)
    def hat(op=1.0):
        d = 0.05; t = t_arr(d)
        return bandpass(white(len(t)), 7000, 13000) * np.exp(-t * 55) * 0.4 * op
    def rhodes(freqs, d):
        t = t_arr(d); y = np.zeros(len(t))
        for f in freqs:
            y += np.sin(2 * np.pi * f * t) * 0.6 + np.sin(2 * np.pi * f * 1.003 * t) * 0.4
        y = onepole_lp(y, 2200)
        att = np.clip(t / 0.03, 0, 1)
        return y * att * np.exp(-t * 2.5) * 0.5
    def sub():
        d = beat * 2; t = t_arr(d)
        return np.sin(2 * np.pi * 55 * t) * np.exp(-t * 1.5) * 0.5

    # ii–V–I–vi lo-fi 进行
    CH = [[hz(50), hz(57), hz(60), hz(64)],   # Am7-ish
          [hz(48), hz(55), hz(59), hz(62)],   # G
          [hz(46), hz(53), hz(57), hz(61)],   # F
          [hz(43), hz(50), hz(53), hz(58)]]   # C
    bar = 0
    i = 0
    while t0 + i * S16 < end:
        ts = t0 + i * S16
        s16 = i % 16
        if s16 in (0, 8): place(kick(), ts, 0.9)
        if s16 in (4, 12): place(snare(), ts, 0.55)
        if s16 % 2 == 0: place(hat(0.5 if s16 % 4 else 0.8), ts, 0.4)
        if s16 == 0:
            place(rhodes(CH[(bar // 2) % 4], beat * 4), ts, 0.5, -0.15)
            place(sub(), ts, 0.6)
        i += 1
        if s16 == 15: bar += 1
    return L, R

import wave
def write_wav(stereo, name):
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    with wave.open(os.path.join(os.path.dirname(__file__), name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    peak_db = 20 * np.log10(np.max(np.abs(stereo)))
    print(f'wrote {name} len={len(stereo)/SR:.5f}s peak={peak_db:.2f}dBFS')

if __name__ == '__main__':
    print('A pure-SFX:'); write_wav(build(music=False), 'sfx.wav')
    print('B music:   '); write_wav(build(music=True), 'sfx_music.wav')
