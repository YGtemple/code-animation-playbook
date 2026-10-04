// timeline.js —— 《前额叶没坏，是累了》全片唯一时间源。水彩手绘皮肤。
// 画面与声音都从这里取时间；别处不写死秒数。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // 0–3s 冷开场：暖纸渐入，小人坐桌前
    paperFadeIn: 0.0,
    paperFadeEnd: 0.7,
    charAppear: 0.4,
    cap1: 0.9,                 // "我的前额叶…"

    // 3–8s 升级①：手机弹出，未读红点 1→99+
    phoneIn: 3.2,
    unreadStart: 3.7,
    unreadEnd: 6.6,
    cap2: 4.3,                 // "早上 99+ 未读"

    // 8–13s 升级②：领口水痕下晕，日历 1→12 填满
    collarBleedStart: 8.0,
    collarBleedEnd: 11.6,
    calIn: 8.6,
    calFillStart: 9.1,
    calFillEnd: 12.2,
    cap3: 8.7,                 // "班味，腌入味了"

    // 13–19s 升级③：头顶仪表指针打红区100%，脑子泛赭石晕染，汗珠滴落
    dashIn: 13.0,
    needleStart: 13.5,
    needleEnd: 16.6,
    washStart: 14.0,           // 赭石晕染在头周长出
    sweatDrops: [15.0, 16.1, 17.3],
    cap4: 13.4,                // "CPU超频——散热还是原装的"

    // 19–23s 峰值：僵住、线轻抖一下、墨滴持续晕开、画面虚
    freezeStart: 19.0,
    trembleT: 19.0,            // 全体线轻抖一下
    inkDrops: [19.3, 20.4, 21.4, 22.3],   // 红/赭墨滴持续晕开
    waterDropSfx: 20.6,        // 唯一一声水滴（带混响）
    softFocus: 19.2,           // 纸面轻微虚柔（晕染继续动）

    // 23–28s 反转：手放下热茶，赭/红晕染退成灰松石青，抬头嘴角微扬
    handIn: 23.0,
    cupSet: 23.6,
    washRecedeStart: 23.6,
    washRecedeEnd: 26.2,
    lookUp: 24.6,              // 嘴从短横线 → 微扬弧线
    cap5: 24.3,                // "前额叶没坏，是累了。"（朱砂加粗）

    // 28–30s 收尾：一笔五瓣小野花、茶杯蒸汽、手写署名；茶杯"叮"
    flowerDrawStart: 28.0,
    flowerDrawEnd: 28.8,
    sigIn: 28.7,
    teaDing: 29.3
  };

  // ---------- 音效线索 ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');                                   // 房间底噪（很轻）

  // ① 手机弹出
  add(T.phoneIn, 'softpop');
  // 未读数递增：越来越密的轻 tick
  {
    let pt = T.unreadStart, n = 0;
    while (pt < T.unreadEnd && n < 9) { add(pt, 'softtick'); pt += 0.32 - n * 0.018; n++; }
  }
  // ② 领口水痕：一声慢水滴 + 日历12格轻填
  add(T.collarBleedStart, 'drip');
  {
    let pt = T.calFillStart, n = 0;
    while (pt < T.calFillEnd && n < 12) { add(pt, 'softtick'); pt += (T.calFillEnd - T.calFillStart) / 12; n++; }
  }
  // ③ 仪表：指针扫动 tick 渐密，到 100% 一声闷"嗡"
  {
    let pt = T.needleStart, n = 0;
    while (pt < T.needleEnd && n < 10) { add(pt, 'softtick', { p: 0.7 + n * 0.04 }); pt += (T.needleEnd - T.needleStart) / 10; n++; }
  }
  add(T.needleEnd, 'softbuzz');
  T.sweatDrops.forEach(t => add(t, 'drip'));

  // 峰值：近乎全静，只留一声带混响的水滴
  //（真静音窗口在 sfx.py 里 19.0–23.0 执行；这里只放那一滴）
  add(T.waterDropSfx, 'waterdrop');

  // 反转：茶杯轻放桌面
  add(T.cupSet, 'cupset');
  add(T.cupSet + 0.15, 'steam');

  // 收尾：一笔花（软笔声），茶杯"叮"
  add(T.flowerDrawStart, 'penstroke');
  add(T.teaDing, 'teading');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
