#!/usr/bin/env python3
# mix_voice.py —— 旁白按 voice_manifest.json 对位铺入 bed；人声区间 bed ducking -9dB；出两版并报告响度。
import os, json, wave
import numpy as np
from scipy import signal

SR = 48000
D = os.path.dirname(os.path.abspath(__file__))

def read_wav(p):
    with wave.open(p, 'rb') as w:
        n = w.getnframes(); raw = w.readframes(n); ch = w.getnchannels()
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    if ch == 1:
        a = np.stack([a, a], axis=1)
    else:
        a = a.reshape(-1, 2)
    # 重采样到 48k（若需要）
    return a

def write_wav(a, p):
    a = np.clip(a, -1, 1)
    pcm = np.int16(a * 32767)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

manifest = json.load(open(os.path.join(D, 'voice_manifest.json')))
bed = read_wav(os.path.join(D, 'bed.wav'))
N = len(bed)

# ---- 人声轨 ----
voice = np.zeros_like(bed)
regions = []
for item in manifest:
    a = read_wav(os.path.join(D, item['file']))
    i0 = int(round(item['cue'] * SR)); ie = min(N, i0 + len(a))
    voice[i0:ie] += a[:ie - i0]
    regions.append((item['cue'], (ie - i0) / SR))

# ---- ducking：人声区间 bed 增益 -9dB，attack 0.06 / release 0.3 平滑 ----
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
mix = mix / mix_peak * (10 ** (-1 / 20))          # 峰值 -1dBFS
bed_only = bed / np.max(np.abs(bed)) * (10 ** (-1 / 20))

write_wav(mix, os.path.join(D, 'mix_voice.wav'))
write_wav(bed_only, os.path.join(D, 'mix_novoice.wav'))

print(f'voice-only RMS: {v_rms:.1f} dBFS')
print(f'mix RMS:        {rms_db(mix):.1f} dBFS')
print(f'mix peak:       {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS (= -1.0 dBFS target)')
print(f'bed-only RMS:   {rms_db(bed_only):.1f} dBFS')
print('regions:', [(round(a, 2), round(a + d, 2)) for a, d in regions])
print('wrote mix_voice.wav / mix_novoice.wav')
