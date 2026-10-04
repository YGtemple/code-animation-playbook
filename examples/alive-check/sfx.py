#!/usr/bin/env python3
# sfx.py —— 《活人感鉴定局》极简电子 + lo-fi，BPM 96。纯代码合成（numpy/scipy）。
# 薄滤波方波 pluck 主旋律 + 极轻 808 + 稀疏 hihat + 单音圆角钢琴。
import json, os
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(round(DUR * SR))
rng = np.random.default_rng(20261004)

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

def hz(n): return 440 * 2 ** ((n - 69) / 12)

# ---------------- 音色 ----------------
def s_click(p=1.0):  # 对勾/滑杆短 click
    d = 0.05; t = t_arr(d)
    y = np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 70)
    y += white(len(t)) * np.exp(-t * 120) * 0.4
    return y * 0.6 * p

def s_type(p=1.0):  # 打字键
    d = 0.045; t = t_arr(d)
    y = bandpass(white(len(t)), 1100, 5200) * np.exp(-t * 90)
    y += np.sin(2 * np.pi * 520 * t) * np.exp(-t * 80) * 0.25
    return y * 0.5 * p

def s_del(p=1.0):  # 退格（略低）
    d = 0.05; t = t_arr(d)
    y = bandpass(white(len(t)), 700, 2600) * np.exp(-t * 80)
    y += np.sin(2 * np.pi * 360 * t) * np.exp(-t * 70) * 0.3
    return y * 0.5 * p

def s_tick(p=1.0):
    d = 0.04; t = t_arr(d)
    return (np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 90)) * 0.35 * p

def s_pluck(f=440, p=1.0):  # 薄滤波方波 pluck
    d = 0.5; t = t_arr(d)
    ph = 2 * np.pi * f * t
    sq = np.mod(ph / (2 * np.pi), 1) * 2 - 1
    y = sq * np.exp(-t * 9)
    y = lowpass(y, 2600)
    y += np.sin(ph) * 0.3 * np.exp(-t * 11)
    return y * 0.5 * p

def s_arp(p=1.0):  # 分数：上行小三度琶音（三个 pluck）
    notes = [72, 75, 79]  # C5 Eb5 G5 小三度叠
    out = np.zeros(int(0.6 * SR))
    for i, n in enumerate(notes):
        y = s_pluck(hz(n), 0.8)
        i0 = int(i * 0.07 * SR)
        out[i0:i0 + len(y)] += y[:len(out) - i0]
    return out * 0.7 * p

def s_thud(p=1.0):  # 印章低频 thud
    d = 0.45; t = t_arr(d)
    f = 120 - 60 * np.clip(t / 0.3, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 9)
    y += lowpass(white(len(t)), 300) * np.exp(-t * 22) * 0.5
    return y * p

def s_paper(dur=0.3, p=1.0):  # 纸张 whoosh（结束点对齐）
    t = t_arr(dur)
    nb = white(len(t))
    nb = bandpass(nb, 900, 4200)
    env = np.sin(np.clip(t / dur, 0, 1) * np.pi) ** 1.5
    return nb * env * 0.5 * p

def s_whoosh(dur=0.35, p=1.0):  # 判词框滑入
    t = t_arr(dur)
    nb = white(len(t)); nb = bandpass(nb, 500, 3200)
    env = (t / dur) ** 1.3
    return nb * env * 0.45 * p

def s_pop(p=1.0):  # 贴纸飞入
    d = 0.16; t = t_arr(d)
    f = 300 + 500 * np.sin(np.clip(t / d, 0, 1) * np.pi / 2)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 16)) * 0.7 * p

def s_slap(p=1.0):  # 拍桌
    d = 0.16; t = t_arr(d)
    y = bandpass(white(len(t)), 200, 1800) * np.exp(-t * 30)
    y += np.sin(2 * np.pi * 90 * t) * np.exp(-t * 40) * 0.8
    return y * p

def s_warn(p=1.0):  # 系统警告蓝 beep
    d = 0.3; t = t_arr(d)
    beep = np.sin(2 * np.pi * 880 * t) * np.exp(-t * 6)
    beep += np.sin(2 * np.pi * 880 * t + np.pi / 2) * 0.3
    return beep * 0.5 * p

def s_dong(p=1.0):  # 反转单一低音"咚"
    d = 1.2; t = t_arr(d)
    y = np.sin(2 * np.pi * 72 * t) * np.exp(-t * 3.5)
    y += np.sin(2 * np.pi * 108 * t) * np.exp(-t * 5) * 0.5
    y += lowpass(white(len(t)), 200) * np.exp(-t * 8) * 0.3
    return y * p

def s_ding(p=1.0):  # 署名轻 ding
    d = 1.2; t = t_arr(d)
    y = np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 4.5)
    y += np.sin(2 * np.pi * 1980 * t) * np.exp(-t * 7) * 0.3
    return y * 0.4 * p

def s_bubble(p=1.0):
    d = 0.12; t = t_arr(d)
    f = 500 + 300 * np.sin(np.clip(t / d, 0, 1) * np.pi / 2)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 22)) * 0.5 * p

def s_gray(p=1.0):
    d = 0.18; t = t_arr(d)
    y = bandpass(white(len(t)), 400, 1400) * np.exp(-t * 14)
    return y * 0.35 * p

def s_flip(p=1.0):
    d = 0.25; t = t_arr(d)
    y = bandpass(white(len(t)), 800, 3000) * np.sin(np.clip(t / d, 0, 1) * np.pi)
    return y * 0.4 * p

