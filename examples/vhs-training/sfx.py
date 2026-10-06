#!/usr/bin/env python3
# sfx.py —— 纯代码合成配乐床 + VHS 音效。输出 bed.wav（立体声 48k）。
# 配乐：chillwave/lo-fi synthwave BPM94，暖电钢/软saw 慢和弦 Dm-Bb-F-C，极轻闷hat，整体低通+wow&flutter。
import os, json
import numpy as np
from scipy.signal import butter, lfilter, sawtooth

SR = 48000
D = os.path.dirname(os.path.abspath(__file__))
DURATION = 30.0
N = int(DURATION * SR)
L = np.zeros(N); R = np.zeros(N)

def t_arr(sec): return np.linspace(0, sec, int(round(sec * SR)), endpoint=False)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def place(y, t0, gain, pan=0.0):
    i0 = int(round(t0 * SR)); ie = min(N, i0 + len(y))
    if i0 >= N: return
    seg = y[:ie - i0]
    a = (pan + 1) * np.pi / 4
    L[i0:ie] += seg * gain * np.cos(a)
    R[i0:ie] += seg * gain * np.sin(a)

def lowpass(x, cutoff, order=2):
    b, a = butter(order, cutoff / (SR / 2), btype='low')
    return lfilter(b, a, x)

# ---------------- 音色 ----------------
def epiano_note(midi, dur, gain=0.2):
    """暖电钢：基频 + 2/3 谐波，指数衰减。"""
    f = hz(midi); t = t_arr(dur)
    y = (np.sin(2*np.pi*f*t) * np.exp(-2.2*t)
         + 0.5*np.sin(2*np.pi*2*f*t) * np.exp(-4.5*t)
         + 0.25*np.sin(2*np.pi*3*f*t) * np.exp(-6*t))
    return y * gain

def soft_saw(midi, dur, gain=0.12):
    f = hz(midi); t = t_arr(dur)
    # 两个失谐 saw，低通由总线统一做
    y = 0.6*sawtooth(2*np.pi*f*t) + 0.4*sawtooth(2*np.pi*f*1.005*t)
    env = np.minimum(1, t/0.15) * np.exp(-0.6*t)
    return y * env * gain

def hat(dur=0.04, gain=0.05):
    t = t_arr(dur)
    y = np.random.default_rng(len(t)).standard_normal(len(t))
    y *= np.exp(-60*t)
    return y * gain

def osdbeep():
    t = t_arr(0.06)
    y = np.sign(np.sin(2*np.pi*1000*t)) * np.exp(-30*t)
    return y * 0.18

def tear():
    t = t_arr(0.25)
    y = np.random.default_rng(7).standard_normal(len(t))
    # 带通粗滤波（用简单差分+低通近似）
    y = lowpass(y, 6000) * np.sin(np.pi * t/0.25)
    return y * 0.5

def dropout_crackle():
    t = t_arr(0.04)
    y = np.random.default_rng(3).standard_normal(len(t)) * np.exp(-90*t)
    return y * 0.4

def rewind_sweep(dur):
    t = t_arr(dur)
    f0, f1 = 2200.0, 180.0
    freq = np.linspace(f0, f1, len(t))
    phase = np.cumsum(freq) / SR
    y = np.sin(2*np.pi*phase) * (0.4 + 0.3*np.sin(2*np.pi*8*t))
    # 磁噪爆发
    noise = np.random.default_rng(9).standard_normal(len(t)) * 0.5
    env = np.linspace(0.3, 1.0, len(t))
    return (y*0.6 + noise) * env

# ---------------- 配乐床：BPM94 步进 ----------------
def build_music():
    bpm = 94
    beat = 60.0 / bpm
    s16 = beat / 4.0
    # 和弦进行 Dm - Bb - F - C（MIDI）
    prog = [
        [50, 53, 57],   # Dm
        [46, 50, 53],   # Bb
        [41, 45, 48],   # F
        [48, 52, 55],   # C
    ]
    t0 = 3.2
    end = 29.6
    chord_dur = beat * 4.0   # 每和弦一小节
    bar = 0
    t = t0
    bed = np.zeros(N)
    while t < end:
        chord = prog[bar % 4]
        # 暖电钢铺和弦（缓慢进出）
        for note in chord:
            y = epiano_note(note, chord_dur*1.1, gain=0.16)
            i0 = int(t*SR); ie = min(N, i0+len(y))
            bed[i0:ie] += y[:ie-i0]
        # 软 saw 低音根音长音
        root = soft_saw(chord[0]-12, chord_dur, gain=0.10)
        i0 = int(t*SR); ie = min(N, i0+len(root))
        bed[i0:ie] += root[:ie-i0]
        # 极轻闷hat：反拍
        for k in (2, 6):
            ht = t + k*s16
            if ht < end:
                hy = hat(0.03, 0.035)
                i0 = int(ht*SR); ie = min(N, i0+len(hy))
                bed[i0:ie] += hy[:ie-i0]
        t += chord_dur
        bar += 1
    # 整体低通变暖
    bed = lowpass(bed, 5200, order=3)
    # wow & flutter：慢振幅 LFO ±5%
    tt = np.arange(N)/SR
    flutter = 1.0 + 0.05*np.sin(2*np.pi*0.13*tt) + 0.02*np.sin(2*np.pi*0.7*tt)
    bed *= flutter
    # 淡入淡出
    fi = int(0.6*SR)
    bed[:fi] *= np.linspace(0, 1, fi)
    fo = int((DURATION-0.4)*SR)
    bed[fo:] *= np.linspace(1, 0, N-fo)
    return bed

# ---------------- tape hiss（全程，29.7 戛然） ----------------
def build_hiss():
    n_hiss = int(29.7 * SR)
    h = np.random.default_rng(1).standard_normal(n_hiss)
    h = lowpass(h, 6000, order=2)
    h *= 0.010   # -40dB
    bed = np.zeros(N)
    bed[:n_hiss] = h
    return bed

# ---------------- 主 ----------------
def main():
    bed = build_music() + build_hiss()

    cues = json.load(open(os.path.join(D, 'sfx_cues.json')))
    for c in cues:
        t = c['t']; s = c['s']
        if s == 'osdbeep':
            place(osdbeep(), t, 0.18, 0.0)
        elif s == 'tear':
            place(tear(), t, 0.5, -0.2)
        elif s == 'dropout':
            place(dropout_crackle(), t, 0.35, 0.3)
        elif s == 'rewind':
            dur = c.get('dur', 1.0)
            place(rewind_sweep(dur), t - dur, 0.5, 0.0)
        elif s == 'hisscut':
            pass  # hiss 已在 29.7 截断

    stereo = np.stack([L, R], axis=1)
    # 软限幅 + 峰值 -1dBFS
    peak = np.max(np.abs(stereo)) + 1e-9
    stereo = np.tanh(stereo / peak * 1.2)
    stereo = stereo / np.max(np.abs(stereo)) * 10**(-1/20)

    import wave
    pcm = (np.clip(stereo, -1, 1) * 32767).astype(np.int16)
    with wave.open(os.path.join(D, 'bed.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    rms = 20*np.log10(np.sqrt(np.mean(stereo**2)) + 1e-9)
    print(f'bed.wav written  RMS={rms:.1f} dBFS  peak={20*np.log10(np.max(np.abs(stereo))):.2f} dBFS')

if __name__ == '__main__':
    main()
