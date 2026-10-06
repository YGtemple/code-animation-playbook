// timeline.js ——《第14号·人体开机自检报告》黑白默片版，全片唯一时间源。
// 画面与音效都从这里取时间；其它文件出现裸秒数即 bug。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---------- 片头卡 0–60 (0–2.0s)：黑底双线框卡1 ----------
    c1In: 0.13,             // 卡1 硬切入
    c1Out: 60 / 30,         // 卡1 硬切出 = 2.0s

    // ---------- 抬头炸发 gag 60–84，卡2 84–120 ----------
    headUp: 60 / 30,        // 猛抬头
    headUpEnd: 84 / 30,
    c2In: 84 / 30,
    c2Out: 120 / 30,         // = 4.0s

    // ---------- R1 眼皮火柴棍 120–210 (4.0–7.0s) ----------
    r1Start: 120 / 30,
    matchA: 130 / 30,       // 第一根火柴棍撑左眼皮
    matchB: 150 / 30,       // 第二根撑右眼皮
    r1End: 210 / 30,

    // ---------- R2 手指僵直弹键盘 210–300 (7.0–10.0s) ----------
    r2Start: 210 / 30,
    r2End: 300 / 30,

    // ---------- R3 前额叶转圈加载 300–405 (10.0–13.5s) ----------
    r3Start: 300 / 30,
    watermark: 330 / 30,    // 极小水印“前额叶没坏，是累了”一闪
    r3End: 405 / 30,

    // ---------- R4 满屋追魂 405–495 (13.5–16.5s) ----------
    r4Start: 405 / 30,
    soulOut: 408 / 30,      // 魂从头顶飘出
    soulCatch: 486 / 30,    // 凌空扑空
    r4End: 495 / 30,

    // ---------- R5 掰电表 495–630 (16.5–21.0s)，指针 8→41→99 ----------
    r5Start: 495 / 30,
    meterV0: 8,             // 起表 8%
    meterV1: 41,            // 第一拍表后 41%
    meterV2: 99,            // 第三拍表后 99%
    punch1: 512 / 30,       // 拍表第一下 → 指针 41
    punch2: 548 / 30,
    punch3: 588 / 30,       // 拍表第三下 → 指针 99
    r5End: 630 / 30,

    // ---------- 五灯全亮 630–660，卡3 660–690 ----------
    lightsStart: 630 / 30,
    c3In: 660 / 30,
    c3Out: 690 / 30,        // = 23.0s

    // ---------- 坐对电脑屏幕亮起 690–780 (23–26s) ----------
    sitStart: 690 / 30,
    screenOn: 740 / 30,     // 屏幕缓缓亮起
    sitEnd: 780 / 30,

    // ---------- 屏幕特写卡4 780–840 (26–28s) “距下班还有：9小时59分” ----------
    c4In: 780 / 30,
    c4Out: 840 / 30,

    // ---------- 翻倒 pratfall 840–868，黑底卡5 868–900 ----------
    pratStart: 840 / 30,
    chairFall: 850 / 30,    // 连人带椅后仰
    c5In: 868 / 30,         // “重启失败。” + 署名
    c5Out: 900 / 30,         // = 30.0s
  };

  // 旁白时间点（混音对位用；画面不烧字幕）
  T.voice = [
    { at: 0.8,  text: '各位观众，今晚的主角，是一个正准备去上班的人。' },
    { at: 6.8,  text: '开机自检第一项，眼皮。它已经三天，没醒过来了。' },
    { at: 13.8, text: '第四项，灵魂。假期那天，它被留在了海边。' },
    { at: 21.4, text: '终于，全部点亮。他以为，这就是胜利了。' },
    { at: 28.9, text: '——上班这件事，才刚刚开始。' },
  ];

  // ---------- 音效线索（whoosh/riser/gliss 类 t 为“结束/命中”时刻） ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'proj');                                   // 放映机咔哒床声，铺到底
  add(0.25, 'chord');                               // 开篇柱式和弦
  add(60 / 30, 'clatter', { vol: 0.8 });            // 抬头撞翻键盘
  add(66 / 30, 'boing');                            // 抬头 slapstick 弹一下

  // R1 眼皮：火柴棍两根“啵”
  add(T.matchA, 'pop');
  add(T.matchB, 'pop');
  add((T.r1Start + T.r1End) / 2, 'creak', { dur: 0.8 });  // 锈眼皮吱呀

  // R2 打字：僵直乱敲，琴键随节奏蹦
  for (let t = T.r2Start + 0.1; t < T.r2End; t += 0.16) add(t, 'type', { vol: 0.5 });

  // R3 加载：钟表滴答加快
  let pt = T.r3Start + 0.2;
  while (pt < T.r3End - 0.1) { add(pt, 'tick'); pt += 0.34; pt += 0.00; }

  // R4 追魂：风声 + 上行音阶 + 扑空 sting
  add(T.soulOut, 'whoosh', { dur: 1.1 });
  for (let i = 0; i < 6; i++) add(T.r4Start + 0.5 + i * 0.18, 'wind', { vol: 0.3 });
  add(T.soulCatch, 'sting');                        // 凌空扑空 slapstick

  // R5 拍表：三记重击，节奏越来越快（BGM 已升 120）
  add(T.punch1, 'slam');
  add(T.punch2, 'slam', { vol: 0.9 });
  add(T.punch3, 'slam', { vol: 1.0 });
  for (let t = T.punch1 + 0.2; t < T.r5End; t += 0.3) add(t, 'tick', { vol: 0.4 });

  // 五灯全亮：叮叮叮上行
  for (let i = 0; i < 5; i++) add(T.lightsStart + i * 0.14, 'ding', { vol: 0.5 });

  // 结尾：唱片刮擦 + 下行滑奏 + 琴盖砰 + 急停静音
  add(792 / 30, 'scratch', { dur: 0.5 });            // 屏幕特写前唱片刮擦前奏
  add(T.chairFall, 'thud');                         // 连椅翻倒闷响
  add((862 + 868) / 60, 'gliss', { dur: 1.2 });    // 下行滑奏（落点对准 868/30）
  add(868 / 30, 'cover');                            // 琴盖“砰”急停
  // 868.9–871.4 真静音窗（冷场），由 sfx.py 归零

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
