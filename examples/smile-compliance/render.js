// render.js —— 《微笑合规》Riso 孔版印刷双色风。纯函数 render(t)，元素建一次、只改属性。
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
  const backOut = p => { const c = 1.70158, s = 1.0; p -= 1; return s * p * p * ((c + 1) * p + c) + 1; };
  const TAU = Math.PI * 2;

  // ---------- Riso 色板 ----------
  const C = { paper: '#F1E7D2', pink: '#FF4D8D', blue: '#1E5AA8', purple: '#6E2A5E' };

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

  // ---------- 半调网点 pattern（粉 / 蓝） ----------
  function makeDot(id, fill) {
    const p = el('pattern', { id, width: 20, height: 20, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { cx: 6, cy: 6, r: 6.0, fill }, p);
    el('circle', { cx: 16, cy: 16, r: 6.0, fill }, p);
    return p;
  }
  const dotPink = makeDot('dotPink', C.pink);
  const dotBlue = makeDot('dotBlue', C.blue);

  // 人脸裁切
  el('clipPath', { id: 'faceClip' }, defs).appendChild(el('circle', { cx: 700, cy: 560, r: 196 }));

  // ---------- 世界根 ----------
  const world = el('g', { id: 'world' }, stage);
  const bg = el('rect', { x: -50, y: -50, width: W + 100, height: H + 100, fill: C.paper }, world);

  // ================= 顶部 / 底部 UI 条 =================
  const gChrome = el('g', {}, world);
  el('rect', { x: 0, y: 0, width: W, height: 86, fill: C.blue }, gChrome);
  el('rect', { x: 0, y: 86, width: W, height: 6, fill: C.pink }, gChrome);
  el('rect', { x: 0, y: H - 64, width: W, height: 64, fill: C.blue }, gChrome);
  const chromeTitle = el('text', { x: 60, y: 57, 'font-family': 'HanF', 'font-size': 40, 'font-weight': 700, fill: C.paper }, gChrome);
  txt(chromeTitle, '微笑合规');
  const chromeSub = el('text', { x: W - 60, y: 56, 'text-anchor': 'end', 'font-family': 'MonoF', 'font-size': 24, fill: C.paper }, gChrome);
  txt(chromeSub, 'EMOTION-COMPLIANCE v2.4');
  const readout = el('text', { x: 60, y: H - 22, 'font-family': 'MonoF', 'font-size': 24, fill: C.paper }, gChrome);
  const readoutR = el('text', { x: W - 60, y: H - 22, 'text-anchor': 'end', 'font-family': 'MonoF', 'font-size': 24, fill: '#9fd0ff' }, gChrome);

  // ================= 开场物件：工牌 / 咖啡 / 光标 =================
  const gIntro = el('g', {}, world);
  // 工牌
  const badge = el('g', {}, gIntro);
  el('rect', { x: 60, y: 300, width: 24, height: 150, rx: 8, fill: C.blue }, badge);
  el('rect', { x: -10, y: 430, width: 260, height: 330, rx: 14, fill: C.paper, stroke: C.blue, 'stroke-width': 6 }, badge);
  el('rect', { x: -4, y: 436, width: 260, height: 330, rx: 14, fill: 'none', stroke: C.pink, 'stroke-width': 3, transform: 'translate(3 3)' }, badge);
  el('circle', { cx: 120, cy: 470, r: 14, fill: C.blue }, badge);
  el('circle', { cx: 80, cy: 560, r: 34, fill: 'url(#dotPink)' }, badge);
  el('path', { d: 'M46 640 Q120 580 194 640', fill: 'none', stroke: C.blue, 'stroke-width': 7, 'stroke-linecap': 'round' }, badge);
  const badgeTxt = el('text', { x: 120, y: 700, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 26, fill: C.blue }, badge);
  txt(badgeTxt, 'EMPLOYEE');

  // 冒蒸汽咖啡杯
  const coffee = el('g', {}, gIntro);
  el('rect', { x: 1500, y: 560, width: 150, height: 130, rx: 12, fill: C.pink }, coffee);
  el('rect', { x: 1503, y: 563, width: 150, height: 130, rx: 12, fill: 'none', stroke: C.blue, 'stroke-width': 4, transform: 'translate(3 3)' }, coffee);
  el('path', { d: 'M1650 595 q46 20 0 60 q-30 26 8 52', fill: 'none', stroke: C.pink, 'stroke-width': 12, 'stroke-linecap': 'round' }, coffee);
  el('ellipse', { cx: 1575, cy: 560, rx: 78, ry: 16, fill: C.paper, stroke: C.blue, 'stroke-width': 5 }, coffee);
  const steam = [];
  for (let i = 0; i < 3; i++) {
    const s = el('path', { d: '', fill: 'none', stroke: C.blue, 'stroke-width': 5, 'stroke-linecap': 'round' }, coffee);
    steam.push(s);
  }

  // 标题章
  const titleStamp = el('g', {}, gIntro);
  el('rect', { x: 560, y: 430, width: 800, height: 220, rx: 18, fill: C.paper, stroke: C.blue, 'stroke-width': 8 }, titleStamp);
  el('rect', { x: 566, y: 436, width: 800, height: 220, rx: 18, fill: 'none', stroke: C.pink, 'stroke-width': 4, transform: 'translate(3 3)' }, titleStamp);
  const titleTxt = el('text', { x: 960, y: 575, 'text-anchor': 'middle', 'font-family': 'HanF', 'font-weight': 700, 'font-size': 118, fill: C.blue }, titleStamp);
  txt(titleTxt, '微笑合规测试');

  // 光标
  const cursorD = 'M0 0 L0 30 L8 22 L13 34 L19 31 L14 20 L24 20 Z';
  const cursor = el('g', {}, gIntro);
  el('path', { d: cursorD, fill: C.blue, transform: 'translate(4 5)' }, cursor);
  el('path', { d: cursorD, fill: C.paper, stroke: C.blue, 'stroke-width': 3, 'paint-order': 'stroke fill' }, cursor);

  // ================= 考核舞台 =================
  const gStage = el('g', {}, world);
  // --- 假笑脸脸（中心 700,560） ---
  const face = el('g', {}, gStage);
  // 套色错位 halo：蓝副本垫下，粉/纸本体在上
  el('circle', { cx: 703, cy: 563, r: 196, fill: C.blue }, face);
  el('circle', { cx: 700, cy: 560, r: 196, fill: C.paper, stroke: C.pink, 'stroke-width': 6 }, face);
  // 腮红网点
  const blushL = el('ellipse', { cx: 615, cy: 620, rx: 60, ry: 38, fill: 'url(#dotPink)', opacity: 0.9, 'clip-path': 'url(#faceClip)' }, face);
  const blushR = el('ellipse', { cx: 785, cy: 620, rx: 60, ry: 38, fill: 'url(#dotPink)', opacity: 0.9, 'clip-path': 'url(#faceClip)' }, face);
  // 眼睛
  const eyeL = el('ellipse', { cx: 635, cy: 500, rx: 16, ry: 20, fill: C.blue }, face);
  const eyeR = el('ellipse', { cx: 765, cy: 500, rx: 16, ry: 20, fill: C.blue }, face);
  // 鱼尾纹（R2，网点加密弧线）
  const wrL = el('g', {}, face);
  for (let i = 0; i < 3; i++) el('path', { d: `M600 ${478 + i * 14} q-26 ${i * 6} -34 ${i * 16}`, fill: 'none', stroke: C.pink, 'stroke-width': 4, 'stroke-linecap': 'round' }, wrL);
  const wrR = el('g', {}, face);
  for (let i = 0; i < 3; i++) el('path', { d: `M800 ${478 + i * 14} q26 ${i * 6} 34 ${i * 16}`, fill: 'none', stroke: C.pink, 'stroke-width': 4, 'stroke-linecap': 'round' }, wrR);
  // 嘴：露8齿大笑
  const mouth = el('g', {}, face);
  el('path', { d: 'M580 590 Q700 780 820 590 Q700 690 580 590 Z', fill: C.pink }, mouth);
  // 8 颗牙（纸色小方块）
  const teeth = [];
  for (let i = 0; i < 8; i++) {
    const tx = 598 + i * 26;
    const t = el('rect', { x: tx, y: 588, width: 22, height: 36, rx: 4, fill: C.paper }, mouth);
    teeth.push(t);
  }
  // R3 嘴角 ± 刻度
  const ticks = el('g', {}, face);
  for (let i = -2; i <= 2; i++) {
    el('line', { x1: 560 + i * 22, y1: 588, x2: 560 + i * 22, y2: 600, stroke: C.blue, 'stroke-width': 3 }, ticks);
    el('line', { x1: 840 + i * 22, y1: 588, x2: 840 + i * 22, y2: 600, stroke: C.blue, 'stroke-width': 3 }, ticks);
  }
  const tickLbl = el('text', { x: 700, y: 566, 'text-anchor': 'middle', 'font-family': 'MonoFB', 'font-size': 22, fill: C.blue }, face);
  txt(tickLbl, '±0.1mm');
  // R3 扫描线（蓝带扫脸）
  const scan = el('rect', { x: 500, y: 0, width: 400, height: 26, fill: C.blue, opacity: 0.5, 'clip-path': 'url(#faceClip)' }, face);
  // R4 面具裂纹
  const crack = el('path', { d: 'M600 560 L660 590 L640 640 L720 660 L700 720 L760 760', fill: 'none', stroke: C.purple, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, face);
  // 汗滴
  const sweat = el('path', { d: 'M905 430 q18 26 0 44 q-18 -18 0 -44 Z', fill: C.blue, opacity: 0 }, gStage);
  // 波浪汗线
  const sweatWave = el('path', { d: 'M920 420 q10 -16 20 0 t20 0 t20 0', fill: 'none', stroke: C.blue, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0 }, gStage);

  // --- 仪表盘（中心 1330,730） ---
  const gauge = el('g', {}, gStage);
  el('path', { d: 'M1130 730 A200 200 0 0 1 1530 730', fill: 'none', stroke: C.blue, 'stroke-width': 12, 'stroke-linecap': 'round' }, gauge);
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (1 - i / 10);
    const x1 = 1330 + Math.cos(a) * 178, y1 = 730 - Math.sin(a) * 178;
    const x2 = 1330 + Math.cos(a) * 200, y2 = 730 - Math.sin(a) * 200;
    el('line', { x1, y1, x2, y2, stroke: C.blue, 'stroke-width': 5, 'stroke-linecap': 'round' }, gauge);
  }
  const needle = el('line', { x1: 1330, y1: 730, x2: 1330, y2: 560, stroke: C.pink, 'stroke-width': 9, 'stroke-linecap': 'round' }, gauge);
  el('circle', { cx: 1330, cy: 730, r: 16, fill: C.purple }, gauge);
  const score = el('text', { x: 1330, y: 830, 'text-anchor': 'middle', 'font-family': 'MonoFB', 'font-size': 86, fill: C.blue }, gauge);
  txt(score, '60');
  const scoreUnit = el('text', { x: 1450, y: 830, 'font-family': 'HanF', 'font-size': 34, fill: C.pink }, gauge);
  txt(scoreUnit, '分');

  // --- 回合标签 ---
  const roundTag = el('text', { x: 700, y: 200, 'text-anchor': 'middle', 'font-family': 'MonoFB', 'font-size': 40, fill: C.pink }, gStage);
  const needLbl = el('text', { x: 700, y: 250, 'text-anchor': 'middle', 'font-family': 'HanF', 'font-size': 44, fill: C.blue }, gStage);

  // --- 错位 ✓ 章 ---
  const check = el('g', {}, gStage);
  el('path', { d: 'M-60 5 L-18 48 L70 -55', fill: 'none', stroke: C.pink, 'stroke-width': 26, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: 'translate(1580 303) translate(4 5)' }, check);
  el('path', { d: 'M-60 5 L-18 48 L70 -55', fill: 'none', stroke: C.blue, 'stroke-width': 26, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: 'translate(1580 303)' }, check);
  // 星级（R4）
  const stars = el('g', {}, gStage);
  for (let i = 0; i < 5; i++) {
    el('path', { d: 'M0 -26 L8 -9 L27 -8 L12 4 L17 23 L0 13 L-17 23 L-12 4 L-27 -8 L-8 -9 Z', fill: C.pink, transform: `translate(${1180 + i * 75} 900)` }, stars);
  }

  // ================= 反转 =================
  const gRev = el('g', {}, world);
  // 下班钟弹窗
  const clockCard = el('g', {}, gRev);
  el('rect', { x: 660, y: 150, width: 600, height: 150, rx: 16, fill: C.blue }, clockCard);
  el('rect', { x: 664, y: 154, width: 600, height: 150, rx: 16, fill: 'none', stroke: C.pink, 'stroke-width': 3, transform: 'translate(3 3)' }, clockCard);
  const clockTxt = el('text', { x: 960, y: 248, 'text-anchor': 'middle', 'font-family': 'MonoFB', 'font-size': 72, fill: C.paper }, clockCard);
  txt(clockTxt, '18:00 下班');

  // 班味脸（面具脱落后）
  const tired = el('g', {}, gRev);
  el('circle', { cx: 703, cy: 563, r: 196, fill: C.pink }, tired);
  el('circle', { cx: 700, cy: 560, r: 196, fill: C.paper, stroke: C.blue, 'stroke-width': 6 }, tired);
  el('ellipse', { cx: 700, cy: 640, rx: 120, ry: 60, fill: 'url(#dotBlue)', opacity: 0.8 }, tired);
  el('line', { x1: 600, y1: 505, x2: 668, y2: 510, stroke: C.blue, 'stroke-width': 7, 'stroke-linecap': 'round' }, tired);
  el('line', { x1: 732, y1: 510, x2: 800, y2: 505, stroke: C.blue, 'stroke-width': 7, 'stroke-linecap': 'round' }, tired);
  el('line', { x1: 620, y1: 660, x2: 780, y2: 660, stroke: C.purple, 'stroke-width': 8, 'stroke-linecap': 'round' }, tired);

  // 脱落的假笑脸（从脸心掉到右下）
  const fallen = el('g', {}, gRev);
  el('circle', { cx: 0, cy: 0, r: 90, fill: C.paper, stroke: C.pink, 'stroke-width': 5 }, fallen);
  el('circle', { cx: -35, cy: -28, r: 9, fill: C.blue }, fallen);
  el('circle', { cx: 35, cy: -28, r: 9, fill: C.blue }, fallen);
  el('path', { d: 'M-40 15 Q0 48 40 15', fill: 'none', stroke: C.pink, 'stroke-width': 6, 'stroke-linecap': 'round' }, fallen);
  const fallenCap = el('text', { x: 0, y: 135, 'text-anchor': 'middle', 'font-family': 'MonoF', 'font-size': 26, fill: C.purple }, fallen);
  txt(fallenCap, '假笑满分，真人拒收。');

  // 红警三角
  const alarmB = el('g', {}, gRev);
  el('path', { d: 'M1330 300 L1430 480 L1230 480 Z', fill: C.pink, stroke: C.purple, 'stroke-width': 5, 'stroke-linejoin': 'round' }, alarmB);
  el('rect', { x: 1322, y: 360, width: 16, height: 60, rx: 8, fill: C.paper }, alarmB);
  el('circle', { cx: 1330, cy: 448, r: 10, fill: C.paper }, alarmB);

  // 警告文字
  const warn1 = el('text', { x: 1330, y: 560, 'text-anchor': 'middle', 'font-family': 'HanF', 'font-weight': 700, 'font-size': 40, fill: C.pink }, gRev);
  txt(warn1, '⚠ 检测到未授权真实情绪');
  const warn2 = el('text', { x: 1330, y: 615, 'text-anchor': 'middle', 'font-family': 'HanF', 'font-size': 34, fill: C.blue }, gRev);
  txt(warn2, '情绪溢出 · 活体不可排班');
  const warnTok = el('text', { x: 1330, y: 690, 'text-anchor': 'middle', 'font-family': 'MonoFB', 'font-size': 64, fill: C.purple }, gRev);
  txt(warnTok, 'Token −1');

  // 毛笔「不合格」章
  const failStamp = el('g', {}, gRev);
  el('rect', { x: 820, y: 760, width: 320, height: 150, rx: 10, fill: C.paper, stroke: C.pink, 'stroke-width': 8 }, failStamp);
  const failTxt = el('text', { x: 980, y: 875, 'text-anchor': 'middle', 'font-family': 'BrushF', 'font-size': 96, fill: C.pink }, failStamp);
  txt(failTxt, '不合格');

  // ================= 署名 =================
  const gSign = el('g', {}, world);
  const signTxt = el('text', { x: CX, y: CY + 10, 'text-anchor': 'middle', 'font-family': 'HanF', 'font-size': 52, fill: C.blue }, gSign);
  txt(signTxt, '由 Doubao 在30秒内用纯代码制作完成');
  const seal = el('g', {}, gSign);
  el('circle', { cx: CX + 560, cy: CY - 6, r: 34, fill: 'none', stroke: C.pink, 'stroke-width': 5 }, seal);
  el('text', { x: CX + 560, y: CY + 8, 'text-anchor': 'middle', 'font-family': 'BrushF', 'font-size': 34, fill: C.pink }, seal).textContent = '印';

  // ================= 顶层：闪白 / 纸纹 / 黑场 =================
  const flash = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff', opacity: 0 }, stage);
  const paper = el('rect', { x: 0, y: 0, width: W, height: H, fill: C.paper, opacity: 0.06 }, stage);
  const blackfield = el('rect', { x: 0, y: 0, width: W, height: H, fill: C.paper, opacity: 0 }, stage);

  // ================= 主渲染 =================
  function render(t0) {
    const t = t0;
    const frame = Math.floor(t * T.fps + 0.5);

    // 默认全隐
    show(gIntro, false); show(gStage, false); show(gRev, false); show(gSign, false);
    show(wrL, false); show(wrR, false); show(ticks, false); show(scan, false);
    show(crack, false); show(sweat, false); show(sweatWave, false);
    show(check, false); show(stars, false);
    show(clockCard, false); show(tired, false); show(fallen, false);
    show(alarmB, false); show(warn1, false); show(warn2, false); show(warnTok, false);
    show(failStamp, false); show(blushL, false); show(blushR, false);
    show(tickLbl, false);

    // ---- 套色错位 halo：±0.5px 漂移（每帧确定性） ----
    const offX = 2.5 + (h(frame * 1.3) - 0.5) * 1.0;
    const offY = 2.5 + (h(frame * 2.1) - 0.5) * 1.0;

    // ---- 网点 boil：pattern 微旋 + 微移 ----
    const drot = (h(frame * 0.7) - 0.5) * 2.0;
    const dtx = (h(frame * 1.9) - 0.5) * 1.0;
    dotPink.setAttribute('patternTransform', `translate(${dtx} ${dtx}) rotate(${drot} 10 10)`);
    dotBlue.setAttribute('patternTransform', `translate(${-dtx} ${dtx}) rotate(${-drot} 10 10)`);

    // ---- 底部读数（每帧翻字 = 内容区真运动） ----
    txt(readout, 'EMOTION.SCAN :: 0x' + Math.floor(h(frame * 3.3) * 65535).toString(16).padStart(4, '0').toUpperCase());
    txt(readoutR, 'FRAME ' + String(frame).padStart(4, '0') + '/900');

    // ---- 震屏 / 闪白 ----
    let shx = 0, shy = 0, fl = 0;
    const HITS = [
      { t: T.titleStamp, sh: 14, fl: 0.5 }, { t: T.r1Check, sh: 10, fl: 0.35 },
      { t: T.r2Check, sh: 10, fl: 0.35 }, { t: T.r3Check, sh: 10, fl: 0.35 },
      { t: T.r4Check, sh: 10, fl: 0.35 }, { t: T.alarm, sh: 18, fl: 0.6 },
      { t: T.stampFail, sh: 22, fl: 0.55 }
    ];
    for (const it of HITS) {
      const dt = t - it.t;
      if (dt >= 0 && dt < 0.4) {
        const a = it.sh * Math.exp(-10 * dt);
        shx += (h(frame + it.t) - 0.5) * 2 * a;
        shy += (h(frame * 2 + it.t) - 0.5) * 2 * a;
      }
      if (dt >= 0 && dt < 0.08) fl = Math.max(fl, it.fl * (1 - dt / 0.08));
    }
    flash.setAttribute('opacity', fl);
    world.setAttribute('transform', `translate(${shx} ${shy})`);

    // ============ 开场 0–3 ============
    if (t < T.introEnd) {
      show(gIntro, true);
      const pIn = smooth(T.introIn, T.introIn + 0.6, t);
      const slideX = (1 - pIn) * -400;
      badge.setAttribute('transform', `translate(${slideX} 0)`);
      coffee.setAttribute('transform', `translate(${(1 - pIn) * 400} 0)`);
      cursor.setAttribute('transform', `translate(${lerp(400, 1080, smooth(T.introIn + 0.2, T.introIn + 0.9, t)) + (h(frame * 1.1) - 0.5) * 10} ${lerp(900, 760, smooth(T.introIn + 0.2, T.introIn + 0.9, t)) + (h(frame * 2.3) - 0.5) * 10})`);
      // 标题盖章
      const st = clamp((t - T.titleStamp) / 0.22, 0, 1);
      if (t >= T.titleStamp) {
        show(titleStamp, true);
        let sc;
        if (st < 0.5) sc = 2.0 - 1.0 * (st / 0.5); else sc = 1 + 0.06 * (1 - (st - 0.5) / 0.5);
        titleStamp.setAttribute('transform', `translate(960 540) rotate(${(1 - easeOutCubic(st)) * -6}) scale(${sc}) translate(-960 -540)`);
      } else show(titleStamp, false);
      // 蒸汽
      steam.forEach((s, i) => {
        const bob = Math.sin(frame * 0.15 + i * 2) * 6;
        s.setAttribute('d', `M${1560 + i * 18} 540 q${-12 + bob} -22 0 -44 q${12 - bob} -22 0 -44`);
      });
    }

    // ============ 考核 R1–R4 ============
    const inRound = t >= T.r1FaceIn && t < T.clockPopup;
    if (inRound) {
      show(gStage, true);
      show(blushL, true); show(blushR, true);
      // 脸入场
      const faceIn = smooth(T.r1FaceIn, T.r1FaceIn + 0.4, t);
      face.setAttribute('transform', `translate(0 ${(1 - easeOutCubic(faceIn)) * -300})`);

      let round, need, target;
      if (t < T.r2In) { round = 'R1'; need = '基础微笑 · 露8齿'; target = 60; }
      else if (t < T.r3In) { round = 'R2'; need = '眼睛也要笑'; target = 80; }
      else if (t < T.r4In) { round = 'R3'; need = '真诚度检测 · 弧度±0.1mm'; target = 95; }
      else { round = 'R4'; need = '全天不松懈 · 目标100/24h'; target = 100; }
      txt(roundTag, round); txt(needLbl, need);

      // 指针：从当前分值 ease 到 target
      const landT = t < T.r2In ? T.r1DialLand : t < T.r3In ? T.r2DialLand : t < T.r4In ? T.r3DialLand : T.r4DialLand;
      const prev = t < T.r2In ? 0 : t < T.r3In ? 60 : t < T.r4In ? 80 : 95;
      let val;
      if (t < landT) val = prev; else val = Math.round(lerp(prev, target, backOut(clamp((t - landT) / 0.35, 0, 1))));
      // 指针到顶后 R4 微抖
      if (round === 'R4' && t > T.r4DialLand) val = 100 + Math.round((h(frame * 1.1) - 0.5) * 2);
      // 分数读数每帧微抖（活体计数）—— 持续强内容运动
      const disp = Math.max(0, Math.min(100, val + Math.round((h(frame * 1.3) - 0.5) * 3)));
      txt(score, String(disp));
      // 指针活体抖动（机器持续读数）+ 眨眼循环 —— 持续内容运动
      const jit = (h(frame * 1.7) - 0.5) * 0.02;
      const ang = Math.PI * (1 - clamp(val, 0, 100) / 100) + jit;
      needle.setAttribute('x2', 1330 + Math.cos(ang) * 185);
      needle.setAttribute('y2', 730 - Math.sin(ang) * 185);
      const bl = frame % 48;
      const eyeRy = bl < 6 ? lerp(20, 3, bl / 6) : (bl < 12 ? lerp(3, 20, (bl - 6) / 6) : 20);
      eyeL.setAttribute('ry', eyeRy); eyeR.setAttribute('ry', eyeRy);

      // R2 鱼尾纹 + 汗滴
      if (t >= T.r2Wrinkles) { show(wrL, true); show(wrR, true); }
      if (t >= T.r2Sweat) {
        show(sweat, true); show(sweatWave, true);
        const sy = Math.sin(frame * 0.2) * 8;
        sweat.setAttribute('transform', `translate(0 ${sy})`);
        sweatWave.setAttribute('transform', `translate(${Math.sin(frame * 0.15) * 6} 0)`);
      }
      // R3 扫描线 + 刻度 + 脸微抽搐
      if (round === 'R3') {
        show(ticks, true); show(tickLbl, true);
        if (t >= T.r3Scan) show(scan, true);
        const sy = ((t - T.r3Scan) * 120) % 400 - 40;
        scan.setAttribute('y', 400 + sy);
        const twx = (h(frame * 1.7) - 0.5) * (t > T.r3DialLand ? 6 : 2);
        face.setAttribute('transform', `translate(${twx} ${(1 - easeOutCubic(faceIn)) * -300})`);
      }
      // R4 面具裂开 + 星级
      if (round === 'R4') {
        if (t >= T.r4Crack) show(crack, true);
        if (t >= T.r4Check) show(stars, true);
      }
      // 每回合 ✓ 章
      const checkT = round === 'R1' ? T.r1Check : round === 'R2' ? T.r2Check : round === 'R3' ? T.r3Check : T.r4Check;
      if (t >= checkT) {
        show(check, round !== 'R4');
        const cp = backOut(clamp((t - checkT) / 0.22, 0, 1));
        check.setAttribute('opacity', clamp((t - checkT) / 0.1, 0, 1));
        check.setAttribute('transform', `translate(1580 303) scale(${cp}) translate(-1580 -303)`);
      }
    }

    // ============ 反转 26–28.7 ============
    if (t >= T.clockPopup && t < T.revEnd) {
      show(gRev, true);
      // 下班钟
      show(clockCard, true);
      const cp = backOut(clamp((t - T.clockPopup) / 0.25, 0, 1));
      clockCard.setAttribute('transform', `translate(960 225) scale(${cp}) translate(-960 -225)`);

      // 假脸：下班瞬间真笑 0.1s（用 stage 的脸短暂保留？直接切：alarm 前画在舞台位）
      // 班味脸：maskFall 后出现
      if (t >= T.maskFall) {
        show(tired, true);
        show(fallen, true);
        const fp = easeOutCubic(clamp((t - T.maskFall) / 0.35, 0, 1));
        const fx = lerp(700, 1250, fp), fy = lerp(560, 850, fp);
        fallen.setAttribute('transform', `translate(${fx} ${fy}) rotate(${fp * 20})`);
      } else {
        // 假脸还在（微笑）—— 复用 stage 脸
        show(gStage, true); show(blushL, true); show(blushR, true);
        face.setAttribute('transform', '');
        // 真笑 0.1s：嘴咧更开（临时放大 mouth）
        if (t >= T.realSmile && t < T.realSmile + 0.1) mouth.setAttribute('transform', 'translate(700 600) scale(1.15) translate(-700 -600)');
        else mouth.setAttribute('transform', '');
      }
      // 红警闪烁
      if (t >= T.alarm) {
        show(alarmB, true);
        alarmB.setAttribute('opacity', (Math.floor(frame / 4) % 2) ? 1 : 0.25);
      }
      if (t >= T.warnText) { show(warn1, true); show(warn2, true); }
      if (t >= T.tokenDeduct) show(warnTok, true);
      // 毛笔不合格章
      if (t >= T.stampFail) {
        show(failStamp, true);
        const sp = backOut(clamp((t - T.stampFail) / 0.25, 0, 1));
        failStamp.setAttribute('transform', `translate(980 835) rotate(${(1 - easeOutCubic(sp)) * -10}) scale(${sp}) translate(-980 -835)`);
      }
    }

    // ============ 署名 29–30 ============
    if (t >= T.signIn) {
      show(gSign, true);
      show(gChrome, false);
      const sp = smooth(T.signIn, T.signIn + 0.4, t);
      gSign.setAttribute('opacity', sp);
      if (t >= T.signSeal) {
        const s2 = backOut(clamp((t - T.signSeal) / 0.2, 0, 1));
        seal.setAttribute('opacity', 1);
        seal.setAttribute('transform', `scale(${s2})`);
      }
    }

    // ---- 开场黑场仅前 0.12s ----
    blackfield.setAttribute('opacity', 1 - smooth(0, 0.12, t0));
  }

  window.render = render;
  render(0);
})();
