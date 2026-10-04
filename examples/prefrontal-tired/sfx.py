#!/usr/bin/env python3
# sfx.py —— 水彩皮肤 30s。BPM72 慢板：尼龙吉他分解 + 钢琴单音 + warm pad(lowpass800) + 刷镲/茶杯叮。
# 全 numpy/scipy 合成，无外部素材。输出 sfx.wav(纯音效) 与 sfx_music.wav(配乐床)。
import json, os
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(round(DUR * SR))
rng = np.random.default_rng(20261004)

def white(n, r=rng): return r.standard_normal(n).astype(np.float64)
def t_arr(sec): return np.linspace(0, sec, int(round(sec * SR)), endpoint=False)

def lowpass(x, c):
    c = min(c, SR / 2 - 100)
    sos = signal.butter(4, c / (SR / 2), output='sos')
    return signal.sosfilt(sos, x)

def bandpass(x, lo, hi):
    lo = max(20.0, lo); hi = min(SR / 2 - 100, hi)
    sos = signal.butter(4, [lo / (SR / 2), hi / (SR / 2)], btype='band', output='sos')
    return signal.sosfilt(sos, x)

# 简单混响（Schroeder：2 梳 + 1 全通），给水滴/茶杯用
def reverb(x, mix=0.25):
    out = x.copy()
    for delay, g in [(0.0297, 0.32), (0.0371, 0.28), (0.0411, 0.24)]:
        d = int(delay * SR)
        comb = np.zeros(len(x) + d)
        comb[d:] = x
        # 反馈梳
        y = np.zeros(len(x) + d)
        for i in range(d, len(y)):
            y[i] = comb[i] + g * y[i - d]
        out += y[:len(x)] * 0.3
    # 全通
    d = int(0.0137 * SR); g = 0.35
    ap = np.zeros(len(x) + d)
    for i in range(d, len(ap)):
        ap[i] = g * ap[i - d] + x[i - d] - g * (ap[i - d] if i - d < len(ap) else 0)
    out += ap[:len(x)] * 0.2
    return x * (1 - mix) + out * mix

def hz(m):  # MIDI
    return 440.0 * 2 ** ((m - 69) / 12)

# ---------------- 乐器 ----------------
def nylon(freq, d=1.4, gain=1.0):
    # 尼龙弦拨弦：基频正弦 + 2/3 次轻谐波，快攻慢衰
    t = t_arr(d)
    pluck = np.exp(-((t) / 0.004))
    y = (np.sin(2 * np.pi * freq * t) * 1.0
         + 0.45 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 6)
         + 0.18 * np.sin(2 * np.pi * freq * 3 * t) * np.exp(-t * 9))
    env = np.where(t < 0, 0, np.exp(-t * 2.6))
    return y * env * gain

def piano(freq, d=2.2, gain=1.0):
    t = t_arr(d)
    y = np.zeros_like(t)
    for hh, amp in [(1, 1.0), (2, 0.45), (3, 0.22), (4, 0.10), (5, 0.05)]:
        y += amp * np.sin(2 * np.pi * freq * hh * t) * np.exp(-t * (1.6 + hh * 0.5))
    return y * gain

def pad_chord(freqs, d=4.0, gain=0.35):
    t = t_arr(d)
    y = np.zeros_like(t)
    for f in freqs:
        for det in (-0.06, 0.06):
            ph = 2 * np.pi * f * (1 + det) * t
            y += (np.mod(ph / (2 * np.pi), 1) * 2 - 1) / (len(freqs) * 2)
    y = lowpass(y, 800)
    atk = np.clip(t / 1.2, 0, 1)
    rel = np.clip((d - t) / 1.2, 0, 1)
    return y * atk * rel * gain

def brush(d=1.8, gain=0.3):
    t = t_arr(d)
    y = white(len(t))
    y = bandpass(y, 2500, 7000)
    env = np.clip(t / 0.4, 0, 1) * np.clip((d - t) / 0.9, 0, 1)
    return y * env * gain

# ---------------- 音效 ----------------
def s_softpop():
    d = 0.22; t = t_arr(d)
    f = 700 + 600 * np.clip(t / d, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 14)
    return y * 0.5

def s_softtick(p=1.0):
    d = 0.05; t = t_arr(d)
    y = np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 70) * 0.35
    y += bandpass(white(len(t)), 1500, 5000) * np.exp(-t * 90) * 0.12
    return y * p * 0.5

def s_drip():
    d = 0.35; t = t_arr(d)
    f = 950 - 600 * np.clip(t / 0.12, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 16)
    y += 0.15 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t * 22)
    return reverb(y, 0.3) * 0.7

def s_softbuzz():
    d = 0.8; t = t_arr(d)
    y = np.sin(2 * np.pi * 220 * t) * 0.3
    y += np.sin(2 * np.pi * 223 * t) * 0.3
    y = lowpass(y, 900)
    env = np.clip(t / 0.08, 0, 1) * np.clip((d - t) / 0.2, 0, 1)
    return y * env * 0.4

