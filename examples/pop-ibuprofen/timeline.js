// timeline.js —— 第17支《电子布洛芬·止痛不治本》波普漫画风。全片唯一时间源。
// 150BPM，12帧/拍(=0.4s)，900帧/30s。画面与音效都从这里取时间，别处不写死秒数。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,
    beat: 12 / 30,          // 一拍 0.4s

    // ---- 九段分格（秒）----
    segCover: 0.0,          // 0–72f   封面 splash
    segHero:  2.4,          // 72–162f 侠捂胸口 + 蓝网点空虚怪 + 思想泡
    segR1:    5.4,          // 162–270f R1 红胶囊 → POW
    segR2:    9.0,          // 270–378f 横2格 黄丸 → WHAM
    segR3:    12.6,         // 378–486f 蓝巨丸 → BAM
    segR4:    16.2,         // 486–594f 整座手机砸出 → KAPOW
    segDoc:   19.8,         // 594–702f 配乐急停 + 医生处方
    segDown:  23.4,         // 702–810f 放下手机
    segOut:   27.0,         // 810–900f 走出格 + 旁白框 + 署名

    // ---- 封面 ----
    splashBoom: 0.20,
    titleIn: 0.65,
    volIn: 1.10,

    // ---- 第二段：难受 ----
    thinkIn: 3.00,          // 思想泡"好难受"（对齐 TTS v1）

    // ---- 第三段：第一颗 ----
    capDrop: 5.60,
    capFall: 5.95,
    swallow: 6.25,
    pow: 6.60,              // POW 砸下（对齐"爽"）
    shuangBubble: 6.85,
    dose1: 6.90,

    // ---- 第四段：加倍 ----
    wham: 10.20,            // WHAM（对齐 TTS v3 剂量加倍）
    vlogBubble1: 10.35,
    vlogBubble2: 11.20,
    monsterPeek: 11.60,

    // ---- 第五段：巨丸 ----
    bam: 14.40,             // BAM（对齐 TTS v4）
    spiralEye: 14.60,
    allnight1: 14.70,
    allnight2: 15.10,
    allnight3: 15.50,
    lowBattery: 15.80,

    // ---- 第六段：整屏吞 ----
    phoneSlam: 16.50,
    kapow: 17.40,           // KAPOW
    doseMax: 17.80,
    monsterGrow: 18.30,
    worseWord: 18.80,

    // ---- 第七段：急停 + 处方 ----
    paperPush: 20.00,
    doctorIn: 20.20,

    // ---- 第八段：放下 ----
    redDot: 23.60,
    lowerPhone: 24.50,
    monsterShrink: 25.60,

    // ---- 第九段：走出 ----
    walkOut: 27.20,
    narratorBox: 27.80,
    easterEgg: 28.50,
    signoff: 29.00,
  };

  // ---------- 音效线索 ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');

  // 封面
  add(T.splashBoom, 'burst');
  add(T.splashBoom, 'slam');
  add(T.titleIn, 'ding');

  // 切格翻页声（5 次 panel cut）
  [T.segHero, T.segR1, T.segR2, T.segR3, T.segR4].forEach((t, i) => add(t, 'pageflip', { pan: i % 2 ? 0.25 : -0.25 }));

  // 思想泡
  add(T.thinkIn, 'blip');

  // 第一颗：红胶囊掉落 + 吞 + POW
  add(T.capDrop, 'whoosh', { dur: 0.35 });
  add(T.capFall, 'thud');
  add(T.swallow, 'gulp');
  add(T.pow, 'powhit');        // 60Hz 下滑重击 + 白噪爆点
  add(T.pow, 'boing');         // 卡通 boing
  add(T.pow, 'slam');
  add(T.shuangBubble, 'blip');

  // 第二颗：WHAM
  add(T.wham, 'powhit');
  add(T.wham, 'boing');
  add(T.wham, 'slam');
  add(T.vlogBubble1, 'blip');
  add(T.vlogBubble2, 'blip');
  add(T.monsterPeek, 'growl');

  // 第三颗：BAM
  add(T.bam, 'powhit');
  add(T.bam, 'boing');
  add(T.bam, 'slam');
  add(T.allnight1, 'blip');
  add(T.allnight2, 'blip');
  add(T.allnight3, 'blip');
  add(T.lowBattery, 'batt');

  // 第四颗：整屏吞
  add(T.phoneSlam, 'whoosh', { dur: 0.5 });
  add(T.kapow, 'powhit');
  add(T.kapow, 'boing');
  add(T.kapow, 'burst');
  add(T.kapow, 'slam');
  add(T.monsterGrow, 'growl');

  // 医生推处方纸（配乐已急停，只留纸声）
  add(T.paperPush, 'paper');

  // 放下手机段：手机震动渐弱
  let vibT = T.redDot;
  while (vibT < T.lowerPhone + 0.8) { add(vibT, 'vibrate'); vibT += 0.18; }

  // 收尾
  add(T.narratorBox, 'blip');
  add(T.signoff, 'ding');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
