#!/usr/bin/env python3
# sfx.py —— 读取 sfx_cues.json，numpy/scipy 纯代码合成 30s 立体声，输出 sfx.wav(纯音效A) 与 sfx_music.wav(配乐B)。
# 包豪斯极简电子：808/909 干鼓(严格量化) + 方波/三角 pluck 短序列(每4拍相位叠加) + sub bass。
import json, os
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(round(DUR * SR))
rng = np.random.default_rng(20260705)

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

def hz(n): return 440.0 * 2 ** ((n - 69) / 12)

# ---------------- 音色（包豪斯极简电子） ----------------
def s_click(p=1.0):
    # 短方波 blip
    d = 0.05; t = t_arr(d)
    y = np.sign(np.sin(2 * np.pi * 1100 * t)) * np.exp(-t * 70)
    return y * 0.5 * p

def s_type(p=1.0):
    d = 0.04; t = t_arr(d)
    y = bandpass(white(len(t)), 1800, 6000) * np.exp(-t * 90)
    return y * 0.4 * p

def s_tick(p=1.0):
    d = 0.04; t = t_arr(d)
    y = np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 70)
    return y * 0.5 * p

def s_blip(p=1.0):
    # 过关 = 方波 880Hz 滴
    d = 0.16; t = t_arr(d)
    f = 880.0 * p
    y = np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 16)
    y += np.sin(2 * np.pi * f * 2 * t) * 0.3 * np.exp(-t * 22)
    return y * 0.55

def s_err(p=1.0):
    # 错误 = 220Hz 方波嗡 + 噪声
    d = 0.45; t = t_arr(d)
    y = np.sign(np.sin(2 * np.pi * 220 * t)) * 0.5
    y += np.sign(np.sin(2 * np.pi * 233 * t)) * 0.3
    nz = bandpass(white(len(t)), 300, 2500) * np.exp(-t * 8) * 0.4
    return (y + nz) * np.clip(1 - t / d, 0, 1) * 0.6

def s_crossnoise(p=1.0):
    # 红叉 = 噪声划
    d = 0.22; t = t_arr(d)
    y = bandpass(white(len(t)), 900, 5000) * np.exp(-t * 16)
    return y * 0.6 * p

def s_thud(p=1.0):
    d = 0.3; t = t_arr(d)
    f = 150 - 90 * np.clip(t / 0.2, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 11)
    y += lowpass(white(len(t)), 500) * np.exp(-t * 24) * 0.35
    return y * 0.8 * p

def s_stamp(p=1.0):
    # 印章 = 60Hz thud + 噪声
    d = 0.4; t = t_arr(d)
    y = np.sin(2 * np.pi * 60 * t) * np.exp(-t * 9)
    nz = lowpass(white(len(t)), 1800) * np.exp(-t * 26)
    return (y * 0.9 + nz * 0.5) * p

def s_bigdrop(p=1.0):
    d = 0.6; t = t_arr(d)
    f = 120 - 70 * np.clip(t / 0.4, 0, 1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 6)
    y += lowpass(white(len(t)), 900) * np.exp(-t * 12) * 0.5
    return y * p

def s_squash(p=1.0):
    # 咖啡杯被压扁 = 噪声 crunch
    d = 0.25; t = t_arr(d)
    crack = (white(len(t)) > 0.1).astype(float)
    y = bandpass(white(len(t)) * (0.4 + 0.6 * crack), 500, 3500)
    return y * np.exp(-t * 12) * 0.7 * p

def s_whoosh(dur=0.35, p=1.0):
    t = t_arr(dur)
    nb = bandpass(white(len(t)), 300, 3000)
    env = (t / dur) ** 1.3
    return nb * env * 0.5 * p

def s_low(p=1.0):
    # 低音长鸣
    d = 1.6; t = t_arr(d)
    y = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 1.8)
    y += np.sin(2 * np.pi * 82 * t) * 0.5 * np.exp(-t * 2.2)
    return y * 0.6 * p

def s_flip(p=1.0):
    # 工牌翻牌 = 短促 whoosh
    return s_whoosh(0.2, p) * 0.7

def s_hum(dur=0.4, p=1.0):
    t = t_arr(dur)
    y = np.sin(2 * np.pi * 120 * t) * 0.4
    return y * np.clip(1 - t / dur, 0, 1) * 0.4 * p

def s_piano(p=1.0):
    # 片尾孤立钢琴单音（A3）
    d = 2.2; t = t_arr(d)
    base = hz(57)  # A3
    y = np.zeros(len(t))
    for r, a in [(1, 1.0), (2, 0.45), (3, 0.22), (4.01, 0.12), (5.9, 0.06)]:
        y += np.sin(2 * np.pi * base * r * t) * a * np.exp(-t * (1.6 + r * 0.4))
    return y * 0.7 * p

def s_ding(p=1.0):
    d = 1.4; t = t_arr(d)
    base = 1320
    y = np.zeros(len(t))
    for r, a in [(1, 1), (2.0, 0.4), (2.76, 0.2)]:
        y += np.sin(2 * np.pi * base * r * t) * a * np.exp(-t * (3.0 + r))
    return y * 0.35 * p

def s_room(p=1.0):
    y = onepole_lp(white(N), 2400)
    return y * 0.018 * p

