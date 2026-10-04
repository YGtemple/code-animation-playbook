# Code Animation Playbook（纯代码动画流水线）

> 不调用任何图像 / 视频 / 音乐生成模型，**只用代码**做出可在全平台直接播放的动画短片。
> 画面用 HTML + SVG + JavaScript 画，无头 Chromium 逐帧截图，声音用 Python(numpy/scipy) 合成，ffmpeg 合成 MP4。

这套仓库是一份**可复用的方法论 + 可直接运行的模板**。仓库根目录当前的内容是第一个参考实例《AI 大战验证码》（30 秒朋克拼贴风）。换题材、换视觉风格时，**管线一行不用改，只换"皮肤层"**（色板 / 字体 / 造型 / 质感 / 曲风），见 [`docs/restyling-guide.md`](docs/restyling-guide.md)。

---

## 流水线一览（6 个文件，各司其职）

| 文件 | 职责 | 关键约束 |
|---|---|---|
| `timeline.js` | **全片唯一时间源**：集中声明所有事件时间 `T`，并用确定性循环生成音效线索 `SFX_CUES` | 画面和声音都从这里取时间，其他文件不写死秒数；改节奏只改这一处 |
| `index.html` | 声明本地字体的 `@font-face` 和一个 1920×1080 的 SVG 舞台 | 内容全部由 JS 在加载时一次性建好 |
| `render.js` | 加载时把所有 SVG 元素建好一次，再暴露纯函数 `render(t)` | 同一个 `t` 必出同一帧；只改属性 / 切 `display` / 改文字，**不做随机、不做异步** |
| `render_frames.js` | playwright-core 驱动系统 Chromium 逐帧渲染 PNG | **断点续渲 + 页面/浏览器崩溃自动重建重试** |
| `sfx.py` | 读 `sfx_cues.json`，用 numpy/scipy 纯代码合成声音 | 输出纯音效版与配乐版；软限幅并把峰值归一到 −1dBFS |
| `metrics.py` + `encode.sh` | 交付前能量自检；ffmpeg 合成最终 MP4 | 自检不过不交付 |

数据流：

```
timeline.js ──► render.js ──► render_frames.js ──► frames/frame_0000..0899.png
    │                                                   │
    └──► SFX_CUES ──► sfx_cues.json ──► sfx.py ──► sfx.wav / sfx_music.wav
                                                        │
            frames/ + sfx*.wav ──► encode.sh (ffmpeg) ──► 最终 MP4
                          ▲
                   metrics.py 自检
```

---

## 快速开始

### 环境依赖

- **Node.js**（开发用 v22）+ 一次依赖安装：
  ```bash
  npm install        # 只装 playwright-core；不下载浏览器
  ```
- **系统 Chromium / Chrome**（不依赖 playwright 下载浏览器）。渲染脚本默认用 `/usr/local/bin/chromium`，
  其他系统用环境变量指定：
  ```bash
  export CHROMIUM_PATH="/usr/bin/chromium"      # Linux
  # Windows: set CHROMIUM_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
  # macOS:   export CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ```
- **Python 3** + `numpy scipy pillow`：`pip install numpy scipy pillow`
- **ffmpeg**（合成用）

### 一键跑完整流程

```bash
npm run all
# = 渲染帧 → 合成声音 → 能量自检 → 合成 MP4
```

或分步执行（推荐，方便定位问题）：

```bash
npm run render     # 1. 逐帧渲染 PNG 到 frames/（可中断，重跑自动续渲）
npm run sfx        # 2. 合成 sfx.wav（纯音效）与 sfx_music.wav（配乐）
npm run metrics    # 3. 能量自检（帧差 / 静止帧 / 黑红面积）
npm run encode     # 4. ffmpeg 合成两个 MP4
```

> `encode.sh` 的片名 / 帧率 / 时长 / 分辨率可用环境变量覆盖，例如：
> `TITLE=我的新片 DURATION=30 bash encode.sh`

---

## 仓库结构

