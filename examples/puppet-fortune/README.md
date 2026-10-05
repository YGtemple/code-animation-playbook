# 实例十一《求个不被裁的签》——剪纸 / 皮影风（首支带 TTS 中文旁白）

> 30.000s / 1920×1080 / 30fps / 900 帧；H.264 High + yuv420p，AAC 48kHz 立体声，+faststart。
> 引擎与喜剧结构不变，换成背光牛皮幕布的皮影皮肤；**本批起新增 TTS 中文人声旁白（画面/音效/配乐仍纯代码）**。

## 剧情

古代打工人在庙会观音殿求签求差事，签文逐渐变成工号，最后发现自己也是签筒里的一根签：

| 段落 | 画面 | 关键道具 |
|---|---|---|
| R1 | 跪地摇签，掉出"上上签"朱砂印，作揖大喜 | 上上签 |
| R2 | 再摇，签文"工号0001·试用99年"，笑容凝固 | 工号0001 / 试用99年 |
| R3 | 猛摇，签筒喷涌漫天签（功德+1 / OKR / 出勤100% / 绩效S），菩萨脖子挂着现代工牌，苦茶碗抖 | 签雨、菩萨工牌 |
| R4 | 签筒里伸出提线抽走签，小人愣住、发现自己背后也吊着提线 | 提线 |
| 反转 | 抬头见一排同样挂工牌的皮影，自己也被吊其中；签筒倒地滚出新签，朱砂大印"已归档"盖下，大锣"铛" | 大印：已归档 |
| 定格 | 签特写，幕布合一线，提线末端露出小箭头光标 | 箭头光标 |

踩中"工位赛博祈福 / 电子木鱼 / 烧香求 offer"情绪：当代人拜的不是佛，是 KPI。
彩蛋：签文=验证码、朱砂大印=印章、菩萨工牌、功德+1=token、苦茶=咖啡、提线末端箭头=光标。

## 皮肤要点

- 幕布透光体系：底 `#F2E3C6`（占60%+）、高光 `#FBF4E2`、暗角 `#E3CDA6`；
  人物深剪影 `#2B1D16`（不用纯黑、偏棕）、后层 `#7A5C44`、前景 `#4A3428`；
  朱砂 `#C8372D`、石绿 `#4E7A4E`、赭金描边 `#B8893A`。
- 硬边 path、无圆角无模糊；镂空用 `fill-rule:evenodd` 负形露出幕布色；赭金描边 1.5px；四层 z-index。
- 人物主体永远剪影、靠镂空负形和赭金描边识别，**绝不给人物上色块**。
- **boil 全局关**：活感来自关节每帧 ±1.5° 正弦、青烟每帧转 2° 上升、签支 ±2px 抖、
  盖章 1–2 帧一次性朱砂晕开后回实色、提线木柄微晃。
- 音乐皮影后台轻场：板胡（高频主旋律）+ 木鱼/梆子（动作点）+ 大锣（反转重击），BPM72–80；
  开场幕布"嗖"、签筒"哗啦"逐回合递增、盖章"咚"、大锣"铛"、锣后留白 0.5s。

## 旁白文案与音色（TTS，唯一生成式环节）

音色：**温润、沉稳说书感男声、语速偏慢**（30–40 岁）。逐句生成、按时间点对位：

| 句 | 时间 | 文案 |
|---|---|---|
| V1 | 1.0s | 古时候找差事，先求菩萨。 |
| V2 | 7.5s | 第一签，求个饭碗。 |
| V3 | 14.0s | 第二签，求个不被顶替。 |
| V4 | 20.5s | 菩萨没抬头，先记下了他的工号。 |
| V5 | 24.2s | 他以为自己在求签—— |
| V6 | 26.7s | 其实，他也是一根签。 |

> 必要让步：V4/V5/V6 原速会顶破 30s 硬顶，分别 atempo 1.12 / 1.10 / 1.18 加速；
> V5 由 23.5 挪到 24.2、V6 由 27.5 挪到 26.7。旁白克制、不剧透，包袱留给画面。

## metrics 重定义（皮影口径，旧指标作废）

- 只对"前景主角+签筒+关键签"bounding box（x420–1500 / y350–950）做 diff，忽略幕布与分层阴影；
  内容区缩到 96×54 NEAREST，相邻帧 diff 率 ≥2% 为活帧。
- 真死帧（diff<0.5%）连续 ≤0.4s（约12帧）；仅结尾定格 ≈0.5s 为有意死帧。
- 全片不用半透明叠加（盖章 1–2 帧径向渐变后回实色、青烟用实色 path），避免色盒被半透明污染。
- 镂空自检：负形区均色 ≈ `#F2E3C6`；配色纪律硬检：红 ≤15%、绿 ≤10%、金 ≤8%。
- 实测：活帧 43.8%、中位相邻 diff 1.77%、最长真死 14 帧（0.47s，结尾定格；其余 ≤12 帧）；
  红 1.4% / 绿 0.1% / 金 1.8%（合计 3.2%）；900 帧断言 PASS。

## 运行（Windows / PowerShell；其他系统同理）

> 大字体未随示例：从根 `fonts/` 复制 ZhiMangXing，并下载 LXGW 文楷与 Noto Sans SC 到 `fonts/`。

```powershell
# 依赖（playwright-core 已在根 node_modules；或在本目录 npm install）
Copy-Item -Recurse -Force ..\..\node_modules .
New-Item -ItemType Directory -Force fonts | Out-Null
Copy-Item ..\..\fonts\ZhiMangXing.ttf fonts\
curl.exe -L -o fonts/LXGWWenKai.ttf "https://cdn.jsdelivr.net/gh/lxgw/LxgwWenKai/fonts/TTF/LXGWWenKai-Regular.ttf"
curl.exe -L -o fonts/NotoSansSC.ttf "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"

# 1) 逐帧画面（render_frames.js 已配本机 Chrome 路径；其他系统改 executablePath）
node render_frames.js
# 2) 纯代码配乐/音效床（产出 bed.wav）
python sfx.py
# 3) TTS 旁白：用 text_to_audio_plus 逐句生成，裁去首尾静音存为
#    voice/v1_trim.wav v2_trim.wav v3_trim.wav；
#    V4/V5/V6 经 atempo(1.12/1.10/1.18) 加速存为 voice/v4_spd.wav v5_spd.wav v6_spd.wav
# 4) 旁白对位 + ducking 混音（产出 mix_voice.wav / mix_novoice.wav）
python mix_voice.py
# 5) 编码两版 MP4
powershell -File encode.ps1
```

无生成式模型（TTS 旁白为明确例外）、无外部素材。
