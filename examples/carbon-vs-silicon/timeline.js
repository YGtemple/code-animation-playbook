// timeline.js ——《碳基的尊严》全片唯一时间表。画面与音效都从这里取时间，别处不写死秒数。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---- 开场对峙 0.3–3.0 ----
    faceA: 0.40,          // 打工人（碳基#001）砸入
    faceB: 0.55,          // 方头芯片机器人砸入
    ringCrack: 0.50,      // 集中线炸开
    boomIn: 0.90,         // 爆炸框“终极擂台赛！”
    titleIn: 1.50,        // 主标题“人类，不可替代？”
    ringEnd: 3.0,

    // ---- R1 比做PPT 3.0–8.0 ----
    r1Banner: 3.0,
    r1HumanStart: 3.25,   // 人疯狂敲键盘
    r1HumanEnd: 6.0,
    r1AiFling: 4.50,      // AI 甩出一摞PPT
    r1BarTick: [4.85, 5.10, 5.35], // 进度条逐格拉满
    r1Stamp: 5.80,        // 朱红章“AI 3秒 = 你3天”
    r1End: 8.0,

    // ---- R2 比做报表 8.0–13.0 ----
    r2Banner: 8.0,
    r2CalcType: [8.55, 8.85, 9.15], // 人扒计算器
    r2HumanErr: 9.55,     // 算错
    r2AiReport: 10.00,    // AI 一秒出报表
    r2ChartTick: [10.35, 10.65, 10.95], // 柱状图逐根长出
    r2Stamp: 11.20,       // 朱红章“错误率 0.00%”
    r2End: 13.0,

    // ---- R3 比熬夜 13.0–18.0 ----
    r3Banner: 13.0,
    r3Chug1: 13.55,       // 灌咖啡
    r3Chug2: 13.95,       // 灌功能饮料
    r3Ai24: 14.50,        // AI 头顶“24h”
    r3HumanSlump: 15.55,  // 人眼冒血丝瘫软
    r3Boom: 16.20,        // 数字爆炸框“你 4h / AI ∞”
    r3End: 18.0,

    // ---- R4 比性价比 18.0–23.0 ----
    r4Banner: 18.0,
    r4BillStart: 18.55,   // 人掏出账单（社保/公积金/医保）
    r4BillStep: 0.22,
    r4BillCount: 6,
    r4AiBadge: 20.00,     // AI 胸前挂牌
    r4Stamp: 20.90,       // 朱红章“碳基成本 +∞”
    r4End: 23.0,

    // ---- R5 终局一问 23.0–26.7 ----
    r5Question: 23.30,     // 超大盖章手甩出问题
    r5HumanGasp: 24.55,   // 人跪地喘气、刚要开口
    r5AiAnswer: 25.30,     // AI 抢答弹出答案框
    r5End: 26.70,

    // ---- 反转定格 26.7–27.5 ----
    hireStamp: 26.70,     // 大红章“录用！”盖在 AI 工牌上
    freezeAt: 26.96,      // hireStamp + 0.26（落定后定格）
    freezeEnd: 27.50,

    // ---- 神补刀 27.5–28.8 ----
    bossLine: 27.60,       // 老板：“你留下，教它”
    badgeTear: 27.90,      // 人工牌被红笔划掉
    pointText: 28.00,      // 点题大字“赢了擂台，输了工位”
    coffeeHand: 28.25,     // 人含泪把咖啡递给机器人
    smallStamp: 28.50,     // 角落小朱红章“它终于学会我了”
    blackOut: 28.80,

    // ---- 收尾署名 ----
    signOff: 29.00
  };

  // ---------- 音效线索（cue.t 对 whoosh/riser/whip 表示“命中/到顶”时刻，声音结束点对准它） ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');                          // 房间底噪，铺到底
  add(0.15, 'hum', { dur: 1.3 });          // 机器人通电嗡鸣

  add(T.faceA, 'whoosh', { dur: 0.4 });
  add(T.faceA, 'slam');
  add(T.faceB, 'slam');
  add(T.ringCrack, 'burst');
  add(T.boomIn, 'slam');
  add(T.boomIn, 'burst');
  add(T.titleIn, 'whoosh', { dur: 0.45 });
  add(T.titleIn, 'slam');

  // R1
  add(T.r1Banner, 'slam');
  add(T.r1Banner, 'burst');
  for (let t = T.r1HumanStart; t < T.r1HumanEnd; t += 0.07) add(t, 'type'); // 疯狂敲键盘
  add(T.r1AiFling, 'whip');
  T.r1BarTick.forEach(t => { add(t, 'tick'); add(t + 0.05, 'pop'); });
  add(T.r1Stamp, 'slam');
  add(T.r1Stamp, 'burst');

  // R2
  add(T.r2Banner, 'slam');
  add(T.r2Banner, 'burst');
  T.r2CalcType.forEach(t => add(t, 'type'));
  add(T.r2HumanErr, 'buzz');
  add(T.r2HumanErr, 'dong');
  add(T.r2AiReport, 'whip');
  T.r2ChartTick.forEach(t => add(t, 'tick'));
  add(T.r2Stamp, 'slam');

  // R3
  add(T.r3Banner, 'slam');
  add(T.r3Chug1, 'pop');
  add(T.r3Chug2, 'pop');
  add(T.r3Ai24, 'hum', { dur: 0.9 });
  add(T.r3HumanSlump, 'thud');
  add(T.r3Boom, 'burst');
  add(T.r3Boom, 'slam');

  // R4
  add(T.r4Banner, 'slam');
  add(T.r4Banner, 'burst');
  for (let i = 0; i < T.r4BillCount; i++) add(T.r4BillStart + i * T.r4BillStep, 'tick');
  add(T.r4AiBadge, 'pop');
  add(T.r4Stamp, 'slam');
  add(T.r4Stamp, 'burst');

  // R5
  add(T.r5Question, 'whoosh', { dur: 0.5 });
  add(T.r5Question, 'slam');
  add(T.r5Question, 'burst');
  add(T.r5HumanGasp, 'tick');
  add(T.r5AiAnswer, 'whip');
  add(T.r5AiAnswer, 'pop');

  // 录用定格（此后真静音窗口，见 sfx.py）
  add(T.hireStamp, 'slam');
  add(T.hireStamp, 'burst');
  add(T.hireStamp, 'low');

  // 神补刀
  add(T.bossLine, 'pa');
  add(T.badgeTear, 'tear');
  add(T.pointText, 'pa', { pitch: 0.7 });
  add(T.coffeeHand, 'pop');
  add(T.smallStamp, 'tick');

  // 收尾署名
  add(T.signOff, 'ding');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
