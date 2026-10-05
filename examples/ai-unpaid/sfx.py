#!/usr/bin/env python3
# sfx.py —— 《AI 不能欠薪》lo-fi electronic chill，纯代码合成。读 sfx_cues.json → WAV。
import json, os
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(round(DUR * SR))
rng = np.random.default_rng(20261005)

def white(n, r=rng): return r.standard_normal(n).astype(np.float64)
def t_arr(sec): return np.linspace(0, sec, int(round(sec * SR)), endpoint=False)
def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); return signal.lfilter([1 - a], [1, -a], x)
def bandpass(x, lo, hi):
    lo = max(20.0, lo); hi = min(SR / 2 - 100, hi)
    sos = signal.butter(4, [lo / (SR/2), hi / (SR/2)], btype='band', output='sos'); return signal.sosfilt(sos, x)
def lowpass(x, c):
    sos = signal.butter(4, min(c, SR/2 - 100)/(SR/2), output='sos'); return signal.sosfilt(sos, x)
def hz(n): return 440 * 2 ** ((n - 69) / 12)

# ---------------- 基础音色 ----------------
def s_wood(p=1.0):
    # 木块堆叠"哒"：短而实的木质敲击
    d = 0.09; t = t_arr(d)
    y = bandpass(white(len(t)) * np.exp(-t * 55), 700, 1600)
    y += np.sin(2 * np.pi * 220 * t) * np.exp(-t * 40) * 0.4
    return y * 0.9 * p

def s_dong(p=1.0):
    # 账单落"咚"：低沉钟
    d = 0.7; t = t_arr(d)
    y = (np.sin(2*np.pi*180*t)*np.exp(-t*6.5)
         + np.sin(2*np.pi*272*t)*np.exp(-t*9)*0.6
         + lowpass(white(len(t))*np.exp(-t*18), 300)*0.4)
    return y * 0.9 * p

def s_stamp(p=1.0):
    # 盖印"砰"+纸摩擦
    d = 0.35; t = t_arr(d)
    thud = np.sin(2*np.pi*(120-70*np.clip(t/0.15,0,1))*t)*np.exp(-t*16)
    paper = bandpass(white(len(t))*np.exp(-t*22), 1800, 6500)*0.5
    return (thud*0.9 + paper) * p

def s_zap(p=1.0):
    # AI 停工电流"滋——"后截断
    d = 0.9; t = t_arr(d)
    rise = np.linspace(0.3, 1.0, len(t))
    y = bandpass(white(len(t)), 1200, 5200) * rise
    y = y * np.exp(-np.clip(t-0.55, 0, 1) * 14)   # 后段快速收（断电）
    return y * 0.7 * p

def s_crumble(p=1.0):
    d = 0.5; t = t_arr(d)
    y = bandpass(white(len(t))*np.exp(-t*10), 500, 3200)
    return y * 0.8 * p

def s_boom(p=1.0):
    d = 0.9; t = t_arr(d)
    f = 90*np.exp(-t*3.0)+32
    return (np.sin(2*np.pi*f*t)*np.exp(-t*4.5) + lowpass(white(len(t)),300)*np.exp(-t*6)*0.8) * p

def s_buzz(p=1.0):
    d = 0.55; t = t_arr(d)
    sq = lambda f: np.sign(np.sin(2*np.pi*f*t))
    return (sq(150)*0.5+sq(159)*0.5)*np.exp(-t*6)*0.7*p

def s_ding(p=1.0):
    d = 1.2; t = t_arr(d); base=820
    ratios=[1,2,2.42,3,4.46]; amps=[1,0.5,0.34,0.2,0.1]
    y=np.zeros(len(t))
    for r,a in zip(ratios,amps): y += np.sin(2*np.pi*base*r*t)*a*np.exp(-t*(3.0+r))
    return y*0.8*p

def s_badge(p=1.0):
    # 工牌金属当啷落地
    d=0.5; t=t_arr(d)
    p1 = np.sin(2*np.pi*1900*t)*np.exp(-t*38)*0.5 + np.sin(2*np.pi*1900*2.6*t)*np.exp(-t*55)*0.3
    p2 = np.where(t>=0.12, np.sin(2*np.pi*1400*(t-0.12))*np.exp(-(t-0.12)*30)*0.5, 0.0)
    thud = np.sin(2*np.pi*120*t)*np.exp(-t*20)*0.4
    return (p1+p2+thud)*p

