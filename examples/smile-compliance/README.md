# 实例十《微笑合规》——Riso 孔版印刷双色风

> 30.000s / 1920×1080 / 30fps / 900 帧；H.264 High + yuv420p，AAC 48kHz 立体声，+faststart。
> 引擎与喜剧结构不变，换成两专色叠印的 Riso 皮肤。

## 剧情

情绪合规检测仪（AI）逐回合考核打工人的职业假笑，唯一一次真笑反被判事故：

| 回合 | 考核 | 得分 |
|---|---|---|
| R1 | 网点填充人脸挤露齿笑（露 8 齿） | 60 |
| R2 | 眼周画鱼尾纹（眼睛也要笑），冒汗 | 80 |
| R3 | 钴蓝扫描线做真诚度检测，嘴角 ±0.1mm | 95 |
| R4 | 要求全天保持，假脸面具裂开 | 100 / 24h |
| 反转 | "18:00 下班"，人真笑 0.1s → 机器红警、假脸脱落、毛笔章"不合格" | Token −1 |

越真实越不合格，呼应片7"活体不可排班"、片8"Token 倒扣"。
神补刀：脱落假脸旁打字机体小字"假笑满分，真人拒收。"

## 皮肤要点

- 两专色＋纸色：荧光桃红 `#FF4D8D`、钴蓝 `#1E5AA8`、纸张米白 `#F1E7D2`；
  两色 multiply 叠印处≈莓紫 `#6E2A5E`（只在叠印区，禁凭空第三色）。
- 粗描边圆头、扁平填色、复制专色副本 translate(2,2) 做套色错位 halo；
  暗部用半调网点而非实心黑、色块故意没对齐。
- **boil 轻开：只让网点密度与套色偏移微动、主体形状不抖**；纸噪极轻。
- 音乐 lo-fi chillhop，BPM84：Rhodes 电钢琴 + 黑胶刷碟噪 + boom-bap 轻鼓 + sub 低鸣；
  判定=收银机叮、盖章啪、撕纸嚓、反转=8-bit 蜂鸣+黑胶跳针。
- **字体随示例自带（`fonts/`，OFL）**：Space Mono Regular/Bold（打字机/数字）。
  中文用 Noto Sans SC，落款毛笔印章用 ZhiMangXing（均见下）。

## metrics 重定义（旧指标作废）

- 颜色合规：按专色通道分离 pink/blue/纸底 三层采样，合法四类（含叠印莓紫，ΔE≤6）；
  检出四类外纯色＝跑色。multiply 叠印须先通道分离再比对，勿把叠印紫误判第三专色。
- 网点（暗部）覆盖 35–65%；套色错位 halo 1–3px。
- 帧差用内容区口径：mask 掉网点抖动与 ±0.5px 套色漂移，只比主体/文案/色块；
  内容真死帧连续 ≤0.4s。
- 实测：跑色 0%、网点 31.1%、错位 halo 29.2%、内容变化 14.94%、最长死帧 0.20s、900 帧。

## 运行

> 中文字体体积大、未随示例，先下载 Noto Sans SC，并从根 `fonts/` 复制 ZhiMangXing：

```bash
mkdir -p fonts
curl -L -o fonts/NotoSansSC.ttf \
  "https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"
cp ../../fonts/ZhiMangXing.ttf fonts/
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
CHROMIUM_PATH=/usr/local/bin/chromium node render_frames.js
python3 sfx.py && python3 metrics.py
```

无生成式模型、无外部素材。
