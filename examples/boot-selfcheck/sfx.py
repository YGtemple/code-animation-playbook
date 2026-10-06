#!/usr/bin/env python3
# sfx.py —— 黑白默片：拉格泰姆老钢琴（108→120BPM）+ 放映机床声 + slapstick/追魂/急停音效。
# 全代码合成；旁白单独走 TTS，在 mix_voice.py 混入。输出 bed.wav（配乐+音效床，无人声）。
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

# ---------------- 走音旧立式钢琴 ----------------
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def piano(freq, dur, vel=1.0):
    # 3–5 泛音 + 快衰减 + 失谐 ±4 音分
    t = t_arr(dur)
    y = np.zeros(len(t))
    harms = [(1, 1.0), (2, 0.55), (3, 0.32), (4, 0.16), (5, 0.08)]
    for r, a in harms:
        det = 1 + rng.uniform(-0.004, 0.004)          # ±~4音分
        y += a * np.sin(2 * np.pi * freq * r * det * t)
    # 击弦噪声
    y += bandpass(white(len(t)), 2000, 8000) * 0.06 * np.exp(-t * 60)
    # 快衰减包络（旧立式）
    env = np.exp(-t * (3.2 + freq * 0.0015))
    env = np.maximum(env, np.exp(-t * 0.8) * 0.15)    # 余韵
    return y * env * vel

def chord_notes(notes, dur, vel=0.5):
    y = np.zeros(int(round(dur * SR)))
    for m in notes:
        n = piano(hz(m), dur, vel)
        y[:len(n)] += n
    return y

# ---------------- 音效 ----------------
def s_proj(p=1.0):   # 放映机咔哒床声：低通噪声脉冲节律，全程极轻
    y = onepole_lp(white(N), 1200)
    # 机械节律 ~12Hz 咔哒
    click = np.zeros(N)
    tt = np.arange(N) / SR
    for k in range(int(DUR * 12)):
        i0 = int(k / 12 * SR)
        seg = int(0.012 * SR)
        click[i0:i0 + seg] += np.sin(2 * np.pi * 900 * np.arange(seg) / SR) * np.exp(-np.arange(seg) / 40000 * 2200)
    y = y * 0.15 + click * 0.12
    return y * 0.09 * p

def s_chord(p=1.0):  # 开篇柱式和弦 C 大三
    return chord_notes([48, 52, 55, 60], 2.2, 0.55)

def s_clatter(p=1.0):
    d = 0.14; t = t_arr(d)
    y = np.zeros(len(t))
    for i in range(6):
        i0 = int(i * len(t) / 6); seg = int(len(t) / 6)
        y[i0:i0 + seg] += bandpass(white(seg), 1500, 4500) * np.exp(-np.linspace(0, 1, seg) * 24)
    return y * 0.7 * p

def s_boing(p=1.0):  # slapstick 弹簧 boing
    d = 0.45; t = t_arr(d)
    f = 180 * (1.0 + 0.6 * np.sin(2 * np.pi * 9 * t))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
    y += bandpass(white(len(t)), 400, 1400) * 0.2 * np.exp(-t * 8)
    return y * 0.6 * p

def s_pop(p=1.0):
    d = 0.09; t = t_arr(d)
    f = 240 + 520 * t / d
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 22)
    return y * 0.7 * p

def s_creak(dur=0.8, p=1.0):
    t = t_arr(dur)
    x = white(len(t))
    y = bandpass(x, 600, 1800)
    g = 0.4 + 0.6 * (np.sin(2 * np.pi * 6 * t) > 0)
    return y * g * 0.2 * p

def s_type(p=1.0):
    d = 0.05; t = t_arr(d)
    y = bandpass(white(len(t)), 900, 6000) * np.exp(-t * 90)
    y += np.sin(2 * np.pi * 420 * t) * np.exp(-t * 90) * 0.3
    return y * 0.35 * p

def s_tick(p=1.0):
    d = 0.04; t = t_arr(d)
    return np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 90) * 0.4 * p

def s_wind(dur, p=1.0):
    t = t_arr(dur)
    y = bandpass(white(len(t)), 300, 1200)
    env = np.linspace(0, 1, len(t)) ** 1.2 * np.exp(-t * 1.5)
    return y * env * 0.4 * p

def s_sting(p=1.0):  # 扑空：boing + 柱式重击
    a = s_boing(0.8); b = chord_notes([55, 59, 62, 65], 0.5, 0.4)
    Lm = max(len(a), len(b))
    aa = np.zeros(Lm); bb = np.zeros(Lm)
    aa[:len(a)] = a; bb[:len(b)] = b
    return (aa + bb) * 0.8 * p

def s_slam(p=1.0):
    d = 0.3; t = t_arr(d)
    f = 130 - 90 * np.clip(t / d, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 14)
    y += lowpass(white(len(t)), 500) * np.exp(-t * 30) * 0.5
    y += chord_notes([48, 55, 60], 0.3, 0.35)
    return y * 0.9 * p

def s_ding(p=1.0):
    d = 0.9; t = t_arr(d)
    base = 880
    y = np.zeros(len(t))
    for r, a in zip([1, 2.0, 2.76, 4.1], [1, 0.4, 0.25, 0.1]):
        y += np.sin(2 * np.pi * base * r * t) * a * np.exp(-t * (3.5 + r * 2))
    return y * 0.5 * p