SYNTH = {
    'click': lambda c: s_click(), 'type': lambda c: s_type(), 'tick': lambda c: s_tick(),
    'blip': lambda c: s_blip(c.get('p', 1.0)), 'err': lambda c: s_err(),
    'crossnoise': lambda c: s_crossnoise(), 'thud': lambda c: s_thud(),
    'stamp': lambda c: s_stamp(), 'bigdrop': lambda c: s_bigdrop(),
    'squash': lambda c: s_squash(), 'whoosh': lambda c: s_whoosh(c.get('dur', 0.35)),
    'low': lambda c: s_low(), 'flip': lambda c: s_flip(), 'hum': lambda c: s_hum(c.get('dur', 0.4)),
    'piano': lambda c: s_piano(), 'ding': lambda c: s_ding(),
}

# ---------------- 混音总线 ----------------
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
        end_aligned = name in ('whoosh',)
        t_start = c['t'] - (c.get('dur', 0) if end_aligned else 0)
        pan = 0.0
        if name in ('whoosh', 'flip', 'crossnoise'):
            pan = 0.26 if idx % 2 else -0.26
        place(y, t_start, 0.9, pan)

    if music:
        mL, mR = build_music()
        L += mL; R += mR

    # 反转骤停窗口 23.0–23.5（连底噪一起归零）
    a0 = int(23.0 * SR); a1 = int(23.5 * SR)
    L[a0:a1] = 0; R[a0:a1] = 0

    # 软限幅 + 峰值 -1dBFS
    stereo = np.stack([L, R], axis=1)
    peak = np.max(np.abs(stereo))
    rms = np.sqrt(np.mean(stereo ** 2))
    print(f'[pre-norm] peak={peak:.3f} rms={rms:.4f}')
    assert peak > 0.01, '混音峰值过低'
    stereo = np.tanh(stereo / (peak + 1e-9) * 1.25)
    stereo = stereo / np.max(np.abs(stereo)) * (10 ** (-1 / 20))
    stereo = stereo[:N]
    return stereo

# ---------------- 配乐（120 BPM 极简电子） ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    S16 = 0.125  # 16分
    t0 = 0.6
    end = 28.6

    def kick():
        d = 0.26; t = t_arr(d); f = 140 * np.exp(-t * 20) + 44
        return np.sin(2 * np.pi * f * t) * np.exp(-t * 8)
    def clap():
        d = 0.18; t = t_arr(d)
        return bandpass(white(len(t)), 1200, 6000) * np.exp(-t * 16)
    def hat():
        d = 0.05; t = t_arr(d)
        return bandpass(white(len(t)), 7000, 13000) * np.exp(-t * 70) * 0.4
    def sub(f, d):
        t = t_arr(d)
        y = np.sin(2 * np.pi * f * t)
        return y * np.exp(-t * 5) * 0.7
    def pluck(f, d=0.18):
        t = t_arr(d)
        sq = np.sign(np.sin(2 * np.pi * f * t))
        tri = 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
        y = sq * 0.5 + tri * 0.5
        y = onepole_lp(y, 3000)
        return y * np.exp(-t * 12) * 0.4

    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts * SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0 + len(y)); y = y[:ie - i0]
        a = (pan + 1) * np.pi / 4
        L[i0:ie] += y * gain * np.cos(a)
        R[i0:ie] += y * gain * np.sin(a)

    # pluck 旋律（每4拍相位叠加）：C E G A 极简动机
    MELODY = [60, 64, 67, 69, 67, 64, 60, 62]
    i = 0
    while t0 + i * S16 < end:
        ts = t0 + i * S16
        beat = i % 4        # 16分位在四分拍内
        bar = (i // 4) % 2
        st = section(ts)

        if st == 'build':
            # 鼓
            if beat == 0: place(kick(), ts, 0.9)
            if beat == 2: place(clap(), ts, 0.5)
            if beat in (1, 3): place(hat(), ts, 0.4)
            # sub bass
            if beat == 0: place(sub(hz(36), 0.4), ts, 0.6)
            # pluck 每拍一个，相位每4拍叠加
            if beat in (0, 1, 2, 3):
                note = MELODY[(i // 1) % len(MELODY)]
                place(pluck(hz(note)), ts, 0.35, -0.15 + 0.1 * bar)
        elif st == 'tension':
            if beat == 0: place(kick(), ts, 0.8)
            if beat == 2: place(clap(), ts, 0.4)
            place(hat(), ts, 0.25)
            if beat in (0, 2): place(sub(hz(36), 0.3), ts, 0.5)
        elif st == 'climax':
            if beat == 0: place(kick(), ts, 1.0)
            if beat == 2: place(clap(), ts, 0.7)
            place(hat(), ts, 0.5)
            if beat in (0, 2): place(sub(hz(36), 0.3), ts, 0.7)
            if beat in (1, 3): place(pluck(hz(MELODY[i % len(MELODY)])), ts, 0.4, 0.2)
        elif st == 'drone':
            # 反转后：只剩低音长鸣
            if beat == 0: place(sub(hz(33), 1.6), ts, 0.5)
        # 'none' 段落（23.0-23.5）什么都不放，靠 build 后自然断
        i += 1
    return L, R

def section(t):
    if t < 3.0: return 'tension'      # 开场稀疏
    if t < 19.0: return 'build'      # 四关推进
    if t < 23.0: return 'climax'     # 总分 PASS
    if t < 23.5: return 'none'       # 骤停
    if t < 28.6: return 'drone'      # 反转低音
    return 'none'

# ---------------- 输出 ----------------
import wave
def write_wav(stereo, name):
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    path = os.path.join(os.path.dirname(__file__), name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    pk = np.max(np.abs(stereo))
    print(f'wrote {name} len={len(stereo)/SR:.6f}s peak={pk:.3f}')

if __name__ == '__main__':
    write_wav(build(music=False), 'sfx.wav')
    write_wav(build(music=True), 'sfx_music.wav')
