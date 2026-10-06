#!/usr/bin/env python3
# mix_voice.py —— 旁白按时间点对位混入 bed；人声处 ducking -9dB；输出 mix_voice.wav / mix_novoice.wav 并报告响度。
import os, wave
import numpy as np

SR = 48000
D = os.path.dirname(os.path.abspath(__file__))

def read_wav(p):
    with wave.open(p, 'rb') as w:
        n = w.getnframes(); ch = w.getnchannels(); sw = w.getsampwidth()
        raw = w.readframes(n)
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    if ch == 1:
        a = np.stack([a, a], axis=1)
    else:
        a = a.reshape(-1, ch)[:, :2]
    return a

def write_wav(a, p):
    a = np.clip(a, -1, 1)
    pcm = np.int16(a * 32767)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

# 对位表：(文件, 起点秒)
VOICES = [
    ('voice/v1_trim.wav', 1.0),
    ('voice/v2_trim.wav', 8.6),
    ('voice/v3_spd.wav', 16.0),
    ('voice/v4_trim.wav', 21.0),
    ('voice/v5_spd.wav', 26.0),
]

bed = read_wav(os.path.join(D, 'bed.wav'))
N = len(bed)

# ---- 人声轨（居中） ----
voice = np.zeros_like(bed)
regions = []
for rel, at in VOICES:
    a = read_wav(os.path.join(D, rel))
    i0 = int(round(at * SR)); ie = min(N, i0 + len(a))
    voice[i0:ie] += a[:ie - i0]
    regions.append((at, (ie - i0) / SR))

# ---- ducking 包络：人声区间 bed 压 -9dB，attack 0.06s / release 0.3s ----
DUCK = 10 ** (-9 / 20)
env = np.ones(N)
for (at, dur) in regions:
    s = int(at * SR); e = min(N, int((at + dur + 0.3) * SR))
    a0 = min(s + int(0.06 * SR), e)
    if a0 > s:
        k = np.linspace(1, DUCK, a0 - s)
        env[s:a0] = np.minimum(env[s:a0], k)
    env[a0:e] = np.minimum(env[a0:e], DUCK)
ducked_bed = bed * env[:, None]

def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)

v_rms = rms_db(voice)
mix = ducked_bed + voice
mix_peak = np.max(np.abs(mix))
mix = mix / mix_peak * (10 ** (-1 / 20))
bed_only = bed / np.max(np.abs(bed)) * (10 ** (-1 / 20))

write_wav(mix, os.path.join(D, 'mix_voice.wav'))
write_wav(bed_only, os.path.join(D, 'mix_novoice.wav'))

print(f'voice-only RMS : {v_rms:.1f} dBFS')
print(f'mix RMS        : {rms_db(mix):.1f} dBFS')
print(f'mix peak       : {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS (target -1.0)')
print(f'novoice RMS    : {rms_db(bed_only):.1f} dBFS')
print('regions:', [(round(a, 2), round(a + d, 2)) for a, d in regions])
print('wrote mix_voice.wav / mix_novoice.wav')
