#!/usr/bin/env python3
# sfx.py —— 自费 Token 上岗记：80s synth-funk/chip-pop，纯代码合成。读 sfx_cues.json → 合成两版 WAV。
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
    b = [1 - a]; ac = [1, -a]
    return signal.lfilter(b, ac, x)

def bandpass(x, lo, hi):
    lo = max(20.0, lo); hi = min(SR / 2 - 100, hi)
    sos = signal.butter(4, [lo / (SR / 2), hi / (SR / 2)], btype='band', output='sos')
    return signal.sosfilt(sos, x)

def lowpass(x, c):
    sos = signal.butter(4, min(c, SR / 2 - 100) / (SR / 2), output='sos')
    return signal.sosfilt(sos, x)

def hz(n): return 440 * 2 ** ((n - 69) / 12)

# ---------------- 基础音色 ----------------
def s_click(p=1.0):
    d = 0.06; t = t_arr(d)
    f = 1400 - 700 * (t / d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 42)
    y += white(len(t)) * np.exp(-t * 130) * 0.5
    return y * 0.8 * p

def s_tick(p=1.0, v=1.0):
    d = 0.05; t = t_arr(d)
    y = np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 60)
    y += white(len(t)) * np.exp(-t * 90) * 0.35
    return y * 0.7 * p * v

def s_pop(p=1.0):
    d = 0.13; t = t_arr(d)
    f = 240 + 520 * np.sin(np.clip(t / d, 0, 1) * np.pi / 2)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 17)
    y += white(len(t)) * np.exp(-t * 40) * 0.18
    return y * 0.85 * p

def s_slam(p=1.0):
    d = 0.5; t = t_arr(d)
    f = 130 - 92 * np.clip(t / 0.35, 0, 1)
    low = np.sin(2 * np.pi * f * t) * np.exp(-t * 9)
    nb = lowpass(white(len(t)) * np.exp(-t * 30), 2200)
    body = lowpass(white(len(t)) * np.exp(-t * 14), 400)
    return (low * 0.9 + nb * 0.8 + body * 0.7) * p

def s_burst(p=1.0):
    d = 0.5; t = t_arr(d)
    hi = bandpass(white(len(t)) * np.exp(-t * 8), 800, 9000)
    rum = np.sin(2 * np.pi * 58 * t) * np.exp(-t * 6)
    mid = lowpass(white(len(t)) * np.exp(-t * 10), 900)
    return (hi * 0.7 + rum * 0.8 + mid * 0.7) * p

def s_whoosh(dur, p=1.0):
    seg = 0.045; nseg = max(2, int(dur / seg)); out = np.zeros(0)
    fl = np.geomspace(220, 2600, nseg)
    for i in range(nseg):
        L = int(seg * SR * 1.6); x = bandpass(white(L), fl[i] * 0.5, fl[i] * 1.5)
        w = np.hanning(L)
        if i == 0: out = x * w
        else:
            ov = L // 2
            out = np.concatenate([out, np.zeros(L - ov)])
            out[i * (L - ov): i * (L - ov) + L] += x * w
    env = np.linspace(0.2, 1.0, len(out)) ** 1.4
    return out * env * 0.8 * p

def s_buzz(p=1.0):
    d = 0.6; t = t_arr(d)
    sq = lambda f: np.sign(np.sin(2 * np.pi * f * t))
    y = (sq(150) * 0.5 + sq(159) * 0.5) * 0.5
    env = np.clip(1 - np.clip((t - 0.5) / 0.1, 0, 1), 0, 1)
    return y * env * 0.8 * p

def s_ding(p=1.0):
    d = 1.7; t = t_arr(d); base = 740
    ratios = [1, 2.0, 2.42, 3.0, 4.46]; amps = [1, 0.5, 0.34, 0.22, 0.12]
    y = np.zeros(len(t))
    for r, a in zip(ratios, amps):
        y += np.sin(2 * np.pi * base * r * t) * a * np.exp(-t * (3.2 + r))
    return y * 0.8 * p

