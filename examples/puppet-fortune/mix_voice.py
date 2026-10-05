#!/usr/bin/env python3
# mix_voice.py —— 旁白按时间点对位混入配乐床；人声处 ducking -9dB；输出两版最终音频并报告响度。
import os, wave
import numpy as np

SR = 48000
D = os.path.dirname(os.path.abspath(__file__))

def read_wav(p):
    with wave.open(p, 'rb') as w:
        n = w.getnframes(); raw = w.readframes(n)
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    return a.reshape(-1, 2)

def write_wav(a, p):
    a = np.clip(a, -1, 1)
    pcm = np.int16(a * 32767)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

# 对位表：(文件, 起点秒)
VOICES = [
    ('voice/v1_trim.wav', 1.00),
    ('voice/v2_trim.wav', 7.50),
    ('voice/v3_trim.wav', 14.00),
    ('voice/v4_spd.wav', 20.50),
    ('voice/v5_spd.wav', 24.20),
    ('voice/v6_spd.wav', 26.70),
]

bed = read_wav(os.path.join(D, 'bed.wav'))
N = len(bed)
t = np.arange(N) / SR

# ---- 人声轨 ----
voice = np.zeros_like(bed)
regions = []
for rel, at in VOICES:
    a = read_wav(os.path.join(D, rel))
    i0 = int(round(at * SR)); ie = min(N, i0 + len(a))
    voice[i0:ie] += a[:ie - i0]
    regions.append((at, (ie - i0) / SR))

# ---- ducking 包络：人声区间内 bed 增益 -9dB，attack/release 平滑 ----
DUCK = 10 ** (-9 / 20)
env = np.ones(N)
for (at, dur) in regions:
    s = int(at * SR); e = min(N, int((at + dur + 0.3) * SR))   # release 0.3s
    seg = env[s:e]
    # attack 0.06s
    a0 = min(s + int(0.06 * SR), e)
    if a0 > s:
        k = np.linspace(1, DUCK, a0 - s)
        seg[:a0 - s] = np.minimum(seg[:a0 - s], k)
    seg[:] = np.minimum(seg, DUCK)
ducked_bed = bed * env[:, None]

# ---- 响度测量（人声单独 / 最终混音） ----
def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)

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
print('regions:', [(round(a, 2), round(a + d, 2)) for a, d in regions])
print('wrote mix_voice.wav / mix_novoice.wav')
