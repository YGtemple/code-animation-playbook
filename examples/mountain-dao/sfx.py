#!/usr/bin/env python3
# sfx.py —— 纯代码合成 30s 立体声床：古琴主奏 + 箫笛铺底 + 国风音效。输出 bed.wav。
import json, os
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(round(DUR * SR))
rng = np.random.default_rng(20261006)

def white(n, r=rng): return r.standard_normal(n).astype(np.float64)
def t_arr(sec): return np.linspace(0, sec, int(round(sec * SR)), endpoint=False)

def lowpass(x, c):
    c = min(c, SR / 2 - 100)
    sos = signal.butter(4, c / (SR / 2), output='sos')
    return signal.sosfilt(sos, x)

def highpass(x, c):
    c = max(20.0, c)
    sos = signal.butter(4, c / (SR / 2), btype='high', output='sos')
    return signal.sosfilt(sos, x)

def bandpass(x, lo, hi):
    lo = max(20.0, lo); hi = min(SR / 2 - 100, hi)
    sos = signal.butter(4, [lo / (SR / 2), hi / (SR / 2)], btype='band', output='sos')
    return signal.sosfilt(sos, x)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

L = np.zeros(N); R = np.zeros(N)
def place(y, t_start, gain, pan=0.0):
    i0 = int(round(t_start * SR)); ie = min(N, i0 + len(y))
    if i0 >= N: return
    seg = y[:ie - i0]
    a = (pan + 1) * np.pi / 4
    L[i0:ie] += seg * gain * np.cos(a)
    R[i0:ie] += seg * gain * np.sin(a)

# ---------------- 音色 ----------------
def s_guqin(midi=60, p=1.0):
    # 正弦 + 谐波短指数衰减拨弦（古琴）
    f = hz(midi); d = 2.6; t = t_arr(d)
    y = np.zeros_like(t)
    for k, amp in [(1, 1.0), (2, 0.45), (3, 0.22), (4, 0.12)]:
        y += amp * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.2 + k * 0.6))
    # 拨弦瞬态
    y += white(len(t)) * np.exp(-t * 60) * 0.08
    return y * 0.55 * p

def s_xiao(midi=60, dur=2.5, p=1.0):
    # 箫：带气噪正弦长音
    f = hz(midi); t = t_arr(dur)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t)
    y = np.sin(2 * np.pi * f * np.cumsum(vib) / SR)
    y += 0.35 * np.sin(2 * np.pi * f * 2 * t)
    breath = bandpass(white(len(t)), 1200, 4000) * 0.06
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.5)
    env = np.clip(env, 0, 1)
    return (y + breath) * env * 0.22 * p

def s_wind(dur=4.0, p=1.0):
    t = t_arr(dur)
    n = bandpass(white(len(t)), 300, 900)
    # 缓起缓落
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    gust = 0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t)
    return n * env * gust * 0.12 * p

def s_step(p=1.0, pan=0.0):
    d = 0.09; t = t_arr(d)
    y = lowpass(white(len(t)), 900) * np.exp(-t * 40)
    y += np.sin(2 * np.pi * 130 * t) * np.exp(-t * 30) * 0.3
    return y * 0.5 * p

def s_chop(p=1.0):
    d = 0.12; t = t_arr(d)
    y = bandpass(white(len(t)), 500, 3000) * np.exp(-t * 45)
    return y * 0.7 * p

def s_woodblock(p=1.0):
    d = 0.1; t = t_arr(d)
    y = np.sin(2 * np.pi * 620 * t) * np.exp(-t * 55)
    y += bandpass(white(len(t)), 1500, 4000) * np.exp(-t * 80) * 0.3
    return y * 0.5 * p

def s_chime(pitch=1.0, p=1.0):
    # 铜磬：正弦长衰减
    f = 720 * pitch; d = 3.5; t = t_arr(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.6)
    y += np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3.2) * 0.4
    y += bandpass(white(len(t)), 3000, 8000) * np.exp(-t * 12) * 0.05
    return y * 0.5 * p

def s_fire(dur=4.0, p=1.0):
    t = t_arr(dur)
    n = lowpass(white(len(t)), 700)
    crackle = bandpass(white(len(t)), 2000, 6000)
    crackle = crackle * (np.random.default_rng(7).random(len(t)) > 0.96).astype(float)
    env = np.clip(np.minimum(t / 0.3, (dur - t) / 0.3), 0, 1)
    return (n * 0.5 + crackle * 0.25) * env * 0.22 * p

def s_fan(p=1.0):
    d = 0.4; t = t_arr(d)
    n = bandpass(white(len(t)), 400, 1400)
    env = np.sin(np.pi * t / d)
    return n * env * 0.18 * p

def s_dabang(p=1.0):
    d = 0.18; t = t_arr(d)
    y = np.sin(2 * np.pi * 200 * t) * np.exp(-t * 22)
    y += bandpass(white(len(t)), 800, 3000) * np.exp(-t * 30) * 0.4
    return y * 0.6 * p

