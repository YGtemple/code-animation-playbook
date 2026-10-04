#!/usr/bin/env python3
# sfx.py —— 《养龙虾》NES 2A03 四通道 chiptune。numpy/scipy 纯代码合成。
# 四通道：25%占空比方波=主旋律；12.5%方波=琶音；三角波=bass；噪声=鼓。
import json, os
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(round(DUR * SR))
rng = np.random.default_rng(20261004)

def white(n, r=rng): return r.standard_normal(n).astype(np.float64)
def t_arr(sec): return np.linspace(0, sec, int(round(sec*SR)), endpoint=False)
def hz(n): return 440.0 * 2 ** ((n - 69) / 12.0)

# ---------- NES 波形积木 ----------
def sq(freq, dur, duty=0.25, glide_to=None):
    """占空比方波；glide_to=结束频率做 pitch drop。触发点前包络已置零由外层管。"""
    t = t_arr(dur)
    f = np.full_like(t, freq, dtype=float)
    if glide_to is not None:
        f = np.linspace(freq, glide_to, len(t))
    phase = np.cumsum(f) / SR
    ph = phase % 1.0
    return np.where(ph < duty, 1.0, -1.0)

def tri(freq, dur):
    t = t_arr(dur)
    ph = (freq * t) % 1.0
    return (2.0 * np.abs(2.0 * (ph - 0.5)) - 1.0).astype(np.float64)

def nz(dur):
    return white(max(1, int(round(dur*SR))))

def env_exp(dur, k):
    t = t_arr(dur)
    return np.exp(-t * k)

# ---------------- 音效 cue 音色（只换声源，结构不变） ----------------
def s_blip(p=1.0):
    d = 0.05
    y = sq(1200, d, 0.25) * env_exp(d, 60)
    return y * 0.7 * p

def s_bliplow(p=1.0):
    d = 0.12
    y = sq(220, d, 0.25, glide_to=110) * env_exp(d, 20)
    return y * 0.8 * p

def s_coin(p=1.0):
    # 街机投币：B5 持续上挑到 E6 长尾
    d = 0.35; t = t_arr(d)
    f = np.where(t < 0.08, hz(83), hz(88))   # B5->E6
    phase = np.cumsum(f)/SR; ph = phase % 1.0
    y = np.where(ph < 0.25, 1.0, -1.0)
    env = np.minimum(1.0, (d-t)/0.08)  # 尾音渐弱
    return y * env * 0.8 * p

def s_summon(p=1.0):
    # 金光上行琶音
    notes = [72, 76, 79, 84]
    out = np.zeros(0)
    for i, n in enumerate(notes):
        d = 0.09
        seg = sq(hz(n), d, 0.25) * env_exp(d, 18)
        out = np.concatenate([out, seg])
    return out * 0.7 * p

def s_type(p=1.0):
    # 键盘 tick：极短方波 + 噪声
    d = 0.03
    y = sq(1900, d, 0.25) * env_exp(d, 90)
    y += nz(d) * env_exp(d, 120) * 0.2
    return y * 0.45 * p

def s_tick(p=1.0):
    d = 0.04
    y = sq(2400, d, 0.25) * env_exp(d, 80)
    return y * 0.5 * p

def s_ding(p=1.0):
    # 弹窗双音 B5->E6
    d1 = 0.06; d2 = 0.14
    a = sq(hz(83), d1, 0.25) * env_exp(d1, 30)
    b = sq(hz(88), d2, 0.25) * env_exp(d2, 22)
    return np.concatenate([a, b]) * 0.7 * p

def s_task(p=1.0):
    # 绿✅：高音方波短亮
    d = 0.09
    y = sq(hz(91), d, 0.25) * env_exp(d, 40)
    return y * 0.6 * p

def s_levelup(p=1.0):
    # 上行琶音 C5-E5-G5-C6
    notes = [72, 76, 79, 84]
    out = np.zeros(0)
    for n in notes:
        d = 0.085
        out = np.concatenate([out, sq(hz(n), d, 0.25) * env_exp(d, 16)])
    return out * 0.8 * p

def s_alarm(p=1.0):
    # 双音 alarm
    d = 0.7; t = t_arr(d)
    f = np.where((np.floor(t*6) % 2) == 0, hz(81), hz(86))
    phase = np.cumsum(f)/SR; ph = phase % 1.0
    y = np.where(ph < 0.25, 1.0, -1.0)
    return y * env_exp(d, 2.5) * 0.8 * p

