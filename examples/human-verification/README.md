# 实例五《最后一份人类工作》——赛博霓虹（暗底 synthwave）

> 30.000s / 1920×1080 / 30fps / 900 帧；H.264 High + yuv420p，AAC 48kHz 立体声，+faststart。
> 引擎与喜剧结构不变，换成暗底霓虹皮肤。

## 剧情

主角被 AI 招聘系统审判，闯四道霓虹 CAPTCHA 证明自己是人：

| 回合 | 关卡 | 进度 |
|---|---|---|
| R1 | 选择所有带人类工牌的画面（badge H-001 / 35Y / ¥15,000） | 1/4 |
| R2 | 品红圆印章 HUMAN VERIFIED 砸下、盖歪 | 2/4 |
| R3 | 飞散 token 字符块，抓错=红点+RGB 故障 | 3/4 |
| R4 | 颈后神经链接，UPLOADING 100% | 4/4 |
| 反转 | **VERDICT: TOO HUMAN.** ACCESS GRANTED → **REVOKED**；跑马灯"62% 人类怕被更会用AI的人替代——你已被回收" | — |
| 收尾 | 工牌熄灭 HUMAN OFFLINE，近黑居中署名 | — |

镜像片1"AI 装人结果真是机器"——这次是人装人装过头被回收。

## 皮肤要点

- 暗底 `#0B0414`，霓虹青 `#05D9E8` / 品红 `#FF2A6D` / 电紫 `#7B00FF`；危险色用品红、**不用纯红**。
- 辉光＝三层 feGaussianBlur + feMerge；扫描线、周期 RGB 故障、噪点；**boil 关闭**，
  靠辉光呼吸、扫描线下移、故障闪烁、HUD 微抖做运动补偿。
- 音乐 BPM110 / Am（Am–F–C–G）：808 底鼓 + gated 军鼓 + 锯齿 sub-bass + arp + Juno pad。
- **字体随示例自带（`fonts/`，均 OFL）**：Orbitron（标题/数字）、Share Tech Mono（UI/代码）、
  VT323（终端）。中文用 ZCOOL 庆科黄油体（全仓库共享，见下）。

## metrics 重定义（旧黑+红作废）

- 第三条改测【霓虹活性面积 NAA】：青/品红/紫分 core 与 halo 两层 RGB 盒（辉光羽化带容差）；
  **排除暗底**与**低饱和白字**（max-min<30，否则大白标题虚高）。
  阈值 core 均值 ≥8%、core+halo ≥18%、最低活性帧 ≥6%（boot 与结尾主动收尾段除外）。
- 帧差 ≥6、静止 ≤10%：氛围层压到有界，帧差用 NEAREST 原始差分、只认真实内容运动
  （判定期靠循环扫描带、文字心跳、网格滚动补帧差）。

## 运行

> 中文字体为全仓库共享、未在示例重复存放，先从根 `fonts/` 复制 ZCOOL：

```bash
mkdir -p fonts && cp ../../fonts/ZCOOLQingKeHuangYou.ttf fonts/
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
CHROMIUM_PATH=/usr/local/bin/chromium npm run render
npm run sfx && npm run metrics
TITLE="最后一份人类工作" npm run encode
```

无生成式模型、无外部素材。
