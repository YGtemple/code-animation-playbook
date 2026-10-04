// timeline.js —— 《养龙虾》全片唯一时间表。画面与音效都从这里取时间，别处不写死秒数。
// 我=蓝色像素打工人，召唤粉色 AI 龙虾代打，反被它优化。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---- 常驻 HUD：左上 SCORE / 右上 HP 三红心 / 底部 STAGE 1-1 ----
    hudH: 96,        // 顶部 HUD 高度（metrics 排除）
    stripH: 64,      // 底部条高度（STAGE 标签 + 署名）

    // 0–3 开场：黑屏出街机框，我趴工位头顶 Zzz；INSERT COIN / 打工人 我，LV.1（92BPM）
    arcadeIn: 0.15,
    sleepZ: 0.5,
    insertCoin: 0.9,

    // 3–8 回合1 召唤：金光中粉色小龙虾落到工位开始敲键盘；SUMMON! / 我招了个AI员工 / 气泡“打工中…”
    summonFlash: 3.0,
    lobsterLand: 3.5,
    type1Start: 3.65, type1End: 7.9,
    bubble: 4.7,

    // 8–13 回合2 摸鱼：龙虾 LV.2 狂敲，KPI 黄条涨满，我翘脚刷手机，+100 金币；LEVEL UP! / COMBO x3 / 它干活我摸鱼（132BPM）
    level2: 8.0,
    kpiStart: 8.35, kpiEnd: 11.6,
    phoneUp: 8.7,
    coinPop: 10.2,
    levelUp: 11.7,
    combo: 12.15,

    // 13–18 回合3 抢活：龙虾 LV.3 双钳自动接需求/会议/邮件，飞绿✅，老板点头又斜眼我
    level3: 13.0,
    taskStart: 13.4, taskEnd: 17.6,
    taskTimes: [14.1, 15.1, 16.1],   // 三个绿✅
    bossEye: 15.3,
    popupAuto: 16.5,                // 弹窗“新需求已自动处理”

    // 18–24 回合4 BOSS：龙虾暴涨占半屏，整层只剩它工位，我被一只钳举起（160BPM+双音alarm）
    warn: 18.6,
    bossGrow: 19.2,
    clawGrab: 20.9,

    // 24–27 反转：HR 白弹窗砸下，我被弹飞出屏，龙虾稳坐我工位、头顶工资条+¥，我 HP 归零
    hrIn: 24.2,
    flash: 24.25,
    meFling: 24.7,
    salary: 25.35,
    hpZero: 25.65,

    // 27–30 定格署名：全屏 GAME OVER 红大字，残影龙虾打卡机按指纹，INSERT COIN TO RETRY 黄，底部署名
    gameOver: 27.0,
    signoff: 27.15,
    punch: 27.45,
    retry: 27.75,

    // SCORE 里程碑 000000 -> 001300
    scoreSteps: [
      { t: 0.0,   v: 0 },
      { t: 10.2,  v: 100 },
      { t: 11.7,  v: 300 },
      { t: 14.1,  v: 500 },
      { t: 15.1,  v: 750 },
      { t: 16.5,  v: 1000 },
      { t: 18.6,  v: 1300 },
    ],
  };

  // ---------- 音效线索（cue 结构/时间不变，sfx.py 里只换 chiptune 音色） ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');

  // 开场
  add(T.arcadeIn, 'blip');
  add(T.insertCoin, 'coin');

  // 回合1 召唤
  add(T.summonFlash, 'summon');        // 上行琶音金光
  add(T.summonFlash, 'slam');
  add(T.lobsterLand, 'thud');
  add(T.bubble, 'ding');
  for (let t = T.type1Start; t <= T.type1End + 1e-6; t += 0.13) add(t, 'type');

  // 回合2 摸鱼（敲得更快）
  add(T.level2, 'levelup');
  for (let t = 8.1; t <= 13.0 + 1e-6; t += 0.085) add(t, 'type');
  add(T.phoneUp, 'blip');
  // KPI 涨满的哒哒
  for (let t = T.kpiStart; t <= T.kpiEnd + 1e-6; t += 0.18) add(t, 'tick');
  add(T.coinPop, 'coin');
  add(T.levelUp, 'levelup');
  add(T.combo, 'ding');

  // 回合3 抢活（敲得最快 + 三个绿✅）
  add(T.level3, 'levelup');
  for (let t = T.taskStart; t <= T.taskEnd + 1e-6; t += 0.06) add(t, 'type');
  T.taskTimes.forEach(t => add(t, 'task'));
  add(T.bossEye, 'bliplow');
  add(T.popupAuto, 'ding');

  // 回合4 BOSS
  add(T.warn, 'alarm');
  add(T.warn, 'slam');
  add(T.bossGrow, 'slam');
  add(T.bossGrow, 'low');
  add(T.clawGrab, 'bliplow');

  // 反转
  add(T.hrIn, 'slam');
  add(T.hrIn, 'burst');
  add(T.meFling, 'fly');              // 低频 pitch drop + 噪声 sweep
  add(T.salary, 'coin');
  add(T.hpZero, 'buzz');

  // 定格署名
  add(T.gameOver, 'gameover');        // 下行琶音渐弱
  add(T.punch, 'blip');
  add(T.retry, 'coin');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
