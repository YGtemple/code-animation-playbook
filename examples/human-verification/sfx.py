#!/usr/bin/env python3
# sfx.py ——《最后一份人类工作》纯代码声音。numpy/scipy 合成，输出 sfx.wav(A纯音效) 与 sfx_music.wav(B配乐)。
# 电子声源：TR-808 鼓组 + saw sub-bass + 16分arp + Juno风pad；BPM110 / Am-F-C-G。
import json, os
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(round(DUR * SR))
rng = np.random.default_rng(20261004)

def white(n, r=rng): return r.standard_normal(n).astype(np.float64)
def t_arr(sec): return np.linspace(0, sec, int(round(sec * SR)), endpoint=False)
def hz(n): return 440 * 2 ** ((n - 69) / 12)

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
def square(f, t): return np.sign(np.sin(2 * np.pi * f * t))
def saw(f, t): return 2 * (t * f - np.floor(0.5 + t * f))

# ============================ 音效音色（电子声源） ============================
def s_blip(p=1.0):                       # 选中 = 880Hz 方波 blip
    d = 0.09; t = t_arr(d)
    y = square(880 * p, t) * 0.5
    y += np.sin(2 * np.pi * 880 * p * t) * 0.4
    return y * np.exp(-t * 38) * 0.8
def s_uiin():
    d = 0.12; t = t_arr(d)
    f = 520 + 480 * (t / d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 20) * 0.5
def s_pass1():
    d = 0.25; t = t_arr(d)
    y = np.sin(2 * np.pi * 880 * t) * np.exp(-t * 12)
    y += np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 18) * 0.6
    return y * 0.6
def s_thump(p=1.0):                      # 盖章 = 滤波噪声 + 220Hz thump
    d = 0.4; t = t_arr(d)
    f = 220 - 90 * np.clip(t / 0.2, 0, 1)
    low = np.sin(2 * np.pi * f * t) * np.exp(-t * 11)
    nb = bandpass(white(len(t)) * np.exp(-t * 30), 800, 5000)
    return (low * 0.9 + nb * 0.6) * p
def s_bitcrash(p=1.0):                   # 故障驳回 = 比特失真
    d = 0.18; t = t_arr(d)
    raw = white(len(t))
    levels = 4
    q = np.round(raw * levels) / levels
    gate = (np.sin(2 * np.pi * 210 * t) > 0).astype(float)
    y = q * gate * 0.6
    y += np.sin(2 * np.pi * (700 + 1200 * t / d) * t) * 0.25
    return y * np.clip(1 - t / d, 0, 1) * p
def s_scatter(p=1.0):
    d = 0.4; t = t_arr(d)
    y = bandpass(white(len(t)), 1200, 7000)
    env = np.clip(t / 0.05, 0, 1) * np.exp(-t * 6)
    return y * env * 0.5 * p
def s_rev_cymbal(p=1.0):                 # 反向镲（上升包络）
    d = 0.7; t = t_arr(d)
    y = bandpass(white(len(t)), 5000, 12000)
    env = (t / d) ** 1.8                   # 反向：渐强
    return y * env * 0.5 * p
def s_stab(p=1.0):                       # 下行小三度方波 stab
    d = 0.32; t = t_arr(d)
    f = np.where(t < 0.12, 440.0, 349.23)  # A4 -> F4 (下行小三度)
    y = square(f, t) * 0.45
    y += np.sin(2 * np.pi * f * t) * 0.3
    env = np.where(t < 0.12, 1.0, np.exp(-(t - 0.12) * 8))
    return y * env * 0.8 * p
def s_plug(p=1.0):
    d = 0.15; t = t_arr(d)
    f = 300 - 150 * np.clip(t / d, 0, 1)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 30) * 0.7
def s_sweep(p=1.0):                      # 上传 = 锯齿 200->2000 扫频
    d = 2.6; t = t_arr(d)
    f = 200 * (10 ** (np.log10(10) * t / d))
    y = saw(f, t)
    y = onepole_lp(y, 5000)
    return y * np.clip(t / 0.2, 0, 1) * np.clip(1 - t / d, 0, 1) * 0.4
def s_updone(p=1.0):
    d = 0.3; t = t_arr(d)
    f = np.where(t < 0.12, 880.0, 1320.0)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 14) * 0.6
def s_hit(p=1.0):                        # 反转 = 失真 hit
    d = 0.6; t = t_arr(d)
    f = 160 - 120 * np.clip(t / 0.3, 0, 1)
    low = np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
    nb = lowpass(white(len(t)) * np.exp(-t * 18), 3000)
    y = np.tanh((low * 1.2 + nb * 0.8) * 2.0)
    return y * p
