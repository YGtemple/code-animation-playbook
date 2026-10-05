// render.js ——《求个不被裁的签》皮影风。纯函数 render(t)；boil 全局关，活感来自关节微动/青烟/签抖。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const { T } = window;

  // ---------- 牛皮幕布色板 ----------
  const CREAM = '#F2E3C6';   // 幕布底
  const HL = '#FBF4E2';      // 幕布高光
  const DARK = '#E3CDA6';    // 暗角/签面
  const INK = '#2B1D16';     // 人物深剪影（不用纯黑）
  const BACK = '#7A5C44';     // 后层剪影
  const FRONT = '#4A3428';   // 前景棕
  const RED = '#C8372D';      // 朱砂
  const GREEN = '#4E7A4E';   // 石绿
  const GOLD = '#B8893A';     // 赭金

  // ---------- 确定性哈希与缓动 ----------
  const h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = (a, b, x) => { const p = clamp((x - a) / (b - a), 0, 1); return p * p * (3 - 2 * p); };
  const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
  const backOut = p => { const c = 1.70158, s = 1.1; p -= 1; return s * p * p * ((c + 1) * p + c) + 1; };
  const P = Math.PI * 2;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(e, s) { e.textContent = s; }
  function show(g, v) { g.setAttribute('display', v ? '' : 'none'); }

  const stage = document.getElementById('stage');

  // ============================ DEFS ============================
  const defs = el('defs', {}, stage);
  // 细布纹（静态，不产生逐帧差异）
  const grainF = el('filter', { id: 'grain', x: '0', y: '0', width: '100%', height: '100%' }, defs);
  const grainT = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '3', stitchTiles: 'stitch' }, grainF);
  el('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0.10  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.18 0' }, grainF);
  // 盖章径向晕（仅 1–2 帧用）
  const sealGrad = el('radialGradient', { id: 'sealGlow', cx: '0.5', cy: '0.5', r: '0.5' }, defs);
  el('stop', { offset: '0%', 'stop-color': RED, 'stop-opacity': '0.55' }, sealGrad);
  el('stop', { offset: '100%', 'stop-color': RED, 'stop-opacity': '0' }, sealGrad);

  // ============================ 世界根 ============================
  const world = el('g', { id: 'world' }, stage);
  const bg = el('rect', { x: 0, y: 0, width: W, height: H, fill: CREAM }, world);

  // 硬边暗角（不做半透明渐变，用实色角块）
  const vign = el('g', {}, world);
  el('path', { d: 'M0 0 L240 0 L0 200 Z', fill: DARK, opacity: 0.35 }, vign);
  el('path', { d: 'M1920 0 L1680 0 L1920 200 Z', fill: DARK, opacity: 0.35 }, vign);
  el('path', { d: 'M0 1080 L0 880 L240 1080 Z', fill: DARK, opacity: 0.35 }, vign);
  el('path', { d: 'M1920 1080 L1920 880 L1680 1080 Z', fill: DARK, opacity: 0.35 }, vign);

  // ---------- 回纹/冰裂纹边框 ----------
  const gBorder = el('g', {}, world);
  el('rect', { x: 26, y: 26, width: 1868, height: 1028, fill: 'none', stroke: BACK, 'stroke-width': 4 }, gBorder);
  el('rect', { x: 38, y: 38, width: 1844, height: 1004, fill: 'none', stroke: GOLD, 'stroke-width': 1.5 }, gBorder);
  // 四角回纹小方块
  const meander = (x, y, flip) => {
    const d = 'M0 0 h44 v44 h-32 v-32 h20 v20 h-8';
    return el('path', { d, fill: 'none', stroke: BACK, 'stroke-width': 5, transform: `translate(${x} ${y})${flip ? ' scale(1 -1)' : ''}` }, gBorder);
  };
  meander(60, 60, false); meander(1836, 60, true);
  el('path', { d: 'M60 1020 h44 v-44 h-32 v32 h20 v-20 h-8', fill: 'none', stroke: BACK, 'stroke-width': 5 }, gBorder);
  el('path', { d: 'M1864 1020 h-44 v-44 h32 v32 h-20 v-20 h8', fill: 'none', stroke: BACK, 'stroke-width': 5 }, gBorder);
  // 冰裂纹（侧边细裂线）
  [[120, 200, 90, 330], [1800, 250, 1830, 400], [300, 1050, 420, 1000]].forEach(([x1, y1, x2, y2]) =>
    el('path', { d: `M${x1} ${y1} L${x2} ${y2} M${(x1 + x2) / 2} ${(y1 + y2) / 2} l30 -24`, fill: 'none', stroke: BACK, 'stroke-width': 2 }, gBorder));

  // ---------- 祥云涡卷 ----------
  const gCloud = el('g', {}, world);
  const cloudD = 'M0 20 q0 -22 26 -22 q6 -20 30 -16 q20 -14 34 4 q26 -4 24 18 q14 6 2 16 Z';
  el('path', { d: cloudD, fill: BACK, opacity: 0.8, transform: 'translate(300 300) scale(1.1)' }, gCloud);
  el('path', { d: cloudD, fill: BACK, opacity: 0.6, transform: 'translate(1560 250) scale(0.9) scale(-1 1) translate(-760 0)' }, gCloud);

  // ---------- 神龛（后层） ----------
  const gShrine = el('g', {}, world);
  el('path', { d: 'M980 300 Q1275 130 1570 300 L1520 300 Q1275 195 1030 300 Z', fill: BACK }, gShrine);   // 龛顶
  el('rect', { x: 1060, y: 300, width: 24, height: 400, fill: BACK }, gShrine);                                     // 左柱
  el('rect', { x: 1466, y: 300, width: 24, height: 400, fill: BACK }, gShrine);                                     // 右柱
  el('rect', { x: 1030, y: 700, width: 490, height: 22, fill: BACK }, gShrine);                                    // 供台
  // 菩萨背光（莲瓣镂空）
  const halo = el('ellipse', { cx: 1275, cy: 430, rx: 145, ry: 190, fill: BACK }, gShrine);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * P - Math.PI / 2;
    el('ellipse', { cx: 1275 + Math.cos(a) * 95, cy: 430 + Math.sin(a) * 128, rx: 20, ry: 12, fill: CREAM, transform: `rotate(${(a * 180) / Math.PI} ${1275 + Math.cos(a) * 95} ${430 + Math.sin(a) * 128})` }, gShrine);
  }
  // 菩萨剪影
  el('circle', { cx: 1275, cy: 380, r: 46, fill: INK }, gShrine);
  el('ellipse', { cx: 1275, cy: 328, rx: 12, ry: 18, fill: INK }, gShrine);  // 肉髻
  el('path', { d: 'M1218 425 Q1202 555 1185 660 L1365 660 Q1348 555 1332 425 Z', fill: INK }, gShrine);  // 衣身
  // 垂目（镂空负形）
  el('path', { d: 'M1248 378 q8 6 16 0', fill: 'none', stroke: CREAM, 'stroke-width': 4 }, gShrine);
  el('path', { d: 'M1288 378 q8 6 16 0', fill: 'none', stroke: CREAM, 'stroke-width': 4 }, gShrine);
  // 莲座
  for (let i = -2; i <= 2; i++) {
    el('ellipse', { cx: 1275 + i * 42, cy: 668, rx: 30, ry: 12, fill: BACK, transform: `rotate(${i * 8} ${1275 + i * 42} 668)` }, gShrine);
  }
  // 菩萨工牌（R3 晃入）
  const gBadge = el('g', { opacity: 0 }, gShrine);
  el('line', { x1: 1275, y1: 430, x2: 1275, y2: 470, stroke: GOLD, 'stroke-width': 3 }, gBadge);
  el('rect', { x: 1235, y: 470, width: 80, height: 100, fill: FRONT, stroke: GOLD, 'stroke-width': 2 }, gBadge);
  el('circle', { cx: 1275, cy: 498, r: 15, fill: CREAM }, gBadge);   // 镂空照片位
  el('text', { x: 1275, y: 545, 'text-anchor': 'middle', 'font-family': 'Kai', 'font-size': 20, fill: CREAM }, gBadge);
  txt(gBadge.querySelector('text'), '工号0001');

  // ---------- 青烟（三足香炉上，实色 path 逐帧旋转上升） ----------
  const gSmoke = el('g', {}, world);
  const smokePaths = [];
  for (let i = 0; i < 4; i++) {
    const sp = el('path', { d: 'M0 0 q14 -22 -4 -48 q-22 -24 6 -52 q26 -24 -6 -56 q-28 -26 4 -60 q28 -26 -8 -64', fill: 'none', stroke: BACK, 'stroke-width': 13, 'stroke-linecap': 'round', transform: `translate(${1000 + (i - 1) * 16} 878)` }, gSmoke);
    smokePaths.push(sp);
  }

  // ---------- 前景桌案 + 香炉 + 苦茶 ----------
  const gTable = el('g', {}, world);
  el('rect', { x: 0, y: 950, width: W, height: 130, fill: FRONT }, gTable);
  el('rect', { x: 0, y: 950, width: W, height: 4, fill: GOLD }, gTable);
  // 三足香炉
  const gBurner = el('g', { transform: 'translate(440 0)' }, gTable);
  el('path', { d: 'M510 905 Q510 878 560 878 Q610 878 610 905 L598 935 L522 935 Z', fill: INK }, gBurner);
  el('line', { x1: 528, y1: 935, x2: 522, y2: 950, stroke: INK, 'stroke-width': 8 }, gBurner);
  el('line', { x1: 592, y1: 935, x2: 598, y2: 950, stroke: INK, 'stroke-width': 8 }, gBurner);
  el('line', { x1: 560, y1: 935, x2: 560, y2: 950, stroke: INK, 'stroke-width': 8 }, gBurner);
  el('rect', { x: 522, y: 890, width: 76, height: 5, fill: GOLD }, gBurner);
  // 苦茶碗（石绿，R3 抖）
  const gCup = el('g', {}, gTable);
  el('path', { d: 'M1520 905 Q1520 928 1560 928 Q1600 928 1600 905 Z', fill: GREEN }, gCup);
  el('ellipse', { cx: 1560, cy: 905, rx: 40, ry: 9, fill: GREEN }, gCup);
  el('ellipse', { cx: 1560, cy: 904, rx: 32, ry: 6, fill: INK }, gCup);  // 苦茶=咖啡

  // ---------- 签文签（竖排毛笔 + 底部朱砂印） ----------
  function vBrush(parent, x, yTop, str, size, fill, anchor) {
    const t = el('text', { x, y: yTop, 'text-anchor': anchor || 'middle', 'font-family': 'ZhiMang', 'font-size': size, fill }, parent);
    [...str].forEach((ch, i) => {
      const ts = el('tspan', { x, dy: i === 0 ? 0 : size * 1.15 }, t);
      ts.textContent = ch;
    });
    return t;
  }
  function makeStick(parent, w, h, fill) {
    const g = el('g', {}, parent);
    el('path', { d: `M${-w / 2} ${-h / 2 + 30} Q${-w / 2} ${-h / 2} 0 ${-h / 2} Q${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + 30} L${w / 2} ${h / 2} L${-w / 2} ${h / 2} Z`, fill, stroke: GOLD, 'stroke-width': 2 }, g);
    return g;
  }
  function makeSeal(parent, cx, cy, s, text) {
    const g = el('g', {}, parent);
    el('rect', { x: cx - s / 2, y: cy - s / 2, width: s, height: s, fill: RED }, g);
    const t = vBrush(g, cx, cy - s / 2 + s * 0.22, text, s * 0.3, HL);
    return g;
  }

  // R1 签：上上签
  const gStick1 = el('g', {}, world);
  makeStick(gStick1, 96, 320, DARK);
  vBrush(gStick1, 0, -110, '上上签', 64, INK);
  makeSeal(gStick1, 0, 110, 56, '吉');

  // R2 签：工号0001·试用99年
  const gStick2 = el('g', {}, world);
  makeStick(gStick2, 110, 380, DARK);
  vBrush(gStick2, 0, -150, '工号0001', 44, INK);
  vBrush(gStick2, 0, 10, '试用99年', 40, RED);
  makeSeal(gStick2, 0, 150, 56, '雇');

  // 漫天飞签（R3）
  const gFly = el('g', {}, world);
  const flyLabels = ['功德+1', 'OKR', '出勤100%', '绩效S', '带薪假', '反馈+1'];
  const flyCards = flyLabels.map((lab, i) => {
    const cg = el('g', { opacity: 0 }, gFly);
    el('rect', { x: -34, y: -95, width: 68, height: 190, fill: DARK, stroke: GOLD, 'stroke-width': 2 }, cg);
    const t = el('text', { x: 0, y: -20, 'text-anchor': 'middle', 'font-family': i < 2 ? 'UIFont' : 'Kai', 'font-size': lab.length > 4 ? 26 : 34, fill: INK }, cg);
    txt(t, lab);
    el('rect', { x: -16, y: 60, width: 32, height: 32, fill: RED }, cg);
    return cg;
  });

  // ---------- 主皮影人（侧面剪影，关节圆点） ----------
  const gPuppet = el('g', {}, world);
  const gLegs = el('g', {}, gPuppet);
  el('path', { d: 'M-120 25 L-120 -8 Q-70 -26 -10 -18 L80 -12 Q115 -6 115 8 L115 28 L-120 28 Z', fill: INK }, gLegs);
  // gTorso：绕髋部
  const gTorso = el('g', {}, gPuppet);
  el('path', { d: 'M-32 -8 Q-40 -95 -24 -152 L24 -152 Q40 -95 32 -8 Z', fill: INK }, gTorso);
  // 关节圆点（镂空负形）
  el('circle', { cx: 0, cy: 0, r: 8, fill: CREAM }, gTorso);           // 髋
  const gHead = el('g', { transform: 'translate(0 -178)' }, gTorso);
  el('circle', { cx: 0, cy: -20, r: 38, fill: INK }, gHead);          // 头（加大，留出脖颈缝）
  el('rect', { x: -8, y: -72, width: 16, height: 20, fill: INK }, gHead);  // 发髻
  el('circle', { cx: 17, cy: -24, r: 5.5, fill: CREAM }, gHead);      // 圆点眼
  // 手臂（近侧）
  const gArm1 = el('g', { transform: 'translate(22 -138)' }, gTorso);
  el('circle', { cx: 0, cy: 0, r: 7, fill: CREAM }, gArm1);            // 肩
  el('path', { d: 'M0 0 L8 72', stroke: INK, 'stroke-width': 16, 'stroke-linecap': 'round' }, gArm1);
  const gFore1 = el('g', { transform: 'translate(8 72)' }, gArm1);
  el('circle', { cx: 0, cy: 0, r: 6, fill: CREAM }, gFore1);           // 肘
  el('path', { d: 'M0 0 L6 62', stroke: INK, 'stroke-width': 13, 'stroke-linecap': 'round' }, gFore1);
  // 手臂（远侧，略浅后层色）
  const gArm2 = el('g', { transform: 'translate(-18 -134)' }, gTorso);
  el('path', { d: 'M0 0 L-8 70', stroke: BACK, 'stroke-width': 14, 'stroke-linecap': 'round' }, gArm2);
  const gFore2 = el('g', { transform: 'translate(-8 70)' }, gArm2);
  el('path', { d: 'M0 0 L-6 60', stroke: BACK, 'stroke-width': 12, 'stroke-linecap': 'round' }, gFore2);

  // ---------- 斜口签筒（内插满签，每根独立抖） ----------
  const gTube = el('g', {}, world);
  const tubeSticks = [];
  for (let i = 0; i < 11; i++) {
    const sx = (i - 5) * 7;
    const st = el('rect', { x: sx - 3, y: -150 - h(i * 3.3) * 40, width: 6, height: 190, fill: DARK, stroke: GOLD, 'stroke-width': 1 }, gTube);
    tubeSticks.push(st);
  }
  el('path', { d: 'M-52 -40 L-40 190 L40 190 L52 -40 Z', fill: FRONT, stroke: GOLD, 'stroke-width': 2 }, gTube);  // 斜口筒身
  el('ellipse', { cx: 0, cy: -40, rx: 52, ry: 12, fill: DARK, stroke: GOLD, 'stroke-width': 2 }, gTube);

  // ---------- 提线（R4 从签筒探出；以及小人背后的线） ----------
  const gString = el('g', {}, world);
  const tubeString = el('path', { d: 'M0 0 L0 0', fill: 'none', stroke: INK, 'stroke-width': 2.5 }, gString);
  const hookStick = el('g', { opacity: 0 }, gString);
  el('rect', { x: -12, y: -100, width: 24, height: 200, fill: DARK, stroke: GOLD, 'stroke-width': 2 }, hookStick);
  el('circle', { cx: 0, cy: -112, r: 7, fill: RED }, hookStick);
  // 小人背后三根线（20s 后发现）
  const backStrings = [];
  for (let i = 0; i < 3; i++) {
    const ln = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: INK, 'stroke-width': 2, opacity: 0 }, gString);
    backStrings.push(ln);
  }

  // ---------- 一排挂工牌皮影（反转） ----------
  const gRow = el('g', {}, world);
  const rowPuppets = [];
  for (let i = 0; i < 5; i++) {
    const cg = el('g', {}, gRow);
    el('line', { x1: 0, y1: -260, x2: 0, y2: -190, stroke: INK, 'stroke-width': 2 }, cg);
    el('circle', { cx: 0, cy: -168, r: 26, fill: INK }, cg);                       // 头
    el('path', { d: 'M-26 -140 Q-34 -80 -20 -30 L20 -30 Q34 -80 26 -140 Z', fill: INK }, cg);  // 身
    el('rect', { x: -18, y: -110, width: 36, height: 46, fill: FRONT, stroke: GOLD, 'stroke-width': 1.5 }, cg);  // 工牌
    el('circle', { cx: 0, cy: -98, r: 8, fill: CREAM }, cg);
    rowPuppets.push(cg);
  }

  // ---------- 反转大签：已归档 ----------
  const gFinal = el('g', {}, world);
  makeStick(gFinal, 150, 520, DARK);
  vBrush(gFinal, 0, -170, '已归档', 84, INK);
  makeSeal(gFinal, 0, 200, 110, '档');
  const sealRing = el('circle', { cx: 0, cy: 200, r: 60, fill: 'none', stroke: RED, 'stroke-width': 8, opacity: 0 }, gFinal);

  // ---------- 署名 ----------
  const gSign = el('g', { opacity: 0 }, world);
  el('text', { x: CX, y: 1045, 'text-anchor': 'middle', 'font-family': 'Kai', 'font-size': 44, fill: HL }, gSign);
  txt(gSign.querySelector('text'), '由 Doubao 在30秒内用纯代码制作完成');

  // ---------- 幕布（左右两片厚布） ----------
  const gCurtainL = el('g', {}, stage);
  el('rect', { x: -1920, y: 0, width: 1920, height: H, fill: FRONT }, gCurtainL);
  for (let i = 0; i < 6; i++) el('rect', { x: -1880 + i * 300, y: 0, width: 60, height: H, fill: '#3a2a20' }, gCurtainL);
  el('rect', { x: -4, y: 0, width: 8, height: H, fill: GOLD }, gCurtainL);  // 内缘金边
  const gCurtainR = el('g', {}, stage);
  el('rect', { x: 1920, y: 0, width: 1920, height: H, fill: FRONT }, gCurtainR);
  for (let i = 0; i < 6; i++) el('rect', { x: 1920 + i * 300, y: 0, width: 60, height: H, fill: '#3a2a20' }, gCurtainR);
  el('rect', { x: 1916, y: 0, width: 8, height: H, fill: GOLD }, gCurtainR);

  // ---------- 提线末端小箭头光标（结尾彩蛋） ----------
  const gCursor = el('g', {}, world);
  el('path', { d: 'M0 0 L0 34 L9 25 L16 40 L21 37 L14 22 L26 22 Z', fill: INK, stroke: HL, 'stroke-width': 2 }, gCursor);
  // 署名与箭头光标压在幕布之上（幕合后仍可见）
  stage.appendChild(gSign);
  stage.appendChild(gCursor);

  // ---------- 屏幕顶层：布纹 / 黑场 ----------
  const paper = el('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#grain)' }, stage);
  const blackfield = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#000000' }, stage);

  // ============================ 主渲染 ============================
  function render(t0) {
    const frame = Math.floor(t0 * T.fps + 0.5);

    // ---- 幕布开合进度 p: 0=合拢(遮屏) 1=拉开 ----
    const openP = t0 < 0.15 ? 0 : smooth(0.15, T.curtainWhoosh, t0);
    const closeP = t0 >= T.curtainCloseStart ? smooth(T.curtainCloseStart, T.curtainCloseEnd, t0) : 0;
    const curtainP = clamp(openP - closeP, 0, 1);   // 1=全开，0=全合
    gCurtainL.setAttribute('transform', `translate(${960 - curtainP * 960} 0)`);
    gCurtainR.setAttribute('transform', `translate(${-960 + curtainP * 960} 0)`);

    // ---- 黑场：仅前 0.1s ----
    blackfield.setAttribute('opacity', clamp(1 - smooth(0, 0.1, t0), 0, 1));

    // ---- 青烟：每帧旋转 2° 并上升 ----
    gSmoke.setAttribute('opacity', smooth(0.55, 1.15, t0));
    smokePaths.forEach((sp, i) => {
      const rise = (frame * 10 + i * 90) % 340;
      const sx = 1000 + (i - 1.5) * 20;
      sp.setAttribute('transform', `translate(${sx} ${880 - rise * 0.45}) rotate(${Math.sin(frame * 0.06 + i) * 16})`);
      sp.setAttribute('opacity', 0.7 + 0.25 * Math.sin(frame * 0.15 + i));
    });

    // ---- 主皮影人 ----
    const walking = t0 < T.walkInEnd;
    const walkP = smooth(0.8, T.walkInEnd, t0);
    const baseX = lerp(-260, 780, walkP);
    const kneelP = smooth(T.kneelStart, T.kneelEnd, t0);
    // 反转：被吊起
    const liftP = t0 >= T.puppetLift ? smooth(T.puppetLift, T.puppetLift + 1.2, t0) : 0;
    const py = lerp(880, 430, liftP);
    const px = lerp(baseX, 1450, liftP);

    // 摇签摆动
    let shakeAmp = 0;
    if (t0 >= T.shake1Start && t0 < T.shake1End) shakeAmp = 6;
    if (t0 >= T.shake2Start && t0 < T.shake2End) shakeAmp = 8;
    if (t0 >= T.shake3Start && t0 < T.shake3End) shakeAmp = 13;
    const shakeSwing = shakeAmp ? Math.sin(frame * 0.9) * shakeAmp : 0;

    // 作揖
    const bowP = t0 >= T.bowStart ? smooth(T.bowStart, T.bowEnd, t0) : 0;
    // 愣住
    const frozen = t0 >= T.puppetFreeze && t0 < T.lookUp;

    // 关节微动（每帧 ±2.5° 正弦，保证内容区活帧）
    const sway1 = 2.5 * Math.sin(frame * 0.23);
    const sway2 = 3.0 * Math.sin(frame * 0.31 + 2);
    let torsoRot = bowP * 24 + sway1 * (frozen ? 0.3 : 1);
    if (shakeAmp) torsoRot += shakeSwing * 0.4;
    gTorso.setAttribute('transform', `translate(0 ${kneelP * 12}) rotate(${torsoRot} 0 0)`);
    gHead.setAttribute('transform', `translate(0 ${-158 - kneelP * 12}) rotate(${-bowP * 10 + sway2})`);
    // 手臂抱筒
    const armAng = shakeAmp ? shakeSwing * 0.8 : bowP * -18;
    gArm1.setAttribute('transform', `translate(22 -138) rotate(${armAng})`);
    gFore1.setAttribute('transform', `translate(8 72) rotate(${-10 + shakeSwing * 0.5})`);

    gPuppet.setAttribute('transform', `translate(${px} ${py})`);

    // ---- 签筒：随人、随摇 ----
    const tubeHoldX = px + 55, tubeHoldY = py - 150;
    let tubeFallRot = 0, tubeTX = tubeHoldX, tubeTY = tubeHoldY;
    if (t0 >= T.tubeFall) {
      tubeTX = 700; tubeTY = 880;
      tubeFallRot = -80 * smooth(T.tubeFall, T.tubeFall + 0.4, t0);
    }
    gTube.setAttribute('transform', `translate(${tubeTX} ${tubeTY}) rotate(${shakeSwing + tubeFallRot})`);
    // 每根签独立 ±2px 抖
    tubeSticks.forEach((st, i) => {
      st.setAttribute('y', -150 - h(i * 3.3) * 40 + (h(frame * 1.3 + i * 7.7) - 0.5) * (shakeAmp ? 8 : 5));
    });

    // ---- R1 签 ----
    const s1p = t0 >= T.stick1Drop ? smooth(T.stick1Drop, T.stick1Drop + 0.25, t0) : 0;
    show(gStick1, t0 >= T.stick1Drop && t0 < T.stick2Out);
    gStick1.setAttribute('opacity', 1);
    gStick1.setAttribute('transform', `translate(560 700) scale(${backOut(s1p)}) rotate(${s1p < 1 ? -8 * (1 - s1p) : 0})`);

    // ---- R2 签 ----
    const s2p = t0 >= T.stick2Out ? smooth(T.stick2Out, T.stick2Out + 0.3, t0) : 0;
    show(gStick2, t0 >= T.stick2Out && t0 < T.eruptStart);
    gStick2.setAttribute('transform', `translate(560 660) scale(${backOut(s2p)})`);
    // 笑容凝固：R2 签抖一下
    if (t0 >= T.freezeFace && t0 < T.eruptStart) {
      gStick2.setAttribute('transform', `translate(${560 + (h(frame * 1.1) - 0.5) * 6} 660) scale(${backOut(s2p)})`);
    }

    // ---- R3 漫天飞签 ----
    show(gFly, t0 >= T.eruptStart && t0 < T.r3End);
    flyCards.forEach((cg, i) => {
      const p = (t0 - T.eruptStart - i * 0.21) / 0.9;
      if (p >= 0 && p <= 1) {
        const dx = (i - 2.5) * 130;
        const yy = easeOutCubic(p) * -420;
        cg.setAttribute('opacity', 1 - smooth(0.7, 1, p));
        cg.setAttribute('transform', `translate(${760 + dx + Math.sin(frame * 0.4 + i) * 8} ${620 + yy}) rotate(${(i % 2 ? 1 : -1) * 20 * (1 - p)})`);
      } else cg.setAttribute('opacity', 0);
    });

    // 菩萨工牌晃出
    const bp = smooth(T.badgeReveal, T.badgeReveal + 0.4, t0);
    gBadge.setAttribute('opacity', bp);
    if (bp > 0) gBadge.setAttribute('transform', `rotate(${Math.sin(frame * 0.3) * 5} 1275 430)`);

    // 苦茶碗抖
    if (t0 >= T.cupTrembleStart && t0 < T.r3End) {
      gCup.setAttribute('transform', `translate(${(h(frame * 1.7) - 0.5) * 8} 0)`);
    } else gCup.setAttribute('transform', '');

    // ---- R4 提线 ----
    const sp = t0 >= T.stringOut ? smooth(T.stringOut, T.stringHook, t0) : 0;
    if (t0 >= T.stringOut && t0 < T.puppetFreeze) {
      show(gString, true);
      // 线从签筒口向右探
      tubeString.setAttribute('d', `M${tubeHoldX} ${tubeHoldY - 40} Q${tubeHoldX + 120 * sp} ${tubeHoldY - 160 * sp} ${tubeHoldX + 260 * sp} ${tubeHoldY - 60 * sp}`);
      show(hookStick, t0 >= T.stringHook - 0.1);
      hookStick.setAttribute('transform', `translate(${tubeHoldX + 260 * sp} ${tubeHoldY - 60 * sp - 60})`);
      hookStick.setAttribute('opacity', clamp(sp * 2, 0, 1));
    } else {
      show(gString, t0 >= T.discover && t0 < T.rowReveal);
      // 发现自己背后的线
      backStrings.forEach((ln, i) => {
        const dx = px + (i - 1) * 26;
        ln.setAttribute('x1', dx); ln.setAttribute('y1', py - 160);
        ln.setAttribute('x2', dx + Math.sin(frame * 0.2 + i) * 6); ln.setAttribute('y2', py - 420);
        ln.setAttribute('opacity', smooth(T.discover, T.discover + 0.5, t0));
      });
    }

    // ---- 反转：一排皮影 ----
    show(gRow, t0 >= T.rowReveal && t0 < T.closeup);
    rowPuppets.forEach((cg, i) => {
      const rx = 420 + i * 260;
      cg.setAttribute('transform', `translate(${rx} ${380 + Math.sin(frame * 0.18 + i) * 6})`);
    });

    // ---- 反转大签（已归档） ----
    const fp = t0 >= T.rollOut ? smooth(T.rollOut, T.rollOut + 0.4, t0) : 0;
    show(gFinal, t0 >= T.rollOut);
    const closeZoom = t0 >= T.closeup ? 1 + 0.55 * smooth(T.closeup, T.closeup + 0.8, t0) : 1;
    gFinal.setAttribute('transform', `translate(${760} ${620}) scale(${backOut(fp) * closeZoom})`);
    // 盖章 1–2 帧径向晕后回实色
    const stampDt = t0 - T.bigStamp;
    sealRing.setAttribute('opacity', stampDt >= 0 && stampDt < 0.08 ? 0.9 : 0);
    sealRing.setAttribute('r', Math.max(0, 60 + stampDt * 500));

    // ---- 署名 ----
    gSign.setAttribute('opacity', smooth(T.signIn, T.signIn + 0.5, t0));

    // ---- 结尾箭头光标（从幕缝垂下，微晃） ----
    show(gCursor, t0 >= T.cursorDrop);
    if (t0 >= T.cursorDrop) {
      const cp = smooth(T.cursorDrop, T.cursorDrop + 0.4, t0);
      gCursor.setAttribute('transform', `translate(${CX} ${lerp(-40, 600, cp)}) rotate(${Math.sin(frame * 0.22) * 12})`);
    }
  }

  window.render = render;
  render(0);
})();