def s_slam(p=1.0):
    # 低频方波 220->55 pitch drop + 噪声 burst
    d = 0.45
    low = sq(220, d, 0.25, glide_to=55) * env_exp(d, 9)
    nb = nz(d) * env_exp(d, 30)
    nb = signal.lfilter(*_lp(1800), nb)
    return (low * 0.9 + nb * 0.6) * p

def s_low(p=1.0):
    d = 0.8
    y = tri(55, d) * env_exp(d, 4)
    return y * 0.9 * p

def s_burst(p=1.0):
    d = 0.3
    y = nz(d) * env_exp(d, 12)
    y = signal.lfilter(*_hp(500), y)
    return y * 0.8 * p

def s_thud(p=1.0):
    d = 0.2
    y = sq(150, d, 0.25, glide_to=60)
    return y * env_exp(d, 18) * p

def s_fly(p=1.0):
    # 弹飞：方波 600->80 pitch drop + 噪声 sweep
    d = 0.8
    y = sq(600, d, 0.25, glide_to=80) * env_exp(d, 4)
    nb = nz(d) * env_exp(d, 5)
    return (y * 0.8 + nb * 0.4) * p

def s_buzz(p=1.0):
    d = 0.5
    y = sq(110, d, 0.25) * np.where(np.arange(len(t_arr(d)))%int(SR*0.01)<int(SR*0.005),1.0,0.0)
    return y * env_exp(d, 3) * 0.7

def s_gameover(p=1.0):
    # 下行琶音 C4-A3-F3-C3 渐弱
    notes = [60, 57, 53, 48]
    out = np.zeros(0)
    for i, n in enumerate(notes):
        d = 0.22
        out = np.concatenate([out, sq(hz(n), d, 0.25) * env_exp(d, 6)])
    return out * 0.85 * p

def s_room(p=1.0):
    y = white(N)
    y = signal.lfilter(*_lp(2000), y)
    return y * 0.015 * p

# 一阶低/高通辅助
def _lp(cutoff):
    a = np.exp(-2*np.pi*cutoff/SR)
    return ([1-a], [1, -a])
def _hp(cutoff):
    a = np.exp(-2*np.pi*cutoff/SR)
    return ([1, -1], [1, -a])

SYNTH = {
    'blip': lambda c: s_blip(), 'bliplow': lambda c: s_bliplow(),
    'coin': lambda c: s_coin(), 'summon': lambda c: s_summon(),
    'type': lambda c: s_type(), 'tick': lambda c: s_tick(),
    'ding': lambda c: s_ding(), 'task': lambda c: s_task(),
    'levelup': lambda c: s_levelup(), 'alarm': lambda c: s_alarm(),
    'slam': lambda c: s_slam(), 'low': lambda c: s_low(),
    'burst': lambda c: s_burst(), 'thud': lambda c: s_thud(),
    'fly': lambda c: s_fly(), 'buzz': lambda c: s_buzz(),
    'gameover': lambda c: s_gameover(),
}

