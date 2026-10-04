// timeline.js —— 全片唯一的时间表。画面与音效都从这里取时间，别处不写死秒数。
// 片名《自费 Token 上岗记》：打工人被要求自掏腰包买 AI 额度才能上班，四连升档，最后工资条倒扣。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ===== 0–3 工牌入场（奶油白底） =====
    titleIn: 0.22,          // 片名弹出
    badgePop: 0.30,         // 工牌"啪"弹入
    coinIntro: 1.05,        // 一枚 token 硬币蹦起
    coffeePop: 1.65,        // 咖啡杯彩蛋
    cursorBlinkStart: 0.6, // 青蓝光标开始闪烁

    // ===== R1 3–8 老板甩账单 ¥20 =====
    bossIn: 3.05,           // 紫色方块头老板入场
    billThrow: 3.45,        // 账单甩出（whoosh 命中）
    billLand: 4.05,         // 账单落定 / slam
    coinBounce1: 4.25,      // 黄硬币弹起
    priceShow1: 4.35,       // ¥20 折角标签弹出
    chach1: 4.45,           // 收银机 cha-ching
    bossLine1: 4.7,         // "AI提效是个人能力"

    // ===== R2 8–13 进度条99%报错 ¥98 =====
    runStart: 8.05,         // 打工人跑两步卡住
    runEnd: 8.7,
    progStart: 8.85,        // 青蓝进度条起爬
    progFull: 10.15,        // 到 99%
    errorFlash: 10.35,      // 报错红闪 buzz
    upgrade1: 10.75,        // zigzag 炸出 / 被迫升档
    priceShow2: 10.95,      // ¥98 畅玩版
    blip2: 11.05,           // 8-bit blip（音高升一档）

    // ===== R3 13–18 工资条 ¥298 =====
    upArrow: 13.15,         // 橘橙涨价粗箭头
    afternoonLock: 13.4,    // 下午再锁额
    payslipPop: 14.0,       // 工资条弹出 "AI服务费"
    priceShow3: 14.55,      // ¥298 Pro
    chach3: 14.65,
    minusShow: 15.0,        // 工资条 -298

    // ===== R4 18–23 token maxing ¥500 =====
    maxingStart: 18.1,
    coinRainStart: 18.4,
    coinRainEnd: 21.6,
    thumbUp: 19.3,          // 老板竖大拇指
    priceShow4: 20.1,       // ¥500/月企业版·自费
    blip4: 20.2,            // 最高一档 blip

    // ===== 反转 23–27 工资条全貌 / 石化 / 印章 =====
    payslipFull: 23.05,     // 工资条全貌推入
    deductStart: 23.35,     // 实发从 ¥8000 一路扣
    deductEnd: 24.45,
    petrify: 24.6,          // 打工人石化成灰方块
    scratch: 25.05,         // 唱片刮擦
    stampDown: 25.35,       // 印章盖下 / 低音 boom
    silent0: 25.45,         // ~0.3s 短静默（含底噪）
    silent1: 25.78,

    // ===== 补刀 + 署名 27–30 =====
    newBill: 27.15,         // AI 老板弹新账单
    coinRoll: 27.55,        // 一枚 token 硬币滚过
    punchline: 27.35,       // 神补刀文字
    cleanCard: 28.70,       // 切一张干净奶油白卡片
    signOff: 28.95,         // 居中署名
    ding: 29.05
  };

  // ---------- 音效线索（cue.t 对 whoosh/riser 表示“命中/到顶”时刻） ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');

  // 工牌段
  add(T.badgePop, 'dong');
  add(T.badgePop, 'slam');
  add(T.coinIntro, 'pop');
  add(T.coffeePop, 'pop');

  // R1
  add(T.billThrow, 'whoosh', { dur: 0.4 });
  add(T.billLand, 'slam');
  add(T.coinBounce1, 'coins', { n: 2 });
  add(T.priceShow1, 'chach');
  add(T.bossLine1 + 0.1, 'tick');

  // R2：跑步脚步
  let st = T.runStart;
  while (st < T.runEnd) { add(st, 'step'); st += 0.18; }
  // 进度条爬升 blip 步进
  let pt = T.progStart;
  let pi = 0;
  while (pt < T.progFull) { add(pt, 'blip', { pitch: 0.5 + pi * 0.08 }); pt += 0.22; pi++; }
  add(T.errorFlash, 'buzz');
  add(T.errorFlash, 'burst');
  add(T.upgrade1, 'burst');
  add(T.priceShow2, 'chach');
  add(T.blip2, 'blip', { pitch: 1.4 });

  // R3
  add(T.payslipPop, 'pop');
  add(T.payslipPop, 'slam');
  add(T.priceShow3, 'chach');
  add(T.blip2 + 2.0, 'blip', { pitch: 1.9 }); // ¥298 升档（≈13.0? 放在 minusShow 附近）
  add(T.minusShow, 'tear');

  // R4：硬币雨
  let cr = T.coinRainStart, ci = 0;
  while (cr < T.coinRainEnd) { add(cr, 'coins', { n: 1, v: 0.5 + 0.3 * ((ci % 3) / 2) }); cr += 0.13; ci++; }
  add(T.thumbUp, 'snap');
  add(T.priceShow4, 'chach');
  add(T.blip4, 'blip', { pitch: 2.4 });

  // 反转：实发一路扣（tick 越来越密）
  let dt = T.deductStart, di = 0;
  while (dt < T.deductEnd) { add(dt, 'tick', { v: 0.5 + 0.5 * (di / 8) }); dt += 0.13; di++; }
  add(T.scratch, 'scratch');
  add(T.stampDown, 'boom');
  add(T.stampDown, 'slam');

  // 补刀 + 署名
  add(T.newBill, 'whoosh', { dur: 0.35 });
  add(T.coinRoll, 'coins', { n: 3, roll: 1 });
  add(T.signOff, 'ding');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
