# 实例四《养龙虾》——PICO-8 复古像素（首次换皮肤）

> 30.000s / 1920×1080 / 30fps / 900 帧；H.264 High + yuv420p，AAC 48kHz 立体声，+faststart。
> 引擎与喜剧结构不变，完整换成 8-bit 皮肤，验证流水线可复用。

## 剧情

蓝色像素打工人召唤一只 AI 龙虾员工代打工：SUMMON → 它干活我摸鱼（LEVEL UP / COMBO）→
龙虾 LV.3 自动接需求 → 暴涨成 BOSS → HR 弹窗"该岗位已由 AI 接管"、YOU ARE FIRED →
GAME OVER / INSERT COIN TO RETRY。HUD：SCORE 000000→001300、HP 三红心→归零。

## 皮肤要点

- 色板锁死 PICO-8 官方 16 色（CC0），禁止调色板外颜色与渐变（层次仅 2×2 棋盘 dithering）。
- `shape-rendering="crispEdges"`、整数坐标、方块 rect 堆叠；**boil 关闭**，
  靠 2 帧 walk cycle、HUD 跳动、受击白闪、BOSS 呼吸、扫描线滚动做运动补偿。
- 音乐为 NES 2A03 四通道（25%/12.5% 方波 + 三角波 bass + 噪声鼓），BPM 92→132→160。
- **字体随示例自带（见 `fonts/`，均 OFL）**：Press Start 2P（英文标题/UI）、VT323（正文/HUD）、
  FusionPixelZH（中文像素，来自 TakWolf/fusion-pixel-font）。

## metrics 重定义（旧朋克"黑+红≥12%"作废）

- 第三条改测【活性色像素占比】：红/黄/绿/橙四色精确色盒（因 crispEdges 硬量化、无羽化），
  排除顶部 HUD；均值 ≥6%，高潮帧（WARNING/FIRED/GAME OVER）≥15%。
- 帧差在舞台区计算（排除扫描线，防虚高）；静止帧放宽容纳 2 帧 walk cycle（连续 ≥6 帧零位移才算）。
- **下采样必须用 NEAREST**（双三次会把精确活性色糊掉、导致漏判）；
  半透明闪烁会让颜色跌出色盒（活性块用不透明实色）；扫描线不进指标。

## 运行

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
CHROMIUM_PATH=/usr/local/bin/chromium npm run render
npm run sfx && npm run metrics
TITLE="养龙虾" npm run encode
```

无生成式模型、无外部素材。
