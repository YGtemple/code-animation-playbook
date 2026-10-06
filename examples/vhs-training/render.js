// render.js —— 纯函数 render(t) 出帧。加载时一次建好全部元素；只画干净主体，VHS 失真由 post_vhs.py 施加。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const { T } = window;

  // ---------- 确定性哈希 / 缓动 ----------
  const h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = (a, b, x) => { const p = clamp((x - a) / (b - a), 0, 1); return p * p * (3 - 2 * p); };
  const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
  const easeOutBack = p => { const c = 1.70158, s = 1.0; p -= 1; return s * p * p * ((c + 1) * p + c) + 1; };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(e, s) { e.textContent = s; }
  function show(g, v) { g.setAttribute('display', v ? '' : 'none'); }

  // VHS 色板
  const COL = {
    black: '#0d0b12', warmWhite: '#e8dcc8', grass: '#7a8b5a',
    blue: '#5a7a9a', gold: '#d9a441', osd: '#9dffc4', rec: '#ff2a2a',
    skin: '#c9a07a', wood: '#5a4632', chalk: '#e8dcc8', board: '#33402a'
  };

  const stage = document.getElementById('stage');
  const defs = el('defs', {}, stage);

  // ================= 世界根 =================
  const world = el('g', { id: 'world' }, stage);
  const bg = el('rect', { x: 0, y: 0, width: W, height: H, fill: COL.black }, world);

  // 通用：一个扁平小人（head 圆 + body + arms），可被各场景复用姿势
  function person(parent, x, y, s, shirt) {
    const g = el('g', { transform: `translate(${x} ${y}) scale(${s})` }, parent);
    // 腿
    el('rect', { x: -16, y: 78, width: 13, height: 60, rx: 6, fill: COL.black, opacity: 0.85 }, g);
    el('rect', { x: 3, y: 78, width: 13, height: 60, rx: 6, fill: COL.black, opacity: 0.85 }, g);
    // 身体
    el('rect', { x: -26, y: 0, width: 52, height: 86, rx: 16, fill: shirt }, g);
    // 头
    el('circle', { cx: 0, cy: -34, r: 30, fill: COL.skin }, g);
    // 头发
    el('path', { d: 'M-30 -44 a30 30 0 0 1 60 0 l0 -6 l-60 0 z', fill: '#241d18' }, g);
    return g;
  }

  // ================= 场景：开场 gIntro =================
  const gIntro = el('g', {}, world);
  // VHS 磁带轮廓（剪影）
  const tape = el('g', { opacity: 0 }, gIntro);
  el('rect', { x: CX - 230, y: CY - 150, width: 460, height: 300, rx: 14, fill: '#16131c', stroke: COL.warmWhite, 'stroke-width': 3, opacity: 0.9 }, tape);
  el('rect', { x: CX - 190, y: CY - 110, width: 380, height: 120, rx: 8, fill: '#0d0b12', stroke: COL.warmWhite, 'stroke-width': 2, opacity: 0.8 }, tape);
  el('circle', { cx: CX - 110, cy: CY - 50, r: 40, fill: 'none', stroke: COL.warmWhite, 'stroke-width': 6, opacity: 0.8 }, tape);
  el('circle', { cx: CX + 110, cy: CY - 50, r: 40, fill: 'none', stroke: COL.warmWhite, 'stroke-width': 6, opacity: 0.8 }, tape);
  el('circle', { cx: CX - 110, cy: CY - 50, r: 12, fill: COL.warmWhite, opacity: 0.8 }, tape);
  el('circle', { cx: CX + 110, cy: CY - 50, r: 12, fill: COL.warmWhite, opacity: 0.8 }, tape);
  const tapeLabel = el('text', { x: CX, y: CY + 70, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 34, fill: COL.gold }, tape);
  txt(tapeLabel, 'SP  E-120  录象带');
  // 中插卡
  const introCard = el('g', { opacity: 0 }, gIntro);
  el('rect', { x: CX - 560, y: CY - 90, width: 1120, height: 180, fill: '#08070c' }, introCard);
  el('rect', { x: CX - 560, y: CY - 90, width: 1120, height: 180, fill: 'none', stroke: COL.warmWhite, 'stroke-width': 2, opacity: 0.4 }, introCard);
  const introCardText = el('text', { x: CX, y: CY + 18, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 64, fill: COL.warmWhite }, introCard);
  txt(introCardText, '《职业素养培训 · 第3辑》');

  // ================= 场景：黑板 gBoard =================
  const gBoard = el('g', {}, world);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: '#141019' }, gBoard);
  // 黑板
  el('rect', { x: 380, y: 180, width: 1160, height: 460, rx: 6, fill: COL.board, stroke: COL.wood, 'stroke-width': 16 }, gBoard);
  el('rect', { x: 380, y: 640, width: 1160, height: 18, fill: COL.wood }, gBoard);
  // 板书「守时」
  const boardWord = el('text', { x: CX, y: 470, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 200, fill: COL.chalk, opacity: 0 }, gBoard);
  txt(boardWord, '守时');
  // 讲台 + 讲师
  const boardTeacher = person(gBoard, 560, 760, 1.5, COL.blue);
  // 讲台
  el('path', { d: 'M470 820 L720 820 L700 1000 L490 1000 Z', fill: COL.wood }, gBoard);
  el('rect', { x: 470, y: 800, width: 250, height: 26, rx: 4, fill: '#6b553c' }, gBoard);
  el('text', { x: 595, y: 930, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 34, fill: COL.warmWhite, opacity: 0.85 }, gBoard);

  // ================= 场景：第一章 gCh1 =================
  const gCh1 = el('g', {}, world);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: '#141019' }, gCh1);
  // 左侧：大钟（提前10分钟 = 07:50）
  const ch1Clock = el('g', { opacity: 0, transform: `translate(560 470)` }, gCh1);
  el('circle', { r: 200, fill: '#0d0b12', stroke: COL.warmWhite, 'stroke-width': 8 }, ch1Clock);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    el('line', { x1: Math.sin(a) * 170, y1: -Math.cos(a) * 170, x2: Math.sin(a) * 188, y2: -Math.cos(a) * 188, stroke: COL.warmWhite, 'stroke-width': 6 }, ch1Clock);
  }
  // 时针 ~10(07:50 分针近10), 分针近10
  el('line', { x1: 0, y1: 0, x2: 0, y2: -90, stroke: COL.gold, 'stroke-width': 10, 'stroke-linecap': 'round', transform: 'rotate(235)' }, ch1Clock);
  el('line', { x1: 0, y1: 0, x2: 0, y2: -150, stroke: COL.warmWhite, 'stroke-width': 7, 'stroke-linecap': 'round', transform: 'rotate(300)' }, ch1Clock);
  el('circle', { r: 10, fill: COL.rec }, ch1Clock);
  el('text', { x: 0, y: 250, 'text-anchor': 'middle', 'font-family': 'OSD', 'font-size': 40, fill: COL.osd }, ch1Clock);
  // 右侧：工位 + 小人（坐着），秒起身关电脑
  const ch1Desk = el('g', {}, gCh1);
  el('rect', { x: 1150, y: 640, width: 560, height: 26, fill: COL.wood }, ch1Desk);
  el('rect', { x: 1180, y: 666, width: 22, height: 260, fill: COL.wood }, ch1Desk);
  el('rect', { x: 1660, y: 666, width: 22, height: 260, fill: COL.wood }, ch1Desk);
  // 显示器
  el('rect', { x: 1330, y: 470, width: 220, height: 150, rx: 8, fill: '#0a1410', stroke: COL.grass, 'stroke-width': 4 }, ch1Desk);
  el('rect', { x: 1420, y: 620, width: 40, height: 24, fill: COL.wood }, ch1Desk);
  // 小人坐姿（默认坐着，ch1Leave 时起身+关电脑）
  const ch1Worker = el('g', { transform: 'translate(1250 760)' }, gCh1);
  el('rect', { x: -20, y: 60, width: 44, height: 70, rx: 10, fill: COL.black, opacity: 0.85 }, ch1Worker); // 凳
  el('rect', { x: -26, y: -20, width: 56, height: 90, rx: 14, fill: COL.grass }, ch1Worker);          // 身
  el('circle', { cx: 2, cy: -52, r: 28, fill: COL.skin }, ch1Worker);                                       // 头
  el('path', { d: 'M-26 -62 a28 28 0 0 1 56 0 l0 -6 l-56 0 z', fill: '#241d18' }, ch1Worker);
  // 关电脑后的屏幕（黑）
  const ch1ScreenOff = el('rect', { x: 1336, y: 476, width: 208, height: 138, fill: '#050408', opacity: 0 }, ch1Desk);
  // 反讽小字
  const ch1Sub = el('text', { x: CX, y: 980, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 44, fill: COL.gold, opacity: 0 }, gCh1);
  txt(ch1Sub, '2026 年了，大家比的是谁准点下班');

  // ================= 场景：第二章 gCh2 =================
  const gCh2 = el('g', {}, world);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: '#141019' }, gCh2);
  el('rect', { x: 360, y: 660, width: 1200, height: 30, fill: COL.wood }, gCh2);
  el('rect', { x: 400, y: 690, width: 26, height: 230, fill: COL.wood }, gCh2);
  el('rect', { x: 1490, y: 690, width: 26, height: 230, fill: COL.wood }, gCh2);
  el('text', { x: CX, y: 380, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 72, fill: COL.warmWhite }, gCh2);
  // 猫（趴工位）：头趴在桌上，身体瘫
  const ch2Cat = el('g', { transform: 'translate(960 600)' }, gCh2);
  // 身体（瘫在椅子上/桌下）
  el('ellipse', { cx: 120, cy: 120, rx: 180, ry: 46, fill: COL.grass }, ch2Cat);
  // 头（趴在桌沿）
  const ch2CatHead = el('g', { transform: 'translate(-40 0)' }, ch2Cat);
  el('circle', { r: 62, fill: COL.grass }, ch2CatHead);
  el('path', { d: 'M-46 -40 l-16 -34 l34 14 z', fill: COL.grass }, ch2CatHead);
  el('path', { d: 'M46 -40 l16 -34 l-34 14 z', fill: COL.grass }, ch2CatHead);
  // 闭眼（两条弧线）
  el('path', { d: 'M-30 -6 q10 10 22 0', fill: 'none', stroke: COL.black, 'stroke-width': 5, 'stroke-linecap': 'round' }, ch2CatHead);
  el('path', { d: 'M8 -6 q10 10 22 0', fill: 'none', stroke: COL.black, 'stroke-width': 5, 'stroke-linecap': 'round' }, ch2CatHead);
  // 尾巴（瘫软拖在地上）
  el('path', { d: 'M280 120 q120 -10 150 40', fill: 'none', stroke: COL.grass, 'stroke-width': 22, 'stroke-linecap': 'round' }, ch2Cat);
  const ch2Sub = el('text', { x: CX, y: 980, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 44, fill: COL.gold, opacity: 0 }, gCh2);
  txt(ch2Sub, '前额叶没坏，是累了 —— 班味腌入味了');

  // ================= 场景：第三章 gCh3 =================
  const gCh3 = el('g', {}, world);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: '#141019' }, gCh3);
  // 窗外
  el('rect', { x: 1180, y: 180, width: 560, height: 560, fill: '#0c1822', stroke: COL.wood, 'stroke-width': 18 }, gCh3);
  el('line', { x1: 1460, y1: 180, x2: 1460, y2: 740, stroke: COL.wood, 'stroke-width': 12 }, gCh3);
  el('line', { x1: 1180, y1: 460, x2: 1740, y2: 460, stroke: COL.wood, 'stroke-width': 12 }, gCh3);
  el('circle', { cx: 1620, cy: 300, r: 46, fill: COL.gold, opacity: 0.8 }, gCh3); // 窗外昏黄太阳
  // 负鼠脸（呆望）：背手站窗前
  const ch3Guy = el('g', { transform: 'translate(820 720)' }, gCh3);
  el('rect', { x: -30, y: 0, width: 62, height: 150, rx: 16, fill: COL.blue }, ch3Guy);            // 身
  el('rect', { x: -24, y: 150, width: 16, height: 130, fill: COL.black, opacity: 0.85 }, ch3Guy);   // 腿
  el('rect', { x: 8, y: 150, width: 16, height: 130, fill: COL.black, opacity: 0.85 }, ch3Guy);
  el('circle', { cx: 0, cy: -40, r: 34, fill: COL.skin }, ch3Guy);                                      // 头
  el('path', { d: 'M-34 -52 a34 34 0 0 1 68 0 l0 -8 l-68 0 z', fill: '#241d18' }, ch3Guy);
  el('circle', { cx: -12, cy: -44, r: 4, fill: COL.black }, ch3Guy);                                    // 呆眼
  el('circle', { cx: 12, cy: -44, r: 4, fill: COL.black }, ch3Guy);
  el('path', { d: 'M-14 -26 q14 -6 28 0', fill: 'none', stroke: COL.black, 'stroke-width': 3 }, ch3Guy); // 面无表情嘴
  const ch3Sub = el('text', { x: CX, y: 980, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 44, fill: COL.gold, opacity: 0 }, gCh3);
  txt(ch3Sub, '身不由己，但精神状态，很美丽');

  // ================= 场景：收尾 gWrap =================
  const gWrap = el('g', {}, world);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: '#141019' }, gWrap);
  el('rect', { x: 380, y: 180, width: 1160, height: 460, rx: 6, fill: COL.board, stroke: COL.wood, 'stroke-width': 16 }, gWrap);
  const wrapTeacher = person(gWrap, 620, 760, 1.5, COL.blue);
  el('path', { d: 'M530 820 L780 820 L760 1000 L550 1000 Z', fill: COL.wood }, gWrap);
  const wrapLine = el('text', { x: CX, y: 900, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 52, fill: COL.warmWhite, opacity: 0 }, gWrap);
  txt(wrapLine, '恭喜完成培训，你正式成为一名——');

  // ================= 场景：不及格定格 gFail =================
  const gFail = el('g', {}, world);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: '#08070c' }, gFail);
  el('rect', { x: CX - 760, y: 330, width: 1520, height: 420, fill: '#0d0b12', stroke: COL.rec, 'stroke-width': 6 }, gFail);
  const failBig = el('text', { x: CX, y: 470, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 96, fill: COL.rec, opacity: 0 }, gFail);
  txt(failBig, '培训考核　不及格。');
  const failSmall = el('text', { x: CX, y: 620, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 56, fill: COL.warmWhite, opacity: 0 }, gFail);
  txt(failSmall, '原因：你现在还在上班。');
  // 右下极小彩蛋
  const egg = el('text', { x: W - 30, y: 1050, 'text-anchor': 'end', 'font-family': 'ArkPix', 'font-size': 22, fill: COL.osd, opacity: 0 }, gFail);
  txt(egg, '· 本带 2026 仍在循环播放 ·');
  // 署名
  const sign = el('text', { x: CX, y: 880, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 34, fill: COL.warmWhite, opacity: 0 }, gFail);
  txt(sign, '由 Doubao 在 30 秒内用纯代码制作完成');

  // ================= 章节插卡（悬浮层） =================
  function chapterCard(txtStr) {
    const g = el('g', { opacity: 0 }, world);
    el('rect', { x: CX - 620, y: CY - 110, width: 1240, height: 220, fill: '#08070c' }, g);
    el('rect', { x: CX - 620, y: CY - 110, width: 1240, height: 220, fill: 'none', stroke: COL.warmWhite, 'stroke-width': 2, opacity: 0.35 }, g);
    const t = el('text', { x: CX, y: CY + 26, 'text-anchor': 'middle', 'font-family': 'ArkPix', 'font-size': 88, fill: COL.warmWhite }, g);
    txt(t, txtStr);
    return g;
  }
  const card1 = chapterCard('第一章 · 守时');
  const card2 = chapterCard('第二章 · 爱岗敬业');
  const card3 = chapterCard('第三章 · 服从大局');

  // ================= OSD 层（常驻） =================
  const gOSD = el('g', {}, stage);
  // 左上 ● REC
  const recDot = el('circle', { cx: 60, cy: 56, r: 13, fill: COL.rec }, gOSD);
  const recTxt = el('text', { x: 86, y: 66, 'font-family': 'OSD', 'font-size': 38, fill: COL.rec }, gOSD);
  txt(recTxt, 'REC');
  // 右上 日期时间戳
  const stamp = el('text', { x: W - 50, y: 66, 'text-anchor': 'end', 'font-family': 'OSD', 'font-size': 38, fill: COL.osd }, gOSD);
  // 右下 磁带计数
  const counter = el('text', { x: W - 50, y: 1012, 'text-anchor': 'end', 'font-family': 'OSD', 'font-size': 34, fill: COL.osd, opacity: 0.9 }, gOSD);
  // 底部中央 播放状态
  const modeTxt = el('text', { x: CX, y: 1012, 'text-anchor': 'middle', 'font-family': 'OSD', 'font-size': 36, fill: COL.osd }, gOSD);

  // ================= render(t) =================
  function render(t) {
    const frame = Math.round(t * T.fps);

    // ---- 各场景显隐（时间区间） ----
    show(gIntro, t < T.boardIn);
    show(gBoard, t >= T.boardIn && t < T.ch1Card);
    show(gCh1, t >= 5.5 && t < T.glitch1);
    show(gCh2, t >= T.glitch1Out && t < T.trackBad);
    show(gCh3, t >= T.trackBadOut && t < T.wrapWord);
    show(gWrap, t >= T.wrapWord && t < T.snowOut);
    show(gFail, t >= T.snowOut);

    // 插卡
    const cardOn = (a, b) => smooth(a, a + 0.25, t) * (1 - smooth(b - 0.25, b, t));
    introCard.setAttribute('opacity', cardOn(T.introCard, T.introCardOut));
    card1.setAttribute('opacity', cardOn(T.ch1Card, T.ch1CardOut));
    card2.setAttribute('opacity', cardOn(T.ch2Card, T.ch2CardOut));
    card3.setAttribute('opacity', cardOn(T.ch3Card, T.ch3CardOut));

    // ---- 开场磁带轮廓 ----
    tape.setAttribute('opacity', smooth(T.tapeFade, T.tapeFade + 1.2, t) * 0.85);

    // ---- 板书 ----
    boardWord.setAttribute('opacity', smooth(T.boardWrite, T.boardWrite + 0.6, t));

    // ---- 第一章：钟 / 小人起身 / 反讽 ----
    ch1Clock.setAttribute('opacity', smooth(T.ch1Clock, T.ch1Clock + 0.5, t));
    ch1Sub.setAttribute('opacity', smooth(T.ch1Sub, T.ch1Sub + 0.6, t));
    // 起身：从坐着(y=760) 到站起(y~720 上移)，显示器熄灭
    const leave = smooth(T.ch1Leave, T.ch1Leave + 0.4, t);
    ch1Worker.setAttribute('transform', `translate(1250 ${760 - 130 * leave})`);
    ch1ScreenOff.setAttribute('opacity', leave);

    // ---- 第二章：强撑 -> 瘫倒 ----
    ch2Sub.setAttribute('opacity', smooth(T.ch2Sub, T.ch2Sub + 0.6, t));
    const coll = smooth(T.ch2Wobble, T.ch2Collapse, t); // 0->1
    // 猫头从抬起(歪) 到 趴下
    ch2CatHead.setAttribute('transform', `translate(-40 ${-40 * (1 - coll)}) rotate(${12 * (1 - coll)} -40 0)`);
    ch2Cat.setAttribute('opacity', smooth(T.ch2Desk, T.ch2Desk + 0.6, t));

    // ---- 第三章 ----
    ch3Sub.setAttribute('opacity', smooth(T.ch3Sub, T.ch3Sub + 0.6, t));

    // ---- 收尾讲师台词 ----
    wrapLine.setAttribute('opacity', smooth(T.wrapWord, T.wrapWord + 0.5, t));

    // ---- 不及格定格 ----
    const fz = smooth(T.failFreeze, T.failFreeze + 0.3, t);
    failBig.setAttribute('opacity', fz);
    failSmall.setAttribute('opacity', fz);
    egg.setAttribute('opacity', smooth(T.egg, T.egg + 0.4, t) * 0.9);
    sign.setAttribute('opacity', smooth(T.signOff, T.signOff + 0.5, t) * 0.95);

    // ---- OSD ----
    // REC 红点 1Hz 闪
    const recBlink = (Math.floor(t * 2) % 2 === 0) ? 1 : 0.15;
    recDot.setAttribute('opacity', t >= T.recOn ? recBlink : 0);
    recTxt.setAttribute('opacity', t >= T.recOn ? 1 : 0);

    // 时间戳：正常播放 AM 10:24:3x；定格后停 AM 06:00:00
    let stampStr;
    if (t >= T.stampStop) {
      stampStr = 'AM 06:00:00  06/12/1995';
    } else {
      const base = 10 * 3600 + 24 * 60 + 36;
      const el = Math.floor(t / 2); // 每2真实秒走1秒
      const s = (base + el) % 86400;
      const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
      const pad = n => String(n).padStart(2, '0');
      stampStr = `AM ${pad(hh)}:${pad(mm)}:${pad(ss)}  06/12/1995`;
    }
    txt(stamp, stampStr);

    // 磁带计数：播放走时，倒带回退，定格停
    let ct;
    if (t < T.playOn) ct = 0;
    else if (t < T.pauseAt) ct = t - T.playOn;
    else if (t < T.rewindAt) ct = T.pauseAt - T.playOn;
    else if (t < T.stopAt) ct = (T.rewindOut - T.rewindAt) - (t - T.rewindAt); // 倒带
    else ct = 0;
    ct = Math.max(0, ct);
    const cm = Math.floor(ct / 60), cs = Math.floor(ct % 60), cfr = Math.floor((ct % 1) * 30);
    txt(counter, `SP 0:${String(cm).padStart(2, '0')}:${String(cs).padStart(2, '0')}`);

    // 底部播放状态
    const mode = T.osdMode(t);
    const modeMap = { rec: '', play: '▶ PLAY', pause: '❚❚ PAUSE', rew: '◀◀ REW', stop: '■ STOP' };
    txt(modeTxt, modeMap[mode]);
    show(modeTxt, t >= T.playOn);

    // ---- world 微抖（jitter 主体层，±0-2px；重 glitch 在 post） ----
    const jx = (h(frame * 1.3) - 0.5) * 2 * 1.5;
    world.setAttribute('transform', `translate(${jx.toFixed(2)} 0)`);
  }

  window.render = render;
  render(0);
})();
