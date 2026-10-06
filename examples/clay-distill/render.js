// render.js —— 纯函数 render(t) 驱动《炼不化的黏土》。黏土/橡皮泥定格风。
// 2 帧一拍 = 450 pose；pose 硬切、无运动模糊；一切随机走帧号哈希。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2, DESK = 760;
  const { T } = window;

  // ---------- 调色板（黏土皮肤，唯一真相） ----------
  const P = {
    clay: '#E8A87C',      // 主角陶土橙
    cloth: '#F2E3D5',     // 工装奶油米
    wall: '#B7C4A8',      // 鼠尾草绿墙
    desk: '#D9B38C',      // 木桌面
    furnace: '#7C93A8',   // AI 炼化炉冷灰蓝（≤25%）
    danger: '#E26D5A',    // 警示进度红
    dark: '#6B4F3A',      // 暗部描边深棕（禁纯黑）
    hl: '#FFF6EC',        // 高光奶白（禁纯白）
    token: '#B39DDB',     // token 紫
    ball: '#F6EFE6',      // 蒸馏白球（偏奶白）
  };

  // ---------- 确定性哈希与缓动 ----------
  const h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = (a, b, x) => { const p = clamp((x - a) / (b - a), 0, 1); return p * p * (3 - 2 * p); };
  const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
  const backOut = p => { const c = 1.70158, s = 1.1; p -= 1; return s * p * p * ((c + 1) * p + c) + 1; };
  const TAU = Math.PI * 2;

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

  // 角色皮肤滤镜：轮廓 ±1.5px 位移（seed=pose）+ 高频黏土颗粒（固定 seed 指痕）
  const skinF = el('filter', { id: 'charSkin', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
  const dispN = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.02 0.025', numOctaves: '2', seed: '3', result: 'dn' }, skinF);
  el('feDisplacementMap', { in: 'SourceGraphic', in2: 'dn', scale: '3', xChannelSelector: 'R', yChannelSelector: 'G', result: 'disp' }, skinF);
  const grainN = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '11', result: 'gr' }, skinF);
  el('feColorMatrix', { in: 'gr', type: 'matrix', values: '0 0 0 0 0.42  0 0 0 0 0.31  0 0 0 0 0.23  0 0 0 0.18 0.02', result: 'grf' }, skinF);
  // 颗粒只贴在角色形状内（operator=in），避免整块矩形
  el('feComposite', { in: 'grf', in2: 'disp', operator: 'in', result: 'grclip' }, skinF);
  el('feComposite', { in: 'disp', in2: 'grclip', operator: 'over' }, skinF);

  // 地面软影模糊
  const softF = el('filter', { id: 'soft', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  el('feGaussianBlur', { stdDeviation: '8' }, softF);

  // 左上 45° 主光径向渐变（亮 10%）
  const lightGrad = el('radialGradient', { id: 'keylight', cx: '0.28', cy: '0.22', r: '0.95' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#FFF6EC', 'stop-opacity': '0.18' }, lightGrad);
  el('stop', { offset: '55%', 'stop-color': '#FFF6EC', 'stop-opacity': '0.0' }, lightGrad);

  // ============================ 世界根 ============================
  const world = el('g', { id: 'world' }, stage);

  // 墙 + 木桌
  el('rect', { x: 0, y: 0, width: W, height: H, fill: P.wall }, world);
  el('rect', { x: -40, y: DESK, width: W + 80, height: H - DESK + 40, fill: P.desk }, world);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#keylight)' }, world); // 45° 主光
  el('rect', { x: 0, y: DESK + 120, width: W, height: H - DESK - 120, fill: '#000000', opacity: '0.05' }, world); // 下 1/3 补光压暗过渡

  // 地面软影（角色脚下）
  const charShadow = el('ellipse', { cx: 640, cy: 815, rx: 150, ry: 26, fill: P.dark, opacity: 0.18, filter: 'url(#soft)' }, world);

  // ============================ AI 炼化炉 ============================
  const gFurnace = el('g', {}, world);
  // 梯形圆角炉体
  const furnaceD = 'M1210 470 Q1200 450 1230 448 L1470 448 Q1500 450 1490 470 L1560 880 Q1565 905 1535 905 L1165 905 Q1135 905 1140 880 Z';
  el('path', { d: furnaceD, fill: P.furnace, stroke: P.dark, 'stroke-width': 6, 'stroke-linejoin': 'round' }, gFurnace);
  // 炉顶烟囱
  el('rect', { x: 1300, y: 360, width: 90, height: 100, rx: 18, fill: P.furnace, stroke: P.dark, 'stroke-width': 6 }, gFurnace);
  // 炉膛嘴（吸口）
  el('ellipse', { cx: 1215, cy: 640, rx: 34, ry: 44, fill: P.dark, opacity: 0.55 }, gFurnace);
  // 屏幕
  el('rect', { x: 1260, y: 540, width: 180, height: 130, rx: 18, fill: '#3E4E5C', stroke: P.dark, 'stroke-width': 5 }, gFurnace);
  const screenTxt = el('text', { x: 1350, y: 615, 'text-anchor': 'middle', 'font-family': 'HuangYou', 'font-size': 40, fill: P.hl }, gFurnace);
  txt(screenTxt, '炼化中');
  const screenSub = el('text', { x: 1350, y: 648, 'text-anchor': 'middle', 'font-family': 'Noto', 'font-size': 22, fill: P.token }, gFurnace);
  txt(screenSub, 'skills.distro');

  // 香肠吸管触手（炉嘴 -> 角色头）
  const tubePath = 'M1215 640 C1050 660 980 540 800 560';
  el('path', { d: tubePath, fill: 'none', stroke: '#9FB4C4', 'stroke-width': 36, 'stroke-linecap': 'round', opacity: 0.9 }, gFurnace);
  el('path', { d: tubePath, fill: 'none', stroke: P.furnace, 'stroke-width': 22, 'stroke-linecap': 'round' }, gFurnace);

  // token 粒子（沿吸管飞）
  const gTokens = el('g', {}, world);
  const tokens = [];
  for (let i = 0; i < 14; i++) {
    const c = el('circle', { cx: 0, cy: 0, r: 8 + h(i) * 8, fill: P.token, opacity: 0.9 }, gTokens);
    tokens.push(c);
  }

  // ============================ 主角 小黏 ============================
  const gChar = el('g', { filter: 'url(#charSkin)' }, world);
  // 组原点在脚底 (640,815)
  const charG = el('g', { transform: 'translate(640 815)' }, gChar);
  // 腿（香肠棒）
  el('rect', { x: -44, y: -46, width: 30, height: 46, rx: 14, fill: P.cloth, stroke: P.dark, 'stroke-width': 4 }, charG);
  el('rect', { x: 14, y: -46, width: 30, height: 46, rx: 14, fill: P.cloth, stroke: P.dark, 'stroke-width': 4 }, charG);
  // 躯干胶囊（工装米）
  el('rect', { x: -58, y: -210, width: 116, height: 170, rx: 55, fill: P.cloth, stroke: P.dark, 'stroke-width': 5 }, charG);
  // 围裙小口袋
  el('rect', { x: -26, y: -150, width: 52, height: 44, rx: 12, fill: P.clay, opacity: 0.55 }, charG);
  // 手臂（香肠棒），挂在肩上
  const armL = el('g', { transform: 'translate(-52 -185)' }, charG);
  const armR = el('g', { transform: 'translate(52 -185)' }, charG);
  el('rect', { x: -12, y: -10, width: 24, height: 120, rx: 12, fill: P.clay, stroke: P.dark, 'stroke-width': 4 }, armL);
  el('rect', { x: -12, y: -10, width: 24, height: 120, rx: 12, fill: P.clay, stroke: P.dark, 'stroke-width': 4 }, armR);
  // 头（压扁椭圆，头身比 1.2:1）
  const headG = el('g', { transform: 'translate(0 -250)' }, charG);
  el('ellipse', { cx: 0, cy: 0, rx: 118, ry: 92, fill: P.clay, stroke: P.dark, 'stroke-width': 5 }, headG);
  // 脸颊高光
  el('ellipse', { cx: -40, cy: -30, rx: 34, ry: 20, fill: P.hl, opacity: 0.55 }, headG);
  // 眼（扁椭圆 + 白点高光）
  const eyeL = el('ellipse', { cx: -40, cy: -12, rx: 18, ry: 12, fill: P.dark }, headG);
  const eyeR = el('ellipse', { cx: 40, cy: -12, rx: 18, ry: 12, fill: P.dark }, headG);
  const hlL = el('circle', { cx: -45, cy: -16, r: 5, fill: P.hl }, headG);
  const hlR = el('circle', { cx: 35, cy: -16, r: 5, fill: P.hl }, headG);
  // 嘴（深棕短弧）
  const mouth = el('path', { d: 'M-20 28 Q0 42 20 28', fill: 'none', stroke: P.dark, 'stroke-width': 6, 'stroke-linecap': 'round' }, headG);
  // 指痕浅弧（固定）
  el('path', { d: 'M-90 -50 Q-60 -70 -30 -62', fill: 'none', stroke: P.dark, 'stroke-width': 4, opacity: 0.25, 'stroke-linecap': 'round' }, headG);
  el('path', { d: 'M50 -70 Q78 -58 88 -34', fill: 'none', stroke: P.dark, 'stroke-width': 4, opacity: 0.25, 'stroke-linecap': 'round' }, headG);

  // ============================ 道具：大键盘 + 小咖啡杯 ============================
  const gProps = el('g', {}, world);
  // 大键盘
  el('rect', { x: 430, y: 905, width: 420, height: 70, rx: 16, fill: P.cloth, stroke: P.dark, 'stroke-width': 5 }, gProps);
  for (let i = 0; i < 12; i++) {
    el('rect', { x: 450 + i * 32, y: 922, width: 24, height: 36, rx: 6, fill: '#E3D3C2', stroke: P.dark, 'stroke-width': 2 }, gProps);
  }
  // 小咖啡杯（夸张小）
  el('g', { transform: 'translate(960 915)' }, gProps);
  const cup = el('g', {}, gProps);
  el('path', { d: 'M-26 -30 L26 -30 L20 18 Q0 26 -20 18 Z', fill: P.hl, stroke: P.dark, 'stroke-width': 4, 'stroke-linejoin': 'round' }, cup);
  el('path', { d: 'M26 -22 Q44 -18 34 -2 Q30 6 22 2', fill: 'none', stroke: P.dark, 'stroke-width': 4 }, cup);
  el('ellipse', { cx: 0, cy: -28, rx: 24, ry: 6, fill: P.dark, opacity: 0.6 }, cup);
  cup.setAttribute('transform', 'translate(960 915)');

  // ============================ 假白球（蒸馏产物） ============================
  const gBall = el('g', { transform: 'translate(640 690)', filter: 'url(#charSkin)' }, world);
  el('ellipse', { cx: 0, cy: 0, rx: 130, ry: 128, fill: P.ball, stroke: P.dark, 'stroke-width': 5 }, gBall);
  el('ellipse', { cx: -40, cy: -44, rx: 34, ry: 22, fill: P.hl, opacity: 0.8 }, gBall);
  el('ellipse', { cx: 640, cy: 812, rx: 150, ry: 24, fill: P.dark, opacity: 0.16, filter: 'url(#soft)' }, world);

  // ============================ 反转：真小黏（窗边背手） ============================
  const gReal = el('g', { filter: 'url(#charSkin)' }, world);
  const realG = el('g', { transform: 'translate(1680 815)' }, gReal);
  el('rect', { x: -40, y: -42, width: 26, height: 42, rx: 12, fill: P.cloth, stroke: P.dark, 'stroke-width': 4 }, realG);
  el('rect', { x: 14, y: -42, width: 26, height: 42, rx: 12, fill: P.cloth, stroke: P.dark, 'stroke-width': 4 }, realG);
  el('rect', { x: -54, y: -196, width: 108, height: 158, rx: 50, fill: P.cloth, stroke: P.dark, 'stroke-width': 5 }, realG);
  // 背手：手臂绕到身后（藏在身后，只露背后一小截）
  el('rect', { x: -40, y: -190, width: 80, height: 20, rx: 10, fill: P.clay, stroke: P.dark, 'stroke-width': 4, opacity: 0.9 }, realG);
  const rHead = el('g', { transform: 'translate(0 -235)' }, realG);
  el('ellipse', { cx: 0, cy: 0, rx: 112, ry: 88, fill: P.clay, stroke: P.dark, 'stroke-width': 5 }, rHead);
  el('ellipse', { cx: -38, cy: -28, rx: 32, ry: 18, fill: P.hl, opacity: 0.5 }, rHead);
  // 淡定闭眼（短弧）+ 坚定小嘴
  el('path', { d: 'M-52 -10 Q-40 -20 -28 -10', fill: 'none', stroke: P.dark, 'stroke-width': 6, 'stroke-linecap': 'round' }, rHead);
  el('path', { d: 'M28 -10 Q40 -20 52 -10', fill: 'none', stroke: P.dark, 'stroke-width': 6, 'stroke-linecap': 'round' }, rHead);
  el('path', { d: 'M-14 30 Q0 36 14 30', fill: 'none', stroke: P.dark, 'stroke-width': 6, 'stroke-linecap': 'round' }, rHead);
  el('ellipse', { cx: 1680, cy: 812, rx: 140, ry: 22, fill: P.dark, opacity: 0.16, filter: 'url(#soft)' }, world);

  // ============================ 反转：墙上道具 ============================
  const gWall = el('g', {}, world);
  // 负鼠海报
  el('rect', { x: 360, y: 230, width: 190, height: 250, rx: 16, fill: P.hl, stroke: P.dark, 'stroke-width': 5, transform: 'rotate(-3 455 355)' }, gWall);
  const poster = el('g', { transform: 'translate(455 360) rotate(-3)' }, gWall);
  el('ellipse', { cx: 0, cy: 10, rx: 60, ry: 48, fill: '#C9B8A3', stroke: P.dark, 'stroke-width': 4 }, poster); // 负鼠圆脸
  el('ellipse', { cx: -20, cy: -6, rx: 9, ry: 6, fill: P.dark }, poster);
  el('ellipse', { cx: 20, cy: -6, rx: 9, ry: 6, fill: P.dark }, poster);
  el('ellipse', { cx: 0, cy: 14, rx: 12, ry: 8, fill: '#8a7a68' }, poster); // 粉鼻
  el('path', { d: 'M-58 -20 Q-78 -52 -46 -56', fill: 'none', stroke: P.dark, 'stroke-width': 5, 'stroke-linecap': 'round' }, poster); // 耳
  el('path', { d: 'M58 -20 Q78 -52 46 -56', fill: 'none', stroke: P.dark, 'stroke-width': 5, 'stroke-linecap': 'round' }, poster);
  el('text', { x: 0, y: 78, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 26, fill: P.dark }, poster).textContent = '不认输';
  // 便利贴
  el('rect', { x: 640, y: 300, width: 200, height: 150, rx: 10, fill: '#F4E3A1', stroke: P.dark, 'stroke-width': 4, transform: 'rotate(2 740 375)' }, gWall);
  const sticky = el('text', { x: 740, y: 356, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 30, fill: P.dark, transform: 'rotate(2 740 375)' }, gWall);
  txt(sticky, '我累了，');
  const sticky2 = el('text', { x: 740, y: 398, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 30, fill: P.dark, transform: 'rotate(2 740 375)' }, gWall);
  txt(sticky2, '但不会倒下');
  // 暖气片白色软方（霉豆腐彩蛋）
  el('rect', { x: 1010, y: 270, width: 220, height: 130, rx: 26, fill: '#EFEFEA', stroke: P.dark, 'stroke-width': 4 }, gWall);
  for (let i = 0; i < 4; i++) el('rect', { x: 1030 + i * 48, y: 288, width: 22, height: 94, rx: 11, fill: '#DCDCD4', stroke: P.dark, 'stroke-width': 2 }, gWall);
  // 窗边（真小黏旁边）
  el('rect', { x: 1580, y: 230, width: 200, height: 300, rx: 16, fill: '#AFC6C9', stroke: P.dark, 'stroke-width': 5 }, gWall);
  el('line', { x1: 1680, y1: 230, x2: 1680, y2: 530, stroke: P.dark, 'stroke-width': 4 }, gWall);
  el('line', { x1: 1580, y1: 380, x2: 1780, y2: 380, stroke: P.dark, 'stroke-width': 4 }, gWall);

  // ============================ HUD ============================
  const gHud = el('g', {}, world);
  // 顶部横幅
  el('rect', { x: 660, y: 28, width: 600, height: 78, rx: 30, fill: P.cloth, stroke: P.dark, 'stroke-width': 4 }, gHud);
  const banner = el('text', { x: 960, y: 84, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 46, fill: P.danger,
    'paint-order': 'stroke', stroke: P.dark, 'stroke-width': 1.5, 'letter-spacing': '5' }, gHud);
  txt(banner, '邪修AI · 炼化中');
  // 工牌
  const badge = el('g', { transform: 'translate(210 150)' }, gHud);
  el('line', { x1: 0, y1: -60, x2: 0, y2: -20, stroke: P.dark, 'stroke-width': 5 }, badge);
  el('rect', { x: -55, y: -20, width: 110, height: 80, rx: 12, fill: P.hl, stroke: P.dark, 'stroke-width': 4 }, badge);
  const badgeName = el('text', { x: 0, y: 30, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 40, fill: P.dark }, badge);
  txt(badgeName, '小黏');
  // 右上角极小字
  const coworker = el('text', { x: 1700, y: 140, 'text-anchor': 'end', 'font-family': 'Noto', 'font-size': 26, fill: P.dark }, gHud);
  txt(coworker, '今日已炼化同事：7');
  // 大进度数字（HuangYou）
  const bigPct = el('text', { x: 960, y: 220, 'text-anchor': 'middle', 'font-family': 'HuangYou', 'font-size': 150, fill: P.danger,
    'paint-order': 'stroke', stroke: P.dark, 'stroke-width': 2 }, gHud);
  txt(bigPct, '8%');
  // 进度条
  el('rect', { x: 660, y: 250, width: 600, height: 30, rx: 15, fill: P.cloth, stroke: P.dark, 'stroke-width': 4 }, gHud);
  const progFill = el('rect', { x: 666, y: 256, width: 0, height: 18, rx: 9, fill: P.danger }, gHud);
  // 浮动 +token 徽章
  const tokBadge = el('text', { x: 640, y: 430, 'text-anchor': 'middle', 'font-family': 'HuangYou', 'font-size': 72, fill: P.token,
    'paint-order': 'stroke', stroke: P.dark, 'stroke-width': 2 }, gHud);
  txt(tokBadge, '+128');

  // ============================ 假胜利文字 + 章 ============================
  const gWin = el('g', {}, world);
  el('rect', { x: 560, y: 330, width: 800, height: 120, rx: 30, fill: P.cloth, stroke: P.dark, 'stroke-width': 5 }, gWin);
  const winTitle = el('text', { x: 960, y: 412, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 76, fill: P.dark, 'letter-spacing': '6' }, gWin);
  txt(winTitle, '蒸馏完成');
  // 红章「已炼化」
  const stampG = el('g', { transform: 'translate(960 600) rotate(-12)' }, gWin);
  el('rect', { x: -150, y: -70, width: 300, height: 140, rx: 20, fill: 'none', stroke: P.danger, 'stroke-width': 10 }, stampG);
  const stampT = el('text', { x: 0, y: 22, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 84, fill: P.danger, 'letter-spacing': '8' }, stampG);
  txt(stampT, '已炼化');

  // ============================ 闪白 / 署名 ============================
  const flash = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#FFF6EC', opacity: 0 }, stage);
  const signText = el('text', { x: 960, y: 1040, 'text-anchor': 'middle', 'font-family': 'Noto', 'font-size': 30, fill: P.dark, opacity: 0 }, stage);
  txt(signText, '由 Doubao 在30秒内用纯代码制作完成');

  // ============================ 进度函数 ============================
  function progressAt(t) {
    // 返回 {pct, stage}
    if (t < T.openEnd) return { pct: 8, stage: 0 };
    if (t < T.d1End) return { pct: lerp(8, 35, smooth(T.d1Start, T.d1End, t)), stage: 1 };
    if (t < T.d2End) return { pct: lerp(35, 60, smooth(T.d2Start, T.d2End, t)), stage: 2 };
    if (t < T.d3End) return { pct: lerp(60, 90, smooth(T.d3Start, T.d3End, t)), stage: 3 };
    if (t < T.stuckEnd) return { pct: 90, stage: 4 };
    if (t < T.victoryEnd) return { pct: lerp(90, 100, smooth(T.smashTime, T.victoryEnd, t)), stage: 5 };
    return { pct: 37, stage: 6 };
  }

  // ============================ 主渲染 ============================
  function render(t0) {
    const frame = Math.round(t0 * T.fps);
    const pose = Math.floor(frame / 2);          // 450 pose，2 帧一拍
    const st = progressAt(t0);
    const stage = st.stage;

    // ---- 定格步进：呼吸 ±2%（每 4 pose 一个循环）、静止 pose ±0.5px ----
    const breathe = 1 + 0.02 * Math.sin(pose * TAU / 16);
    const swayX = (h(pose * 1.7) - 0.5) * 2 * 1.2;   // ±1.2px
    const swayY = (h(pose * 2.3) - 0.5) * 2 * 0.8;   // ±0.8px

    // 轮廓位移 seed 按 pose 固定（同 pose 两帧一致）
    dispN.setAttribute('seed', (pose * 13 + 5) % 240);

    // ---- 默认显隐 ----
    show(gTokens, false); show(gBall, false); show(gReal, false);
    show(gWall, false); show(gWin, false); show(tokBadge, false);

    // ---- 角色整体：被吸时向炉口压扁 5% 回弹 ----
    let suckAmt = 0;
    if (stage >= 1 && stage <= 4) suckAmt = smooth(T.d1Start, T.d3End, t0); // 0..1
    const pullX = suckAmt * 46;                 // 向炉口(右)拽
    const squeeze = 1 - 0.05 * Math.sin(pose * TAU / 6) * suckAmt; // 压扁 5% 回弹
    let cSX = (1 / breathe) * squeeze;
    let cSY = breathe / squeeze;

    // 手臂粗细 / 嘴 / 眼 随 stage 演变
    const armScale = stage >= 1 ? 1 - 0.28 * smooth(T.d1Start, T.d1End, t0) : 1; // 报表：手臂细一圈
    armL.setAttribute('transform', `translate(-52 -185) scale(${armScale} 1)`);
    armR.setAttribute('transform', `translate(52 -185) scale(${armScale} 1)`);

    // stage4：手背后死攥（手臂绕到身后，整体压暗一点）
    const behind = stage === 4 ? smooth(T.stuckStart, T.stuckStart + 0.6, t0) : (stage >= 5 ? 1 : 0);
    armL.setAttribute('opacity', 1 - behind * 0.85);
    armR.setAttribute('opacity', 1 - behind * 0.85);

    // stage2：嘴被拉平
    const mouthFlat = stage >= 2 ? smooth(T.d2Start, T.d2End, t0) : 0;
    if (mouthFlat > 0.5) mouth.setAttribute('d', 'M-22 30 L22 30');
    else mouth.setAttribute('d', 'M-20 28 Q0 42 20 28');

    // stage3：眼揉成光滑圆点（去高光、变实心圆）
    const eyeSmooth = stage >= 3 ? smooth(T.d3Start, T.d3End, t0) : 0;
    const eyeRx = lerp(18, 11, eyeSmooth), eyeRy = lerp(12, 11, eyeSmooth);
    eyeL.setAttribute('rx', eyeRx); eyeL.setAttribute('ry', eyeRy);
    eyeR.setAttribute('rx', eyeRx); eyeR.setAttribute('ry', eyeRy);
    hlL.setAttribute('opacity', 1 - eyeSmooth);
    hlR.setAttribute('opacity', 1 - eyeSmooth);

    // ---- 主体 transform（含呼吸/拽向/sway） ----
    let charVisible = stage <= 4;
    show(gChar, charVisible);
    if (charVisible) {
      const tremble = stage === 4 ? (h(pose * 3.1) - 0.5) * 2 * 6 : 0; // 卡住发抖
      const cx = 640 + pullX + swayX + tremble;
      const cy = 815 + swayY;
      charG.setAttribute('transform', `translate(${cx} ${cy}) scale(${cSX} ${cSY})`);
      charShadow.setAttribute('cx', 640 + pullX * 0.5);
      charShadow.setAttribute('rx', 150 * cSX);
    }

    // ---- token 粒子飞 ----
    if (suckAmt > 0.02 && stage <= 4) {
      show(gTokens, true);
      tokens.forEach((c, i) => {
        const ph = (t0 * 0.55 + h(i * 7.7)) % 1;
        // 从角色头(700,540)沿吸管曲线飞到炉嘴(1215,640)
        const bx = 700, by = 540, ex = 1215, ey = 640;
        const mx = (bx + ex) / 2 + 60, my = Math.min(by, ey) - 90;
        const x = (1 - ph) * (1 - ph) * bx + 2 * (1 - ph) * ph * mx + ph * ph * ex;
        const y = (1 - ph) * (1 - ph) * by + 2 * (1 - ph) * ph * my + ph * ph * ey;
        c.setAttribute('cx', x); c.setAttribute('cy', y);
        c.setAttribute('opacity', 0.9 * Math.sin(ph * Math.PI));
        c.setAttribute('r', (8 + h(i) * 8) * (1 - ph * 0.5));
      });
    }

    // ---- 浮动 +token 徽章 ----
    if (stage === 1) { const p = smooth(T.d1End - 1.2, T.d1End, t0); show(tokBadge, p > 0 && p < 1.2); txt(tokBadge, '+128'); tokBadge.setAttribute('opacity', clamp(1.2 - p, 0, 1)); }
    else if (stage === 2) { const p = smooth(T.d2End - 1.2, T.d2End, t0); show(tokBadge, p > 0 && p < 1.2); txt(tokBadge, '+256'); tokBadge.setAttribute('opacity', clamp(1.2 - p, 0, 1)); }
    else if (stage === 3) { const p = smooth(T.d3End - 1.2, T.d3End, t0); show(tokBadge, p > 0 && p < 1.2); txt(tokBadge, '+512'); tokBadge.setAttribute('opacity', clamp(1.2 - p, 0, 1)); }

    // ---- 大进度数字 / 进度条 ----
    let pct = st.pct;
    if (stage === 4) {
      // 卡 90% 闪
      const flashOn = (Math.floor(pose / 3) % 2) === 0;
      bigPct.setAttribute('fill', flashOn ? P.danger : P.dark);
      pct = 90;
    } else if (stage === 6) {
      // 退回 37% 转圈
      bigPct.setAttribute('fill', P.dark);
      pct = 37;
    } else {
      bigPct.setAttribute('fill', P.danger);
    }
    // 数字轻微跳动（定格步进）
    const jx = stage === 4 ? (h(pose * 1.9) - 0.5) * 10 : 0;
    bigPct.setAttribute('transform', `translate(${jx} 0)`);
    txt(bigPct, Math.round(pct) + '%');
    progFill.setAttribute('width', 588 * clamp(pct / 100, 0, 1));

    // ---- 炉屏文字 ----
    if (stage === 6) { txt(screenTxt, '失败'); txt(screenSub, '不可蒸馏项：1'); }
    else if (stage === 4) { txt(screenTxt, '90%'); txt(screenSub, '卡住…'); }
    else if (stage === 5) { txt(screenTxt, '100%'); txt(screenSub, '已蒸馏'); }
    else { txt(screenTxt, '炼化中'); txt(screenSub, 'skills.distro'); }

    // ---- 假胜利 22–26 ----
    if (stage === 5) {
      show(gWin, true);
      const p = clamp((t0 - T.smashTime) / 0.3, 0, 1);
      gBall.setAttribute('transform', `translate(640 690) scale(${1.6 - 0.6 * easeOutCubic(p)})`);
      show(gBall, true);
      // 章 24.0 砸下
      const sp = clamp((t0 - 24.0) / 0.22, 0, 1);
      stampG.setAttribute('transform', `translate(960 600) rotate(-12) scale(${2.0 - 1.0 * easeOutCubic(sp)})`);
      flash.setAttribute('opacity', t0 >= T.smashTime && t0 < T.smashTime + 0.12 ? 0.6 : 0);
    } else {
      flash.setAttribute('opacity', 0);
    }

    // ---- 反转 26–30 ----
    if (stage === 6) {
      show(gWall, true);
      show(gReal, true);
      show(gBall, true);
      gBall.setAttribute('transform', 'translate(640 690) scale(1)');
      // 真小黏从桌下钻出：27.0 站定（负鼠站姿 4 帧一拍）
      const rise = smooth(T.reversalStart + 0.3, T.possumPose, t0);
      const bob = 1 + 0.015 * Math.sin(pose * TAU / 12); // 结尾更慢的呼吸
      realG.setAttribute('transform', `translate(1680 ${815 + (1 - rise) * 160}) scale(${bob} ${bob})`);
      // 海报/便利贴/章淡入
      const fade = smooth(T.reversalStart, T.reversalStart + 0.8, t0);
      gWall.setAttribute('opacity', fade);
    }

    // ---- 署名（结尾淡入） ----
    signText.setAttribute('opacity', t0 >= T.reversalStart + 1.2 ? 1 : 0);
  }

  window.render = render;
  render(0);
})();