def s_woodfish(pitch=1.0, p=1.0):
    d = 0.09; t = t_arr(d)
    f = 880 * pitch
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 70)
    return y * 0.4 * p

def s_thud(p=1.0):
    d = 0.25; t = t_arr(d)
    y = np.sin(2 * np.pi * 120 * t) * np.exp(-t * 12)
    return y * 0.6 * p

def s_drum(p=1.0):
    d = 1.2; t = t_arr(d)
    f = 90 - 40 * np.clip(t / 0.2, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 4)
    y += lowpass(white(len(t)), 300) * np.exp(-t * 8) * 0.5
    return y * 0.9 * p

def s_seal(p=1.0):
    d = 0.2; t = t_arr(d)
    y = bandpass(white(len(t)), 600, 2500) * np.exp(-t * 30)
    y += np.sin(2 * np.pi * 180 * t) * np.exp(-t * 25) * 0.5
    return y * 0.6 * p

def s_ding(p=1.0):
    d = 2.0; t = t_arr(d)
    f = 1046
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.5)
    y += np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 5) * 0.3
    return y * 0.4 * p

SYNTH = {
    'guqin': lambda c: s_guqin(60 * (c.get('pitch', 1) ** 0), p=0.6) * (c.get('pitch', 1) ** 0),
}

def build():
    # 山涧底噪
    room = lowpass(white(N), 1200) * 0.015 + bandpass(white(N), 3000, 6000) * 0.006
    place(room, 0, 1.0, 0)

    cues = json.load(open(os.path.join(os.path.dirname(__file__), 'sfx_cues.json'), encoding='utf-8'))

    penta = [60, 62, 64, 67, 69, 72, 74, 76]  # 宫调五声

    for c in cues:
        t = c['t']; s = c['s']; p = c.get('pitch', 1.0); dur = c.get('dur'); pan = c.get('pan', 0.0)
        if s == 'room':
            continue
        elif s == 'guqin':
            # 用 cue.pitch 做五声上行
            note = 60 + (penta[min(len(penta) - 1, int(p * 3))] - 60)
            place(s_guqin(note, 0.6), t, 1.0, pan * 0.5)
        elif s == 'xiao':
            place(s_xiao(67, dur or 3.0, 0.9), t, 1.0, pan)
        elif s == 'wind':
            place(s_wind(dur or 4.0), t, 1.0, 0.1)
        elif s == 'step':
            place(s_step(1.0, pan), t, 0.8, pan)
        elif s == 'chop':
            place(s_chop(), t, 1.0, pan)
        elif s == 'woodblock':
            place(s_woodblock(), t, 0.8, pan)
        elif s == 'chime':
            place(s_chime(p), t, 0.9, 0.0)
        elif s == 'fire':
            place(s_fire(dur or 4.0), t, 1.0, 0.0)
        elif s == 'fan':
            place(s_fan(), t, 1.0, 0.2)
        elif s == 'dabang':
            place(s_dabang(), t, 1.0, 0.0)
        elif s == 'woodfish':
            place(s_woodfish(p), t, 1.0, 0.0)
        elif s == 'thud':
            place(s_thud(), t, 1.0, 0.0)
        elif s == 'drum':
            place(s_drum(), t, 1.0, 0.0)
        elif s == 'seal':
            place(s_seal(), t, 1.0, 0.0)
        elif s == 'ding':
            place(s_ding(), t, 1.0, 0.0)

    # ---------- 配乐：古琴散板点缀 + 箫铺底，BPM60 ----------
    beat = 60 / 60  # 1s per beat
    guqin_seq = [60, 64, 67, 72, 69, 67, 64, 62, 60, 64, 67, 72, 76, 72, 67, 64]
    t0 = 1.0; idx = 0
    tt = t0
    while tt < 28.5:
        note = guqin_seq[idx % len(guqin_seq)]
        place(s_guqin(note, 0.32), tt, 1.0, -0.15 + 0.3 * (idx % 2))
        tt += beat * (1.0 + 0.15 * np.sin(idx))  # 散板微自由
        idx += 1
    # 箫长音铺底
    place(s_xiao(60, 6.0, 0.5), 2.0, 1.0, -0.3)
    place(s_xiao(64, 6.0, 0.5), 9.0, 1.0, 0.3)
    place(s_xiao(62, 6.0, 0.5), 16.0, 1.0, 0.0)
    place(s_xiao(60, 5.0, 0.45), 23.0, 1.0, 0.0)

    stereo = np.stack([L, R], axis=1)
    # 软限幅 + 峰值 -1dBFS
    peak = np.max(np.abs(stereo))
    stereo = np.tanh(stereo / peak * 1.1)
    stereo = stereo / np.max(np.abs(stereo)) * 10 ** (-1 / 20)

    import wave
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    with wave.open(os.path.join(os.path.dirname(__file__), 'bed.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    rms = np.sqrt(np.mean(stereo ** 2))
    print(f'bed.wav written, peak={20*np.log10(np.max(np.abs(stereo))):.2f} dBFS, RMS={20*np.log10(rms+1e-9):.1f} dBFS')

build()
