// render.js —— 《前额叶没坏，是累了》水彩皮肤。纯函数 render(t)。
// 分层：gWash(晕染色块,不抖) / gLine(墨线,弱沸腾) / gFace(五官锁死) / gText(手写文案)。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const { T } = window;

  // ---------- 确定性哈希与缓动 ----------
  const h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = (a, b, x) => { const p = clamp((x - a) / (b - a), 0, 1); return p * p * (3 - 2 * p); };
  const easeOut = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
  const backOut = p => { const c = 1.70158; p = clamp(p, 0, 1) - 1; return c * p * p * (1.70158 * p + c) + 1; };

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

  // ================= 滤镜 =================
  // 弱沸腾：只挂在墨线层（gLine）。scale 每帧可调（平时4，峰值抖一下到11）。
  const boilF = el('filter', { id: 'boilSoft', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
  const boilTurb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.045 0.06', numOctaves: '2', seed: '5', result: 'n' }, boilF);
  const boilDisp = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '10', xChannelSelector: 'R', yChannelSelector: 'G' }, boilF);

  // 纸纹：高频 turbulence → 用 RGB 噪声做一层淡颗粒（seed 每帧更新产生逐帧变化）
  const grainF = el('filter', { id: 'grain', x: '0', y: '0', width: '100%', height: '100%' }, defs);
  const grainTurb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '3', stitchTiles: 'stitch', result: 'n' }, grainF);
  // 把噪声 RGB 压成淡灰颗粒：颜色恒定，alpha 随噪声起伏
  el('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 0.18  0 0 0 0 0.15  0 0 0 0 0.12  0.35 0.35 0.35 0 -0.15' }, grainF);

  // 水彩晕染：模糊层（色块在描边下方）
  const blurF = el('filter', { id: 'washBlur', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
  el('feGaussianBlur', { stdDeviation: '5' }, blurF);
  const blurF2 = el('filter', { id: 'washBlur2', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
  el('feGaussianBlur', { stdDeviation: '9' }, blurF2);

  // 软阴影（径向渐变椭圆，无硬投影）
  const shGrad = el('radialGradient', { id: 'softSh', cx: '50%', cy: '50%', r: '50%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#3A3230', 'stop-opacity': '0.22' }, shGrad);
  el('stop', { offset: '100%', 'stop-color': '#3A3230', 'stop-opacity': '0' }, shGrad);

  // ================= 世界根 =================
  const world = el('g', { id: 'world' }, stage);
  // 背景放大出屏（呼吸缩放不露角）
  const bg = el('rect', { x: -60, y: -60, width: W + 120, height: H + 120, fill: '#F5EFE0' }, world);
  // 开场暖纸渐入的暖色罩（非黑场，0.8s 内淡出）
  const veil = el('rect', { x: -60, y: -60, width: W + 120, height: H + 120, fill: '#D9C6A0', opacity: 0.95 }, world);

  // ================= 晕染色块层（不抖） =================
  const gWash = el('g', {}, world);
  // 桌面软影
  el('ellipse', { cx: 680, cy: 830, rx: 330, ry: 34, fill: 'url(#softSh)' }, gWash);
  // 赭石焦虑晕染（头周，退后一些不盖死脸）
  const ochreWash = el('ellipse', { cx: 680, cy: 445, rx: 155, ry: 120, fill: '#9E5A3E', opacity: 0, filter: 'url(#washBlur2)' }, gWash);
  // 降温灰松石青釉（反转后）
  const tealGlaze = el('ellipse', { cx: 680, cy: 460, rx: 195, ry: 155, fill: '#7A9E9F', opacity: 0, filter: 'url(#washBlur2)' }, gWash);
  // 领口水痕（身体往下晕）
  const collarWash = el('path', { d: 'M610 640 Q680 660 750 645 Q760 720 700 760 Q640 740 610 700 Z', fill: '#9E5A3E', opacity: 0, filter: 'url(#washBlur)' }, gWash);
  // 红色墨滴（峰值持续晕开）
  const inkDrops = [];
  [[560, 300, 0], [820, 260, 1], [640, 200, 2], [900, 420, 3]].forEach(([x, y]) => {
    const c = el('ellipse', { cx: x, cy: y, rx: 6, ry: 5, fill: '#A8403F', opacity: 0, filter: 'url(#washBlur)' }, gWash);
    inkDrops.push(c);
  });
  // 峰值段纸面轻微虚柔罩
  const softVeil = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#F5EFE0', opacity: 0 }, gWash);

  // ================= 墨线层（弱沸腾） =================
  const gLine = el('g', { filter: 'url(#boilSoft)' }, world);
  const INK = '#3A3230';
  const LW = 7;

  // --- 小人：圆头(开口) + 豆身 ---
  const charG = el('g', {}, gLine);
  // 头：开口弧（留缺口，速写感）。中心(680,500) r=95，从 -200° 到 155°
  el('path', { d: describeArc(680, 500, 95, -200, 155), fill: 'none', stroke: INK, 'stroke-width': LW, 'stroke-linecap': 'round' }, charG);
  // 豆形身体（开口，底部留白）
  el('path', { d: 'M612 610 Q600 700 660 760 Q720 775 748 710 Q756 660 742 612', fill: 'none', stroke: INK, 'stroke-width': LW, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, charG);
  // 两条小胳膊（放松垂下）
  el('path', { d: 'M618 640 Q606 690 616 724', fill: 'none', stroke: INK, 'stroke-width': LW - 1, 'stroke-linecap': 'round' }, charG);
  el('path', { d: 'M742 640 Q754 690 744 724', fill: 'none', stroke: INK, 'stroke-width': LW - 1, 'stroke-linecap': 'round' }, charG);
  // 桌面线
  el('path', { d: 'M430 820 Q680 828 930 818', fill: 'none', stroke: INK, 'stroke-width': LW, 'stroke-linecap': 'round' }, gLine);

  // --- 手机 ---
  const phoneG = el('g', { opacity: 0 }, gLine);
  el('rect', { x: 1255, y: 200, width: 150, height: 265, rx: 26, fill: 'none', stroke: INK, 'stroke-width': LW }, phoneG);
  el('line', { x1: 1305, y1: 222, x2: 1355, y2: 222, stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, phoneG);
  // 气泡（椭圆 + 三小点）
  el('ellipse', { cx: 1330, cy: 330, rx: 52, ry: 38, fill: 'none', stroke: INK, 'stroke-width': 5 }, phoneG);
  el('circle', { cx: 1312, cy: 330, r: 4.5, fill: INK }, phoneG);
  el('circle', { cx: 1330, cy: 330, r: 4.5, fill: INK }, phoneG);
  el('circle', { cx: 1348, cy: 330, r: 4.5, fill: INK }, phoneG);
  el('path', { d: 'M1298 362 L1288 380 L1316 366', fill: 'none', stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, phoneG);
  // 未读红点（色块层更合适，放 wash 里但这里引用）
  const unreadDot = el('circle', { cx: 1405, cy: 228, r: 7, fill: '#A8403F' }, gWash);
  const unreadNum = el('text', { x: 1405, y: 237, 'text-anchor': 'middle', 'font-family': 'CaveatF', 'font-size': 30, fill: '#FBF7EC', opacity: 0 }, gLine);
  txt(unreadNum, '99+');

  // --- 日历 4×3 ---
  const calG = el('g', { opacity: 0 }, gLine);
  el('rect', { x: 1210, y: 560, width: 250, height: 260, rx: 18, fill: 'none', stroke: INK, 'stroke-width': LW }, calG);
  el('line', { x1: 1210, y1: 610, x2: 1460, y2: 610, stroke: INK, 'stroke-width': 5 }, calG);
  el('line', { x1: 1268, y1: 545, x2: 1268, y2: 575, stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, calG);
  el('line', { x1: 1402, y1: 545, x2: 1402, y2: 575, stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, calG);
  const calCells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = 1228 + c * 57, y = 628 + r * 66;
    el('rect', { x, y, width: 46, height: 50, rx: 6, fill: 'none', stroke: INK, 'stroke-width': 3.5 }, calG);
    const fill = el('rect', { x: x + 5, y: y + 5, width: 36, height: 40, rx: 4, fill: '#9E5A3E', opacity: 0 }, gWash);
    calCells.push(fill);
  }
  const calNum = el('text', { x: 1335, y: 870, 'text-anchor': 'middle', 'font-family': 'CaveatF', 'font-size': 40, fill: INK }, gLine);
  txt(calNum, '1/12');

  // --- 头顶仪表盘（半圆弧 + 指针） ---
  const dashG = el('g', { opacity: 0 }, gLine);
  // 半圆弧：中心(680,280) r=105，从 180°→0°
  el('path', { d: describeArc(680, 280, 105, 180, 360), fill: 'none', stroke: INK, 'stroke-width': LW, 'stroke-linecap': 'round' }, dashG);
  // 红区（右三分之一）
  el('path', { d: describeArc(680, 280, 105, 300, 360), fill: 'none', stroke: '#A8403F', 'stroke-width': LW + 2, 'stroke-linecap': 'round' }, dashG);
  // 刻度小线
  for (let a = 180; a <= 360; a += 30) {
    const r1 = 91, r2 = 101;
    const rad = a * Math.PI / 180;
    el('line', { x1: 680 + r1 * Math.cos(rad), y1: 280 - r1 * Math.sin(rad), x2: 680 + r2 * Math.cos(rad), y2: 280 - r2 * Math.sin(rad), stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, dashG);
  }
  // 指针组（绕 680,280 旋转）
  const needleG = el('g', { transform: 'translate(680 280) rotate(0)' }, dashG);
  el('line', { x1: 0, y1: 12, x2: 0, y2: -83, stroke: '#A8403F', 'stroke-width': 6, 'stroke-linecap': 'round' }, needleG);
  el('circle', { cx: 0, cy: 0, r: 10, fill: INK }, needleG);
  el('circle', { cx: 680, cy: 280, r: 4, fill: '#FBF7EC' }, dashG);
  const dashNum = el('text', { x: 680, y: 175, 'text-anchor': 'middle', 'font-family': 'CaveatF', 'font-size': 46, fill: INK, opacity: 0 }, gLine);
  txt(dashNum, '0%');

  // --- 汗珠 ---
  const sweats = [];
  [[560, 360], [800, 350], [600, 330]].forEach(() => {
    const d = el('path', { d: 'M0 -16 C10 -2 10 10 0 12 C-10 10 -10 -2 0 -16 Z', fill: '#7A9E9F', opacity: 0, filter: 'url(#washBlur)' }, gWash);
    sweats.push(d);
  });

  // --- 茶杯 + 手 ---
  const cupG = el('g', { opacity: 0 }, gLine);
  // 手（从右下边缘绕到茶杯，从日历下方经过不穿日历）
  el('path', { d: 'M1920 950 Q1700 905 1450 865 Q1250 832 1120 790', fill: 'none', stroke: INK, 'stroke-width': LW, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cupG);
  // 茶杯（在桌面 x≈1010）
  el('path', { d: 'M950 760 L960 812 Q1010 826 1060 812 L1070 760 Z', fill: 'none', stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, cupG);
  el('path', { d: 'M1070 770 Q1110 775 1106 800 Q1102 820 1064 814', fill: 'none', stroke: INK, 'stroke-width': LW - 1, 'stroke-linecap': 'round' }, cupG);
  el('ellipse', { cx: 1010, cy: 762, rx: 60, ry: 10, fill: 'none', stroke: INK, 'stroke-width': 5 }, cupG);
  // 蒸汽三道
  const steams = [];
  [[985, 730], [1010, 720], [1035, 730]].forEach(([x, y]) => {
    const s = el('path', { d: `M${x} ${y} q-10 -22 0 -44 q10 -22 0 -44`, fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0 }, cupG);
    steams.push(s);
  });

  // --- 五瓣小野花（右下空白处，避开日历） ---
  const flowerG = el('g', { opacity: 0 }, gLine);
  el('path', { d: 'M1680 965 Q1676 925 1682 885', fill: 'none', stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, flowerG);
  // 五瓣（用一条 path 靠 stroke-dasharray 逐笔画出）
  const flowerPath = el('path', {
    d: describeFlower(1682, 845, 34), fill: 'none', stroke: '#A8403F', 'stroke-width': 5,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'pathLength': 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1
  }, flowerG);
  el('circle', { cx: 1682, cy: 845, r: 9, fill: 'none', stroke: INK, 'stroke-width': 4 }, flowerG);

  // ================= 五官层（锁死，不抖） =================
  const gFace = el('g', {}, world);
  // 腮红
  el('ellipse', { cx: 632, cy: 522, rx: 14, ry: 9, fill: '#E8C9A8', opacity: 0.7 }, gFace);
  el('ellipse', { cx: 728, cy: 522, rx: 14, ry: 9, fill: '#E8C9A8', opacity: 0.7 }, gFace);
  // 眼睛（两点）
  el('circle', { cx: 652, cy: 492, r: 5.5, fill: INK }, gFace);
  el('circle', { cx: 708, cy: 492, r: 5.5, fill: INK }, gFace);
  // 嘴：默认一条短横线；反转后换成微笑弧线
  const mouthFlat = el('line', { x1: 664, y1: 538, x2: 696, y2: 538, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, gFace);
  const mouthSmile = el('path', { d: 'M662 534 Q680 548 698 534', fill: 'none', stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, gFace);
  show(mouthSmile, false);

  // ================= 文案层（手写，不抖） =================
  const gText = el('g', {}, world);
  function caption(y, size) {
    return el('text', { x: CX, y, 'text-anchor': 'middle', 'font-family': 'ZhiMang', 'font-size': size, fill: INK, opacity: 0 }, gText);
  }
  const cap1 = caption(150, 66); txt(cap1, '我的前额叶…');
  const cap2 = caption(150, 66); txt(cap2, '早上 99+ 未读');
  const cap3 = caption(150, 66); txt(cap3, '班味，腌入味了');
  const cap4 = caption(150, 60); txt(cap4, 'CPU 超频 —— 散热还是原装的');
  // 压轴句：朱砂加粗（描边模拟加粗）
  const cap5 = el('text', { x: CX, y: 160, 'text-anchor': 'middle', 'font-family': 'ZhiMang', 'font-size': 88, fill: '#B84A3F', stroke: '#B84A3F', 'stroke-width': 2, 'paint-order': 'stroke', opacity: 0 }, gText);
  txt(cap5, '前额叶没坏，是累了。');
  // 署名（钢笔/手写）
  const sig = el('text', { x: CX, y: 1015, 'text-anchor': 'middle', 'font-family': 'ZhiMang', 'font-size': 46, fill: INK, opacity: 0 }, gText);
  txt(sig, '由 Doubao 在30秒内用纯代码制作完成');

  // ================= 纸纹盖顶 =================
  const grainRect = el('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#grain)', opacity: 0.3 }, stage);

  // ---------- 工具：圆弧 path ----------
  function describeArc(cx, cy, r, a0, a1) {
    const rad = a => a * Math.PI / 180;
    const x0 = cx + r * Math.cos(rad(a0)), y0 = cy - r * Math.sin(rad(a0));
    const x1 = cx + r * Math.cos(rad(a1)), y1 = cy - r * Math.sin(rad(a1));
    const large = (a1 - a0) % 360 > 180 ? 1 : 0;
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  function describeFlower(cx, cy, r) {
    let d = '';
    for (let i = 0; i < 5; i++) {
      const a = (-90 + i * 72) * Math.PI / 180;
      const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      d += (i ? ' L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1);
      // 花瓣用小圆弧回来
      const a2 = (-90 + (i + 0.5) * 72) * Math.PI / 180;
      const mx = cx + r * 0.62 * Math.cos(a2), my = cy + r * 0.62 * Math.sin(a2);
      d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} `;
      const a3 = (-90 + (i + 1) * 72) * Math.PI / 180;
      d += (cx + r * Math.cos(a3)).toFixed(1) + ' ' + (cy + r * Math.sin(a3)).toFixed(1);
    }
    return d + ' Z';
  }

  // ================= render(t) =================
  function render(t) {
    const frame = Math.round(t * T.fps);

    // 纸纹 seed 每帧更新（无两帧相同）
    grainTurb.setAttribute('seed', frame % 1000);
    boilTurb.setAttribute('seed', (frame * 7) % 1000);
    // 弱沸腾：平时 scale=12，19.0–19.3 全体线轻抖一下到 18
    const shaking = t >= T.trembleT && t < T.trembleT + 0.3;
    boilDisp.setAttribute('scale', shaking ? 20 : 16);

    // 世界呼吸 + 逐帧微抖（保证下采样后帧差≥6）
    const br = 1.0 + 0.008 * Math.sin(t * 0.7);
    const jx = (h(frame * 1.3) - 0.5) * 9.0;
    const jy = (h(frame * 2.7) - 0.5) * 9.0;
    world.setAttribute('transform', `translate(${(CX + jx).toFixed(2)} ${(CY + jy).toFixed(2)}) scale(${br.toFixed(4)}) translate(${-CX} ${-CY})`);

    // 开场暖色罩
    veil.setAttribute('opacity', (1 - smooth(T.paperFadeIn, T.paperFadeEnd, t)) * 0.95);

    // 小人淡入
    const ca = smooth(0.4, 1.2, t);
    charG.setAttribute('opacity', ca);
    gFace.setAttribute('opacity', ca);

    // 手机
    phoneG.setAttribute('opacity', smooth(T.phoneIn, T.phoneIn + 0.6, t));
    const uf = smooth(T.unreadStart, T.unreadEnd, t);
    unreadDot.setAttribute('r', lerp(7, 27, backOut(uf)));
    unreadDot.setAttribute('cx', 1405); unreadDot.setAttribute('cy', 228);
    unreadDot.setAttribute('opacity', smooth(T.phoneIn, T.phoneIn + 0.5, t));
    unreadNum.setAttribute('opacity', smooth(0.8, 0.95, uf) * smooth(T.phoneIn, T.phoneIn + 0.5, t));
    unreadNum.setAttribute('y', 233);

    // 日历
    calG.setAttribute('opacity', smooth(T.calIn, T.calIn + 0.6, t));
    calNum.setAttribute('opacity', smooth(T.calIn, T.calIn + 0.6, t));
    const filled = Math.round(smooth(T.calFillStart, T.calFillEnd, t) * 12);
    calCells.forEach((f, i) => f.setAttribute('opacity', i < filled ? 0.85 : 0));
    txt(calNum, Math.max(1, filled) + '/12');

    // 仪表盘
    dashG.setAttribute('opacity', smooth(T.dashIn, T.dashIn + 0.6, t));
    dashNum.setAttribute('opacity', smooth(T.dashIn, T.dashIn + 0.6, t));
    const nf = smooth(T.needleStart, T.needleEnd, t);
    const ang = lerp(180, 360, nf);   // 指针角度
    needleG.setAttribute('transform', `translate(680 280) rotate(${(ang - 270).toFixed(1)})`);
    txt(dashNum, Math.round(nf * 100) + '%');

    // 赭石晕染：14s 长出 → 23.6 开始退 → 灰松石青釉上
    let washOp = smooth(T.washStart, 18.5, t);
    washOp *= 1 - smooth(T.washRecedeStart, T.washRecedeEnd, t);
    ochreWash.setAttribute('opacity', washOp * 0.55);
    ochreWash.setAttribute('rx', (155 + 30 * smooth(T.washStart, 18.5, t)).toFixed(0));
    tealGlaze.setAttribute('opacity', smooth(T.washRecedeStart + 0.2, T.washRecedeEnd + 0.8, t) * 0.5);

    // 领口水痕
    collarWash.setAttribute('opacity', smooth(T.collarBleedStart, T.collarBleedEnd, t) * 0.8);

    // 红墨滴（峰值持续晕开）
    T.inkDrops.forEach((ti, i) => {
      const g = easeOut((t - ti) / 1.3);
      inkDrops[i].setAttribute('opacity', clamp(g, 0, 1) * 0.7);
      inkDrops[i].setAttribute('rx', (6 + 38 * clamp(g, 0, 1)).toFixed(0));
      inkDrops[i].setAttribute('ry', (5 + 32 * clamp(g, 0, 1)).toFixed(0));
    });

    // 峰值段纸面轻虚
    softVeil.setAttribute('opacity', smooth(T.softFocus, T.softFocus + 1.5, t) * (1 - smooth(24, 26, t)) * 0.18);

    // 汗珠：出现、下落、淡出
    T.sweatDrops.forEach((ti, i) => {
      const p = (t - ti) / 0.9;
      const s = sweats[i];
      if (p < 0 || p > 1) { s.setAttribute('opacity', 0); return; }
      s.setAttribute('opacity', 1 - p);
      const base = [[560, 360], [800, 350], [600, 330]][i];
      s.setAttribute('transform', `translate(${base[0]} ${base[1] + p * 46})`);
    });

    // 茶杯 + 手
    const cupP = backOut((t - T.cupSet) / 0.9);
    cupG.setAttribute('opacity', smooth(T.handIn, T.cupSet, t));
    cupG.setAttribute('transform', `translate(0 ${(1 - clamp(cupP, 0, 1)) * 130})`);
    // 蒸汽：三道逐帧起伏
    const steamOn = t >= T.cupSet ? 1 : 0;
    steams.forEach((s, i) => {
      s.setAttribute('opacity', steamOn * (0.5 + 0.3 * Math.sin(t * 2.2 + i * 1.7)));
      s.setAttribute('transform', `translate(${((i - 1) * 3.5 * Math.sin(t * 1.8 + i)).toFixed(1)} 0)`);
    });

    // 微笑
    const lu = smooth(T.lookUp, T.lookUp + 0.8, t);
    show(mouthFlat, lu < 0.5);
    show(mouthSmile, lu >= 0.5);

    // 文案淡入淡出
    cap1.setAttribute('opacity', smooth(0.9, 1.4, t) * (1 - smooth(2.6, 3.2, t)));
    cap2.setAttribute('opacity', smooth(4.3, 4.9, t) * (1 - smooth(7.6, 8.2, t)));
    cap3.setAttribute('opacity', smooth(8.7, 9.3, t) * (1 - smooth(12.4, 13.0, t)));
    cap4.setAttribute('opacity', smooth(13.4, 14.0, t) * (1 - smooth(18.6, 19.2, t)));
    cap5.setAttribute('opacity', smooth(T.cap5, T.cap5 + 0.9, t) * (1 - smooth(27.4, 28.0, t)));

    // 野花逐笔画出
    flowerG.setAttribute('opacity', smooth(T.flowerDrawStart, T.flowerDrawStart + 0.3, t));
    const fd = smooth(T.flowerDrawStart, T.flowerDrawEnd, t);
    flowerPath.setAttribute('stroke-dashoffset', (1 - fd).toFixed(3));

    // 署名
    sig.setAttribute('opacity', smooth(T.sigIn, T.sigIn + 0.8, t));
  }

  window.render = render;
  render(0);
})();