def s_waterdrop():
    d = 0.9; t = t_arr(d)
    f = 1300 - 900 * np.clip(t / 0.1, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
    return reverb(y, 0.55) * 0.85

def s_cupset():
    d = 0.25; t = t_arr(d)
    y = np.sin(2 * np.pi * 1300 * t) * np.exp(-t * 28) * 0.4
    y += lowpass(white(len(t)), 1800) * np.exp(-t * 30) * 0.2
    return reverb(y, 0.25) * 0.6

def s_steam():
    d = 1.6; t = t_arr(d)
    y = bandpass(white(len(t)), 3000, 6500)
    env = np.clip(t / 0.6, 0, 1) * np.clip((d - t) / 0.8, 0, 1)
    return y * env * 0.08

def s_penstroke():
    d = 0.5; t = t_arr(d)
    y = bandpass(white(len(t)), 1800, 5000)
    env = np.clip(t / 0.08, 0, 1) * np.exp(-t * 2.5)
    return y * env * 0.25

def s_teading():
    d = 2.2; t = t_arr(d)
    base = 1568.0  # G6 茶杯高瓷音
    y = np.zeros_like(t)
    for r, a in [(1, 1.0), (2.0, 0.4), (2.76, 0.25), (3.9, 0.12), (5.4, 0.06)]:
        y += a * np.sin(2 * np.pi * base * r * t) * np.exp(-t * (2.2 + r * 0.6))
    return reverb(y, 0.35) * 0.55

def s_room():
    y = white(N)
    y = lowpass(y, 2400)
    return y * 0.018

SYNTH = {
    'softpop': lambda c: s_softpop(),
    'softtick': lambda c: s_softtick(c.get('p', 1.0)),
    'drip': lambda c: s_drip(),
    'softbuzz': lambda c: s_softbuzz(),
    'waterdrop': lambda c: s_waterdrop(),
    'cupset': lambda c: s_cupset(),
    'steam': lambda c: s_steam(),
    'penstroke': lambda c: s_penstroke(),
    'teading': lambda c: s_teading(),
}

# ---------------- 配乐床（BPM72） ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    BEAT = 60.0 / 72.0  # 0.833s

    # --- 0–3s：吉他单音稀疏（A2, E3）---
    place(nylon(hz(45), 2.5), 0.6, 0.5, -0.15)   # A2
    place(nylon(hz(52), 2.5), 1.9, 0.45, 0.1)    # E3

    # --- 3–8s：吉他 Am 分解琶音 ---
    am = [57, 60, 64, 69, 64, 60]  # A3 C4 E4 A4 E4 C4
    t0 = 3.3
    for i, n in enumerate(am * 2):
        place(nylon(hz(n), 1.6), t0 + i * BEAT / 2, 0.32, -0.1 + 0.05 * (i % 3))

    # --- 8–13s：钢琴进，Am(add b9) 不协和（加 B4）---
    place(piano(hz(57), 3.0), 8.1, 0.35, 0.1)
    place(piano(hz(60), 3.0), 8.1, 0.30, 0.1)
    place(piano(hz(64), 3.0), 8.1, 0.30, 0.1)
    place(piano(hz(71), 2.2), 8.9, 0.22, 0.15)   # B4 = b9
    place(piano(hz(65), 2.6), 10.4, 0.28, 0.0)  # F4
    place(piano(hz(72), 2.2), 11.6, 0.22, 0.15) # B4 再碰一下

    # --- 13–19s：warm pad 渐强（F→G7）---
    place(pad_chord([hz(53), hz(57), hz(60), hz(65)], 5.5, 0.30), 13.2, 1.0, 0.0)
    place(pad_chord([hz(55), hz(59), hz(62), hz(65)], 5.5, 0.32), 16.4, 1.0, 0.0)

    # --- 19–23s：音乐全停（峰值），不叠 ---

    # --- 23–28s：吉他+钢琴回到主和弦 Am → C ---
    place(nylon(hz(45), 3.0), 23.8, 0.5, -0.15)
    place(piano(hz(57), 3.2), 23.9, 0.35, 0.1)
    place(piano(hz(60), 3.2), 23.9, 0.30, 0.1)
    place(piano(hz(64), 3.2), 23.9, 0.30, 0.1)
    am2 = [57, 60, 64, 69]
    for i, n in enumerate(am2):
        place(nylon(hz(n), 1.8), 24.6 + i * BEAT / 2, 0.30)
    place(piano(hz(60), 3.0), 26.2, 0.32, 0.05)  # C 和弦落脚
    place(piano(hz(64), 3.0), 26.2, 0.28, 0.05)
    place(piano(hz(67), 3.0), 26.2, 0.28, 0.05)

    # --- 28–30s：刷镲 + 茶杯叮（叮由 cue 出，这里补 pad 尾音与 brush）---
    place(brush(2.2, 0.18), 27.8, 1.0, 0.0)
    place(piano(hz(57), 2.8), 28.6, 0.22, 0.0)   # 最后一个 A 长音

    return L, R

# ---------------- 混音 ----------------
def build(music=False):
    L = np.zeros(N); R = np.zeros(N)
    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
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
        place(y, c['t'], 0.9, 0.0)

    if music:
        mL, mR = build_music()
        L += mL; R += mR

    # 峰值真静音窗口 19.0–23.0（含房间底噪与配乐全停）
    a0 = int(19.0 * SR); a1 = int(23.0 * SR)
    L[a0:a1] = 0; R[a0:a1] = 0

    # 软限幅 + 峰值 -1dBFS
    stereo = np.stack([L, R], axis=1)
    peak = float(np.max(np.abs(stereo)))
    rms = float(np.sqrt(np.mean(stereo ** 2)))
    print(f'  raw peak={peak:.3f} rms={rms:.4f}')
    stereo = np.tanh(stereo / (peak + 1e-9) * 1.25)
    stereo = stereo / (np.max(np.abs(stereo)) + 1e-9) * 10 ** (-1 / 20)
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
    print('SFX-only:'); write_wav(build(music=False), 'sfx.wav')
    print('Music bed:'); write_wav(build(music=True), 'sfx_music.wav')
