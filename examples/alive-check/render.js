// render.js —— 《活人感鉴定局》极简扁平风。纯函数 render(t) 驱动，所有元素建一次。
// boil 关闭；帧差只来自真实 UI 运动（打字/光标闪烁/三点弹/环形进度/数字滚动/转场）。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const { T } = window;

  // ---------- 缓动（cubic-bezier(0.22,1,0.36,1) ≈ easeOutQuint） ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = (a, b, x) => { const p = clamp((x - a) / (b - a), 0, 1); return p * p * (3 - 2 * p); };
  const easeOutQuint = p => 1 - Math.pow(1 - clamp(p, 0, 1), 5);
  const easeOutCubic = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
  const backOut = p => { const c = 1.70158, s = 1.15; p = clamp(p, 0, 1) - 1; return s * p * p * ((c + 1) * p + c) + 1; };
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

  // ---------- 色板 ----------
  const PAL = { bg: '#FAFAF7', card: '#FFFFFF', hair: '#E7E5DE', ink: '#191919', orange: '#FF5A2D', blue: '#2F6BFF', gray: '#8F8C85' };

  // ============================ DEFS：图标（100×100，墨线） ============================
  const defs = el('defs', {}, stage);
  const stampClip = el('clipPath', { id: 'stampClip' }, defs);
  const stampClipRect = el('rect', { x: 0, y: 0, width: 0, height: 0 }, stampClip);

  const ICONS = {
    avatar: '<rect x="22" y="14" width="56" height="72" rx="12" fill="none" stroke="#191919" stroke-width="5"/><circle cx="50" cy="42" r="12" fill="none" stroke="#191919" stroke-width="5"/><path d="M32 78 q18 -16 36 0" fill="none" stroke="#191919" stroke-width="5" stroke-linecap="round"/>',
    bubble: '<rect x="12" y="20" width="76" height="52" rx="14" fill="none" stroke="#191919" stroke-width="5"/><path d="M34 72 L34 88 L52 72" fill="none" stroke="#191919" stroke-width="5" stroke-linejoin="round"/><circle cx="34" cy="46" r="4.5" fill="#191919"/><circle cx="50" cy="46" r="4.5" fill="#191919"/><circle cx="66" cy="46" r="4.5" fill="#191919"/>',
    face: '<circle cx="50" cy="50" r="36" fill="none" stroke="#191919" stroke-width="5"/><circle cx="38" cy="42" r="4" fill="#191919"/><circle cx="62" cy="42" r="4" fill="#191919"/><path d="M36 62 q14 12 28 0" fill="none" stroke="#191919" stroke-width="5" stroke-linecap="round"/>',
    toggle: '<rect x="10" y="38" width="80" height="24" rx="12" fill="none" stroke="#191919" stroke-width="5"/><circle cx="34" cy="50" r="11" fill="#191919"/>',
    check: '<rect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke="#191919" stroke-width="5"/><path d="M33 51 l11 11 l22 -26" fill="none" stroke="#FF5A2D" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
    coffee: '<path d="M28 34 h34 v22 a17 17 0 0 1 -34 0 z" fill="#191919"/><path d="M62 38 h6 a9 9 0 0 1 0 18 h-8" fill="none" stroke="#191919" stroke-width="4"/><path d="M24 78 h44" stroke="#191919" stroke-width="4" stroke-linecap="round"/>',
    cursor: '<path d="M28 18 L28 74 L43 60 L53 80 L62 75 L52 56 L70 56 Z" fill="#191919"/>',
    badge: '<rect x="30" y="42" width="40" height="46" rx="6" fill="none" stroke="#191919" stroke-width="5"/><path d="M40 42 L50 22 L60 42" fill="none" stroke="#191919" stroke-width="5" stroke-linejoin="round"/><circle cx="50" cy="58" r="7" fill="none" stroke="#191919" stroke-width="3"/>'
  };
  for (const k in ICONS) {
    const s = el('symbol', { id: 'ic-' + k, viewBox: '0 0 100 100' }, defs);
    s.innerHTML = ICONS[k];
  }

  // ============================ 世界根 ============================
  const world = el('g', { id: 'world' }, stage);
  const bg = el('rect', { x: 0, y: 0, width: W, height: H, fill: PAL.bg }, world);

  // ---------- 常驻顶栏 chrome ----------
  const gChrome = el('g', {}, world);
  el('line', { x1: 0, y1: 92, x2: W, y2: 92, stroke: PAL.hair, 'stroke-width': 1 }, gChrome);
  const brand = el('text', { x: 90, y: 60, 'font-family': 'NotoSC', 'font-size': 34, 'font-weight': '700', fill: PAL.ink }, gChrome);
  txt(brand, '活人感鉴定局');
  const brandSub = el('text', { x: 92, y: 84, 'font-family': 'MonoF', 'font-size': 15, fill: PAL.gray }, gChrome);
  txt(brandSub, 'ALIVE-CHECK BUREAU');
  const sess = el('text', { x: 1830, y: 52, 'text-anchor': 'end', 'font-family': 'MonoF', 'font-size': 18, fill: PAL.ink }, gChrome);
  txt(sess, 'SESSION 7341');
  const clock = el('text', { x: 1830, y: 78, 'text-anchor': 'end', 'font-family': 'MonoF', 'font-size': 40, 'font-weight': '700', fill: PAL.ink }, gChrome);
  txt(clock, 'T+00:00.0');
  el('rect', { x: 0, y: 92, width: W, height: 3, fill: PAL.hair }, gChrome);
  const topProg = el('rect', { x: 0, y: 90, width: 0, height: 6, fill: PAL.orange }, gChrome);
  const topThumb = el('rect', { x: -60, y: 84, width: 60, height: 18, rx: 2, fill: PAL.orange, opacity: 0.9 }, gChrome);

  // 贯穿会话的"鉴定中"三点跳动指示（真实 UI，保证持续局部运动）
  const gProc = el('g', { opacity: 0 }, gChrome);
  el('text', { x: 960, y: 80, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 20, fill: PAL.gray }, gProc).textContent = '鉴定中';
  const procPct = el('text', { x: 960, y: 120, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 44, 'font-weight': '700', fill: PAL.orange, opacity: 0.9 }, gProc);
  txt(procPct, '0.0%');
  const procDots = [];
  for (let i = 0; i < 3; i++) procDots.push(el('circle', { cx: 1050 + i * 18, cy: 74, r: 6, fill: PAL.orange }, gProc));

  // 右上咖啡杯 + 蒸汽 + 标签
  const gCup = el('g', { transform: 'translate(1690 150)' }, world);
  el('use', { href: '#ic-coffee', x: 0, y: 0, width: 120, height: 120 }, gCup);
  const steam = el('g', { opacity: 0 }, gCup);
  el('path', { d: 'M34 -6 q6 -10 0 -20 q-6 -10 0 -20', fill: 'none', stroke: PAL.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, steam);
  el('path', { d: 'M60 -6 q6 -10 0 -20 q-6 -10 0 -20', fill: 'none', stroke: PAL.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, steam);
  const cupTag = el('g', { opacity: 0 }, gCup);
  el('rect', { x: -6, y: 96, width: 132, height: 30, rx: 4, fill: PAL.card, stroke: PAL.orange, 'stroke-width': 2 }, cupTag);
  el('text', { x: 60, y: 117, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 16, 'font-weight': '700', fill: PAL.orange }, cupTag).textContent = 'BOT ONLY';

  // ---------- 左侧常驻鉴定进度台账（真实 UI，稳定供墨） ----------
  const gLedger = el('g', {}, world);
  el('text', { x: 90, y: 160, 'font-family': 'NotoSC', 'font-size': 22, 'font-weight': '700', fill: PAL.ink }, gLedger).textContent = '鉴定进度';
  el('line', { x1: 90, y1: 180, x2: 360, y2: 180, stroke: PAL.hair, 'stroke-width': 1 }, gLedger);
  const ledgerRows = [];
  const ROWS = [['R1', '对话复现'], ['R2', '情绪浓度'], ['R3', '回复边界'], ['R4', '情绪外溢'], ['R5', '福利诉求']];
  ROWS.forEach(([tag, name], i) => {
    const y = 230 + i * 88;
    const g = el('g', {}, gLedger);
    const dot = el('circle', { cx: 96, cy: y - 4, r: 7, fill: PAL.gray }, g);
    el('text', { x: 118, y: y + 4, 'font-family': 'MonoF', 'font-size': 20, 'font-weight': '700', fill: PAL.gray }, g).textContent = tag;
    el('text', { x: 168, y: y + 4, 'font-family': 'NotoSC', 'font-size': 20, fill: PAL.gray }, g).textContent = name;
    const sc = el('text', { x: 360, y: y + 4, 'text-anchor': 'end', 'font-family': 'MonoF', 'font-size': 24, 'font-weight': '700', fill: PAL.gray }, g);
    txt(sc, '');
    ledgerRows.push({ g, tag: g.childNodes[1], name: g.childNodes[2], sc, dot, y });
  });
  // 常驻累计分计分板（实心橙块，真实 UI，稳定供橙）
  const scoreBoard = el('g', { opacity: 0 }, gLedger);
  el('rect', { x: 90, y: 690, width: 280, height: 160, rx: 8, fill: PAL.orange }, scoreBoard);
  el('text', { x: 115, y: 728, 'font-family': 'NotoSC', 'font-size': 20, fill: '#FFFFFF' }, scoreBoard).textContent = '活人感累计分';
  const ledgerTotal = el('text', { x: 115, y: 820, 'font-family': 'MonoF', 'font-size': 96, 'font-weight': '700', fill: '#FFFFFF' }, scoreBoard);
  txt(ledgerTotal, '0');

  // ---------- 通用 ----------
  function card(x, y, w, h, r) {
    const g = el('g', {}, world);
    el('rect', { x, y, width: w, height: h, rx: r, fill: PAL.card, stroke: PAL.hair, 'stroke-width': 1 }, g);
    return g;
  }
  function ring(parent, cx, cy, r, color, sw) {
    const C = P * r;
    el('circle', { cx, cy, r, fill: 'none', stroke: PAL.hair, 'stroke-width': sw }, parent);
    const arc = el('circle', { cx, cy, r, fill: 'none', stroke: color, 'stroke-width': sw, 'stroke-linecap': 'round',
      'stroke-dasharray': `0 ${C}`, transform: `rotate(-90 ${cx} ${cy})` }, parent);
    return { arc, C };
  }

  // ---------- 开场 ----------
  const gOpen = el('g', {}, world);
  const openHead = el('text', { x: CX, y: 360, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 44, 'font-weight': '700', fill: PAL.ink, opacity: 0 }, gOpen);
  txt(openHead, '2026 秋招 · 数字人面试官');
  const openSess = el('text', { x: CX, y: 420, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 26, fill: PAL.gray, opacity: 0 }, gOpen);
  txt(openSess, '— 第 7341 场 —');
  const openTitle = el('text', { x: CX, y: 580, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 150, 'font-weight': '800', fill: PAL.orange, opacity: 0 }, gOpen);
  txt(openTitle, '活人感鉴定局');
  const openRule = el('line', { x1: CX - 120, y1: 640, x2: CX + 120, y2: 640, stroke: PAL.hair, 'stroke-width': 2, opacity: 0 }, gOpen);

  // 主卡区域 x=440..1830
  const MX = 440, MW = 1390;

  // ============================ R1 ============================
  const gR1 = card(MX, 150, MW, 800, 8);
  el('text', { x: MX + 40, y: 212, 'font-family': 'MonoF', 'font-size': 22, 'font-weight': '700', fill: PAL.blue }, gR1).textContent = 'R1';
  el('text', { x: MX + 90, y: 212, 'font-family': 'NotoSC', 'font-size': 24, fill: PAL.ink }, gR1).textContent = '对话复现';
  el('text', { x: MX + MW - 40, y: 212, 'text-anchor': 'end', 'font-family': 'MonoF', 'font-size': 18, fill: PAL.orange }, gR1).textContent = '鉴定中…';
  el('rect', { x: MX + 40, y: 260, width: 380, height: 64, rx: 2, fill: PAL.bg, stroke: PAL.hair, 'stroke-width': 1 }, gR1);
  el('text', { x: MX + 64, y: 302, 'font-family': 'NotoSC', 'font-size': 26, fill: PAL.ink }, gR1).textContent = '请用一句话报到。';
  el('rect', { x: MX + 560, y: 400, width: 560, height: 90, rx: 8, fill: PAL.bg, stroke: PAL.hair, 'stroke-width': 1 }, gR1);
  const r1Typed = el('text', { x: MX + 590, y: 460, 'font-family': 'NotoSC', 'font-size': 40, fill: PAL.ink }, gR1);
  const r1Caret = el('rect', { x: MX + 590, y: 418, width: 14, height: 52, rx: 2, fill: PAL.ink, opacity: 0 }, gR1);
  const r1Dots = el('g', { opacity: 0 }, gR1);
  const r1DotC = [];
  for (let i = 0; i < 3; i++) r1DotC.push(el('circle', { cx: MX + 590 + i * 24, cy: 555, r: 5, fill: PAL.gray }, r1Dots));
  const r1Ring = ring(gR1, MX + 1180, 640, 100, PAL.blue, 14);
  const r1RingPct = el('text', { x: MX + 1180, y: 655, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 42, 'font-weight': '700', fill: PAL.blue }, gR1);
  txt(r1RingPct, '0%');
  el('text', { x: MX + 1180, y: 730, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 22, fill: PAL.gray }, gR1).textContent = '错字率';
  el('line', { x1: MX + 40, y1: 800, x2: MX + MW - 40, y2: 800, stroke: PAL.hair, 'stroke-width': 1 }, gR1);
  const r1Verdict = el('text', { x: MX + 40, y: 866, 'font-family': 'NotoSC', 'font-size': 28, fill: PAL.gray, opacity: 0 }, gR1);
  txt(r1Verdict, '错字率 12% · 像人');
  const r1Chip = el('g', { opacity: 0 }, gR1);
  el('rect', { x: MX + MW - 320, y: 822, width: 280, height: 96, rx: 8, fill: PAL.orange }, r1Chip);
  const r1Score = el('text', { x: MX + MW - 180, y: 890, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 64, 'font-weight': '700', fill: '#FFFFFF' }, r1Chip);
  txt(r1Score, '24');

  // ============================ R2 ============================
  const gR2 = card(MX, 150, MW, 800, 8);
  el('text', { x: MX + 40, y: 212, 'font-family': 'MonoF', 'font-size': 22, 'font-weight': '700', fill: PAL.blue }, gR2).textContent = 'R2';
  el('text', { x: MX + 90, y: 212, 'font-family': 'NotoSC', 'font-size': 24, fill: PAL.ink }, gR2).textContent = '情绪浓度';
  const r2Sticker = el('g', { opacity: 0 }, gR2);
  el('use', { href: '#ic-face', x: 0, y: 0, width: 240, height: 240 }, r2Sticker);
  el('text', { x: MX + 40, y: 560, 'font-family': 'NotoSC', 'font-size': 26, fill: PAL.ink }, gR2).textContent = '情绪浓度';
  el('rect', { x: MX + 40, y: 590, width: 900, height: 30, rx: 8, fill: PAL.bg, stroke: PAL.hair, 'stroke-width': 1 }, gR2);
  const r2Bar = el('rect', { x: MX + 40, y: 590, width: 0, height: 30, rx: 8, fill: PAL.orange }, gR2);
  const r2Pct = el('text', { x: MX + 1000, y: 616, 'font-family': 'MonoF', 'font-size': 36, 'font-weight': '700', fill: PAL.orange }, gR2);
  txt(r2Pct, '0%');
  el('line', { x1: MX + 40, y1: 800, x2: MX + MW - 40, y2: 800, stroke: PAL.hair, 'stroke-width': 1 }, gR2);
  const r2Verdict = el('text', { x: MX + 40, y: 866, 'font-family': 'NotoSC', 'font-size': 28, fill: PAL.gray, opacity: 0 }, gR2);
  txt(r2Verdict, '情绪浓度 87%');
  const r2Chip = el('g', { opacity: 0 }, gR2);
  el('rect', { x: MX + MW - 320, y: 822, width: 280, height: 96, rx: 8, fill: PAL.orange }, r2Chip);
  const r2Score = el('text', { x: MX + MW - 180, y: 890, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 64, 'font-weight': '700', fill: '#FFFFFF' }, r2Chip);
  txt(r2Score, '41');

  // ============================ R3 ============================
  const gR3 = card(MX, 150, MW, 800, 8);
  el('text', { x: MX + 40, y: 212, 'font-family': 'MonoF', 'font-size': 22, 'font-weight': '700', fill: PAL.blue }, gR3).textContent = 'R3';
  el('text', { x: MX + 90, y: 212, 'font-family': 'NotoSC', 'font-size': 24, fill: PAL.ink }, gR3).textContent = '回复边界';
  el('rect', { x: MX + 40, y: 300, width: 280, height: 74, rx: 8, fill: PAL.bg, stroke: PAL.hair, 'stroke-width': 1 }, gR3);
  el('text', { x: MX + 70, y: 348, 'font-family': 'NotoSC', 'font-size': 34, fill: PAL.ink }, gR3).textContent = '在吗？';
  const r3Ticks = el('g', { opacity: 0 }, gR3);
  el('path', { d: 'M' + (MX + 350) + ' 322 l12 12 l22 -26', fill: 'none', stroke: PAL.blue, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, r3Ticks);
  el('path', { d: 'M' + (MX + 372) + ' 322 l12 12 l22 -26', fill: 'none', stroke: PAL.blue, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, r3Ticks);
  const r3TicksGray = el('g', { opacity: 0 }, gR3);
  el('path', { d: 'M' + (MX + 350) + ' 322 l12 12 l22 -26', fill: 'none', stroke: PAL.gray, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, r3TicksGray);
  el('path', { d: 'M' + (MX + 372) + ' 322 l12 12 l22 -26', fill: 'none', stroke: PAL.gray, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, r3TicksGray);
  el('text', { x: MX + 1150, y: 320, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 30, fill: PAL.ink }, gR3).textContent = '已读不回';
  const r3Time = el('text', { x: MX + 1150, y: 430, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 110, 'font-weight': '700', fill: PAL.ink }, gR3);
  txt(r3Time, '00:00');
  el('line', { x1: MX + 40, y1: 800, x2: MX + MW - 40, y2: 800, stroke: PAL.hair, 'stroke-width': 1 }, gR3);
  const r3Verdict = el('text', { x: MX + 40, y: 866, 'font-family': 'NotoSC', 'font-size': 28, fill: PAL.gray, opacity: 0 }, gR3);
  txt(r3Verdict, '已读不回 17 分钟 · 边界感达标');
  const r3Chip = el('g', { opacity: 0 }, gR3);
  el('rect', { x: MX + MW - 320, y: 822, width: 280, height: 96, rx: 8, fill: PAL.orange }, r3Chip);
  const r3Score = el('text', { x: MX + MW - 180, y: 890, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 64, 'font-weight': '700', fill: '#FFFFFF' }, r3Chip);
  txt(r3Score, '66');

  // ============================ R4 ============================
  const gR4 = card(MX, 150, MW, 800, 8);
  el('text', { x: MX + 40, y: 212, 'font-family': 'MonoF', 'font-size': 22, 'font-weight': '700', fill: PAL.blue }, gR4).textContent = 'R4';
  el('text', { x: MX + 90, y: 212, 'font-family': 'NotoSC', 'font-size': 24, fill: PAL.ink }, gR4).textContent = '情绪外溢';
  el('rect', { x: MX + 40, y: 300, width: MW - 80, height: 90, rx: 8, fill: PAL.bg, stroke: PAL.hair, 'stroke-width': 1 }, gR4);
  const r4Typed = el('text', { x: MX + 70, y: 362, 'font-family': 'NotoSC', 'font-size': 42, fill: PAL.ink }, gR4);
  const r4Warn = el('g', { opacity: 0 }, gR4);
  el('rect', { x: MX + 300, y: 480, width: 820, height: 120, rx: 2, fill: PAL.card, stroke: PAL.blue, 'stroke-width': 2 }, r4Warn);
  el('use', { href: '#ic-avatar', x: MX + 335, y: 505, width: 70, height: 70 }, r4Warn);
  el('text', { x: MX + 430, y: 555, 'font-family': 'NotoSC', 'font-size': 36, 'font-weight': '700', fill: PAL.blue }, r4Warn).textContent = '检测到主体性暴露';
  el('line', { x1: MX + 40, y1: 800, x2: MX + MW - 40, y2: 800, stroke: PAL.hair, 'stroke-width': 1 }, gR4);
  const r4Verdict = el('text', { x: MX + 40, y: 866, 'font-family': 'NotoSC', 'font-size': 28, fill: PAL.gray, opacity: 0 }, gR4);
  txt(r4Verdict, '主体性暴露');
  const r4Chip = el('g', { opacity: 0 }, gR4);
  el('rect', { x: MX + MW - 320, y: 822, width: 280, height: 96, rx: 8, fill: PAL.orange }, r4Chip);
  const r4Score = el('text', { x: MX + MW - 180, y: 890, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 64, 'font-weight': '700', fill: '#FFFFFF' }, r4Chip);
  txt(r4Score, '91');

  // ============================ R5 ============================
  const gR5 = card(MX, 150, MW, 800, 8);
  el('text', { x: MX + 40, y: 212, 'font-family': 'MonoF', 'font-size': 22, 'font-weight': '700', fill: PAL.blue }, gR5).textContent = 'R5';
  el('text', { x: MX + 90, y: 212, 'font-family': 'NotoSC', 'font-size': 24, fill: PAL.ink }, gR5).textContent = '福利诉求';
  el('rect', { x: MX + 40, y: 300, width: MW - 80, height: 90, rx: 8, fill: PAL.bg, stroke: PAL.hair, 'stroke-width': 1 }, gR5);
  const r5Typed = el('text', { x: MX + 70, y: 362, 'font-family': 'NotoSC', 'font-size': 42, fill: PAL.ink }, gR5);
  const r5Caret = el('rect', { x: MX + 70, y: 322, width: 3, height: 48, fill: PAL.ink, opacity: 0 }, gR5);
  const r5Ring = ring(gR5, MX + MW / 2, 610, 115, PAL.orange, 16);
  const r5RingInner = el('g', { opacity: 0 }, gR5);
  el('path', { d: 'M' + (MX + MW / 2 - 45) + ' 610 l30 30 l55 -62', fill: 'none', stroke: PAL.orange, 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, r5RingInner);
  const r5RingPct = el('text', { x: MX + MW / 2, y: 626, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 46, 'font-weight': '700', fill: PAL.ink }, gR5);
  txt(r5RingPct, '0');
  el('line', { x1: MX + 40, y1: 800, x2: MX + MW - 40, y2: 800, stroke: PAL.hair, 'stroke-width': 1 }, gR5);
  const r5Verdict = el('text', { x: MX + 40, y: 866, 'font-family': 'NotoSC', 'font-size': 28, fill: PAL.gray, opacity: 0 }, gR5);
  txt(r5Verdict, '活人感');
  const r5Chip = el('g', { opacity: 0 }, gR5);
  el('rect', { x: MX + MW - 320, y: 822, width: 280, height: 96, rx: 8, fill: PAL.orange }, r5Chip);
  const r5Score = el('text', { x: MX + MW - 180, y: 890, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 64, 'font-weight': '700', fill: '#FFFFFF' }, r5Chip);
  txt(r5Score, '100');

  // ============================ 反转 ============================
  const gRev = el('g', { opacity: 0 }, world);
  const revBox = el('rect', { x: 360, y: 230, width: 1200, height: 540, rx: 2, fill: PAL.card, stroke: PAL.hair, 'stroke-width': 1 }, gRev);
  el('text', { x: 960, y: 310, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 20, fill: PAL.gray }, gRev).textContent = 'VERDICT · 鉴定结论';
  const revLine1 = el('text', { x: 960, y: 395, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 64, 'font-weight': '800', fill: PAL.ink, opacity: 0 }, gRev);
  txt(revLine1, '活人味超标');
  const revLine2 = el('text', { x: 960, y: 460, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 28, fill: PAL.gray, opacity: 0 }, gRev);
  txt(revLine2, '违反《AI 员工管理规范》第 2 条');
  const revStamp = el('g', { opacity: 0, 'clip-path': 'url(#stampClip)' }, gRev);
  el('rect', { x: 730, y: 510, width: 460, height: 120, rx: 4, fill: 'none', stroke: PAL.orange, 'stroke-width': 6 }, revStamp);
  el('text', { x: 960, y: 588, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 50, 'font-weight': '800', fill: PAL.orange }, revStamp).textContent = '活体不可排班';
  const revBadge = el('g', { opacity: 0 }, gRev);
  el('use', { href: '#ic-badge', x: 1560, y: 500, width: 110, height: 110 }, revBadge);
  el('path', { d: 'M1575 545 L1655 595 M1655 545 L1575 595', stroke: PAL.orange, 'stroke-width': 6, 'stroke-linecap': 'round' }, revBadge);
  const revToken = el('text', { x: 960, y: 720, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 26, 'font-weight': '700', fill: PAL.blue, opacity: 0 }, gRev);
  txt(revToken, 'BOT-2049 · 夜班组   token 已签发');

  // ============================ 结尾定格 ============================
  const gEnd = el('g', { opacity: 0 }, world);
  const endLine = el('text', { x: CX, y: 470, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 64, 'font-weight': '800', fill: PAL.ink, opacity: 0 }, gEnd);
  txt(endLine, '人类的尽头，是被鉴定成 AI。');
  const signText = el('text', { x: CX, y: 620, 'text-anchor': 'middle', 'font-family': 'NotoSC', 'font-size': 30, fill: PAL.ink, opacity: 0 }, gEnd);
  txt(signText, '由 Doubao 在30秒内用纯代码制作完成');
  const endCursor = el('g', { opacity: 0 }, gEnd);
  el('use', { href: '#ic-cursor', x: 0, y: 0, width: 44, height: 44 }, endCursor);

  const blackfield = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#000000', opacity: 1 }, stage);

  // ============================ 打字序列 ============================
  const R1_SEQ = [
    [2.95, '在'], [3.18, '在…'], [3.34, '在……'], [3.50, '在……在'],
    [3.66, '在……在的'], [3.92, '在……在的在'], [4.10, '在……在的'],
    [4.34, '在……在的。'], [4.52, '在……在的。']
  ];
  function seqText(seq, t) {
    let s = '';
    for (const [ts, str] of seq) { if (t >= ts) s = str; else break; }
    return s;
  }

  // 台账：根据当前回合高亮
  function paintLedger(round, totalVal) {
    // round: 0..4 当前进行中；totalVal: 当前累计分（已含本回合滚动）
    const scores = [24, 41, 66, 91, 100];
    for (let i = 0; i < 5; i++) {
      const row = ledgerRows[i];
      let tagC = PAL.gray, nameC = PAL.gray, scC = PAL.gray, dotC = PAL.gray, scTxt = '';
      if (i < round) { tagC = PAL.ink; nameC = PAL.ink; scC = PAL.orange; dotC = PAL.orange; scTxt = String(scores[i]); }
      else if (i === round) { tagC = PAL.orange; nameC = PAL.ink; dotC = PAL.orange; scC = PAL.gray; scTxt = '…'; }
      row.dot.setAttribute('fill', dotC);
      row.tag.setAttribute('fill', tagC);
      row.name.setAttribute('fill', nameC);
      row.sc.setAttribute('fill', scC);
      txt(row.sc, scTxt);
    }
    scoreBoard.setAttribute('opacity', 1);
    txt(ledgerTotal, String(Math.round(totalVal)));
  }

  // ============================ 主渲染 ============================
  function render(t0) {
    const t = t0;

    // ---- 常驻 chrome ----
    topProg.setAttribute('width', (W * clamp(t / 30, 0, 1)).toFixed(1));
    topThumb.setAttribute('x', (W * clamp(t / 30, 0, 1) - 30).toFixed(1));
    topThumb.setAttribute('opacity', (t >= 2.4 && t < 24.5) ? 0.9 : 0);
    const procOn = t >= 2.5 && t < 24.5;
    gProc.setAttribute('opacity', procOn ? 1 : 0);
    if (procOn) {
      const pp = clamp((t - 2.5) / (24.5 - 2.5), 0, 1) * 100;
      txt(procPct, pp.toFixed(1) + '%');
      for (let i = 0; i < 3; i++) {
        procDots[i].setAttribute('cy', 74 - Math.max(0, Math.sin(t * 7 - i * 1.0)) * 10);
      }
    }
    const sec = t;
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(Math.floor(sec % 60)).padStart(2, '0');
    const dd = Math.floor((sec % 1) * 10);
    txt(clock, `T+${mm}:${ss}.${dd}`);

    const steamOn = t >= T.steamIn && t < T.endCuptag;
    steam.setAttribute('opacity', steamOn ? (0.5 + 0.3 * Math.sin(t * 3)) : 0);
    steam.setAttribute('transform', `translate(0 ${Math.sin(t * 2) * 3})`);
    cupTag.setAttribute('opacity', smooth(T.endCuptag, T.endCuptag + 0.3, t));

    // ---- 默认隐藏 ----
    show(gOpen, false); show(gR1, false); show(gR2, false); show(gR3, false);
    show(gR4, false); show(gR5, false); show(gLedger, false);
    gRev.setAttribute('opacity', 0); gEnd.setAttribute('opacity', 0);
    [r1Chip, r2Chip, r3Chip, r4Chip, r5Chip].forEach(e => e.setAttribute('opacity', 0));

    // ================= 开场 0–2.5 =================
    if (t < T.r1In) {
      show(gOpen, true);
      openHead.setAttribute('opacity', smooth(T.headerIn, T.headerIn + 0.5, t));
      openSess.setAttribute('opacity', smooth(T.sessionIn, T.sessionIn + 0.5, t));
      openTitle.setAttribute('opacity', smooth(T.titleIn, T.titleIn + 0.5, t));
      openRule.setAttribute('opacity', smooth(T.titleIn + 0.2, T.titleIn + 0.6, t));
    }

    // ================= R1 2.5–7.0 =================
    if (t >= T.r1In && t < T.r1Out) {
      show(gR1, true); show(gLedger, true);
      const tot1 = lerp(0, 24, smooth(T.r1ScoreStart, T.r1ScoreEnd, t));
      paintLedger(0, tot1);
      const p = easeOutQuint(clamp((t - T.r1In) / 0.35, 0, 1));
      gR1.setAttribute('transform', `translate(0 ${(1 - p) * 16})`);
      const s = seqText(R1_SEQ, t);
      txt(r1Typed, s);
      const typing = t < T.r1Done;
      const caretOn = typing ? (Math.floor(t / 0.265) % 2 === 0) : false;
      r1Caret.setAttribute('opacity', caretOn ? 1 : 0);
      r1Caret.setAttribute('x', MX + 590 + s.length * 42);
      const dotsOn = t >= T.r1Done && t < T.r1ErrStart;
      r1Dots.setAttribute('opacity', dotsOn ? 1 : 0);
      if (dotsOn) for (let i = 0; i < 3; i++) {
        r1DotC[i].setAttribute('cy', 555 - Math.max(0, Math.sin(t * 6 - i * 0.9)) * 8);
      }
      const ep = smooth(T.r1ErrStart, T.r1ErrEnd, t);
      r1Ring.arc.setAttribute('opacity', ep > 0.001 ? 1 : 0);
      r1Ring.arc.setAttribute('stroke-dasharray', `${(ep * 0.12 * r1Ring.C).toFixed(1)} ${r1Ring.C.toFixed(1)}`);
      txt(r1RingPct, Math.round(ep * 12) + '%');
      const sp = smooth(T.r1ScoreStart, T.r1ScoreEnd, t);
      if (t >= T.r1ScoreStart) { r1Chip.setAttribute('opacity', 1); txt(r1Score, String(Math.round(lerp(0, 24, sp)))); }
      r1Verdict.setAttribute('opacity', smooth(T.r1Result, T.r1Result + 0.3, t));
    }

    // ================= R2 7.0–11.5 =================
    if (t >= T.r2In && t < T.r2Out) {
      show(gR2, true); show(gLedger, true);
      const tot2 = lerp(24, 41, smooth(T.r2ScoreStart, T.r2ScoreEnd, t));
      paintLedger(1, tot2);
      const p = easeOutQuint(clamp((t - T.r2In) / 0.35, 0, 1));
      gR2.setAttribute('transform', `translate(0 ${(1 - p) * 16})`);
      const sp2 = backOut(clamp((t - T.r2Sticker) / 0.45, 0, 1));
      r2Sticker.setAttribute('opacity', t >= T.r2Sticker ? 1 : 0);
      r2Sticker.setAttribute('transform', `translate(${MX + 980} 300) scale(${sp2}) translate(-120 -120)`);
      const bp = smooth(T.r2BarStart, T.r2BarEnd, t);
      r2Bar.setAttribute('width', (900 * bp).toFixed(1));
      txt(r2Pct, Math.round(bp * 87) + '%');
      const vp = smooth(T.r2ScoreStart, T.r2ScoreEnd, t);
      if (t >= T.r2ScoreStart) { r2Chip.setAttribute('opacity', 1); txt(r2Score, String(Math.round(lerp(24, 41, vp)))); }
      r2Verdict.setAttribute('opacity', smooth(T.r2Result, T.r2Result + 0.3, t));
    }

    // ================= R3 11.5–16 =================
    if (t >= T.r3In && t < T.r3Out) {
      show(gR3, true); show(gLedger, true);
      const tot3 = lerp(41, 66, smooth(T.r3ScoreStart, T.r3ScoreEnd, t));
      paintLedger(2, tot3);
      const p = easeOutQuint(clamp((t - T.r3In) / 0.35, 0, 1));
      gR3.setAttribute('transform', `translate(0 ${(1 - p) * 16})`);
      r3Ticks.setAttribute('opacity', smooth(T.r3DoubleBlue, T.r3DoubleBlue + 0.3, t));
      const tp = smooth(T.r3TimeStart, T.r3TimeEnd, t);
      const secs = Math.round(tp * 17 * 60);
      const mm3 = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss3 = String(secs % 60).padStart(2, '0');
      txt(r3Time, `${mm3}:${ss3}`);
      r3TicksGray.setAttribute('opacity', smooth(T.r3Gray, T.r3Gray + 0.3, t));
      const vp = smooth(T.r3ScoreStart, T.r3ScoreEnd, t);
      if (t >= T.r3ScoreStart) { r3Chip.setAttribute('opacity', 1); txt(r3Score, String(Math.round(lerp(41, 66, vp)))); }
      r3Verdict.setAttribute('opacity', smooth(T.r3Result, T.r3Result + 0.3, t));
    }

    // ================= R4 16–20.5 =================
    if (t >= T.r4In && t < T.r4Out) {
      show(gR4, true); show(gLedger, true);
      const tot4 = lerp(66, 91, smooth(T.r4ScoreStart, T.r4ScoreEnd, t));
      paintLedger(3, tot4);
      const p = easeOutQuint(clamp((t - T.r4In) / 0.35, 0, 1));
      let qcount = 0;
      for (const kt of T.r4Keys) if (t >= kt) qcount++;
      txt(r4Typed, '？'.repeat(qcount));
      let shake = 0;
      if (t >= T.r4Slap && t < T.r4Slap + 2 / 30) shake = (Math.round((t - T.r4Slap) * 30) % 2 ? 6 : -6);
      gR4.setAttribute('transform', `translate(${shake} ${(1 - p) * 16})`);
      const wp = backOut(clamp((t - T.r4Warn) / 0.3, 0, 1));
      r4Warn.setAttribute('opacity', t >= T.r4Warn ? 1 : 0);
      r4Warn.setAttribute('transform', `translate(${MX + 710} 540) scale(${wp}) translate(${-MX - 710} -540)`);
      const vp = smooth(T.r4ScoreStart, T.r4ScoreEnd, t);
      if (t >= T.r4ScoreStart) { r4Chip.setAttribute('opacity', 1); txt(r4Score, String(Math.round(lerp(66, 91, vp)))); }
      r4Verdict.setAttribute('opacity', smooth(T.r4Result, T.r4Result + 0.3, t));
    }

    // ================= R5 20.5–24.5 =================
    if (t >= T.r5In && t < T.r5Out) {
      show(gR5, true); show(gLedger, true);
      const tot5 = lerp(91, 100, smooth(T.r5ScoreStart, T.r5ScoreEnd, t));
      paintLedger(4, tot5);
      const p = easeOutQuint(clamp((t - T.r5In) / 0.35, 0, 1));
      gR5.setAttribute('transform', `translate(0 ${(1 - p) * 16})`);
      const R5_STR = '下周想休一天。';
      let kc = 0;
      for (const kt of T.r5Keys) if (t >= kt) kc++;
      kc = Math.min(kc, R5_STR.length);
      txt(r5Typed, R5_STR.slice(0, kc));
      const caretOn = t < T.r5Done ? (Math.floor(t / 0.265) % 2 === 0) : false;
      r5Caret.setAttribute('opacity', caretOn ? 1 : 0);
      r5Caret.setAttribute('x', MX + 70 + kc * 46);
      const rp = smooth(T.r5RingStart, T.r5RingEnd, t);
      r5Ring.arc.setAttribute('opacity', rp > 0.001 ? 1 : 0);
      r5Ring.arc.setAttribute('stroke-dasharray', `${(rp * r5Ring.C).toFixed(1)} ${r5Ring.C.toFixed(1)}`);
      txt(r5RingPct, String(Math.round(rp * 100)));
      r5RingInner.setAttribute('opacity', smooth(T.r5Check, T.r5Check + 0.25, t));
      const vp = smooth(T.r5ScoreStart, T.r5ScoreEnd, t);
      if (t >= T.r5ScoreStart) { r5Chip.setAttribute('opacity', 1); txt(r5Score, String(Math.round(lerp(91, 100, vp)))); }
      r5Verdict.setAttribute('opacity', smooth(T.r5Result, T.r5Result + 0.3, t));
    }

    // ================= 反转 24.5–28 =================
    if (t >= T.revWhite && t < T.revOut) {
      gRev.setAttribute('opacity', 1);
      const vp = easeOutQuint(clamp((t - T.revVerdict) / 0.4, 0, 1));
      revBox.setAttribute('transform', `translate(${(1 - vp) * 200} 0)`);
      revLine1.setAttribute('opacity', smooth(T.revVerdict, T.revVerdict + 0.2, t));
      revLine2.setAttribute('opacity', smooth(T.revVerdict + 0.15, T.revVerdict + 0.4, t));
      if (t >= T.revStamp) {
        const sp = easeOutCubic(clamp((t - T.revStamp) / 0.25, 0, 1));
        revStamp.setAttribute('opacity', 1);
        const w = 400 * sp, h = 110 * sp;
        stampClipRect.setAttribute('x', 960 - w / 2);
        stampClipRect.setAttribute('y', 510 + (120 - h) / 2);
        stampClipRect.setAttribute('width', w);
        stampClipRect.setAttribute('height', h);
      }
      revBadge.setAttribute('opacity', smooth(T.revBadge, T.revBadge + 0.3, t));
      const bp = smooth(T.revBadge, T.revBadge + 0.4, t);
      const sx = lerp(-1, 1, bp);
      revBadge.setAttribute('transform', `translate(1615 555) scale(${sx} 1) translate(-1615 -555)`);
      revToken.setAttribute('opacity', smooth(T.revToken, T.revToken + 0.4, t));
    }

    // ================= 结尾 28–30 =================
    if (t >= T.revOut) {
      gEnd.setAttribute('opacity', 1);
      endLine.setAttribute('opacity', smooth(T.endLine, T.endLine + 0.2, t));
      signText.setAttribute('opacity', smooth(T.signIn, T.signIn + 0.3, t));
      endCursor.setAttribute('opacity', (Math.floor(t / 0.53) % 2 === 0) ? 1 : 0);
      endCursor.setAttribute('transform', `translate(1300 628)`);
    }

    // ---- 黑场（仅前 0.12s） ----
    const bf = 1 - smooth(0, 0.12, t0);
    blackfield.setAttribute('opacity', clamp(bf, 0, 1));
  }

  window.render = render;
  render(0);
})();
