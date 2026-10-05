// timeline.js —— 全片唯一时间表。《AI 不能欠薪》：等距3D isometric。
// 公司裁人换 AI → 真快 → 账单也真 → 欠费当天停工 → 连夜挂回招聘链接（人薪可拖）。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ===== 0–3 钩子：工牌落地 / AI 滑入 / 红章"优化" =====
    titleIn: 0.20,
    badgeDrop: 0.90,          // 工牌"当啷"落地（N1 旁白 @1.0）
    aiSlideIn: 1.45,          // 青块从右侧滑入
    aiArrive: 2.15,           // 青块到岛中央
    sealOptimize: 2.45,       // 红章"优化"盖下

    // ===== R1 3–8：人类被推下岛 / 青块居中顶亮◉ =====
    humanPush: 3.20,          // 人类块被推
    humanGone: 4.10,          // 人类块消失
    aiCenter: 4.50,           // 青块滑到正中
    eyeLit: 4.90,             // 顶亮 ◉
    // N2 @9.0

    // ===== R2 8–14：青块堆成3层效率塔 / Token猛转 / +400% =====
    tower1: 8.25,
    tower2: 9.05,
    tower3: 9.85,
    counterSpin: 8.20,
    counterSpinEnd: 12.40,
    effJump: 11.60,           // 效率 +400% 跳出
    // N3 @16.0

    // ===== R3 14–20：红账单块从天上摞高 / 转盘点成¥飙升 =====
    billStart: 14.30,
    billStep: 0.85,
    billCount: 5,
    counterYen: 15.00,        // 计数器翻成 ¥
    // (N3 @16.0 落在账单中段)

    // ===== R4 20–25：青块变灰 / 效率塔哗啦散架 / 转盘停"欠费" / 岛灯暗一半 =====
    aiGray: 20.10,            // 电流"滋——"
    towerCollapse: 20.60,
    towerDown: 21.50,
    islandDim: 21.00,         // 岛灯暗一半
    counterStop: 21.80,       // 转盘停 "欠费"
    // N4 @22.0

    // ===== 反转 25–29：光标"叮"把招聘牌立回 / 橙人探回端咖啡 / 金章"招聘中" =====
    cursorIn: 25.20,
    cursorClick: 25.65,       // 叮
    signUp: 25.65,            // 白底招聘牌立回岛中央
    humanPeek: 26.20,         // 橙人从边缘探回
    coffeePick: 26.60,        // 端起咖啡
    sealHire: 27.30,          // 金章"招聘中"盖下
    // N5 @26.0（金句，音乐收半拍）

    // ===== 29–30 定格：招聘牌+橙人+咖啡同框 / 署名 =====
    creditIn: 28.90
  };

  // ---------- 音效线索 ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');

  // 钩子
  add(T.badgeDrop, 'badge');        // 工牌金属当啷落地
  add(T.aiSlideIn + 0.5, 'slide'); // AI 滑入 whoosh
  add(T.sealOptimize, 'stamp');    // 红章盖下 + 纸摩擦

  // R1
  add(T.humanPush, 'whoosh', { dur: 0.5 }); // 人被推走
  add(T.humanGone, 'pop');
  add(T.aiCenter, 'slide');
  add(T.eyeLit, 'blip', { pitch: 1.0 });

  // R2：效率塔逐层堆叠 = 木质"哒"
  add(T.tower1, 'wood');
  add(T.tower2, 'wood');
  add(T.tower3, 'wood');
  // Token 转盘猛转的快 tick（越来越密）
  let tt = T.counterSpin; let k = 0;
  while (tt < T.counterSpinEnd) { add(tt, 'tick', { v: 0.4 + 0.5 * (k / 12) }); tt += 0.28; k++; }
  add(T.effJump, 'ding');

  // R3：红账单块逐个落下 = 低沉"咚"
  for (let i = 0; i < T.billCount; i++) add(T.billStart + i * T.billStep, 'dong');
  add(T.counterYen, 'blip', { pitch: 1.6 });

  // R4：AI 停工 = 电流滋——后静音；效率塔哗啦散架
  add(T.aiGray, 'zap');
  add(T.towerCollapse, 'crumble');
  add(T.towerDown, 'boom');
  add(T.counterStop, 'buzz');       // 欠费提示
  // R4 后短真静音（冷场，连底噪归零）
  add(21.85, 'silentwin');

  // 反转：招聘牌挂回 = 轻快"叮"
  add(T.cursorClick, 'ding');
  add(T.signUp, 'wood');
  add(T.humanPeek, 'pop');
  add(T.sealHire, 'stamp');         // 金章
  add(T.creditIn, 'endding');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
