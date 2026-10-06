#!/usr/bin/env python3
# mix_voice.py —— 旁白按时间点对位混入配乐床；人声处 ducking -9dB；输出两版最终音频并报响度。
import os, wave
import numpy as np

SR = 48000
D = os.path.dirname(os.path.abspath(__file__))

def read_wav(p):
    with wave.open(p, 'rb') as w:
        n = w.getnframes(); raw = w.readframes(n)
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    ch = w.getnchannels()
    return a.reshape(-1, ch)

def write_wav(a, p):
    a = np.clip(a, -1, 1)
    pcm = np.int16(a * 32767)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

# 对位表：(文件, 起点秒) —— 对准用户指定旁白时间码；v5 因 atempo1.2 后仍需在30s前收，置于27.6
VOICES = [
    ('voice_tts/v1_trim.wav', 0.80),
    ('voice_tts/v2_trim.wav', 6.80),
    ('voice_tts/v3_trim.wav', 13.80),
    ('voice_tts/v4_trim.wav', 21.40),
    ('voice_tts/v5_trim.wav', 27.60),
]

bed = read_wav(os.path.join(D, 'bed.wav'))
if bed.shape[1] == 1:
    bed = np.repeat(bed, 2, axis=1)
N = len(bed)

# ---- 人声轨（居中单声道→立体声）----
voice = np.zeros((N, 2))
regions = []
for rel, at in VOICES:
    a = read_wav(os.path.join(D, rel))
    if a.shape[1] == 2: a = a.mean(axis=1, keepdims=True)
    i0 = int(round(at * SR)); ie = min(N, i0 + len(a))
    seg = a[:ie - i0]
    voice[i0:ie, 0] += seg[:, 0]; voice[i0:ie, 1] += seg[:, 0]
    regions.append((at, (ie - i0) / SR))

# ---- ducking 包络：人声区间 bed 增益 -9dB，attack 0.06s / release 0.3s ----
DUCK = 10 ** (-9 / 20)
env = np.ones(N)
for (at, dur) in regions:
    s = int(at * SR); e = min(N, int((at + dur + 0.3) * SR))
    a0 = min(s + int(0.06 * SR), e)
    if a0 > s:
        env[s:a0] = np.minimum(env[s:a0], np.linspace(1, DUCK, a0 - s))
    env[s:e] = np.minimum(env[s:e], DUCK)
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
print('voice regions  :', [(round(a,2), round(a+d,2)) for a,d in regions])
print('wrote mix_voice.wav / mix_novoice.wav')
