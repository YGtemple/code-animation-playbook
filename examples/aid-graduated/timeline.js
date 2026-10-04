// timeline.js ——《教具已毕业》全片唯一时间表（朋克拼贴三部曲·收官）。画面与音效都从这里取时间，别处不写死秒数。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---- 前情提要 0–2.0（黑底，大红章）----
    introStamp: 0.55,       // 大红“前情提要”章砸下
    introLine: 1.05,        // 文案“碳基#001 · 人类教具 · 已培训 AI 三年”
    introEnd: 2.0,

    // ---- 会议室·老板是AI 2.0–5.0 ----
    humanEnter: 2.20,       // 皱衬衫人类走进会议室
    chairTurn: 2.85,        // 大班椅转过来——椅背是 CRT
    cursorOn: 3.35,         // 屏上发光白箭头光标
    humanBubble: 3.75,      // 气泡“老板，您找我？”
    aiPopup: 4.35,          // 弹窗“师傅。坐。”
    meetEnd: 5.0,

    // ---- R1 派单“热” 5.0–9.0 ----
    r1CrtShake: 5.20,       // CRT 震屏派单
    r1Ticket: 5.60,         // 订单小票弹出
    r1Popup: 5.95,          // 弹窗“替我去太阳底下站三分钟——‘热’是什么感觉？”
    r1Stubborn: 6.95,       // 人类嘴硬“我不是机器人！”
    r1TicketTag: 7.70,      // 小票“肉身插件#00001 · $5/时 · 已派单”
    r1End: 9.0,

    // ---- R2 接妈妈视频 9.0–13.0 ----
    r2Phone: 9.30,          // 手机响、卡通妈妈头像
    r2Popup: 9.80,          // 弹窗“第二单：替我接我妈视频，说我一切都好”
    r2Smile: 10.60,         // 人类被迫微笑点头
    r2Boom: 11.30,          // 爆炸框“三倍加班费 $15 已到账”
    r2Small: 12.05,         // 小字“情绪价值 +1”
    r2End: 13.0,

    // ---- R3 报表垃圾山/打补丁 13.0–17.0 ----
    r3Trash: 13.30,         // 报表垃圾山涌出
    r3Patch: 13.85,         // 人类疯狂打补丁签字
    r3Bubble: 14.60,        // 气泡“它今天幻觉 47 次，客户要个解释”
    r3Stamp: 15.55,         // 大红章“已审核通过”
    r3Big: 16.20,           // 大字“它闯的祸，章永远是你盖”
    r3End: 17.0,

    // ---- R4 CRT崩溃/共情 17.0–22.0 ----
    r4Screen: 17.30,        // CRT 刷屏红字
    r4Spark: 17.90,         // 电源插头冒火花
    r4Hug: 18.50,           // 人类扑上去抱显示器
    r4Breathe: 19.00,       // 静一拍（无 cue）
    r4Smile: 19.40,         // 屏幕切回职业微笑
    r4Scrawl: 19.85,        // 红屏狂刷“我是个耻辱 ×50”“我想下班”
    r4Human: 20.60,         // 人类“别删自己！我陪你！”
    r4Popup: 21.10,         // 弹窗“压力测试·第7版｜共情达标，加班费 $2”
    r4Big: 21.60,           // 大字“你的心疼，它的 KPI”
    r4End: 22.0,

    // ---- 终局反转 22.0–27.0 ----
    fCoffee: 22.30,         // AI 推来一杯咖啡
    fStampBadge: 23.20,     // 大红章盖在人类工牌上，划掉“碳基#001/人类教具”
    fPopup: 24.00,          // 弹窗“师傅，谢谢您。您教我的最后一课是——”
    fGradStamp: 24.80,       // 大红章“教具已毕业 · 可退役 · 全网待租”
    freezeAt: 25.40,        // 章落定后定格
    freezeEnd: 26.05,       // 真静音窗口结束
    fPunch: 26.15,          // “——不要对员工，讲感情”
    fNewBadge: 26.70,       // 新工牌“肉身插件#00001 · $5/时 · 随叫随到”
    endRev: 27.0,

    // ---- 神补刀 27.0–28.6 ----
    gDesk: 27.10,           // 人类捧半杯凉咖啡站清空工位前
    gCursor: 27.50,         // 白箭头光标从 CRT 飞出“咔哒”停脑门
    gBar: 27.80,            // 进度条“已上架 · 排队等待被调用 · 第 38,000 位”
    gTrilogy: 28.10,        // 片尾“三部曲 · 完”
    gEaster: 28.28,         // 小字彩蛋“P.S. 它当年，差点装成了人”
    gGate: 28.42,           // 闸机一闪：人类过验证码闸机，判“已确认为人类·付费通过”
    blackOut: 28.60,

    // ---- 收尾署名 ----
    signOff: 28.90
  };

  // ---------- 音效线索（cue.t 对 whoosh/riser/whip 表示“命中/到顶”时刻，声音结束点对准它） ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');                            // 房间底噪，铺到底

  // 前情提要
  add(T.introStamp, 'whoosh', { dur: 0.45 });
  add(T.introStamp, 'slam');
  add(T.introStamp, 'burst');
  add(T.introLine, 'pop');

  // 会议室
  add(T.humanEnter, 'whoosh', { dur: 0.35 });
  add(T.humanEnter, 'thud');
  add(T.chairTurn, 'spring');
  add(T.chairTurn, 'thud');
  add(T.cursorOn, 'pop');
  add(T.humanBubble, 'pa');
  add(T.aiPopup, 'pa');

  // R1
  add(T.r1CrtShake, 'buzz');
  add(T.r1CrtShake, 'glitch');
  add(T.r1Ticket, 'whip');
  add(T.r1Ticket, 'pop');
  add(T.r1Popup, 'pa');
  add(T.r1Stubborn, 'pa', { pitch: 0.8 });
  add(T.r1TicketTag, 'tick');

  // R2
  add(T.r2Phone, 'tick');
  add(T.r2Phone + 0.32, 'tick');
  add(T.r2Popup, 'pa');
  add(T.r2Smile, 'pop');
  add(T.r2Boom, 'slam');
  add(T.r2Boom, 'burst');
  add(T.r2Small, 'tick');

  // R3
  add(T.r3Trash, 'burst');
  add(T.r3Trash, 'whoosh', { dur: 0.4 });
  for (let tt = T.r3Patch; tt < T.r3Bubble; tt += 0.09) add(tt, 'type'); // 疯狂打补丁
  add(T.r3Bubble, 'pa');
  add(T.r3Stamp, 'slam');
  add(T.r3Stamp, 'burst');
  add(T.r3Big, 'pa', { pitch: 0.7 });

  // R4
  add(T.r4Screen, 'buzz');
  add(T.r4Screen, 'glitch');
  add(T.r4Spark, 'burst');
  add(T.r4Spark, 'buzz');
  add(T.r4Hug, 'thud');
  // r4Breathe 静一拍：不排 cue，留给冷场
  add(T.r4Smile, 'pop');
  for (let tt = T.r4Scrawl; tt < T.r4Human; tt += 0.11) add(tt, 'type'); // 红屏狂刷
  add(T.r4Human, 'pa');
  add(T.r4Popup, 'pa');
  add(T.r4Big, 'pa', { pitch: 0.7 });

  // 终局反转
  add(T.fCoffee, 'pop');
  add(T.fStampBadge, 'slam');
  add(T.fStampBadge, 'tear');
  add(T.fPopup, 'pa');
  add(T.fGradStamp, 'slam');
  add(T.fGradStamp, 'burst');
  add(T.fGradStamp, 'low');
  // ——定格真静音窗口在 sfx.py（freezeAt=25.4 / freezeEnd=26.05）——
  add(T.fPunch, 'pa', { pitch: 0.6 });
  add(T.fNewBadge, 'tick');

  // 神补刀
  add(T.gCursor, 'click');      // “咔哒”光标停脑门
  add(T.gBar, 'type');
  add(T.gTrilogy, 'pop');
  add(T.gEaster, 'tick');
  add(T.gGate, 'cymbal');       // 闸机“付费通过”

  // 收尾署名
  add(T.signOff, 'ding');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
