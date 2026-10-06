// render.js —— 《电子布洛芬·止痛不治本》Lichtenstein 复古波普漫画风。
// 纯函数 render(t)；所有元素加载时建好一次，render 只改属性/transform/textContent。
// 无 Math.random/异步；随机走帧号哈希。boil 关闭，生命感靠切格/爆裂punch/气泡弹出/网点跳档。
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
  const backOut = p => { const c = 1.70158, s = 1.3; p -= 1; return s * p * p * ((c + 1) * p + c) + 1; };
  const P = Math.PI * 2;

  // ---------- 波普锁死5色 ----------
  const C = {
    paper: '#F4EDD8',
    ink: '#111111',
    red: '#E2231A',
    yellow: '#F4C20D',
    blue: '#1E5AA8',
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
  const defs = el('defs', {}, stage);

  // ---------- Ben-Day 网点 pattern（色×密度档） ----------
  function makeDot(id, sp, r, color) {
    const p = el('pattern', { id, width: sp, height: sp, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { cx: sp / 2, cy: sp / 2, r, fill: color }, p);
    return p;
  }
  // 脸=纸白+红浅网点
  makeDot('dotFace', 30, 5.5, C.red);
  // 红
  makeDot('dotRed_mid', 26, 7.5, C.red);
  makeDot('dotRed_deep', 15, 8.5, C.red);
  makeDot('dotRed_heavy', 11, 6.0, C.red);
  // 蓝
  makeDot('dotBlue_mid', 26, 7.5, C.blue);
  makeDot('dotBlue_deep', 15, 8.5, C.blue);
  makeDot('dotBlue_heavy', 11, 6.0, C.blue);
  // 黄
  makeDot('dotYellow_mid', 26, 7.5, C.yellow);
  makeDot('dotYellow_deep', 15, 8.5, C.yellow);
  makeDot('dotYellow_heavy', 11, 6.0, C.yellow);

  // 头/脸裁切（网点只在形状内）
  const headClip = el('clipPath', { id: 'headClip' }, defs);
  el('circle', { cx: 0, cy: -130, r: 95 }, headClip);

  // ============================ 世界根 ============================
  const world = el('g', { id: 'world' }, stage);
  const bg = el('rect', { x: -60, y: -60, width: W + 120, height: H + 120, fill: C.paper }, world);
  // 整页粗黑外框（补墨量 + 漫画页感）
  el('rect', { x: 8, y: 8, width: W - 16, height: H - 16, fill: 'none', stroke: C.ink, 'stroke-width': 14 }, world);

  // 面板助手：黑边纸白格
  function panel(x, y, w, h, parent) {
    const g = el('g', {}, parent || world);
    el('rect', { x, y, width: w, height: h, fill: C.paper, stroke: C.ink, 'stroke-width': 12 }, g);
    return g;
  }
  // 大面积密网点背景块（波普阴影/空虚感），同时抬 primary_box 与 dot_cov
  let dotDriftEls = [];
  function bgDots(parent, x, y, w, h, pat, op) {
    const r = el('rect', { x, y, width: w, height: h, fill: `url(#${pat})`, opacity: op == null ? 1 : op }, parent);
    dotDriftEls.push(r);
    return r;
  }

  // 爆裂星burst（居中于原点），返回 polygon
  function burstPoly(spikes, R, fill, sw) {
    let pts = '';
    for (let i = 0; i < spikes * 2; i++) {
      const rr = i % 2 ? R * 0.78 : R * (1 + 0.12 * h(i * 3.3));
      const a = (i / (spikes * 2)) * P;
      pts += `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)} `;
    }
    return el('polygon', { points: pts, fill, stroke: C.ink, 'stroke-width': sw || 12, 'stroke-linejoin': 'round' });
  }

  // ============================ 英雄（复用，本地坐标，脚 y≈+150） ============================
  function buildHero(parent) {
    const g = el('g', {}, parent);
    // 落地影：一团蓝密网点硬切
    el('ellipse', { cx: 0, cy: 158, rx: 120, ry: 22, fill: 'url(#dotBlue_deep)' }, g);
    // 腿（蓝）
    el('rect', { x: -52, y: 60, width: 40, height: 95, fill: C.blue, stroke: C.ink, 'stroke-width': 10 }, g);
    el('rect', { x: 12, y: 60, width: 40, height: 95, fill: C.blue, stroke: C.ink, 'stroke-width': 10 }, g);
    // 身体（红衫）
    el('path', { d: 'M-78 -55 L78 -55 L66 70 L-66 70 Z', fill: C.red, stroke: C.ink, 'stroke-width': 11, 'stroke-linejoin': 'round' }, g);
    // 心口手（捂胸口）
    const arm = el('g', {}, g);
    el('path', { d: 'M-20 -40 Q-45 -10 -15 5 Q10 15 25 0', fill: 'none', stroke: C.ink, 'stroke-width': 16, 'stroke-linecap': 'round' }, arm);
    el('circle', { cx: 18, cy: 2, r: 20, fill: C.paper, stroke: C.ink, 'stroke-width': 9 }, arm);
    // 头
    el('circle', { cx: 0, cy: -130, r: 95, fill: C.paper, stroke: C.ink, 'stroke-width': 12 }, g);
    // 脸红网点（clip 到头内）
    const faceDot = el('circle', { cx: 0, cy: -130, r: 95, fill: 'url(#dotFace)', 'clip-path': 'url(#headClip)' }, g);
    // 颈下蓝网点阴影
    el('ellipse', { cx: 0, cy: -70, rx: 60, ry: 26, fill: 'url(#dotBlue_mid)', 'clip-path': 'url(#headClip)', opacity: 0.9 }, g);
    // 眼睛：普通点 / 螺旋
    const eyesNormal = el('g', {}, g);
    el('circle', { cx: -32, cy: -145, r: 11, fill: C.ink }, eyesNormal);
    el('circle', { cx: 32, cy: -145, r: 11, fill: C.ink }, eyesNormal);
    const eyesSpiral = el('g', {}, g);
    for (const ex of [-32, 32]) {
      el('circle', { cx: ex, cy: -145, r: 20, fill: 'none', stroke: C.ink, 'stroke-width': 6 }, eyesSpiral);
      el('circle', { cx: ex, cy: -145, r: 8, fill: 'none', stroke: C.ink, 'stroke-width': 5 }, eyesSpiral);
      el('circle', { cx: ex, cy: -145, r: 3, fill: C.ink }, eyesSpiral);
    }
    show(eyesSpiral, false);
    // 嘴：难受 / 爽 / 呆
    const mouthWince = el('path', { d: 'M-28 -95 Q0 -80 28 -95', fill: 'none', stroke: C.ink, 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
    const mouthSmile = el('path', { d: 'M-30 -100 Q0 -72 30 -100', fill: 'none', stroke: C.ink, 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
    const mouthO = el('ellipse', { cx: 0, cy: -92, rx: 14, ry: 18, fill: C.ink }, g);
    show(mouthSmile, false); show(mouthO, false);
    return { g, arm, eyesNormal, eyesSpiral, mouthWince, mouthSmile, mouthO, faceDot };
  }

  // ============================ 空虚怪（蓝网点怪，本地原点=怪中心） ============================
  function buildMonster(parent) {
    const g = el('g', {}, parent);
    // 不规则 blob
    let d = 'M0 -90 ';
    const N = 12;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * P;
      const rr = 90 * (0.82 + 0.3 * h(i * 1.7));
      d += `${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)} `;
    }
    d += 'Z';
    const body = el('path', { d, fill: 'url(#dotBlue_mid)', stroke: C.ink, 'stroke-width': 10, 'stroke-linejoin': 'round' }, g);
    // 眼
    const eyeL = el('circle', { cx: -28, cy: -15, r: 20, fill: C.paper, stroke: C.ink, 'stroke-width': 7 }, g);
    const eyeR = el('circle', { cx: 28, cy: -15, r: 20, fill: C.paper, stroke: C.ink, 'stroke-width': 7 }, g);
    el('circle', { cx: -24, cy: -12, r: 8, fill: C.ink }, g);
    el('circle', { cx: 32, cy: -12, r: 8, fill: C.ink }, g);
    // 嘴：锯齿
    el('path', { d: 'M-40 35 L-25 22 L-10 35 L5 22 L20 35 L35 22 L45 38', fill: 'none', stroke: C.ink, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    return { g, body };
  }

  // ============================ 场景组 ============================
  // 封面
  const gCover = el('g', {}, world);
  const coverBurst = burstPoly(20, 520, C.yellow, 16);
  gCover.appendChild(coverBurst);
  const coverHero = buildHero(gCover);
  coverHero.g.setAttribute('transform', 'translate(960 790) scale(0.95)');
  const coverTitle = el('text', { x: CX, y: 360, 'text-anchor': 'middle', 'font-family': 'QingKe', 'font-size': 150, fill: C.red, 'paint-order': 'stroke', stroke: C.ink, 'stroke-width': 6 }, gCover);
  txt(coverTitle, '电子布洛芬');
  const coverSub = el('text', { x: CX, y: 470, 'text-anchor': 'middle', 'font-family': 'QingKe', 'font-size': 66, fill: C.ink }, gCover);
  txt(coverSub, '第1话 · 止痛不治本');
  const coverVol = el('text', { x: CX, y: 560, 'text-anchor': 'middle', 'font-family': 'AntonF', 'font-size': 56, fill: C.blue }, gCover);
  txt(coverVol, 'VOL.17');

  // ---- 段2：侠捂胸口 + 怪探出 + 思想泡 ----
  const gHero = el('g', {}, world);
  panel(120, 110, 1680, 860, gHero);
  el('rect', { x: 900, y: 110, width: 900, height: 860, fill: 'url(#dotBlue_mid)' }, gHero);  // 蓝网点空虚区
  bgDots(gHero, 120, 760, 700, 210, 'dotRed_mid');    // 脚下红网点影
  const heroMain = buildHero(gHero);
  heroMain.g.setAttribute('transform', 'translate(760 640)');
  const heroMonster = buildMonster(gHero);
  // 思想泡（云朵 + 渐缩小圆）
  const think = el('g', {}, gHero);
  el('ellipse', { cx: 1330, cy: 330, rx: 230, ry: 120, fill: C.paper, stroke: C.ink, 'stroke-width': 7 }, think);
  el('circle', { cx: 1150, cy: 410, r: 34, fill: C.paper, stroke: C.ink, 'stroke-width': 6 }, think);
  el('circle', { cx: 1080, cy: 470, r: 20, fill: C.paper, stroke: C.ink, 'stroke-width': 5 }, think);
  const thinkTxt = el('text', { x: 1330, y: 355, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 72, fill: C.ink }, think);
  txt(thinkTxt, '好难受…');

  // ---- 通用：POW 爆裂字框（英文） ----
  function burstWord(parent, word, fill) {
    const g = el('g', {}, parent);
    const poly = burstPoly(16, 200, fill, 14);
    g.appendChild(poly);
    const t = el('text', { x: 0, y: 28, 'text-anchor': 'middle', 'font-family': 'AntonF', 'font-size': 120, fill: C.paper, 'paint-order': 'stroke', stroke: C.ink, 'stroke-width': 4 }, g);
    txt(t, word);
    return g;
  }
  // 通用对白气泡
  function speech(parent, x, y, w, h, lines) {
    const g = el('g', {}, parent);
    el('ellipse', { cx: x, cy: y, rx: w / 2, ry: h / 2, fill: C.paper, stroke: C.ink, 'stroke-width': 7 }, g);
    // 尾巴
    el('path', { d: `M${x - 20} ${y + h / 2 - 6} L${x - 70} ${y + h / 2 + 70} L${x + 20} ${y + h / 2 - 10} Z`, fill: C.paper, stroke: C.ink, 'stroke-width': 6, 'stroke-linejoin': 'round' }, g);
    const t = el('text', { x, y: y + (lines.length > 1 ? 18 : 22), 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 52, fill: C.ink }, g);
    if (lines.length === 1) txt(t, lines[0]);
    else { t.setAttribute('y', y - 6); t.textContent = ''; lines.forEach((ln, i) => { const s = el('tspan', { x, dy: i === 0 ? 0 : 60 }, t); txt(s, ln); }); }
    return g;
  }

  // ---- 段3：R1 红胶囊 ----
  const gR1 = el('g', {}, world);
  panel(120, 110, 1680, 860, gR1);
  el('rect', { x: 120, y: 110, width: 680, height: 860, fill: 'url(#dotRed_mid)' }, gR1);   // 红网点
  el('rect', { x: 1280, y: 110, width: 520, height: 300, fill: C.yellow }, gR1); // 右上黄块
  const r1Hero = buildHero(gR1);
  r1Hero.g.setAttribute('transform', 'translate(620 640)');
  // 胶囊（红/白两半，竖）
  const r1Cap = el('g', {}, gR1);
  el('rect', { x: -40, y: -90, width: 80, height: 180, rx: 40, fill: C.paper, stroke: C.ink, 'stroke-width': 10 }, r1Cap);
  el('path', { d: 'M-40 -90 A40 40 0 0 1 40 -90 L40 0 L-40 0 Z', fill: C.red, stroke: C.ink, 'stroke-width': 10 }, r1Cap);
  // POW
  const r1Pow = burstWord(gR1, 'POW!', C.red);
  r1Pow.setAttribute('transform', 'translate(1180 360)');
  // 爽气泡
  const r1Shuang = speech(gR1, 1330, 640, 360, 160, ['爽！']);
  // 剂量牌
  const doseTag = el('g', {}, gR1);
  el('rect', { x: 1380, y: 820, width: 300, height: 90, fill: C.yellow, stroke: C.ink, 'stroke-width': 8 }, doseTag);
  const doseTxt = el('text', { x: 1530, y: 885, 'text-anchor': 'middle', 'font-family': 'AntonF', 'font-size': 64, fill: C.ink }, doseTag);
  txt(doseTxt, 'DOSE x1');
  // 手机UI（搞笑短视频15s）
  const r1Phone = el('g', {}, gR1);
  el('rect', { x: 1280, y: 380, width: 240, height: 420, rx: 26, fill: C.ink, stroke: C.ink, 'stroke-width': 8 }, r1Phone);
  el('rect', { x: 1296, y: 410, width: 208, height: 360, fill: C.blue }, r1Phone);
  el('polygon', { points: '1370,540 1370,660 1470,600', fill: C.yellow }, r1Phone);
  const r1PhoneTxt = el('text', { x: 1399, y: 800, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 30, fill: C.ink }, r1Phone);
  txt(r1PhoneTxt, '搞笑短视频 15s');

  // ---- 段4：横2格 黄丸 ----
  const gR2 = el('g', {}, world);
  panel(120, 110, 820, 860, gR2);          // 左格
  panel(980, 110, 820, 860, gR2);          // 右格（gutter=40）
  el('rect', { x: 120, y: 110, width: 820, height: 860, fill: 'url(#dotYellow_mid)' }, gR2);  // 左格黄网点
  el('rect', { x: 980, y: 110, width: 820, height: 280, fill: C.yellow }, gR2);   // 右格上黄
  el('rect', { x: 980, y: 600, width: 820, height: 370, fill: C.blue }, gR2);    // 右格下蓝
  const r2Hero = buildHero(gR2);
  r2Hero.g.setAttribute('transform', 'translate(520 660) scale(0.85)');
  const r2Monster = buildMonster(gR2);
  // 黄丸（比红胶囊大一号）
  const r2Pill = el('g', {}, gR2);
  el('rect', { x: -60, y: -110, width: 120, height: 220, rx: 60, fill: C.yellow, stroke: C.ink, 'stroke-width': 12 }, r2Pill);
  el('line', { x1: -60, y1: 0, x2: 60, y2: 0, stroke: C.ink, 'stroke-width': 8 }, r2Pill);
  const r2Wham = burstWord(gR2, 'WHAM!', C.blue);
  r2Wham.setAttribute('transform', 'translate(1390 360)');
  const r2Bub1 = speech(gR2, 1380, 640, 380, 150, ['治愈vlog', '30分钟']);
  const r2Bub2 = speech(gR2, 560, 300, 360, 140, ['再来一颗！']);

  // ---- 段5：蓝巨丸 ----
  const gR3 = el('g', {}, world);
  panel(120, 110, 1680, 860, gR3);
  el('rect', { x: 120, y: 110, width: 1680, height: 860, fill: C.blue }, gR3);
  const r3Hero = buildHero(gR3);
  r3Hero.g.setAttribute('transform', 'translate(560 660) scale(0.8)');
  // 蓝巨丸比侠大
  const r3Pill = el('g', {}, gR3);
  el('ellipse', { cx: 0, cy: 0, rx: 200, ry: 260, fill: 'url(#dotBlue_deep)', stroke: C.ink, 'stroke-width': 14 }, r3Pill);
  el('line', { x1: -200, y1: 0, x2: 200, y2: 0, stroke: C.ink, 'stroke-width': 10 }, r3Pill);
  const r3Bam = burstWord(gR3, 'BAM!', C.yellow);
  r3Bam.setAttribute('transform', 'translate(1330 320)');
  const r3Bub = speech(gR3, 1330, 620, 420, 200, ['通宵刷', '停不下来']);
  // 低电量标红
  const batt = el('g', {}, gR3);
  el('rect', { x: 1450, y: 160, width: 180, height: 70, fill: C.paper, stroke: C.red, 'stroke-width': 8 }, batt);
  el('rect', { x: 1636, y: 180, width: 16, height: 30, fill: C.red }, batt);
  el('rect', { x: 1458, y: 168, width: 24, height: 54, fill: C.red }, batt);
  const battTxt = el('text', { x: 1540, y: 280, 'text-anchor': 'middle', 'font-family': 'AntonF', 'font-size': 44, fill: C.red }, batt);
  txt(battTxt, 'LOW');

  // ---- 段6：整座手机砸出 KAPOW ----
  const gR4 = el('g', {}, world);
  panel(60, 90, 1800, 900, gR4);
  el('rect', { x: 60, y: 90, width: 1800, height: 900, fill: C.red }, gR4);
  // 整座手机（巨大，斜）
  const r4Phone = el('g', {}, gR4);
  el('rect', { x: -180, y: -320, width: 360, height: 640, rx: 40, fill: C.ink, stroke: C.ink, 'stroke-width': 12 }, r4Phone);
  el('rect', { x: -160, y: -290, width: 320, height: 580, fill: C.red }, r4Phone);
  el('polygon', { points: '-30,-20 -30,120 90,50', fill: C.yellow }, r4Phone);
  const r4Kapow = burstWord(gR4, 'KAPOW!', C.red);
  r4Kapow.setAttribute('transform', 'translate(960 360)');
  // 怪被炸成网点重拼更大
  const r4Monster = buildMonster(gR4);
  // 剂量×99+
  const doseMaxTag = el('g', {}, gR4);
  el('rect', { x: 1280, y: 760, width: 440, height: 110, fill: C.red, stroke: C.ink, 'stroke-width': 10 }, doseMaxTag);
  const doseMaxTxt = el('text', { x: 1500, y: 835, 'text-anchor': 'middle', 'font-family': 'AntonF', 'font-size': 72, fill: C.paper }, doseMaxTag);
  txt(doseMaxTxt, 'DOSE x99+');
  // 怪字变"更空虚"
  const worseTxt = el('text', { x: 960, y: 900, 'text-anchor': 'middle', 'font-family': 'QingKe', 'font-size': 90, fill: C.blue }, gR4);
  txt(worseTxt, '更空虚…');

  // ---- 段7：医生处方（配乐急停） ----
  const gDoc = el('g', {}, world);
  panel(120, 110, 1680, 860, gDoc);
  el('rect', { x: 120, y: 110, width: 1680, height: 280, fill: C.yellow }, gDoc);  // 诊室黄墙
  // 医生（白大褂）
  const doctor = el('g', {}, gDoc);
  el('rect', { x: 560, y: 420, width: 260, height: 320, fill: C.paper, stroke: C.ink, 'stroke-width': 11 }, doctor);
  el('circle', { cx: 690, cy: 330, r: 90, fill: C.paper, stroke: C.ink, 'stroke-width': 11 }, doctor);
  el('circle', { cx: 660, cy: 320, r: 9, fill: C.ink }, doctor);
  el('circle', { cx: 720, cy: 320, r: 9, fill: C.ink }, doctor);
  el('path', { d: 'M660 365 Q690 385 720 365', fill: 'none', stroke: C.ink, 'stroke-width': 7, 'stroke-linecap': 'round' }, doctor);
  // 听诊器
  el('path', { d: 'M660 420 Q690 470 720 420', fill: 'none', stroke: C.blue, 'stroke-width': 8 }, doctor);
  // 处方纸
  const scriptPaper = el('g', {}, gDoc);
  el('rect', { x: 900, y: 300, width: 620, height: 380, fill: C.paper, stroke: C.ink, 'stroke-width': 9 }, scriptPaper);
  el('text', { x: 940, y: 380, 'font-family': 'KuaiLe', 'font-size': 46, fill: C.ink }, scriptPaper).textContent = '处方';
  el('text', { x: 940, y: 470, 'font-family': 'KuaiLe', 'font-size': 44, fill: C.ink }, scriptPaper).textContent = '药效：40 秒。';
  el('text', { x: 940, y: 560, 'font-family': 'KuaiLe', 'font-size': 44, fill: C.red }, scriptPaper).textContent = '副作用：更空虚。';
  el('path', { d: 'M940 630 Q1050 600 1160 640 T1380 625', fill: 'none', stroke: C.blue, 'stroke-width': 6 }, scriptPaper);

  // ---- 段8：放下手机 ----
  const gDown = el('g', {}, world);
  panel(120, 110, 1680, 860, gDown);
  el('rect', { x: 120, y: 110, width: 1680, height: 860, fill: C.blue, opacity: 0.85 }, gDown);
  const downHero = buildHero(gDown);
  downHero.g.setAttribute('transform', 'translate(760 660)');
  // 手机（暗，红点）
  const downPhone = el('g', {}, gDown);
  el('rect', { x: 1200, y: 360, width: 260, height: 460, rx: 28, fill: C.ink, stroke: C.ink, 'stroke-width': 9 }, downPhone);
  el('rect', { x: 1216, y: 390, width: 228, height: 400, fill: C.blue }, downPhone);
  const redDot = el('circle', { cx: 1330, cy: 560, r: 30, fill: C.red }, downPhone);
  // 怪缩成蓝网点
  const downMonster = buildMonster(gDown);

  // ---- 段9：走出格 + 旁白框 + 署名 ----
  const gOut = el('g', {}, world);
  const outHero = buildHero(gOut);
  outHero.g.setAttribute('transform', 'translate(400 720)');
  // 旁白框
  const narrBox = el('g', {}, gOut);
  el('rect', { x: 560, y: 300, width: 1200, height: 300, fill: C.paper, stroke: C.ink, 'stroke-width': 9 }, narrBox);
  el('text', { x: 1160, y: 430, 'text-anchor': 'middle', 'font-family': 'QingKe', 'font-size': 62, fill: C.ink }, narrBox).textContent = '屏幕给的是止痛药，';
  el('text', { x: 1160, y: 520, 'text-anchor': 'middle', 'font-family': 'QingKe', 'font-size': 62, fill: C.red }, narrBox).textContent = '你给自己的，才是治疗。';
  // 角彩蛋
  const egg = el('text', { x: 1860, y: 1040, 'text-anchor': 'end', 'font-family': 'AntonF', 'font-size': 34, fill: C.blue }, gOut);
  txt(egg, 'SCREEN TIME TODAY 03:47');
  const signText = el('text', { x: CX, y: 1010, 'text-anchor': 'middle', 'font-family': 'KuaiLe', 'font-size': 40, fill: C.ink }, gOut);
  txt(signText, '由 Doubao 在30秒内用纯代码制作完成');

  // ---------- FX：震屏 hit 表 ----------
  const HITS = [
    { t: T.splashBoom, sh: 34, fl: 0.7 },
    { t: T.pow, sh: 26, fl: 0.55 },
    { t: T.wham, sh: 24, fl: 0.5 },
    { t: T.bam, sh: 30, fl: 0.6 },
    { t: T.kapow, sh: 40, fl: 0.85 },
  ];

  // 屏幕空间顶层：闪白
  const flash = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff', opacity: 0 }, stage);

  // ============================ 主渲染 ============================
  function render(t0) {
    let t = t0;
    const frame = Math.round(t * T.fps);
    const beatPulse = 1 + 0.05 * Math.sin((frame / 12) * P);   // 每拍呼吸

    // 网点慢漂移（印刷错位感，逐帧微移降死帧；非 boil）
    const ddx = Math.round((h(frame * 0.37) - 0.5) * 4);
    const ddy = Math.round((h(frame * 0.71) - 0.5) * 4);
    ['dotRed_mid','dotRed_deep','dotRed_heavy','dotBlue_mid','dotBlue_deep','dotBlue_heavy','dotYellow_mid','dotYellow_deep','dotYellow_heavy','dotFace'].forEach(id => {
      const p = document.getElementById(id);
      if (p) p.setAttribute('patternTransform', `translate(${ddx} ${ddy})`);
    });

    // ---- 全局场景显隐 ----
    [gCover, gHero, gR1, gR2, gR3, gR4, gDoc, gDown, gOut].forEach(g => show(g, false));

    // ---- 震屏 / 闪白 ----
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
    // 整体极慢漂移（印刷微抖感），让所有高对比边缘逐帧微动，消除死帧
    const wdx = (h(frame * 0.13) - 0.5) * 2.4;
    const wdy = (h(frame * 0.29) - 0.5) * 2.4;
    world.setAttribute('transform', `translate(${(shx + wdx).toFixed(1)} ${(shy + wdy).toFixed(1)})`);

    // 英雄表情切换 helper
    function setFace(hero, mode) {
      show(hero.eyesNormal, mode !== 'spiral');
      show(hero.eyesSpiral, mode === 'spiral');
      show(hero.mouthWince, mode === 'wince' || mode === 'normal');
      show(hero.mouthSmile, mode === 'smile');
      show(hero.mouthO, mode === 'dizzy');
    }

    // ============ 封面 0–2.4 ============
    if (t < T.segHero) {
      show(gCover, true);
      const p = clamp((t - T.splashBoom) / 0.3, 0, 1);
      // 黄星炸 punch 1→1.35→1（burst polygon 本地原点为心，直接 translate+scale）
      let sc;
      if (t < T.splashBoom) sc = 0.2;
      else { const dt = (t - T.splashBoom); sc = dt < 0.12 ? lerp(1, 1.35, dt / 0.12) : lerp(1.35, 1, (dt - 0.12) / 0.18); }
      coverBurst.setAttribute('transform', `translate(${CX} ${CY}) scale(${sc.toFixed(3)})`);
      coverTitle.setAttribute('opacity', smooth(T.titleIn, T.titleIn + 0.3, t));
      coverSub.setAttribute('opacity', smooth(T.titleIn + 0.2, T.titleIn + 0.5, t));
      coverVol.setAttribute('opacity', smooth(T.volIn, T.volIn + 0.3, t));
      setFace(coverHero, 'wince');
    }

    // ============ 段2 难受 2.4–5.4 ============
    else if (t < T.segR1) {
      show(gHero, true);
      setFace(heroMain, 'wince');
      const bobY = 12 * Math.sin((frame / 12) * P);
      heroMain.g.setAttribute('transform', `translate(760 ${640 + bobY.toFixed(1)}) scale(${beatPulse.toFixed(3)})`);
      // 怪从右下角探出，呼吸
      const mp = smooth(T.segHero, T.segHero + 0.8, t);
      heroMonster.g.setAttribute('transform', `translate(1420 760) scale(${(0.4 + 0.15 * mp) * beatPulse})`);
      // 思想泡弹出 scale 0→1（2帧）
      const tp = clamp((t - T.thinkIn) / 0.08, 0, 1);
      think.setAttribute('transform', `translate(1330 330) scale(${backOut(tp)}) translate(-1330 -330)`);
      think.setAttribute('opacity', tp);
    }

    // ============ 段3 红胶囊 POW 5.4–9.0 ============
    else if (t < T.segR2) {
      show(gR1, true);
      setFace(r1Hero, 'wince');
      // 胶囊掉落
      let capY = -500;
      if (t >= T.capDrop) {
        const cp = clamp((t - T.capDrop) / (T.capFall - T.capDrop), 0, 1);
        capY = lerp(-400, 250, easeOutCubic(cp));
      }
      const swallowed = t >= T.swallow;
      r1Cap.setAttribute('opacity', swallowed ? 0 : 1);
      r1Cap.setAttribute('transform', `translate(1050 ${capY})`);
      // POW punch
      const pp = clamp((t - T.pow) / 0.3, 0, 1);
      let psc = 0;
      if (t >= T.pow) psc = pp < 0.15 ? lerp(1, 1.35, pp / 0.15) : lerp(1.35, 1, (pp - 0.15) / 0.15);
      r1Pow.setAttribute('opacity', t >= T.pow ? (1 - smooth(T.pow + 0.5, T.segR2, t)) : 0);
      r1Pow.setAttribute('transform', `translate(1180 360) scale(${psc.toFixed(3)})`);
      // 爽气泡
      const sp = clamp((t - T.shuangBubble) / 0.08, 0, 1);
      r1Shuang.setAttribute('transform', `translate(1330 640) scale(${backOut(sp)}) translate(-1330 -640)`);
      r1Shuang.setAttribute('opacity', sp);
      // 爽表情
      setFace(r1Hero, t >= T.pow ? 'smile' : 'wince');
      // 手机UI脉冲（红点/播放）
      r1Phone.setAttribute('opacity', 0.6 + 0.4 * h(frame * 0.5));
    }

    // ============ 段4 黄丸 WHAM 9.0–12.6 ============
    else if (t < T.segR3) {
      show(gR2, true);
      setFace(r2Hero, 'smile');
      // 黄丸大一号，砸下
      const wp = clamp((t - T.segR2) / 0.4, 0, 1);
      r2Pill.setAttribute('transform', `translate(1390 ${lerp(-400, 560, easeOutCubic(wp))})`);
      const pp = clamp((t - T.wham) / 0.3, 0, 1);
      let psc = 0;
      if (t >= T.wham) psc = pp < 0.15 ? lerp(1, 1.35, pp / 0.15) : lerp(1.35, 1, (pp - 0.15) / 0.15);
      r2Wham.setAttribute('opacity', t >= T.wham ? (1 - smooth(T.wham + 0.5, T.segR3, t)) : 0);
      r2Wham.setAttribute('transform', `translate(1390 360) scale(${psc.toFixed(3)})`);
      const b1 = clamp((t - T.vlogBubble1) / 0.08, 0, 1);
      r2Bub1.setAttribute('transform', `translate(1380 640) scale(${backOut(b1)}) translate(-1380 -640)`);
      r2Bub1.setAttribute('opacity', b1);
      const b2 = clamp((t - T.vlogBubble2) / 0.08, 0, 1);
      r2Bub2.setAttribute('transform', `translate(560 300) scale(${backOut(b2)}) translate(-560 -300)`);
      r2Bub2.setAttribute('opacity', b2);
      // 怪从缝里探回
      r2Monster.g.setAttribute('transform', `translate(1820 900) scale(${(0.5 + 0.3 * smooth(T.monsterPeek, T.monsterPeek + 0.5, t)) * beatPulse})`);
    }

    // ============ 段5 蓝巨丸 BAM 12.6–16.2 ============
    else if (t < T.segR4) {
      show(gR3, true);
      setFace(r3Hero, t >= T.bam ? 'dizzy' : 'smile');
      r3Pill.setAttribute('transform', `translate(1280 560) scale(${(0.5 + 0.5 * smooth(T.segR3, T.bam, t))})`);
      const pp = clamp((t - T.bam) / 0.3, 0, 1);
      let psc = 0;
      if (t >= T.bam) psc = pp < 0.15 ? lerp(1, 1.35, pp / 0.15) : lerp(1.35, 1, (pp - 0.15) / 0.15);
      r3Bam.setAttribute('opacity', t >= T.bam ? (1 - smooth(T.bam + 0.5, T.segR4, t)) : 0);
      r3Bam.setAttribute('transform', `translate(1330 320) scale(${psc.toFixed(3)})`);
      const bp = clamp((t - T.allnight1) / 0.08, 0, 1);
      r3Bub.setAttribute('transform', `translate(1330 620) scale(${backOut(bp)}) translate(-1330 -620)`);
      r3Bub.setAttribute('opacity', bp);
      // 低电量红灯闪
      batt.setAttribute('opacity', t >= T.lowBattery ? (0.5 + 0.5 * (Math.floor(frame / 6) % 2)) : 0);
    }

    // ============ 段6 整屏 KAPOW 16.2–19.8 ============
    else if (t < T.segDoc) {
      show(gR4, true);
      // 手机砸出：从右飞入
      const sp = clamp((t - T.phoneSlam) / 0.6, 0, 1);
      r4Phone.setAttribute('transform', `translate(${lerp(2400, 960, easeOutCubic(sp))} 520) rotate(${lerp(25, -8, sp)})`);
      const pp = clamp((t - T.kapow) / 0.35, 0, 1);
      let psc = 0;
      if (t >= T.kapow) psc = pp < 0.15 ? lerp(1, 1.35, pp / 0.15) : lerp(1.35, 1, (pp - 0.15) / 0.2);
      r4Kapow.setAttribute('opacity', t >= T.kapow ? 1 : 0);
      r4Kapow.setAttribute('transform', `translate(960 360) scale(${psc.toFixed(3)})`);
      // 怪被炸成网点重拼更大
      const mg = t < T.kapow ? 0.3 : smooth(T.kapow, T.monsterGrow, t) * 1.6;
      r4Monster.g.setAttribute('transform', `translate(1400 780) scale(${mg * beatPulse})`);
      doseMaxTag.setAttribute('opacity', smooth(T.doseMax, T.doseMax + 0.3, t));
      worseTxt.setAttribute('opacity', smooth(T.worseWord, T.worseWord + 0.4, t));
    }

    // ============ 段7 医生处方 19.8–23.4（配乐急停） ============
    else if (t < T.segDown) {
      show(gDoc, true);
      doctor.setAttribute('opacity', smooth(T.doctorIn, T.doctorIn + 0.4, t));
      // 处方纸被推出
      const pp = smooth(T.paperPush, T.paperPush + 0.6, t);
      scriptPaper.setAttribute('transform', `translate(${lerp(1800, 0, pp)} 0)`);
    }

    // ============ 段8 放下手机 23.4–27.0 ============
    else if (t < T.segOut) {
      show(gDown, true);
      setFace(downHero, 'normal');
      // 手机慢慢放下
      const lp = smooth(T.lowerPhone, T.lowerPhone + 1.2, t);
      downPhone.setAttribute('transform', `translate(0 ${lp * 200}) rotate(${lp * 18})`);
      // 红点脉冲
      redDot.setAttribute('opacity', t >= T.redDot ? (0.4 + 0.6 * (Math.floor(frame / 8) % 2)) : 0);
      // 手机渐暗
      downPhone.setAttribute('opacity', 1 - 0.5 * lp);
      // 怪缩成蓝网点
      const ms = lerp(1.0, 0.15, smooth(T.monsterShrink, T.monsterShrink + 1.2, t));
      downMonster.g.setAttribute('transform', `translate(1450 720) scale(${ms})`);
    }

    // ============ 段9 走出 + 旁白框 27.0–30 ============
    else {
      show(gOut, true);
      setFace(outHero, 'normal');
      // 侠走出格，向左走
      const wp = smooth(T.walkOut, T.walkOut + 1.4, t);
      outHero.g.setAttribute('transform', `translate(${lerp(700, 260, wp)} 720)`);
      narrBox.setAttribute('opacity', smooth(T.narratorBox, T.narratorBox + 0.4, t));
      egg.setAttribute('opacity', smooth(T.easterEgg, T.easterEgg + 0.3, t));
      signText.setAttribute('opacity', smooth(T.signoff, T.signoff + 0.4, t));
    }

  }

  window.render = render;
  render(0);
})();
