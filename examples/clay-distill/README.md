# 实例十三《反蒸馏 Skill：那块炼不化的黏土》——黏土/橡皮泥定格风（带 TTS 中文旁白）

> 30.000s / 1920×1080 / 30fps / 900 帧；H.264 High + yuv420p，AAC 48kHz 立体声，+faststart。
> 引擎与喜剧结构不变，换成柔软橡皮泥的定格摆拍小世界；含 TTS 中文人声旁白。

## 剧情

邪修 AI 的炼化炉一关关吸走黏土员工「小黏」的技能，小黏被一层层削薄、揉平，最后被拍成完美光滑白球、宣布蒸馏 100%——反转：白球没有指纹、是个假人，真小黏从桌下钻出、背手站到窗边：

| 段落 | 画面（黏土） | 关键数字 |
|---|---|---|
| 钩子 | 黏土办公室全景，炼化炉亮红灯、吸管触手抬起，工牌「小黏」 | 今日已炼化同事：7 |
| R1 报表 | 吸管吸走键盘、炉里变扁成紫光，手臂细一圈 | +128 token → 35% |
| R2 文案 | 嘴被拉成一条平整直线，小黏愣住 | +256 → 60% |
| R3 数据 | 眼镜被吸、眼睛揉成两个光滑圆点，越来越「完美光滑」 | +512 → 90% |
| R4 人际 | 两只手在背后死死攥住不放、拉扯变形，进度卡 90% 闪烁 | 卡 90% |
| 假胜利 | AI 暴怒一巴掌把小黏拍成完美光滑白球，「蒸馏完成 100%」+「已炼化」章 | 100% |
| 反转 | 白球是假人；真小黏背手站窗边、负鼠海报、便利贴「我累了，但不会倒下」、白色软方彩蛋 | 退回 37% 转圈 |

真正炼不走的，是背后攥住不放的双手和那撮手工指纹——「有些东西，太像人，反倒炼不化」。
彩蛋：光标贴纸、工牌、印章、咖啡杯、token 紫点、背手负鼠海报、霉豆腐白色软方。

## 皮肤要点

- 色板：主角陶土橙 `#E8A87C`、工装奶油米 `#F2E3D5`、背景鼠尾草绿 `#B7C4A8`、木桌面 `#D9B38C`、
  AI 炼化炉冷灰蓝 `#7C93A8`（冷机器 ≤25%，冷暖比 7:3）、警示进度红 `#E26D5A`、
  暗部深棕 `#6B4F3A`（**禁纯黑**）、高光奶白 `#FFF6EC`（**禁纯白**）、token 紫 `#B39DDB`。圆角半径 ≥12px。
- 造型：头大身小（头身比 1.2:1，头=压扁椭圆、躯干胶囊、四肢香肠棒、扁椭圆眼+白点高光、深棕短弧嘴）；
  道具夸张（大键盘、小咖啡杯、梯形圆角炼化炉+香肠形吸管触手）；禁尖角/细直线/写实纹理。
- 打光/手工痕：左上 45° 径向渐变（亮 10%）、下 1/3 补光、贴地椭圆软影（`#6B4F3A` opacity0.18 模糊8）；
  `feTurbulence(fractalNoise,0.9,2)` opacity 6–8% **只叠角色层**；固定 seed 指痕浅弧；
  轮廓每 pose ±1.5px 扰动且 seed 按 pose 固定（同 pose 两帧一致）。
- **定格步进：2 帧一拍 = 450 个 pose**（pose 硬切、无运动模糊），关键停顿 3 帧一拍、结尾负鼠站姿 4 帧一拍；
  每 4 拍呼吸 ±2% squash&stretch、静止 pose ±0.5px、被吸时整体向拽向压扁 5% 回弹。
- 音乐：怪趣办公室小品，尤克里里+钟琴+口哨，104 BPM C 大调，0:18–0:26 转 A 小调加低音提琴，结尾回 C 大调呆萌哨音。
  音效：吸技能=带通噪声下行+80Hz 啵、揉黏土=低通噪声 AM、+token=钟琴上行五度、拍扁=120→40Hz 低频下压、AI 卡=重复 buzz。

## 旁白文案与音色（TTS，唯一生成式环节）

音色：**温暖、带气泡感的讲故事女声**，语速偏慢、尾音轻扬（备选憨厚青年男声）。逐句生成、按时间点对位：

| 句 | 时间 | 文案 |
|---|---|---|
| 1 | 1.0s | 小黏，是办公室里最普通的一块黏土。 |
| 2 | 8.6s | AI 说，他的本事，都能被炼走。 |
| 3 | 16.0s | 报表、文案、数据，一层一层，全炼走了。 |
| 4 | 21.0s | 可炼到最后，AI 卡住了。 |
| 5 | 26.0s | 有些东西，太像人，反倒炼不化。 |

> 第 3/5 句按 P13 做 1.12/1.18 自然加速以收在 30s 内；旁白克制、不剧透笑点。

## metrics 重定义（定格步进口径，旧逐帧差作废）

- 旧逐帧差在「2 帧一拍」下必然半数为 0，会把故意的定格误判成死帧；改在 **pose 采样层**测形变。
- pose `p_i = frame(2i)`（共 450）；按 `#E8A87C ±12` 掩膜，提质心 `(cx,cy)`、外接框比 `sq=H/W`、16 射线径向轮廓 `r(θ)`。
- 活 pose（任一）：质心位移 ≥4px、`(1−corr(r_i,r_{i+1})) ≥0.03`、`|Δsq| ≥0.025`。
- 窗口 = 30 pose（1s），窗口 alive 需 active pose ≥3；全片 alive 窗口占比 ≥0.85；
  剧本静止 beat 走白名单（总时长 ≤20%/≤6s，含结尾负鼠定格）；禁白名单外连续 2 窗口 active=0。
- 实测：active poses 171/449、alive 窗口占比 85.7%、白名单外死窗口 0；900 帧断言 PASS。

## 运行（Windows / PowerShell；其他系统同理）

> 站酷快乐体（ZCOOL KuaiLe，OFL）已随示例（`fonts/`）。两款大字体需自行下载到 `fonts/`：
> 站酷庆科黄油体（大数字）与 Noto Sans SC（小字）；庆科黄油体亦在仓库根 `fonts/`。

```powershell
Copy-Item -Recurse -Force ..\..\node_modules .
New-Item -ItemType Directory -Force fonts | Out-Null
curl.exe -L -o fonts/ZCOOLQingKeHuangYou.ttf "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/zcoolqingkehuangyou/ZCOOLQingKeHuangYou-Regular.ttf"
curl.exe -L -o fonts/NotoSansSC.ttf "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"

# 1) 逐帧画面（render_frames.js 已配本机 Chrome 路径；其他系统改 executablePath）
node render_frames.js
# 2) 纯代码配乐/音效床（产出 bed.wav）
python sfx.py
# 3) TTS 旁白：用 text_to_audio_plus 逐句生成，裁剪首尾静音后存为 voice/v1.wav … v5.wav
# 4) 旁白对位 + ducking 混音（产出 mix_voice.wav / mix_novoice.wav）
python mix_voice.py
# 5) 编码两版 MP4
powershell -File encode.ps1
```

无生成式模型（TTS 旁白为明确例外）、无外部素材。
