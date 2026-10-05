# 实例九《冗余变量 X-07》——包豪斯/瑞士网格几何风

> 30.000s / 1920×1080 / 30fps / 900 帧；H.264 High + yuv420p，AAC 48kHz 立体声，+faststart。
> 引擎与喜剧结构不变，换成理性几何的包豪斯皮肤。

## 剧情

主角（红色三角光标）走进瑞士网格考核大厅，连过四级"AI 协同胜任力"考核，全部满分，
岗位却已被 AI 自动填充：

| 回合 | 考核 | 结果 |
|---|---|---|
| R1 | prompt speed：沙漏倒数内接住重排几何条 | 3/4（漏 1） |
| R2 | agent orchestration：连 Agent 节点，手抖连歪一格 | 5/6（红叉） |
| R3 | zero-error：几何填满任务矩形 | 99/100（差一格） |
| R4 | human-ai synergy：与蓝方块配合摆三角 | 100% |
| 总分 | 数字整翻到 100，PASS 印章盖下 | 100 |
| 反转 | 蓝色大方块落进主角那格占住，POSITION FILLED BY AI / OPTIMIZATION QUEUE，红粗叉划掉脚下格 | 62.0% |
| 补刀 | 工牌翻牌 EMPLOYEE → REDUNDANT | 冗余变量 X-07 |

喜剧引擎＝冰冷规则系统 vs 人的失控；战场从"人 vs AI"推到"人 vs 会用 AI 的人"。

## 皮肤要点

- 三原色＋黑白灰：红 `#D52020`（错/删）、黄 `#FAC901`（对/进度）、蓝 `#205CD5`（系统/AI）、
  墨 `#111111`、纸白、冷灰 `#E8E8E8`；平涂、颜色即语义，禁渐变/混色/发光。
- 基础几何（圆/方/三角）、12 列网格、8px 基线、正面正交、只允许 90° 旋转。
- **boil 关闭**：图形沿网格整数格跳格、每 beat 状态切换、转场硬切/竖条 wipe、文字逐字弹入、
  数字整翻；常驻 12 格进度条每 0.3s 亮一格（永动活性源）。
- 音乐极简序列＋电子鼓，BPM120：808/909 干鼓 + 方波/三角 pluck（相位叠加）+ sub bass；
  反转全曲骤停 0.5s 再低音长鸣，片尾孤立钢琴单音。
- **字体随示例自带（`fonts/`，OFL）**：Space Grotesk（标题/数字）、Inter（正文）。
  中文用 Noto Sans SC（见下，体积大故不随示例）。

## metrics 重定义（旧指标作废）

- 三原色覆盖（HSV 桶，S≥0.6）：每帧三色合计占内容区 15–60%、至少命中 2 桶。
- 网格活性：内容区按 8×8 切块取 V，相邻帧 |ΔV|≥3 的块占比 ≥5% 为真运动帧；
  真死帧连续 ≤0.4s（约 12 帧）。
- 帧差用内容区口径（boil 关干净风格）。实测：覆盖 15.16%、最长死帧 0.10s、900 帧。

## 运行

> 中文字体体积大、未随示例，先下载 Noto Sans SC（OFL）到 `fonts/`：

```bash
mkdir -p fonts
curl -L -o fonts/NotoSansSC.ttf \
  "https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
CHROMIUM_PATH=/usr/local/bin/chromium node render_frames.js
python3 sfx.py && python3 metrics.py
```

无生成式模型、无外部素材。
