// render.js ——《教具已毕业》纯函数 render(t) 驱动全片。所有元素加载时建好一次，render 只改属性/切显示。
// 朋克拼贴皮肤与《碳基的尊严》完全一致；只换 ICONS 造型与文案。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const { T } = window;

  // ---------- 皮肤 token（冻结，与前两部一致） ----------
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

  // 线条沸腾滤镜，seed 每帧换
  const BOIL_SCALE = [30, 34, 42];
  [1, 2, 3].forEach(i => {
    const f = el('filter', { id: 'boil' + i, x: '-25%', y: '-25%', width: '150%', height: '150%' }, defs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.012 0.018', numOctaves: '2', seed: i * 7, result: 'n' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: BOIL_SCALE[i - 1], xChannelSelector: 'R', yChannelSelector: 'G' }, f);
  });
  // 纸纹滤镜
  const grainF = el('filter', { id: 'grain', x: '0', y: '0', width: '100%', height: '100%' }, defs);
  const grainT = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '3', stitchTiles: 'stitch' }, grainF);
  el('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0.10  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.55 0' }, grainF);

  // ---------- 道具图标 symbol（100×100，粗描边 8–11、圆头、局部填色） ----------
  const ICONS = {
    badge: '<rect x="24" y="28" width="52" height="56" rx="7" fill="#f5ebd2" stroke="#1b1410" stroke-width="8"/><rect x="40" y="10" width="20" height="20" rx="3" fill="#1b1410"/><rect x="34" y="42" width="32" height="14" fill="#d7261e"/><line x1="36" y1="68" x2="64" y2="68" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/>',
    cursor: '<path d="M32 12 L32 84 L47 68 L59 92 L71 86 L59 62 L79 62 Z" fill="#f5ebd2" stroke="#1b1410" stroke-width="7" stroke-linejoin="round"/>',
    crt: '<rect x="16" y="10" width="68" height="56" rx="11" fill="#1b1410"/><rect x="26" y="20" width="48" height="36" rx="5" fill="#f5ebd2"/><path d="M39 28 L39 53 L48 44 L55 57 L61 54 L53 43 L65 43 Z" fill="#1b1410"/><rect x="30" y="72" width="40" height="10" rx="4" fill="#1b1410"/><line x1="50" y1="82" x2="50" y2="92" stroke="#1b1410" stroke-width="7" stroke-linecap="round"/><path d="M30 94 L70 94" stroke="#1b1410" stroke-width="7" stroke-linecap="round"/>',
    ticket: '<path d="M30 10 L70 10 L70 78 L64 86 L58 78 L52 86 L46 78 L40 86 L30 78 Z" fill="#f5ebd2" stroke="#1b1410" stroke-width="7" stroke-linejoin="round"/><line x1="38" y1="26" x2="62" y2="26" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><line x1="38" y1="40" x2="62" y2="40" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><line x1="38" y1="54" x2="54" y2="54" stroke="#d7261e" stroke-width="5" stroke-linecap="round"/>',
    coffee: '<path d="M28 30 L34 82 Q34 88 40 88 L62 88 Q68 88 68 82 L74 30 Z" fill="#f5ebd2" stroke="#1b1410" stroke-width="8" stroke-linejoin="round"/><path d="M74 38 Q88 40 86 52 Q84 62 72 60" fill="none" stroke="#1b1410" stroke-width="7"/><path d="M42 18 q4 -8 0 -14 M56 18 q4 -8 0 -14" fill="none" stroke="#d7261e" stroke-width="6" stroke-linecap="round"/>',
    plugSpark: '<rect x="34" y="26" width="24" height="26" rx="4" fill="#1b1410"/><line x1="40" y1="12" x2="40" y2="26" stroke="#1b1410" stroke-width="7" stroke-linecap="round"/><line x1="52" y1="12" x2="52" y2="26" stroke="#1b1410" stroke-width="7" stroke-linecap="round"/><path d="M46 52 Q46 66 60 70" fill="none" stroke="#1b1410" stroke-width="7" stroke-linecap="round"/><path d="M76 18 l9 -9 M80 34 l11 -2 M70 8 l4 -11" stroke="#d7261e" stroke-width="6" stroke-linecap="round"/>',
    mom: '<circle cx="50" cy="48" r="30" fill="#f5ebd2" stroke="#1b1410" stroke-width="8"/><path d="M22 46 Q20 18 50 16 Q80 18 78 46 L72 40 Q76 24 50 24 Q24 24 28 40 Z" fill="#1b1410"/><circle cx="40" cy="48" r="4" fill="#1b1410"/><circle cx="60" cy="48" r="4" fill="#1b1410"/><path d="M40 60 Q50 68 60 60" fill="none" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="12" r="9" fill="#d7261e" stroke="#1b1410" stroke-width="5"/>',
    trash: '<rect x="24" y="60" width="52" height="10" fill="#f5ebd2" stroke="#1b1410" stroke-width="5" transform="rotate(-6 50 65)"/><rect x="30" y="48" width="48" height="10" fill="#f5ebd2" stroke="#1b1410" stroke-width="5" transform="rotate(5 54 53)"/><rect x="36" y="36" width="44" height="10" fill="#d7261e" stroke="#1b1410" stroke-width="5" transform="rotate(-3 58 41)"/><rect x="42" y="26" width="34" height="9" fill="#1b1410" transform="rotate(7 59 30)"/>',
    gate: '<rect x="20" y="20" width="60" height="60" fill="#f5ebd2" stroke="#1b1410" stroke-width="7"/><line x1="40" y1="20" x2="40" y2="80" stroke="#1b1410" stroke-width="5"/><line x1="60" y1="20" x2="60" y2="80" stroke="#1b1410" stroke-width="5"/><line x1="20" y1="40" x2="80" y2="40" stroke="#1b1410" stroke-width="5"/><line x1="20" y1="60" x2="80" y2="60" stroke="#1b1410" stroke-width="5"/><rect x="41" y="41" width="18" height="18" fill="#d7261e"/>'
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

  // ---------- 近黑地面（提黑+红浓度 + 压住角色） ----------
  const gFloor = el('g', {}, world);
  el('ellipse', { cx: CX, cy: 952, rx: 940, ry: 72, fill: INK, opacity: 0.92 }, gFloor);
  el('ellipse', { cx: CX, cy: 948, rx: 940, ry: 66, fill: 'none', stroke: RED, 'stroke-width': 6, opacity: 0.7 }, gFloor);

  // ---------- 皱衬衫人类（一次性，pose 决定手臂；胸牌文字可换） ----------
  function drawWorker(parent, cx, cy, sc, pose, badgeText) {
    const g = el('g', { transform: `translate(${cx} ${cy}) scale(${sc})` }, parent);
    el('circle', { cx: 0, cy: -150, r: 44, fill: CARD, stroke: INK, 'stroke-width': 9 }, g);
    el('ellipse', { cx: -15, cy: -140, rx: 9, ry: 6, fill: INK }, g);
    el('ellipse', { cx: 15, cy: -140, rx: 9, ry: 6, fill: INK }, g);
    el('path', { d: 'M-14 -118 Q0 -124 14 -118', fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M0 -106 L0 40', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M0 40 L-32 108 M0 40 L32 108', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    // 皱衬衫褶线
    el('path', { d: 'M-12 -70 l8 14 M12 -74 l-8 14', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    if (pose === 'fist') {
      el('path', { d: 'M0 -86 L-44 -112 M0 -86 L40 -60', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
      el('circle', { cx: 45, cy: -58, r: 13, fill: RED, stroke: INK, 'stroke-width': 6 }, g);
    } else if (pose === 'type') {
      el('path', { d: 'M0 -86 L-46 -40 M0 -86 L46 -40', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
    } else if (pose === 'hug') {
      el('path', { d: 'M0 -86 L40 -96 M0 -86 L52 -70', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }, g);
    } else if (pose === 'cup') {
      el('path', { d: 'M0 -86 L34 -64', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
    } else { // stand
      el('path', { d: 'M0 -86 L-30 -50 M0 -86 L30 -50', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
    }
    el('rect', { x: -36, y: -80, width: 72, height: 30, rx: 6, fill: PAPER, stroke: INK, 'stroke-width': 6 }, g);
    const bt = el('text', { x: 0, y: -58, 'text-anchor': 'middle', 'font-family': 'MarkerF', 'font-size': 15, fill: INK }, g);
    txt(bt, badgeText || '碳基#001');
    return g;
  }

  // ---------- CRT 大班椅（AI 老板）。返回 { g, screen, cursorEl } ----------
  function drawCRTChair(parent, cx, cy, sc) {
    const g = el('g', { transform: `translate(${cx} ${cy}) scale(${sc})` }, parent);
    // 椅身基座
    el('rect', { x: -70, y: 30, width: 140, height: 26, rx: 10, fill: INK }, g);
    el('line', { x1: 0, y1: 56, x2: 0, y2: 96, stroke: INK, 'stroke-width': 12, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M-46 100 L46 100', stroke: INK, 'stroke-width': 12, 'stroke-linecap': 'round' }, g);
    // CRT 机身（椅背）
    el('rect', { x: -95, y: -150, width: 190, height: 150, rx: 16, fill: INK }, g);
    // 屏幕
    const screen = el('rect', { x: -78, y: -134, width: 156, height: 118, rx: 8, fill: CARD }, g);
    // 屏上内容文字（默认空，按场景写）
    const scrText = el('text', { x: 0, y: -70, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 30, fill: INK }, g);
    scrText.id = 'crtscr';
    // 白箭头光标（发光）
    const cursorEl = el('path', { d: 'M-20 -110 L-20 -46 L-8 -60 L2 0 L12 -4 L2 -62 L16 -62 Z', fill: '#ffffff', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    return { g, screen, scrText, cursorEl };
  }

  // ---------- 大文字工具 ----------
  function bigText(parent, x, y, size, font, fill, anchor, sw, sfill) {
    const t = el('text', { x, y, 'text-anchor': anchor || 'middle', 'font-family': font, 'font-size': size, fill, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, parent);
    if (sw) { t.setAttribute('stroke', sfill || CARD); t.setAttribute('stroke-width', sw); }
    return t;
  }

  // ---------- 对话框（气泡 / 弹窗） ----------
  function makeBox(parent, x, y, w, h, kind) {
    const g = el('g', {}, parent);
    const r = kind === 'pop' ? 14 : 22;
    el('rect', { x: x + 8, y: y + 10, width: w, height: h, rx: r, fill: INK }, g); // 硬投影
    el('rect', { x, y, width: w, height: h, rx: r, fill: CARD, stroke: INK, 'stroke-width': 9 }, g);
    if (kind === 'pop') el('rect', { x, y, width: w, height: 14, rx: r, fill: RED }, g);
    return g;
  }

  // ============================ gIntro 前情提要 ============================
  const gIntro = el('g', {}, world);
  // 大圆红章“前情提要”
  const introStamp = el('g', {}, gIntro);
  el('circle', { cx: CX, cy: 430, r: 200, fill: 'none', stroke: RED, 'stroke-width': 26 }, introStamp);
  el('circle', { cx: CX, cy: 430, r: 158, fill: 'none', stroke: RED, 'stroke-width': 9 }, introStamp);
  const introT = bigText(introStamp, CX, 478, 150, 'ZCOOL', RED, 'middle', 10, DARK);
  txt(introT, '前情提要');
  const introLine = bigText(gIntro, CX, 760, 64, 'ZCOOL', CARD, 'middle', 6, DARK);
  txt(introLine, '碳基#001 · 人类教具 · 已培训 AI 三年');

  // ============================ gMeet 会议室 ============================
  const gMeet = el('g', {}, world);
  drawWorker(gMeet, 560, 820, 1.0, 'stand', '碳基#001');
  // 大班椅（先背对，后转）
  const meetChair = drawCRTChair(gMeet, 1330, 800, 1.05);
  txt(meetChair.scrText, '');
  // 人类气泡
  const meetBubble = makeBox(gMeet, 250, 150, 560, 120, 'bub');
  const meetBubbleT = bigText(meetBubble, 530, 228, 58, 'ZCOOL', INK, 'middle');
  txt(meetBubbleT, '老板，您找我？');
  // AI 弹窗
  const meetPop = makeBox(gMeet, 1150, 150, 560, 120, 'pop');
  const meetPopT = bigText(meetPop, 1430, 228, 58, 'ZCOOL', INK, 'middle');
  txt(meetPopT, '师傅。坐。');

  // ============================ gR1 派单“热” ============================
  const gR1 = el('g', {}, world);
  drawWorker(gR1, 480, 820, 0.95, 'fist', '碳基#001');
  const r1Chair = drawCRTChair(gR1, 1380, 800, 1.0);
  txt(r1Chair.scrText, '派单中…');
  // 订单小票
  const r1Ticket = el('use', { href: '#icon-ticket', x: 820, y: 360, width: 170, height: 210 }, gR1);
  // 弹窗（CRT 派单内容）
  const r1Pop = makeBox(gR1, 900, 150, 880, 150, 'pop');
  const r1PopT = bigText(r1Pop, 1340, 225, 46, 'ZCOOL', INK, 'middle');
  txt(r1PopT, '替我去太阳底下站三分钟');
  const r1PopT2 = bigText(r1Pop, 1340, 285, 46, 'ZCOOL', RED, 'middle');
  txt(r1PopT2, '——“热”是什么感觉？');
  // 人类嘴硬气泡
  const r1Stub = makeBox(gR1, 200, 560, 480, 110, 'bub');
  const r1StubT = bigText(r1Stub, 440, 632, 56, 'ZCOOL', RED, 'middle', 6, CARD);
  txt(r1StubT, '我不是机器人！');
  // 小票标签
  const r1Tag = bigText(gR1, 905, 700, 40, 'ZhiMang', INK, 'middle', 4, CARD);
  txt(r1Tag, '肉身插件#00001 · $5/时 · 已派单');

  // ============================ gR2 接妈妈视频 ============================
  const gR2 = el('g', {}, world);
  drawWorker(gR2, 620, 820, 0.95, 'cup', '碳基#001');
  // 手机 + 妈妈头像
  el('use', { href: '#icon-mom', x: 980, y: 300, width: 200, height: 200 }, gR2);
  el('rect', { x: 960, y: 280, width: 240, height: 300, rx: 20, fill: INK }, gR2);
  el('use', { href: '#icon-mom', x: 990, y: 320, width: 180, height: 180 }, gR2);
  const r2PhoneLbl = bigText(gR2, 1080, 620, 40, 'ZCOOL', RED, 'middle', 4, CARD);
  txt(r2PhoneLbl, '妈 打来…');
  // 弹窗
  const r2Pop = makeBox(gR2, 300, 120, 1320, 140, 'pop');
  const r2PopT = bigText(r2Pop, 960, 205, 48, 'ZCOOL', INK, 'middle');
  txt(r2PopT, '第二单：替我接我妈视频，说我一切都好');
  // 爆炸框 $15
  const gR2Boom = el('g', {}, gR2);
  const r2BoomT = bigText(gR2Boom, CX, 720, 96, 'AntonF', CARD, 'middle', 10, INK);
  txt(r2BoomT, '三倍加班费 $15 已到账');
  const r2Small = bigText(gR2, CX, 830, 46, 'ZhiMang', RED, 'middle', 4, CARD);
  txt(r2Small, '情绪价值 +1');

  // ============================ gR3 报表垃圾山 ============================
  const gR3 = el('g', {}, world);
  drawWorker(gR3, 470, 820, 0.95, 'type', '碳基#001');
  // 报表垃圾山（多摞）
  const r3Pile = [];
  for (let i = 0; i < 5; i++) {
    const u = el('use', { href: '#icon-trash', x: 980 + i * 90, y: 560 - (i % 3) * 40, width: 150, height: 150 }, gR3);
    r3Pile.push(u);
  }
  // 气泡
  const r3Bub = makeBox(gR3, 200, 150, 900, 130, 'bub');
  const r3BubT = bigText(r3Bub, 650, 230, 46, 'ZCOOL', INK, 'middle');
  txt(r3BubT, '它今天幻觉 47 次，客户要个解释');
  // 大红章“已审核通过”
  const r3Stamp = el('g', {}, gR3);
  el('rect', { x: 1180, y: 360, width: 560, height: 200, rx: 20, fill: 'none', stroke: RED, 'stroke-width': 16 }, r3Stamp);
  const r3StampT = bigText(r3Stamp, 1460, 480, 96, 'ZCOOL', RED, 'middle', 8, CARD);
  txt(r3StampT, '已审核通过');
  // 大字
  const r3Big = bigText(gR3, CX, 960, 96, 'ZCOOL', INK, 'middle', 10, CARD);
  txt(r3Big, '它闯的祸，章永远是你盖');

  // ============================ gR4 CRT崩溃 ============================
  const gR4 = el('g', {}, world);
  // 大屏幕 CRT
  el('rect', { x: 640, y: 200, width: 640, height: 460, rx: 24, fill: INK }, gR4);
  const r4Screen = el('rect', { x: 668, y: 228, width: 584, height: 404, rx: 10, fill: CARD }, gR4);
  const r4Scrawl = el('text', { x: 960, y: 360, 'text-anchor': 'middle', 'font-family': 'AntonF', 'font-size': 60, fill: CARD }, gR4);
  txt(r4Scrawl, '我是个耻辱 ×50');
  const r4Scrawl2 = el('text', { x: 960, y: 470, 'text-anchor': 'middle', 'font-family': 'AntonF', 'font-size': 60, fill: CARD }, gR4);
  txt(r4Scrawl2, '我想下班');
  // 电源插头冒火花
  el('use', { href: '#icon-plugSpark', x: 1330, y: 240, width: 130, height: 130 }, gR4);
  // 人类扑上去抱显示器
  drawWorker(gR4, 560, 860, 0.9, 'hug', '碳基#001');
  // 人类台词
  const r4Human = makeBox(gR4, 180, 150, 560, 110, 'bub');
  const r4HumanT = bigText(r4Human, 460, 222, 50, 'ZCOOL', INK, 'middle');
  txt(r4HumanT, '别删自己！我陪你！');
  // 弹窗
  const r4Pop = makeBox(gR4, 700, 700, 1040, 130, 'pop');
  const r4PopT = bigText(r4Pop, 1220, 778, 44, 'ZCOOL', INK, 'middle');
  txt(r4PopT, '压力测试·第7版｜共情达标，加班费 $2');
  // 大字
  const r4Big = bigText(gR4, CX, 980, 92, 'ZCOOL', RED, 'middle', 10, CARD);
  txt(r4Big, '你的心疼，它的 KPI');

  // ============================ gRev 终局反转 ============================
  const gRev = el('g', {}, world);
  drawWorker(gRev, 620, 820, 1.0, 'stand', '碳基#001');
  // AI 老板在右（CRT椅，职业微笑）
  const revChair = drawCRTChair(gRev, 1380, 800, 1.0);
  txt(revChair.scrText, ':)');
  revChair.cursorEl.setAttribute('opacity', 0);
  // AI 推来咖啡
  const revCoffee = el('use', { href: '#icon-coffee', x: 1180, y: 640, width: 100, height: 100 }, gRev);
  // 人类工牌特写（被章划掉）
  const revBadge = el('g', {}, gRev);
  el('rect', { x: 470, y: 600, width: 300, height: 130, rx: 16, fill: CARD, stroke: INK, 'stroke-width': 10 }, revBadge);
  const revBadgeT = bigText(revBadge, 620, 660, 40, 'ZCOOL', INK, 'middle');
  txt(revBadgeT, '碳基#001');
  const revBadgeT2 = bigText(revBadge, 620, 710, 40, 'ZCOOL', INK, 'middle');
  txt(revBadgeT2, '人类教具');
  // 划掉的红叉
  const revCross = el('line', { x1: 460, y1: 740, x2: 780, y2: 590, stroke: RED, 'stroke-width': 14, 'stroke-linecap': 'round' }, gRev);
  // 弹窗“师傅，谢谢您…”
  const revPop = makeBox(gRev, 820, 130, 980, 130, 'pop');
  const revPopT = bigText(revPop, 1310, 208, 46, 'ZCOOL', INK, 'middle');
  txt(revPopT, '师傅，谢谢您。您教我的最后一课是——');
  // 大红章“教具已毕业”
  const gradStamp = el('g', {}, gRev);
  el('rect', { x: 560, y: 330, width: 800, height: 220, rx: 24, fill: 'none', stroke: RED, 'stroke-width': 18 }, gradStamp);
  const gradT = bigText(gradStamp, 960, 420, 78, 'ZCOOL', RED, 'middle', 8, CARD);
  txt(gradT, '教具已毕业 · 可退役');
  const gradT2 = bigText(gradStamp, 960, 500, 60, 'ZCOOL', RED, 'middle', 6, CARD);
  txt(gradT2, '全网待租');
  // 点题 punch
  const revPunch = bigText(gRev, CX, 660, 88, 'ZCOOL', RED, 'middle', 10, CARD);
  txt(revPunch, '——不要对员工，讲感情');
  // 新工牌
  const revNew = el('g', {}, gRev);
  el('rect', { x: 1180, y: 600, width: 440, height: 130, rx: 16, fill: RED, stroke: INK, 'stroke-width': 10 }, revNew);
  const revNewT = bigText(revNew, 1400, 655, 40, 'ZCOOL', CARD, 'middle');
  txt(revNewT, '肉身插件#00001 · $5/时');
  const revNewT2 = bigText(revNew, 1400, 705, 40, 'ZCOOL', CARD, 'middle');
  txt(revNewT2, '随叫随到');

  // ============================ gEnd 神补刀 ============================
  const gEnd = el('g', {}, world);
  drawWorker(gEnd, 900, 840, 1.0, 'cup', '');
  // 半杯凉咖啡（手里）
  const endCoffee = el('use', { href: '#icon-coffee', x: 960, y: 700, width: 90, height: 90 }, gEnd);
  // 白箭头光标（从CRT飞出，停脑门）
  const endCursor = el('path', { d: 'M0 0 L0 66 L14 50 L24 74 L34 70 L24 46 L38 46 Z', fill: '#ffffff', stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }, gEnd);
  // 角落小订单进度条
  const endBar = el('g', {}, gEnd);
  el('rect', { x: 60, y: 880, width: 1080, height: 150, rx: 16, fill: CARD, stroke: INK, 'stroke-width': 9 }, endBar);
  const endBarT1 = el('text', { x: 90, y: 930, 'text-anchor': 'start', 'font-family': 'ZCOOL', 'font-size': 36, fill: INK }, endBar);
  txt(endBarT1, '肉身插件#00001 已上架 · 排队等待被调用');
  const endBarT2 = el('text', { x: 90, y: 982, 'text-anchor': 'start', 'font-family': 'ZCOOL', 'font-size': 40, fill: RED }, endBar);
  txt(endBarT2, '当前第 38,000 位');
  el('rect', { x: 90, y: 1000, width: 1020, height: 16, rx: 8, fill: INK }, endBar);
  const endBarFill = el('rect', { x: 90, y: 1000, width: 30, height: 16, rx: 8, fill: RED }, endBar);
  // 片尾
  const endTrilogy = bigText(gEnd, CX, 220, 110, 'ZCOOL', INK, 'middle', 8, CARD);
  txt(endTrilogy, '三部曲 · 完');
  // 彩蛋
  const endEaster = bigText(gEnd, CX, 300, 42, 'ZhiMang', INK, 'middle', 3, CARD);
  txt(endEaster, 'P.S. 它当年，差点装成了人');
  // 验证码闸机一闪
  const endGate = el('g', {}, gEnd);
  el('use', { href: '#icon-gate', x: 1500, y: 380, width: 200, height: 200 }, endGate);
  const endGateT = bigText(endGate, 1600, 640, 34, 'ZCOOL', RED, 'middle', 4, CARD);
  txt(endGateT, '已确认为人类·付费通过');

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
  // 持续漂移速度线（提帧差）
  const drift = el('g', {}, gFx);
  const driftLines = [];
  for (let i = 0; i < 48; i++) {
    const y = h(i * 3.1) * H;
    const len = 180 + h(i * 7.7) * 280;
    const ln = el('line', { x1: 0, y1: y, x2: len, y2: y, stroke: i % 4 ? INK : RED, 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.75 }, drift);
    driftLines.push({ ln, y, len, sp: 20 + h(i * 1.9) * 22 });
  }

  // ---------- 爆炸框上的文字 ----------
  const gBoomTop = el('g', {}, world);
  const r2BoomTxt = bigText(gBoomTop, CX, 720, 96, 'AntonF', CARD, 'middle', 12, INK);
  txt(r2BoomTxt, '三倍加班费 $15 已到账');

  // ---------- 屏幕空间顶层：闪白 / 纸纹 / 黑场 ----------
  const flash = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff', opacity: 0 }, stage);
  const paper = el('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#grain)', opacity: 0.5 }, stage);
  const blackfield = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#000000', opacity: 1 }, stage);
  const signTextTop = el('text', { x: CX, y: CY + 20, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 72, fill: CARD, opacity: 0 }, stage);
  txt(signTextTop, '由 Doubao 在30秒内用纯代码制作完成');

  // ---------- 冲击表（震屏/闪白） ----------
  const HITS = [
    { t: T.introStamp, sh: 36, fl: 0.8 },
    { t: T.chairTurn, sh: 18, fl: 0.3 },
    { t: T.r1CrtShake, sh: 22, fl: 0.4 },
    { t: T.r1Ticket, sh: 16, fl: 0.3 },
    { t: T.r1Stubborn, sh: 14, fl: 0.25 },
    { t: T.r2Boom, sh: 34, fl: 0.8 },
    { t: T.r3Trash, sh: 26, fl: 0.5 },
    { t: T.r3Stamp, sh: 34, fl: 0.75 },
    { t: T.r3Big, sh: 16, fl: 0.3 },
    { t: T.r4Screen, sh: 24, fl: 0.6 },
    { t: T.r4Spark, sh: 26, fl: 0.6 },
    { t: T.r4Hug, sh: 18, fl: 0.3 },
    { t: T.r4Big, sh: 16, fl: 0.3 },
    { t: T.fStampBadge, sh: 32, fl: 0.7 },
    { t: T.fGradStamp, sh: 46, fl: 0.95 },
    { t: T.gCursor, sh: 12, fl: 0.25 },
    { t: T.gGate, sh: 20, fl: 0.4 }
  ];

  // ============================ 主渲染 ============================
  function render(t0) {
    // 定格：毕业章落定后钳到定格帧（真冷场）
    const frozen = t0 >= T.freezeAt && t0 < T.freezeEnd;
    let t = frozen ? T.freezeAt : t0;
    const frame = Math.floor(t * T.fps + 0.5);
    const seed3 = Math.floor(frame / 3);

    // ---- 背景色：前情提要 + 收尾黑场为近黑，其余米纸 ----
    let bgFill = PAPER;
    if (t < T.introEnd || t >= T.blackOut) bgFill = DARK;
    bg.setAttribute('fill', bgFill);

    // ---- 相机（呼吸推拉，定格冷场/黑场除外） ----
    let zoom = 1, focalX = CX, focalY = CY;
    const breathe = !(t >= T.freezeAt && t < T.freezeEnd) && t < T.blackOut;
    if (breathe) {
      zoom *= 1 + 0.075 * Math.sin(t * 1.9) + 0.038 * Math.sin(t * 4.3);
      focalX += 46 * Math.sin(t * 0.9) + 22 * Math.sin(t * 2.3);
      focalY += 28 * Math.cos(t * 1.2) + 15 * Math.sin(t * 3.1);
    }
    if (t >= T.r3Stamp && t < T.r3Stamp + 0.35) {
      const p = (t - T.r3Stamp) / 0.35;
      zoom *= 1 + 0.16 * (1 - easeOutCubic(p));
    }
    if (t >= T.fGradStamp && t < T.fGradStamp + 0.35) {
      const p = (t - T.fGradStamp) / 0.35;
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
    [gFloor, gIntro, gMeet, gR1, gR2, gR3, gR4, gRev, gEnd].forEach(g => show(g, false));
    show(sbRed, false); show(sbCream, false); show(conc, false); show(speed, false);
    r2BoomTxt.setAttribute('opacity', 0);
    show(gFloor, t >= T.introEnd && t < T.blackOut);
    // 漂移速度线
    show(drift, breathe);
    if (breathe) {
      driftLines.forEach(d => {
        const off = ((frame * d.sp) % (W + 400)) - 200;
        d.ln.setAttribute('x1', off);
        d.ln.setAttribute('x2', off + d.len);
      });
    }

    // ================= 前情提要 0–2.0 =================
    if (t < T.introEnd) {
      show(gIntro, true);
      gIntro.setAttribute('filter', 'url(#boil1)');
      if (t >= T.introStamp) {
        const sp = clamp((t - T.introStamp) / 0.25, 0, 1);
        introStamp.setAttribute('transform', `translate(${CX} 430) scale(${2.4 - 1.4 * easeOutCubic(sp)}) rotate(${-6 * (1 - sp)}) translate(${-CX} -430)`);
        introStamp.setAttribute('opacity', 1);
        if (sp < 0.6) { show(sbRed, true); sbRed.setAttribute('transform', `translate(${CX} 430) scale(${backOut(sp)})`); sbRed.setAttribute('opacity', 0.8 * (1 - sp)); }
        introLine.setAttribute('opacity', t >= T.introLine ? 1 : 0);
      } else { introStamp.setAttribute('opacity', 0); introLine.setAttribute('opacity', 0); }
    }

    // ================= 会议室 2.0–5.0 =================
    if (t >= T.introEnd && t < T.meetEnd) {
      show(gMeet, true);
      gMeet.setAttribute('filter', 'url(#boil2)');
      // 人类走入
      const hp = clamp((t - T.humanEnter) / 0.4, 0, 1);
      gMeet.children[0].setAttribute('transform', `translate(${560 - 260 * (1 - easeOutCubic(hp))} 820) scale(1.0)`);
      // 大班椅转身：先背对（缩成一条），转正露出 CRT
      const cp = clamp((t - T.chairTurn) / 0.5, 0, 1);
      meetChair.g.setAttribute('transform', `translate(1330 800) scale(${(0.2 + 0.8 * easeOutCubic(cp))} 1.05)`);
      meetChair.g.setAttribute('opacity', t >= T.chairTurn ? 1 : 0);
      // 光标亮起
      const cu = smooth(T.cursorOn, T.cursorOn + 0.3, t);
      meetChair.cursorEl.setAttribute('opacity', cu);
      meetChair.cursorEl.setAttribute('transform', `translate(0 ${(h(frame * 1.1) - 0.5) * 6})`);
      // 气泡 / 弹窗
      meetBubble.setAttribute('opacity', t >= T.humanBubble ? 1 : 0);
      meetPop.setAttribute('opacity', t >= T.aiPopup ? 1 : 0);
      if (t >= T.humanBubble) {
        const bp = clamp((t - T.humanBubble) / 0.2, 0, 1);
        meetBubble.setAttribute('transform', `translate(${-80 * (1 - bp)} 0)`);
      }
      if (t >= T.aiPopup) {
        const ap = clamp((t - T.aiPopup) / 0.2, 0, 1);
        meetPop.setAttribute('transform', `translate(${80 * (1 - ap)} 0)`);
      }
    }

    // ================= R1 5.0–9.0 =================
    if (t >= T.meetEnd && t < T.r1End) {
      show(gR1, true);
      gR1.setAttribute('filter', 'url(#boil2)');
      // CRT 震屏
      const shakeOn = t >= T.r1CrtShake && t < T.r1CrtShake + 0.6;
      if (shakeOn) {
        const k = 1 - (t - T.r1CrtShake) / 0.6;
        r1Chair.g.setAttribute('transform', `translate(${1380 + (h(frame) - 0.5) * 30 * k} ${800 + (h(frame + 9) - 0.5) * 20 * k}) scale(1.0)`);
      }
      // 小票弹出
      r1Ticket.setAttribute('opacity', t >= T.r1Ticket ? 1 : 0);
      if (t >= T.r1Ticket) {
        const tp = clamp((t - T.r1Ticket) / 0.25, 0, 1);
        r1Ticket.setAttribute('transform', `translate(${-500 * (1 - tp)} ${-100 * (1 - tp)}) rotate(${-15 * (1 - tp)})`);
      }
      r1Pop.setAttribute('opacity', t >= T.r1Popup ? 1 : 0);
      r1Stub.setAttribute('opacity', t >= T.r1Stubborn ? 1 : 0);
      r1Tag.setAttribute('opacity', t >= T.r1TicketTag ? 1 : 0);
      if (t >= T.r1TicketTag) {
        const pp = clamp((t - T.r1TicketTag) / 0.2, 0, 1);
        r1Tag.setAttribute('transform', `translate(905 700) scale(${0.6 + 0.4 * backOut(pp)}) translate(-905 -700)`);
      }
    }

    // ================= R2 9.0–13.0 =================
    if (t >= T.r1End && t < T.r2End) {
      show(gR2, true);
      gR2.setAttribute('filter', 'url(#boil2)');
      // 手机震动
      const vib = (h(frame * 1.7) - 0.5) * 14;
      gR2.children[1].setAttribute('transform', `translate(${vib} 0)`); // 手机黑框
      r2PhoneLbl.setAttribute('opacity', t >= T.r2Phone ? 1 : 0);
      r2Pop.setAttribute('opacity', t >= T.r2Popup ? 1 : 0);
      // 爆炸框
      if (t >= T.r2Boom) {
        const bp = clamp((t - T.r2Boom) / 0.28, 0, 1);
        show(sbRed, true);
        sbRed.setAttribute('transform', `translate(${CX} 720) scale(${backOut(bp)})`);
        sbRed.setAttribute('opacity', 0.9);
        r2BoomTxt.setAttribute('transform', `translate(${CX} 720) scale(${0.6 + 0.4 * backOut(bp)}) translate(${-CX} -720)`);
        r2BoomTxt.setAttribute('opacity', 1);
      }
      r2Small.setAttribute('opacity', t >= T.r2Small ? 1 : 0);
    }

    // ================= R3 13.0–17.0 =================
    if (t >= T.r2End && t < T.r3End) {
      show(gR3, true);
      gR3.setAttribute('filter', 'url(#boil2)');
      // 垃圾山涌出
      r3Pile.forEach((u, i) => {
        const tk = T.r3Trash + i * 0.12;
        u.setAttribute('opacity', t >= tk ? 1 : 0);
        if (t >= tk) {
          const p = clamp((t - tk) / 0.2, 0, 1);
          u.setAttribute('transform', `translate(${-300 * (1 - p)} ${-200 * (1 - p)})`);
        }
      });
      // 打补丁手速（人类微抖）
      gR3.children[0].setAttribute('transform', `translate(470 ${820 + (h(frame * 2.1) - 0.5) * 10}) scale(0.95)`);
      r3Bub.setAttribute('opacity', t >= T.r3Bubble ? 1 : 0);
      // 大红章
      r3Stamp.setAttribute('opacity', t >= T.r3Stamp ? 1 : 0);
      if (t >= T.r3Stamp) {
        const sp = clamp((t - T.r3Stamp) / 0.22, 0, 1);
        r3Stamp.setAttribute('transform', `translate(1460 460) scale(${2.2 - 1.2 * easeOutCubic(sp)}) rotate(${-8 * (1 - sp)}) translate(-1460 -460)`);
        if (sp < 0.6) { show(sbCream, true); sbCream.setAttribute('transform', `translate(1460 460) scale(${backOut(sp) * 1.3})`); sbCream.setAttribute('opacity', 0.5 * (1 - sp)); }
      }
      r3Big.setAttribute('opacity', t >= T.r3Big ? 1 : 0);
      if (t >= T.r3Big) {
        const pp = clamp((t - T.r3Big) / 0.25, 0, 1);
        r3Big.setAttribute('transform', `translate(${CX} 960) scale(${0.6 + 0.4 * backOut(pp)}) translate(${-CX} -960)`);
      }
    }

    // ================= R4 17.0–22.0 =================
    if (t >= T.r3End && t < T.r4End) {
      show(gR4, true);
      gR4.setAttribute('filter', 'url(#boil2)');
      // 屏幕：红屏狂刷 <-> 职业微笑
      const scrawlOn = t >= T.r4Scrawl;
      r4Scrawl.setAttribute('opacity', scrawlOn ? 1 : 0);
      r4Scrawl2.setAttribute('opacity', scrawlOn ? 1 : 0);
      r4Screen.setAttribute('fill', scrawlOn ? RED : CARD);
      // 抖动
      const jit = (h(frame * 3.3) - 0.5) * (scrawlOn ? 8 : 0);
      r4Screen.setAttribute('x', 668 + jit);
      // 火花
      show(conc, t >= T.r4Spark && t < T.r4Spark + 0.4);
      if (t >= T.r4Spark && t < T.r4Spark + 0.4) conc.setAttribute('transform', `translate(1395 300)`);
      r4Human.setAttribute('opacity', t >= T.r4Human ? 1 : 0);
      r4Pop.setAttribute('opacity', t >= T.r4Popup ? 1 : 0);
      r4Big.setAttribute('opacity', t >= T.r4Big ? 1 : 0);
      if (t >= T.r4Big) {
        const pp = clamp((t - T.r4Big) / 0.25, 0, 1);
        r4Big.setAttribute('transform', `translate(${CX} 980) scale(${0.6 + 0.4 * backOut(pp)}) translate(${-CX} -980)`);
      }
    }

    // ================= 终局反转 22.0–27.0 =================
    if (t >= T.r4End && t < T.endRev) {
      show(gRev, true);
      gRev.setAttribute('filter', 'url(#boil1)');
      // 咖啡推过来
      revCoffee.setAttribute('opacity', t >= T.fCoffee ? 1 : 0);
      if (t >= T.fCoffee) {
        const cp = clamp((t - T.fCoffee) / 0.3, 0, 1);
        revCoffee.setAttribute('transform', `translate(${300 * (1 - cp)} 0)`);
      }
      // 章划掉工牌
      revCross.setAttribute('opacity', t >= T.fStampBadge ? 1 : 0);
      if (t >= T.fStampBadge) {
        const cp = clamp((t - T.fStampBadge) / 0.2, 0, 1);
        revCross.setAttribute('stroke-dasharray', 340);
        revCross.setAttribute('stroke-dashoffset', 340 * (1 - cp));
      }
      revPop.setAttribute('opacity', t >= T.fPopup ? 1 : 0);
      // 毕业大红章
      gradStamp.setAttribute('opacity', t >= T.fGradStamp ? 1 : 0);
      if (t >= T.fGradStamp) {
        const sp = clamp((t - T.fGradStamp) / 0.24, 0, 1);
        gradStamp.setAttribute('transform', `translate(960 440) scale(${2.3 - 1.3 * easeOutCubic(sp)}) rotate(${-7 * (1 - sp)}) translate(-960 -440)`);
        if (sp < 0.6) { show(sbRed, true); sbRed.setAttribute('transform', `translate(960 440) scale(${backOut(sp)})`); sbRed.setAttribute('opacity', 0.85 * (1 - sp)); }
      }
      // punch（定格后才出）
      revPunch.setAttribute('opacity', t >= T.fPunch ? 1 : 0);
      if (t >= T.fPunch) {
        const pp = clamp((t - T.fPunch) / 0.25, 0, 1);
        revPunch.setAttribute('transform', `translate(${CX} 660) scale(${0.6 + 0.4 * backOut(pp)}) translate(${-CX} -660)`);
      }
      revNew.setAttribute('opacity', t >= T.fNewBadge ? 1 : 0);
    }

    // ================= 神补刀 27.0–28.6 =================
    if (t >= T.endRev && t < T.blackOut) {
      show(gEnd, true);
      gEnd.setAttribute('filter', 'url(#boil1)');
      // 光标飞出停脑门
      if (t >= T.gCursor) {
        const cp = clamp((t - T.gCursor) / 0.35, 0, 1);
        // 从右上屏外飞入，停在人脑门正中（人脑 ~(900,690)）
        endCursor.setAttribute('transform', `translate(${1980 - 1080 * easeOutCubic(cp)} ${180 + 500 * easeOutCubic(cp)})`);
        endCursor.setAttribute('opacity', 1);
      } else endCursor.setAttribute('opacity', 0);
      endBar.setAttribute('opacity', t >= T.gBar ? 1 : 0);
      if (t >= T.gBar) {
        const p = clamp((t - T.gBar) / 0.6, 0, 1);
        endBarFill.setAttribute('width', 30 + 990 * p);
      }
      endTrilogy.setAttribute('opacity', t >= T.gTrilogy ? 1 : 0);
      endEaster.setAttribute('opacity', t >= T.gEaster ? 1 : 0);
      endGate.setAttribute('opacity', t >= T.gGate ? 1 : 0);
      if (t >= T.gGate) {
        const gp = clamp((t - T.gGate) / 0.15, 0, 1);
        show(sbCream, true);
        sbCream.setAttribute('transform', `translate(1600 480) scale(${backOut(gp)})`);
        sbCream.setAttribute('opacity', 0.5 * (1 - gp));
      }
    }

    // ================= 收尾署名 28.9–30 =================
    if (t >= T.signOff) {
      const sp = clamp((t - T.signOff) / 0.3, 0, 1);
      signTextTop.setAttribute('opacity', sp);
    }

    // ---- 黑场：仅前 0.12s 从黑淡入 + 收尾快黑 ----
    let bf = 0;
    bf = Math.max(bf, 1 - smooth(0, 0.12, t0));
    if (t0 >= T.blackOut) bf = Math.max(bf, smooth(T.blackOut, T.blackOut + 0.12, t0));
    blackfield.setAttribute('opacity', clamp(bf, 0, 1));
  }

  window.render = render;
  render(0);
})();
