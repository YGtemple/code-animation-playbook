#!/usr/bin/env python3
# sfx.py —— 《电子布洛芬》纯代码声音。1960s 冲浪摇滚 BPM150 + 波普漫画音效。
# 输出 bed.wav（配乐+音效床，立体声）。人声由 mix_voice.py 叠加。
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

def hz(n):  # MIDI -> freq
    return 440 * 2 ** ((n - 69) / 12)

# ---------------- 音效音色 ----------------
def s_blip(p=1.0):           # 气泡 blip：短促上挑
    d = 0.09; t = t_arr(d)
    f = 600 + 800 * (t / d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 30)
    return y * 0.7 * p

def s_pageflip(p=1.0):       # 切格翻页声
    d = 0.18; t = t_arr(d)
    y = white(len(t))
    y = bandpass(y, 1200, 6000)
    env = np.sin(np.clip(t / d, 0, 1) * np.pi) ** 1.5
    return y * env * 0.5 * p

def s_thud(p=1.0):
    d = 0.28; t = t_arr(d)
    f = 160 - 100 * np.clip(t / d, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 12)
    y += lowpass(white(len(t)), 500) * np.exp(-t * 26) * 0.4
    return y * p

def s_gulp(p=1.0):           # 吞药
    d = 0.22; t = t_arr(d)
    f = 300 - 180 * np.clip(t / d, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 14)
    y += bandpass(white(len(t)), 400, 1500) * np.exp(-t * 20) * 0.3
    return y * 0.8 * p

def s_powhit(p=1.0):         # POW：60Hz 下滑重击 + 白噪爆点
    d = 0.45; t = t_arr(d)
    f = 120 - 60 * np.clip(t / 0.3, 0, 1)
    low = np.sin(2 * np.pi * f * t) * np.exp(-t * 9)
    nb = bandpass(white(len(t)), 800, 8000) * np.exp(-t * 22)
    return (low * 1.0 + nb * 0.7) * p

def s_boing(p=1.0):          # 卡通 boing
    d = 0.4; t = t_arr(d)
    phase = 2 * np.pi * (180 * t + (500 / 8) * (1 - np.exp(-8 * t)))
    y = np.sin(phase) * np.exp(-t * 6)
    return y * 0.6 * p

def s_burst(p=1.0):
    d = 0.5; t = t_arr(d)
    hi = bandpass(white(len(t)), 800, 9000) * np.exp(-t * 8)
    rum = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 6)
    return (hi * 0.6 + rum * 0.8) * p

def s_slam(p=1.0):
    d = 0.4; t = t_arr(d)
    f = 120 - 80 * np.clip(t / 0.3, 0, 1)
    low = np.sin(2 * np.pi * f * t) * np.exp(-t * 9)
    body = lowpass(white(len(t)), 400) * np.exp(-t * 12)
    return (low * 0.9 + body * 0.6) * p

def s_growl(p=1.0):          # 空虚怪低吼
    d = 0.6; t = t_arr(d)
    ph = 2 * np.pi * 70 * t + 2 * np.pi * 6 * np.sin(2 * np.pi * 9 * t)
    y = np.sign(np.sin(ph)) * 0.5 + np.sin(ph) * 0.5
    y = lowpass(y, 900)
    return y * np.exp(-t * 3.5) * 0.6 * p

def s_batt(p=1.0):           # 低电量双哔
    d = 0.3; t = t_arr(d)
    y = np.zeros(len(t))
    for on in [0.0, 0.15]:
        seg = t >= on
        y += np.where(seg, np.sin(2 * np.pi * 1200 * t) * np.exp(-(t - on) * 30), 0)
    return y * 0.5 * p

def s_paper(p=1.0):          # 推处方纸
    d = 0.7; t = t_arr(d)
    y = bandpass(white(len(t)), 1500, 7000)
    env = np.clip(t / 0.1, 0, 1) * np.clip((d - t) / 0.2, 0, 1)
    return y * env * 0.4 * p

