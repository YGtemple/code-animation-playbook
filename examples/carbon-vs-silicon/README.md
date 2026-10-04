# 实例二《碳基的尊严》

> 第二部用纯代码流水线产出的 30 秒朋克拼贴动画，与第一个实例《AI 大战验证码》构成**镜像续集**。
> 规格：30.000s / 1920×1080 / 30fps / 900 帧；H.264 High + yuv420p，AAC 48kHz 立体声，+faststart。

## 讲了什么

一个**碳基打工人**登上"人类不可替代"终极擂台，与方头芯片机器人五回合对决：

| 回合 | 比拼项 | 结果印章 |
|---|---|---|
| R1 | 比做 PPT（速度） | AI 3秒 = 你3天 |
| R2 | 比做报表（准度） | 错误率 0.00% |
| R3 | 比熬夜（续航） | 你 4h / AI ∞ |
| R4 | 比性价比（成本） | 碳基成本 +∞ |
| R5 | 终局一问：你到底比 AI 强在哪？ | AI 抢答：更便宜·24h·0情绪·会自己迭代 |

**反转**：大红"录用！"章盖在 AI 工牌上（此处定格 + 真静音 0.6s），老板对人类说"你留下，教它"——
人类工牌被改成"人类教具 / AI 陪练"。**赢了擂台，输了工位。**

第一部是"AI 拼命装人、结果真是机器"；本部是"人拼命证明比 AI 强、结果真是可被替换的"，两相互文。

## 文件（与模板一一对应）

- `timeline.js`：全片唯一时间源（事件表 `T` + 音效线索 `SFX_CUES`）。
- `render.js`：加载时一次建好全部场景，纯函数 `render(t)` 出帧；含本片 ICONS 与文案。
- `render_frames.js`：playwright-core + 系统 Chromium 逐帧渲染（断点续渲 + 崩溃重启，WORKERS=2）。
- `sfx.py` / `sfx_cues.json`：numpy/scipy 纯代码合成声音；出纯音效、配乐两版。
- `metrics.py`：能量自检；`encode.sh`：ffmpeg 合成两版 MP4。

## 如何运行

> 字体（约 12MB）为全仓库共享、未在示例中重复存放。渲染前先把仓库根 `fonts/` 复制（或软链）到本目录：

```bash
cp -r ../../fonts ./fonts          # 或: ln -s ../../fonts fonts
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install   # 仅装 playwright-core，不下载浏览器
CHROMIUM_PATH=/usr/local/bin/chromium npm run render   # 逐帧渲染 900 张 PNG
npm run sfx                        # 生成 sfx.wav / sfx_music.wav
npm run metrics                    # 能量自检（帧差/静止帧/黑+红）
TITLE="碳基的尊严" npm run encode   # 产出两版 MP4
```

皮肤参数（米黄纸 `#efe2c2`、墨 `#1b1410`、朱红 `#d7261e`、纸面 `#f5ebd2`、4 款本地字体、
沸腾 feTurbulence 逐帧 seed、五件套画法）与模板完全一致；仅替换了 ICONS 造型、场景与文案。
未使用任何生成式模型或外部素材。
