// timeline.js —— 第18支《这个月，我要纯过日子》全片唯一时间源。
// 画布 1920x1080，30fps，900 帧 = 30.0s。beat 边界按用户给的帧区间换算（帧/30=秒）。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // —— beat0 0–75f (0–2.5s)：本子摊开 + 红margin淡入 + 笔落下 ——
    bookOpen: 0.0,        // 纸页/横线/红margin 淡入
    penDown: 1.7,         // 笔落到标题区

    // —— beat1 75–150f (2.5–5.0s)：大标题逐字写 + 便利贴 ——
    titleStart: 2.55,     // 逐字写"本月省钱计划"
    titleChars: 6,
    titleDone: 4.55,
    noteIn: 3.75,         // 右下黄便利贴"冲！"啪地贴上
    noteSmall: 4.35,      // 便利贴角落小字"Token余额：不足⚠"

    // —— beat2 150–270f (5.0–9.0s)：R1 戒奶茶咖啡 ——
    r1Start: 5.05,
    r1Text: 5.20,
    r1Cup: 6.55,          // 画咖啡杯 + 打叉
    r1Check: 7.45,        // 红√
    r1CrossYuan: 8.25,    // 划掉 ¥30/天

    // —— beat3 270–390f (9.0–13.0s)：R2 自己带饭 ——
    r2Start: 9.05,
    r2Text: 9.20,
    r2Bento: 10.35,       // 丑便当涂鸦
    r2Check: 11.15,
    r2Stars: 11.80,       // 冒星星
    r2Save: 12.35,        // 省 ¥25/顿

    // —— beat4 390–510f (13.0–17.0s)：R3 走路通勤 ——
    r3Start: 13.05,
    r3Text: 13.20,
    r3Run: 14.35,         // 火柴人狂奔出汗
    r3Check: 15.55,
    r3Smile: 16.05,
    r3Save: 16.45,        // 省 ¥40/天

    // —— beat5 510–630f (17.0–21.0s)：R4 不买能蹭就蹭 ——
    r4Start: 17.05,
    r4Text: 17.20,
    r4Monster: 18.15,      // 页边小怪兽举旗
    r4Checks: 18.80,       // 红钩打满半页
    r4Stamp: 19.95,        // 页角蓝章"已省（并没有）"

    // —— beat6 630–720f (21.0–24.0s)：翻页 → 记账明细 ——
    flipStart: 21.05,
    flipDone: 22.25,
    detailTitle: 22.45,    // "本月记账明细"
    detailRows: [22.85, 23.20, 23.55],  // 三笔省下 30 / 25 / 40

    // —— beat7 720–810f (24.0–27.0s)：支出划掉又写回 + 涂改液 ——
    expenseStart: 24.05,
    e1Text: 24.20, e1Cross: 24.95,   // 直播间9.9包邮×37 + 手型光标戳购物车
    e2Text: 25.30, e2Cross: 25.80,   // 大米×20袋
    e3Text: 26.10, e3Cross: 26.55,   // 洗衣液×8瓶
    totalCover: 26.80,                 // 总额被涂改液盖三层

    // —— beat8 810–900f (27.0–30.0s)：箭头戳涂改液 → 露结余0 → 破防 → 彩蛋+署名 ——
    revealArrow: 27.20,    // 红圈/箭头戳涂改液
    lift: 27.65,           // 掀开白块露"结余：¥0.00"
    monsterBreak: 28.35,   // 小怪兽得意→破防
    egg: 28.80,            // 极小彩蛋"您已下单第402件小垃圾"
    sign: 29.25            // 署名
  };

  // ---------- 音效线索 ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');                       // 房间底噪铺满

  // 纸页翻开 + 笔落
  add(T.bookOpen, 'pageopen');
  add(T.penDown, 'nib');

  // 大标题逐字写：写字沙沙（断续）
  for (let i = 0; i < T.titleChars; i++) add(T.titleStart + i * 0.28, 'write');
  add(T.noteIn, 'stickypop');           // 便利贴啪
  add(T.noteSmall + 0.05, 'nib');

  // R1
  add(T.r1Text, 'write');
  add(T.r1Cup, 'write');                // 画咖啡杯
  add(T.r1Cup + 0.35, 'cross');         // 打叉唰
  add(T.r1Check, 'check');              // 红√
  add(T.r1CrossYuan, 'cross');          // 划掉¥30

  // R2
  add(T.r2Text, 'write');
  add(T.r2Bento, 'write');
  add(T.r2Bento + 0.3, 'nib');
  add(T.r2Check, 'check');
  add(T.r2Stars, 'ding');               // 冒星星叮
  add(T.r2Save, 'write');

  // R3
  add(T.r3Text, 'write');
  add(T.r3Run, 'runsteps');             // 跑步脚步
  add(T.r3Check, 'check');
  add(T.r3Smile, 'pop');                // 笑脸啵
  add(T.r3Save, 'write');

  // R4
  add(T.r4Text, 'write');
  add(T.r4Monster, 'pop');
  for (let i = 0; i < 6; i++) add(T.r4Checks + i * 0.09, 'check');  // 红钩连打
  add(T.r4Stamp, 'stamp');              // 蓝章盖章咚

  // 翻页
  add(T.flipStart, 'pageflip');
  add(T.flipDone, 'pageopen');
  add(T.detailTitle, 'write');
  T.detailRows.forEach(t => add(t, 'nib'));

  // 支出
  add(T.e1Text, 'write');
  add(T.e1Cross, 'cross');              // 手戳购物车+划掉
  add(T.e1Cross + 0.05, 'cartbump');
  add(T.e2Text, 'write');
  add(T.e2Cross, 'cross');
  add(T.e3Text, 'write');
  add(T.e3Cross, 'cross');
  add(T.totalCover, 'eraser');          // 涂改液咻啪（盖三层）
  add(T.totalCover + 0.18, 'eraser');
  add(T.totalCover + 0.36, 'eraser');

  // 反转
  add(T.revealArrow, 'nib');
  add(T.revealArrow + 0.25, 'cross');
  add(T.lift, 'stickylift');            // 掀开白块
  add(T.lift + 0.1, 'recordscrach');    // 口哨泄气尾音 / 唱片刮
  add(T.monsterBreak, 'defllate');      // 破防泄气
  add(T.egg, 'nib');
  add(T.sign, 'ding');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