def s_vibrate(p=1.0):         # 手机震动
    d = 0.16; t = t_arr(d)
    y = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.4
    y = onepole_lp(y, 600)
    return y * np.exp(-t * 12) * p

def s_ding(p=1.0):
    d = 1.4; t = t_arr(d)
    base = 740
    y = np.zeros(len(t))
    for r, a in [(1, 1), (2, 0.5), (2.42, 0.34), (3, 0.2)]:
        y += np.sin(2 * np.pi * base * r * t) * a * np.exp(-t * (3 + r))
    return y * 0.7 * p

def s_whoosh(dur, p=1.0):
    seg = 0.04; nseg = max(2, int(dur / seg)); out = np.zeros(0)
    fl = np.geomspace(220, 2400, nseg)
    for i in range(nseg):
        L = int(seg * SR * 1.6); x = white(L); x = bandpass(x, fl[i] * 0.5, fl[i] * 1.5)
        w = np.hanning(L)
        if i == 0: out = x * w
        else:
            ov = L // 2; out = np.concatenate([out, np.zeros(L - ov)]); out[i*(L-ov):i*(L-ov)+L] += x * w
    env = np.linspace(0.2, 1.0, len(out)) ** 1.4
    return out * env * 0.7 * p

def s_room(p=1.0):
    y = onepole_lp(white(N), 2600); y2 = onepole_lp(white(N), 400)
    return (y * 0.5 + y2 * 0.5) * 0.018 * p

SYNTH = {
    'blip': lambda c: s_blip(), 'pageflip': lambda c: s_pageflip(), 'thud': lambda c: s_thud(),
    'gulp': lambda c: s_gulp(), 'powhit': lambda c: s_powhit(), 'boing': lambda c: s_boing(),
    'burst': lambda c: s_burst(), 'slam': lambda c: s_slam(), 'growl': lambda c: s_growl(),
    'batt': lambda c: s_batt(), 'paper': lambda c: s_paper(), 'vibrate': lambda c: s_vibrate(),
    'ding': lambda c: s_ding(), 'whoosh': lambda c: s_whoosh(c.get('dur', 0.4)),
}