def s_powerdown(p=1.0):
    d = 0.6; t = t_arr(d)
    f = 600 * (0.5 ** (t / 0.6))
    return saw(f, t) * np.exp(-t * 4) * 0.4
def s_ding(p=1.0):                       # 署名 = 柔和电子 ding
    d = 1.6; t = t_arr(d)
    ratios = [1, 2.0, 2.76, 4.07]
    amps = [1, 0.4, 0.2, 0.1]
    y = np.zeros(len(t))
    for r, a in zip(ratios, amps):
        y += np.sin(2 * np.pi * 660 * r * t) * a * np.exp(-t * (2.5 + r))
    return y * 0.7 * p
def s_whoosh(dur, p=1.0):
    seg = 0.045; nseg = max(2, int(dur / seg)); out = np.zeros(0)
    fl = np.geomspace(220, 2400, nseg)
    for i in range(nseg):
        L = int(seg * SR * 1.6); x = bandpass(white(L), fl[i] * 0.5, fl[i] * 1.5)
        w = np.hanning(L)
        if i == 0: out = x * w
        else:
            ov = L // 2; out = np.concatenate([out, np.zeros(L - ov)])
            out[i * (L - ov): i * (L - ov) + L] += x * w
    return out * np.linspace(0.2, 1.0, len(out)) ** 1.4 * 0.6 * p
def s_riser(dur, p=1.0):
    t = t_arr(dur); f = 300 + 1500 * (t / dur) ** 1.5
    return (np.sin(2 * np.pi * f * t) * 0.5 + bandpass(white(len(t)), 400, 4000) * 0.4) * (t / dur) ** 1.3 * 0.6 * p
def s_hum(dur, p=1.0):
    t = t_arr(dur); y = np.sin(2 * np.pi * 60 * t) * 0.6
    y += np.sin(2 * np.pi * 120 * t) * 0.3
    return y * 0.12 * p
def s_room(p=1.0):
    y = onepole_lp(white(N), 2600)
    y2 = onepole_lp(white(N), 400)
    return (y * 0.5 + y2 * 0.5) * 0.018 * p
def kick_sfx():                          # TR-808 kick（cue 版）
    d = 0.3; t = t_arr(d); f = 150 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 8) * 0.9

SYNTH = {
    'kick': lambda c: kick_sfx(), 'blip': lambda c: s_blip(c.get('pitch', 1.0)), 'uiin': lambda c: s_uiin(),
    'pass1': lambda c: s_pass1(), 'thump': lambda c: s_thump(), 'bitcrash': lambda c: s_bitcrash(),
    'scatter': lambda c: s_scatter(), 'rev_cymbal': lambda c: s_rev_cymbal(), 'stab': lambda c: s_stab(),
    'plug': lambda c: s_plug(), 'sweep': lambda c: s_sweep(), 'updone': lambda c: s_updone(),
    'hit': lambda c: s_hit(), 'powerdown': lambda c: s_powerdown(), 'ding': lambda c: s_ding(),
    'whoosh': lambda c: s_whoosh(c.get('dur', 0.4)), 'riser': lambda c: s_riser(c.get('dur', 0.5)),
    'hum': lambda c: s_hum(c.get('dur', 1)),
}

# ============================ 混音 ============================
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
        if name == 'room':
            place(s_room(), 0, 1.0, 0); continue
        if name not in SYNTH: continue
        y = SYNTH[name](c)
        end_aligned = name in ('whoosh', 'riser')
        t_start = c['t'] - (c.get('dur', 0) if end_aligned else 0)
        pan = 0.0
        if name in ('whoosh', 'rev_cymbal', 'scatter', 'bitcrash'):
            pan = 0.28 if idx % 2 else -0.28
        place(y, t_start, 0.9, pan)

    if music:
        mL, mR = build_music()
        L += mL; R += mR

    # VERDICT 揭示处短促真静默 23.60–24.00
    a0 = int(23.60 * SR); a1 = int(24.00 * SR)
    L[a0:a1] = 0; R[a0:a1] = 0

    # 限幅 + 峰值 -1dBFS
    stereo = np.stack([L, R], axis=1)
    peak = np.max(np.abs(stereo))
    print(f'[pre-norm] peak={peak:.3f} at {np.argmax(np.abs(stereo))/SR:.2f}s  rms={np.sqrt(np.mean(stereo**2)):.4f}')
    assert peak > 0.001, '混音为空！'
    stereo = np.tanh(stereo / (peak + 1e-9) * 1.25)
    stereo = stereo / np.max(np.abs(stereo)) * (10 ** (-1 / 20))
    stereo = stereo[:N]
    return stereo

