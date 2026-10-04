// render.js —— 自费 Token 上岗记 · 80s 孟菲斯/波普风。纯函数 render(t)，加载时建一次，只改属性/显隐。
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
  // spring overshoot ~10%
  const backOut = p => { const c = 1.70158, s = 1.0; p -= 1; return s * p * p * ((c + 1) * p + c) + 1; };
  const P = Math.PI * 2;

  // ---------- 孟菲斯色板 ----------
  const CREAM = '#FFF4E0';
  const PINK = '#FF5DA2';
  const YELLOW = '#FFD23F';
  const CYAN = '#00C2CB';
  const ORANGE = '#FF6B35';
  const PURPLE = '#7B2CBF';
  const INK = '#111111';
  const GREY = '#9C9C9C';
  const SW = 4;      // 统一描边
  const SH = 6;      // 硬投影 dx=dy

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

  // ================= 世界根 =================
  const world = el('g', { id: 'world' }, stage);
  const bg = el('rect', { x: -40, y: -40, width: W + 80, height: H + 80, fill: CREAM }, world);

  // ---------- 环境点阵装饰（两层持续滚动，保证逐帧不同） ----------
  const gDotA = el('g', {}, world);
  const gDotB = el('g', {}, world);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 14; c++) {
    if ((r + c) % 2 === 0)
      el('circle', { cx: c * 150 + 40, cy: r * 140 + 50, r: 13, fill: YELLOW }, gDotA);
  }
  for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) {
    el('circle', { cx: c * 200 + 120, cy: r * 190 + 130, r: 11, fill: CYAN }, gDotB);
  }
  // 持续抖动粗 squiggle（焦虑/光标抖，恒动）
  const gSquig = el('path', { d: '', fill: 'none', stroke: PINK, 'stroke-width': 9, 'stroke-linecap': 'round' }, world);

  // ---------- 孟菲斯积木 ----------
  // 硬边矩形（硬投影+描边，无圆角）
  function mbox(parent, x, y, w, h, fill) {
    el('rect', { x: x + SH, y: y + SH, width: w, height: h, fill: INK }, parent);
    el('rect', { x, y, width: w, height: h, fill, stroke: INK, 'stroke-width': SW }, parent);
  }
  // 折角矩形（价格标签 / 收据）
  function notchD(x, y, w, h, fold) {
    fold = fold || 40;
    return `M${x} ${y} L${x + w - fold} ${y} L${x + w} ${y + fold} L${x + w} ${y + h} L${x} ${y + h} Z`;
  }
  function mnotch(parent, x, y, w, h, fill, fold) {
    const d = notchD(x, y, w, h, fold);
    el('path', { d, fill: INK, transform: `translate(${SH} ${SH})` }, parent);
    el('path', { d, fill, stroke: INK, 'stroke-width': SW, 'stroke-linejoin': 'round' }, parent);
  }
  // 锯齿边账单（爆炸边）
  function zigBillD(x, y, w, h, teeth) {
    teeth = teeth || 7;
    const tw = w / teeth;
    let d = `M${x} ${y + 14}`;
    for (let i = 0; i < teeth; i++) {
      d += ` L${x + i * tw + tw / 2} ${y} L${x + (i + 1) * tw} ${y + 14}`;
    }
    d += ` L${x + w} ${y + h} L${x} ${y + h} Z`;
    return d;
  }
  // 波浪 squiggle
  function squiggleD(x, y, w, amp, n) {
    n = n || 6; amp = amp || 16;
    let d = `M${x} ${y}`;
    for (let i = 1; i <= n * 2; i++) {
      const xx = x + (w / (n * 2)) * i;
      const yy = y + (i % 2 ? -amp : amp);
      d += ` Q${x + (w / (n * 2)) * (i - 0.5)} ${y + (i % 2 ? -amp * 2.2 : amp * 2.2)} ${xx} ${yy}`;
    }
    return d;
  }
  // 十字星 burst
  function starburst(parent, spikes, R, fill) {
    let pts = '';
    for (let i = 0; i < spikes * 2; i++) {
      const rr = i % 2 ? R * 0.78 : R;
      const a = (i / (spikes * 2)) * P;
      pts += `${Math.cos(a) * rr},${Math.sin(a) * rr} `;
    }
    return el('polygon', { points: pts, fill, stroke: INK, 'stroke-width': SW, 'stroke-linejoin': 'round' }, parent);
  }
  // 粗箭头（涨价方向）
  function arrowUpD(x, y, s) {
    // 尖朝上，整体高 s*2
    const w = 70 * s, h = 150 * s, hw = 34 * s;
    return `M${x} ${y} L${x - w / 2} ${y + h * 0.42} L${x - hw} ${y + h * 0.42} L${x - hw} ${y + h} L${x + hw} ${y + h} L${x + hw} ${y + h * 0.42} L${x + w / 2} ${y + h * 0.42} Z`;
  }
  // 8-bit / 数字文本
  function big(parent, x, y, size, font, fill, anchor) {
    return el('text', { x, y, 'text-anchor': anchor || 'middle', 'font-family': font, 'font-size': size, fill, 'paint-order': 'stroke', stroke: INK, 'stroke-width': 2 }, parent);
  }

  // ================= 场景 A：工牌入场 0–3 =================
  const gIntro = el('g', {}, world);
  // 片名
  const title = big(gIntro, CX, 170, 96, 'ZC', INK);
  txt(title, '自费 Token 上岗记');
  // 工牌（圆环）
  const badge = el('g', {}, gIntro);
  el('circle', { cx: 0, cy: 0, r: 165, fill: 'none', stroke: INK, 'stroke-width': SW }, badge);
  el('circle', { cx: 0, cy: 0, r: 165, fill: 'none', stroke: YELLOW, 'stroke-width': 14 }, badge);
  el('circle', { cx: 0, cy: 0, r: 165, fill: 'none', stroke: INK, 'stroke-width': SW }, badge);
  // 工牌挂绳
  el('rect', { x: -10, y: -235, width: 20, height: 90, fill: CYAN, stroke: INK, 'stroke-width': SW }, badge);
  // 打工人头像（圆头+身体）
  el('circle', { cx: 0, cy: -30, r: 52, fill: CREAM, stroke: INK, 'stroke-width': SW }, badge);
  el('circle', { cx: -18, cy: -40, r: 7, fill: INK }, badge);
  el('circle', { cx: 18, cy: -40, r: 7, fill: INK }, badge);
  el('path', { d: 'M-20 -8 Q0 8 20 -8', fill: 'none', stroke: INK, 'stroke-width': SW, 'stroke-linecap': 'round' }, badge);
  el('rect', { x: -46, y: 28, width: 92, height: 44, fill: CYAN, stroke: INK, 'stroke-width': SW }, badge);
  const badgeInfo = el('text', { x: 0, y: 120, 'text-anchor': 'middle', 'font-family': 'AR', 'font-weight': 900, 'font-size': 40, fill: INK }, badge);
  txt(badgeInfo, '工号 007 · 入职第3年');
  // 咖啡杯彩蛋
  const coffee = el('g', {}, gIntro);
  mbox(coffee, -45, -40, 90, 80, YELLOW);
  el('path', { d: `M45 -22 Q75 -22 75 -2 Q75 18 45 18`, fill: 'none', stroke: INK, 'stroke-width': SW }, coffee);
  el('path', { d: 'M-18 -58 q6 -12 0 -22 M0 -58 q6 -12 0 -22 M18 -58 q6 -12 0 -22', fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, coffee);
  // token 硬币
  const introCoin = el('g', {}, gIntro);
  el('circle', { r: 46, fill: YELLOW, stroke: INK, 'stroke-width': SW }, introCoin);
  const introCoinT = el('text', { x: 0, y: 16, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 44, fill: INK }, introCoin);
  txt(introCoinT, 'T');
  // 青蓝光标（手型）
  const cursorA = el('path', { d: 'M0 0 L0 34 L9 25 L15 38 L20 36 L14 23 L24 23 Z', fill: CYAN, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, gIntro);

  // ================= 场景共用：老板（紫色方块头，面积≤10%） =================
  const gBoss = el('g', {}, world);
  el('rect', { x: -90, y: -90, width: 180, height: 180, fill: PURPLE, stroke: INK, 'stroke-width': SW }, gBoss);
  el('circle', { cx: -35, cy: -30, r: 14, fill: CREAM, stroke: INK, 'stroke-width': 3 }, gBoss);
  el('circle', { cx: 35, cy: -30, r: 14, fill: CREAM, stroke: INK, 'stroke-width': 3 }, gBoss);
  el('circle', { cx: -35, cy: -30, r: 6, fill: INK }, gBoss);
  el('circle', { cx: 35, cy: -30, r: 6, fill: INK }, gBoss);
  el('path', { d: 'M-40 30 Q0 55 40 30', fill: 'none', stroke: CREAM, 'stroke-width': 6, 'stroke-linecap': 'round' }, gBoss);
  // 老板身体（小领带）
  el('rect', { x: -50, y: 90, width: 100, height: 90, fill: PURPLE, stroke: INK, 'stroke-width': SW }, gBoss);
  el('path', { d: 'M0 90 L-14 130 L0 180 L14 130 Z', fill: YELLOW, stroke: INK, 'stroke-width': 3 }, gBoss);
  // 老板竖大拇指（R4）
  const thumb = el('g', {}, gBoss);
  el('rect', { x: 120, y: -20, width: 60, height: 90, fill: CREAM, stroke: INK, 'stroke-width': SW }, thumb);
  el('path', { d: `M130 -20 L130 -70 L160 -70 L160 -20 Z`, fill: CREAM, stroke: INK, 'stroke-width': SW }, thumb);
  thumb.setAttribute('opacity', '0');

  // 老板台词气泡
  const bossBubble = el('g', {}, world);
  el('rect', { x: -230, y: -70, width: 460, height: 140, fill: CREAM, stroke: INK, 'stroke-width': SW }, bossBubble);
  el('path', { d: 'M160 70 L200 130 L210 70 Z', fill: CREAM, stroke: INK, 'stroke-width': SW, 'stroke-linejoin': 'round' }, bossBubble);
  const bossLine = el('text', { x: 0, y: 20, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 46, fill: INK }, bossBubble);

  // ================= R1：粉色账单 ¥20 =================
  const gR1 = el('g', {}, world);
  const bill1 = el('g', {}, gR1);
  const bill1D = zigBillD(-260, -150, 520, 300, 7);
  el('path', { d: bill1D, fill: INK, transform: `translate(${SH} ${SH})` }, bill1);
  el('path', { d: bill1D, fill: PINK, stroke: INK, 'stroke-width': SW, 'stroke-linejoin': 'round' }, bill1);
  const bill1T = el('text', { x: 0, y: -20, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 52, fill: CREAM }, bill1);
  txt(bill1T, 'AI提效是个人能力');
  const bill1T2 = el('text', { x: 0, y: 50, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 52, fill: CREAM }, bill1);
  txt(bill1T2, 'Token 自己买');
  // 价格标签 ¥20
  const tag1 = el('g', {}, gR1);
  mnotch(tag1, -150, -60, 300, 150, YELLOW, 34);
  const price1 = el('text', { x: 0, y: 55, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 96, fill: INK }, tag1);
  txt(price1, '¥20');
  // 弹跳硬币们
  const coins1 = [];
  for (let i = 0; i < 4; i++) {
    const cg = el('g', {}, gR1);
    el('circle', { r: 26, fill: YELLOW, stroke: INK, 'stroke-width': SW }, cg);
    coins1.push(cg);
  }

  // ================= R2：进度条99%报错 ¥98 =================
  const gR2 = el('g', {}, world);
  // 跑两步卡住的打工人
  const worker2 = el('g', {}, gR2);
  el('circle', { cx: 0, cy: -70, r: 40, fill: CREAM, stroke: INK, 'stroke-width': SW }, worker2);
  el('circle', { cx: -13, cy: -78, r: 5, fill: INK }, worker2);
  el('circle', { cx: 13, cy: -78, r: 5, fill: INK }, worker2);
  el('rect', { x: -34, y: -30, width: 68, height: 70, fill: CYAN, stroke: INK, 'stroke-width': SW }, worker2);
  el('rect', { x: -30, y: 40, width: 24, height: 60, fill: INK }, worker2);
  el('rect', { x: 6, y: 40, width: 24, height: 60, fill: INK }, worker2);
  // 速度线（跑步）
  const runLines = el('g', {}, gR2);
  for (let i = 0; i < 4; i++) el('line', { x1: -180 - i * 30, y1: -30 + i * 24, x2: -120 - i * 30, y2: -30 + i * 24, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, runLines);
  // 进度条
  const barBg = el('g', {}, gR2);
  mbox(barBg, -360, 0, 720, 70, CREAM);
  const barFill = el('rect', { x: -352, y: 8, width: 0, height: 54, fill: CYAN }, barBg);
  const barLabel = el('text', { x: 0, y: -30, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 60, fill: INK }, gR2);
  txt(barLabel, '99%');
  // 报错红闪
  const errFlash = el('rect', { x: -500, y: -260, width: 1000, height: 520, fill: ORANGE, opacity: 0 }, gR2);
  // zigzag 爆裂
  const burst2 = el('g', {}, gR2);
  starburst(burst2, 16, 150, PINK);
  // 价格 ¥98
  const tag2 = el('g', {}, gR2);
  mnotch(tag2, -170, -70, 340, 170, YELLOW, 36);
  const price2 = el('text', { x: 0, y: 55, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 92, fill: INK }, tag2);
  txt(price2, '¥98');
  const tag2sub = el('text', { x: 0, y: -20, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 40, fill: INK }, tag2);
  txt(tag2sub, '畅玩版');
  // 警告三角
  const warn = el('g', {}, gR2);
  el('path', { d: 'M0 -60 L55 40 L-55 40 Z', fill: ORANGE, stroke: INK, 'stroke-width': SW, 'stroke-linejoin': 'round' }, warn);
  el('text', { x: 0, y: 22, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 56, fill: INK }, warn).textContent = '!';

  // ================= R3：工资条 ¥298 =================
  const gR3 = el('g', {}, world);
  // 涨价粗箭头
  const arrow = el('g', {}, gR3);
  el('path', { d: arrowUpD(0, 0, 1.0), fill: ORANGE, stroke: INK, 'stroke-width': SW, 'stroke-linejoin': 'round' }, arrow);
  // 工资条
  const slip3 = el('g', {}, gR3);
  mnotch(slip3, -280, -200, 560, 400, CREAM, 44);
  el('text', { x: 0, y: -130, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 60, fill: INK }, slip3).textContent = '工资条';
  el('rect', { x: -230, y: -90, width: 460, height: 50, fill: PINK, stroke: INK, 'stroke-width': 3 }, slip3);
  el('text', { x: 0, y: -52, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 42, fill: CREAM }, slip3).textContent = 'AI 服务费';
  el('text', { x: 0, y: 60, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 56, fill: INK }, slip3).textContent = '额度升级 +298';
  // 价格 ¥298
  const tag3 = el('g', {}, gR3);
  mnotch(tag3, -160, -60, 320, 160, YELLOW, 36);
  const price3 = el('text', { x: 0, y: 60, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 92, fill: INK }, tag3);
  txt(price3, '¥298');
  const tag3sub = el('text', { x: 0, y: -15, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 38, fill: INK }, tag3);
  txt(tag3sub, 'Pro');

  // ================= R4：token maxing ¥500 / 硬币雨 =================
  const gR4 = el('g', {}, world);
  const frenzy = el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 70, fill: INK }, gR4);
  txt(frenzy, '多烧 Token = 多高效！');
  // 输出狂扫线
  const outLines = el('g', {}, gR4);
  for (let i = 0; i < 10; i++) {
    el('line', { x1: 260, y1: -180 + i * 46, x2: 1660, y2: -180 + i * 46, stroke: i % 2 ? CYAN : PINK, 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.85 }, outLines);
  }
  // 硬币雨
  const rainCoins = [];
  for (let i = 0; i < 14; i++) {
    const cg = el('g', {}, gR4);
    el('circle', { r: 20, fill: YELLOW, stroke: INK, 'stroke-width': 3 }, cg);
    rainCoins.push(cg);
  }
  // 价格 ¥500
  const tag4 = el('g', {}, gR4);
  mnotch(tag4, -190, -70, 380, 180, PINK, 40);
  const price4 = el('text', { x: 0, y: 65, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 96, fill: CREAM }, tag4);
  txt(price4, '¥500');
  const tag4sub = el('text', { x: 0, y: -18, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 40, fill: CREAM }, tag4);
  txt(tag4sub, '企业版 · 自费');

  // ================= 反转：工资条全貌 / 石化 / 印章 =================
  const gRev = el('g', {}, world);
  const slipFull = el('g', {}, gRev);
  mnotch(slipFull, -330, -330, 660, 660, CREAM, 50);
  el('text', { x: 0, y: -250, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 64, fill: INK }, slipFull).textContent = '本月工资条';
  const rows = [];
  for (let i = 0; i < 5; i++) {
    rows.push(el('text', { x: -30, y: -150 + i * 85, 'text-anchor': 'end', 'font-family': 'AR', 'font-size': 46, fill: INK }, slipFull));
  }
  const rowVals = [];
  for (let i = 0; i < 5; i++) {
    rowVals.push(el('text', { x: 30, y: -150 + i * 85, 'text-anchor': 'start', 'font-family': 'AR', 'font-size': 46, fill: INK }, slipFull));
  }
  const netText = el('text', { x: 0, y: 285, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 86, fill: PINK }, slipFull);
  txt(netText, '实发 ¥8000');
  // 石化打工人（灰方块）
  const petrify = el('g', {}, gRev);
  el('rect', { x: -60, y: -60, width: 120, height: 120, fill: GREY, stroke: INK, 'stroke-width': SW }, petrify);
  el('line', { x1: -60, y1: -60, x2: 60, y2: 60, stroke: INK, 'stroke-width': 3 }, petrify);
  el('line', { x1: 60, y1: -60, x2: -60, y2: 60, stroke: INK, 'stroke-width': 3 }, petrify);
  // 印章
  const stamp = el('g', {}, gRev);
  el('rect', { x: -260, y: -60, width: 520, height: 120, fill: 'none', stroke: PINK, 'stroke-width': 10 }, stamp);
  const stampT = el('text', { x: 0, y: 22, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 80, fill: PINK }, stamp);
  txt(stampT, '已被AI优化');
  // 半调圆点（反转冲击）
  const halftone = el('g', {}, gRev);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
    el('circle', { cx: -780 + c * 140, cy: -460 + r * 130, r: 6 + ((r + c) % 3) * 5, fill: PINK, opacity: 0.5 }, halftone);
  }

  // ================= 结尾：补刀 + 署名 =================
  const gEnd = el('g', {}, world);
  const endBill = el('g', {}, gEnd);
  mnotch(endBill, -300, -180, 600, 360, PINK, 46);
  el('text', { x: 0, y: -90, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 46, fill: CREAM }, endBill).textContent = '新账单到了';
  el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 80, fill: CREAM }, endBill).textContent = '继续充值';
  // 滚过的硬币
  const rollCoin = el('g', {}, gEnd);
  el('circle', { r: 34, fill: YELLOW, stroke: INK, 'stroke-width': SW }, rollCoin);
  el('text', { x: 0, y: 14, 'text-anchor': 'middle', 'font-family': 'AB', 'font-size': 34, fill: INK }, rollCoin).textContent = 'T';
  // 神补刀文字
  const punchline1 = big(gEnd, CX, 360, 60, 'ZC', INK);
  txt(punchline1, '你自费买的不是效率，是接替你的简历。');
  const punchline2 = big(gEnd, CX, 450, 60, 'ZC', PINK);
  txt(punchline2, '下一位人类，请充值上岗。');
  // 干净奶油白卡片 + 署名
  const cleanCard = el('g', {}, gEnd);
  mbox(cleanCard, CX - 620, CY - 110, 1240, 220, CREAM);
  const signText = el('text', { x: CX, y: CY + 18, 'text-anchor': 'middle', 'font-family': 'ZC', 'font-size': 58, fill: INK }, cleanCard);
  txt(signText, '由 Doubao 在30秒内用纯代码制作完成');

  // ================= FX：burst / 集中线 =================
  const gFx = el('g', {}, world);
  const fxStar = starburst(gFx, 20, 240, YELLOW);
  const conc = el('g', {}, gFx);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * P;
    el('line', { x1: Math.cos(a) * 160, y1: Math.sin(a) * 160, x2: Math.cos(a) * 820, y2: Math.sin(a) * 820, stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, conc);
  }

  // ================= 顶层：闪白 / 黑场 =================
  const flash = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff', opacity: 0 }, stage);
  const blackfield = el('rect', { x: 0, y: 0, width: W, height: H, fill: INK, opacity: 1 }, stage);

  // ================= 冲击表 =================
  const HITS = [
    { t: T.badgePop, sh: 26, fl: 0.5 },
    { t: T.billLand, sh: 26, fl: 0.5 },
    { t: T.errorFlash, sh: 30, fl: 0.7 },
    { t: T.upgrade1, sh: 30, fl: 0.6 },
    { t: T.payslipPop, sh: 24, fl: 0.45 },
    { t: T.payslipFull, sh: 22, fl: 0.4 },
    { t: T.stampDown, sh: 38, fl: 0.6 }
  ];

  // 工资条行文案
  const slipRowsLabel = ['工资', 'R1 额度', 'R2 畅玩', 'R3 Pro', 'R4 企业版'];
  const slipRowsVal = ['¥8000', '-¥20', '-¥98', '-¥298', '-¥500'];

  // ================= 主渲染 =================
  function render(t0) {
    // 反转段静音冻结（25.45–25.78 仍正常画，只是声音静）
    let t = t0;
    const frame = Math.floor(t * T.fps + 0.5);
    const f3 = Math.floor(frame / 3);

    // ---- 背景永远奶油白 ----
    bg.setAttribute('fill', CREAM);

    // ---- 环境点阵持续滚动（连续运动，保证逐帧不同） ----
    const ax = -((frame * 7) % 150);
    const ay = Math.round(Math.sin(t * 0.6) * 2);
    gDotA.setAttribute('transform', `translate(${ax} ${ay})`);
    const bx = -((frame * 5) % 200) + 60;
    const by = Math.round(Math.cos(t * 0.7) * 2);
    gDotB.setAttribute('transform', `translate(${bx} ${by})`);
    // squiggle 持续横向抖动（每3帧横移，相位逐帧变）
    const sqY = 1040 + Math.round(Math.sin(frame * 0.35) * 5);
    const sqOff = (frame % 3) * 4;
    gSquig.setAttribute('d', squiggleD(520 + sqOff, sqY, 880, 12, 7));

    // ---- 震屏 ----
    let shx = 0, shy = 0, flOp = 0;
    for (const hit of HITS) {
      const dt = t - hit.t;
      if (dt >= 0 && dt < 0.5) {
        const a = hit.sh * Math.exp(-9 * dt);
        shx += (h(f3 * 7 + hit.t) - 0.5) * 2 * a;
        shy += (h(f3 * 13 + hit.t) - 0.5) * 2 * a;
      }
      if (dt >= 0 && dt < 0.1) flOp = Math.max(flOp, hit.fl * (1 - dt / 0.1));
    }
    flash.setAttribute('opacity', flOp);

    world.setAttribute('transform', `translate(${shx} ${shy})`);

    // ---- 默认隐藏 ----
    [gIntro, gR1, gR2, gR3, gR4, gRev, gEnd].forEach(g => show(g, false));
    show(gBoss, false); show(bossBubble, false);
    show(fxStar, false); show(conc, false);

    // squiggle 每 3 帧横移（焦虑/光标抖）
    const squigX = (frame % 6) - 2;

    // =====================================================
    // 场景 A：工牌 0.12–3.0
    // =====================================================
    if (t >= 0.12 && t < 3.0) {
      show(gIntro, true);
      // 片名
      const tp = backOut(clamp((t - T.titleIn) / 0.35, 0, 1));
      title.setAttribute('opacity', clamp(tp, 0, 1));
      title.setAttribute('transform', `translate(${CX} 170) scale(${0.5 + 0.5 * tp}) translate(${-CX} -170)`);
      // 工牌弹入（从上方砸下，backOver 回弹）
      const bp = clamp((t - T.badgePop) / 0.4, 0, 1);
      let bsc = 2.4 - 1.4 * easeOutCubic(bp);
      if (bp >= 1) bsc = 1 + 0.1 * Math.exp(-(t - T.badgePop) * 4) * Math.sin((t - T.badgePop) * 22);
      badge.setAttribute('transform', `translate(720 560) scale(${bsc})`);
      // 咖啡杯彩蛋
      const cp = backOut(clamp((t - T.coffeePop) / 0.3, 0, 1));
      coffee.setAttribute('opacity', clamp(cp, 0, 1));
      coffee.setAttribute('transform', `translate(1240 720) scale(${cp})`);
      // token 硬币弹跳（重力弹动）
      const coinAge = t - T.coinIntro;
      let cy2 = 0;
      if (coinAge >= 0) {
        // 弹 2 下衰减
        cy2 = -Math.abs(Math.sin(coinAge * 9)) * 120 * Math.exp(-coinAge * 1.6);
      }
      introCoin.setAttribute('transform', `translate(1240 ${470 + cy2}) scale(${coinAge < 0 ? 0 : 1})`);
      // 青蓝光标闪烁 + 焦虑抖动
      const blink = Math.floor(t * 3) % 2 === 0 ? 1 : 0.25;
      cursorA.setAttribute('opacity', blink);
      cursorA.setAttribute('transform', `translate(${900 + squigX} ${380 + (h(f3) - 0.5) * 8}) rotate(-8)`);
    }

    // =====================================================
    // R1：老板甩账单 ¥20  3.0–8.0
    // =====================================================
    if (t >= 3.0 && t < 8.0) {
      // 老板从右滑入
      const bi = clamp((t - T.bossIn) / 0.4, 0, 1);
      const bossX = lerp(1650, 1480, easeOutCubic(bi));
      show(gBoss, true);
      gBoss.setAttribute('transform', `translate(${bossX} 330)`);
      // 账单甩出 -> 落定
      const throwP = clamp((t - T.billThrow) / (T.billLand - T.billThrow), 0, 1);
      show(gR1, true);
      const billX = lerp(1650, 700, easeOutCubic(throwP));
      const billY = lerp(330, 500, easeOutCubic(throwP));
      const billRot = lerp(18, -4, throwP);
      bill1.setAttribute('transform', `translate(${billX} ${billY}) rotate(${billRot})`);
      bill1.setAttribute('opacity', 1);
      // 价格标签
      const pp = backOut(clamp((t - T.priceShow1) / 0.3, 0, 1));
      tag1.setAttribute('opacity', clamp(pp, 0, 1));
      tag1.setAttribute('transform', `translate(700 820) scale(${0.4 + 0.6 * pp})`);
      // 老板台词
      show(bossBubble, true);
      bossBubble.setAttribute('transform', `translate(${bossX - 230} 170)`);
      txt(bossLine, t >= T.bossLine1 ? 'Token 自己买' : '先提效，再上岗');
      bossLine.setAttribute('opacity', t >= T.bossLine1 - 0.2 ? 1 : 0);
      // 弹跳硬币
      coins1.forEach((cg, i) => {
        const ca = t - T.coinBounce1 - i * 0.12;
        let yy = 0, xx = 0, sc = 0;
        if (ca >= 0) { yy = -Math.abs(Math.sin(ca * 8)) * 130 * Math.exp(-ca * 1.8); xx = (i - 1.5) * 70; sc = 1; }
        cg.setAttribute('transform', `translate(${880 + xx} ${640 + yy}) scale(${sc})`);
      });
      // 命中 burst
      if (t >= T.billLand && t < T.billLand + 0.25) {
        show(conc, true); show(fxStar, true);
        conc.setAttribute('transform', `translate(700 500)`);
        conc.setAttribute('opacity', 0.5 * (1 - (t - T.billLand) / 0.25));
        fxStar.setAttribute('transform', `translate(700 500) scale(${backOut(clamp((t - T.billLand) / 0.2, 0, 1))})`);
        fxStar.setAttribute('opacity', 1 - (t - T.billLand) / 0.25);
      }
    }

    // =====================================================
    // R2：进度条99%报错 ¥98  8.0–13.0
    // =====================================================
    if (t >= 8.0 && t < 13.0) {
      show(gR2, true);
      // 打工人跑两步卡住
      const runP = clamp((t - T.runStart) / (T.runEnd - T.runStart), 0, 1);
      const wx = lerp(350, 620, easeOutCubic(runP));
      let wsh = 0;
      if (t >= T.runEnd) wsh = (h(f3) - 0.5) * 14; // 卡住发抖
      worker2.setAttribute('transform', `translate(${wx + wsh} 620)`);
      show(runLines, t < T.runEnd + 0.3);
      runLines.setAttribute('opacity', smooth(T.runEnd, T.runEnd + 0.3, t));
      // 进度条
      barBg.setAttribute('transform', `translate(1100 760)`);
      const pg = clamp((t - T.progStart) / (T.progFull - T.progStart), 0, 1);
      barFill.setAttribute('width', 720 * 0.99 * pg);
      const pct = Math.round(99 * pg);
      txt(barLabel, pct + '%');
      barLabel.setAttribute('transform', `translate(1100 690)`);
      // 99% 发抖
      if (pct >= 99) barLabel.setAttribute('transform', `translate(${1100 + (h(f3) - 0.5) * 16} 690)`);
      // 报错红闪
      const ef = t >= T.errorFlash && t < T.errorFlash + 0.5;
      errFlash.setAttribute('opacity', ef ? 0.55 : 0);
      // zigzag burst
      const bp2 = backOut(clamp((t - T.upgrade1) / 0.3, 0, 1));
      burst2.setAttribute('opacity', clamp(bp2, 0, 1));
      burst2.setAttribute('transform', `translate(1100 480) scale(${bp2})`);
      // 警告三角
      warn.setAttribute('opacity', t >= T.errorFlash ? 1 : 0);
      warn.setAttribute('transform', `translate(1380 420)`);
      // 价格
      const pp = backOut(clamp((t - T.priceShow2) / 0.3, 0, 1));
      tag2.setAttribute('opacity', clamp(pp, 0, 1));
      tag2.setAttribute('transform', `translate(1100 920) scale(${0.4 + 0.6 * pp})`);
    }

    // =====================================================
    // R3：工资条 ¥298  13.0–18.0
    // =====================================================
    if (t >= 13.0 && t < 18.0) {
      show(gR3, true);
      // 涨价箭头
      const ap = backOut(clamp((t - T.upArrow) / 0.3, 0, 1));
      arrow.setAttribute('opacity', clamp(ap, 0, 1));
      arrow.setAttribute('transform', `translate(1500 700) scale(${ap})`);
      // 工资条
      const sp = clamp((t - T.payslipPop) / 0.35, 0, 1);
      slip3.setAttribute('opacity', clamp(sp, 0, 1));
      slip3.setAttribute('transform', `translate(820 540) scale(${2 - 1 * easeOutCubic(sp)})`);
      gBoss.setAttribute('transform', `translate(1560 300)`);
      show(gBoss, t < 14.5);
      // 价格
      const pp = backOut(clamp((t - T.priceShow3) / 0.3, 0, 1));
      tag3.setAttribute('opacity', clamp(pp, 0, 1));
      tag3.setAttribute('transform', `translate(820 950) scale(${0.4 + 0.6 * pp})`);
    }

    // =====================================================
    // R4：token maxing ¥500 / 硬币雨  18.0–23.0
    // =====================================================
    if (t >= 18.0 && t < 23.0) {
      show(gR4, true);
      // 狂扫线抖动
      outLines.setAttribute('transform', `translate(${squigX * 2} 0)`);
      const fp2 = clamp((t - T.maxingStart) / 0.3, 0, 1);
      frenzy.setAttribute('opacity', fp2);
      frenzy.setAttribute('transform', `translate(960 250) scale(${0.5 + 0.5 * fp2})`);
      // 老板竖大拇指
      const tp2 = backOut(clamp((t - T.thumbUp) / 0.3, 0, 1));
      gBoss.setAttribute('transform', `translate(1500 300)`);
      show(gBoss, true);
      thumb.setAttribute('opacity', clamp(tp2, 0, 1));
      thumb.setAttribute('transform', `translate(${0} 0) scale(${tp2})`);
      // 硬币雨
      rainCoins.forEach((cg, i) => {
        const cx0 = 300 + (i * 113) % 1300;
        const phase = (t - T.coinRainStart) * 260 + i * 97;
        const cy0 = -50 + (phase % 900);
        cg.setAttribute('transform', `translate(${cx0} ${cy0}) rotate(${i * 40 + t * 200})`);
      });
      // 价格
      const pp = backOut(clamp((t - T.priceShow4) / 0.3, 0, 1));
      tag4.setAttribute('opacity', clamp(pp, 0, 1));
      tag4.setAttribute('transform', `translate(960 850) scale(${0.4 + 0.6 * pp})`);
    }

    // =====================================================
    // 反转：工资条全貌 / 石化 / 印章  23.0–27.0
    // =====================================================
    if (t >= 23.0 && t < 27.0) {
      show(gRev, true);
      const sp = clamp((t - T.payslipFull) / 0.4, 0, 1);
      slipFull.setAttribute('transform', `translate(760 560) scale(${0.6 + 0.4 * easeOutCubic(sp)})`);
      // 行文案
      for (let i = 0; i < 5; i++) {
        rows[i].textContent = slipRowsLabel[i];
        rowVals[i].textContent = slipRowsVal[i];
      }
      // 实发一路扣：8000 -> -0.01
      const dp = clamp((t - T.deductStart) / (T.deductEnd - T.deductStart), 0, 1);
      const netv = lerp(8000, -0.01, easeOutCubic(dp));
      netText.textContent = '实发 ¥' + (netv < 0 ? '-' : '') + Math.abs(netv).toFixed(2);
      // 石化打工人
      const pe = clamp((t - T.petrify) / 0.5, 0, 1);
      petrify.setAttribute('opacity', pe);
      petrify.setAttribute('transform', `translate(300 560) scale(${pe})`);
      // 半调圆点冲击
      halftone.setAttribute('opacity', t >= T.scratch ? 0.6 * (1 - smooth(T.scratch, T.scratch + 0.8, t)) : 0);
      halftone.setAttribute('transform', `translate(${(h(f3) - 0.5) * 10} 0)`);
      // 印章盖下
      const stp = backOut(clamp((t - T.stampDown) / 0.25, 0, 1));
      stamp.setAttribute('opacity', t >= T.stampDown ? 1 : 0);
      stamp.setAttribute('transform', `translate(760 500) rotate(-12) scale(${t >= T.stampDown ? 2 - 1 * easeOutCubic(clamp((t - T.stampDown) / 0.25, 0, 1)) : 1})`);
    }

    // =====================================================
    // 结尾：补刀 + 署名  27.0–30.0
    // =====================================================
    if (t >= 27.0) {
      show(gEnd, true);
      // 新账单
      const np = clamp((t - T.newBill) / 0.35, 0, 1);
      endBill.setAttribute('opacity', clamp(np, 0, 1));
      endBill.setAttribute('transform', `translate(960 300) scale(${2 - 1 * easeOutCubic(np)})`);
      // 老板
      gBoss.setAttribute('transform', `translate(1560 300)`);
      show(gBoss, t < T.cleanCard);
      // 滚过的硬币
      const rg = smooth(T.coinRoll, T.coinRoll + 1.2, t);
      rollCoin.setAttribute('transform', `translate(${lerp(100, 1820, rg)} 950) rotate(${rg * 720})`);
      // 补刀文字（切干净卡片前显示）
      const plOp = t < T.cleanCard ? 1 : 0;
      punchline1.setAttribute('opacity', plOp);
      punchline2.setAttribute('opacity', plOp);
      endBill.setAttribute('opacity', plOp);
      // 28.7 切干净奶油白卡片
      const cc = smooth(T.cleanCard, T.cleanCard + 0.2, t);
      cleanCard.setAttribute('opacity', cc);
      cleanCard.setAttribute('transform', `scale(${0.8 + 0.2 * cc})`);
      const so = smooth(T.signOff, T.signOff + 0.15, t);
      signText.setAttribute('opacity', so);
    }

    // ---- 黑场：仅前 0.12s 从黑淡入 ----
    let bf = 1 - smooth(0, 0.12, t0);
    blackfield.setAttribute('opacity', clamp(bf, 0, 1));
  }

  window.render = render;
  render(0);
})();
