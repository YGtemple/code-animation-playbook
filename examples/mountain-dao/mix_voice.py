#!/usr/bin/env python3
# mix_voice.py —— 5 句旁白按点铺轨（居中），人声区间 bed ducking -9dB；输出两版 wav。
import os, struct
import numpy as np
from scipy import signal

SR = 48000
D = os.path.dirname(os.path.abspath(__file__))
N = int(round(30.0 * SR))

# 对位表：(文件, 起点秒)
VOICES = [
    ('voice/v1.wav', 0.6),
    ('voice/v2.wav', 5.4),
    ('voice/v3.wav', 10.8),
    ('voice/v4.wav', 17.6),
    ('voice/v5.wav', 23.5),
]

def read_wav_raw(path):
    # 头里 length 是占位值，按实际字节读；40kHz 立体声 16-bit
    with open(path, 'rb') as f:
        raw = f.read()
    # 找 data chunk
    idx = raw.find(b'data')
    data = raw[idx + 8:]
    # 截到完整帧
    data = data[:len(data) - (len(data) % 4)]
    a = np.frombuffer(data, dtype='<i2').astype(np.float64) / 32768.0
    a = a.reshape(-1, 2)
    return a

def resample_linear(a, sr_in, sr_out):
    n_out = int(round(len(a) * sr_out / sr_in))
    t_in = np.linspace(0, 1, len(a), endpoint=False)
    t_out = np.linspace(0, 1, n_out, endpoint=False)
    left = np.interp(t_out, t_in, a[:, 0])
    right = np.interp(t_out, t_in, a[:, 1])
    return np.stack([left, right], axis=1)

def trim_silence(a, thresh=0.015, pad=0.08):
    mono = a.mean(axis=1)
    env = np.abs(mono)
    idx = np.where(env > thresh)[0]
    if len(idx) == 0: return a
    s = max(0, idx[0] - int(pad * SR))
    e = min(len(a), idx[-1] + int(pad * SR))
    return a[s:e]

# ---- bed ----
import wave
with wave.open(os.path.join(D, 'bed.wav'), 'rb') as w:
    bed = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768.0
    bed = bed.reshape(-1, 2)
bed = bed[:N]
if len(bed) < N:
    bed = np.pad(bed, ((0, N - len(bed)), (0, 0)))

# ---- voice bus ----
voice = np.zeros((N, 2))
regions = []
for rel, at in VOICES:
    a = read_wav_raw(os.path.join(D, rel))          # 40k stereo
    a = resample_linear(a, 40000, SR)              # -> 48k
    a = trim_silence(a)
    # 单轨响度归一到相近水平
    rms = np.sqrt(np.mean(a ** 2)) + 1e-9
    a = a / rms * 10 ** (-20 / 20)                 # 目标 RMS -20dBFS
    i0 = int(round(at * SR)); ie = min(N, i0 + len(a))
    voice[i0:ie] += a[:ie - i0]
    regions.append((at, (ie - i0) / SR))
    print(f'{rel}: placed @{at:.2f}s len={(ie-i0)/SR:.2f}s end={ie/SR:.2f}s')

# ---- ducking envelope ----
DUCK = 10 ** (-9 / 20)
env = np.ones(N)
ATT = int(0.08 * SR); REL = int(0.25 * SR)
for (at, dur) in regions:
    s = int(at * SR); e = min(N, int((at + dur) * SR))
    seg = env[s:e]
    a0 = min(s + ATT, e)
    if a0 > s:
        k = np.linspace(1, DUCK, a0 - s)
        seg[:a0 - s] = np.minimum(seg[:a0 - s], k)
    seg[:] = np.minimum(seg, DUCK)
    # release 平滑
    if e < N:
        relen = min(REL, N - e)
        env[e:e + relen] = np.minimum(env[e:e + relen], np.linspace(DUCK, 1, relen))

ducked_bed = bed * env[:, None]

def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)

v_rms = rms_db(voice)
mix = ducked_bed + voice
mix_peak = np.max(np.abs(mix))
mix = mix / mix_peak * 10 ** (-1 / 20)
bed_only = bed / np.max(np.abs(bed)) * 10 ** (-1 / 20)

def write_wav(a, p):
    a = np.clip(a, -1, 1)
    pcm = np.int16(a * 32767)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

write_wav(mix, os.path.join(D, 'mix_voice.wav'))
write_wav(bed_only, os.path.join(D, 'mix_novoice.wav'))

print(f'\nvoice-only RMS : {v_rms:.1f} dBFS')
print(f'mix RMS        : {rms_db(mix):.1f} dBFS')
print(f'mix peak       : {20*np.log10(np.max(np.abs(mix))):.2f} dBFS (= -1.0 target)')
print('regions:', [(round(a,2), round(a+d,2)) for a,d in regions])
