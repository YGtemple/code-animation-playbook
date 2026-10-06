// timeline.js —— 全片唯一时间源。画面(render.js)与声音(sfx.py)都从这里取时间，别处不写死秒数。
// 900 帧 / 30fps = 30.000000s。帧号 N -> 秒 = N/30。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---- 0.0–3.0s (帧0–90) 黑场雪花渐入、磁带轮廓、中插卡、REC+时间戳 ----
    snowIn: 0.0,            // 雪花从纯黑渐入
    tapeFade: 0.55,         // VHS 磁带轮廓浮现
    introCard: 1.15,        // 中插卡《职业素养培训·第3辑》
    introCardOut: 2.95,
    recOn: 0.25,            // ● REC + 时间戳亮起
    playOn: 3.0,            // ▶ PLAY 起
    musicIn: 3.2,           // 配乐淡入

    // ---- 3.0–5.5s (帧90–165) 讲师站讲台板书「守时」 ----
    boardIn: 3.05,
    boardWrite: 3.9,        // 板书「守时」写出
    boardHold: 5.5,

    // ---- 5.5–11.0s (帧165–330) 第一章：守时 ----
    ch1Card: 5.75,          // 插卡「第一章·守时」
    ch1CardOut: 7.15,
    ch1Clock: 7.35,         // 提前10分钟打卡（时钟 -10:00）
    ch1Sub: 8.15,           // 反讽小字「2026年，大家比谁准点下班」
    ch1Leave: 9.85,         // 小人秒起身关电脑

    // ---- 11.0–12.5s (帧330–375) 小 glitch tear + dropout 亮线 ----
    glitch1: 11.0,
    glitch1Out: 12.5,

    // ---- 12.5–19.0s (帧375–570) 第二章：爱岗敬业 ----
    ch2Card: 12.75,         // 插卡「第二章·爱岗敬业」
    ch2CardOut: 14.15,
    ch2Desk: 14.35,         // 「把公司当家」趴工位
    ch2Sub: 15.6,           // 反讽「前额叶没坏，是累了」
    ch2Wobble: 16.6,        // 强撑
    ch2Collapse: 17.35,     // 瘫倒（猫猫梗）

    // ---- 19.0–20.5s (帧570–615) tracking 加宽、雪花加重 ----
    trackBad: 19.0,
    trackBadOut: 20.5,

    // ---- 20.5–26.0s (帧615–780) 第三章：服从大局 ----
    ch3Card: 20.75,         // 插卡「第三章·服从大局」
    ch3CardOut: 22.15,
    ch3Window: 22.35,       // 背手望窗外（负鼠梗）
    ch3Sub: 23.6,           // 反讽「身不由己，但精神状态很美丽」

    // ---- 26.0–28.0s (帧780–840) 讲师收尾 + OSD PLAY->PAUSE->REW + 倒带 ----
    wrapWord: 26.0,         // 讲师「恭喜完成培训，你正式成为一名——」
    pauseAt: 26.55,         // OSD PLAY -> II PAUSE
    rewindAt: 27.0,         // OSD PAUSE -> ◀◀ REW + 倒带扫频
    rewindOut: 28.0,

    // ---- 28.0–30.0s (帧840–900) 全雪花卷带、定格不及格、STOP ----
    snowOut: 28.0,          // 全雪花卷带失真
    failFreeze: 28.55,      // 定格「培训考核 不及格。原因：你现在还在上班。」
    stampStop: 28.55,       // 时间戳停 AM 06:00:00
    stopAt: 28.8,           // ■ STOP
    egg: 28.9,              // 右下极小彩蛋
    signOff: 28.7,          // 署名
    hissCut: 29.7,          // hiss 戛然，留 0.3s 静
  };

  // OSD 模式时间轴：play 3.0-26.55 / pause 26.55-27.0 / rew 27.0-28.8 / stop 28.8-30
  T.osdMode = function (t) {
    if (t < T.playOn) return 'rec';        // 0-3 只有 REC，无 PLAY 字
    if (t < T.pauseAt) return 'play';
    if (t < T.rewindAt) return 'pause';
    if (t < T.stopAt) return 'rew';
    return 'stop';
  };

  // ---------- 音效线索 ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(T.recOn, 'osdbeep');                 // OSD 嘀
  add(T.boardIn, 'osdbeep');
  add(T.ch1Card, 'osdbeep');
  add(T.ch2Card, 'osdbeep');
  add(T.ch3Card, 'osdbeep');
  add(T.pauseAt, 'osdbeep');
  add(T.stopAt, 'osdbeep');

  add(T.glitch1, 'tear');                  // glitch tear
  // dropout 呲爆音：每 2–4s 一条（确定性）
  let dt = 1.6;
  while (dt < 29.0) { add(dt, 'dropout'); dt += 2.0 + h2(dt) * 2.0; }
  function h2(x) { const v = Math.sin(x * 91.7 + 13.3) * 43758.5453; return v - Math.floor(v); }

  // 倒带：频率快速下行扫频 + 磁噪爆发，结束点对准 rewindOut(28.0)
  add(T.rewindOut, 'rewind', { dur: T.rewindOut - T.rewindAt });

  // 定格冷场：failFreeze 后 hiss 戛然
  add(T.hissCut, 'hisscut');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
