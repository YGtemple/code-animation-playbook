// render.js ——《最后一份人类工作》赛博霓虹(暗底 synthwave)皮肤。
// 纯函数 render(t)：所有元素加载时建好一次，render 只改属性/切显示。同一 t 必出同一帧。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const yH = 610;                       // 地平线
  const { T } = window;

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

  // ============================ 色板 ============================
  const PAL = {
    deep:   '#05010D',   // 最深
    bg:     '#0B0414',   // 暗底
    panel:  '#120624',   // 面板
    cyan:   '#05D9E8',   // 霓虹青
    cyanHi: '#00FFFF',   // 青芯
    mag:    '#FF2A6D',   // 霓虹品红
    magHi:  '#FF1493',   // 品红芯
    pur:    '#7B00FF',   // 电紫
    purHi:  '#B967FF',   // 提亮紫
    yel:    '#FFE74C',   // 警示黄
    white:  '#E8F6FF',   // UI 冷白
    sub:    '#9FB3C8',   // 次文字
    gray:   '#5A6B82'    // 熄灭灰
  };

  // ============================ DEFS ============================
  const defs = el('defs', {}, stage);

  // 三层辉光（锐内芯 / 中层 / 外晕降透明），feMerge 叠源图
  function glowFilter(id, b1, b2, b3, outerA) {
    const f = el('filter', { id, x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: b1, result: 'gb1' }, f);
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: b2, result: 'gb2' }, f);
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: b3, result: 'gb3' }, f);
    el('feColorMatrix', { in: 'gb3', type: 'matrix',
      values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${outerA} 0`, result: 'gb3d' }, f);
    const m = el('feMerge', {}, f);
    el('feMergeNode', { in: 'gb3d' }, m);
    el('feMergeNode', { in: 'gb2' }, m);
    el('feMergeNode', { in: 'gb1' }, m);
    el('feMergeNode', { in: 'SourceGraphic' }, m);
    return f;
  }
  glowFilter('glow', 1.5, 5, 12, 0.32);        // 普通霓虹
  glowFilter('glowBig', 2, 7, 18, 0.26);       // 标题强辉光

  // 扫描线 pattern：1px 青 / 每 3px
  const scanPat = el('pattern', { id: 'scan', width: '3', height: '3', patternUnits: 'userSpaceOnUse' }, defs);
  el('rect', { x: 0, y: 0, width: 3, height: 1, fill: PAL.cyan, opacity: 0.5 }, scanPat);

  // 噪点 feTurbulence（alpha 压到 ~0.05）
  const noiseF = el('filter', { id: 'noise', x: '0', y: '0', width: '100%', height: '100%' }, defs);
  const noiseT = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '4', stitchTiles: 'stitch' }, noiseF);
  el('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0.7  0 0 0 0 0.8  0 0 0 0 1.0  0 0 0 0.06 0' }, noiseF);

  // 落日竖向渐变
  const sunGrad = el('linearGradient', { id: 'sunGrad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  el('stop', { offset: '0%', 'stop-color': PAL.pur }, sunGrad);
  el('stop', { offset: '55%', 'stop-color': PAL.mag }, sunGrad);
  el('stop', { offset: '100%', 'stop-color': PAL.magHi }, sunGrad);
  // 落日裁剪（上半圆）
  el('clipPath', { id: 'sunClip' }, defs);
  el('circle', { cx: CX, cy: yH, r: 255 }, defs.lastChild);

  // 呼吸光晕（径向）
  const breatheGrad = el('radialGradient', { id: 'breathe', cx: '50%', cy: '50%', r: '50%' }, defs);
  el('stop', { offset: '0%', 'stop-color': PAL.cyan, 'stop-opacity': 0.5 }, breatheGrad);
  el('stop', { offset: '100%', 'stop-color': PAL.cyan, 'stop-opacity': 0 }, breatheGrad);
  // 地面青辉光（撑 halo，由地平线向下衰减到可检测的暗青）
  const floorGrad = el('linearGradient', { id: 'floorGlow', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  el('stop', { offset: '0%', 'stop-color': PAL.cyan, 'stop-opacity': 0.62 }, floorGrad);
  el('stop', { offset: '45%', 'stop-color': PAL.cyan, 'stop-opacity': 0.20 }, floorGrad);
  el('stop', { offset: '100%', 'stop-color': PAL.cyan, 'stop-opacity': 0 }, floorGrad);

  // ============================ 世界根 ============================
  const world = el('g', { id: 'world' }, stage);
  // 背景矩形放大到屏外，呼吸缩放不穿帮
  const bg = el('rect', { x: -200, y: -200, width: W + 400, height: H + 400, fill: PAL.bg }, world);

  // ---------- 远景城市剪影 ----------
  const gCity = el('g', {}, world);
  (function () {
    let x = -20;
    let i = 0;
    while (x < W + 20) {
      const bw = 40 + h(i * 1.7) * 90;
      const bh = 40 + h(i * 2.3) * 150;
      el('rect', { x, y: yH - bh, width: bw, height: bh, fill: PAL.deep }, gCity);
      // 霓虹窗点
      for (let wy = yH - bh + 12; wy < yH - 8; wy += 22) {
        for (let wx = x + 8; wx < x + bw - 8; wx += 16) {
          if (h(wx * 0.7 + wy) > 0.62) {
            el('rect', { x: wx, y: wy, width: 4, height: 6, fill: h(wx + wy) > 0.5 ? PAL.cyan : PAL.mag, opacity: 0.7 }, gCity);
          }
        }
      }
      x += bw + 6; i++;
    }
  })();

  // ---------- 落日（半弧霓虹百叶） ----------
  const gSun = el('g', {}, world);
  el('circle', { cx: CX, cy: yH, r: 255, fill: 'url(#sunGrad)', filter: 'url(#glow)' }, gSun);
  // 百叶切口（暗底横条，越往下越宽）
  const sunStrip = el('g', {}, gSun);
  [
    { dy: 44, hh: 6 }, { dy: 82, hh: 9 }, { dy: 122, hh: 13 }, { dy: 166, hh: 18 }, { dy: 214, hh: 24 }
  ].forEach(s => el('rect', { x: CX - 260, y: yH + s.dy, width: 520, height: s.hh, fill: PAL.bg }, sunStrip));

  // ---------- 等距网格地面 ----------
  const gGrid = el('g', {}, world);
  // 纵深射线
  for (let i = -12; i <= 12; i++) {
    const ex = CX + i * 200;
    el('line', { x1: CX, y1: yH, x2: ex, y2: H + 60, stroke: PAL.cyan, 'stroke-width': 2, opacity: 0.5 }, gGrid);
  }
  // 横线（透视 + 滚动）——建 12 条，render 里更新 y
  const gridRows = [];
  for (let k = 0; k < 12; k++) gridRows.push(el('line', { x1: -100, y1: yH, x2: W + 100, y2: yH, stroke: PAL.cyan, 'stroke-width': 2 }, gGrid));
  // 地面青辉光（halo 活性）
  const floorGlow = el('rect', { x: -200, y: yH, width: W + 400, height: H - yH + 60, fill: 'url(#floorGlow)' }, world);
  // 地平线亮带（实色青，核心活性块）
  const horizonBand = el('rect', { x: -200, y: yH - 12, width: W + 400, height: 24, fill: PAL.cyan, filter: 'url(#glow)' }, world);
  // 落日在地面的实色反射柱（品红，核心活性块）
  const sunRefl = el('rect', { x: CX - 80, y: yH + 12, width: 160, height: 320, fill: PAL.mag, opacity: 0.9, filter: 'url(#glow)' }, world);
  // 呼吸光晕叠在海平面
  const breathe = el('ellipse', { cx: CX, cy: yH, rx: 900, ry: 120, fill: 'url(#breathe)', opacity: 0.2 }, world);

  // ---------- 右侧品红霓虹管（随机暗闪） ----------
  const magTube = el('rect', { x: W - 60, y: 200, width: 8, height: 500, fill: PAL.mag, filter: 'url(#glow)' }, world);

  // ============================ BOOT ============================
  const gBoot = el('g', {}, world);
  const bootOk = el('text', { x: CX, y: 430, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 96, fill: PAL.cyanHi, filter: 'url(#glowBig)' }, gBoot);
  txt(bootOk, 'SYSTEM.BOOT_OK');
  const bootCity = el('text', { x: CX, y: 520, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 56, fill: PAL.mag, filter: 'url(#glow)' }, gBoot);
  txt(bootCity, 'NEON CITY');
  const bootCaret = el('rect', { x: CX + 330, y: 388, width: 22, height: 96, fill: PAL.cyanHi, filter: 'url(#glow)' }, gBoot);
  const bootSub = el('text', { x: CX, y: 980, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 30, fill: PAL.sub }, gBoot);
  txt(bootSub, '> loading human_interface.exe ...');

  // ============================ R1 工牌 ============================
  const gR1 = el('g', {}, world);
  // 虚线 HUD 框（直角角括号）
  function hudCorners(parent, x, y, w, h, col) {
    const L = 46, sw = 5;
    const g = el('g', { stroke: col, 'stroke-width': sw, fill: 'none', 'stroke-linecap': 'square' }, parent);
    el('path', { d: `M${x + L} ${y} L${x} ${y} L${x} ${y + L}` }, g);
    el('path', { d: `M${x + w - L} ${y} L${x + w} ${y} L${x + w} ${y + L}` }, g);
    el('path', { d: `M${x + L} ${y + h} L${x} ${y + h} L${x} ${y + h - L}` }, g);
    el('path', { d: `M${x + w - L} ${y + h} L${x + w} ${y + h} L${x + w} ${y + h - L}` }, g);
    return g;
  }
  hudCorners(gR1, 620, 150, 680, 780, PAL.cyan);
  const r1Prompt = el('text', { x: CX, y: 110, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 46, fill: PAL.white }, gR1);
  txt(r1Prompt, '请选择所有带人类工牌的画面');
  const r1PromptEn = el('text', { x: CX, y: 148, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 24, fill: PAL.sub }, gR1);
  txt(r1PromptEn, 'SELECT ALL IMAGES CONTAINING A HUMAN BADGE');
  // 工牌（霓虹描边线稿）
  const badgeG = el('g', { filter: 'url(#glow)' }, gR1);
  const bX = 780, bY = 300, bW = 360, bH = 480;
  el('rect', { x: bX, y: bY, width: bW, height: bH, rx: 14, fill: PAL.panel, stroke: PAL.cyan, 'stroke-width': 4 }, badgeG);
  el('rect', { x: bX + 130, y: bY - 26, width: 100, height: 30, rx: 6, fill: PAL.panel, stroke: PAL.cyan, 'stroke-width': 4 }, badgeG); // 挂绳夹
  // 实色品头条纹（工牌 ID 带）
  el('rect', { x: bX, y: bY + 250, width: bW, height: 22, fill: PAL.mag }, badgeG);
  el('rect', { x: bX, y: bY + 460, width: bW, height: 14, fill: PAL.cyan }, badgeG);
  // 头像占位
  el('circle', { cx: CX, cy: bY + 150, r: 78, fill: 'none', stroke: PAL.cyan, 'stroke-width': 4 }, badgeG);
  el('circle', { cx: CX, cy: bY + 128, r: 26, fill: 'none', stroke: PAL.cyan, 'stroke-width': 4 }, badgeG);
  el('path', { d: `M${CX - 44} ${bY + 196} Q${CX} ${bY + 150} ${CX + 44} ${bY + 196}`, fill: 'none', stroke: PAL.cyan, 'stroke-width': 4 }, badgeG);
  // 工牌信息
  const bId = el('text', { x: CX, y: bY + 290, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 52, fill: PAL.cyanHi }, badgeG);
  txt(bId, 'H-001');
  el('line', { x1: bX + 40, y1: bY + 320, x2: bX + bW - 40, y2: bY + 320, stroke: PAL.cyan, 'stroke-width': 2, opacity: 0.6 }, badgeG);
  const bAge = el('text', { x: CX, y: bY + 375, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 38, fill: PAL.white }, badgeG);
  txt(bAge, '35Y');
  const bPay = el('text', { x: CX, y: bY + 425, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 38, fill: PAL.mag }, badgeG);
  txt(bPay, '¥15,000');
  // 点击涟漪
  const r1Ripples = [];
  for (let i = 0; i < 6; i++) r1Ripples.push(el('circle', { cx: CX, cy: bY + 150, r: 10, fill: 'none', stroke: PAL.cyanHi, 'stroke-width': 5, opacity: 0 }, gR1));
  // 准星
  const reticle = el('g', { stroke: PAL.cyanHi, 'stroke-width': 3, fill: 'none' }, gR1);
  el('circle', { cx: 0, cy: 0, r: 26 }, reticle);
  el('line', { x1: -40, y1: 0, x2: -14, y2: 0 }, reticle);
  el('line', { x1: 14, y1: 0, x2: 40, y2: 0 }, reticle);
  el('line', { x1: 0, y1: -40, x2: 0, y2: -14 }, reticle);
  el('line', { x1: 0, y1: 14, x2: 0, y2: 40 }, reticle);

  // ============================ R2 印章 ============================
  const gR2 = el('g', {}, world);
  const r2Prompt = el('text', { x: CX, y: 120, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 48, fill: PAL.white }, gR2);
  txt(r2Prompt, '人类验证盖章');
  const stampG = el('g', { filter: 'url(#glowBig)' }, gR2);
  const stCx = 1150, stCy = 540;
  el('circle', { cx: stCx, cy: stCy, r: 158, fill: PAL.mag, stroke: PAL.magHi, 'stroke-width': 6 }, stampG);
  el('circle', { cx: stCx, cy: stCy, r: 122, fill: 'none', stroke: PAL.deep, 'stroke-width': 4 }, stampG);
  const stT1 = el('text', { x: stCx, y: stCy - 18, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 54, fill: PAL.deep, 'font-weight': 'bold' }, stampG);
  txt(stT1, 'HUMAN');
  const stT2 = el('text', { x: stCx, y: stCy + 44, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 44, fill: PAL.deep }, stampG);
  txt(stT2, 'VERIFIED');
  // 五角星
  (function () {
    let pts = '';
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? 18 : 38;
      const a = (i / 10) * P - Math.PI / 2;
      pts += `${stCx + Math.cos(a) * rr},${stCy - 110 + Math.sin(a) * rr} `;
    }
    el('polygon', { points: pts, fill: PAL.mag }, stampG);
  })();

  // ============================ R3 验证码 ============================
  const gR3 = el('g', {}, world);
  const r3Prompt = el('text', { x: CX, y: 110, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 44, fill: PAL.cyanHi, filter: 'url(#glow)' }, gR3);
  txt(r3Prompt, 'PLEASE SELECT TOKENS');
  const r3PromptC = el('text', { x: CX, y: 150, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 34, fill: PAL.sub }, gR3);
  txt(r3PromptC, '请依次选择飞散的字符块');
  // 虚线验证码框
  hudCorners(gR3, 720, 320, 480, 300, PAL.mag);
  el('rect', { x: 720, y: 320, width: 480, height: 300, fill: 'none', stroke: PAL.mag, 'stroke-width': 2, 'stroke-dasharray': '10 12', opacity: 0.5 }, gR3);
  // token 块
  const tokens = [];
  const tokenChars = ['XK7', '9AQ', 'M4Z', '2TR', 'W8', 'Q2', 'K9', '7P', 'Z3', 'R5'];
  for (let i = 0; i < tokenChars.length; i++) {
    const tg = el('g', { filter: 'url(#glow)' }, gR3);
    const solidFill = i % 2 ? PAL.cyan : PAL.mag;
    el('rect', { x: -55, y: -30, width: 110, height: 60, rx: 6, fill: solidFill, stroke: solidFill, 'stroke-width': 3 }, tg);
    const tt = el('text', { x: 0, y: 10, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 36, fill: PAL.deep }, tg);
    txt(tt, tokenChars[i]);
    tokens.push(tg);
  }
  // 抓错红点
  const wrongDot = el('g', {}, gR3);
  el('circle', { cx: 0, cy: 0, r: 40, fill: PAL.mag, filter: 'url(#glowBig)' }, wrongDot);
  el('path', { d: 'M-18 -18 L18 18 M18 -18 L-18 18', stroke: PAL.white, 'stroke-width': 8, 'stroke-linecap': 'round' }, wrongDot);

  // ============================ R4 神经链接 ============================
  const gR4 = el('g', {}, world);
  const r4Prompt = el('text', { x: CX, y: 110, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 46, fill: PAL.white }, gR4);
  txt(r4Prompt, '颈后神经接口 · 上传意识');
  // 侧面头颈剪影（几何）
  const neckG = el('g', { filter: 'url(#glow)' }, gR4);
  // 头（侧脸朝右）+ 颈
  // 背面头颈剪影（几何头盔）
  el('path', { d: 'M790 250 Q790 200 855 200 Q920 200 920 260 L920 380 L895 430 L820 430 L790 380 Z',
    fill: PAL.panel, stroke: PAL.cyan, 'stroke-width': 4 }, neckG);
  // 颈后接口（圆 + 针脚）
  el('circle', { cx: 795, cy: 395, r: 26, fill: PAL.deep, stroke: PAL.mag, 'stroke-width': 5 }, neckG);
  el('circle', { cx: 795, cy: 395, r: 9, fill: PAL.mag, filter: 'url(#glow)' }, neckG);
  // 上传进度条
  el('rect', { x: 560, y: 780, width: 800, height: 40, rx: 4, fill: PAL.deep, stroke: PAL.cyan, 'stroke-width': 3 }, gR4);
  const uploadFill = el('rect', { x: 564, y: 784, width: 0, height: 32, rx: 2, fill: PAL.cyan, filter: 'url(#glow)' }, gR4);
  const uploadPct = el('text', { x: CX, y: 748, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 40, fill: PAL.cyanHi }, gR4);
  txt(uploadPct, 'NEURAL LINK…UPLOADING 0%');
  // 三个活性 LED
  const leds = [];
  [PAL.cyan, PAL.mag, PAL.pur].forEach((c, i) => {
    const led = el('circle', { cx: 1450 + i * 70, cy: 780, r: 16, fill: PAL.deep, stroke: c, 'stroke-width': 3 }, gR4);
    leds.push(led);
  });

  // ============================ 反转 VERDICT ============================
  const gVerdict = el('g', {}, world);
  const vScan = el('rect', { x: 0, y: 0, width: W, height: 60, fill: PAL.cyanHi, opacity: 0 }, gVerdict);
  const vHead = el('text', { x: CX, y: 200, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 60, fill: PAL.sub }, gVerdict);
  txt(vHead, 'VERDICT');
  const vBig = el('text', { x: CX, y: 470, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 150, fill: PAL.magHi, filter: 'url(#glowBig)', 'font-weight': 'bold' }, gVerdict);
  txt(vBig, 'TOO HUMAN.');
  const vGrant = el('text', { x: CX, y: 800, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 56, fill: PAL.sub }, gVerdict);
  txt(vGrant, 'ACCESS GRANTED');
  const vStrike = el('line', { x1: CX - 260, y1: 788, x2: CX + 260, y2: 788, stroke: PAL.mag, 'stroke-width': 6, opacity: 0 }, gVerdict);
  const vRevoke = el('text', { x: CX, y: 880, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 64, fill: PAL.magHi, filter: 'url(#glow)' }, gVerdict);
  txt(vRevoke, 'ACCESS REVOKED');
  // 跑马灯
  const marqueeBand = el('rect', { x: 0, y: 950, width: W, height: 70, fill: PAL.panel }, gVerdict);
  el('rect', { x: 0, y: 950, width: W, height: 3, fill: PAL.mag }, gVerdict);
  el('rect', { x: 0, y: 1017, width: W, height: 3, fill: PAL.mag }, gVerdict);
  const marqueeText = el('text', { x: 0, y: 997, 'font-family': 'ZCOOL', 'font-size': 40, fill: PAL.yel }, gVerdict);
  txt(marqueeText, '62% 人类怕被更会用AI的人替代——你已被回收  ◄►  62% 人类怕被更会用AI的人替代——你已被回收  ◄►  ');

  // ============================ 熄灭 OFFLINE ============================
  const gOff = el('g', {}, world);
  const offBadge = el('g', {}, gOff);
  el('rect', { x: 780, y: 300, width: 360, height: 380, rx: 14, fill: PAL.deep, stroke: PAL.gray, 'stroke-width': 4 }, offBadge);
  el('circle', { cx: CX, cy: 430, r: 60, fill: 'none', stroke: PAL.gray, 'stroke-width': 4 }, offBadge);
  const offT = el('text', { x: CX, y: 590, 'text-anchor': 'middle', 'font-family': 'OrbitronF', 'font-size': 46, fill: PAL.gray }, offBadge);
  txt(offT, 'HUMAN OFFLINE');

  // ============================ 常驻 HUD ============================
  const gHUD = el('g', {}, world);
  hudCorners(gHUD, 30, 30, W - 60, H - 60, PAL.cyan);
  const hudTL = el('text', { x: 60, y: 78, 'font-family': 'MonoF', 'font-size': 26, fill: PAL.sub }, gHUD);
  txt(hudTL, 'HUMAN_VERIFY://v2.7.0');
  const hudTR = el('text', { x: W - 60, y: 78, 'text-anchor': 'end', 'font-family': 'MonoF', 'font-size': 26, fill: PAL.cyan }, gHUD);
  txt(hudTR, 'PROGRESS --/4');
  const hudBot = el('text', { x: CX, y: 1050, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 22, fill: PAL.sub }, gHUD);
  txt(hudBot, 'SECTOR 7 · NEON GRID · BIOMETRIC TRIAL ACTIVE');

  // ============================ RGB 故障层 ============================
  const gGlitch = el('g', {}, stage);
  const glitchBars = [];
  for (let i = 0; i < 14; i++) glitchBars.push(el('rect', { x: 0, y: 0, width: W, height: 20, opacity: 0 }, gGlitch));

  // ============================ 顶层氛围/遮罩 ============================
  const scanRect = el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#scan)', opacity: 0.12 }, stage);
  const noiseRect = el('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#noise)', opacity: 0.35 }, stage);
  const flash = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff', opacity: 0 }, stage);
  const blackfield = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#000000', opacity: 1 }, stage);

  // ============================ 署名（最顶层，黑场之上） ============================
  const gCredits = el('g', {}, stage);
  const credT = el('text', { x: CX, y: CY + 10, 'text-anchor': 'middle', 'font-family': 'ZCOOL', 'font-size': 52, fill: PAL.white, filter: 'url(#glow)' }, gCredits);
  txt(credT, '由 Doubao 在30秒内用纯代码制作完成');
  // 署名下方一条细青霓虹线（保留微量活性，避免近黑帧 NAA 过低）
  el('rect', { x: CX - 260, y: CY + 60, width: 520, height: 3, fill: PAL.cyan, filter: 'url(#glow)' }, gCredits);

  // ============================ 冲击表（震屏/闪白） ============================
  const HITS = [
    { t: T.gridRise, sh: 12, fl: 0.3 },
    { t: T.sunUp, sh: 10, fl: 0.25 },
    { t: T.r2Stamp, sh: 30, fl: 0.28 },
    { t: T.r3Wrong, sh: 22, fl: 0.28 },
    { t: T.r4UploadFull, sh: 26, fl: 0.32 },
    { t: T.revHit, sh: 40, fl: 0.12 },
    { t: T.accessFlip, sh: 20, fl: 0.25 }
  ];

  // ============================ 主渲染 ============================
  function render(t0) {
    let t = t0;
    const frame = Math.round(t * T.fps);

    // ---- 世界呼吸（2Hz 脉冲，仅动光晕不动实色块） ----
    const pulse = 0.5 + 0.5 * Math.sin(P * 2 * t);       // 2Hz
    breathe.setAttribute('opacity', 0.10 + 0.08 * pulse);
    floorGlow.setAttribute('opacity', 0.50 + 0.50 * pulse);

    // ---- 震屏 + 闪白 ----
    let shx = 0, shy = 0, flOp = 0;
    for (const hit of HITS) {
      const dt = t - hit.t;
      if (dt >= 0 && dt < 0.5) {
        const a = hit.sh * Math.exp(-9 * dt);
        shx += (h(frame * 0.7 + hit.t) - 0.5) * 2 * a;
        shy += (h(frame * 1.3 + hit.t) - 0.5) * 2 * a;
      }
      if (dt >= 0 && dt < 0.1) flOp = Math.max(flOp, hit.fl * (1 - dt / 0.1));
    }
    flash.setAttribute('opacity', flOp);

    // 轻微呼吸缩放（整屏），bg 已放大防穿帮
    const zoom = 1 + 0.012 * pulse;
    world.setAttribute('transform',
      `translate(${shx} ${shy}) translate(${CX} ${CY}) scale(${zoom}) translate(${-CX} ${-CY})`);

    // ---- 扫描线下移 ----
    scanRect.setAttribute('y', -((frame * 2) % 3));
    // 噪点 seed 逐帧
    noiseT.setAttribute('seed', frame % 240);

    // ---- 默认隐藏所有场景 ----
    [gBoot, gR1, gR2, gR3, gR4, gVerdict, gOff, gCredits].forEach(g => show(g, false));
    // HUD 在正片阶段显示
    show(gHUD, t > T.r1HudIn - 0.01 && t < T.nearBlack);

    // ---- 品红管随机暗闪（切 实色↔隐藏，不调透明度） ----
    const tubeOn = !(h(frame * 3.3) > 0.965);
    magTube.setAttribute('opacity', tubeOn ? 1 : 0);

    // ---- HUD 角括号微抖 ----
    const hudJx = (h(frame * 1.1) - 0.5) * 2;
    const hudJy = (h(frame * 2.1) - 0.5) * 2;
    gHUD.setAttribute('transform', `translate(${hudJx} ${hudJy})`);

    // ---- 落日升起 + 网格升起 ----
    const sunP = smooth(T.sunUp, T.sunUp + 1.2, t);
    gSun.setAttribute('transform', `translate(0 ${(1 - sunP) * 260})`);
    const gridP = smooth(T.gridRise, T.gridRise + 1.0, t);
    gGrid.setAttribute('transform', `translate(0 ${(1 - gridP) * 200})`);
    // 网格横线滚动（向观察者）
    const scroll = (t * 1.1) % 1;
    for (let k = 0; k < gridRows.length; k++) {
      const u = (k + scroll) / gridRows.length;
      const yy = yH + (H - yH + 60) * Math.pow(u, 2.1);
      gridRows[k].setAttribute('y1', yy);
      gridRows[k].setAttribute('y2', yy);
      gridRows[k].setAttribute('opacity', 0.30 + 0.60 * u);
    }

    // ---- RGB 故障（仅在指定时刻闪 2–3 帧） ----
    let glitchActive = false;
    if (t >= T.r2Glitch && t < T.r2Glitch + 0.12) glitchActive = true;
    if (t >= T.r3Wrong && t < T.r3Wrong + 0.18) glitchActive = true;
    if (t >= T.accessFlip && t < T.accessFlip + 0.15) glitchActive = true;
    glitchBars.forEach((r, i) => {
      if (glitchActive && h(i + frame) > 0.4) {
        const gh = 12 + h(i + frame * 2) * 40;
        const gy = h(i * 1.3 + frame * 0.5) * H;
        r.setAttribute('y', gy);
        r.setAttribute('height', gh);
        r.setAttribute('x', (h(i + frame * 3) - 0.5) * 40);
        r.setAttribute('fill', i % 3 === 0 ? PAL.cyan : (i % 3 === 1 ? PAL.mag : PAL.pur));
        r.setAttribute('opacity', 0.25 + 0.2 * h(i + frame));
      } else r.setAttribute('opacity', 0);
    });

    // ================= BOOT 0–3 =================
    if (t < 3.0) {
      show(gBoot, true);
      const bp = smooth(T.bootText, T.bootText + 0.5, t);
      bootOk.setAttribute('opacity', bp);
      bootCity.setAttribute('opacity', bp);
      bootSub.setAttribute('opacity', bp);
      bootOk.setAttribute('transform', `translate(0 ${(1 - bp) * 30})`);
      // caret 闪烁（切 显示/隐藏）
      const blink = Math.floor(t * 2.2) % 2 === 0;
      bootCaret.setAttribute('opacity', blink ? 1 : 0);
    }

    // ================= R1 3–8 =================
    if (t >= T.r1HudIn && t < 8.0) {
      show(gR1, true);
      const p = clamp((t - T.r1HudIn) / 0.35, 0, 1);
      gR1.setAttribute('opacity', easeOutCubic(p));
      gR1.setAttribute('transform', `translate(0 ${(1 - easeOutCubic(p)) * -80})`);
      // 涟漪：每次点击扩散
      T.r1Clicks.forEach((ct, i) => {
        const dt = t - ct;
        if (dt >= 0 && dt < 0.6) {
          const rp = dt / 0.6;
          r1Ripples[i].setAttribute('r', 12 + rp * 120);
          r1Ripples[i].setAttribute('opacity', 0.9 * (1 - rp));
        } else r1Ripples[i].setAttribute('opacity', 0);
      });
      // 准星沿点击点移动
      let posx = CX, posy = bY + 150;
      for (let i = T.r1Clicks.length - 1; i >= 0; i--) {
        if (t >= T.r1Clicks[i]) {
          posx = CX + (h(i * 3.1) - 0.5) * 200;
          posy = bY + 150 + (h(i * 7.7) - 0.5) * 200;
          break;
        }
      }
      // 按压微动
      const press = T.r1Clicks.some(ct => t >= ct && t < ct + 0.08) ? 0.9 : 1;
      reticle.setAttribute('transform', `translate(${posx} ${posy}) scale(${press})`);
      hudTR.textContent = 'PROGRESS 1/4';
    }

    // ================= R2 8–13 =================
    if (t >= 8.0 && t < 13.0) {
      show(gR2, true);
      hudTR.textContent = 'PROGRESS 2/4';
      const p = clamp((t - T.r2Stamp) / 0.28, 0, 1);
      let sc = 2.3 - 1.3 * easeOutCubic(p);
      let dy = 0;
      if (t < T.r2Stamp) dy = -400;
      // 盖歪：-14°
      stampG.setAttribute('transform', `translate(0 ${dy}) translate(${stCx} ${stCy}) rotate(-14) scale(${sc}) translate(${-stCx} ${-stCy})`);
      stampG.setAttribute('opacity', t < T.r2Stamp ? 0 : 1);
    }

    // ================= R3 13–18 =================
    if (t >= 13.0 && t < 18.0) {
      show(gR3, true);
      hudTR.textContent = 'PROGRESS 3/4';
      const scatterP = smooth(T.r3Scatter, T.r3Scatter + 0.6, t);
      tokens.forEach((tg, i) => {
        const ang = (i / tokens.length) * P;
        const rad = 120 + 130 * h(i * 1.7);
        const bx = CX + Math.cos(ang) * rad * (0.4 + 0.6 * scatterP);
        const by = 500 + Math.sin(ang) * rad * 0.7 * (0.4 + 0.6 * scatterP);
        // 飞散漂浮
        const fx = Math.sin(t * 1.3 + i) * 18;
        const fy = Math.cos(t * 1.7 + i * 2) * 14;
        tg.setAttribute('transform', `translate(${bx + fx} ${by + fy})`);
        tg.setAttribute('opacity', 1);
      });
      // 抓错红点
      const wrongP = clamp((t - T.r3Wrong) / 0.2, 0, 1);
      if (t >= T.r3Wrong) {
        show(wrongDot, true);
        wrongDot.setAttribute('transform', `translate(${CX + 60} ${500}) scale(${backOut(wrongP)})`);
      } else show(wrongDot, false);
    }

    // ================= R4 18–23 =================
    if (t >= 18.0 && t < 23.0) {
      show(gR4, true);
      hudTR.textContent = 'PROGRESS 4/4';
      const upP = clamp((t - T.r4UploadStart) / (T.r4UploadFull - T.r4UploadStart), 0, 1);
      const fillW = 792 * easeOutCubic(upP);
      uploadFill.setAttribute('width', fillW);
      const pct = Math.round(upP * 100);
      uploadPct.textContent = `NEURAL LINK…UPLOADING ${pct}%`;
      // 三活性 LED 随进度点亮
      leds.forEach((led, i) => {
        const on = upP >= (i + 1) / 3;
        led.setAttribute('fill', on ? [PAL.cyan, PAL.mag, PAL.pur][i] : PAL.deep);
      });
      // 接口插入动画
      const insP = smooth(T.r4Insert, T.r4Insert + 0.5, t);
      neckG.setAttribute('transform', `translate(${(1 - insP) * -120} 0)`);
    }

    // ================= 反转 23–27 =================
    if (t >= 23.0 && t < 27.0) {
      show(gVerdict, true);
      hudTR.textContent = 'PROGRESS 4/4';
      // 扫描线：揭示前一次横扫；揭示后在判定保持段循环横扫（真实系统扫描运动）
      if (t >= T.verdictScan && t < T.verdictReveal) {
        const scP = clamp((t - T.verdictScan) / 0.4, 0, 1);
        vScan.setAttribute('y', lerp(-10, H + 10, scP));
        vScan.setAttribute('opacity', 0.9);
      } else if (t >= T.verdictReveal && t < 27.0) {
        const loop = ((t - T.verdictReveal) * 1.5) % 1;      // 循环向下扫描
        vScan.setAttribute('y', lerp(-60, H + 60, loop));
        vScan.setAttribute('opacity', 0.62);
      } else vScan.setAttribute('opacity', 0);
      // VERDICT 揭示
      const rp = clamp((t - T.verdictReveal) / 0.3, 0, 1);
      vBig.setAttribute('opacity', rp);
      const hb = 1 + 0.03 * pulse * rp;             // 揭示后持续心跳脉动（真实内容运动）
      vBig.setAttribute('transform', `translate(${CX} ${470}) scale(${(0.6 + 0.4 * backOut(rp)) * hb}) translate(${-CX} ${-470})`);
      vHead.setAttribute('opacity', 0.4 + 0.6 * rp);
      // ACCESS GRANTED -> REVOKED
      const fp = clamp((t - T.accessFlip) / 0.25, 0, 1);
      vGrant.setAttribute('opacity', t >= T.accessFlip ? 0.35 : 1);
      vStrike.setAttribute('opacity', fp);
      vStrike.setAttribute('x2', CX - 260 + 520 * fp);
      vRevoke.setAttribute('opacity', fp);
      // 跑马灯滚动
      if (t >= T.marqueeStart) {
        const mx = W - ((t - T.marqueeStart) * 220) % 1400;
        marqueeText.setAttribute('x', mx);
        marqueeBand.setAttribute('opacity', 1);
      } else marqueeBand.setAttribute('opacity', 0);
    }

    // ================= 熄灭 27–28.7 =================
    if (t >= 27.0 && t < T.nearBlack) {
      show(gOff, true);
      // 落日与网格熄一半
      const dim = smooth(T.neonHalfOff, T.neonHalfOff + 0.6, t);
      gSun.setAttribute('opacity', 1 - 0.7 * dim);
      gGrid.setAttribute('opacity', 1 - 0.6 * dim);
      horizonBand.setAttribute('opacity', 1 - 0.7 * dim);
      sunRefl.setAttribute('opacity', 0.9 * (1 - 0.7 * dim));
      floorGlow.setAttribute('opacity', 0.60 * (1 - 0.6 * dim));
      hudTR.textContent = 'SIGNAL LOST';
    } else {
      gSun.setAttribute('opacity', 1);
      gGrid.setAttribute('opacity', 1);
      horizonBand.setAttribute('opacity', 1);
      sunRefl.setAttribute('opacity', 0.9);
    }

    // ================= 署名 28.9–29.7 =================
    if (t >= T.credits) {
      show(gCredits, true);
      const cp = smooth(T.credits, T.credits + 0.4, t);
      credT.setAttribute('opacity', cp);
    }

    // ---- 黑场：仅开场前 0.12s 淡入 + 28.7 后压暗 ----
    let bf = 1 - smooth(0, 0.12, t0);                 // 开场黑场 ≤0.12s
    if (t0 >= T.nearBlack) bf = Math.max(bf, smooth(T.nearBlack, T.nearBlack + 0.25, t0));
    blackfield.setAttribute('opacity', clamp(bf, 0, 1));
  }

  window.render = render;
  render(0);
})();