def s_token(p=1.0):
    d = 0.25; t = t_arr(d)
    y = np.sin(2 * np.pi * 1560 * t) * np.exp(-t * 12)
    y += np.sin(2 * np.pi * 2093 * t) * np.exp(-t * 18) * 0.5
    return y * 0.4 * p

def s_tag(p=1.0):
    d = 0.1; t = t_arr(d)
    return (bandpass(white(len(t)), 2000, 6000) * np.exp(-t * 40)) * 0.4 * p

def s_fadein(p=1.0):
    d = 1.0; t = t_arr(d)
    y = lowpass(white(len(t)), 800) * (t / d)
    return y * 0.08 * p

SYNTH = {
    'click': lambda c: s_click(), 'type': lambda c: s_type(), 'del': lambda c: s_del(),
    'tick': lambda c: s_tick(), 'pluck': lambda c: s_pluck(hz(72)),
    'arp': lambda c: s_arp(), 'thud': lambda c: s_thud(),
    'paper': lambda c: s_paper(c.get('dur', 0.3)),
    'whoosh': lambda c: s_whoosh(c.get('dur', 0.35)), 'pop': lambda c: s_pop(),
    'slide': lambda c: s_whoosh(0.3), 'slap': lambda c: s_slap(), 'warn': lambda c: s_warn(),
    'dong': lambda c: s_dong(), 'ding': lambda c: s_ding(), 'bubble': lambda c: s_bubble(),
    'gray': lambda c: s_gray(), 'flip': lambda c: s_flip(), 'token': lambda c: s_token(),
    'tag': lambda c: s_tag(), 'fadein': lambda c: s_fadein(), 'check': lambda c: s_click(),
}

# ---------------- 混音 ----------------
def build(music=False):
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
        if name not in SYNTH: continue
        y = SYNTH[name](c)
        end_aligned = name in ('whoosh', 'paper', 'slide')
        t_start = c['t'] - (c.get('dur', 0) if end_aligned else 0)
        pan = 0.25 if idx % 2 else -0.25
        place(y, t_start, 0.85, pan)

    if music:
        mL, mR = build_music()
        L += mL; R += mR

    # 反转前全曲戛然：24.5–25.0 整轨（含音乐床）归零（真留白）
    a0 = int(24.5 * SR); a1 = int(25.0 * SR)
    L[a0:a1] = 0; R[a0:a1] = 0

    # 软限幅 + 峰值 -1dBFS
    stereo = np.stack([L, R], axis=1)
    peak = np.max(np.abs(stereo))
    rms = np.sqrt(np.mean(stereo ** 2))
    print(f'  [mix] peak={peak:.3f} rms={rms:.4f}')
    stereo = np.tanh(stereo / (peak + 1e-9) * 1.25)
    stereo = stereo / np.max(np.abs(stereo)) * (10 ** (-1 / 20))
    stereo = stereo[:N]
    return stereo

# ---------------- 配乐（96 BPM lo-fi） ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    BPM = 96.0
    beat = 60 / BPM          # 0.625s
    S16 = beat / 4           # 16分 0.15625
    t0 = 2.5
    end = 24.5               # 反转前戛然

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    def kick808():
        d = 0.4; t = t_arr(d); f = 70 * np.exp(-t * 10) + 38
        return np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
    def hat(op=1.0):
        d = 0.05; t = t_arr(d)
        return bandpass(white(len(t)), 7000, 12000) * np.exp(-t * 70) * 0.35 * op
    def pluck_note(f, d=0.4):
        t = t_arr(d); ph = 2 * np.pi * f * t
        sq = np.mod(ph / (2 * np.pi), 1) * 2 - 1
        y = sq * np.exp(-t * 10); y = lowpass(y, 2200)
        return y * 0.32
    def piano_note(f, d=0.9):
        t = t_arr(d)
        y = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.5)
        y += np.sin(2 * np.pi * f * 2 * t) * 0.3 * np.exp(-t * 5)
        return y * 0.3

    # lo-fi 进行：Cmaj7 - Am7 - Fmaj7 - G6 （稀疏）
    CH = [[hz(60), hz(64), hz(67), hz(71)],
          [hz(57), hz(60), hz(64), hz(67)],
          [hz(53), hz(57), hz(60), hz(64)],
          [hz(55), hz(59), hz(62), hz(67)]]
    melody = [72, 76, 79, 84, 79, 76, 74, 72]  # 薄方pluck 主旋律

    i = 0
    while t0 + i * S16 < end:
        ts = t0 + i * S16
        beat_pos = i % 4       # 16分在拍内
        bar = (i // 4) % 4     # 和弦
        # 极轻 808：每小节第1拍
        if beat_pos == 0: place(kick808(), ts, 0.5, 0)
        # 稀疏 hihat：反拍
        if beat_pos == 2: place(hat(), ts, 0.4, 0.15)
        # 圆角钢琴：每小节第3拍一个和弦音
        if beat_pos == 0:
            for f in CH[bar][:2]: place(piano_note(f, 1.1), ts, 0.3, -0.1)
        # 薄方pluck 主旋律：稀疏点缀
        if beat_pos in (1, 3) and (i % 2 == 0):
            mn = melody[(i // 2) % len(melody)]
            place(pluck_note(hz(mn)), ts, 0.35, 0.2)
        i += 1
    return L, R

import wave
def write_wav(stereo, name):
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    path = os.path.join(os.path.dirname(__file__), name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', name, 'len', round(len(stereo) / SR, 6))

if __name__ == '__main__':
    write_wav(build(music=False), 'sfx.wav')
    write_wav(build(music=True), 'sfx_music.wav')
