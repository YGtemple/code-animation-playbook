// render.js —— 《冗余变量 X-07》包豪斯/瑞士网格几何风。纯函数 render(t)，加载时建一次，只改属性/显隐。
// 主角=红三角光标，AI=蓝方块。平涂无渐变无发光，boil 关闭；运动靠网格跳格+常驻进度条。
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
  const backOut = p => { const c = 1.70158; p -= 1; return p * p * ((c + 1) * p + c) + 1; };
  const P = Math.PI * 2;

  // ---------- 包豪斯色板（平涂，颜色即语义） ----------
  const RED = '#D52020';      // 错/删/危机/红叉
  const YEL = '#FAC901';      // 对/过/进度
  const BLU = '#205CD5';      // 系统/AI
  const INK = '#111111';      // 文字/网格线
  const PAPER = '#FFFFFF';    // 纸白
  const COLD = '#E8E8E8';     // 未激活
  const SUB = '#F0F0F0';      // 卡底
  const GRID = '#E8E8E8';     // 网格线

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(e, s) { e.textContent = s; }
  function show(g, v) { g.setAttribute('display', v ? '' : 'none'); }

  const stage = document.getElementById('stage');
  const defs = el('defs', {}, stage);

  // 12 列网格几何
  const MARGIN = 96, GUT = 24, COLW = 122;
  const gx = c => MARGIN + c * (COLW + GUT);   // 第 c 列左边缘
  const contentW = gx(12) - gx(0);             // 1752

  // ================= 世界根 =================
  const world = el('g', { id: 'world' }, stage);
  // 纸白背景（放大出屏，防任何缩放露角）
  const bg = el('rect', { x: -40, y: -40, width: W + 80, height: H + 80, fill: PAPER }, world);

  // ---------- 常驻：12 列竖向网格线（墨灰 1px） ----------
  const gGrid = el('g', {}, world);
  for (let c = 0; c <= 12; c++) {
    el('line', { x1: gx(c), y1: 96, x2: gx(c), y2: 996, stroke: GRID, 'stroke-width': 1 }, gGrid);
  }
  // 常驻：顶部细墨线 + 角标
  el('line', { x1: MARGIN, y1: 64, x2: gx(12), y2: 64, stroke: INK, 'stroke-width': 2 }, world);
  const headL = el('text', { x: MARGIN, y: 48, 'font-family': 'ITF', 'font-size': 20, 'letter-spacing': 2, fill: INK }, world);
  txt(headL, 'AI COOPERATION ASSESSMENT');
  const headR = el('text', { x: gx(12), y: 48, 'text-anchor': 'end', 'font-family': 'ITF', 'font-size': 20, 'letter-spacing': 2, fill: INK }, world);
  txt(headR, 'NO. 001');

  // ---------- 常驻：12 格进度条（每 0.3s 亮一格黄，永动活性源） ----------
  const gProg = el('g', {}, world);
  el('text', { x: MARGIN, y: 1056, 'font-family': 'ITF', 'font-size': 16, 'letter-spacing': 3, fill: INK }, gProg);
  const progLabel = gProg.lastChild; txt(progLabel, 'SYSTEM BUSY');
  const progCells = [];
  const CELLW = 130, CELLH = 48, PROGGAP = 12;
  const progTotalW = 12 * CELLW + 11 * PROGGAP;
  const progX0 = MARGIN + (contentW - progTotalW) / 2;
  const progY = 1000;
  for (let i = 0; i < 12; i++) {
    const r = el('rect', { x: progX0 + i * (CELLW + PROGGAP), y: progY, width: CELLW, height: CELLH, fill: COLD, stroke: INK, 'stroke-width': 1.5 }, gProg);
    progCells.push(r);
  }
  // 常驻：大状态块（每 4 帧蓝/黄翻转 + 横跳一格，正好占满2块行，跳格清空/填满整4块）
  const liveBlock = el('rect', { x: 240, y: 680, width: 240, height: 272, fill: BLU }, world);
  // 常驻构成色块（包豪斯大色块，彩色面积基线）：右下蓝块 + 右上黄块 + 顶中蓝块
  const baseBlu = el('rect', { x: gx(12) - 240, y: 760, width: 240, height: 240, fill: BLU }, world);
  const baseYel2 = el('rect', { x: gx(12) - 240, y: 110, width: 240, height: 240, fill: YEL }, world);
  const baseBlu3 = el('rect', { x: CX - 120, y: 110, width: 240, height: 230, fill: BLU }, world);

  // ================= 几何积木 =================
  // 红三角主角（光标/人）：等边三角，尖朝上
  function tri(parent, size, fill) {
    const s = size;
    return el('polygon', { points: `0 ${-s} ${s * 0.9} ${s * 0.7} ${-s * 0.9} ${s * 0.7}`, fill }, parent);
  }
  // 蓝方块（AI/系统）
  function sq(parent, size, fill) {
    return el('rect', { x: -size / 2, y: -size / 2, width: size, height: size, fill }, parent);
  }
  // 黄三角
  function ytri(parent, size) { return tri(parent, size, YEL); }

  // ================= 场景 A：开场大标题 0–1.5 =================
  const gIntro = el('g', {}, world);
  const tLine1 = el('text', { x: CX, y: 440, 'text-anchor': 'middle', 'font-family': 'SG', 'font-weight': 700, 'font-size': 96, 'letter-spacing': 4, fill: INK }, gIntro);
  txt(tLine1, 'AI COOPERATION');
  const tLine2 = el('text', { x: CX, y: 560, 'text-anchor': 'middle', 'font-family': 'SG', 'font-weight': 700, 'font-size': 96, 'letter-spacing': 4, fill: INK }, gIntro);
  txt(tLine2, 'ASSESSMENT');
  const tNum = el('text', { x: CX, y: 660, 'text-anchor': 'middle', 'font-family': 'ITF', 'font-size': 34, 'letter-spacing': 8, fill: BLU }, gIntro);
  txt(tNum, 'NO. 001');
  // 红三角光标弹入
  const heroIntro = el('g', {}, gIntro);
  tri(heroIntro, 46, RED);
  el('circle', { cx: -14, cy: -6, r: 4, fill: PAPER }, heroIntro);
  el('circle', { cx: 14, cy: -6, r: 4, fill: PAPER }, heroIntro);

  // ================= 场景 B：考核卡 1.5–3 =================
  const gCard = el('g', {}, world);
  // 白卡（顶部蓝条）
  el('rect', { x: CX - 360, y: 300, width: 720, height: 380, fill: PAPER, stroke: INK, 'stroke-width': 2 }, gCard);
  el('rect', { x: CX - 360, y: 300, width: 720, height: 56, fill: BLU }, gCard);
  el('text', { x: CX, y: 338, 'text-anchor': 'middle', 'font-family': 'ITF', 'font-size': 26, 'letter-spacing': 4, fill: PAPER }, gCard);
  const cardHead = gCard.lastChild; txt(cardHead, 'ASSESSMENT FORM');
  // 工牌图标（矩形+挂绳）
  const badgeIco = el('g', {}, gCard);
  el('rect', { x: CX - 260, y: 430, width: 150, height: 110, fill: SUB, stroke: INK, 'stroke-width': 2 }, badgeIco);
  el('rect', { x: CX - 190, y: 412, width: 10, height: 22, fill: INK }, badgeIco);
  el('circle', { cx: CX - 185, cy: 470, r: 22, fill: BLU }, badgeIco);
  el('rect', { x: CX - 215, y: 500, width: 60, height: 12, fill: COLD }, badgeIco);
  // CANDIDATE: X-07
  const candText = el('text', { x: CX - 40, y: 470, 'font-family': 'SG', 'font-weight': 700, 'font-size': 52, fill: INK }, gCard);
  txt(candText, 'CANDIDATE: ');
  const candId = el('text', { x: CX - 40, y: 540, 'font-family': 'SG', 'font-weight': 700, 'font-size': 64, fill: RED }, gCard);
  txt(candId, 'X-07');
  // 几何验证码图标（方块+三角+圆拼合）
  const captchaIco = el('g', {}, gCard);
  el('rect', { x: CX + 150, y: 440, width: 40, height: 40, fill: YEL }, captchaIco);
  el('polygon', { points: `${CX + 230} 440 ${CX + 260} 486 ${CX + 200} 486`, fill: BLU }, captchaIco);
  el('circle', { cx: CX + 200, cy: 520, r: 22, fill: RED }, captchaIco);

  // ================= R1 3–7：prompt speed，3/4 =================
  const gR1 = el('g', {}, world);
  el('text', { x: MARGIN, y: 150, 'font-family': 'ITF', 'font-size': 22, 'letter-spacing': 3, fill: INK }, gR1);
  const r1Label = gR1.lastChild; txt(r1Label, 'ROUND 1 · PROMPT SPEED');
  // 蓝方块 AI（吐条）
  const aiR1 = el('g', {}, gR1);
  sq(aiR1, 120, BLU);
  el('rect', { x: -30, y: -12, width: 60, height: 10, fill: PAPER }, aiR1);
  el('rect', { x: -30, y: 12, width: 60, height: 10, fill: PAPER }, aiR1);
  // 沙漏（对顶三角）
  const hour = el('g', {}, gR1);
  el('polygon', { points: '-34 -44 34 -44 0 0', fill: 'none', stroke: INK, 'stroke-width': 3 }, hour);
  el('polygon', { points: '-34 44 34 44 0 0', fill: 'none', stroke: INK, 'stroke-width': 3 }, hour);
  el('polygon', { points: '-20 -40 20 -40 0 -6', fill: YEL }, hour);
  el('polygon', { points: '-12 40 12 40 0 18', fill: YEL }, hour);
  // 4 条几何条（蓝块吐出，主角接）
  const r1Bars = [];
  for (let i = 0; i < 4; i++) {
    const bg2 = el('g', {}, gR1);
    el('rect', { x: -120, y: -18, width: 240, height: 36, fill: i === 3 ? RED : BLU, stroke: INK, 'stroke-width': 2 }, bg2);
    r1Bars.push(bg2);
  }
  // 漏接的红叉
  const r1X = el('g', {}, gR1);
  el('line', { x1: -30, y1: -30, x2: 30, y2: 30, stroke: RED, 'stroke-width': 9, 'stroke-linecap': 'square' }, r1X);
  el('line', { x1: 30, y1: -30, x2: -30, y2: 30, stroke: RED, 'stroke-width': 9, 'stroke-linecap': 'square' }, r1X);
  // 主角三角
  const heroR1 = el('g', {}, gR1);
  tri(heroR1, 40, RED);
  // 分数 3/4
  const r1Score = el('text', { x: gx(12), y: 150, 'text-anchor': 'end', 'font-family': 'SG', 'font-weight': 700, 'font-size': 56, fill: INK }, gR1);
  txt(r1Score, '3/4');

  // ================= R2 7–11：agent orchestration，5/6 =================
  const gR2 = el('g', {}, world);
  el('text', { x: MARGIN, y: 150, 'font-family': 'ITF', 'font-size': 22, 'letter-spacing': 3, fill: INK }, gR2);
  const r2Label = gR2.lastChild; txt(r2Label, 'ROUND 2 · AGENT ORCHESTRATION');
  // 6 个小方 Agent 节点
  const r2Nodes = [];
  const nodeX = [360, 600, 840, 1080, 1320, 1560];
  for (let i = 0; i < 6; i++) {
    const ng = el('g', {}, gR2);
    sq(ng, 78, i === 4 ? RED : SUB);
    el('rect', { x: -16, y: -8, width: 32, height: 16, fill: INK }, ng);
    r2Nodes.push(ng);
  }
  // 节点间连线（第 5 条连歪）
  const r2Links = [];
  for (let i = 0; i < 5; i++) {
    const ln = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: INK, 'stroke-width': 3 }, gR2);
    r2Links.push(ln);
  }
  // token 小圆（挂在连线上）
  const r2Tokens = [];
  for (let i = 0; i < 5; i++) {
    const tg = el('g', {}, gR2);
    el('circle', { r: 14, fill: YEL, stroke: INK, 'stroke-width': 2 }, tg);
    r2Tokens.push(tg);
  }
  // 第 5 条红叉
  const r2Cross = el('g', {}, gR2);
  el('line', { x1: -26, y1: -26, x2: 26, y2: 26, stroke: RED, 'stroke-width': 8, 'stroke-linecap': 'square' }, r2Cross);
  el('line', { x1: 26, y1: -26, x2: -26, y2: 26, stroke: RED, 'stroke-width': 8, 'stroke-linecap': 'square' }, r2Cross);
  const r2Score = el('text', { x: gx(12), y: 150, 'text-anchor': 'end', 'font-family': 'SG', 'font-weight': 700, 'font-size': 56, fill: INK }, gR2);
  txt(r2Score, '5/6');

  // ================= R3 11–15：zero-error，99/100 =================
  const gR3 = el('g', {}, world);
  el('text', { x: MARGIN, y: 150, 'font-family': 'ITF', 'font-size': 22, 'letter-spacing': 3, fill: INK }, gR3);
  const r3Label = gR3.lastChild; txt(r3Label, 'ROUND 3 · ZERO-ERROR');
  // 大任务矩形
  const taskBox = el('g', {}, gR3);
  el('rect', { x: -330, y: -330, width: 660, height: 660, fill: PAPER, stroke: INK, 'stroke-width': 3 }, taskBox);
  // 10x10 填满块
  const fillCells = [];
  const FS = 56, FGAP = 8, FORIGIN = -320;
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const cell = el('rect', { x: FORIGIN + c * (FS + FGAP), y: FORIGIN + r * (FS + FGAP), width: FS, height: FS, fill: COLD, stroke: INK, 'stroke-width': 1 }, taskBox);
    fillCells.push(cell);
  }
  // 咖啡杯（矩形+梯形把手）
  const coffee = el('g', {}, gR3);
  el('rect', { x: -40, y: -30, width: 80, height: 70, fill: SUB, stroke: INK, 'stroke-width': 3 }, coffee);
  el('path', { d: 'M40 -18 L72 -10 L72 30 L40 38 Z', fill: 'none', stroke: INK, 'stroke-width': 3 }, coffee);
  // 分数 99/100
  const r3Score = el('text', { x: gx(12), y: 150, 'text-anchor': 'end', 'font-family': 'SG', 'font-weight': 700, 'font-size': 56, fill: INK }, gR3);
  txt(r3Score, '99/100');

  // ================= R4 15–19：human-ai synergy，100% =================
  const gR4 = el('g', {}, world);
  el('text', { x: MARGIN, y: 150, 'font-family': 'ITF', 'font-size': 22, 'letter-spacing': 3, fill: INK }, gR4);
  const r4Label = gR4.lastChild; txt(r4Label, 'ROUND 4 · HUMAN-AI SYNERGY');
  // 蓝方块 AI（学）
  const aiR4 = el('g', {}, gR4);
  sq(aiR4, 110, BLU);
  el('rect', { x: -24, y: -10, width: 48, height: 8, fill: PAPER }, aiR4);
  el('rect', { x: -24, y: 12, width: 30, height: 8, fill: PAPER }, aiR4);
  // 主角红三角
  const heroR4 = el('g', {}, gR4);
  tri(heroR4, 42, RED);
  // 黄三角摆进格子
  const r4Tris = [];
  for (let i = 0; i < 6; i++) {
    const tg = el('g', {}, gR4);
    ytri(tg, 30);
    r4Tris.push(tg);
  }
  // 进度全黄横条
  const r4Bar = el('rect', { x: MARGIN, y: 880, width: 0, height: 40, fill: YEL, stroke: INK, 'stroke-width': 2 }, gR4);
  const r4Score = el('text', { x: gx(12), y: 150, 'text-anchor': 'end', 'font-family': 'SG', 'font-weight': 700, 'font-size': 56, fill: INK }, gR4);
  txt(r4Score, '100%');
  // “教它”箭头（红三角 -> 蓝方块）
  const teachArrow = el('g', {}, gR4);
  el('line', { x1: -60, y1: 0, x2: 60, y2: 0, stroke: INK, 'stroke-width': 3 }, teachArrow);
  el('polygon', { points: '60 -10 80 0 60 10', fill: INK }, teachArrow);

  // ================= 总分 19–23：大圆 0→100，四卡，PASS 印章 =================
  const gTotal = el('g', {}, world);
  el('text', { x: CX, y: 150, 'text-anchor': 'middle', 'font-family': 'ITF', 'font-size': 24, 'letter-spacing': 5, fill: INK }, gTotal);
  const totLabel = gTotal.lastChild; txt(totLabel, 'TOTAL SCORE');
  // 大圆数字
  const bigCircle = el('g', {}, gTotal);
  el('circle', { cx: CX, cy: 480, r: 170, fill: PAPER, stroke: INK, 'stroke-width': 6 }, bigCircle);
  el('circle', { cx: CX, cy: 480, r: 170, fill: 'none', stroke: YEL, 'stroke-width': 10, opacity: 0 }, bigCircle);
  const bigNum = el('text', { x: CX, y: 520, 'text-anchor': 'middle', 'font-family': 'SG', 'font-weight': 700, 'font-size': 130, fill: INK }, bigCircle);
  txt(bigNum, '0');
  // 四卡（R1-R4 亮黄）
  const totCards = [];
  for (let i = 0; i < 4; i++) {
    const cg = el('g', {}, gTotal);
    el('rect', { x: -110, y: -40, width: 220, height: 80, fill: SUB, stroke: INK, 'stroke-width': 2 }, cg);
    el('rect', { x: -110, y: -40, width: 220, height: 12, fill: COLD }, cg);
    const lab = el('text', { x: 0, y: 12, 'text-anchor': 'middle', 'font-family': 'ITF', 'font-size': 26, fill: INK }, cg);
    txt(lab, 'R' + (i + 1));
    totCards.push(cg);
  }
  // PASS 印章（圆+PASS）
  const stamp = el('g', {}, gTotal);
  el('circle', { r: 95, fill: 'none', stroke: RED, 'stroke-width': 8 }, stamp);
  el('text', { x: 0, y: 20, 'text-anchor': 'middle', 'font-family': 'SG', 'font-weight': 700, 'font-size': 52, fill: RED }, stamp);
  txt(stamp.lastChild, 'PASS');
  // 冒汗主角
  const heroTot = el('g', {}, gTotal);
  tri(heroTot, 30, RED);
  const sweatDrop = el('circle', { cx: 26, cy: -30, r: 8, fill: BLU }, heroTot);

  // ================= 反转 23–27：AI 占岗 =================
  const gRev = el('g', {}, world);
  // 主角原本站的格子（基准格）
  el('rect', { x: CX - 90, y: 560, width: 180, height: 180, fill: SUB, stroke: INK, 'stroke-width': 2 }, gRev);
  el('text', { x: CX, y: 540, 'text-anchor': 'middle', 'font-family': 'ITF', 'font-size': 20, 'letter-spacing': 2, fill: INK }, gRev);
  const cellLabel = gRev.lastChild; txt(cellLabel, 'YOUR CELL');
  // 被挤灰缩小的主角
  const heroRev = el('g', {}, gRev);
  tri(heroRev, 40, COLD);
  el('circle', { cx: -12, cy: -6, r: 4, fill: INK }, heroRev);
  el('circle', { cx: 12, cy: -6, r: 4, fill: INK }, heroRev);
  // 蓝色大方块落进格子占住
  const aiBig = el('g', {}, gRev);
  sq(aiBig, 170, BLU);
  el('rect', { x: -34, y: -10, width: 68, height: 12, fill: PAPER }, aiBig);
  el('rect', { x: -34, y: 16, width: 44, height: 12, fill: PAPER }, aiBig);
  // 新卡 1：POSITION FILLED BY AI
  const card1 = el('g', {}, gRev);
  el('rect', { x: CX - 330, y: 230, width: 660, height: 70, fill: PAPER, stroke: INK, 'stroke-width': 2 }, card1);
  el('rect', { x: CX - 330, y: 230, width: 12, height: 70, fill: BLU }, card1);
  el('text', { x: CX, y: 276, 'text-anchor': 'middle', 'font-family': 'SG', 'font-weight': 700, 'font-size': 36, fill: INK }, card1);
  txt(card1.lastChild, 'POSITION FILLED BY AI');
  // 新卡 2：YOU ARE IN OPTIMIZATION QUEUE
  const card2 = el('g', {}, gRev);
  el('rect', { x: CX - 330, y: 330, width: 660, height: 70, fill: PAPER, stroke: INK, 'stroke-width': 2 }, card2);
  el('rect', { x: CX - 330, y: 330, width: 12, height: 70, fill: RED }, card2);
  el('text', { x: CX, y: 376, 'text-anchor': 'middle', 'font-family': 'SG', 'font-weight': 700, 'font-size': 32, fill: INK }, card2);
  txt(card2.lastChild, 'YOU ARE IN OPTIMIZATION QUEUE');
  // 脚下格红粗叉
  const revX = el('g', {}, gRev);
  el('line', { x1: -80, y1: -80, x2: 80, y2: 80, stroke: RED, 'stroke-width': 12, 'stroke-linecap': 'square' }, revX);
  el('line', { x1: 80, y1: -80, x2: -80, y2: 80, stroke: RED, 'stroke-width': 12, 'stroke-linecap': 'square' }, revX);
  // 右下 62.0%
  const pct62 = el('text', { x: gx(12), y: 960, 'text-anchor': 'end', 'font-family': 'SG', 'font-weight': 700, 'font-size': 44, fill: RED }, gRev);
  txt(pct62, '62.0%');

  // ================= 神补刀 27–28.7：工牌翻牌 =================
  const gPunch = el('g', {}, world);
  // 灰主角
  const heroPunch = el('g', {}, gPunch);
  tri(heroPunch, 34, COLD);
  // 工牌翻牌（正面 EMPLOYEE -> 背面 REDUNDANT）
  const punchBadge = el('g', {}, gPunch);
  el('rect', { x: -180, y: -120, width: 360, height: 240, fill: PAPER, stroke: INK, 'stroke-width': 3 }, punchBadge);
  el('rect', { x: -180, y: -120, width: 360, height: 40, fill: BLU }, punchBadge);
  el('text', { x: 0, y: -92, 'text-anchor': 'middle', 'font-family': 'ITF', 'font-size': 20, 'letter-spacing': 3, fill: PAPER }, punchBadge);
  txt(punchBadge.lastChild, 'EMPLOYEE RECORD');
  const badgeWord = el('text', { x: 0, y: 40, 'text-anchor': 'middle', 'font-family': 'SG', 'font-weight': 700, 'font-size': 56, fill: INK }, punchBadge);
  txt(badgeWord, 'EMPLOYEE');
  // 压暗那格（围绕灰主角所在格）
  const dimRect = el('rect', { x: 280, y: 560, width: 160, height: 160, fill: INK, opacity: 0 }, gPunch);
  // 标题 REDUNDANT VARIABLE X-07
  const punchTitle = el('text', { x: CX, y: 300, 'text-anchor': 'middle', 'font-family': 'SG', 'font-weight': 700, 'font-size': 72, 'letter-spacing': 3, fill: INK }, gPunch);
  txt(punchTitle, 'REDUNDANT VARIABLE X-07');

  // ================= 署名 28.9–29.7 =================
  const gSign = el('g', {}, world);
  const signText = el('text', { x: CX, y: CY + 18, 'text-anchor': 'middle', 'font-family': 'SC', 'font-size': 54, fill: INK }, gSign);
  txt(signText, '由 Doubao 在30秒内用纯代码制作完成');

  // ================= 顶层：开场黑场（仅前 0.12s） =================
  const blackfield = el('rect', { x: 0, y: 0, width: W, height: H, fill: INK, opacity: 1 }, stage);

  // ================= 工具：逐字弹入文本 =================
  function typeInto(full, start, perChar, t) {
    const n = Math.floor(clamp((t - start) / perChar, 0, full.length));
    return full.slice(0, n);
  }

  // ================= 主渲染 =================
  function render(t0) {
    let t = t0;
    const frame = Math.round(t * T.fps);

    // ---- 纸白底 ----
    bg.setAttribute('fill', PAPER);

    // ---- 常驻进度条：每 0.3s 亮一格黄（累计，满 12 重置） ----
    const lit = Math.floor(t / 0.3) % 13;   // 0..12
    for (let i = 0; i < 12; i++) {
      progCells[i].setAttribute('fill', i < lit ? YEL : COLD);
    }
    // live 大块每 4 帧蓝/黄翻转 + 横跳一格（每次影响≥3块，补帧差 + 彩色面积）
    const lp = Math.floor(frame / 4) % 2;
    liveBlock.setAttribute('fill', lp ? YEL : BLU);
    liveBlock.setAttribute('x', 240 - lp * 240);

    // ---- 默认隐藏所有场景 ----
    [gIntro, gCard, gR1, gR2, gR3, gR4, gTotal, gRev, gPunch, gSign].forEach(g => show(g, false));

    // 红三角主角在等待时的网格微跳（每 3 帧一格，保证帧差）
    const hopX = (Math.floor(frame / 3) % 2) ? 6 : 0;
    const hopY = (Math.floor(frame / 3) % 3) ? 0 : -6;

    // =====================================================
    // 场景 A：开场 0–1.5
    // =====================================================
    if (t >= 0.12 && t < 1.5) {
      show(gIntro, true);
      // 标题逐字弹入（加速，1.5s 内打完）
      const s1 = typeInto('AI COOPERATION', T.titleTypeStart, 0.05, t);
      const s2 = typeInto('ASSESSMENT', T.titleTypeStart + 0.4, 0.05, t);
      txt(tLine1, s1); txt(tLine2, s2);
      tNum.setAttribute('opacity', clamp((t - T.num001) / 0.2, 0, 1));
      // 红三角光标弹入
      const cp = backOut(clamp((t - T.cursorPop) / 0.35, 0, 1));
      heroIntro.setAttribute('transform', `translate(${CX - 320 + hopX} ${760 + hopY}) scale(${clamp(cp, 0.1, 1.4)})`);
    }

    // =====================================================
    // 场景 B：考核卡 1.5–3
    // =====================================================
    if (t >= 1.5 && t < 3.0) {
      show(gCard, true);
      const cp = backOut(clamp((t - T.cardIn) / 0.3, 0, 1));
      gCard.setAttribute('transform', `translate(0 0) scale(${clamp(cp, 0.2, 1.15)})`);
      gCard.setAttribute('transform-origin', `${CX} 490`);
      const cs = typeInto('CANDIDATE: X-07', T.candidateType, 0.06, t);
      txt(candText, cs.length > 9 ? 'CANDIDATE:' : cs.slice(0, 9));
      txt(candId, cs.length > 9 ? cs.slice(9) : '');
    }

    // =====================================================
    // R1：prompt speed 3–7
    // =====================================================
    if (t >= 3.0 && t < 7.0) {
      show(gR1, true);
      // 蓝方块在左
      aiR1.setAttribute('transform', `translate(360 540)`);
      // 沙漏倒数
      const hp = clamp((t - T.r1Hour) / 0.7, 0, 1);
      hour.setAttribute('transform', `translate(1560 420) scale(${0.7 + 0.3 * Math.sin(t * 18)})`);
      hour.setAttribute('opacity', hp > 0 ? 1 : 0);
      // 4 条：从蓝块吐出 -> 被主角接走重排
      r1Bars.forEach((bg2, i) => {
        const bt = T.r1Bars[i];
        const land = bt + 0.25;
        if (t < bt) { bg2.setAttribute('opacity', 0); return; }
        bg2.setAttribute('opacity', 1);
        if (i === 3 && t >= T.r1Miss) {
          // 漏接：掉到右下变红叉
          const fall = clamp((t - T.r1Miss) / 0.3, 0, 1);
          bg2.setAttribute('transform', `translate(${lerp(560, 1500, easeOutCubic(fall))} ${lerp(540, 760, easeOutCubic(fall))})`);
          bg2.setAttribute('opacity', t > T.r1Miss + 0.25 ? 0.25 : 1);
        } else if (i < 3) {
          // 被接走，重排到中线
          const p = clamp((t - land) / 0.3, 0, 1);
          bg2.setAttribute('transform', `translate(${lerp(560, 960, easeOutCubic(p))} ${560 + (i - 1) * 90})`);
        }
      });
      // 红叉（漏接的第4条）
      r1X.setAttribute('opacity', t >= T.r1Miss ? 1 : 0);
      r1X.setAttribute('transform', `translate(1500 760) scale(${backOut(clamp((t - T.r1Miss) / 0.25, 0, 1))})`);
      // 主角三角在跳着接
      heroR1.setAttribute('transform', `translate(${820 + hopX * 2} ${620 + hopY * 2})`);
      // 分数
      r1Score.setAttribute('opacity', clamp((t - T.r1Score) / 0.2, 0, 1));
    }

    // =====================================================
    // R2：agent orchestration 7–11
    // =====================================================
    if (t >= 7.0 && t < 11.0) {
      show(gR2, true);
      r2Nodes.forEach((ng, i) => {
        const nt = T.r2Nodes[i];
        const p = backOut(clamp((t - nt) / 0.25, 0, 1));
        ng.setAttribute('transform', `translate(${nodeX[i]} 480) scale(${clamp(p, 0.1, 1.2)})`);
      });
      // 连线
      r2Links.forEach((ln, i) => {
        const lt = T.r2Links[i];
        if (t < lt) { ln.setAttribute('opacity', 0); return; }
        ln.setAttribute('opacity', 1);
        const x1 = nodeX[i] + 39, x2 = nodeX[i + 1] - 39;
        let y1 = 480, y2 = 480;
        // 第 5 条(i=4)手抖连歪
        if (i === 4 && t >= T.r2Wobble) {
          y2 = 480 + 40 + (h(frame) - 0.5) * 10;
        }
        ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
        ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
        // token 小圆挂在线中点
        r2Tokens[i].setAttribute('transform', `translate(${(x1 + x2) / 2} ${(y1 + y2) / 2})`);
      });
      r2Tokens.forEach((tg, i) => {
        tg.setAttribute('opacity', t >= T.r2Links[i] ? 1 : 0);
      });
      // 第 5 条红叉
      r2Cross.setAttribute('opacity', t >= T.r2Cross ? 1 : 0);
      r2Cross.setAttribute('transform', `translate(${(nodeX[4] + nodeX[5]) / 2} ${480 + 50}) scale(${backOut(clamp((t - T.r2Cross) / 0.2, 0, 1))})`);
      r2Score.setAttribute('opacity', clamp((t - T.r2Score) / 0.2, 0, 1));
    }

    // =====================================================
    // R3：zero-error 11–15
    // =====================================================
    if (t >= 11.0 && t < 15.0) {
      show(gR3, true);
      // 大任务矩形落下
      const tp = clamp((t - T.r3TaskDrop) / 0.4, 0, 1);
      taskBox.setAttribute('transform', `translate(${CX} ${lerp(-200, 560, easeOutCubic(tp))})`);
      // 100 格填满（前 99 蓝，最后 1 格红闪）
      const fp = clamp((t - T.r3FillStart) / (T.r3FillEnd - T.r3FillStart), 0, 1);
      const filledCount = Math.round(fp * 100);
      fillCells.forEach((cell, idx) => {
        let f = COLD;
        if (idx < filledCount) f = BLU;
        if (idx === 99 && t >= T.r3Flash) f = (Math.floor(frame / 4) % 2 === 0) ? RED : YEL;
        cell.setAttribute('fill', f);
      });
      // 咖啡杯被压扁
      const cp2 = clamp((t - T.r3Coffee) / 0.3, 0, 1);
      const sqy = cp2 >= 1 ? 0.25 : 1;   // 压扁
      coffee.setAttribute('transform', `translate(1560 760) scale(${1} ${sqy})`);
      coffee.setAttribute('opacity', t >= T.r3Coffee - 0.2 ? 1 : 0);
      r3Score.setAttribute('opacity', clamp((t - T.r3Score) / 0.2, 0, 1));
    }

    // =====================================================
    // R4：human-ai synergy 15–19
    // =====================================================
    if (t >= 15.0 && t < 19.0) {
      show(gR4, true);
      aiR4.setAttribute('transform', `translate(1380 480)`);
      heroR4.setAttribute('transform', `translate(560 ${480 + hopY})`);
      // 教它箭头
      teachArrow.setAttribute('transform', `translate(760 480)`);
      teachArrow.setAttribute('opacity', t >= T.r4Tri[0] ? 1 : 0);
      // 黄三角逐个摆进格子
      r4Tris.forEach((tg, i) => {
        const tt = T.r4Tri[i];
        const p = backOut(clamp((t - tt) / 0.22, 0, 1));
        tg.setAttribute('transform', `translate(${760 + i * 120} ${640}) scale(${clamp(p, 0.1, 1.2)})`);
      });
      // 进度条全黄
      const bp = clamp((t - T.r4Full) / 0.4, 0, 1);
      r4Bar.setAttribute('width', contentW * bp);
      r4Score.setAttribute('opacity', clamp((t - T.r4Score) / 0.2, 0, 1));
    }

    // =====================================================
    // 总分 19–23
    // =====================================================
    if (t >= 19.0 && t < 23.0) {
      show(gTotal, true);
      // 大圆数字 0 整翻到 100
      const rp = clamp((t - T.totalRollStart) / (T.totalRollEnd - T.totalRollStart), 0, 1);
      const num = Math.round(100 * easeOutCubic(rp));
      txt(bigNum, String(num));
      bigCircle.lastChild.setAttribute('opacity', t >= T.totalRollEnd ? 1 : 0);
      // 四卡亮黄
      totCards.forEach((cg, i) => {
        const cxp = 560 + i * 240;
        cg.setAttribute('transform', `translate(${cxp} 800)`);
        const litC = t >= T.cardsYellow;
        cg.children[0].setAttribute('fill', litC ? YEL : SUB);
        const bar = cg.children[1];
        bar.setAttribute('fill', litC ? INK : COLD);
      });
      // PASS 印章盖下
      const sp = clamp((t - T.passStamp) / 0.25, 0, 1);
      stamp.setAttribute('opacity', t >= T.passStamp ? 1 : 0);
      stamp.setAttribute('transform', `translate(${CX + 330} ${360}) rotate(-10) scale(${t >= T.passStamp ? 2 - 1 * easeOutCubic(clamp((t - T.passStamp) / 0.25, 0, 1)) : 1})`);
      // 冒汗主角
      heroTot.setAttribute('transform', `translate(${360 + hopX} ${800 + hopY})`);
      sweatDrop.setAttribute('opacity', t >= T.sweat ? 1 : 0);
    }

    // =====================================================
    // 反转 23–27
    // =====================================================
    if (t >= 23.0 && t < 27.0) {
      show(gRev, true);
      // 主角先在格中，后被挤到左边变灰缩小
      const sq2 = clamp((t - T.squeeze) / 0.4, 0, 1);
      heroRev.setAttribute('transform', `translate(${lerp(CX, 360, easeOutCubic(sq2))} ${lerp(650, 700, easeOutCubic(sq2))}) scale(${lerp(1, 0.5, sq2)})`);
      // 蓝大方块落进格子
      const ad = clamp((t - T.aiDrop) / 0.4, 0, 1);
      aiBig.setAttribute('transform', `translate(${CX} ${lerp(-150, 650, easeOutCubic(ad))})`);
      // 新卡
      card1.setAttribute('opacity', clamp((t - T.newCard) / 0.25, 0, 1));
      card2.setAttribute('opacity', clamp((t - T.queueCard) / 0.25, 0, 1));
      // 红粗叉划掉格子
      revX.setAttribute('opacity', t >= T.redCross ? 1 : 0);
      revX.setAttribute('transform', `translate(${CX} 650) scale(${backOut(clamp((t - T.redCross) / 0.25, 0, 1))})`);
      pct62.setAttribute('opacity', clamp((t - T.pct62) / 0.25, 0, 1));
    }

    // =====================================================
    // 神补刀 27–28.7
    // =====================================================
    if (t >= 27.0 && t < 28.8) {
      show(gPunch, true);
      heroPunch.setAttribute('transform', `translate(${360} ${640})`);
      // 工牌翻牌 EMPLOYEE -> REDUNDANT
      const fp2 = clamp((t - T.flipBadge) / 0.4, 0, 1);
      punchBadge.setAttribute('transform', `translate(${CX} 620) scale(${1})`);
      badgeWord.setAttribute('fill', t >= T.flipBadge + 0.2 ? RED : INK);
      txt(badgeWord, t >= T.flipBadge + 0.2 ? 'REDUNDANT' : 'EMPLOYEE');
      dimRect.setAttribute('opacity', smooth(T.dimCell, T.dimCell + 0.4, t) * 0.18);
      punchTitle.setAttribute('opacity', smooth(T.titleX07, T.titleX07 + 0.3, t));
    }

    // =====================================================
    // 署名 28.9–30
    // =====================================================
    if (t >= 28.8) {
      show(gSign, true);
      const so = smooth(T.signOff, T.signOff + 0.2, t);
      signText.setAttribute('opacity', so);
    }

    // ---- 开场黑场：仅前 0.12s ----
    let bf = 1 - smooth(0, 0.12, t0);
    blackfield.setAttribute('opacity', clamp(bf, 0, 1));
  }

  window.render = render;
  render(0);
})();