# ---------------- 混音总线 ----------------
def build(music=False):
    L = np.zeros(N); R = np.zeros(N)
    def place(y, t_start, gain, pan=0.0):
        i0 = int(round(t_start*SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0+len(y)); y = y[:ie-i0]
        a = (pan+1)*np.pi/4
        L[i0:ie] += y*gain*np.cos(a)
        R[i0:ie] += y*gain*np.sin(a)

    cues = json.load(open(os.path.join(os.path.dirname(__file__), 'sfx_cues.json')))
    for c in cues:
        name = c['s']
        if name == 'room':
            place(s_room(), 0, 1.0, 0); continue
        if name not in SYNTH: continue
        y = SYNTH[name](c)
        place(y, c['t'], 0.85, 0)

    if music:
        mL, mR = build_music()
        L += mL; R += mR

    # YOU ARE FIRED 处极短冷处理（0.2~0.3s 近静音）
    a0 = int(24.55*SR); a1 = int(24.85*SR)
    L[a0:a1] *= 0.15; R[a0:a1] *= 0.15

    stereo = np.stack([L, R], axis=1)
    peak = np.max(np.abs(stereo))
    stereo = np.tanh(stereo/(peak+1e-9)*1.25)
    stereo = stereo/np.max(np.abs(stereo))*(10**(-1/20))
    stereo = stereo[:N]
    return stereo

# ---------------- 配乐：步进序列 chiptune ----------------
def build_music():
    L = np.zeros(N); R = np.zeros(N)
    def place(y, ts, gain, pan=0.0):
        i0 = int(round(ts*SR))
        if i0 >= N or len(y) == 0: return
        ie = min(N, i0+len(y)); y = y[:ie-i0]
        a = (pan+1)*np.pi/4
        L[i0:ie] += y*gain*np.cos(a)
        R[i0:ie] += y*gain*np.sin(a)

    def bpm_of(t):
        if t < 3.0: return 92
        if t < 8.0: return 112
        if t < 18.0: return 132
        if t < 24.0: return 160
        return 0  # fired/end 段不铺鼓

    # 主旋律（25%方波）——简单 catchy 线，按段落取不同动机
    def mel_note(n, d):
        if n == 0: return np.zeros(max(1,int(d*SR)))
        return sq(hz(n), d, 0.25) * np.exp(-t_arr(d)*4)
    def bass_note(n, d):
        return tri(hz(n-12), d) * np.exp(-t_arr(d)*3)
    def arp_note(n, d):
        return sq(hz(n), d, 0.125) * np.exp(-t_arr(d)*8)
    def kick():
        d=0.12; y=sq(120,d,0.25,glide_to=40); return y*np.exp(-t_arr(d)*30)
    def snare():
        d=0.08; return nz(d)*np.exp(-t_arr(d)*40)*0.6
    def hat():
        d=0.03; return nz(d)*np.exp(-t_arr(d)*90)*0.3

    # 动机表：每段一个 [midi 序列]
    # C 大调俏皮线
    while True:
        break
    motifs = {
        'menu':  [72,76,79,76, 72,76,79,84],
        'summon':[79,81,84,81, 79,84,88,91],
        'stage': [72,76,79,84, 84,79,76,72, 74,77,81,86, 86,81,77,74],
        'boss':  [76,76,0,76, 0,79,0,76, 74,74,0,74, 0,77,0,74],
    }
    bassline = {
        'menu':  [48,0,48,0, 45,0,45,0],
        'summon':[48,0,52,0, 45,0,48,0],
        'stage': [48,48,55,48, 50,50,55,50, 45,45,52,45, 43,43,50,43],
        'boss':  [48,48,48,48, 48,48,48,48, 46,46,46,46, 45,45,45,45],
    }
    def section(t):
        if t<3: return 'menu'
        if t<8: return 'summon'
        if t<18: return 'stage'
        if t<24: return 'boss'
        return 'none'

    t0 = 0.5
    end = 26.8
    # 动态步进：每 16 分音符时长随 bpm
    ts = t0
    barpos = 0
    while ts < end:
        bpm = bpm_of(ts)
        s16 = 60.0/bpm/4.0 if bpm>0 else 0.15
        st = section(ts)
        if st == 'none':
            ts += s16; barpos += 1; continue
        mot = motifs[st]; bs = bassline[st]
        m = mot[barpos % len(mot)]
        b = bs[barpos % len(bs)]
        d = s16*0.95
        # 旋律方波
        if m: place(mel_note(m, d), ts, 0.30, -0.1)
        # bass 三角
        if b: place(bass_note(b, d), ts, 0.34, 0.0)
        # 琶音假和弦（快速12.5%方音，每两拍）
        if barpos % 2 == 0 and m:
            place(arp_note(m+12, s16*0.5), ts, 0.12, 0.2)
        # 鼓
        if bpm >= 92:
            if barpos % 4 == 0: place(kick(), ts, 0.5)
            if st in ('stage','boss') and barpos % 4 == 2: place(snare(), ts, 0.3)
            if st in ('stage','boss') and barpos % 2 == 1: place(hat(), ts, 0.2)
            if st == 'boss' and barpos % 2 == 0: place(hat(), ts, 0.15)
        ts += s16; barpos += 1

    # 结尾长方波尾音（E 大三和弦长音），从 27.6s 起
    tail_d = 2.3
    tail = t_arr(tail_d)
    i0 = int(27.6*SR)
    chord = np.zeros(len(tail))
    for n in [64, 68, 71]:
        ph = (np.cumsum(np.full_like(tail, hz(n)))/SR) % 1.0
        chord += np.where(ph < 0.25, 1.0, -1.0)
    chord *= np.exp(-tail*1.2) * 0.15
    ie = min(N, i0+len(chord))
    L[i0:ie] += chord[:ie-i0]
    R[i0:ie] += chord[:ie-i0]
    return L, R

# ---------------- 输出 ----------------
import wave
def write_wav(stereo, name):
    pcm = np.int16(np.clip(stereo,-1,1)*32767)
    path = os.path.join(os.path.dirname(__file__), name)
    with wave.open(path,'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    peak = np.max(np.abs(stereo))
    print('wrote', name, 'len', round(len(stereo)/SR,6), 'peak', round(peak,4), 'rms', round(float(np.sqrt((stereo**2).mean())),4))

if __name__ == '__main__':
    write_wav(build(music=False), 'sfx.wav')
    write_wav(build(music=True), 'sfx_music.wav')
