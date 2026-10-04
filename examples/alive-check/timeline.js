// timeline.js —— 全片唯一时间表。《活人感鉴定局》极简扁平风。
// 画面与音效都从这里取时间，别处不写死秒数。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---------- 开场 0–2.5 ----------
    blackIn: 0.0,            // 仅前 0.12s 黑场淡入
    headerIn: 0.20,          // "2026 秋招 · 数字人面试官"
    sessionIn: 0.62,         // "第 7341 场"
    titleIn: 1.05,           // 《活人感鉴定局》橙字
    steamIn: 0.9,            // 咖啡杯蒸汽
    r1In: 2.5,               // R1 卡片上滑入场

    // ---------- R1 2.5–7.0 对话框打字 ----------
    // "在……在的。" 含打错删改、光标跳
    r1Keys: [2.95, 3.18, 3.34, 3.50, 3.66, 3.92, 4.10, 4.34, 4.52], // 逐键 type
    r1Typo: 3.92,            // 打错的那一键
    r1Del: 4.10,             // 删改（backspace）
    r1Done: 4.62,            // 打完
    r1ErrStart: 4.9,         // 错字率环开始走
    r1ErrEnd: 5.7,           // 错字率 12% 到位
    r1ScoreFrom: 0,
    r1ScoreTo: 24,
    r1ScoreStart: 4.9,
    r1ScoreEnd: 6.0,
    r1Result: 6.05,          // "像人 / 24 分"
    r1Out: 7.0,

    // ---------- R2 7.0–11.5 爆炸圆脸贴纸 ----------
    r2In: 7.0,
    r2Sticker: 7.25,         // 圆脸贴纸 backOut 飞入
    r2BarStart: 7.7,         // 情绪浓度条走
    r2BarEnd: 9.3,           // 87%
    r2ScoreStart: 9.0,
    r2ScoreEnd: 10.0,
    r2Result: 10.05,         // 41 分
    r2Out: 11.5,

    // ---------- R3 11.5–16 已读不回 ----------
    r3In: 11.5,
    r3Msg: 11.85,            // "在吗？"气泡
    r3DoubleBlue: 12.1,      // 蓝双勾
    r3TimeStart: 12.3,       // 时间码滚动 00:00
    r3TimeEnd: 14.9,         // 17:00
    r3Gray: 14.9,            // 双勾变灰
    r3ScoreStart: 14.6,
    r3ScoreEnd: 15.6,
    r3Result: 15.65,         // 66 分
    r3Out: 16.0,

    // ---------- R4 16–20.5 主体性暴露 ----------
    r4In: 16.0,
    r4Keys: [16.55, 16.72, 16.89, 17.06, 17.23, 17.40, 17.57], // 长串？？？
    r4Slap: 17.75,           // 拍桌（卡片震两帧）
    r4Warn: 18.15,           // 蓝警告框弹入
    r4ScoreStart: 18.6,
    r4ScoreEnd: 19.7,
    r4Result: 19.75,         // 91 分
    r4Out: 20.5,

    // ---------- R5 20.5–24.5 请假 ----------
    r5In: 20.5,
    r5Keys: [21.05, 21.24, 21.43, 21.62, 21.81, 22.00, 22.19], // 下周想休一天
    r5Done: 22.35,
    r5RingStart: 22.5,       // 环形进度连续填充
    r5RingEnd: 23.7,         // 满格
    r5Check: 23.75,          // 打勾
    r5ScoreStart: 23.5,
    r5ScoreEnd: 24.2,
    r5Result: 24.25,         // 100/100
    r5Out: 24.5,

    // ---------- 反转 24.5–28 ----------
    revWhite: 24.5,          // 全白骤静（音乐戛然）
    revSilence: 0.5,         // 留白约 0.5s
    revDong: 25.0,           // 单一低音"咚"
    revVerdict: 25.25,       // 判词框滑入
    revStamp: 25.85,         // 橙方印砸下
    revBadge: 26.35,         // 工牌翻转头像打叉
    revToken: 27.1,          // BOT-2049 token 已签发
    revOut: 28.0,

    // ---------- 定格 28–30 ----------
    endCuptag: 28.05,        // 咖啡杯贴 BOT ONLY
    endLine: 28.05,          // "人类的尽头，是被鉴定成 AI。"
    signIn: 28.9,            // 署名
    signDing: 28.9,
    end: 30.0
  };

  // ---------- 音效线索（whoosh 类 t = 命中/到顶时刻，声音结束点对准它） ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  // 开场
  add(T.headerIn, 'fadein');
  add(T.titleIn, 'pluck', { notes: 0 });     // 标题单音
  add(T.r1In, 'slide');

  // R1 打字
  T.r1Keys.forEach((t, i) => {
    if (i === T.r1Keys.indexOf(T.r1Del)) return; // 删改单独处理
    add(t, 'type');
  });
  add(T.r1Typo, 'type');
  add(T.r1Del, 'del');                       // backspace 短促
  // 错字率环走 + 分数上行小三度琶音
  for (let t = T.r1ErrStart; t <= T.r1ErrEnd + 1e-6; t += 0.1) add(t, 'tick');
  add(T.r1ScoreEnd, 'arp');                  // 24 分 琶音
  add(T.r1Result, 'click');

  // R2
  add(T.r2In, 'slide');
  add(T.r2Sticker, 'pop');                   // 贴纸飞入
  for (let t = T.r2BarStart; t <= T.r2BarEnd + 1e-6; t += 0.09) add(t, 'tick');
  add(T.r2ScoreEnd, 'arp');                  // 41 分
  add(T.r2Result, 'click');

  // R3
  add(T.r3In, 'slide');
  add(T.r3Msg, 'bubble');
  add(T.r3DoubleBlue, 'click');              // 蓝双勾
  for (let t = T.r3TimeStart; t <= T.r3TimeEnd + 1e-6; t += 0.12) add(t, 'tick'); // 时间码滚动
  add(T.r3Gray, 'gray');                     // 双勾变灰
  add(T.r3ScoreEnd, 'arp');                  // 66 分
  add(T.r3Result, 'click');

  // R4
  add(T.r4In, 'slide');
  T.r4Keys.forEach(t => add(t, 'type'));
  add(T.r4Slap, 'slap');                     // 拍桌
  add(T.r4Warn, 'warn');                     // 系统警告
  add(T.r4ScoreEnd, 'arp');                  // 91 分
  add(T.r4Result, 'click');

  // R5
  add(T.r5In, 'slide');
  T.r5Keys.forEach(t => add(t, 'type'));
  for (let t = T.r5RingStart; t <= T.r5RingEnd + 1e-6; t += 0.08) add(t, 'tick');
  add(T.r5Check, 'check');                   // 打勾 click
  add(T.r5ScoreEnd, 'arp');                  // 100 分
  add(T.r5Result, 'click');

  // 反转：音乐戛然留白 0.5s（在 sfx.py 里把音乐床切到 revWhite），再单一低音"咚"
  add(T.revDong, 'dong');
  add(T.revVerdict, 'whoosh', { dur: 0.35 });   // 判词框滑入
  add(T.revStamp, 'thud');                       // 印章低频 thud
  add(T.revStamp, 'paper', { dur: 0.3 });        // 纸张 whoosh（结束点对准）
  add(T.revBadge, 'flip');                       // 工牌翻转
  add(T.revToken, 'token');                      // token 签发轻电子

  // 定格
  add(T.endCuptag, 'tag');                        // 咖啡杯贴标
  add(T.endLine, 'pluck', { notes: 0 });
  add(T.signDing, 'ding');                        // 署名轻 ding

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
