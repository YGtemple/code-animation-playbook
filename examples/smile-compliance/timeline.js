// timeline.js —— 《微笑合规》全片唯一时间源。画面与音效都从这里取时间。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---- 0–3s 开场：纸底 + 工牌/咖啡/光标滑入 + 标题盖章 ----
    introIn: 0.35,        // 工牌/咖啡/光标滑入
    titleStamp: 1.35,     // 「微笑合规测试」盖章砸下
    introEnd: 3.0,

    // ---- R1 3–9s：基础微笑，露8齿，60分 ----
    r1FaceIn: 3.0,
    r1DialLand: 5.55,     // 指针落到 60
    r1Check: 6.25,        // 错位 ✓ 盖下
    r1End: 9.0,

    // ---- R2 9–15s：眼睛也要笑，鱼尾纹，80分 ----
    r2In: 9.0,
    r2Wrinkles: 10.0,     // 眼周网点加密
    r2DialLand: 11.15,    // 指针落到 80
    r2Sweat: 11.7,        // 波浪汗滴冒出
    r2Check: 12.35,
    r2End: 15.0,

    // ---- R3 15–21s：真诚度扫描，弧度±0.1mm，95分 ----
    r3In: 15.0,
    r3Scan: 15.45,        // 钴蓝扫描线开始扫脸
    r3DialLand: 17.55,    // 指针落到 95
    r3Check: 18.2,
    r3End: 21.0,

    // ---- R4 21–26s：全天不松懈，面具裂开，指针顶满100 ----
    r4In: 21.0,
    r4DialLand: 22.55,    // 指针顶满 100
    r4Crack: 23.4,        // 假笑脸面具裂开
    r4Check: 24.0,        // 星级评分
    r4End: 26.0,

    // ---- 反转 26–28.7s ----
    clockPopup: 26.0,     // 弹出「18:00 下班」
    realSmile: 26.35,     // 真笑 0.1s（26.35–26.45）
    alarm: 26.55,         // 机器红警
    maskFall: 26.95,      // 假脸脱落露班味脸
    warnText: 27.25,      // ⚠ 未授权真实情绪
    stampFail: 27.55,     // 毛笔「不合格」落下
    tokenDeduct: 27.95,   // Token −1
    revEnd: 28.7,

    // ---- 署名 28.9–30.0 ----
    signIn: 29.0,
    signSeal: 29.35,
  };

  // ---------------- 音效线索 ----------------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');                       // lo-fi 黑胶纸噪底
  add(T.introIn, 'slide', { dur: 0.5 });// 物件滑入，结束点对齐
  add(T.titleStamp, 'stamp');           // 标题盖章
  add(T.titleStamp, 'tick');

  // R1
  add(T.r1FaceIn, 'slide', { dur: 0.35 });
  for (let tt = T.r1FaceIn + 0.25; tt <= T.r1DialLand + 1e-6; tt += 0.22) add(tt, 'tick');
  add(T.r1DialLand, 'ding');            // 判定过 = 收银机叮
  add(T.r1Check, 'stamp');              // ✓ 盖章
  add(T.r1Check + 0.12, 'ding');

  // R2
  add(T.r2In, 'slide', { dur: 0.3 });
  add(T.r2Wrinkles, 'type');
  for (let tt = T.r2In + 0.25; tt <= T.r2DialLand + 1e-6; tt += 0.2) add(tt, 'tick');
  add(T.r2DialLand, 'ding');
  add(T.r2Sweat, 'drop');               // 汗滴
  add(T.r2Check, 'stamp');
  add(T.r2Check + 0.12, 'ding');

  // R3
  add(T.r3In, 'slide', { dur: 0.3 });
  for (let tt = T.r3Scan; tt < T.r3Scan + 1.6; tt += 0.13) add(tt, 'scan');
  for (let tt = T.r3In + 0.25; tt <= T.r3DialLand + 1e-6; tt += 0.19) add(tt, 'tick');
  add(T.r3DialLand, 'ding');
  add(T.r3Check, 'stamp');
  add(T.r3Check + 0.12, 'ding');

  // R4
  add(T.r4In, 'slide', { dur: 0.3 });
  for (let tt = T.r4In + 0.2; tt <= T.r4DialLand + 1e-6; tt += 0.16) add(tt, 'tick');
  add(T.r4DialLand, 'ding');
  add(T.r4Crack, 'crack');              // 面具裂
  add(T.r4Check, 'stamp');
  add(T.r4Check + 0.1, 'star');

  // 反转
  add(T.clockPopup, 'pop');             // 18:00下班弹出
  add(T.realSmile, 'blip');             // 真笑 0.1s 小开心
  add(T.alarm, 'buzz8');                // 8-bit 错误蜂鸣
  add(T.alarm + 0.05, 'stutter');      // 黑胶跳针
  add(T.maskFall, 'tear');              // 假脸脱落 = 撕纸
  add(T.stampFail, 'stamp');            // 不合格盖章（狠）
  add(T.stampFail + 0.05, 'tear');
  add(T.tokenDeduct, 'buzz8');

  // 署名
  add(T.signSeal, 'seal');              // 轻叮

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