# ---------------- 冲浪摇滚配乐 (150 BPM) ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    BEAT = 60 / 150          # 0.4s
    S16 = BEAT / 4           # 0.1s
    t0 = 0.3
    STOP = 19.8              # 配乐急停

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a); R[i0:ie] += y * gain * np.sin(a)

    # --- 乐器 ---
    def rimshot():
        d = 0.08; t = t_arr(d)
        y = bandpass(white(len(t)), 1800, 6500) * np.exp(-t * 55)
        return y * 0.5
    def kick():
        d = 0.2; t = t_arr(d)
        f = 130 * np.exp(-t * 20) + 45
        return np.sin(2 * np.pi * f * t) * np.exp(-t * 12)
    def twang(f, dur=0.25, pan=0.0):   # 电吉他：拨弦 + slapback 弹簧混响感
        t = t_arr(dur)
        ph = 2 * np.pi * f * t
        body = (np.mod(ph / (2 * np.pi), 1) * 2 - 1)
        body = onepole_lp(body, 3200)
        pluck = body * np.exp(-t * 14)
        # slapback echo（弹簧混响感）
        echo1 = np.zeros_like(pluck); d1 = int(0.16 * SR)
        echo1[d1:] = pluck[:-d1] * 0.45
        echo2 = np.zeros_like(pluck); d2 = int(0.32 * SR)
        echo2[d2:] = pluck[:-d2] * 0.25
        sig = pluck + echo1 + echo2
        return sig
    def bass_note(f, dur):
        t = t_arr(dur)
        y = np.sin(2 * np.pi * f * t) * 0.7 + (np.mod(2*np.pi*f*t/(2*np.pi),1)*2-1)*0.3
        y = onepole_lp(y, 600)
        return y * np.exp(-t * 5)
    def brass_stab(freqs, dur=0.5):
        t = t_arr(dur); y = np.zeros(len(t))
        for f in freqs:
            ph = 2*np.pi*f*t
            y += (np.mod(ph/(2*np.pi),1)*2-1)/len(freqs)
        y = np.tanh(y * 3)
        return y * np.exp(-t * 6)

    # G - C - D 进行（surf）
    Gch = [hz(55), hz(59), hz(62)]    # G3 B3 D4
    Cch = [hz(48), hz(52), hz(55)]    # C3 E3 G3 (低)
    Dch = [hz(50), hz(54), hz(57)]    # D3 F#3 A3
    roots = {'G': hz(43), 'C': hz(36), 'D': hz(38)}   # G2 C2 D2 走步贝斯根音

    def chord_at(ts):
        # 每小节(2拍=0.8s)换和弦 G-C-D
        bar = int((ts - t0) / (BEAT * 2))
        seq = ['G', 'C', 'D', 'C']
        return seq[bar % 4]

    i = 0
    while t0 + i * S16 < STOP:
        ts = t0 + i * S16
        s16 = i % 16           # 16th in 2-beat bar
        beat = s16 // 4        # 0..3 (每拍=4个16分)
        ch = chord_at(ts)

        # 段落能量
        if ts < 2.4:
            full, surf = 0.5, 1.0
        elif ts < 5.4:
            full, surf = 0.55, 0.7
        elif ts < 9.0:
            full, surf = 0.8, 1.0
        elif ts < 12.6:
            full, surf = 0.9, 1.0
        elif ts < 16.2:
            full, surf = 1.0, 1.1
        else:
            full, surf = 1.1, 1.15

        # 走步贝斯：每拍
        if beat in (0, 2):
            place(bass_note(roots[ch], 0.3), ts, 0.5 * full, -0.1)
        if beat == 1:
            place(bass_note(roots[ch] * 1.5, 0.2), ts, 0.35 * full, -0.1)
        # 军鼓 rimshot 在反拍
        if beat == 2:
            place(rimshot(), ts, 0.6 * full, 0.2)
        # kick
        if beat == 0:
            place(kick(), ts, 0.6 * full)
        # surf 电吉他扫弦：每拍两下
        if s16 % 4 == 0 or (s16 % 8 == 6 and full > 0.7):
            f = {'G': hz(67), 'C': hz(60), 'D': hz(62)}[ch]
            place(twang(f, 0.22, 0.25), ts, 0.35 * surf, 0.3)

        i += 1

    # 每记 POW 砸铜管 stab（对齐画面 punch）
    for t_stab, amp in [(6.6, 0.5), (10.2, 0.5), (14.4, 0.55), (17.4, 0.7)]:
        place(brass_stab(Gch, 0.5), t_stab, amp, 0.0)

    # 27.0 起一个温柔的 G 长和弦收尾
    t = t_arr(2.6)
    endch = np.zeros(len(t))
    for f in [hz(55), hz(59), hz(62)]:
        endch += np.sin(2*np.pi*f*t) / 3
    endch = onepole_lp(endch, 1800) * np.minimum(1, t/0.3) * np.maximum(0, (2.6-t)/0.6)
    place(endch, 27.0, 0.5, 0.0)

    return L, R

# ---------------- 总线 ----------------
def build_bed():
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
        pan = c.get('pan', 0.0)
        place(y, t_start, 0.9, pan)

    mL, mR = build_music()
    L += mL; R += mR
    return np.stack([L, R], axis=1)

import wave
def write_wav(stereo, name):
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    path = os.path.join(os.path.dirname(__file__), name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('wrote', name, len(stereo) / SR, 's')

if __name__ == '__main__':
    bed = build_bed()
    # 软限幅 + 峰值 -1dBFS
    peak = np.max(np.abs(bed))
    bed = np.tanh(bed / peak * 1.25)
    bed = bed / np.max(np.abs(bed)) * (10 ** (-1 / 20))
    bed = bed[:N]
    write_wav(bed, 'bed.wav')
