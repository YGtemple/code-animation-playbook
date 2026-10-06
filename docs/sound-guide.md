# 纯代码声音合成指南（Sound Guide）

声音和画面一样，**全部用代码合成**，不使用任何音频素材或生成式音乐模型。
技术栈：Python + `numpy`（造波 / 造噪 / 包络）+ `scipy`（滤波），输出 WAV，再由 ffmpeg 压进 MP4。

- 采样率 `SR = 48000`；总样本 `N = int(duration * SR)`（30s → 1,440,000 样本）。
- 立体声：左右两条总线 `L / R`，通过声像 `pan`（−1 左 … +1 右）分配。

---

## 1. 基础积木

```python
def white(n, r=rng): return r.standard_normal(n).astype(np.float64)  # 高斯白噪（确定性种子）
def t_arr(sec): return np.linspace(0, sec, int(round(sec*SR)), endpoint=False)
def onepole_lp(x, cutoff): ...   # 一阶低通
def bandpass(x, lo, hi): ...     # 带通（低通+高通组合）
def lowpass(x, c): ...
```

绝大多数音效 = **振荡源（正弦/方波/锯齿/噪声）× 衰减包络（指数 exp / smoothstep），必要时再滤波**。

---

## 2. 音色配方表

> 配方要点对应 `sfx.py` 中的 `s_*` 函数。`p` 是音量 / 音高倍率。

| cue 名 | 配方要点 | 用途 |
|---|---|---|
| `click` | 正弦频率 1400→700 下滑 × `exp(-42t)`，加少量高频噪声 | 点格子 / 点按钮 |
| `tick` | 2100Hz 正弦短脉冲 × `exp(-60t)` + 噪声 | 滴答、等待、仪表步进 |
| `pop` | 频率 240→760 上弯正弦 × `exp(-17t)` | 选中后"啵" |
| `pa` | 噪声带通 600–6000 × `exp(-26t)` + 175Hz 低频 | 短促打击 / 跳切 |
| `slam` | 130→38Hz 下扫低频 + 低通噪声 + 400Hz 低频 body，三层叠加 | 重物砸下（主打击） |
| `burst` | 高频噪声(800–9000) + 58Hz 隆隆 + 900Hz 中频，三层 | 爆炸 / 爆开 |
| `thud` | 165→60Hz 下扫正弦 + 500Hz 低通噪声 | 光标落地闷响 |
| `whoosh(dur)` | 分段噪声，带通中心 220→2600 扫频，hanning 交叉拼接，包络渐强 | 飞掠 / 推镜（**结束点对齐命中**） |
| `whip` | whoosh(0.22) 后接 0.05s 的 pa 脆响 | 甩走 |
| `low` | 52Hz + 38Hz 正弦慢衰减 | 砸下后的低频余韵 |
| `buzz` | 150/159Hz 双路方波，0.5s 后快速收 | 错误 / 失败蜂鸣 |
| `snap` | 噪声带通 1200–7000，两声包络（0s 与 0.06s） | 打响指 / 点中 |
| `spring` | 频率指数衰减的相位积分 + 18Hz 振幅晃动 | 弹回 / 分身 |
| `type` | 噪声带通 900–6000 × `exp(-85t)` + 420Hz | 快速打字 / 扫格子 |
| `dong` | 520Hz + 820Hz 正弦 + 高频噪声 | 装点错的闷钟 |
| `tear` | 噪声 × 随机裂点，带通 1400–8000，sin 包络 | 撕纸 / 划掉字 |
| `cymbal` | 3200–7600 多个高频正弦 + 高频噪声，慢衰减 | 通过瞬间的镲 |
| `ding` | 基频 740Hz，谐波比 [1,2,2.42,3,4.46]，各自衰减 | 署名 / 收尾亮音 |
| `riser(dur)` | 正弦 300→1900 上扫 + 带通噪声，包络渐强 | 蓄力上升（**到顶对齐 23.5**） |
| `hum(dur)` | 60Hz 基频 + 2/3/4 次谐波，很轻，偶发咔哒 | 电流 / 设备嗡鸣 |
| `glitch` | ±1 比特噪声 × 170Hz 门控 + 900→2300 上扫 | 开场故障 |
| `room` | 白噪一阶低通到 2600 + 另一路到 400，音量仅 0.022，铺满全片 | 房间底噪（空间感） |