def s_slide(p=1.0):
    return s_whoosh(0.35, p)

def s_whoosh(dur=0.4, p=1.0):
    seg=0.045; nseg=max(2,int(dur/seg)); out=np.zeros(0)
    fl=np.geomspace(240,2400,nseg)
    for i in range(nseg):
        L=int(seg*SR*1.6); x=bandpass(white(L),fl[i]*0.5,fl[i]*1.5); w=np.hanning(L)
        if i==0: out=x*w
        else:
            ov=L//2; out=np.concatenate([out,np.zeros(L-ov)])
            out[i*(L-ov):i*(L-ov)+L]+=x*w
    env=np.linspace(0.2,1.0,len(out))**1.4
    return out*env*0.7*p

def s_tick(p=1.0, v=1.0):
    d=0.05; t=t_arr(d)
    y=np.sin(2*np.pi*2100*t)*np.exp(-t*60) + white(len(t))*np.exp(-t*90)*0.3
    return y*0.6*p*v

def s_pop(p=1.0):
    d=0.12; t=t_arr(d)
    f=240+520*np.sin(np.clip(t/d,0,1)*np.pi/2)
    return (np.sin(2*np.pi*f*t)*np.exp(-t*17)+white(len(t))*np.exp(-t*40)*0.15)*0.7*p

def s_blip(pitch=1.0):
    d=0.1; t=t_arr(d); f=480*pitch
    return (np.sin(2*np.pi*f*t)*0.6 + np.sin(2*np.pi*f*1.5*t)*0.3)*np.exp(-t*26)*0.6

def s_room(p=1.0):
    return (onepole_lp(white(N),2600)*0.5 + onepole_lp(white(N),400)*0.5)*0.015*p

SYNTH = {
    'room': lambda c: s_room(), 'wood': lambda c: s_wood(), 'dong': lambda c: s_dong(),
    'stamp': lambda c: s_stamp(), 'zap': lambda c: s_zap(), 'crumble': lambda c: s_crumble(),
    'boom': lambda c: s_boom(), 'buzz': lambda c: s_buzz(), 'ding': lambda c: s_ding(),
    'endding': lambda c: s_ding(1.1), 'badge': lambda c: s_badge(), 'slide': lambda c: s_slide(),
    'whoosh': lambda c: s_whoosh(c.get('dur',0.4)), 'tick': lambda c: s_tick(v=c.get('v',1.0)),
    'pop': lambda c: s_pop(), 'blip': lambda c: s_blip(pitch=c.get('pitch',1.0)),
}

def build(music=False):
    L=np.zeros(N); R=np.zeros(N)
    def place(y,tg,gain,pan=0.0):
        i0=int(round(tg*SR))
        if i0>=N or len(y)==0: return
        ie=min(N,i0+len(y)); y=y[:ie-i0]
        a=(pan+1)*np.pi/4
        L[i0:ie]+=y*gain*np.cos(a); R[i0:ie]+=y*gain*np.sin(a)
    cues=json.load(open(os.path.join(os.path.dirname(__file__),'sfx_cues.json')))
    for idx,c in enumerate(cues):
        name=c['s']
        if name=='room': place(s_room(),0,1.0,0); continue
        if name=='silentwin': continue
        if name not in SYNTH: continue
        y=SYNTH[name](c)
        end_aligned = name in ('whoosh','slide')
        tg = c['t']-(c.get('dur',0) if end_aligned else 0)
        place(y,tg,0.9, 0.25 if idx%2 else -0.25)
    # 真冷场短窗（AI 停工后，21.86–22.04，连底噪归零）
    a0=int(21.86*SR); a1=int(22.04*SR); L[a0:a1]=0; R[a0:a1]=0
    if music:
        mL,mR=build_music(); L+=mL; R+=mR
    stereo=np.stack([L,R],axis=1)
    peak=float(np.max(np.abs(stereo))); rms=float(np.sqrt(np.mean(stereo**2)))
    print(f'  [mix] peak={peak:.3f} rms={rms:.4f}')
    stereo=np.tanh(stereo/(peak+1e-9)*1.25)
    stereo=stereo/np.max(np.abs(stereo))*(10**(-1/20))
    return stereo[:N]

