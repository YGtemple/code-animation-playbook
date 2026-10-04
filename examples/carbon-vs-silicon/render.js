// render.js ——《碳基的尊严》纯函数 render(t) 驱动全片。所有元素加载时建好一次，render 只改属性/切显示。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const { T } = window;

  // ---------- 皮肤 token（冻结，与第一部一致） ----------
  const PAPER = '#efe2c2', CARD = '#f5ebd2', INK = '#1b1410', RED = '#d7261e', DARK = '#100c09';

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

  // 线条沸腾滤镜（feTurbulence + feDisplacementMap），seed 每帧换
  const BOIL_SCALE = [24, 28, 34];
  [1, 2, 3].forEach(i => {
    const f = el('filter', { id: 'boil' + i, x: '-25%', y: '-25%', width: '150%', height: '150%' }, defs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.012 0.018', numOctaves: '2', seed: i * 7, result: 'n' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: BOIL_SCALE[i - 1], xChannelSelector: 'R', yChannelSelector: 'G' }, f);
  });
  // 纸纹滤镜
  const grainF = el('filter', { id: 'grain', x: '0', y: '0', width: '100%', height: '100%' }, defs);
  const grainT = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '3', stitchTiles: 'stitch' }, grainF);
  el('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0.10  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.55 0' }, grainF);

  // ---------- 道具图标 symbol（100×100，简笔粗描边） ----------
  const ICONS = {
    keyboard: '<rect x="10" y="32" width="80" height="42" rx="6" fill="none" stroke="#1b1410" stroke-width="8"/><line x1="22" y1="47" x2="78" y2="47" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><line x1="22" y1="61" x2="78" y2="61" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><rect x="34" y="72" width="32" height="6" rx="3" fill="#1b1410"/>',
    ppt: '<path d="M22 18 L74 12 L82 22 L30 28 Z" fill="#f5ebd2" stroke="#1b1410" stroke-width="6" stroke-linejoin="round"/><path d="M28 34 L80 28 L86 38 L34 44 Z" fill="#f5ebd2" stroke="#1b1410" stroke-width="6" stroke-linejoin="round"/><path d="M34 50 L86 44 L90 56 L38 62 Z" fill="#d7261e" stroke="#1b1410" stroke-width="6" stroke-linejoin="round"/>',
    report: '<rect x="26" y="12" width="48" height="76" rx="4" fill="#f5ebd2" stroke="#1b1410" stroke-width="7"/><rect x="36" y="66" width="8" height="14" fill="#d7261e"/><rect x="50" y="56" width="8" height="24" fill="#1b1410"/><rect x="64" y="44" width="8" height="36" fill="#d7261e"/>',
    calculator: '<rect x="28" y="14" width="44" height="72" rx="6" fill="#1b1410"/><rect x="36" y="22" width="28" height="14" fill="#f5ebd2"/><circle cx="40" cy="49" r="4" fill="#d7261e"/><circle cx="55" cy="49" r="4" fill="#f5ebd2"/><circle cx="40" cy="63" r="4" fill="#f5ebd2"/><circle cx="55" cy="63" r="4" fill="#f5ebd2"/><rect x="36" y="74" width="28" height="6" rx="3" fill="#d7261e"/>',
    coffee: '<path d="M28 30 L34 82 Q34 88 40 88 L62 88 Q68 88 68 82 L74 30 Z" fill="#f5ebd2" stroke="#1b1410" stroke-width="8" stroke-linejoin="round"/><path d="M74 38 Q88 40 86 52 Q84 62 72 60" fill="none" stroke="#1b1410" stroke-width="7"/><path d="M42 18 q4 -8 0 -14 M56 18 q4 -8 0 -14" fill="none" stroke="#d7261e" stroke-width="6" stroke-linecap="round"/>',
    drink: '<rect x="34" y="16" width="32" height="72" rx="6" fill="#d7261e" stroke="#1b1410" stroke-width="7"/><rect x="34" y="36" width="32" height="10" fill="#f5ebd2"/><rect x="38" y="10" width="24" height="8" rx="2" fill="#1b1410"/>',
    bill: '<path d="M30 12 L70 12 L70 80 L64 86 L58 80 L52 86 L46 80 L40 86 L30 80 Z" fill="#f5ebd2" stroke="#1b1410" stroke-width="7" stroke-linejoin="round"/><line x1="38" y1="30" x2="62" y2="30" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><line x1="38" y1="44" x2="62" y2="44" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><line x1="38" y1="58" x2="54" y2="58" stroke="#d7261e" stroke-width="5" stroke-linecap="round"/>',
    plug: '<rect x="30" y="20" width="24" height="26" rx="4" fill="#1b1410"/><line x1="36" y1="8" x2="36" y2="20" stroke="#1b1410" stroke-width="7" stroke-linecap="round"/><line x1="48" y1="8" x2="48" y2="20" stroke="#1b1410" stroke-width="7" stroke-linecap="round"/><path d="M42 46 Q42 66 60 70" fill="none" stroke="#1b1410" stroke-width="7" stroke-linecap="round"/>',
    badge: '<rect x="22" y="22" width="56" height="60" rx="8" fill="#f5ebd2" stroke="#1b1410" stroke-width="7"/><rect x="34" y="34" width="32" height="18" fill="#d7261e"/><line x1="34" y1="64" x2="66" y2="64" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><rect x="44" y="10" width="12" height="14" fill="#1b1410"/>',
    clock24: '<circle cx="50" cy="50" r="34" fill="#f5ebd2" stroke="#1b1410" stroke-width="8"/><path d="M50 32 L50 50 L64 58" fill="none" stroke="#1b1410" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  for (const k of Object.keys(ICONS)) {
    const s = el('symbol', { id: 'icon-' + k, viewBox: '0 0 100 100' }, defs);
    s.innerHTML = ICONS[k];
  }

  // ---------- 硬投影 ----------
  function hardShadow(parent, d, dx, dy, fill) {
    const s = el('path', { d, fill: fill || INK }, parent);
    s.setAttribute('transform', `translate(${dx} ${dy})`);
    return s;
  }

  // ============================ 世界根 ============================
  const world = el('g', { id: 'world' }, stage);
  const bg = el('rect', { x: -240, y: -240, width: W + 480, height: H + 480, fill: PAPER }, world);

  // ---------- 贯穿擂台/回合的深色地面（提情绪浓度 + 衬托角色） ----------
  const gFloor = el('g', {}, world);
  el('ellipse', { cx: CX, cy: 950, rx: 920, ry: 72, fill: INK, opacity: 0.92 }, gFloor);
  el('ellipse', { cx: CX, cy: 946, rx: 920, ry: 66, fill: 'none', stroke: RED, 'stroke-width': 6, opacity: 0.7 }, gFloor);

  // ---------- 角色绘制（一次性，pose 决定手臂） ----------
  function drawWorker(parent, cx, cy, sc, pose) {
    const g = el('g', { transform: `translate(${cx} ${cy}) scale(${sc})` }, parent);
    el('circle', { cx: 0, cy: -150, r: 44, fill: CARD, stroke: INK, 'stroke-width': 9 }, g);
    el('ellipse', { cx: -15, cy: -140, rx: 10, ry: 6, fill: INK }, g);
    el('ellipse', { cx: 15, cy: -140, rx: 10, ry: 6, fill: INK }, g);
    el('path', { d: 'M-14 -118 Q0 -124 14 -118', fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M0 -106 L0 40', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M0 40 L-32 108 M0 40 L32 108', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    if (pose === 'fist') {
      el('path', { d: 'M0 -86 L-44 -112 M0 -86 L40 -60', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
      el('circle', { cx: 45, cy: -58, r: 13, fill: RED, stroke: INK, 'stroke-width': 6 }, g);
    } else if (pose === 'type') {
      el('path', { d: 'M0 -86 L-40 -46 M0 -86 L40 -46', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
    } else if (pose === 'calc') {
      el('path', { d: 'M0 -86 L-36 -50 M0 -86 L30 -72', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
    } else if (pose === 'slump') {
      el('path', { d: 'M0 -86 L-34 -44 M0 -86 L36 -48', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
    } else if (pose === 'bills') {
      el('path', { d: 'M0 -86 L-48 -66 M0 -86 L48 -66', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
    } else if (pose === 'kneel') {
      el('path', { d: 'M0 -86 L-32 -54 M0 -86 L32 -54', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M0 40 L-44 96 L-12 108 M0 40 L30 96', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    }
    el('rect', { x: -36, y: -80, width: 72, height: 32, rx: 6, fill: PAPER, stroke: INK, 'stroke-width': 6 }, g);
    const bt = el('text', { x: 0, y: -57, 'text-anchor': 'middle', 'font-family': 'MarkerF', 'font-size': 17, fill: INK }, g);
    txt(bt, '碳基#001');
    return g;
  }
  function drawRobot(parent, cx, cy, sc, pose) {
    const g = el('g', { transform: `translate(${cx} ${cy}) scale(${sc})` }, parent);
    el('rect', { x: -56, y: -212, width: 112, height: 96, rx: 14, fill: INK }, g);
    el('rect', { x: -34, y: -184, width: 22, height: 16, rx: 3, fill: RED }, g);
    el('rect', { x: 12, y: -184, width: 22, height: 16, rx: 3, fill: RED }, g);
    el('line', { x1: 0, y1: -212, x2: 0, y2: -236, stroke: INK, 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
    el('circle', { cx: 0, cy: -240, r: 8, fill: RED }, g);
    el('rect', { x: -64, y: -110, width: 128, height: 122, rx: 12, fill: CARD, stroke: INK, 'stroke-width': 9 }, g);
    el('rect', { x: -24, y: -82, width: 48, height: 40, rx: 4, fill: INK }, g);
    el('path', { d: 'M-64 -92 L-98 -60 M64 -92 L98 -60', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M-24 12 L-24 62 M24 12 L24 62', stroke: INK, 'stroke-width': 11, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M0 62 Q0 86 -26 94', fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    return g;
  }

  // ---------- 大文字工具 ----------
  function bigText(parent, x, y, size, font, fill, anchor, sw, sfill) {
    const t = el('text', { x, y, 'text-anchor': anchor || 'middle', 'font-family': font, 'font-size': size, fill, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, parent);
    if (sw) { t.setAttribute('stroke', sfill || CARD); t.setAttribute('stroke-width', sw); }
    return t;
  }

  // ============================ 开场对峙 gRing ============================
  const gRing = el('g', {}, world);
  drawWorker(gRing, 540, 800, 1.0, 'fist');
  drawRobot(gRing, 1380, 800, 1.0, 'fist');
  // 插头（机器人插电源）
  el('use', { href: '#icon-plug', x: 1560, y: 820, width: 90, height: 90 }, gRing);
  // 主标题
  const ringTitle = bigText(gRing, CX, 1000, 150, 'ZCOOL', INK, 'middle', 10, CARD);
  txt(ringTitle, '人类，不可替代？');

  // ============================ 回合横幅 gBanner ============================
  const gBanner = el('g', {}, world);
  el('rect', { x: 150, y: 78, width: 1620, height: 118, rx: 22, fill: INK }, gBanner);
  el('rect', { x: 150, y: 78, width: 1620, height: 12, fill: RED }, gBanner);
  el('rect', { x: 150, y: 184, width: 1620, height: 12, fill: RED }, gBanner);
  const bannerText = bigText(gBanner, CX, 162, 86, 'ZCOOL', CARD, 'middle', 6, RED);

  // ---------- 通用印章（红底白字，backOut 砸入） ----------
  function makeStamp(parent, cx, cy, w, h, lines, size) {
    const g = el('g', {}, parent);
    const d = `M${cx - w / 2} ${cy - h / 2} Q${cx - w / 2} ${cy - h / 2 - 14} ${cx - w / 2 + 22} ${cy - h / 2} L${cx + w / 2 - 22} ${cy - h / 2} Q${cx + w / 2} ${cy - h / 2 - 14} ${cx + w / 2} ${cy - h / 2} L${cx + w / 2} ${cy + h / 2 - 20} Q${cx + w / 2} ${cy + h / 2} ${cx + w / 2 - 22} ${cy + h / 2} L${cx - w / 2 + 22} ${cy + h / 2} Q${cx - w / 2} ${cy + h / 2} ${cx - w / 2} ${cy + h / 2 - 20} Z`;
    hardShadow(g, d, 12, 14);
    el('path', { d, fill: RED, stroke: INK, 'stroke-width': 8 }, g);
    lines.forEach((ln, i) => {
      const t = bigText(g, cx, cy + (i - (lines.length - 1) / 2) * (size + 10) + size * 0.36, size, 'ZCOOL', CARD, 'middle');
      txt(t, ln);
    });
    return g;
  }

  // ============================ R1 比做PPT ============================
  const gR1 = el('g', {}, world);
  drawWorker(gR1, 520, 800, 0.95, 'type');
  el('use', { href: '#icon-keyboard', x: 430, y: 860, width: 150, height: 150 }, gR1);
  // 汗滴
  const sweat1 = el('g', {}, gR1);
  for (let i = 0; i < 3; i++) el('ellipse', { cx: 0, cy: 0, rx: 8, ry: 14, fill: RED, opacity: 0.9 }, sweat1);
  sweat1.setAttribute('transform', 'translate(560 640)');
  drawRobot(gR1, 1380, 800, 0.95, 'fist');
  // AI 甩出的 PPT 摞
  const r1Ppt = el('use', { href: '#icon-ppt', x: 1330, y: 480, width: 190, height: 190 }, gR1);
  // 进度条
  el('rect', { x: 760, y: 760, width: 440, height: 46, rx: 10, fill: CARD, stroke: INK, 'stroke-width': 8 }, gR1);
  const r1BarFill = el('rect', { x: 770, y: 770, width: 0, height: 26, rx: 6, fill: RED }, gR1);
  const r1BarLbl = bigText(gR1, 980, 740, 44, 'MarkerF', INK, 'middle');
  txt(r1BarLbl, 'PPT 进度');
  // 印章
  const r1Stamp = makeStamp(gR1, CX, 560, 720, 150, ['AI 3秒 = 你3天'], 78);

  // ============================ R2 比做报表 ============================
  const gR2 = el('g', {}, world);
  drawWorker(gR2, 520, 800, 0.95, 'calc');
  el('use', { href: '#icon-calculator', x: 430, y: 690, width: 120, height: 120 }, gR2);
  const errMark = bigText(gR2, 520, 640, 90, 'ZCOOL', RED, 'middle', 8, CARD);
  txt(errMark, '错！');
  drawRobot(gR2, 1380, 800, 0.95, 'fist');
  // AI 报表 + 柱状图
  el('use', { href: '#icon-report', x: 1280, y: 430, width: 180, height: 180 }, gR2);
  const r2Bars = [];
  for (let i = 0; i < 3; i++) {
    const b = el('rect', { x: 1500 + i * 46, y: 600, width: 30, height: 0, fill: i === 1 ? INK : RED, stroke: INK, 'stroke-width': 5 }, gR2);
    r2Bars.push(b);
  }
  el('line', { x1: 1480, y1: 600, x2: 1650, y2: 600, stroke: INK, 'stroke-width': 7 }, gR2);
  const r2Stamp = makeStamp(gR2, CX, 560, 640, 150, ['错误率 0.00%'], 80);

  // ============================ R3 比熬夜 ============================
  const gR3 = el('g', {}, world);
  drawWorker(gR3, 520, 800, 0.95, 'slump');
  // 咖啡 + 功能饮料
  el('use', { href: '#icon-coffee', x: 360, y: 820, width: 110, height: 110 }, gR3);
  el('use', { href: '#icon-drink', x: 480, y: 820, width: 90, height: 110 }, gR3);
  // 血丝眼
  const veins = el('g', {}, gR3);
  el('path', { d: 'M500 660 l14 6 M514 660 l-10 8 M528 660 l12 -4', stroke: RED, 'stroke-width': 5, 'stroke-linecap': 'round' }, veins);
  drawRobot(gR3, 1380, 800, 0.95, 'fist');
  // AI 头顶 24h
  el('use', { href: '#icon-clock24', x: 1330, y: 430, width: 110, height: 110 }, gR3);
  const r3_24 = bigText(gR3, 1385, 580, 60, 'AntonF', RED, 'middle', 4, CARD);
  txt(r3_24, '24h');

  // ============================ R4 比性价比 ============================
  const gR4 = el('g', {}, world);
  drawWorker(gR4, 520, 800, 0.95, 'bills');
  // 一摞账单
  const bills = [];
  for (let i = 0; i < 6; i++) {
    const b = el('use', { href: '#icon-bill', x: 380 + i * 26, y: 640 - i * 18, width: 90, height: 90 }, gR4);
    bills.push(b);
  }
  const billLbl = bigText(gR4, 520, 900, 40, 'ZhiMang', INK, 'middle');
  txt(billLbl, '社保 公积金 医保…');
  drawRobot(gR4, 1380, 800, 0.95, 'fist');
  // AI 胸前挂牌（整组淡入）
  const gAiBadge = el('g', { opacity: 0 }, gR4);
  el('rect', { x: 1230, y: 640, width: 300, height: 120, rx: 12, fill: CARD, stroke: INK, 'stroke-width': 8 }, gAiBadge);
  const aiBadgeLbl = el('text', { x: 1380, y: 688, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 38, fill: INK }, gAiBadge);
  const aiBadgeLbl2 = el('text', { x: 1380, y: 736, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 38, fill: RED }, gAiBadge);
  txt(aiBadgeLbl, '不缴社保·不领工资');
  txt(aiBadgeLbl2, '不闹情绪');
  const r4Stamp = makeStamp(gR4, CX, 560, 640, 150, ['碳基成本 +∞'], 80);

  // ============================ R5 终局一问 ============================
  const gR5 = el('g', {}, world);
  drawWorker(gR5, 560, 800, 0.95, 'kneel');
  // 老板的超大盖章手（红色手掌章）
  const bossHand = el('g', {}, gR5);
  el('path', { d: 'M760 300 Q760 240 830 240 L1130 240 Q1200 240 1200 300 L1200 420 Q1200 470 1140 470 L830 470 Q760 470 760 420 Z', fill: RED, stroke: INK, 'stroke-width': 9 }, bossHand);
  const qLbl = bigText(bossHand, 980, 360, 56, 'ZCOOL', CARD, 'middle');
  txt(qLbl, '老板问：');
  // 问题大字
  const r5Q = bigText(gR5, CX, 600, 96, 'ZCOOL', INK, 'middle', 8, CARD);
  txt(r5Q, '你，到底比AI强在哪？');
  // AI 抢答答案框
  const ansBox = el('g', {}, gR5);
  el('rect', { x: 1080, y: 700, width: 640, height: 180, rx: 16, fill: CARD, stroke: INK, 'stroke-width': 9 }, ansBox);
  el('rect', { x: 1080, y: 700, width: 640, height: 180, rx: 16, fill: RED, opacity: 0.12 }, ansBox);
  const ansT1 = bigText(ansBox, 1400, 770, 44, 'ZCOOL', RED, 'middle');
  txt(ansT1, '更便宜·24h·0情绪');
  const ansT2 = bigText(ansBox, 1400, 830, 44, 'ZCOOL', INK, 'middle');
  txt(ansT2, '还会自己迭代');
  drawRobot(gR5, 1500, 800, 0.85, 'fist');

  // ============================ 反转定格 gHire ============================
  const gHire = el('g', {}, world);
  // 特写：AI 工牌
  el('rect', { x: 660, y: 360, width: 600, height: 300, rx: 20, fill: CARD, stroke: INK, 'stroke-width': 12 }, gHire);
  el('rect', { x: 720, y: 410, width: 180, height: 90, rx: 10, fill: INK }, gHire);
  const hireCardName = bigText(gHire, 1080, 470, 64, 'ZCOOL', INK, 'middle');
  txt(hireCardName, '硅基 001');
  const hireCardSub = el('text', { x: 960, y: 560, 'text-anchor': 'middle', 'font-family': 'MarkerF', 'font-size': 36, fill: INK }, gHire);
  txt(hireCardSub, 'AI 芯片 · 正式工牌');
  // 大红“录用！”章
  const hireStamp = el('g', {}, gHire);
  el('circle', { cx: 960, cy: 510, r: 190, fill: 'none', stroke: RED, 'stroke-width': 22 }, hireStamp);
  el('circle', { cx: 960, cy: 510, r: 150, fill: 'none', stroke: RED, 'stroke-width': 8 }, hireStamp);
  const hireT = bigText(hireStamp, 960, 555, 150, 'ZCOOL', RED, 'middle', 10, CARD);
  txt(hireT, '录用！');

  // ============================ 神补刀 gEnd ============================
  const gEnd = el('g', {}, world);
  drawWorker(gEnd, 540, 800, 0.9, 'bills');
  drawRobot(gEnd, 1380, 800, 0.9, 'fist');
  // 老板台词气泡
  el('rect', { x: 620, y: 120, width: 680, height: 110, rx: 24, fill: CARD, stroke: INK, 'stroke-width': 8 }, gEnd);
  const bossSay = bigText(gEnd, 960, 192, 60, 'ZCOOL', INK, 'middle');
  txt(bossSay, '你留下，教它');
  // 人工牌被划掉
  const humanBadge = el('g', {}, gEnd);
  el('rect', { x: 430, y: 640, width: 190, height: 90, rx: 10, fill: CARD, stroke: INK, 'stroke-width': 7 }, humanBadge);
  const hbT = el('text', { x: 525, y: 695, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 34, fill: INK }, humanBadge);
  txt(hbT, '人类教具');
  const hbCross = el('line', { x1: 420, y1: 770, x2: 630, y2: 630, stroke: RED, 'stroke-width': 12, 'stroke-linecap': 'round' }, gEnd);
  // AI 新工牌
  el('rect', { x: 1290, y: 640, width: 220, height: 90, rx: 10, fill: RED, stroke: INK, 'stroke-width': 7 }, gEnd);
  const nbT = el('text', { x: 1400, y: 695, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 32, fill: CARD }, gEnd);
  txt(nbT, '硅基·正式员工');
  // 递咖啡
  el('use', { href: '#icon-coffee', x: 700, y: 760, width: 90, height: 90 }, gEnd);
  // 点题大字
  const pointT = bigText(gEnd, CX, 960, 120, 'ZCOOL', RED, 'middle', 10, CARD);
  txt(pointT, '赢了擂台，输了工位');
  // 角落小朱红章
  const smallStamp = el('g', {}, gEnd);
  el('rect', { x: 1470, y: 880, width: 360, height: 90, rx: 12, fill: 'none', stroke: RED, 'stroke-width': 8 }, smallStamp);
  const smallT = bigText(smallStamp, 1650, 938, 44, 'ZCOOL', RED, 'middle');
  txt(smallT, '它终于学会我了');

  // ============================ 收尾署名 gSign（空壳，文字在黑场之上） ============================
  const gSign = el('g', {}, world);

  // ============================ FX：爆炸框 / 集中线 / 速度线 ============================
  const gFx = el('g', {}, world);
  function starburst(spikes, R, fill, sw) {
    let pts = '';
    for (let i = 0; i < spikes * 2; i++) {
      const rr = i % 2 ? R * 0.82 : R;
      const a = (i / (spikes * 2)) * P;
      pts += `${Math.cos(a) * rr},${Math.sin(a) * rr} `;
    }
    return el('polygon', { points: pts, fill, stroke: INK, 'stroke-width': sw || 10, 'stroke-linejoin': 'round' }, gFx);
  }
  const sbRed = starburst(26, 260, RED);
  const sbCream = starburst(22, 200, CARD);
  const conc = el('g', {}, gFx);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * P;
    el('line', { x1: Math.cos(a) * 180, y1: Math.sin(a) * 180, x2: Math.cos(a) * 900, y2: Math.sin(a) * 900, stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, conc);
  }
  const speed = el('g', {}, gFx);
  for (let i = 0; i < 30; i++) {
    const y = h(i * 5.3) * H;
    const x = h(i * 9.1) * W;
    el('line', { x1: x, y1: y, x2: x + 120 + h(i) * 260, y2: y, stroke: i % 4 ? INK : RED, 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.8 }, speed);
  }
  // 持续漂移速度线（提帧差：全屏逐帧位移）
  const drift = el('g', {}, gFx);
  const driftLines = [];
  for (let i = 0; i < 40; i++) {
    const y = h(i * 3.1) * H;
    const len = 160 + h(i * 7.7) * 260;
    const ln = el('line', { x1: 0, y1: y, x2: len, y2: y, stroke: i % 5 ? INK : RED, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.6 }, drift);
    driftLines.push({ ln, y, len, sp: 14 + h(i * 1.9) * 18 });
  }

  // ---------- 爆炸框文字（置于星形之上，保证可读） ----------
  const gBoomTop = el('g', {}, world);
  const ringBoomT = bigText(gBoomTop, CX, 268, 120, 'ZCOOL', CARD, 'middle', 10, INK);
  txt(ringBoomT, '终极擂台赛！');
  const r3Boom = bigText(gBoomTop, CX, 560, 150, 'AntonF', CARD, 'middle', 12, INK);
  txt(r3Boom, '你 4h / AI ∞');

  // ---------- 屏幕空间顶层：闪白 / 纸纹 / 黑场 ----------
  const flash = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff', opacity: 0 }, stage);
  const paper = el('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#grain)', opacity: 0.5 }, stage);
  const blackfield = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#000000', opacity: 1 }, stage);
  // 署名放在黑场之上（黑底上的亮字）
  const signTextTop = el('text', { x: CX, y: CY + 20, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 72, fill: CARD, opacity: 0 }, stage);
  txt(signTextTop, '由 Doubao 在30秒内用纯代码制作完成');

  // ---------- 冲击表（震屏/闪白） ----------
  const HITS = [
    { t: T.ringCrack, sh: 26, fl: 0.6 },
    { t: T.boomIn, sh: 30, fl: 0.7 },
    { t: T.titleIn, sh: 24, fl: 0.5 },
    { t: T.r1Banner, sh: 30, fl: 0.7 },
    { t: T.r1Stamp, sh: 34, fl: 0.75 },
    { t: T.r2Banner, sh: 28, fl: 0.6 },
    { t: T.r2Stamp, sh: 30, fl: 0.65 },
    { t: T.r3Banner, sh: 28, fl: 0.6 },
    { t: T.r3Boom, sh: 34, fl: 0.8 },
    { t: T.r4Banner, sh: 28, fl: 0.6 },
    { t: T.r4Stamp, sh: 32, fl: 0.7 },
    { t: T.r5Question, sh: 38, fl: 0.85 },
    { t: T.r5AiAnswer, sh: 22, fl: 0.5 },
    { t: T.hireStamp, sh: 44, fl: 0.95 },
    { t: T.pointText, sh: 20, fl: 0.4 }
  ];

  // ============================ 主渲染 ============================
  function render(t0) {
    // 定格：录用章落定后钳到定格帧
    const frozen = t0 >= T.freezeAt && t0 < T.freezeEnd;
    let t = frozen ? T.freezeAt : t0;
    const frame = Math.floor(t * T.fps + 0.5);
    const seed3 = Math.floor(frame / 3);

    // ---- 背景色 ----
    let bgFill = PAPER;
    if (t >= T.blackOut) bgFill = DARK;
    bg.setAttribute('fill', bgFill);

    // ---- 相机（推镜） ----
    let zoom = 1, focalX = CX, focalY = CY;
    // 全片呼吸推拉 + 漂移（定格冷场 / 署名黑场除外），保证每帧都在动、帧差达标
    const breathe = !(t >= T.freezeAt && t < T.freezeEnd) && t < T.blackOut;
    if (breathe) {
      zoom *= 1 + 0.05 * Math.sin(t * 1.9) + 0.025 * Math.sin(t * 4.3);
      focalX += 34 * Math.sin(t * 0.9) + 16 * Math.sin(t * 2.3);
      focalY += 20 * Math.cos(t * 1.2) + 10 * Math.sin(t * 3.1);
    }
    if (t >= T.r5Question && t < T.r5Question + 0.4) {
      const p = (t - T.r5Question) / 0.4;
      zoom *= 1 + 0.12 * (1 - easeOutCubic(p));
    }
    if (t >= T.hireStamp && t < T.hireStamp + 0.35) {
      const p = (t - T.hireStamp) / 0.35;
      zoom *= 1 + 0.2 * (1 - easeOutCubic(p));
    }

    // ---- 震屏 + 闪白 ----
    let shx = 0, shy = 0, flOp = 0;
    for (const hit of HITS) {
      const dt = t - hit.t;
      if (dt >= 0 && dt < 0.5) {
        const a = hit.sh * Math.exp(-9 * dt);
        shx += (h(seed3 * 7 + hit.t) - 0.5) * 2 * a;
        shy += (h(seed3 * 13 + hit.t) - 0.5) * 2 * a;
      }
      if (dt >= 0 && dt < 0.1) flOp = Math.max(flOp, hit.fl * (1 - dt / 0.1));
    }
    flash.setAttribute('opacity', flOp);

    world.setAttribute('transform',
      `translate(${shx} ${shy}) translate(${focalX} ${focalY}) scale(${zoom}) translate(${-focalX} ${-focalY})`);

    // ---- 沸腾 seed 每帧换 ----
    for (let i = 1; i <= 3; i++) {
      const f = document.getElementById('boil' + i);
      f.firstChild.setAttribute('seed', (frame * 7 + i * 13) % 240);
    }
    grainT.setAttribute('seed', frame % 240);

    // ---- 默认隐藏 ----
    [gFloor, gRing, gBanner, gR1, gR2, gR3, gR4, gR5, gHire, gEnd, gSign].forEach(g => show(g, false));
    show(sbRed, false); show(sbCream, false); show(conc, false); show(speed, false);
    ringBoomT.setAttribute('opacity', 0);
    r3Boom.setAttribute('opacity', 0);
    show(gFloor, t >= 0.3 && t < T.r5End);
    // 漂移速度线：呼吸期内逐帧位移
    const driftOn = breathe;
    show(drift, driftOn);
    if (driftOn) {
      driftLines.forEach(d => {
        const off = ((frame * d.sp) % (W + 400)) - 200;
        d.ln.setAttribute('x1', off);
        d.ln.setAttribute('x2', off + d.len);
      });
    }

    // ================= 开场对峙 0.3–3.0 =================
    if (t >= 0.3 && t < T.ringEnd) {
      show(gRing, true);
      gRing.setAttribute('filter', 'url(#boil1)');
      // 两人砸入
      const pa = clamp((t - T.faceA) / 0.3, 0, 1);
      gRing.setAttribute('transform', `translate(0 ${(1 - easeOutCubic(pa)) * -500})`);
      // 集中线
      if (t >= T.ringCrack) {
        show(conc, true);
        conc.setAttribute('transform', `translate(${CX} ${CY})`);
        conc.setAttribute('opacity', 0.8);
      }
      // 爆炸框
      if (t >= T.boomIn) {
        const bp = clamp((t - T.boomIn) / 0.3, 0, 1);
        show(sbRed, true);
        sbRed.setAttribute('transform', `translate(${CX} 250) scale(${backOut(bp)})`);
        sbRed.setAttribute('opacity', 0.9);
        ringBoomT.setAttribute('transform', `translate(${CX} 268) scale(${0.6 + 0.4 * easeOutCubic(bp)}) translate(${-CX} -268)`);
        ringBoomT.setAttribute('opacity', 1);
      }
      // 主标题
      if (t >= T.titleIn) {
        const tp = clamp((t - T.titleIn) / 0.35, 0, 1);
        ringTitle.setAttribute('transform', `translate(${CX} 1000) scale(${0.5 + 0.5 * backOut(tp)}) translate(${-CX} -1000)`);
        ringTitle.setAttribute('opacity', 1);
      }
    }

    // ================= 通用横幅（R1–R4） =================
    if (t >= 3.0 && t < T.r5Question) {
      show(gBanner, true);
      gBanner.setAttribute('filter', 'url(#boil3)');
      const rp = clamp((t - (t < 8 ? T.r1Banner : t < 13 ? T.r2Banner : t < 18 ? T.r3Banner : T.r4Banner)) / 0.22, 0, 1);
      gBanner.setAttribute('transform', `translate(0 ${(1 - easeOutCubic(rp)) * -300})`);
    }

    // ================= R1 3.0–8.0 =================
    if (t >= T.r1Banner && t < T.r1End) {
      show(gR1, true);
      gR1.setAttribute('filter', 'url(#boil2)');
      txt(bannerText, 'Round 1：比做PPT');
      // 汗滴逐帧下落
      sweat1.setAttribute('opacity', t > 3.4 ? 0.9 : 0);
      sweat1.setAttribute('transform', `translate(560 640) translate(0 ${(h(frame * 1.3) - 0.5) * 30})`);
      // AI PPT 甩出
      if (t >= T.r1AiFling) {
        const fp = clamp((t - T.r1AiFling) / 0.3, 0, 1);
        r1Ppt.setAttribute('transform', `translate(${-600 * (1 - fp)} ${-120 * (1 - fp)}) rotate(${-20 * (1 - fp)})`);
        r1Ppt.setAttribute('opacity', 1);
      } else r1Ppt.setAttribute('opacity', 0);
      // 进度条
      const barP = smooth(T.r1BarTick[0], T.r1BarTick[2] + 0.15, t);
      r1BarFill.setAttribute('width', 400 * barP);
      // 印章
      if (t >= T.r1Stamp) {
        const sp = clamp((t - T.r1Stamp) / 0.22, 0, 1);
        r1Stamp.setAttribute('transform', `translate(${CX} 560) scale(${2.2 - 1.2 * easeOutCubic(sp)}) translate(${-CX} -560)`);
        r1Stamp.setAttribute('opacity', 1);
        if (sp < 0.5) { show(sbCream, true); sbCream.setAttribute('transform', `translate(${CX} 560) scale(${backOut(sp) * 1.4})`); sbCream.setAttribute('opacity', 0.5 * (1 - sp)); }
      } else r1Stamp.setAttribute('opacity', 0);
    }

    // ================= R2 8.0–13.0 =================
    if (t >= T.r2Banner && t < T.r2End) {
      show(gR2, true);
      gR2.setAttribute('filter', 'url(#boil2)');
      txt(bannerText, 'Round 2：比做报表');
      errMark.setAttribute('opacity', t >= T.r2HumanErr ? 1 : 0);
      // 柱状图逐根长
      r2Bars.forEach((b, i) => {
        const tk = T.r2ChartTick[i];
        const p = smooth(tk, tk + 0.3, t);
        const hgt = [40, 70, 100][i];
        b.setAttribute('height', hgt * p);
        b.setAttribute('y', 600 - hgt * p);
      });
      if (t >= T.r2Stamp) {
        const sp = clamp((t - T.r2Stamp) / 0.22, 0, 1);
        r2Stamp.setAttribute('transform', `translate(${CX} 560) scale(${2.2 - 1.2 * easeOutCubic(sp)}) translate(${-CX} -560)`);
        r2Stamp.setAttribute('opacity', 1);
      } else r2Stamp.setAttribute('opacity', 0);
    }

    // ================= R3 13.0–18.0 =================
    if (t >= T.r3Banner && t < T.r3End) {
      show(gR3, true);
      gR3.setAttribute('filter', 'url(#boil2)');
      txt(bannerText, 'Round 3：比熬夜');
      veins.setAttribute('opacity', t >= T.r3HumanSlump ? 1 : 0);
      r3_24.setAttribute('opacity', t >= T.r3Ai24 ? 1 : 0);
      // 爆炸框数字
      if (t >= T.r3Boom) {
        const bp = clamp((t - T.r3Boom) / 0.28, 0, 1);
        show(sbRed, true);
        sbRed.setAttribute('transform', `translate(${CX} 560) scale(${backOut(bp)})`);
        sbRed.setAttribute('opacity', 0.9);
        r3Boom.setAttribute('transform', `translate(${CX} 560) scale(${0.6 + 0.4 * backOut(bp)}) translate(${-CX} -560)`);
        r3Boom.setAttribute('opacity', 1);
      } else r3Boom.setAttribute('opacity', 0);
    }

    // ================= R4 18.0–23.0 =================
    if (t >= T.r4Banner && t < T.r4End) {
      show(gR4, true);
      gR4.setAttribute('filter', 'url(#boil2)');
      txt(bannerText, 'Round 4：比性价比');
      // 账单逐张掏出
      bills.forEach((b, i) => {
        const tk = T.r4BillStart + i * T.r4BillStep;
        b.setAttribute('opacity', t >= tk ? 1 : 0);
        if (t >= tk) {
          const p = clamp((t - tk) / 0.18, 0, 1);
          b.setAttribute('transform', `translate(${30 * (1 - p)} ${-40 * (1 - p)}) rotate(${8 * (1 - p)})`);
        }
      });
      aiBadgeLbl.setAttribute('opacity', 1);
      gAiBadge.setAttribute('opacity', t >= T.r4AiBadge ? 1 : 0);
      if (t >= T.r4Stamp) {
        const sp = clamp((t - T.r4Stamp) / 0.22, 0, 1);
        r4Stamp.setAttribute('transform', `translate(${CX} 560) scale(${2.2 - 1.2 * easeOutCubic(sp)}) translate(${-CX} -560)`);
        r4Stamp.setAttribute('opacity', 1);
      } else r4Stamp.setAttribute('opacity', 0);
    }

    // ================= R5 23.0–26.7 =================
    if (t >= T.r5Question && t < T.r5End) {
      show(gR5, true);
      gR5.setAttribute('filter', 'url(#boil2)');
      const qp = clamp((t - T.r5Question) / 0.3, 0, 1);
      bossHand.setAttribute('transform', `translate(${CX} 0) scale(${0.6 + 0.4 * backOut(qp)}) translate(${-CX} 0)`);
      r5Q.setAttribute('opacity', t >= T.r5Question + 0.15 ? 1 : 0);
      ansBox.setAttribute('opacity', t >= T.r5AiAnswer ? 1 : 0);
      if (t >= T.r5AiAnswer) {
        const ap = clamp((t - T.r5AiAnswer) / 0.25, 0, 1);
        ansBox.setAttribute('transform', `translate(${900 * (1 - ap)} 0)`);
        show(sbCream, true);
        sbCream.setAttribute('transform', `translate(1400 790) scale(${backOut(ap)})`);
        sbCream.setAttribute('opacity', 0.4 * (1 - ap));
      }
    }

    // ================= 反转定格 26.7–27.5 =================
    if (t >= T.hireStamp && t < T.freezeEnd) {
      show(gHire, true);
      gHire.setAttribute('filter', 'url(#boil1)');
      const sp = clamp((t - T.hireStamp) / 0.22, 0, 1);
      hireStamp.setAttribute('transform', `translate(960 510) scale(${2.4 - 1.4 * easeOutCubic(sp)}) rotate(${-8 * (1 - sp)}) translate(-960 -510)`);
      hireStamp.setAttribute('opacity', 1);
      if (sp < 0.6) { show(sbRed, true); sbRed.setAttribute('transform', `translate(960 510) scale(${backOut(sp)})`); sbRed.setAttribute('opacity', 0.8 * (1 - sp)); }
    }

    // ================= 神补刀 27.5–28.8 =================
    if (t >= T.bossLine && t < T.blackOut) {
      show(gEnd, true);
      gEnd.setAttribute('filter', 'url(#boil1)');
      bossSay.setAttribute('opacity', t >= T.bossLine ? 1 : 0);
      hbCross.setAttribute('opacity', t >= T.badgeTear ? 1 : 0);
      if (t >= T.badgeTear) {
        const cp = clamp((t - T.badgeTear) / 0.18, 0, 1);
        hbCross.setAttribute('stroke-dasharray', 300);
        hbCross.setAttribute('stroke-dashoffset', 300 * (1 - cp));
      }
      pointT.setAttribute('opacity', t >= T.pointText ? 1 : 0);
      if (t >= T.pointText) {
        const pp = clamp((t - T.pointText) / 0.25, 0, 1);
        pointT.setAttribute('transform', `translate(${CX} 960) scale(${0.6 + 0.4 * backOut(pp)}) translate(${-CX} -960)`);
      }
      smallStamp.setAttribute('opacity', t >= T.smallStamp ? 1 : 0);
      if (t >= T.smallStamp) {
        const sp = clamp((t - T.smallStamp) / 0.2, 0, 1);
        smallStamp.setAttribute('transform', `translate(1650 925) rotate(${6 * (1 - sp)}) translate(-1650 -925)`);
      }
    }

    // ================= 收尾署名 28.9–30 =================
    if (t >= T.signOff) {
      const sp = clamp((t - T.signOff) / 0.3, 0, 1);
      signTextTop.setAttribute('opacity', sp);
    }

    // ---- 黑场：仅前 0.12s 从黑淡入 + 收尾黑场 ----
    let bf = 0;
    bf = Math.max(bf, 1 - smooth(0, 0.12, t0));
    if (t0 >= T.blackOut) bf = Math.max(bf, smooth(T.blackOut, T.blackOut + 0.12, t0));
    blackfield.setAttribute('opacity', clamp(bf, 0, 1));
  }

  window.render = render;
  render(0);
})();
