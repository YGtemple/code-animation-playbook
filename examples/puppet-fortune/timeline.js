// timeline.js ——《求个不被裁的签》皮影版，全片唯一时间源。画面与音效都从这里取时间。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---------- 开幕 0–1.5 ----------
    curtainWhoosh: 0.9,        // 幕布“嗖”拉开（whoosh 结束点对齐）
    walkInStart: 0.95,         // 古装小人走入
    walkInEnd: 1.6,

    // ---------- R1 1.5–5：跪地摇签，掉出“上上签” ----------
    kneelStart: 1.6,
    kneelEnd: 2.2,
    shake1Start: 2.3,
    shake1End: 3.6,
    stick1Drop: 3.75,          // 签掉出
    stick1Stamp: 3.95,         // 朱砂印“咚”落下
    bowStart: 4.2,             // 作揖大喜
    bowEnd: 5.0,

    // ---------- R2 5–9.5：第二签，笑容凝固 ----------
    shake2Start: 5.2,
    shake2End: 6.5,
    stick2Out: 6.65,           // 签滑出
    stick2Show: 7.2,           // 签文“工号0001·试用99年”显形
    freezeFace: 7.7,           // 笑容凝固
    r2End: 9.5,

    // ---------- R3 9.5–15：猛摇，签雨，菩萨工牌，苦茶 ----------
    shake3Start: 9.5,
    shake3End: 11.2,
    eruptStart: 11.3,          // 签筒喷涌漫天签
    eruptEnd: 13.2,
    badgeReveal: 12.3,         // 菩萨脖子工牌晃出来
    cupTrembleStart: 13.2,     // 苦茶碗抖
    r3End: 15.0,

    // ---------- R4 15–21.5：提线抽签，发现自己也被吊 ----------
    stringOut: 15.6,           // 签筒里伸出提线
    stringHook: 16.9,          // 勾走一根签
    puppetFreeze: 18.6,        // 小人愣住
    discover: 20.0,            // 发现自己背后也吊着提线
    r4End: 21.5,

    // ---------- 反转 21.5–26.5 ----------
    lookUp: 21.5,
    rowReveal: 22.0,           // 一排挂工牌的皮影
    puppetLift: 22.6,          // 自己被吊进排里
    tubeFall: 23.1,            // 签筒倒地
    rollOut: 23.9,             // 滚出新签
    bigStamp: 25.0,            // 朱砂大印“已归档” + 大锣“铛”
    gongSilenceEnd: 25.5,      // 锣后留白 0.5s

    // ---------- 定格 26.5–30 ----------
    // closeup: 26.5
    // signIn: 28.0
    // curtainCloseStart: 28.3, curtainCloseEnd: 29.2
    // cursorDrop: 29.0
  };

  T.closeup = 26.5;
  T.signIn = 28.0;
  T.curtainCloseStart = 28.3;
  T.curtainCloseEnd = 29.5;
  T.cursorDrop = 29.3;

  // 旁白时间点（混音时使用；画面不烧字幕）
  T.voice = [
    { at: 1.0,  text: '古时候找差事，先求菩萨。' },
    { at: 7.5,  text: '第一签，求个饭碗。' },
    { at: 14.0, text: '第二签，求个不被顶替。' },
    { at: 20.5, text: '菩萨没抬头，先记下了他的工号。' },
    { at: 23.5, text: '他以为自己在求签——' },
    { at: 27.5, text: '其实，他也是一根签。' },
  ];

  // ---------- 音效线索（whoosh 类 t 为“结束/命中”时刻，sfx.py 反向对齐） ----------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');                                   // 戏台底噪，铺到底
  add(T.curtainWhoosh, 'whoosh', { dur: 0.9 });     // 幕布拉开“嗖”
  [0.98, 1.2, 1.42].forEach(t => add(t, 'board'));  // 脚步声（木板台）

  // R1 摇签：哗啦逐回合递增
  for (let t = T.shake1Start; t < T.shake1End; t += 0.16) add(t, 'clatter', { vol: 0.5 });
  add(T.stick1Drop, 'clatter', { vol: 0.9 });
  add(T.stick1Stamp, 'dong');                       // 盖章“咚”
  add(T.stick1Stamp + 0.06, 'muyu');
  add(T.bowStart + 0.1, 'muyu');
  add(T.bowEnd - 0.1, 'muyu');

  // R2
  for (let t = T.shake2Start; t < T.shake2End; t += 0.13) add(t, 'clatter', { vol: 0.7 });
  add(T.stick2Out, 'clatter', { vol: 1.0 });
  add(T.stick2Show, 'thud');                        // 签文显形闷响
  add(T.freezeFace, 'low');                         // 笑容凝固，低频一沉

  // R3：猛摇 + 签雨
  for (let t = T.shake3Start; t < T.shake3End; t += 0.1) add(t, 'clatter', { vol: 0.95 });
  for (let i = 0; i < 9; i++) {                     // 漫天签
    const t = T.eruptStart + i * 0.21;
    add(t, 'clatter', { vol: 0.8 });
    if (i % 3 === 2) add(t + 0.05, 'bang');         // 梆子脆点
  }
  add(T.badgeReveal, 'ding');                       // 工牌一晃
  for (let t = T.cupTrembleStart; t < T.r3End; t += 0.28) add(t, 'tick');  // 茶碗抖

  // R4：提线
  add(T.stringOut, 'riser', { dur: 1.2 });          // 细线探出（到顶对齐 16.8）
  add(T.stringHook, 'snap');                        // 提线勾走签
  add(T.puppetFreeze, 'low');                       // 愣住，低频压住
  add(T.discover, 'creak');                          // 提线木柄吱呀

  // 反转
  add(T.lookUp, 'whoosh', { dur: 0.5 });
  add(T.rowReveal, 'boom');                         // 一排皮影显形
  add(T.puppetLift, 'riser', { dur: 0.6 });
  add(T.tubeFall, 'thud');
  add(T.tubeFall + 0.12, 'clatter', { vol: 0.8 });
  add(T.rollOut, 'clatter', { vol: 0.9 });
  add(T.bigStamp, 'gong');                          // 大锣“铛”（反转重击）
  add(T.bigStamp + 0.02, 'dong');
  // 25.0–25.5 锣后留白 0.5s（sfx.py 真静音窗）

  // 定格
  add(T.signIn, 'ding');
  add(T.curtainCloseStart + 0.45, 'whoosh', { dur: 0.5 });  // 幕布合拢
  add(T.cursorDrop, 'tick');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
