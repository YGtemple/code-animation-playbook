// timeline.js —— 全片唯一时间表。画面与音效都从这里取时间，别处不写死秒数。
// 片名《冗余变量 X-07》：红色三角光标（人）四级考核拿满分，却被蓝色方块 AI 占了岗。
// BPM=120（四分音符 0.5s / 八分 0.25s / 十六分 0.125s）。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ===== 0–1.5 开场：纸白+12列网格，红三角光标弹入 =====
    cursorPop: 0.35,          // 红三角光标弹入（thud）
    titleTypeStart: 0.55,    // AI COOPERATION ASSESSMENT 逐字弹入
    num001: 1.15,            // 编号 001

    // ===== 1.5–3 白色考核卡（顶部蓝条）=====
    cardIn: 1.6,             // 考核卡砸下（顶部蓝条）
    candidateType: 1.95,     // CANDIDATE: X-07 逐字

    // ===== R1 3–7 prompt speed，3/4 =====
    r1Start: 3.0,
    r1Hour: 3.25,            // 对顶三角沙漏出现、倒数
    r1Bars: [3.6, 4.0, 4.4, 4.8],   // 蓝方块吐 4 条几何条
    r1Miss: 5.2,            // 漏 1 条（红叉 + err）
    r1Score: 5.7,           // 3/4

    // ===== R2 7–11 agent orchestration，5/6 =====
    r2Start: 7.0,
    r2Nodes: [7.2, 7.5, 7.8, 8.1, 8.4, 8.7],  // 6 个小方 Agent 节点
    r2Links: [7.4, 7.7, 8.0, 8.3, 8.6],       // 节点间连线（token 小圆挂着）
    r2Wobble: 9.1,          // 第 5 条手抖连歪
    r2Cross: 9.5,           // 标红叉
    r2Score: 9.9,           // 5/6

    // ===== R3 11–15 zero-error，99/100 =====
    r3Start: 11.0,
    r3TaskDrop: 11.3,       // 大任务矩形落下（whoosh+thud）
    r3FillStart: 11.7,      // 几何块填满（100 格）
    r3FillEnd: 13.0,
    r3Flash: 13.2,          // 差一格闪红
    r3Coffee: 13.6,         // 咖啡杯被压扁
    r3Score: 13.9,          // 99/100

    // ===== R4 15–19 human-ai synergy，100% =====
    r4Start: 15.0,
    r4Tri: [15.4, 15.7, 16.0, 16.3, 16.6, 16.9],  // 黄三角摆进格子（教 AI）
    r4Full: 17.3,           // 进度全黄
    r4Score: 17.8,          // 100%

    // ===== 总分 19–23：大圆 0→100，四卡亮黄，PASS 印章 =====
    totalStart: 19.0,
    totalRollStart: 19.3,   // 大圆数字 0 整翻到 100
    totalRollEnd: 20.5,
    cardsYellow: 20.8,      // 四卡亮黄
    passStamp: 21.5,        // PASS 印章盖下（60Hz thud+噪声）
    sweat: 21.9,            // 光标冒汗

    // ===== 反转 23–27：音乐骤停，AI 占岗 =====
    musicStop: 23.0,        // 全曲骤停 0.5s
    aiDrop: 23.5,           // 蓝色大方块落进主角那格占住
    squeeze: 23.9,          // 主角被挤、红→灰、缩小
    newCard: 24.3,          // POSITION FILLED BY AI
    queueCard: 24.8,        // YOU ARE IN OPTIMIZATION QUEUE
    redCross: 25.3,         // 脚下格被红粗叉划掉
    pct62: 25.8,            // 右下角 62.0%

    // ===== 神补刀 27–28.7：工牌翻牌 =====
    flipBadge: 27.1,        // EMPLOYEE → REDUNDANT
    dimCell: 27.5,          // 网格把那格压暗
    titleX07: 27.9,         // REDUNDANT VARIABLE X-07

    // ===== 28.9–29.7 干净白底居中署名 =====
    signOff: 28.95,
    piano: 29.05
  };

  // ---------- 音效线索（cue.t 对 whoosh/riser 表示“命中/到顶”时刻） ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');                       // 房间/电子底噪，铺到底

  // 开场
  add(T.cursorPop, 'thud');
  add(T.cursorPop, 'click');
  // 标题逐字弹入（type 滴答，约 0.05s/字）
  for (let i = 0; i < 22; i++) add(T.titleTypeStart + i * 0.05, 'type');
  add(T.num001, 'tick');

  // 考核卡
  add(T.cardIn, 'stamp');
  for (let i = 0; i < 13; i++) add(T.candidateType + i * 0.06, 'type');

  // R1：沙漏倒数
  for (let i = 0; i < 4; i++) add(T.r1Hour + i * 0.18, 'tick');
  T.r1Bars.forEach((bt, i) => {
    add(bt, 'click');
    if (i < 3) add(bt + 0.12, 'blip');      // 接住 = 方波 880Hz 滴
  });
  add(T.r1Miss, 'err');                       // 漏 1 = 220Hz 嗡+噪声
  add(T.r1Miss, 'crossnoise');
  add(T.r1Score, 'blip', { p: 1.2 });

  // R2：节点逐个上线
  T.r2Nodes.forEach((nt, i) => add(nt, 'click'));
  T.r2Links.forEach(lt => add(lt, 'tick'));
  add(T.r2Wobble, 'hum', { dur: 0.4 });
  add(T.r2Cross, 'err');
  add(T.r2Cross, 'crossnoise');
  add(T.r2Score, 'blip', { p: 1.2 });

  // R3：任务矩形落下 + 快速填满
  add(T.r3TaskDrop, 'whoosh', { dur: 0.35 });
  add(T.r3TaskDrop, 'thud');
  let ft = T.r3FillStart, fi = 0;
  while (ft < T.r3FillEnd) { add(ft, 'click'); ft += 0.11; fi++; }
  add(T.r3Flash, 'err');
  add(T.r3Coffee, 'squash');
  add(T.r3Score, 'blip', { p: 0.85 });

  // R4：黄三角逐个摆进格子（教 AI）
  T.r4Tri.forEach((tt, i) => add(tt, 'blip', { p: 1.0 + i * 0.06 }));
  add(T.r4Full, 'chord');
  add(T.r4Score, 'blip', { p: 1.4 });

  // 总分：数字滚动
  let rt = T.totalRollStart, ri = 0;
  while (rt < T.totalRollEnd) { add(rt, 'tick'); rt += 0.13; ri++; }
  add(T.cardsYellow, 'chord');
  add(T.passStamp, 'stamp');        // 60Hz thud + 噪声
  add(T.passStamp, 'low');
  add(T.sweat, 'click');

  // 反转：骤停 0.5s 后低音长鸣
  add(T.aiDrop, 'thud');
  add(T.aiDrop, 'bigdrop');
  add(T.squeeze, 'squash');
  add(T.newCard, 'click');
  add(T.queueCard, 'tick');
  add(T.redCross, 'crossnoise');
  add(T.pct62, 'blip', { p: 0.6 });

  // 神补刀
  add(T.flipBadge, 'flip');
  add(T.dimCell, 'low');
  add(T.titleX07, 'err');

  // 署名：孤立钢琴单音 + 轻 ding
  add(T.piano, 'piano');
  add(T.signOff + 0.1, 'ding');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