# ============================ 配乐 BPM110 / Am-F-C-G ============================
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    BPM = 110
    BEAT = 60 / BPM          # 0.54545s
    S16 = BEAT / 4           # 16分
    t0 = 0.0
    end = 28.6

    def kick():
        d = 0.3; t = t_arr(d); f = 150 * np.exp(-t * 18) + 45
        return np.sin(2 * np.pi * f * t) * np.exp(-t * 8)
    def snare():             # gated-reverb 军鼓
        d = 0.25; t = t_arr(d)
        y = bandpass(white(len(t)), 1500, 7000) * np.exp(-t * 22)
        y += np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4
        # gated tail（补零对齐长度）
        tail = bandpass(white(len(t)), 2000, 6000) * 0.3
        tail *= (t > 0.08).astype(float)
        y += tail
        return y
    def hat(op=1.0):
        d = 0.05; t = t_arr(d)
        return bandpass(white(len(t)), 6000, 12000) * np.exp(-t * 70) * 0.4 * op
    def sub_bass(f, d):
        t = t_arr(d); y = saw(f, t) * 0.55 + np.sin(2 * np.pi * f * t) * 0.45
        y = onepole_lp(y, 600)
        return y * np.clip(1 - t / d, 0, 1) ** 0.3
    def arp_note(f, d):
        t = t_arr(d); y = square(f, t) * 0.25 + np.sin(2 * np.pi * f * t) * 0.2
        y = onepole_lp(y, 4000)
        return y * np.exp(-t * 8)
    def pad(freqs, d):       # Juno 风 pad：detune saws 叠加，低通
        t = t_arr(d); y = np.zeros(len(t))
        for f in freqs:
            y += saw(f, t) + saw(f * 1.007, t)
        y = y / (len(freqs) * 2)
        y = onepole_lp(y, 1800)
        env = np.clip(t / 0.4, 0, 1) * np.clip(1 - t / d, 0, 1)
        return y * env * 0.35

    # 和弦（每小节一个）：Am - F - C - G
    CH = [
        [hz(45), hz(57), hz(60), hz(64)],   # Am
        [hz(41), hz(53), hz(57), hz(60)],   # F
        [hz(48), hz(60), hz(64), hz(67)],   # C
        [hz(43), hz(55), hz(59), hz(62)],   # G
    ]
    BASS = [hz(33), hz(29), hz(36), hz(31)]  # A1 F1 C2 G1

    def section(t):
        if t < 3.0: return 'boot'
        if t < 8.0: return 'groove'
        if t < 13.0: return 'groove'
        if t < 18.0: return 'groove'
        if t < 23.0: return 'build'
        if t < 24.0: return 'none'       # verdict 静默
        if t < 27.0: return 'dark'
        return 'outro'

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    i = 0
    while t0 + i * S16 < end:
        ts = t0 + i * S16
        beat = i % 16                  # 小节内 16 分位置
        bar = (i // 16) % 4
        ch = CH[bar]; bass = BASS[bar]
        st = section(ts)

        if st == 'boot':
            if beat == 0: place(kick(), ts, 0.8)
            if beat == 0: place(pad(ch, BEAT * 4), ts, 0.5, 0.0)
        elif st in ('groove', 'build'):
            if beat % 4 == 0: place(kick(), ts, 1.0)
            if beat % 8 == 4: place(snare(), ts, 0.75)       # 2/4
            if beat % 2 == 0: place(hat(0.5), ts, 0.4)
            if beat % 4 == 2: place(hat(0.6), ts, 0.35)
            if beat % 4 == 0: place(sub_bass(bass, BEAT * 0.9), ts, 0.7)
            if st == 'build' or beat % 4 == 0:
                place(arp_note(ch[beat % len(ch)] * (2 if beat % 8 >= 4 else 1), S16 * 0.9), ts, 0.25, 0.2)
            if beat == 0: place(pad(ch, BEAT * 2), ts, 0.25, -0.15)
        elif st == 'dark':
            if beat % 8 == 0: place(kick(), ts, 1.1)
            if beat % 16 == 8: place(snare(), ts, 0.7)
            if beat % 2 == 0: place(hat(0.4), ts, 0.3)
            if beat % 4 == 0: place(sub_bass(bass, BEAT * 1.5), ts, 0.8)
        # outro/none: 无鼓，让位给音效与 ding
        i += 1
    return L, R

# ============================ 输出 ============================
import wave
def write_wav(stereo, name):
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    path = os.path.join(os.path.dirname(__file__), name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    peak = np.max(np.abs(stereo)); rms = np.sqrt(np.mean(stereo ** 2))
    print(f'wrote {name} len={len(stereo)/SR:.3f}s peak_dBFS={20*np.log10(peak):.2f} rms={rms:.4f}')

if __name__ == '__main__':
    write_wav(build(music=False), 'sfx.wav')
    write_wav(build(music=True), 'sfx_music.wav')