def s_tear(p=1.0):
    d = 0.4; t = t_arr(d)
    y = bandpass(white(len(t)), 1400, 8000)
    env = np.clip(np.sin(np.clip(t / d, 0, 1) * np.pi), 0, 1)
    return y * env * 0.8 * p

def s_spring(p=1.0):
    d = 0.5; t = t_arr(d)
    phase = 2 * np.pi * (130 * t + (470 / 9) * (1 - np.exp(-9 * t)))
    wob = 0.6 + 0.4 * np.sin(2 * np.pi * 18 * t) * np.exp(-t * 6)
    return np.sin(phase) * np.exp(-t * 5) * wob * 0.8 * p

def s_snap(p=1.0):
    d = 0.13; t = t_arr(d)
    y = bandpass(white(len(t)) * np.exp(-t * 60), 1200, 7000)
    e = np.exp(-t * 90); e += np.where(t >= 0.06, 0.7 * np.exp(-(t - 0.06) * 90), 0)
    return y * e * 0.8 * p

def s_room(p=1.0):
    y = onepole_lp(white(N), 2600)
    y2 = onepole_lp(white(N), 400)
    return (y * 0.5 + y2 * 0.5) * 0.018 * p

# ---------------- 本片专用音色 ----------------
def s_chach(p=1.0):
    # 收银机 cha-ching：机械咔 + 金属铃 + 钱箱弹开
    d = 0.4; t = t_arr(d)
    clack = bandpass(white(len(t)), 2200, 6500) * np.exp(-t * 45) * 0.5
    bell = (np.sin(2 * np.pi * 1318 * t) * np.exp(-t * 20) * 0.6
            + np.sin(2 * np.pi * 1976 * t) * np.exp(-t * 30) * 0.4)
    drawer = (np.sin(2 * np.pi * 220 * t) * np.exp(-t * 14) * 0.3
              + bandpass(white(len(t)), 300, 900) * np.exp(-t * 16) * 0.4)
    # 第二声“找零”铃
    bell2 = np.where(t >= 0.18, np.sin(2 * np.pi * 1568 * (t - 0.18)) * np.exp(-(t - 0.18) * 25) * 0.5, 0.0)
    return (clack + bell + drawer + bell2) * p

def s_coins(p=1.0, n=4, roll=0):
    # 硬币落罐：n 声金属弹跳，音高递减；roll=1 时为连续滚动
    n = int(n)
    d = 0.5; t = t_arr(d); out = np.zeros(len(t))
    for i in range(n):
        start = int((0.02 + i * 0.07) * SR)
        f = 1600 - i * 160
        seg_t = t_arr(0.12)
        ping = (np.sin(2 * np.pi * f * seg_t) * np.exp(-seg_t * 55)
                + np.sin(2 * np.pi * f * 2.76 * seg_t) * np.exp(-seg_t * 75) * 0.4)
        seg = int(0.12 * SR)
        if start + seg > len(out): break
        out[start:start + seg] += ping * 0.5
    if roll:
        rt = t_arr(1.0)
        shake = bandpass(white(len(rt)), 2500, 7000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 28 * rt)))
        env = np.sin(np.clip(rt / 1.0, 0, 1) * np.pi)
        out2 = shake * env * 0.4
        return np.concatenate([out, out2]) * p
    return out * p

def s_blip(pitch=1.0):
    # 8-bit 数字跳 blip，音高随档升
    d = 0.1; t = t_arr(d)
    f = 480 * pitch
    sq = np.sign(np.sin(2 * np.pi * f * t))
    sq2 = np.sign(np.sin(2 * np.pi * f * 1.5 * t))
    return (sq * 0.5 + sq2 * 0.25) * np.exp(-t * 28) * 0.6

def s_scratch(p=1.0):
    # 唱片刮擦：带通噪声 + 来回抖动
    d = 0.45; t = t_arr(d)
    nb = bandpass(white(len(t)), 800, 4200)
    wob = 0.5 + 0.5 * np.sin(2 * np.pi * 13 * t)
    sweep = np.linspace(1.0, 0.35, len(t))
    env = np.sin(np.clip(t / d, 0, 1) * np.pi)
    return nb * wob * sweep * env * 0.9 * p

