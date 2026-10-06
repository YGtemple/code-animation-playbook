#!/usr/bin/env python3
# mix_voice.py —— 旁白按点铺轨（居中），人声区间配乐/音效 ducking -9dB；输出两版最终音频并报告响度。
import os, wave
import numpy as np
from scipy.signal import resample_poly

SR = 48000
D = os.path.dirname(os.path.abspath(__file__))

def read_wav48(p):
    with wave.open(p, 'rb') as w:
        sr = w.getframerate(); ch = w.getnchannels(); n = w.getnframes()
        raw = w.readframes(n)
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    a = a.reshape(-1, ch)
    if ch == 1:
        a = np.stack([a[:, 0], a[:, 0]], axis=1)
    if sr != SR:
        # 重采样到 48k
        up, down = SR, sr
        g = np.gcd(up, down); up //= g; down //= g
        a = resample_poly(a, up, down, axis=0)
    return a

def write_wav(a, p):
    a = np.clip(a, -1, 1)
    pcm = np.int16(a * 32767)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

def trim_silence(a, thresh=0.02):
    m = np.abs(a).max(axis=1)
    idx = np.where(m > thresh)[0]
    if len(idx) == 0: return a
    return a[idx[0]:idx[-1]+1]

# (文件, 起点秒, atempo)
VOICES = [
    ('v1.wav', 3.30, 1.0),
    ('v2.wav', 6.80, 1.0),
    ('v3.wav', 10.00, 1.0),
    ('v4.wav', 13.40, 1.0),
    ('v5.wav', 16.80, 1.0),
    ('v6.wav', 21.20, 1.0),
    ('v7.wav', 24.00, 1.0),
    ('v8.wav', 27.00, 1.30),   # 加速 1.3
]

bed = read_wav48(os.path.join(D, 'bed.wav'))
N = len(bed)

voice = np.zeros_like(bed)
regions = []
for rel, at, spd in VOICES:
    a = read_wav48(os.path.join(D, 'voice', rel))
    a = trim_silence(a)
    if spd != 1.0:
        from scipy.signal import resample
        new_len = int(round(len(a) / spd))
        a = resample(a, new_len, axis=0).astype(np.float64)
    i0 = int(round(at * SR)); ie = min(N, i0 + len(a))
    voice[i0:ie] += a[:ie - i0]
    regions.append((at, (ie - i0) / SR))
    print(f'{rel}: @{at:.2f}s dur={(ie-i0)/SR:.2f}s end={at+(ie-i0)/SR:.2f}s')

# ducking 包络：人声区间内 bed -9dB，attack 0.06 / release 0.3
DUCK = 10 ** (-9 / 20)
env = np.ones(N)
for (at, dur) in regions:
    s = int(at * SR); e = min(N, int((at + dur + 0.3) * SR))
    seg = env[s:e]
    a0 = min(s + int(0.06 * SR), e)
    if a0 > s:
        k = np.linspace(1, DUCK, a0 - s)
        seg[:a0 - s] = np.minimum(seg[:a0 - s], k)
    seg[:] = np.minimum(seg, DUCK)
ducked_bed = bed * env[:, None]

def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)

v_rms = rms_db(voice)
mix = ducked_bed + voice
mix_peak = np.max(np.abs(mix))
mix = mix / mix_peak * (10 ** (-1 / 20))
bed_only = bed / np.max(np.abs(bed)) * (10 ** (-1 / 20))

write_wav(mix, os.path.join(D, 'mix_voice.wav'))
write_wav(bed_only, os.path.join(D, 'mix_novoice.wav'))

print()
print(f'voice-only RMS : {v_rms:.1f} dBFS')
print(f'mix RMS        : {rms_db(mix):.1f} dBFS')
print(f'mix peak       : {20*np.log10(np.max(np.abs(mix))):.2f} dBFS (target -1.0)')
print('regions:', [(round(a,2), round(a+d,2)) for a,d in regions])
print('wrote mix_voice.wav / mix_novoice.wav')
