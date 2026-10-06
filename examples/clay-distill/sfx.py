#!/usr/bin/env python3
# sfx.py —— 读 sfx_cues.json 合成音效 + 怪趣办公室小品配乐（尤克里里/钟琴/口哨,104BPM），输出 bed.wav。
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
    return signal.lfilter([1 - a], [1, -a], x)
def bandpass(x, lo, hi):
    lo = max(20.0, lo); hi = min(SR / 2 - 100, hi)
    sos = signal.butter(4, [lo / (SR / 2), hi / (SR / 2)], btype='band', output='sos')
    return signal.sosfilt(sos, x)
def lowpass(x, c):
    sos = signal.butter(4, min(c, SR / 2 - 100) / (SR / 2), output='sos')
    return signal.sosfilt(sos, x)
def smooth_env(x): return np.clip(np.sin(np.clip(x, 0, 1) * np.pi), 0, 1)

# ---------------- 黏土音色 ----------------
def s_room(p=1.0):
    y = onepole_lp(white(N), 2600)
    y2 = onepole_lp(white(N), 400)
    return (y * 0.5 + y2 * 0.5) * 0.02 * p

def s_hum(dur=1.0, p=1.0):
    t = t_arr(dur)
    y = np.zeros(len(t))
    for hh, a in [(1, 1), (2, 0.45), (3, 0.22)]:
        y += np.sin(2 * np.pi * 72 * hh * t) * a
    return y * 0.10 * p  # 炼化炉低鸣

def s_suck(dur, p=1.0):
    # 带通噪声下行（吸技能）
    t = t_arr(dur)
    lo = 1800 * (1 - t / dur) + 300
    hi = lo * 1.8
    out = np.zeros(len(t))
    seg = 2048
    for s in range(0, len(t), seg):
        e = min(len(t), s + seg)
        n = white(e - s)
        out[s:e] = bandpass(n, lo[s], hi[s]) * 0.9
    env = smooth_env(np.linspace(0, 1, len(t)) * 0 + np.minimum(t / 0.15, 1.0))
    env = np.minimum(env, 1.0)
    return out * env * 0.5 * p

def s_boop(p=1.0):
    # 80Hz 啵
    d = 0.16; t = t_arr(d)
    f = 130 - 60 * np.clip(t / d, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 22)
    return y * 0.9 * p

def s_tokending(p=1.0):
    # 钟琴上行五度：C5 -> G5
    d = 0.5
    def bell(f):
        tt = t_arr(d)
        y = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9)
        y += np.sin(2 * np.pi * f * 2.76 * tt) * 0.3 * np.exp(-tt * 14)
        return y
    y = bell(523.25)
    y[int(0.12 * SR):] += bell(783.99)[:len(y) - int(0.12 * SR)]
    return y * 0.7 * p

def s_knead(dur, p=1.0):
    # 揉黏土：低通噪声 AM
    t = t_arr(dur)
    n = lowpass(white(len(t)), 500)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * t)
    return n * am * 0.5 * p