# ---------------- lo-fi chill 配乐（BPM 98） ----------------
def build_music():
    L=np.zeros(N); R=np.zeros(N)
    BPM=98; S16=60/BPM/4
    t0=0.6; end=29.6
    def kick():
        d=0.24; t=t_arr(d); f=130*np.exp(-t*16)+44
        return np.sin(2*np.pi*f*t)*np.exp(-t*8)*0.7
    def hat(op=1.0):
        d=0.05; t=t_arr(d); return bandpass(white(len(t)),6500,12000)*np.exp(-t*60)*0.28*op
    def bass_note(f,d):
        t=t_arr(d); y=np.sin(2*np.pi*f*t)*np.exp(-t*4) + 0.4*np.sin(2*np.pi*f*2*t)*np.exp(-t*6)
        return onepole_lp(y,900)*np.clip(1-t/d,0,1)**0.5
    def pluck(f,d=0.3):
        t=t_arr(d); y=np.sin(2*np.pi*f*t)+0.4*np.sin(2*np.pi*f*1.005*t)
        return onepole_lp(y,2600)*np.exp(-t*9)*0.35
    CH={'C':[hz(48),hz(55),hz(60)],'Am':[hz(45),hz(52),hz(57)],
        'F':[hz(45),hz(53),hz(57)],'G':[hz(43),hz(50),hz(55)]}
    def section(t):
        if t<3.0: return 'intro'
        if t<8.0: return 'chill'
        if t<14.0: return 'drive'
        if t<20.0: return 'tension'
        if t<25.0: return 'drop'
        return 'warm'
    def place(y,ts,gain,pan=0.0):
        i0=int(round(ts*SR))
        if i0>=N or len(y)==0: return
        ie=min(N,i0+len(y)); y=y[:ie-i0]
        a=(pan+1)*np.pi/4
        L[i0:ie]+=y*gain*np.cos(a); R[i0:ie]+=y*gain*np.sin(a)
    chorder=['C','Am','F','G']
    i=0
    while t0+i*S16<end:
        ts=t0+i*S16; beat=i%4; bar=(i//4)%4; st=section(ts); chord=CH[chorder[bar]]
        if st=='intro':
            if beat==0: place(bass_note(hz(36),0.5),ts,0.5)
            place(hat(0.3),ts,0.15)
        elif st=='chill':
            if beat==0: place(kick(),ts,0.8)
            if beat==2: place(hat(0.5),ts,0.25)
            if beat==0: place(bass_note(hz(36),0.25),ts,0.6)
            if beat in (1,3): place(pluck(chord[(i//2)%3]),ts,0.3,-0.2)
        elif st=='drive':
            if beat==0: place(kick(),ts,0.85)
            if beat==2: place(hat(0.6),ts,0.3)
            if beat in (0,2): place(bass_note(hz(36),0.15),ts,0.6)
            if beat in (1,3): place(pluck(chord[(i//2)%3]),ts,0.32,0.2)
        elif st=='tension':
            place(hat(0.35),ts,0.18)
            if beat==0: place(bass_note(hz(31),0.5),ts,0.5)
            if beat==2: place(pluck(chord[(i//2)%3]),ts,0.25)
        elif st=='drop':
            if beat==0: place(bass_note(hz(31),0.6),ts,0.4)
        elif st=='warm':
            if beat==0: place(kick(),ts,0.7)
            if beat==2: place(hat(0.5),ts,0.22)
            if beat==0: place(pluck(chord[0],0.8),ts,0.35,-0.2)
        i+=1
    return L,R

import wave
def write_wav(stereo,name):
    pcm=np.int16(np.clip(stereo,-1,1)*32767)
    with wave.open(os.path.join(os.path.dirname(__file__),name),'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('wrote',name,'len',len(stereo)/SR)

if __name__=='__main__':
    print('--- pure SFX ---'); write_wav(build(music=False),'sfx.wav')
    print('--- with music ---'); write_wav(build(music=True),'sfx_music.wav')
