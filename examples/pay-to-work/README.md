# 实例八《自费 Token 上岗记》——80s 孟菲斯/波普

> 30.000s / 1920×1080 / 30fps / 900 帧；H.264 High + yuv420p，AAC 48kHz 立体声，+faststart。
> 引擎与喜剧结构不变，换成明亮撞色的孟菲斯皮肤。

## 剧情

打工人被要求自掏腰包买 AI 额度才能上班，四连升档，工资条最后倒扣：

| 回合 | 内容 | 价格/数字 |
|---|---|---|
| R1 | 紫色方块头老板甩账单："AI 提效是个人能力，Token 自己买" | ¥20 |
| R2 | 进度条 99% 报错红闪，被迫升档 | ¥98 畅玩版 |
| R3 | 下午再锁额，工资条弹出"AI 服务费" | ¥298 Pro（-298） |
| R4 | token maxing 疯狂输出、硬币雨 | ¥500/月企业版·自费 |
| 反转 | 实发工资从 ¥8000 一路被扣到 **-0.01**，石化，印章"已被 AI 优化" | -¥0.01 |
| 补刀 | "你自费买的不是效率，是接替你的简历。下一位人类请充值上岗。" | — |

承接片3"AI 成老板"——这集让你**自费**上岗；token 从彩蛋升为主角。

## 皮肤要点

- 奶油白底 `#FFF4E0`；荧光粉/柠檬黄/青蓝/橘橙/茄紫 5 撞色，统一 3.5px 黑描边、
  硬偏移投影（6/6 无模糊）、故意错位叠放；同屏活性色 ≤4。
- spring 弹动（overshoot 回弹）；**boil 关闭**，靠弹动、squiggle/点阵漂移、硬币物理、
  burst 闪现做真实运动。
- 音乐 80s synth-funk / chip-pop，BPM120：方波/锯齿 bass + 拍手 + 电钢琴 stab + hihat；
  涨价=收银机 cha-ching、数字跳=8-bit blip（音高随档升）、反转=唱片刮擦+低音 boom。
- **拉丁字体随示例自带（`fonts/`，OFL）**：Archivo Black（价格/标题）、Archivo（正文，可变）。
  中文用 ZCOOL 庆科黄油体（全仓库共享，见下）。

## metrics 重定义（旧黑+红作废）

- 活性色＝5 撞色 + 黑描边块（奶油白不计）；按 HSV 提取连通 blob，对比质心位移 >2px 或
  面积变化 >5% 判真实运动；帧差对活性像素集计算（不被白底压低）；静止帧 ≤10%。
- 实测：活性帧差 22.68、静止 0%、活性色面积 8.47%、900 帧。

## 运行

> 中文字体为全仓库共享、未在示例重复存放，先从根 `fonts/` 复制 ZCOOL：

```bash
mkdir -p fonts && cp ../../fonts/ZCOOLQingKeHuangYou.ttf fonts/
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
CHROMIUM_PATH=/usr/local/bin/chromium node render_frames.js
python3 sfx.py && python3 metrics.py
```

无生成式模型、无外部素材。