def s_smash(p=1.0):
    # 拍扁：120->40Hz 低频下压
    d = 0.5; t = t_arr(d)
    f = 120 - 80 * np.clip(t / 0.3, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
    nb = lowpass(white(len(t)), 900) * np.exp(-t * 12)
    return (y * 1.0 + nb * 0.6) * p

def s_low(p=1.0):
    d = 0.9; t = t_arr(d)
    y = np.sin(2 * np.pi * 52 * t) * np.exp(-t * 4.5)
    y += np.sin(2 * np.pi * 38 * t) * np.exp(-t * 3.5) * 0.6
    return y * p

def s_buzz(p=1.0):
    d = 0.4; t = t_arr(d)
    sq = lambda f: np.sign(np.sin(2 * np.pi * f * t))
    y = (sq(150) * 0.5 + sq(159) * 0.5) * 0.5
    env = np.clip(1 - np.clip((t - 0.3) / 0.1, 0, 1), 0, 1)
    return y * env * 0.7 * p

def s_glitch(p=1.0):
    d = 0.18; t = t_arr(d)
    bits = (white(len(t)) > 0).astype(float) * 2 - 1
    gate = (np.sin(2 * np.pi * 170 * t) > 0).astype(float)
    y = bits * gate * 0.4
    y += np.sin(2 * np.pi * (900 + 1400 * t / d) * t) * 0.25
    return y * np.clip(1 - t / d, 0, 1) * 0.7 * p

def s_stamp(p=1.0):
    # 章砸下：200->60Hz + 闷响
    d = 0.35; t = t_arr(d)
    f = 200 - 140 * np.clip(t / 0.15, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 16)
    y += lowpass(white(len(t)), 700) * np.exp(-t * 24) * 0.6
    return y * p

def s_spring(p=1.0):
    d = 0.5; t = t_arr(d)
    phase = 2 * np.pi * (130 * t + (470 / 9) * (1 - np.exp(-9 * t)))
    y = np.sin(phase) * np.exp(-t * 5)
    return y * 0.7 * p

def s_ding(p=1.0):
    d = 1.4; t = t_arr(d)
    base = 740
    ratios = [1, 2.0, 2.42, 3.0, 4.46]; amps = [1, 0.5, 0.34, 0.22, 0.12]
    y = np.zeros(len(t))
    for r, a in zip(ratios, amps):
        y += np.sin(2 * np.pi * base * r * t) * a * np.exp(-t * (3.2 + r))
    return y * 0.7 * p

SYNTH = {
    'room': lambda c: s_room(), 'hum': lambda c: s_hum(c.get('dur', 1)),
    'suck': lambda c: s_suck(c.get('dur', 5)), 'boop': lambda c: s_boop(),
    'tokending': lambda c: s_tokending(), 'knead': lambda c: s_knead(c.get('dur', 4)),
    'smash': lambda c: s_smash(), 'low': lambda c: s_low(), 'buzz': lambda c: s_buzz(),
    'glitch': lambda c: s_glitch(), 'stamp': lambda c: s_stamp(), 'spring': lambda c: s_spring(),
    'ding': lambda c: s_ding(),
}

# ---------------- 配乐：怪趣办公室小品 104BPM ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    BEAT = 60 / 104
    S16 = BEAT / 4
    t0 = 0.6; end = 29.6

    def hz(n): return 440 * 2 ** ((n - 69) / 12)

    def ukulele(f, d=0.28):
        t = t_arr(d)
        ph = 2 * np.pi * f * t
        y = (np.mod(ph / (2 * np.pi), 1) * 2 - 1)      # 锯齿
        y = bandpass(y, 800, 2600)
        env = smooth_env(np.clip(t / 0.01, 0, 1)) * np.exp(-t * 6)
        return y * env * 0.45

    def glock(f, d=0.55):
        t = t_arr(d)
        y = np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
        y += np.sin(2 * np.pi * f * 2.76 * t) * 0.35 * np.exp(-t * 12)
        y += np.sin(2 * np.pi * f * 5.4 * t) * 0.12 * np.exp(-t * 20)
        return y * 0.5

    def whistle(f, d=0.5):
        t = t_arr(d)
        vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t)
        y = np.sin(2 * np.pi * f * vib * t)
        y += bandpass(white(len(t)), 1200, 3000) * 0.06
        env = smooth_env(np.clip(t / 0.08, 0, 1)) * np.exp(-np.clip(t - d, 0, None) * 2)
        return y * env * 0.35

    def bass_note(f, d=0.4):
        t = t_arr(d)
        ph = 2 * np.pi * f * t
        y = (np.mod(ph / (2 * np.pi), 1) * 2 - 1)
        y = onepole_lp(y, 500)
        return y * np.clip(1 - t / d, 0, 1) ** 0.5 * 0.5

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    # 和弦（MIDI）：C 大调 bouncy
    CH_C = [hz(60), hz(64), hz(67)]
    CH_F = [hz(53), hz(57), hz(60)]
    CH_G = [hz(55), hz(59), hz(62)]
    # A 小调段
    CH_Am = [hz(57), hz(60), hz(64)]
    CH_Am7 = [hz(57), hz(60), hz(64), hz(67)]

    def section(ts):
        if ts < 18.0: return 'C'
        if ts < 26.0: return 'Am'
        return 'end'

    i = 0
    while t0 + i * S16 < end:
        ts = t0 + i * S16
        beat = i % 4
        bar = (i // 4) % 8
        st = section(ts)

        if st == 'C':
            # C - F - G - C 每两小节一换
            chords = [CH_C, CH_C, CH_F, CH_G]
            ch = chords[(bar // 2) % 4]
            if beat == 0:
                for f in ch: place(ukulele(f), ts, 0.5, -0.1)
                place(bass_note(hz(36), 0.4), ts, 0.5)
            if beat == 2:
                for f in ch: place(ukulele(f * 1.0, 0.18), ts, 0.35, 0.1)
            # 钟琴旋律（五声音阶蹦跳）
            mel = [72, 76, 79, 81, 79, 76, 74, 72]
            if beat in (0, 2):
                note = mel[(bar + beat) % len(mel)]
                place(glock(hz(note)), ts, 0.4, 0.15 if beat == 2 else -0.15)
        elif st == 'Am':
            chords = [CH_Am, CH_Am, CH_F, CH_G]
            ch = chords[(bar // 2) % 4]
            if beat == 0:
                place(bass_note(hz(33), 0.6), ts, 0.7)  # 低音提琴
            if beat == 0 or beat == 2:
                for f in ch: place(ukulele(f, 0.22), ts, 0.35, -0.1)
            # 钟琴小调句
            mel = [69, 72, 76, 72, 69, 65, 69, 72]
            if beat in (0, 2):
                note = mel[(bar + beat) % len(mel)]
                place(glock(hz(note)), ts, 0.35, 0.1)
        else:
            # 结尾回 C：呆萌哨音下行
            if beat == 0 and bar == 0:
                place(ukulele(hz(60), 0.4), ts, 0.5)
            if bar == 0:
                whistle_line = [72, 71, 69, 67]
                wn = whistle_line[beat // 1]
                place(whistle(hz(wn), 0.5), ts, 0.5, 0.0)
        i += 1

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
        place(y, c['t'], 0.9, 0.0)

    mL, mR = build_music()
    L += mL; R += mR

    stereo = np.stack([L, R], axis=1)
    peak = np.max(np.abs(stereo))
    stereo = np.tanh(stereo / (peak + 1e-9) * 1.25)
    stereo = stereo / np.max(np.abs(stereo)) * (10 ** (-1 / 20))
    return stereo[:N]

import wave
def write_wav(stereo, name):
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    with wave.open(os.path.join(os.path.dirname(__file__), name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', name, 'len', len(stereo) / SR)

if __name__ == '__main__':
    write_wav(build(), 'bed.wav')
