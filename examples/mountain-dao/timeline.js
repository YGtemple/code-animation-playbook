// timeline.js —— 全片唯一时间源。《上山求道记》国风青绿山水。画面/音效都从这里取时间。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---- 逐 beat 边界（秒） ----
    b0: 0.0,    // 开场远山云海，小吏右下走入沿石阶上山，题「上山」
    b1: 4.5,    // R1 砍柴，碑「日砍叁佰担柴，方准入山」柴堆涨高，铜磬
    b2: 9.0,    // R2 炼丹，丹炉火忽大小、炉贴朱砂「OKR」符、扇火冒汗
    b3: 13.5,   // R3 云海考勤，云里签到牌、迟到露山罚站、踮脚打卡
    b4: 18.0,   // 登顶，长卷加速推主峰，亭中白须仙人
    b5: 22.5,   // 反转铺垫：案头卷轴竹简、朱砂印、仙人冒汗拨算筹、卷轴露「天庭Q3绩效」
    b6: 27.0,   // 反转：包袱掉工牌，山外有更高山，大字「山外有山」
    end: 30.0,

    // ---- 长卷视差速度（px/帧，近:中:远 = 3:2:1） ----
    nearV: 5.5,

    // ---- 具体动作时刻 ----
    hikerIn: 0.4,        // 小吏从右下入画
    titleUp: 0.9,        // 题「上山」落下
    woodChoppStart: 5.2, // 开始砍柴
    woodChoppCount: 9,   // 砍柴次数
    woodChoppStep: 0.32,
    chime1: 8.6,         // 一关通关铜磬
    fireSway: 9.6,       // 炉火忽大忽小
    fanStart: 10.4,      // 小吏扇火
    chime2: 13.1,
    signIn: 14.2,        // 云里签到牌出现
    lateReveal: 15.4,    // 云移开露山罚站
    tiptoe: 16.6,        // 踮脚打卡
    chime3: 17.6,
    zoomIn: 22.5,        // 拉近仙人案头
    beadStart: 23.2,     // 拨算筹，木鱼渐紧
    sweatStart: 23.8,
    badgeDrop: 27.2,     // 包袱掉工牌
    revealMount: 27.8,   // 山外更高山
    bigTitle: 28.2,      // 大字「山外有山」
    sealStamp: 28.9,     // 朱砂大印钤下
    drumFinal: 29.0,     // 反转闷鼓/木鱼一下
    signOff: 28.6        // 署名
  };

  // ---------------- 音效线索 ----------------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  // 全片极低的山涧底噪
  add(0, 'room');

  // 开场：古琴散板一记 + 松风起
  add(0.6, 'guqin', { pitch: 1.0 });
  add(0.8, 'wind', { dur: 4.0 });

  // 石阶脚步：小吏上山，约每 0.34s 一步，渐远
  let step = T.hikerIn;
  let si = 0;
  while (step < T.b1) { add(step, 'step', { pan: -0.15 + si * 0.03 }); step += 0.34; si++; }

  // R1 砍柴：斧落声
  for (let i = 0; i < T.woodChoppCount; i++) {
    const t = T.woodChoppStart + i * T.woodChoppStep;
    add(t, 'chop');
    add(t + 0.03, 'woodblock');
  }
  add(T.chime1, 'chime');          // 通关铜磬
  add(T.chime1 + 0.15, 'guqin', { pitch: 1.12 });

  // R2 炼丹：炉火持续低通噪声（整段铺）
  add(T.b2, 'fire', { dur: T.b3 - T.b2 - 0.3 });
  // 扇风
  for (let t = T.fanStart; t < T.b3 - 0.4; t += 0.55) add(t, 'fan');
  add(T.chime2, 'chime');
  add(T.chime2 + 0.15, 'guqin', { pitch: 1.26 });

  // R3 云海考勤：缥缈箫声 + 打卡一声
  add(T.b3 + 0.3, 'xiao', { dur: 3.4 });
  add(T.tiptoe, 'dabang');
  add(T.chime3, 'chime');
  add(T.chime3 + 0.15, 'guqin', { pitch: 1.5 });

  // 登顶：古琴转亮
  add(T.b4 + 0.2, 'guqin', { pitch: 1.33 });
  add(T.b4 + 1.0, 'xiao', { dur: 2.5 });

  // 反转铺垫：木鱼渐紧
  let mu = T.beadStart, mi = 0;
  while (mu < T.b6) { add(mu, 'woodfish', { pitch: 0.9 + Math.min(0.5, mi * 0.05) }); mu += 0.42; mi++; }

  // 反转：包袱掉 + 山外有山
  add(T.badgeDrop, 'thud');
  add(T.drumFinal, 'drum');        // 反转闷鼓一下
  add(T.drumFinal, 'chime', { pitch: 0.8 });
  add(T.sealStamp, 'seal');        // 朱砂大印
  add(T.end - 0.4, 'ding');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
