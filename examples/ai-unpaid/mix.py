#!/usr/bin/env python3
# mix.py —— 旁白混音：旁白逐句放位 + 配乐/音效 ducking，导出旁白版与无旁白版。
import os, wave
import numpy as np
from scipy.io import wavfile
from scipy import signal

HERE = os.path.dirname(__file__)
SR = 48000
DUR = 30.0
N = int(round(DUR * SR))

def read_wav(path):
    sr, y = wavfile.read(path)
    if y.ndim == 1:
        y = np.stack([y, y], axis=1)
    else:
        y = y[:, :2]
    if y.dtype == np.int16:
        y = y.astype(np.float64) / 32768.0
    elif y.dtype == np.int32:
        y = y.astype(np.float64) / 2147483648.0
    if y.shape[1] == 1:
        y = np.stack([y[:,0], y[:,0]], axis=1)
    if sr != SR:
        g = np.gcd(sr, SR)
        y = signal.resample_poly(y, SR//g, sr//g, axis=0)
    return y[:N]

# 音乐+音效底床（stereo）
bed = read_wav(os.path.join(HERE, 'sfx_music.wav'))
if len(bed) < N:
    bed = np.pad(bed, ((0, N-len(bed)), (0,0)))

# 旁白时间点
NARR = [('N1', 1.0), ('N2', 9.0), ('N3', 16.0), ('N4', 22.0), ('N5', 26.0)]
voices = []
regions = []
for name, t0 in NARR:
    v = read_wav(os.path.join(HERE, 'voices', name + '.wav'))
    voices.append((t0, v))
    regions.append((t0, t0 + len(v)/SR))

# ducking 包络：有人声处 -9dB(=0.355)，attack/release 0.15s 平滑
env = np.ones(N)
for (a, b) in regions:
    s = int(a*SR); e = int(b*SR)
    atk = int(0.15*SR); rel = int(0.18*SR)
    # 下压段
    lo = max(0, s-atk); hi = min(N, e+rel)
    for i in range(lo, hi):
        if i < s:
            g = 1.0 - 0.645 * (s - i)/atk     # 1 -> 0.355
        elif i <= e:
            g = 0.355
        else:
            g = 0.355 + 0.645 * (i - e)/rel   # 0.355 -> 1
        env[i] = min(env[i], g)

bed_duck = bed * env[:, None]

# 人声总线（单独测响度）
voice_bus = np.zeros((N, 2))
for t0, v in voices:
    i0 = int(round(t0*SR)); ie = min(N, i0+len(v))
    voice_bus[i0:ie] += v[:ie-i0]

# 报告人声单独响度（RMS dBFS）
v_rms = float(np.sqrt(np.mean(voice_bus**2)))
print(f'[voice-only] RMS={v_rms:.5f} = {20*np.log10(v_rms+1e-9):.1f} dBFS')

# 合成旁白版
narr = bed_duck + voice_bus

# 无旁白版 = 底床（已经 -1dBFS，这里再归一一次）
inst = bed.copy()

def finalize(x):
    peak = float(np.max(np.abs(x)))
    x = x / peak * (10**(-1/20))   # 峰值 -1dBFS
    rms = float(np.sqrt(np.mean(x**2)))
    return x, rms

narr, narr_rms = finalize(narr)
inst, inst_rms = finalize(inst)
print(f'[narrated]  peak={np.max(np.abs(narr)):.3f} RMS={narr_rms:.5f} = {20*np.log10(narr_rms+1e-9):.1f} dBFS')
print(f'[instrument] peak={np.max(np.abs(inst)):.3f} RMS={inst_rms:.5f} = {20*np.log10(inst_rms+1e-9):.1f} dBFS')

def write(x, name):
    pcm = np.int16(np.clip(x, -1, 1)*32767)
    with wave.open(os.path.join(HERE, name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('wrote', name, len(x)/SR)

write(narr, 'narrated.wav')
write(inst, 'instrumental.wav')