def s_boom(p=1.0):
    # 低音下坠 boom
    d = 1.0; t = t_arr(d)
    f = 95 * np.exp(-t * 3.2) + 30
    low = np.sin(2 * np.pi * f * t) * np.exp(-t * 4.2)
    body = lowpass(white(len(t)), 320) * np.exp(-t * 5.5) * 0.9
    return (low + body) * 1.1 * p

def s_step(p=1.0):
    d = 0.09; t = t_arr(d)
    y = lowpass(white(len(t)), 420) * np.exp(-t * 30)
    y += np.sin(2 * np.pi * 120 * t) * np.exp(-t * 40) * 0.4
    return y * 0.5 * p

SYNTH = {
    'click': lambda c: s_click(), 'tick': lambda c: s_tick(v=c.get('v', 1.0)),
    'pop': lambda c: s_pop(), 'slam': lambda c: s_slam(), 'burst': lambda c: s_burst(),
    'whoosh': lambda c: s_whoosh(c.get('dur', 0.4)), 'buzz': lambda c: s_buzz(),
    'ding': lambda c: s_ding(), 'tear': lambda c: s_tear(), 'spring': lambda c: s_spring(),
    'snap': lambda c: s_snap(), 'chach': lambda c: s_chach(),
    'coins': lambda c: s_coins(n=c.get('n', 4), roll=c.get('roll', 0)),
    'blip': lambda c: s_blip(pitch=c.get('pitch', 1.0)),
    'scratch': lambda c: s_scratch(), 'boom': lambda c: s_boom(), 'step': lambda c: s_step(),
}