新增音色的套路：想清楚**声源**（什么波 / 噪声）、**音高走向**（恒定 / 上 / 下扫）、**包络**（多快衰减）、
**要不要滤波**，四步就能造一个。

---

## 3. 混音总线 `build(music=False)`

```python
def place(y, t_start, gain, pan=0.0):
    i0 = int(round(t_start*SR)); ie = min(N, i0+len(y))
    a = (pan+1)*np.pi/4
    L[i0:ie] += y*gain*np.cos(a)
    R[i0:ie] += y*gain*np.sin(a)
```

逐条处理 `sfx_cues.json`：

1. `room` 单独铺一条全片底噪；
2. 其余按 `SYNTH` 表取音色；
3. **结束点对齐**：`whoosh / riser / whip` 的起点 = `cue.t - dur`（whip 固定提前 0.22s），
   让声音落点对准画面命中；
4. 给 `whoosh / whip / tear / cymbal / burst / glitch` 交替左右 pan（−0.28 / +0.28），增加宽度；
5. 配乐版再叠加 `build_music()`；
6. **定格真静音窗口** `[15.10, 15.66]`：连房间底噪一起归零（冷场笑点）。

### 限幅与归一（最后一步，顺序不能乱）

```python
peak = np.max(np.abs(stereo))
stereo = np.tanh(stereo/peak*1.25)                       # 软限幅，避免硬削波
stereo = stereo/np.max(np.abs(stereo)) * 10**(-1/20)     # 峰值归一到 −1dBFS（≈0.891）
```

- 归一到 **−1dBFS**：既足够响，又给解码器 / 平台转码留余量，不会破音。
- **归一化之前**先查原始混音的峰值位置和整体 RMS——曾经因为一个提前爆炸的包络（峰值 139），
  归一化把整条音轨压到 RMS 0.009，重击全没了。见 [pitfalls](pitfalls.md)。

---

## 4. 配乐 `build_music()`（当前 120BPM）

用**步进序列（step sequencer）**生成，而不是写死音频：

- 16 分音符网格 `S16 = 0.125s`，从 `t0=1.0` 循环到 `end=29.5`；
- 每步算出 `beat`（在小节内的位置）、`bar`（第几小节）、当前 `section()`。

乐器（都是合成的）：

| 乐器 | 配方 |
|---|---|
| `kick` | 150→45Hz 指数下扫正弦 × 快衰减 |
| `snare` | 1500–7000 带通噪声 + 190Hz 低频 |
| `hat` | 6000–12000 带通噪声，极短 |
| `saw / bass_note` | 锯齿波（可加 detune）+ 正弦，低通，带释放包络 |
| `chord_stab` | 多个锯齿叠加成和弦；硬朗段 `tanh` 失真，柔和段低通 + 弹拨包络 |
| `ride` | 4000–10000 带通噪声（爵士段用） |

和弦用 MIDI 音符转频率：`hz(n) = 440*2**((n-69)/12)`，定义了 `C / C5 / Am7 / E` 等。

段落由 `section(t)` 决定，每段有不同的鼓点 / 配器，且**跟着剧情走**：

| 段落 | 时间 | 编配 |
|---|---|---|
| `big` | 开场 / 失败前 | kick+snare+hat+和弦 stab+bass，满编 |
| `punk` | 红绿灯 / 摩托车 | 密集 hat、反拍短和弦，冲 |
| `tension` | 半根杆子 | 只剩稀疏 hat + 轻 bass，悬 |
| `double` | 网格 / 跳切 | 每个 16 分都有 hat，bass 密集 |
| `none` | 定格 / 划掉前 | 静音（让位给冷场 / 音效） |
| `jazz` | 装人类练习 | swing ride + 柔和和弦，摇摆反差 |
| `riser` | 仪表 99% | 稀疏 hat（音效里的 riser 主导） |
| `end` | 27.6 起 | 一个 E 和弦长 stab 收尾 |

