// render.js —— 纯函数 render(t) 驱动全片。《上山求道记》国风青绿山水。
// 所有元素加载时建好一次；render(t) 只改属性 / transform / textContent。禁 Math.random / 异步。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const { T } = window;
  const NFRAME = T.duration * T.fps;

  // ---------- 确定性哈希与缓动 ----------
  const h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = (a, b, x) => { const p = clamp((x - a) / (b - a), 0, 1); return p * p * (3 - 2 * p); };
  const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
  const backOut = p => { const c = 1.70158, s = 1.05; p -= 1; return s * p * p * ((c + 1) * p + c) + 1; };

  // ---------- 青绿色板 ----------
  const PAL = {
    paper: '#F1E9D2',
    ink: '#2B2B26',
    inkSoft: '#5A5A50',
    gHead: '#4F9D69', gMid: '#2F7D5B', gDeep: '#1F5C46',
    bHead: '#2E6E8E', bMid: '#3A7CA5', bDeep: '#1B4A5E',
    ochre: '#B5763A',
    cin: '#B23A2E'
  };
  // 远山：向宣纸色混合
  const mixPaper = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const pr = 0xF1, pg = 0xE9, pb = 0xD2;
    return `rgb(${Math.round(lerp(r, pr, k))},${Math.round(lerp(g, pg, k))},${Math.round(lerp(b, pb, k))})`;
  };

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

  // 山体纵向渐变：峰顶青 → 山腰绿 → 山脚露赭
  const mtnGrad = el('linearGradient', { id: 'mtnGrad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  el('stop', { offset: '0%', 'stop-color': PAL.bMid }, mtnGrad);
  el('stop', { offset: '30%', 'stop-color': PAL.bHead }, mtnGrad);
  el('stop', { offset: '55%', 'stop-color': PAL.gHead }, mtnGrad);
  el('stop', { offset: '100%', 'stop-color': PAL.gMid }, mtnGrad);
  const mtnGradDeep = el('linearGradient', { id: 'mtnGradDeep', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  el('stop', { offset: '0%', 'stop-color': PAL.bHead }, mtnGradDeep);
  el('stop', { offset: '45%', 'stop-color': PAL.gMid }, mtnGradDeep);
  el('stop', { offset: '100%', 'stop-color': PAL.gDeep }, mtnGradDeep);

  // 云雾晕染（高斯模糊）
  const fogF = el('filter', { id: 'fog', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
  el('feGaussianBlur', { stdDeviation: 9 }, fogF);

  // 宣纸纤维（极低）
  const paperF = el('filter', { id: 'paperFib', x: '0', y: '0', width: '100%', height: '100%' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.012', numOctaves: '2', seed: '5', stitchTiles: 'stitch' }, paperF);
  el('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0 0.26  0 0 0 0.05 0' }, paperF);

  // ============================ 视差速度曲线 ============================
  // 近景速度倍率：0-540 恒定；540-675 加速推主峰；675 后特写慢漂
  function velMult(f) {
    if (f <= 540) return 1;
    if (f <= 675) { const p = (f - 540) / 135; return 1 + 0.55 * smooth(0, 1, p); }
    return 0.22;
  }
  const SCROLL = new Float64Array(NFRAME + 1);
  for (let f = 1; f <= NFRAME; f++) SCROLL[f] = SCROLL[f - 1] + T.nearV * velMult(f - 0.5);

  const TW = 2880; // 无缝循环宽度 1.5 屏

  // ============================ 世界根（特写推镜缩放） ============================
  const world = el('g', { id: 'world' }, stage);
  // 底：宣纸（放大到屏外，扛推镜）
  el('rect', { x: -1200, y: -1200, width: W + 2400, height: H + 2400, fill: PAL.paper }, world);

  // ---------- 山形生成 ----------
  function moundPath(x0, x1, baseY, peakY) {
    const px = (x0 + x1) / 2;
    return `M${x0} ${baseY} C ${x0 + (px - x0) * 0.15} ${peakY + (baseY - peakY) * 0.7}, ${px - (px - x0) * 0.25} ${peakY}, ${px} ${peakY} C ${px + (x1 - px) * 0.25} ${peakY}, ${x1 - (x1 - px) * 0.15} ${peakY + (baseY - peakY) * 0.7}, ${x1} ${baseY} Z`;
  }

  // 远山层（最慢，比例 1）：淡青、向宣纸混
  function buildFarTile(parent) {
    const g = el('g', {}, parent);
    let x = -100;
    let i = 0;
    while (x < TW + 200) {
      const w = 420 + h(i * 3.1 + 1) * 260;
      const peak = 360 + h(i * 3.1 + 2) * 120;
      const col = mixPaper(PAL.bHead, 0.35 + h(i) * 0.15);
      el('path', { d: moundPath(x, x + w, 760, peak), fill: col, opacity: 0.95 }, g);
      x += w * (0.62 + h(i * 1.7) * 0.2);
      i++;
    }
    return g;
  }
  // 中山层（比例 2）：绿、峰顶青
  function buildMidTile(parent) {
    const g = el('g', {}, parent);
    let x = -140;
    let i = 0;
    while (x < TW + 200) {
      const w = 380 + h(i * 2.3 + 11) * 240;
      const peak = 520 + h(i * 2.3 + 12) * 120;
      el('path', { d: moundPath(x, x + w, 860, peak), fill: 'url(#mtnGrad)', stroke: PAL.ink, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, g);
      // 山脚露赭石一条
      el('path', { d: `M${x + w * 0.12} 860 L${x + w * 0.88} 860`, stroke: PAL.ochre, 'stroke-width': 5, opacity: 0.8 }, g);
      x += w * (0.55 + h(i * 1.3) * 0.22);
      i++;
    }
    return g;
  }
  // 近地面层（比例 3）：近景压脚 + 循环草石
  const nearGroundGrass = [];
  function buildNearTile(parent) {
    const g = el('g', {}, parent);
    // 近景山脚重色带
    el('path', { d: `M-50 980 Q 720 900 1440 960 T 2980 940 L 2980 1120 L -50 1120 Z`, fill: PAL.gDeep }, g);
    // 循环草簇 / 小石
    let x = 0;
    let i = 0;
    while (x < TW) {
      const gy = 985 + h(i * 5.1) * 70;
      const tuft = el('g', { transform: `translate(${x} ${gy})` }, g);
      el('path', { d: 'M0 0 Q3 -14 6 0 M8 0 Q11 -18 14 0 M16 0 Q19 -12 22 0', fill: 'none', stroke: PAL.gMid, 'stroke-width': 2.2, 'stroke-linecap': 'round' }, tuft);
      if (h(i * 7.7) > 0.55) el('ellipse', { cx: 30, cy: 2, rx: 12, ry: 6, fill: PAL.ochre, opacity: 0.7 }, tuft);
      nearGroundGrass.push(tuft);
      x += 150 + h(i * 3.3) * 120;
      i++;
    }
    return g;
  }

  const farLayer = el('g', {}, world);
  const midLayer = el('g', {}, world);
  const nearLayer = el('g', {}, world);
  // 两个副本无缝循环
  const farTiles = [buildFarTile(farLayer), null]; farTiles[1] = el('g', {}, farLayer); farTiles[0] = farLayer.children[0];
  // 重建：直接铺两个 tile 实例
  farLayer.innerHTML = '';
  const farA = buildFarTile(farLayer); farA.setAttribute('transform', 'translate(0 0)');
  const farB = buildFarTile(farLayer); farB.setAttribute('transform', `translate(${TW} 0)`);
  midLayer.innerHTML = '';
  const midA = buildMidTile(midLayer);
  const midB = buildMidTile(midLayer); midB.setAttribute('transform', `translate(${TW} 0)`);
  nearLayer.innerHTML = '';
  const nearA = buildNearTile(nearLayer);
  const nearB = buildNearTile(nearLayer); nearB.setAttribute('transform', `translate(${TW} 0)`);

  // ---------- 云（留白 + 极少淡墨线，如意头） ----------
  const cloudGroup = el('g', {}, world);
  const clouds = [];
  function cloudPath(s) {
    return `M0 0 q${18 * s} -26 ${40 * s} -8 q${10 * s} -22 ${34 * s} -8 q${22 * s} -10 ${26 * s} 10 q${16 * s} -4 ${14 * s} 12 z`;
  }
  for (let i = 0; i < 6; i++) {
    const cg = el('g', { opacity: 0.85 }, cloudGroup);
    el('path', { d: cloudPath(0.9 + h(i * 9.2) * 0.7), fill: PAL.paper, stroke: PAL.inkSoft, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, cg);
    el('path', { d: cloudPath(0.9 + h(i * 4.4) * 0.6), fill: 'none', stroke: PAL.inkSoft, 'stroke-width': 1.2, transform: `translate(${30} ${26}) scale(0.8)` }, cg);
    clouds.push({ g: cg, baseY: 180 + h(i * 6.6) * 300, speed: 0.25 + h(i) * 0.3, off: h(i * 2.2) * W });
  }

  // ---------- 水面/山路短横水纹 ----------
  const waterGroup = el('g', {}, world);
  const waterLines = [];
  for (let i = 0; i < 16; i++) {
    const ln = el('path', { d: 'M0 0 q18 -4 36 0 q18 4 36 0', fill: 'none', stroke: PAL.inkSoft, 'stroke-width': 1.4, opacity: 0.5 }, waterGroup);
    waterLines.push({ el: ln, baseX: (i * 230) % W, y: 880 + h(i * 3.3) * 150 });
  }

  // ---------- 飞鸟 ----------
  const birdGroup = el('g', {}, world);
  const birds = [];
  for (let i = 0; i < 4; i++) {
    const b = el('path', { d: 'M0 0 q6 -7 12 0 q6 -7 12 0', fill: 'none', stroke: PAL.ink, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, birdGroup);
    birds.push({ el: b, y: 140 + h(i * 8.8) * 200, off: h(i * 5.5) * W, speed: 1.1 + h(i) * 0.5 });
  }

  // ============================ 故事点景（世界坐标 wx，随近景卷动） ============================
  const storyLayer = el('g', {}, world);

  // —— R1 砍柴：石碑 + 柴堆 ——
  const STELE_WX = 2074;
  const gStele = el('g', { transform: `translate(${STELE_WX} 0)` }, storyLayer);
  // 石碑
  el('rect', { x: -130, y: 470, width: 260, height: 330, rx: 14, fill: mixPaper(PAL.gHead, 0.25), stroke: PAL.ink, 'stroke-width': 2.2 }, gStele);
  el('rect', { x: -150, y: 450, width: 300, height: 40, rx: 12, fill: PAL.gMid, stroke: PAL.ink, 'stroke-width': 2 }, gStele);
  const steleText = el('text', { x: 0, y: 540, 'text-anchor': 'middle', 'font-family': 'LXGW', 'font-size': 34, fill: PAL.ink }, gStele);
  txt(steleText, '日砍叁佰担柴');
  const steleText2 = el('text', { x: 0, y: 592, 'text-anchor': 'middle', 'font-family': 'LXGW', 'font-size': 34, fill: PAL.ink }, gStele);
  txt(steleText2, '方准入山');
  // 碑下朱砂小印
  el('rect', { x: 78, y: 700, width: 46, height: 46, rx: 6, fill: PAL.cin }, gStele);
  // 柴堆（高度随帧涨）
  const woodPile = el('g', {}, gStele);
  for (let i = 0; i < 8; i++) {
    const log = el('rect', { x: -300 + (i % 2) * 6, y: 760 - i * 16, width: 120, height: 13, rx: 6, fill: PAL.ochre, stroke: PAL.inkSoft, 'stroke-width': 1.2, transform: `rotate(${(i % 3 - 1) * 3} -240 ${760 - i * 16})`, 'data-log': i }, woodPile);
  }

  // —— R2 炼丹：丹炉 + 火 + OKR 符 ——
  const FURNACE_WX = 2816;
  const gFurnace = el('g', { transform: `translate(${FURNACE_WX} 0)` }, storyLayer);
  // 炉身（三足鼎）
  el('path', { d: 'M-90 700 Q -100 600 0 590 Q 100 600 90 700 L 70 760 L -70 760 Z', fill: PAL.bDeep, stroke: PAL.ink, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, gFurnace);
  el('path', { d: 'M-100 600 Q 0 566 100 600 L 86 612 Q 0 582 -86 612 Z', fill: PAL.ink, opacity: 0.25 }, gFurnace);
  el('path', { d: 'M-55 760 l-8 34 M55 760 l8 34 M0 760 l0 34', stroke: PAL.ink, 'stroke-width': 6, 'stroke-linecap': 'round' }, gFurnace);
  // 火（忽大忽小）
  const flame = el('path', { d: 'M-30 600 Q -20 540 0 520 Q 20 540 30 600 Q 0 585 -30 600 Z', fill: PAL.cin, opacity: 0.92 }, gFurnace);
  const flameInner = el('path', { d: 'M-14 600 Q -8 566 0 556 Q 8 566 14 600 Q 0 592 -14 600 Z', fill: '#E8A33D', opacity: 0.95 }, gFurnace);
  // 朱砂 OKR 符纸
  el('rect', { x: -30, y: 630, width: 60, height: 56, rx: 4, fill: PAL.paper, stroke: PAL.cin, 'stroke-width': 2 }, gFurnace);
  const okrText = el('text', { x: 0, y: 668, 'text-anchor': 'middle', 'font-family': 'LXGW', 'font-size': 26, fill: PAL.cin }, gFurnace);
  txt(okrText, 'OKR');

  // —— R3 云海考勤：签到牌 ——
  const SIGN_WX = 3559;
  const gSign = el('g', { transform: `translate(${SIGN_WX} 0)` }, storyLayer);
  el('line', { x1: 0, y1: 430, x2: 0, y2: 760, stroke: PAL.ochre, 'stroke-width': 8, 'stroke-linecap': 'round' }, gSign);
  el('rect', { x: -150, y: 380, width: 300, height: 96, rx: 10, fill: mixPaper(PAL.bHead, 0.3), stroke: PAL.ink, 'stroke-width': 2.2 }, gSign);
  const signText = el('text', { x: 0, y: 422, 'text-anchor': 'middle', 'font-family': 'LXGW', 'font-size': 30, fill: PAL.ink }, gSign);
  txt(signText, '云海考勤');
  const signText2 = el('text', { x: 0, y: 458, 'text-anchor': 'middle', 'font-family': 'LXGW', 'font-size': 24, fill: PAL.cin }, gSign);
  txt(signText2, '迟到扣修行');
  // 签到手印
  const stampMark = el('circle', { cx: 108, cy: 428, r: 20, fill: PAL.cin, opacity: 0 }, gSign);

  // —— 登顶：半山亭 + 白须仙人 ——
  const PAV_WX = 4395;
  const gPav = el('g', { transform: `translate(${PAV_WX} 0)` }, storyLayer);
  // 半山小亭（三角歇山顶 + 两柱 + 横栏），半藏山腰
  el('path', { d: 'M-150 560 L0 470 L150 560 Z', fill: PAL.bDeep, stroke: PAL.ink, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, gPav);
  el('path', { d: 'M-165 560 L165 560', stroke: PAL.ink, 'stroke-width': 3 }, gPav);
  el('line', { x1: -90, y1: 560, x2: -90, y2: 720, stroke: PAL.ochre, 'stroke-width': 7 }, gPav);
  el('line', { x1: 90, y1: 560, x2: 90, y2: 720, stroke: PAL.ochre, 'stroke-width': 7 }, gPav);
  el('line', { x1: -110, y1: 660, x2: 110, y2: 660, stroke: PAL.ochre, 'stroke-width': 5 }, gPav);
  // 仙人（白须坐蒲团）
  const immortal = el('g', { transform: 'translate(0 610)' }, gPav);
  el('ellipse', { cx: 0, cy: 66, rx: 46, ry: 14, fill: PAL.ochre, opacity: 0.8 }, immortal); // 蒲团
  el('path', { d: 'M-26 66 Q -30 20 0 14 Q 30 20 26 66 Z', fill: mixPaper(PAL.bHead, 0.15), stroke: PAL.ink, 'stroke-width': 2 }, immortal); // 袍
  el('circle', { cx: 0, cy: 0, r: 18, fill: PAL.paper, stroke: PAL.ink, 'stroke-width': 2 }, immortal); // 头
  el('path', { d: 'M-8 6 Q 0 30 8 6 Q 0 16 -8 6 Z', fill: PAL.paper, stroke: PAL.inkSoft, 'stroke-width': 1.4 }, immortal); // 白须
  // 仙人案头（特写用）：卷轴竹简堆
  const desk = el('g', { transform: 'translate(0 715)' }, gPav);
  el('rect', { x: -120, y: 0, width: 240, height: 14, rx: 4, fill: PAL.ochre, stroke: PAL.ink, 'stroke-width': 1.6 }, desk); // 案面
  const scrollStack = el('g', { transform: 'translate(-70 -10)' }, desk);
  for (let i = 0; i < 5; i++) {
    el('rect', { x: 0, y: -i * 12, width: 150, height: 11, rx: 4, fill: PAL.paper, stroke: PAL.inkSoft, 'stroke-width': 1.2, transform: `rotate(${(h(i) - 0.5) * 6})` }, scrollStack);
  }
  const q3Label = el('text', { x: -6, y: -60, 'text-anchor': 'start', 'font-family': 'LXGW', 'font-size': 19, fill: PAL.ink }, scrollStack);
  txt(q3Label, '天庭Q3绩效');
  el('rect', { x: 78, y: -80, width: 44, height: 34, rx: 5, fill: PAL.cin }, scrollStack); // 最上盖朱砂印
  // 算筹
  const rods = el('g', { transform: 'translate(60 -8)' }, desk);
  for (let i = 0; i < 6; i++) el('line', { x1: i * 6, y1: 0, x2: i * 6, y2: -26, stroke: PAL.ochre, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, rods);
  // 仙人汗滴（特写冒）
  const sweatImm = el('path', { d: 'M24 -16 q4 10 0 16 q-4 -6 0 -16 z', fill: PAL.bMid, opacity: 0 }, immortal);

  // 亭旁炊烟（朱砂淡色上飘淡出）
  const smoke = el('g', { transform: 'translate(120 540)' }, gPav);
  const smokePuffs = [];
  for (let i = 0; i < 4; i++) {
    const p = el('circle', { r: 12, fill: PAL.cin, opacity: 0 }, smoke);
    smokePuffs.push(p);
  }

  // ============================ 小吏主角（屏幕空间） ============================
  const hiker = el('g', { id: 'hiker' }, world);
  const hBody = el('g', {}, hiker);
  // 腿
  const legL = el('line', { x1: -6, y1: 0, x2: -10, y2: 40, stroke: PAL.ink, 'stroke-width': 6, 'stroke-linecap': 'round' }, hBody);
  const legR = el('line', { x1: 6, y1: 0, x2: 10, y2: 40, stroke: PAL.ink, 'stroke-width': 6, 'stroke-linecap': 'round' }, hBody);
  // 袍
  el('path', { d: 'M-20 0 Q -24 -40 0 -46 Q 24 -40 20 0 Z', fill: PAL.bHead, stroke: PAL.ink, 'stroke-width': 2 }, hBody);
  // 头
  el('circle', { cx: 0, cy: -62, r: 18, fill: PAL.paper, stroke: PAL.ink, 'stroke-width': 2 }, hBody);
  // 发髻
  el('circle', { cx: 0, cy: -82, r: 7, fill: PAL.ink }, hBody);
  // 手臂（持斧/扇）
  const armL = el('line', { x1: -14, y1: -34, x2: -34, y2: -10, stroke: PAL.ink, 'stroke-width': 5, 'stroke-linecap': 'round' }, hBody);
  const armR = el('line', { x1: 14, y1: -34, x2: 34, y2: -10, stroke: PAL.ink, 'stroke-width': 5, 'stroke-linecap': 'round' }, hBody);
  // 竹杖 + 包袱
  const staff = el('line', { x1: 30, y1: -70, x2: 44, y2: 44, stroke: PAL.ochre, 'stroke-width': 5, 'stroke-linecap': 'round' }, hBody);
  const bundle = el('ellipse', { cx: -24, cy: -40, rx: 16, ry: 13, fill: PAL.ochre, stroke: PAL.ink, 'stroke-width': 1.8 }, hBody);
  // 工牌彩蛋（包袱里掉出）
  const badge = el('g', { opacity: 0 }, hBody);
  el('rect', { x: -14, y: -6, width: 28, height: 20, rx: 3, fill: mixPaper(PAL.bHead, 0.2), stroke: PAL.ink, 'stroke-width': 1.5 }, badge);
  el('text', { x: 0, y: 8, 'text-anchor': 'middle', 'font-family': 'LXGW', 'font-size': 11, fill: PAL.ink }, badge);
  badge.children[1].textContent = '工牌';
  // 小吏汗滴
  const sweat = el('path', { d: 'M18 -70 q4 10 0 15 q-4 -5 0 -15 z', fill: PAL.bMid, opacity: 0 }, hBody);

  // ============================ UI 层（屏幕空间，不随推镜） ============================
  const uiLayer = el('g', { id: 'ui' }, stage);

  // 题「上山」
  const titleG = el('g', { opacity: 0 }, uiLayer);
  const titleText = el('text', { x: 250, y: 300, 'font-family': 'ZhiMang', 'font-size': 150, fill: PAL.ink }, titleG);
  txt(titleText, '上山');
  el('rect', { x: 360, y: 330, width: 56, height: 56, rx: 7, fill: PAL.cin }, titleG);
  el('text', { x: 388, y: 372, 'text-anchor': 'middle', 'font-family': 'ZhiMang', 'font-size': 30, fill: PAL.paper }, titleG).textContent = '道';

  // R2 横批题字
  const r2G = el('g', { opacity: 0 }, uiLayer);
  el('text', { x: CX, y: 180, 'text-anchor': 'middle', 'font-family': 'ZhiMang', 'font-size': 46, fill: PAL.ink }, r2G).textContent = '火候须稳，三昧真火勿过勿不及';

  // 反转铺垫卷轴特写文案已在 storyLayer；UI 只放落版
  // 大字落版
  const bigG = el('g', { opacity: 0 }, uiLayer);
  const bigTitle = el('text', { x: CX, y: 470, 'text-anchor': 'middle', 'font-family': 'ZhiMang', 'font-size': 200, fill: PAL.ink }, bigG);
  txt(bigTitle, '山外有山');
  const bigSub = el('text', { x: CX, y: 610, 'text-anchor': 'middle', 'font-family': 'LXGW', 'font-size': 48, fill: PAL.inkSoft }, bigG);
  txt(bigSub, 'KPI 也有山外山');
  const bigSeal = el('rect', { x: CX + 330, y: 500, width: 90, height: 90, rx: 10, fill: PAL.cin }, bigG);
  el('text', { x: CX + 375, y: 562, 'text-anchor': 'middle', 'font-family': 'ZhiMang', 'font-size': 40, fill: PAL.paper }, bigG).textContent = '求道';

  // 山外更高山（叠在落版前，storyLayer 之外的 UI 远景）
  const farPeakG = el('g', { opacity: 0 }, uiLayer);
  el('path', { d: 'M1250 760 L1560 360 L1870 760 Z', fill: mixPaper(PAL.bHead, 0.35), stroke: PAL.inkSoft, 'stroke-width': 2 }, farPeakG);
  el('path', { d: 'M1500 760 L1720 470 L1940 760 Z', fill: mixPaper(PAL.gHead, 0.2), stroke: PAL.inkSoft, 'stroke-width': 1.6 }, farPeakG);
  el('path', { d: 'M1520 470 L1560 430 L1600 470 Z', fill: PAL.bDeep }, farPeakG); // 顶小亭
  el('path', { d: 'M1550 445 l0 22 M1525 467 l50 0', stroke: PAL.inkSoft, 'stroke-width': 2 }, farPeakG);

  // 署名
  const signOff = el('text', { x: CX, y: 1015, 'text-anchor': 'middle', 'font-family': 'LXGW', 'font-size': 32, fill: PAL.ink, opacity: 0 }, uiLayer);
  txt(signOff, '由 Doubao 在30秒内用纯代码制作完成');

  // 宣纸纤维整屏（最上，极低）
  el('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#paperFib)', opacity: 0.6 }, stage);

  // ============================ render(t) ============================
  function screenX(wx, f) { return wx - SCROLL[f]; }

  function render(t) {
    const f = Math.round(t * T.fps);

    // ---- 视差横移 ----
    const sN = SCROLL[f];
    const offNear = sN % TW;
    const offMid = (sN * 2 / 3) % TW;
    const offFar = (sN / 3) % TW;
    nearA.setAttribute('transform', `translate(${-offNear} 0)`);
    nearB.setAttribute('transform', `translate(${TW - offNear} 0)`);
    midA.setAttribute('transform', `translate(${-offMid} 0)`);
    midB.setAttribute('transform', `translate(${TW - offMid} 0)`);
    farA.setAttribute('transform', `translate(${-offFar} 0)`);
    farB.setAttribute('transform', `translate(${TW - offFar} 0)`);

    // ---- 云漂 ----
    clouds.forEach((c, i) => {
      const cx = ((c.off - f * c.speed) % (W + 400) + W + 400) % (W + 400) - 200;
      c.g.setAttribute('transform', `translate(${cx} ${c.baseY + Math.sin((f + i * 40) * 0.01) * 6})`);
    });
    // ---- 水纹缓移 ----
    waterLines.forEach((w, i) => {
      const wx = ((w.baseX - f * (0.8 + i * 0.05)) % (W + 100) + W + 100) % (W + 100) - 50;
      w.el.setAttribute('transform', `translate(${wx} ${w.y})`);
    });
    // ---- 飞鸟 ----
    birds.forEach((b, i) => {
      const bx = W + 60 - ((f * b.speed + i * 260) % (W + 120));
      b.el.setAttribute('transform', `translate(${bx} ${b.y + Math.sin(f * 0.05 + i) * 8}) scale(1.4)`);
    });

    // ---- 故事点景定位 ----
    gStele.setAttribute('transform', `translate(${screenX(STELE_WX, f)} 0)`);
    gFurnace.setAttribute('transform', `translate(${screenX(FURNACE_WX, f)} 0)`);
    gSign.setAttribute('transform', `translate(${screenX(SIGN_WX, f)} 0)`);
    const pavX = screenX(PAV_WX, f);
    gPav.setAttribute('transform', `translate(${pavX} 0)`);

    // ---- 特写推镜中心：始终跟随亭子（绕亭子中心缩放） ----
    const zoomP = smooth(T.b5, T.b5 + 0.9, t);            // 推入
    const zoomOut = smooth(T.b6, T.b6 + 0.9, t);           // 拉出
    const k = 1 + 1.3 * zoomP * (1 - zoomOut);
    const zcx = pavX;
    const zcy = 660;
    world.setAttribute('transform', `translate(${zcx} ${zcy}) scale(${k}) translate(${-zcx} ${-zcy})`);

    // ---- R1 柴堆涨高 ----
    const woodGrow = smooth(T.b1 + 0.6, T.b1 + 4.0, t);
    const logs = woodPile.querySelectorAll('[data-log]');
    logs.forEach((lg, i) => { lg.setAttribute('opacity', i / 8 < woodGrow ? 1 : 0); });

    // ---- R2 炉火忽大忽小 ----
    if (t >= T.b2 && t < T.b3) {
      const fl = 1 + 0.35 * Math.sin(f * 0.25) * (0.5 + 0.5 * Math.sin(f * 0.07));
      flame.setAttribute('transform', `translate(0 ${600 - 60 * fl}) scale(1 ${fl})`);
      flameInner.setAttribute('transform', `translate(0 ${600 - 60 * fl}) scale(0.5 ${fl})`);
    }

    // ---- 亭旁炊烟 ----
    smokePuffs.forEach((p, i) => {
      const cyc = (f * 0.6 + i * 12) % 48;
      p.setAttribute('cy', -cyc);
      p.setAttribute('opacity', Math.max(0, 0.28 - cyc / 200));
    });

    // ---- 仙人拨算筹 + 汗 ----
    if (t >= T.b5) {
      rods.setAttribute('transform', `translate(60 -8) rotate(${Math.sin(f * 0.4) * 4})`);
      sweatImm.setAttribute('opacity', smooth(T.sweatStart, T.sweatStart + 0.5, t) * 0.8);
    } else {
      sweatImm.setAttribute('opacity', 0);
    }

    // ============================ 小吏动作 ============================
    let hx, hy = 860, pose = 'walk', armA = 0;
    if (t < T.b1) {
      // 走入：右下 → 中段，沿石阶
      const p = smooth(T.hikerIn, T.b1, t);
      hx = lerp(2050, 760, p);
      hy = lerp(900, 800, p);
      pose = 'walk';
    } else if (t < T.b2) {
      hx = 700; hy = 830; pose = 'chop';
    } else if (t < T.b3) {
      hx = 820; hy = 850; pose = 'fan';
    } else if (t < T.b4) {
      hx = 860; hy = 860; pose = 'tiptoe';
    } else if (t < T.b5) {
      hx = pavX - 130; hy = 880; pose = 'lookup';
    } else {
      hx = pavX - 150; hy = 880; pose = 'stunned';
    }
    // 步行起伏
    const bob = pose === 'walk' ? Math.abs(Math.sin(f * 0.35)) * 8 : 0;
    hiker.setAttribute('transform', `translate(${hx} ${hy - bob})`);

    // 腿/臂摆动
    if (pose === 'walk') {
      const sw = Math.sin(f * 0.35) * 14;
      legL.setAttribute('transform', `rotate(${sw} -6 0)`);
      legR.setAttribute('transform', `rotate(${-sw} 6 0)`);
      armL.setAttribute('transform', `rotate(${-sw * 0.6} -14 -34)`);
      armR.setAttribute('transform', `rotate(${sw * 0.6} 14 -34)`);
      sweat.setAttribute('opacity', 0);
    } else if (pose === 'chop') {
      const swing = Math.sin((f - T.b1 * 30) * 0.3) * 50;
      armR.setAttribute('transform', `rotate(${swing} 14 -34)`);
      legL.setAttribute('transform', 'rotate(0 -6 0)');
      legR.setAttribute('transform', 'rotate(0 6 0)');
      sweat.setAttribute('opacity', 0);
    } else if (pose === 'fan') {
      const swing = Math.sin((f - T.b2 * 30) * 0.5) * 30;
      armR.setAttribute('transform', `rotate(${-swing} 14 -34)`);
      legL.setAttribute('transform', 'rotate(0 -6 0)');
      legR.setAttribute('transform', 'rotate(0 6 0)');
      sweat.setAttribute('opacity', smooth(T.fanStart, T.fanStart + 1, t) * 0.85);
    } else if (pose === 'tiptoe') {
      legL.setAttribute('transform', 'translate(0 -6)');
      legR.setAttribute('transform', 'translate(0 -6)');
      armR.setAttribute('transform', `rotate(${-120} 14 -34)`);
      armL.setAttribute('transform', `rotate(${100} -14 -34)`);
      sweat.setAttribute('opacity', 0.5);
    } else if (pose === 'lookup') {
      legL.setAttribute('transform', 'rotate(0 -6 0)');
      legR.setAttribute('transform', 'rotate(0 6 0)');
      armR.setAttribute('transform', 'rotate(0 14 -34)');
      armL.setAttribute('transform', 'rotate(0 -14 -34)');
      sweat.setAttribute('opacity', 0);
    } else { // stunned
      legL.setAttribute('transform', 'rotate(0 -6 0)');
      legR.setAttribute('transform', 'rotate(0 6 0)');
      armR.setAttribute('transform', 'rotate(20 14 -34)');
      armL.setAttribute('transform', 'rotate(-20 -14 -34)');
      sweat.setAttribute('opacity', 0.7);
    }

    // 工牌掉落（反转）
    if (t >= T.badgeDrop) {
      const p = smooth(T.badgeDrop, T.badgeDrop + 0.6, t);
      badge.setAttribute('opacity', p);
      badge.setAttribute('transform', `translate(${-24 + 26 * p} ${-40 + (900 - (-40)) * 0 + 60 * p * p}) rotate(${p * 60})`);
    } else {
      badge.setAttribute('opacity', 0);
    }

    // ============================ UI 显隐 ============================
    // 题「上山」：0.9s 起，5.5s 淡出
    titleG.setAttribute('opacity', smooth(T.titleUp, T.titleUp + 0.6, t) * (1 - smooth(5.2, 5.8, t)));
    // R2 横批
    r2G.setAttribute('opacity', smooth(T.b2 + 0.3, T.b2 + 0.9, t) * (1 - smooth(T.b3 - 0.4, T.b3, t)));
    // 签到手印
    stampMark.setAttribute('opacity', smooth(T.tiptoe, T.tiptoe + 0.3, t) * (1 - smooth(T.b3 - 0.3, T.b3, t)));
    // 落版
    const bigP = smooth(T.bigTitle, T.bigTitle + 0.8, t);
    bigG.setAttribute('opacity', bigP);
    bigG.setAttribute('transform', `translate(${0} ${(1 - easeOutCubic(clamp((t - T.bigTitle) / 0.8, 0, 1))) * 60})`);
    // 山外更高山
    farPeakG.setAttribute('opacity', smooth(T.revealMount, T.revealMount + 0.8, t));
    // 朱砂大印落下（绕自身中心 scale）
    const sealCx = CX + 375, sealCy = 545;
    const sealP = backOut(clamp((t - T.sealStamp) / 0.5, 0, 1));
    bigSeal.setAttribute('transform', `translate(${sealCx} ${sealCy}) scale(${sealP}) translate(${-sealCx} ${-sealCy})`);
    // 署名
    signOff.setAttribute('opacity', smooth(T.signOff, T.signOff + 0.5, t));
  }

  window.render = render;
  render(0);
})();