```
.
├── README.md                 # 本文件（总览 + 快速开始）
├── ROADMAP.md                # 后续优化计划（持续更新）
├── LICENSE                   # MIT
├── package.json
├── index.html                # SVG 舞台 + 字体声明
├── timeline.js               # 唯一时间表 + 音效线索
├── render.js                 # 建元素 + 纯函数 render(t)
├── render_frames.js          # 逐帧渲染（断点续渲 / 崩溃重启）
├── sfx.py                    # 声音合成（纯音效 + 配乐）
├── sfx_cues.json             # 页面导出的音效线索（画面→声音的桥）
├── metrics.py                # 交付前能量自检
├── encode.sh                 # ffmpeg 合成脚本
├── fonts/                    # 4 款开源字体 + LICENSES.md
└── docs/
    ├── playbook.md           # 方法论总纲（架构 / 流程 / 设计套路）
    ├── restyling-guide.md    # ★ 换风格指南：引擎不变，只换皮肤
    ├── sound-guide.md        # 纯代码声音合成方法
    ├── pitfalls.md           # ★ 踩坑全集（症状 / 根因 / 对策）
    ├── qa-checklist.md        # 交付前自检清单（ffprobe + 能量指标）
    └── reference/
        └── fifi-original-prompt.md   # 灵感来源 prompt 存档
```

---

## 核心心智模型（务必先读这三条）

1. **时间只有一个真相来源**：所有"第几秒发生什么"都写在 `timeline.js` 的 `T` 里。画面渲染和音效线索都引用它，
   绝不在 `render.js` / `sfx.py` 里写死秒数。想改节奏，只动 `timeline.js`。
2. **渲染是纯函数**：`render(t)` 对同一个 `t` 永远输出同一帧。所有元素在加载时建好一次，
   `render` 只改属性、切 `display`、改文字。不允许 `Math.random()`、不允许异步——随机性全部走
   **确定性哈希** `h(n) = frac(sin(n*127.1+311.7)*43758.5453)`，并以帧号为种子。
3. **每个事件都叠"五件套"**：主体 backOut 到位 + 硬投影 + 闪白/推镜 + 集中线/速度线 + 同帧音效。
   这套组合拳与风格无关，是"看起来有劲"的关键。

---

## 做一支不同风格的新片（最短路径）

1. 复制本仓库（或新建分支）；
2. 打开 [`docs/restyling-guide.md`](docs/restyling-guide.md)，按清单替换皮肤层：
   色板常量、`@font-face` 与字体 token、`ICONS` 造型词汇、纸纹/滤镜参数、`sfx.py` 的曲风与节奏型；
3. 在 `timeline.js` 重排事件时间（管线不动）；
4. `npm run all`，对照 [`docs/qa-checklist.md`](docs/qa-checklist.md) 交付。

朋克拼贴 ⇄ 极简 / 赛博 / 水彩 等风格的具体替换对照表见 restyling-guide。

---

## 参考实例：《AI 大战验证码》

鼠标光标闯人机验证：红绿灯里混进半根杆子、摩托车要点 9 次、斑马线光标分身、16×16 网格 16 个光标 0.03 秒扫一格，
结果"你点得太快了，不像人类"；于是"装人类"，可信度仪表 0→37→64→88→99% 发抖，最后砸到 100% 通过，
结尾反转"我不是机器人。（我是机器人。）"

成片规格：1920×1080 / 30fps / 900 帧 / 正好 30.000s / H.264 High / yuv420p / AAC 48kHz 立体声 / +faststart。
交付自检：平均帧差 7.92、连续静止帧 5.78%、黑+红面积 27.75%，三项全 PASS。

---

## 持续更新

本仓库会随每一支新片不断沉淀新风格皮肤、新音色和新踩坑。更新约定见 [`ROADMAP.md`](ROADMAP.md)。
新增 / 修正经验时，优先更新 `docs/pitfalls.md` 与对应指南，保持"一处真相"。

## 致谢与许可

- 方法论灵感来自 [`fifi-video-prompt`](https://github.com/huiq777/fifi-video-prompt)，原始 prompt 存档于 `docs/reference/`。
- 代码与文档以 **MIT License** 发布；随附字体各自遵循 OFL / Apache 许可，见 `fonts/LICENSES.md`。