---

## 5. 换风格时声音怎么换

- 换 **BPM / 鼓组 / bass / 和声风格**：赛博 → 电子鼓 + 合成 bass + 琶音；水彩 → 钢琴 / 拨弦 + 慢；
  像素 → 方波 / 三角波 chiptune；爵士 → 原声刷鼓 + 走句 bass。
- 换**音效音色**：保持 cue 结构（时间不变），只替换每个 `s_*` 的声源（如像素风把 click 换成方波 blip）。
- 段落 `section(t)` 的时间可直接复用画面分段，保证音乐转折和剧情对齐。
- 详见 [restyling-guide.md](restyling-guide.md)。

---

## 6. TTS 中文旁白与 ducking（v1.6 起，唯一的生成式例外）

画面 / 音效 / 配乐仍全部纯代码；**旁白允许且必须用 TTS（`text_to_audio_plus`）生成**，再与纯代码床混音。

1. **写克制旁白**：开场 1–2 句交代谁 / 在哪 / 处境，关键转折一句，结尾点题；单句短、句数少、不剧透笑点。
2. **逐句生成、逐句裁静音**，按 cue 时间点对位；TTS 音频统一重采样到 48kHz、单声道→立体声、居中。
3. **ducking**：由人声区间做包络，有人声处把床下压约 −9dB（满编曲可 −12～−18dB），attack/release 平滑；
   编曲把 200Hz–2kHz 让给人声；金句处音乐收半拍。
4. **防超时**：先量每句"真实语音时长"并在时间轴预演（相邻句留 0.2–0.5s 气口、末句 ≤29.8s 收）。
   偏长句**首选**用"语速正常偏快、句子紧凑、不拖长"的指令**重新生成**（自然无伪影）；只有末句等个别情况 atempo（≤1.3）。
   多句 atempo>1.3 会发假，应避免。详见 [pitfalls P15](pitfalls.md)。
5. **人声走单独总线并测其单独 RMS**；最终峰值 −1dBFS。
6. **固定两版交付**：旁白版（配乐 + 人声，主推）、无旁白配乐版（同画面同配乐、无人声）。
7. TTS 人声目录（`voice/`、`voices/`）已 gitignore，README 注明按文案重新生成。详见 [pitfalls P13](pitfalls.md)。
8. **工具可用性**：制作子代理环境里 `text_to_audio_plus` 可能不解析；此时由 Organizer 亲自逐句生成、下载后把本地 wav
   路径交给子代理重混，**不要擅自改用 edge-tts / SAPI**。详见 [pitfalls P14](pitfalls.md)。

参考实现：`examples/puppet-fortune/mix_voice.py`、`examples/ai-unpaid/mix.py`、
`examples/clay-distill/mix_voice.py`、`examples/boot-selfcheck/mix_voice.py`（默片另见 `filmify.py` 管道胶片化）、
`examples/mountain-dao/mix_voice.py`（青绿古琴/箫）、`examples/vhs-training/mix_voice.py`（VHS，另见 `post_vhs.py` 施加老化）。

---

## 7. 声音铁律

1. **任何"时间偏移"的包络，在触发点之前必须置零**：
   `np.where(t >= onset, exp(-(t-onset)*k), 0)`。否则 `t<onset` 时指数为正会爆（见 pitfalls）。
2. cue 的 whoosh/riser/whip 用**命中时刻**，结束点对齐；其余用触发时刻。
3. 归一化前先检查峰值位置与整体 RMS，不能只看单个峰。
4. 最终软限幅 + 峰值 −1dBFS，长度精确对齐 `duration`。
5. 刻意的定格 / 静音是表达，不是 bug；其余地方不要留意外的静音或断层。
