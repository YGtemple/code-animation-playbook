// timeline.js ——《最后一份人类工作》全片唯一时间表。画面与音效都从这里取时间，别处不写死秒数。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---- 0–3s BOOT ----
    gridRise: 0.30,          // 等距网格地面升起
    sunUp: 0.55,             // 半弧霓虹百叶落日升起
    bootText: 0.95,          // SYSTEM.BOOT_OK / NEON CITY
    caretStart: 0.12,        // 青 caret 闪烁起点

    // ---- 3–8s R1 工牌 ----
    r1HudIn: 3.00,           // 虚线 HUD 弹入
    r1Clicks: [3.65, 4.30, 4.95, 5.60, 6.25, 6.90], // 狂点工牌
    r1Done: 7.70,

    // ---- 8–13s R2 印章 ----
    r2Stamp: 8.50,           // 品红圆印章砸下盖歪
    r2Glitch: 8.50,          // RGB 故障闪 2–3 帧
    r2Done: 12.60,

    // ---- 13–18s R3 验证码 ----
    r3Scatter: 13.20,        // token 字符块飞散
    r3Wrong: 15.60,          // 抓错 = 红点 + 故障
    r3Done: 17.60,

    // ---- 18–23s R4 神经链接 ----
    r4Insert: 18.60,         // 颈后接口插入
    r4UploadStart: 19.20,
    r4UploadFull: 22.20,     // 100%
    r4Done: 22.80,

    // ---- 23–27s 反转 ----
    verdictScan: 23.20,      // 扫描线横过
    verdictReveal: 23.60,    // VERDICT: TOO HUMAN.
    verdictSilenceEnd: 24.00,// 约 0.4s 短促静默
    accessFlip: 24.30,       // ACCESS GRANTED -> REVOKED
    marqueeStart: 24.80,     // 跑马灯 62%
    revHit: 23.60,           // 失真hit+反向镲+下行stab

    // ---- 27–28.7s 熄灭 ----
    offlineBadge: 27.20,     // 工牌熄灭变灰 HUMAN OFFLINE
    neonHalfOff: 27.60,
    dimOutStart: 28.20,
    nearBlack: 28.70,

    // ---- 28.9–29.7s 署名 ----
    credits: 28.90,
  };

  // ---------- 音效线索（cue.t 对 whoosh/riser 表示“命中/到顶”时刻，声音结束点对准它） ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  // 氛围底噪（电子嗡）
  add(0, 'room');
  add(0, 'hum', { dur: 3.0 });

  // BOOT：pad + 808
  add(T.gridRise, 'kick');
  add(T.sunUp, 'whoosh', { dur: 0.5 });
  add(T.bootText, 'blip');

  // R1 工牌：狂点 = 880Hz 方波 blip
  add(T.r1HudIn, 'uiin');
  T.r1Clicks.forEach((t, i) => add(t, 'blip', { pitch: 1.0 + (i % 3) * 0.06 }));
  add(T.r1Done, 'pass1');

  // R2 印章：滤波噪声 + 220Hz thump
  add(T.r2Stamp, 'thump');
  add(T.r2Glitch, 'bitcrash');

  // R3 验证码
  add(T.r3Scatter, 'scatter');
  add(T.r3Wrong, 'bitcrash');
  add(T.r3Wrong, 'rev_cymbal');
  add(T.r3Wrong, 'stab');      // 下行小三度方波 stab

  // R4 神经链接
  add(T.r4Insert, 'plug');
  add(T.r4UploadStart, 'sweep');   // 锯齿 200->2000 扫频
  add(T.r4UploadFull, 'updone');

  // 反转
  add(T.verdictScan, 'riser', { dur: 0.4 });
  add(T.revHit, 'hit');            // 失真 hit
  add(T.revHit + 0.02, 'rev_cymbal');
  add(T.revHit + 0.05, 'stab');    // 下行小三度 stab
  add(T.accessFlip, 'bitcrash');

  // 熄灭 + 署名
  add(T.offlineBadge, 'powerdown');
  add(T.credits, 'ding');          // 柔和电子 ding

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