# ---------------- 混音 ----------------
def build(music=False):
    L = np.zeros(N); R = np.zeros(N)
    def place(y, t_start, gain, pan=0.0):
        i0 = int(round(t_start * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a); R[i0:ie] += y * gain * np.sin(a)

    cues = json.load(open(os.path.join(os.path.dirname(__file__), 'sfx_cues.json')))
    for idx, c in enumerate(cues):
        name = c['s']
        if name == 'room':
            place(s_room(), 0, 1.0, 0); continue
        if name not in SYNTH: continue
        y = SYNTH[name](c)
        end_aligned = name in ('whoosh',)
        t_start = c['t'] - (c.get('dur', 0) if end_aligned else 0)
        pan = 0.0
        if name in ('whoosh', 'burst', 'scratch'): pan = 0.28 if idx % 2 else -0.28
        if name == 'coins': pan = 0.3 if idx % 2 else -0.3
        place(y, t_start, 0.9, pan)

    if music:
        mL, mR = build_music()
        L += mL; R += mR

    # 反转短静默（含底噪）
    a0 = int(25.45 * SR); a1 = int(25.78 * SR)
    L[a0:a1] = 0; R[a0:a1] = 0

    # 软限幅 + 峰值 -1dBFS（先查峰值/RMS）
    stereo = np.stack([L, R], axis=1)
    peak = float(np.max(np.abs(stereo)))
    rms = float(np.sqrt(np.mean(stereo ** 2)))
    peak_t = float(np.argmax(np.abs(stereo)) / SR / 2)
    print(f'  [mix] peak={peak:.3f} @{peak_t:.2f}s  rms={rms:.4f}')
    stereo = np.tanh(stereo / (peak + 1e-9) * 1.25)
    stereo = stereo / np.max(np.abs(stereo)) * (10 ** (-1 / 20))
    stereo = stereo[:N]
    return stereo

# ---------------- 80s synth-funk 配乐（120 BPM） ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    S16 = 0.125  # 16 分音符（120BPM）
    t0 = 0.6; end = 29.4

    def kick():
        d = 0.26; t = t_arr(d); f = 150 * np.exp(-t * 18) + 45
        return np.sin(2 * np.pi * f * t) * np.exp(-t * 9)
    def clap():
        d = 0.22; t = t_arr(d)
        y = bandpass(white(len(t)), 1100, 7000) * np.exp(-t * 16)
        y += np.sin(2 * np.pi * 200 * t) * np.exp(-t * 24) * 0.4
        return y
    def hat(op=1.0):
        d = 0.05; t = t_arr(d)
        return bandpass(white(len(t)), 7000, 13000) * np.exp(-t * 65) * 0.4 * op
    def tamb(op=1.0):
        d = 0.09; t = t_arr(d)
        return bandpass(white(len(t)), 5000, 10000) * np.exp(-t * 40) * 0.35 * op
    def bass_note(f, d):
        t = t_arr(d)
        ph = 2 * np.pi * f * t
        sq = np.sign(ph / (2 * np.pi) * 2 - 1)
        y = sq * 0.6 + np.sin(2 * np.pi * f * t) * 0.4
        y = onepole_lp(y, 900)
        return y * np.clip(1 - t / d, 0, 1) ** 0.5
    def ep_stab(freqs, d=0.18):
        t = t_arr(d); y = np.zeros(len(t))
        for f in freqs:
            y += np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.005 * t)
        y = onepole_lp(y, 2200)
        env = np.exp(-t * 9)
        return y / len(freqs) * env

    CH = {
        'Cm': [hz(48), hz(55), hz(60)],
        'Fm': [hz(41), hz(48), hz(53)],
        'G7': [hz(43), hz(50), hz(55)],
        'Ab': [hz(44), hz(51), hz(56)],
    }

    def section(t):
        if t < 3.0: return 'intro'
        if t < 8.0: return 'funk'
        if t < 13.0: return 'drive'
        if t < 18.0: return 'funk'
        if t < 23.0: return 'double'
        if t < 25.0: return 'tension'
        return 'end'

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a); R[i0:ie] += y * gain * np.sin(a)

    chorder = ['Cm', 'Cm', 'Fm', 'G7']
    i = 0
    while t0 + i * S16 < end:
        ts = t0 + i * S16
        beat = i % 4          # 16th 内位置
        bar = (i // 4) % 4
        st = section(ts)
        chord = CH[chorder[bar]]

        if st == 'intro':
            if beat == 0: place(bass_note(hz(36), 0.4), ts, 0.6)
            place(hat(0.4), ts, 0.3)
        elif st == 'funk':
            if beat == 0: place(kick(), ts, 1.0)
            if beat == 2: place(clap(), ts, 0.8)       # backbeat
            place(hat(0.5), ts, 0.4)
            if beat in (1, 3): place(tamb(0.5), ts, 0.35)
            if beat == 0: place(bass_note(hz(36), 0.22), ts, 0.8)
            if beat == 2: place(bass_note(hz(36), 0.22), ts, 0.7)
            if beat == 0: place(ep_stab(chord), ts, 0.45, -0.2)
        elif st == 'drive':
            if beat == 0: place(kick(), ts, 1.0)
            if beat == 2: place(clap(), ts, 0.9)
            place(hat(0.6), ts, 0.5)
            if beat in (0, 2): place(bass_note(hz(36), 0.12), ts, 0.8)
            if beat in (1, 3): place(bass_note(hz(43), 0.12), ts, 0.6)
            if beat in (0, 2): place(ep_stab(chord, 0.14), ts, 0.4, 0.2)
        elif st == 'double':
            if beat == 0: place(kick(), ts, 1.0)
            if beat == 2: place(clap(), ts, 0.9)
            place(hat(0.7), ts, 0.55)
            place(bass_note(hz(36), 0.10), ts, 0.8)
            if beat in (0, 2): place(ep_stab(chord, 0.12), ts, 0.45, -0.2)
        elif st == 'tension':
            place(hat(0.35), ts, 0.3)
            if beat == 0: place(bass_note(hz(24), 0.5), ts, 0.5)
        elif st == 'end':
            if beat == 0 and (i // 4) % 2 == 0:
                place(ep_stab(CH['G7'], 1.4), ts, 0.5)
            place(tamb(0.3), ts, 0.2)
        i += 1
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
    print('--- pure SFX ---')
    write_wav(build(music=False), 'sfx.wav')
    print('--- with music ---')
    write_wav(build(music=True), 'sfx_music.wav')
