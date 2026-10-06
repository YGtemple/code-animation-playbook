// render.js ——《第14号·人体开机自检报告》黑白默片。加载时一次建全部元素；纯函数 render(t) 出帧。
// 铁律：同一 t 必出同一帧；无 Math.random/异步；随机走帧号哈希。胶片颗粒/划痕/暗角/抖动/闪烁由 Python filmify 统一加。
(function () {
  const svg = document.getElementById('stage');
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 960, CY = 540;

  // ---- 调色（中性灰阶，交给 filmify 做 Rec.601 + S 曲线）----
  const PAPER = '#ece5d3';   // 米白纸底
  const INK = '#16130f';     // 近黑墨
  const CARD = '#0a0a0a';    // 插卡黑底
  const CREAM = '#ece5d3';   // 插卡字色
  const MID = '#6f6a62';     // 中灰

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, str, attrs) {
    const e = el('text', Object.assign({ x, y, 'text-anchor': 'middle' }, attrs), parent);
    e.textContent = str;
    return e;
  }

  // ---- 缓动 / 哈希 ----
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const ss = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const easeOut = x => { x = clamp01(x); return 1 - Math.pow(1 - x, 3); };
  const backOut = x => { x = clamp01(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ============================================================
  // 建台
  // ============================================================
  const gWorld = el('g', { id: 'world' }, svg);

  // 纸底（放大到屏外，配合 world 缩放不露黑角 P8）
  el('rect', { x: -400, y: -300, width: 2720, height: 1680, fill: PAPER }, gWorld);

  // ---------- 插卡组（黑底硬切） ----------
  function buildCard() {
    const g = el('g', { display: 'none' }, gWorld);
    el('rect', { x: 0, y: 0, width: 1920, height: 1080, fill: CARD }, g);
    return g;
  }
  // 双线框（片头/片尾）
  function doubleFrame(g) {
    el('rect', { x: 96, y: 76, width: 1728, height: 928, fill: 'none', stroke: CREAM, 'stroke-width': 2, opacity: 0.9 }, g);
    el('rect', { x: 118, y: 98, width: 1684, height: 884, fill: 'none', stroke: CREAM, 'stroke-width': 1, opacity: 0.6 }, g);
  }

  // 卡1 片头
  const gC1 = buildCard();
  doubleFrame(gC1);
  txt(gC1, CX, 380, 'No.14', { 'font-family': 'PlayfairF, serif', 'font-size': 78, fill: CREAM, 'letter-spacing': 8 });
  txt(gC1, CX, 560, '人体开机自检报告', { 'font-family': 'SimSun, serif', 'font-weight': 'bold', 'font-size': 92, fill: CREAM, 'letter-spacing': 10 });

  // 卡2
  const gC2 = buildCard();
  txt(gC2, CX, 470, '长假最后一晚', { 'font-family': 'SimSun, serif', 'font-weight': 'bold', 'font-size': 88, fill: CREAM, 'letter-spacing': 10 });
  txt(gC2, CX, 610, '他要开机了', { 'font-family': 'SimSun, serif', 'font-weight': 'bold', 'font-size': 88, fill: CREAM, 'letter-spacing': 10 });

  // 卡3
  const gC3 = buildCard();
  txt(gC3, CX, 470, '开机成功', { 'font-family': 'SimSun, serif', 'font-weight': 'bold', 'font-size': 92, fill: CREAM, 'letter-spacing': 12 });
  txt(gC3, CX, 610, '欢迎回来', { 'font-family': 'SimSun, serif', 'font-weight': 'bold', 'font-size': 92, fill: CREAM, 'letter-spacing': 12 });

  // 卡4 屏幕特写：距下班还有 9 小时 59 分
  const gC4 = buildCard();
  txt(gC4, CX, 430, '距下班还有', { 'font-family': 'SimSun, serif', 'font-weight': 'bold', 'font-size': 76, fill: CREAM, 'letter-spacing': 10 });
  const tC4 = el('text', { x: CX, y: 640, 'text-anchor': 'middle', fill: CREAM, 'font-family': 'PlayfairF, serif', 'font-size': 150, 'letter-spacing': 4 }, gC4);
  tC4.textContent = '9:59';

  // 卡5 片尾 + 署名
  const gC5 = buildCard();
  doubleFrame(gC5);
  txt(gC5, CX, 520, '重启失败。', { 'font-family': 'SimSun, serif', 'font-weight': 'bold', 'font-size': 120, fill: CREAM, 'letter-spacing': 14 });
  txt(gC5, CX, 960, '由 Doubao 在30秒内用纯代码制作完成', { 'font-family': 'SimSun, serif', 'font-size': 34, fill: CREAM, opacity: 0.85, 'letter-spacing': 3 });

  // ---------- 世界场景组（纸底上的戏） ----------
  const gScene = el('g', { display: 'none' }, gWorld);

  // 地面线 + 桌面线
  el('rect', { x: 0, y: 860, width: 1920, height: 2, fill: INK, opacity: 0.35 }, gScene);
  const gDesk = el('g', {}, gScene);
  el('rect', { x: 560, y: 700, width: 800, height: 26, fill: INK }, gDesk);          // 桌面
  el('rect', { x: 600, y: 726, width: 26, height: 180, fill: INK }, gDesk);            // 桌腿
  el('rect', { x: 1294, y: 726, width: 26, height: 180, fill: INK }, gDesk);

  // ===== 小人 rig（局部坐标，原点在两足中心） =====
  const gHero = el('g', {}, gScene);
  // 腿
  const gLegL = el('g', {}, gHero), gLegR = el('g', {}, gHero);
  el('rect', { x: -46, y: 0, width: 26, height: 150, rx: 12, fill: INK }, gLegL);
  el('rect', { x: 20, y: 0, width: 26, height: 150, rx: 12, fill: INK }, gLegR);
  // 身体（西装）
  const gBody = el('g', {}, gHero);
  el('path', { d: 'M -78 -150 Q 0 -180 78 -150 L 92 -10 Q 0 30 -92 -10 Z', fill: INK }, gBody);
  // 领带
  el('path', { d: 'M -8 -150 L 8 -150 L 14 -110 L 0 -96 L -14 -110 Z', fill: PAPER, opacity: 0.9 }, gBody);
  // 手臂
  const gArmL = el('g', {}, gHero), gArmR = el('g', {}, gHero);
  el('rect', { x: -96, y: -158, width: 78, height: 22, rx: 11, fill: INK }, gArmL);
  el('circle', { cx: -100, cy: -147, r: 16, fill: INK }, gArmL);
  el('rect', { x: 18, y: -158, width: 78, height: 22, rx: 11, fill: INK }, gArmR);
  el('circle', { cx: 100, cy: -147, r: 16, fill: INK }, gArmR);
  // 头
  const gHead = el('g', {}, gHero);
  el('circle', { cx: 0, cy: 0, r: 66, fill: PAPER, stroke: INK, 'stroke-width': 6 }, gHead);
  // 炸发（尖刺）
  const gHair = el('g', { fill: INK }, gHead);
  for (let i = -4; i <= 4; i++) {
    const a = Math.PI + (i / 4) * (Math.PI * 0.7);
    const x1 = Math.cos(a) * 60, y1 = Math.sin(a) * 60;
    const x2 = Math.cos(a) * 96, y2 = Math.sin(a) * 96;
    el('path', { d: `M ${x1} ${y1} L ${x2} ${y2 + 8} L ${x1 + 6} ${y1} Z` }, gHair);
  }
  // 眼 / 眉 / 鼻 / 嘴
  const gEyeL = el('ellipse', { cx: -24, cy: -6, rx: 9, ry: 12, fill: INK }, gHead);
  const gEyeR = el('ellipse', { cx: 24, cy: -6, rx: 9, ry: 12, fill: INK }, gHead);
  const gBrowL = el('line', { x1: -38, y1: -34, x2: -12, y2: -28, stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, gHead);
  const gBrowR = el('line', { x1: 12, y1: -28, x2: 38, y2: -34, stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, gHead);
  el('line', { x1: 0, y1: -2, x2: 4, y2: 14, stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, gHead);
  const gMouth = el('path', { d: 'M -16 34 Q 0 44 16 34', fill: 'none', stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, gHead);

  // 火柴棍（R1）
  const gMatch = el('g', { display: 'none' }, gHero);
  el('line', { x1: -90, y1: -40, x2: -30, y2: -12, stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, gMatch);
  el('line', { x1: 90, y1: -40, x2: 30, y2: -12, stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, gMatch);

  // ===== R3 加载饼图 + 沙漏 + 水印 =====
  const gLoad = el('g', { display: 'none' }, gScene);
  const gSpinner = el('g', {}, gLoad);
  el('circle', { cx: 0, cy: 0, r: 46, fill: 'none', stroke: INK, 'stroke-width': 8, opacity: 0.25 }, gSpinner);
  const spinnerArc = el('path', { d: '', fill: 'none', stroke: INK, 'stroke-width': 8, 'stroke-linecap': 'round' }, gSpinner);
  // 沙漏
  const gHour = el('g', {}, gLoad);
  el('path', { d: 'M -26 -50 L 26 -50 L 6 0 L 26 50 L -26 50 L -6 0 Z', fill: 'none', stroke: INK, 'stroke-width': 5 }, gHour);
  el('path', { d: 'M -18 -42 L 18 -42 L 0 -2 Z', fill: INK, opacity: 0.8 }, gHour);
  const gSand = el('path', { d: 'M -10 20 L 10 20 L 0 44 Z', fill: INK }, gHour);
  // 极小水印
  const gMark = el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-family': 'SimSun, serif', 'font-size': 22, fill: MID, opacity: 0.8 }, gLoad);
  gMark.textContent = '前额叶没坏，是累了';

  // ===== R4 魂（幽灵） =====
  const gSoul = el('g', { display: 'none' }, gScene);
  el('path', { d: 'M -50 40 L -50 -30 Q -50 -78 0 -78 Q 50 -78 50 -30 L 50 40 L 32 26 L 14 40 L -2 26 L -18 40 L -34 26 Z', fill: PAPER, stroke: INK, 'stroke-width': 5 }, gSoul);
  el('circle', { cx: -18, cy: -28, r: 7, fill: INK }, gSoul);
  el('circle', { cx: 18, cy: -28, r: 7, fill: INK }, gSoul);

  // ===== R5 老式电表 =====
  const gMeter = el('g', { display: 'none' }, gScene);
  el('circle', { cx: 0, cy: 0, r: 150, fill: PAPER, stroke: INK, 'stroke-width': 8 }, gMeter);
  el('circle', { cx: 0, cy: 0, r: 150, fill: 'none', stroke: INK, 'stroke-width': 2, opacity: 0.4 }, gMeter);
  // 刻度弧
  for (let i = 0; i <= 10; i++) {
    const a = (-130 + i * 26) * Math.PI / 180;
    const x1 = Math.cos(a) * 118, y1 = Math.sin(a) * 118;
    const x2 = Math.cos(a) * (i % 5 === 0 ? 96 : 106), y2 = Math.sin(a) * (i % 5 === 0 ? 96 : 106);
    el('line', { x1, y1, x2, y2, stroke: INK, 'stroke-width': i % 5 === 0 ? 5 : 3 }, gMeter);
  }
  txt(gMeter, 0, 40, '动力', { 'font-family': 'SimSun, serif', 'font-size': 26, fill: MID });
  // 指针
  const gNeedle = el('g', {}, gMeter);
  el('line', { x1: 0, y1: 0, x2: 0, y2: -110, stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, gNeedle);
  el('circle', { cx: 0, cy: 0, r: 12, fill: INK }, gNeedle);
  const meterRead = txt(gMeter, 0, 118, '8', { 'font-family': 'PlayfairF, serif', 'font-size': 40, fill: INK });
  // 小龙虾贴纸
  const gCray = el('g', {}, gMeter);
  el('ellipse', { cx: 70, cy: 96, rx: 26, ry: 12, fill: INK, transform: 'rotate(20 70 96)' }, gCray);
  el('circle', { cx: 96, cy: 104, r: 9, fill: INK }, gCray);
  el('line', { x1: 102, y1: 100, x2: 118, y2: 92, stroke: INK, 'stroke-width': 4 }, gCray);
  el('line', { x1: 102, y1: 108, x2: 118, y2: 116, stroke: INK, 'stroke-width': 4 }, gCray);
  el('path', { d: 'M 46 90 Q 34 82 30 70', fill: 'none', stroke: INK, 'stroke-width': 4 }, gCray);

  // ===== 五灯（开机成功） =====
  const gLights = el('g', { display: 'none' }, gScene);
  const lights = [];
  for (let i = 0; i < 5; i++) {
    const L = el('g', {}, gLights);
    el('circle', { cx: 0, cy: 0, r: 34, fill: PAPER, stroke: INK, 'stroke-width': 6 }, L);
    lights.push(L);
  }

  // ===== 电脑屏幕（坐对电脑） =====
  const gComp = el('g', { display: 'none' }, gScene);
  el('rect', { x: -150, y: -110, width: 300, height: 200, fill: INK }, gComp);
  const gScreen = el('rect', { x: -132, y: -92, width: 264, height: 164, fill: CARD }, gComp);
  el('rect', { x: -30, y: 90, width: 60, height: 20, fill: INK }, gComp);

  // ===== 椅子（翻倒 pratfall） =====
  const gChair = el('g', { display: 'none' }, gScene);
  el('rect', { x: -60, y: 0, width: 120, height: 22, fill: INK }, gChair);       // 座
  el('rect', { x: 50, y: -110, width: 18, height: 110, fill: INK }, gChair);       // 靠背
  el('rect', { x: -40, y: 22, width: 14, height: 150, fill: INK }, gChair);          // 腿
  el('rect', { x: 26, y: 22, width: 14, height: 150, fill: INK }, gChair);

  // ============================================================
  // render(t)
  // ============================================================
  function setDisp(g, on) { g.setAttribute('display', on ? '' : 'none'); }

  // 计算电表指针角：值 0..100 -> -130..+130 度
  function meterAngle(v) { return -130 + (v / 100) * 260; }
  function meterValue(t) {
    if (t < T.punch1) return lerp(T.meterV0, T.meterV0, 1);
    if (t < T.punch2) { const u = easeOut((t - T.punch1) / 0.5); return lerp(T.meterV0, T.meterV1, u); }
    if (t < T.punch3) { const u = easeOut((t - T.punch2) / 0.5); return lerp(T.meterV1, T.meterV1, 1); }
    const u = easeOut((t - T.punch3) / 0.7); return lerp(T.meterV1, T.meterV2, u);
  }

  function render(t) {
    const frame = Math.round(t * T.fps);
    // ---- 插卡显隐（硬切） ----
    const inC1 = t >= T.c1In && t < T.c1Out;
    const inC2 = t >= T.c2In && t < T.c2Out;
    const inC3 = t >= T.c3In && t < T.c3Out;
    const inC4 = t >= T.c4In && t < T.c4Out;
    const inC5 = t >= T.c5In && t < T.c5Out;
    setDisp(gC1, inC1); setDisp(gC2, inC2); setDisp(gC3, inC3); setDisp(gC4, inC4); setDisp(gC5, inC5);

    const anyCard = inC1 || inC2 || inC3 || inC4 || inC5;
    setDisp(gScene, !anyCard);

    // ---- world 冲击缩放（拍表 / 翻倒瞬间轻微推近） ----
    let wscale = 1.0, wtx = 0, wty = 0;
    const punchHit = [T.punch1, T.punch2, T.punch3, T.chairFall].find(pt => Math.abs(t - pt) < 0.12);
    if (punchHit) { const u = 1 - (t - (punchHit)) / 0.12; wscale = 1 + 0.03 * ss(u); }
    gWorld.setAttribute('transform', `translate(${CX + wtx} ${CY + wty}) scale(${wscale}) translate(${-CX} ${-CY})`);

    if (anyCard) return; // 插卡段不动世界

    // ---------------- 世界场景动画 ----------------
    // 小人默认位置：坐在桌后，中心
    const heroX = CX, heroY = 860; // 足心
    let pose = 'sit';
    let gRotate = 0, gScale = 1, hyOff = 0;

    if (t < T.c2In) {
      // 抬头炸发 gag：从趴桌到猛抬头
      const u = ss((t - T.headUp) / 0.35);
      hyOff = lerp(60, 0, u);      // 从趴着（下沉60）弹起
      gRotate = lerp(-10, 0, u);
    } else if (t < T.r1End) {
      // R1 眼皮
      pose = 'r1';
    } else if (t < T.r2End) {
      pose = 'r2';
    } else if (t < T.r3End) {
      pose = 'r3';
    } else if (t < T.r4End) {
      pose = 'r4';
    } else if (t < T.r5End) {
      pose = 'r5';
    } else if (t < T.sitStart) {
      // 五灯段
      pose = 'lights';
    } else if (t < T.c4In) {
      pose = 'sit';
    } else if (t < T.pratStart) {
      pose = 'sit';
    } else {
      // 翻倒
      pose = 'fall';
    }

    gHero.setAttribute('transform', `translate(${heroX} ${heroY + hyOff}) rotate(${gRotate}) scale(${gScale})`);

    // 手臂按场景
    let armLA = 0, armRA = 0;
    if (pose === 'r2') { // 打字：手臂上下快速点
      const k = Math.sin(frame * 0.9);
      armRA = -14 + k * 10; armLA = -14 - k * 10;
    } else if (pose === 'r4') { // 追魂：双臂前扑
      armRA = -50; armLA = -40;
    } else if (pose === 'r5') { // 拍表：右手抡下
      const k = (t > T.punch1 && t < T.punch1 + 0.25) || (t > T.punch2 && t < T.punch2 + 0.25) || (t > T.punch3 && t < T.punch3 + 0.25);
      armRA = k ? 40 : -60;
    } else if (pose === 'fall') {
      armRA = -70; armLA = -70;
    } else { armRA = -8; armLA = -8; }
    gArmL.setAttribute('transform', `rotate(${armLA} -55 -150)`);
    gArmR.setAttribute('transform', `rotate(${armRA} 55 -150)`);

    // 腿
    if (pose === 'fall') { gLegL.setAttribute('transform', 'rotate(30 0 0)'); gLegR.setAttribute('transform', 'rotate(-20 0 0)'); }
    else { gLegL.setAttribute('transform', ''); gLegR.setAttribute('transform', ''); }

    // 火柴棍显隐（R1）
    const showMatch = pose === 'r1' && (t >= T.matchA);
    setDisp(gMatch, showMatch);
    if (pose === 'r1') {
      // 眼皮半睁半闭
      const open = ss((t - T.r1Start) / 0.6);
      gEyeL.setAttribute('ry', lerp(2, 12, open));
      gEyeR.setAttribute('ry', lerp(2, 12, ss((t - T.matchB) / 0.5)));
    } else { gEyeL.setAttribute('ry', 12); gEyeR.setAttribute('ry', 12); }

    // ---- R3 加载 ----
    const r3on = pose === 'r3';
    setDisp(gLoad, r3on);
    if (r3on) {
      gLoad.setAttribute('transform', `translate(${heroX} ${heroY - 320})`);
      const ang = (frame * 9) % 360;
      // 弧段
      const a0 = (ang - 60) * Math.PI / 180, a1 = ang * Math.PI / 180;
      const x0 = Math.cos(a0) * 46, y0 = Math.sin(a0) * 46;
      const x1 = Math.cos(a1) * 46, y1 = Math.sin(a1) * 46;
      spinnerArc.setAttribute('d', `M ${x0} ${y0} A 46 46 0 0 1 ${x1} ${y1}`);
      // 沙漏位置在头右侧
      gHour.setAttribute('transform', 'translate(150 40)');
      // 沙下落随时间
      const su = clamp01((t - T.r3Start) / (T.r3End - T.r3Start));
      gSand.setAttribute('transform', `translate(0 ${lerp(0, -30, su)})`);
      // 水印一闪
      setDisp(gMark, t >= T.watermark && t < T.watermark + 1.2);
    }

    // ---- R4 魂 ----
    const r4on = pose === 'r4';
    setDisp(gSoul, r4on);
    if (r4on) {
      const u = (t - T.soulOut) / (T.r4End - T.soulOut);
      const sx = heroX + Math.sin(u * Math.PI * 2.2) * 320;
      const sy = (heroY - 260) + Math.cos(u * Math.PI * 3.1) * 90;
      const caught = t > T.soulCatch;
      gSoul.setAttribute('transform', `translate(${caught ? heroX : sx} ${caught ? heroY - 230 : sy})`);
      // 他扑向魂：身体微倾
      gHead.setAttribute('transform', `translate(0 -215) rotate(${caught ? 0 : Math.sin(u * 9) * 6})`);
    } else { gHead.setAttribute('transform', 'translate(0 -215)'); }

    // ---- R5 电表 ----
    const r5on = pose === 'r5';
    setDisp(gMeter, r5on);
    if (r5on) {
      gMeter.setAttribute('transform', `translate(${heroX + 330} ${heroY - 300})`);
      const v = meterValue(t);
      gNeedle.setAttribute('transform', `rotate(${meterAngle(v)} 0 0)`);
      meterRead.textContent = String(Math.round(v));
    }

    // ---- 五灯 ----
    const lightsOn = pose === 'lights';
    setDisp(gLights, lightsOn);
    if (lightsOn) {
      gLights.setAttribute('transform', `translate(${CX} ${heroY - 360})`);
      lights.forEach((L, i) => {
        L.setAttribute('transform', `translate(${(i - 2) * 110} 0)`);
        const lit = t > T.lightsStart + i * 0.14;
        L.setAttribute('fill', lit ? INK : PAPER);
      });
    }

    // ---- 电脑（坐对屏幕） ----
    const compOn = (pose === 'sit');
    setDisp(gComp, compOn);
    if (compOn) {
      gComp.setAttribute('transform', `translate(${heroX + 300} ${heroY - 250})`);
      // 屏幕亮起渐变
      const on = ss((t - T.screenOn) / 1.0);
      gScreen.setAttribute('fill', `rgb(${Math.round(lerp(10, 236, on))},${Math.round(lerp(10, 229, on))},${Math.round(lerp(10, 211, on))})`);
    }

    // ---- 椅子（翻倒） ----
    const fallOn = pose === 'fall';
    setDisp(gChair, fallOn);
    if (fallOn) {
      const u = ss((t - T.chairFall) / 0.6);
      gChair.setAttribute('transform', `translate(${heroX} ${heroY}) rotate(${-u * 62})`);
      gHero.setAttribute('transform', `translate(${heroX} ${heroY + hyOff}) rotate(${-u * 55}) scale(${gScale})`);
    }
  }

  window.render = render;
  render(0);
})();