def s_scratch(dur=0.5, p=1.0):  # 唱片刮擦
    t = t_arr(dur)
    y = bandpass(white(len(t)), 1500, 6000)
    g = np.zeros(len(t)); g[:int(0.06 * SR)] = 1
    g = signal.lfilter([0.3], [1, -0.7], g)   # 循环刮擦感
    return y * g * 0.5 * p

def s_thud(p=1.0):
    d = 0.4; t = t_arr(d)
    f = 120 - 70 * np.clip(t / d, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 11)
    y += lowpass(white(len(t)), 400) * np.exp(-t * 25) * 0.6
    return y * p

def s_gliss(dur=1.2, p=1.0):  # 下行滑奏（落点对齐 cue.t）
    t = t_arr(dur)
    # 快速下行音阶
    nnotes = 14
    scale = list(range(88, 60, -2))[:nnotes]
    y = np.zeros(len(t))
    per = dur / nnotes
    for k, m in enumerate(scale):
        i0 = int(k * per * SR); seg = int(per * SR)
        note = piano(hz(m), per * 1.2, 0.35)
        y[i0:i0 + seg] += note[:seg]
    return y * 0.8 * p

def s_cover(p=1.0):  # 琴盖砰急停
    d = 0.25; t = t_arr(d)
    y = np.sin(2 * np.pi * 70 * t) * np.exp(-t * 25)
    y += lowpass(white(len(t)), 900) * np.exp(-t * 40) * 0.7
    return y * p

SYNTH = {
    'proj': lambda c: s_proj(), 'chord': lambda c: s_chord(),
    'clatter': lambda c: s_clatter(c.get('vol', 1.0)), 'boing': lambda c: s_boing(),
    'pop': lambda c: s_pop(), 'creak': lambda c: s_creak(c.get('dur', 0.8)),
    'type': lambda c: s_type(c.get('vol', 1.0)), 'tick': lambda c: s_tick(c.get('vol', 1.0)),
    'wind': lambda c: s_wind(0.5, c.get('vol', 1.0)), 'sting': lambda c: s_sting(),
    'slam': lambda c: s_slam(c.get('vol', 1.0)), 'ding': lambda c: s_ding(c.get('vol', 1.0)),
    'scratch': lambda c: s_scratch(c.get('dur', 0.5)), 'thud': lambda c: s_thud(),
    'gliss': lambda c: s_gliss(c.get('dur', 1.2)), 'cover': lambda c: s_cover(),
}

# ---------------- 拉格泰姆配乐 ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    # 和弦进行 C – A7 – D7 – G7（I–vi–ii–V）；中段转 F
    # 每项 = (根音低八度midi, 和弦midi列表)
    PROG = [
        (36, [48, 52, 55]),     # C
        (33, [45, 49, 52, 55]), # A7
        (38, [50, 54, 57, 60]), # D7
        (31, [43, 47, 50, 53]), # G7
    ]
    FPROG = [
        (29, [41, 45, 48, 52]), # F
        (33, [45, 49, 52, 55]), # A7
        (38, [50, 54, 57, 60]), # D7
        (31, [43, 47, 50, 53]), # G7
    ]
    # 右手切分旋律用的音池（五声/布鲁斯感）
    MEL_C = [60, 62, 64, 67, 69, 72, 74, 76]

    def bpm_at(t):
        if t < 16.0: return 108.0
        if t < 25.0: return 120.0
        return 120.0

    t = 0.3
    bar = 0
    while t < 28.6:
        bpm = bpm_at(t)
        beat = 60.0 / bpm          # 四分音符时长
        barlen = beat * 2           # 2/4
        prog = FPROG if 16.0 <= t < 25.0 else PROG
        root, ch = prog[bar % len(prog)]
        # 左手 stride：拍1 根音低八度，拍2 和弦
        place(piano(hz(root), beat * 1.6, 0.5), t, 0.55, -0.15)
        place(piano(hz(root + 12), beat * 0.8, 0.3), t + beat, 0.35, -0.1)
        place(chord_notes(ch, beat * 0.9, 0.30), t + beat, 0.4, 0.12)
        # 右手切分反拍旋律
        mnote = MEL_C[(bar * 3 + int(t * 2)) % len(MEL_C)]
        place(piano(hz(mnote), beat * 0.7, 0.32), t + beat * 0.5, 0.35, 0.18)  # 反拍
        place(piano(hz(mnote + 7), beat * 0.5, 0.22), t + beat * 1.3, 0.25, 0.22)
        t += barlen; bar += 1
    return L, R

# ---------------- 主混音 ----------------
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
        if name == 'proj':
            y = s_proj(); L[:len(y)] += y; R[:len(y)] += y; continue
        if name not in SYNTH: continue
        y = SYNTH[name](c)
        end_aligned = name in ('gliss', 'whoosh')
        t_start = c['t'] - (c.get('dur', 0) if end_aligned else 0)
        pan = 0.25 if idx % 2 else -0.25
        place(y, t_start, 0.9, pan)

    mL, mR = build_music()
    L += mL; R += mR

    # 琴盖急停后真静音窗 868.9–871.4 帧 → 秒
    a0 = int(28.96 * SR); a1 = int(29.10 * SR)
    L[a0:a1] = 0; R[a0:a1] = 0

    stereo = np.stack([L, R], axis=1)
    peak = np.max(np.abs(stereo))
    print('bed pre-norm peak', round(float(peak), 4), 'rms', round(float(np.sqrt(np.mean(stereo ** 2))), 4))
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
