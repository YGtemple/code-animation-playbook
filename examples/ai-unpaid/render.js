// render.js —— 《AI 不能欠薪》等距3D isometric。纯函数 render(t)，加载时建一次。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2;
  const { T } = window;

  // ---------- 确定性哈希 / 缓动 ----------
  const h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = (a, b, x) => { const p = clamp((x - a) / (b - a), 0, 1); return p * p * (3 - 2 * p); };
  const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
  const backOut = p => { const c = 1.70158, s = 1.0; p -= 1; return s * p * p * ((c + 1) * p + c) + 1; };

  // ---------- 色板 ----------
  const BG = '#1B1E26';
  const HUMAN = '#E8833A';
  const AI = '#39C5D6';
  const BILL = '#E4574D';
  const PAPER = '#F2F0EA';
  const GOLD = '#D9A441';
  const GRAY = '#6B7280';
  const ISLAND = '#272C38';
  const ISLAND_D = '#1E222C';
  const GRID = 'rgba(242,240,234,0.07)';
  const SHADOW = 'rgba(0,0,0,0.26)';

  function shade(hex, f) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const c = v => clamp(Math.round(v * f), 0, 255);
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }

  // ---------- 等距投影 ----------
  const UW = 58, UH = 29, HZ = 60;
  const OX = 902, OY = 560;
  function iso(gx, gy, gz) { return [OX + (gx - gy) * UW, OY + (gx + gy) * UH - gz * HZ]; }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(e, s) { e.textContent = s; }
  function show(g, v) { g.setAttribute('display', v ? '' : 'none'); }
  function poly(pts, fill, parent, extra) {
    const p = el('polygon', Object.assign({ points: pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' '), fill }, extra || {}), parent);
    return p;
  }

  const stage = document.getElementById('stage');
  const defs = el('defs', {}, stage);
  // 软阴影模糊 2px
  const soft = el('filter', { id: 'soft', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
  el('feGaussianBlur', { stdDeviation: 2 }, soft);

  const world = el('g', { id: 'world' }, stage);
  el('rect', { x: -40, y: -40, width: W + 80, height: H + 80, fill: BG }, world);

  // ================= 工位岛（扁长方体地板，静态） =================
  const gIsland = el('g', {}, world);
  (function buildIsland() {
    const ix0 = 0, ix1 = 6, iy0 = 0, iy1 = 4, z0 = -0.5, z1 = 0;
    // 侧面
    poly([iso(ix1, iy0, z1), iso(ix1, iy1, z1), iso(ix1, iy1, z0), iso(ix1, iy0, z0)], shade(ISLAND, 0.82), gIsland);
    poly([iso(ix0, iy1, z1), iso(ix1, iy1, z1), iso(ix1, iy1, z0), iso(ix0, iy1, z0)], shade(ISLAND, 0.9), gIsland);
    // 顶面
    poly([iso(ix0, iy0, z1), iso(ix1, iy0, z1), iso(ix1, iy1, z1), iso(ix0, iy1, z1)], ISLAND, gIsland);
    // 地板网格线
    for (let i = 1; i < 6; i++) el('line', { x1: iso(i, iy0, 0)[0], y1: iso(i, iy0, 0)[1], x2: iso(i, iy1, 0)[0], y2: iso(i, iy1, 0)[1], stroke: GRID, 'stroke-width': 1.5 }, gIsland);
    for (let j = 1; j < 4; j++) el('line', { x1: iso(ix0, j, 0)[0], y1: iso(ix0, j, 0)[1], x2: iso(ix1, j, 0)[0], y2: iso(ix1, j, 0)[1], stroke: GRID, 'stroke-width': 1.5 }, gIsland);
  })();
  // 岛灯（中央暖光，R4 暗一半）
  const islandGlow = el('ellipse', { cx: iso(3.6, 2.1, 0)[0], cy: iso(3.6, 2.1, 0)[1], rx: 210, ry: 95, fill: 'rgba(232,131,58,0.07)' }, gIsland);
  // R4 压暗遮罩
  const islandDim = el('polygon', { points: [iso(0,0,0), iso(6,0,0), iso(6,4,0), iso(0,4,0)].map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' '), fill: 'rgba(10,12,18,0.0)' }, gIsland);

  // ================= 等距块体构造器 =================
  // 返回 {g, top, fx, fy}，本地坐标 footprint 居中、z=0 落地。
  function buildBlock(parent, w, d, h, color, opts) {
    opts = opts || {};
    const g = el('g', {}, parent);
    const x0 = -w / 2, x1 = w / 2, y0 = -d / 2, y1 = d / 2;
    const L = (lx, ly, lz) => [(lx - ly) * UW, (lx + ly) * UH - lz * HZ];
    // 落地软影（仅落地块体；空中堆叠块不投地影）
    if (opts.shadow !== false) el('ellipse', { cx: 16, cy: 20, rx: w * UW * 0.62, ry: w * UH * 0.62, fill: SHADOW, filter: 'url(#soft)' }, g);
    // 三面：左/右/顶
    const fy = poly([L(x0, y1, h), L(x1, y1, h), L(x1, y1, 0), L(x0, y1, 0)], shade(color, 0.9), g);
    const fx = poly([L(x1, y0, h), L(x1, y1, h), L(x1, y1, 0), L(x1, y0, 0)], shade(color, 0.8), g);
    const top = poly([L(x0, y0, h), L(x1, y0, h), L(x1, y1, h), L(x0, y1, h)], shade(color, 1.13), g);
    const handles = { g, top, fx, fy, _color: color, recolor(c) { this._color = c; this.fy.setAttribute('fill', shade(c, 0.9)); this.fx.setAttribute('fill', shade(c, 0.8)); this.top.setAttribute('fill', shade(c, 1.13)); } };
    // 两点眼（跨前角）
    if (opts.eyes) {
      const eR = L(x1, y1 - 0.12, h * 0.62);
      const eL = L(x1 - 0.12, y1, h * 0.62);
      el('circle', { cx: eR[0], cy: eR[1], r: 8, fill: BG }, g);
      el('circle', { cx: eL[0], cy: eL[1], r: 8, fill: BG }, g);
    }
    return handles;
  }
  function placeBlock(b, gx, gy, gz) { const p = iso(gx, gy, gz); b.g.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`); }

  // ---- 人类块（暖橙） ----
  const human = buildBlock(world, 1.25, 1.25, 1.35, HUMAN, { eyes: true });
  // ---- AI 块（电子青） ----
  const ai = buildBlock(world, 1.25, 1.25, 1.35, AI, { eyes: true });
  // AI 顶 ◉
  const eyeG = el('g', {}, ai.g);
  el('circle', { cx: 0, cy: -1.35 * HZ, r: 26, fill: 'none', stroke: AI, 'stroke-width': 6 }, eyeG);
  el('circle', { cx: 0, cy: -1.35 * HZ, r: 9, fill: AI }, eyeG);
  // ---- 效率塔额外两层 ----
  const tower = [buildBlock(world, 1.35, 1.35, 0.72, AI, { shadow: false }), buildBlock(world, 1.35, 1.35, 0.72, AI, { shadow: false })];

  // ---- 红账单块（摞高） ----
  const bills = [];
  for (let i = 0; i < 5; i++) {
    const b = buildBlock(world, 1.7, 1.25, 0.22, BILL, { shadow: false });
    const y = el('text', { x: 0, y: -0.22 * HZ + 8, 'text-anchor': 'middle', 'font-family': 'NUM', 'font-size': 34, fill: PAPER }, b.g);
    txt(y, '¥');
    bills.push(b);
  }

  // ---- 咖啡杯（小圆柱，留在桌上） ----
  const coffee = el('g', {}, world);
  el('ellipse', { cx: 16, cy: 20, rx: 30, ry: 14, fill: SHADOW, filter: 'url(#soft)' }, coffee);
  el('path', { d: 'M-22 -4 L22 -4 L18 -46 L-18 -46 Z', fill: PAPER }, coffee);
  el('ellipse', { cx: 0, cy: -46, rx: 19, ry: 7, fill: shade(PAPER, 0.85) }, coffee);
  el('path', { d: 'M22 -38 Q40 -34 30 -20 Q26 -14 20 -16', fill: 'none', stroke: PAPER, 'stroke-width': 5 }, coffee);

  // ---- 工牌（白底小矩形+挂绳） ----
  const badge = el('g', {}, world);
  el('line', { x1: 0, y1: -120, x2: 0, y2: -40, stroke: PAPER, 'stroke-width': 4 }, badge);
  el('rect', { x: -34, y: -40, width: 68, height: 84, rx: 6, fill: PAPER }, badge);
  el('rect', { x: -24, y: -28, width: 48, height: 12, fill: AI }, badge);
  el('circle', { cx: -10, cy: 4, r: 9, fill: HUMAN }, badge);
  el('rect', { x: 6, y: -2, width: 20, height: 5, fill: '#9aa0ab' }, badge);

  // ---- 招聘牌（白底立牌带+） ----
  const sign = el('g', {}, world);
  el('ellipse', { cx: 14, cy: 22, rx: 70, ry: 26, fill: SHADOW, filter: 'url(#soft)' }, sign);
  el('rect', { x: -70, y: -150, width: 140, height: 120, rx: 8, fill: PAPER }, sign);
  el('line', { x1: 0, y1: -30, x2: 0, y2: 0, stroke: PAPER, 'stroke-width': 8 }, sign);
  el('text', { x: 0, y: -108, 'text-anchor': 'middle', 'font-family': 'SC', 'font-weight': 900, 'font-size': 40, fill: BG }, sign).textContent = '招聘';
  el('text', { x: 0, y: -60, 'text-anchor': 'middle', 'font-family': 'NUM', 'font-size': 56, fill: HUMAN }, sign).textContent = '+';

  // ---- 印章（红=优化 / 金=招聘中） ----
  function buildStamp(color, label) {
    const g = el('g', {}, world);
    el('circle', { cx: 0, cy: 0, r: 86, fill: 'none', stroke: color, 'stroke-width': 9 }, g);
    el('circle', { cx: 0, cy: 0, r: 66, fill: 'none', stroke: color, 'stroke-width': 3 }, g);
    el('text', { x: 0, y: 14, 'text-anchor': 'middle', 'font-family': 'SC', 'font-weight': 900, 'font-size': 46, fill: color }, g).textContent = label;
    return g;
  }
  const stampRed = buildStamp(BILL, '优化');
  const stampGold = buildStamp(GOLD, '招聘中');

  // ---- 光标箭头（最后点牌子） ----
  const cursor = el('path', { d: 'M0 0 L0 44 L11 33 L18 49 L24 47 L17 32 L33 32 Z', fill: PAPER, stroke: BG, 'stroke-width': 2, 'stroke-linejoin': 'round' }, world);

  // ================= HUD（屏幕空间） =================
  // Token 计数器：转盘 + 数字
  const gHud = el('g', {}, stage);
  el('rect', { x: 1330, y: 150, width: 500, height: 360, rx: 18, fill: 'rgba(242,240,234,0.05)', stroke: 'rgba(242,240,234,0.18)', 'stroke-width': 2 }, gHud);
  const dial = el('g', { transform: 'translate(1580 300)' }, gHud);
  el('circle', { cx: 0, cy: 0, r: 92, fill: 'none', stroke: 'rgba(242,240,234,0.25)', 'stroke-width': 10 }, dial);
  const dialTicks = el('g', {}, dial);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    el('line', { x1: Math.cos(a) * 70, y1: Math.sin(a) * 70, x2: Math.cos(a) * 86, y2: Math.sin(a) * 86, stroke: AI, 'stroke-width': i % 6 === 0 ? 9 : 5 }, dialTicks);
  }
  el('circle', { cx: 0, cy: 0, r: 16, fill: AI }, dial);
  const hudLabel = el('text', { x: 1580, y: 500, 'text-anchor': 'middle', 'font-family': 'NUM', 'font-size': 30, fill: 'rgba(242,240,234,0.6)' }, gHud);
  txt(hudLabel, 'TOKEN');
  const hudVal = el('text', { x: 1580, y: 470, 'text-anchor': 'middle', 'font-family': 'NUM', 'font-weight': 900, 'font-size': 54, fill: PAPER }, gHud);
  txt(hudVal, 'READY');

  // ---- 片名 / 署名 ----
  const title = el('text', { x: CX, y: 128, 'text-anchor': 'middle', 'font-family': 'SC', 'font-weight': 900, 'font-size': 84, fill: PAPER }, world);
  txt(title, 'AI 不能欠薪');
  const credit = el('text', { x: CX, y: 1022, 'text-anchor': 'middle', 'font-family': 'SC', 'font-weight': 900, 'font-size': 46, fill: PAPER }, stage);
  txt(credit, '由 Doubao 在30秒内用纯代码制作完成');

  // ================= 主渲染 =================
  function render(t0) {
    const t = t0;
    const frame = Math.round(t * T.fps);

    // 默认隐藏动态件
    show(human.g, false); show(ai.g, false);
    tower.forEach(b => show(b.g, false));
    bills.forEach(b => show(b.g, false));
    show(coffee, false); show(badge, false); show(sign, false);
    show(stampRed, false); show(stampGold, false); show(cursor, false);
    show(eyeG, false);

    // 转盘恒转（连续运动，杜绝死帧）：常速 1.6 rev/s，R2/R3 加速
    const spinSpeed = (t >= T.counterSpin && t < T.counterYen) ? 9.0 : (t >= T.counterYen && t < T.counterStop ? 12.0 : 1.6);
    dialTicks.setAttribute('transform', `rotate(${(t * spinSpeed * 57.3) % 360})`);

    // ---------- 片名 ----------
    const tp = smooth(T.titleIn, T.titleIn + 0.4, t);
    title.setAttribute('opacity', clamp(tp, 0, 1) * (t < 4.4 ? 1 : 0));

    // ---------- 咖啡杯：全程留在原位 ----------
    show(coffee, t > 0.6);
    placeBlock({ g: coffee }, 5.1, 3.0, 0);

    // =====================================================
    // 0–3 钩子
    // =====================================================
    // 人类块站在工位上
    if (t < T.humanGone) {
      show(human.g, true);
      placeBlock(human, 1.7, 2.7, 0);
    }
    // 工牌落地
    if (t >= T.badgeDrop - 0.4 && t < T.humanGone + 0.2) {
      show(badge, true);
      const bp = clamp((t - (T.badgeDrop - 0.4)) / 0.4, 0, 1);
      const landY = backOut(bp);
      const p = iso(1.7, 2.7, 0);
      badge.setAttribute('transform', `translate(${p[0]} ${p[1] - (1 - landY) * 300})`);
    }
    // 青块从右侧滑入占岛中央
    if (t >= 1.2) {
      show(ai.g, true);
      const sp = clamp((t - T.aiSlideIn) / (T.aiArrive - T.aiSlideIn), 0, 1);
      const gx = lerp(6.4, 3.6, easeOutCubic(sp));
      placeBlock(ai, gx, 2.1, 0);
      show(eyeG, t >= T.eyeLit && t < 8.0);
    }
    // 红章"优化"盖下（仅钩子时窗 2.15–3.4）
    if (t >= T.sealOptimize - 0.3 && t < 3.4) {
      show(stampRed, true);
      const sp2 = backOut(clamp((t - (T.sealOptimize - 0.3)) / 0.3, 0, 1));
      const rs = 0.6 + 0.4 * clamp(sp2, 0, 1);
      const cp0 = iso(3.6, 2.1, 0);
      stampRed.setAttribute('transform', `translate(${cp0[0]} ${cp0[1] - 60 - (1 - clamp(sp2,0,1)) * 320}) rotate(-10) scale(${rs.toFixed(2)})`);
    }

    // =====================================================
    // R1 3–8：人类被推下岛消失
    // =====================================================
    if (t >= 3.0 && t < 8.0) {
      if (t < T.humanGone) {
        show(human.g, true);
        const pp = clamp((t - T.humanPush) / (T.humanGone - T.humanPush), 0, 1);
        const gx = lerp(1.7, -1.2, easeOutCubic(pp));
        placeBlock(human, gx, 2.7, 0);
        human.g.setAttribute('opacity', 1 - pp);
      }
      // 青块滑到正中 + ◉
      show(ai.g, true);
      const cp = clamp((t - T.aiCenter) / 0.4, 0, 1);
      const gx = lerp(3.6, 3.6, easeOutCubic(cp));
      placeBlock(ai, gx, 2.1, 0);
      show(eyeG, t >= T.eyeLit);
      // 咖啡杯留原位
    }

    // =====================================================
    // R2 8–14：堆成3层效率塔
    // =====================================================
    if (t >= 8.0 && t < 14.0) {
      show(ai.g, true); placeBlock(ai, 3.6, 2.1, 0);
      show(eyeG, false);
      tower.forEach((b, i) => {
        const tt = T['tower' + (i + 1)];
        if (t >= tt - 0.35) {
          show(b.g, true);
          const bp = backOut(clamp((t - (tt - 0.35)) / 0.35, 0, 1));
          const rise = (1 - clamp(bp, 0, 1)) * 3;
          placeBlock(b, 3.6, 2.1, 1.35 + i * 0.72 + rise);
        }
      });
      // 计数器：效率从 120% 一路跳到 +400%
      const climb = smooth(8.2, T.effJump, t);
      txt(hudVal, t >= T.effJump ? '效率 +400%' : '效率 ' + Math.round(120 + climb * 280) + '%');
      hudVal.setAttribute('fill', PAPER);
    }

    // =====================================================
    // R3 14–20：红账单块摞高，转盘¥飙升
    // =====================================================
    if (t >= 14.0 && t < 20.0) {
      show(ai.g, true); placeBlock(ai, 3.6, 2.1, 0);
      tower.forEach(b => show(b.g, true));
      tower[0] && placeBlock(tower[0], 3.6, 2.1, 1.35);
      tower[1] && placeBlock(tower[1], 3.6, 2.1, 2.07);
      bills.forEach((b, i) => {
        const bt = T.billStart + i * T.billStep;
        if (t >= bt - 0.5) {
          show(b.g, true);
          const bp = clamp((t - (bt - 0.5)) / 0.5, 0, 1);
          const landZ = 2.9 + i * 0.34;
          const rise = (1 - easeOutCubic(bp)) * 5;
          placeBlock(b, 3.6, 2.1, landZ + rise);
        }
      });
      // 计数器翻 ¥ 飙升
      const yp = clamp((t - T.counterYen) / 3.5, 0, 1);
      const yen = Math.round(1200 + yp * 8600);
      txt(hudVal, t >= T.counterYen ? '¥' + yen : '效率 +400%');
      hudVal.setAttribute('fill', t >= T.counterYen ? BILL : PAPER);
    }

    // =====================================================
    // R4 20–25：青块变灰 / 塔散架 / 欠费 / 岛灯暗
    // =====================================================
    if (t >= 20.0 && t < 25.0) {
      show(ai.g, true);
      const gyp = clamp((t - T.aiGray) / 0.3, 0, 1);
      placeBlock(ai, 3.6, 2.1, 0);
      if (gyp >= 1) ai.recolor(GRAY);
      // 塔哗啦散架
      tower.forEach((b, i) => {
        show(b.g, true);
        const cp = clamp((t - T.towerCollapse) / (T.towerDown - T.towerCollapse), 0, 1);
        const dir = i === 0 ? -1 : 1;
        const gx = lerp(3.6, 3.6 + dir * 1.6, easeOutCubic(cp));
        const gz = lerp(1.35 + i * 0.72, 0.1, easeOutCubic(cp));
        b.g.setAttribute('transform', `translate(${iso(gx, 2.1, gz)[0].toFixed(1)} ${iso(gx, 2.1, gz)[1].toFixed(1)}) rotate(${(dir * cp * 55).toFixed(1)})`);
        if (cp >= 1) b.recolor(GRAY);
      });
      // 账单块保留在上方
      bills.forEach((b, i) => { show(b.g, true); placeBlock(b, 3.6, 2.1, 2.9 + i * 0.34); });
      // 岛灯暗一半
      islandDim.setAttribute('fill', `rgba(10,12,18,${(0.5 * smooth(T.islandDim, T.islandDim + 0.6, t)).toFixed(3)})`);
      islandGlow.setAttribute('opacity', (1 - 0.5 * smooth(T.islandDim, T.islandDim + 0.6, t)).toFixed(3));
      // 转盘停"欠费"
      if (t >= T.counterStop) { txt(hudVal, '欠费'); hudVal.setAttribute('fill', BILL); }
    } else {
      islandDim.setAttribute('fill', 'rgba(10,12,18,0)');
      islandGlow.setAttribute('opacity', '1');
      if (t < 20 || t >= 25) { ai.recolor(AI); tower.forEach(b => b.recolor(AI)); }
    }

    // =====================================================
    // 反转 25–29：光标点招聘牌 / 橙人探回 / 金章
    // =====================================================
    if (t >= 25.0 && t < 29.0) {
      // 账单块淡出
      bills.forEach(b => { show(b.g, false); });
      // 灰 AI 退场（散架的层也收走）
      tower.forEach(b => show(b.g, false));
      show(ai.g, false);
      // 招聘牌立回
      show(sign, true);
      const sp2 = backOut(clamp((t - T.signUp) / 0.4, 0, 1));
      const p = iso(3.6, 2.1, 0);
      sign.setAttribute('transform', `translate(${p[0]} ${p[1] - (1 - clamp(sp2,0,1)) * 260})`);
      // 光标移入 + 点
      show(cursor, true);
      const cpx = lerp(1300, p[0] + 60, smooth(T.cursorIn, T.cursorClick, t));
      const cpy = lerp(880, p[1] - 90, smooth(T.cursorIn, T.cursorClick, t));
      cursor.setAttribute('transform', `translate(${cpx} ${cpy})`);
      // 橙人从边缘探回，端咖啡
      if (t >= T.humanPeek) {
        show(human.g, true);
        const hp = clamp((t - T.humanPeek) / 0.6, 0, 1);
        human.recolor(HUMAN);
        placeBlock(human, lerp(0.2, 1.7, easeOutCubic(hp)), 2.7, 0);
      }
      // 咖啡端起
      show(coffee, true);
      const ck = clamp((t - T.coffeePick) / 0.4, 0, 1);
      coffee.setAttribute('transform', `translate(${(iso(1.7,2.7,0)[0]+30)} ${(iso(1.7,2.7,0)[1] - 30 - ck * 40)})`);
      txt(hudVal, t >= T.counterStop ? '欠费' : 'READY');
      hudVal.setAttribute('fill', BILL);
    }

    // 金章"招聘中"盖下（27.0 起，持续到定格）
    if (t >= T.sealHire - 0.3) {
      show(stampGold, true);
      const sp3 = backOut(clamp((t - (T.sealHire - 0.3)) / 0.3, 0, 1));
      const gs = 0.6 + 0.4 * clamp(sp3, 0, 1);
      const gp = iso(5.0, 1.4, 0);
      stampGold.setAttribute('transform', `translate(${gp[0]} ${gp[1] - (1 - clamp(sp3,0,1)) * 300}) rotate(8) scale(${gs.toFixed(2)})`);
    }

    // =====================================================
    // 29–30 定格：招聘牌+橙人+咖啡同框
    // =====================================================
    if (t >= 29.0) {
      show(sign, true); placeBlock({ g: sign }, 3.6, 2.1, 0);
      show(human.g, true); human.recolor(HUMAN); placeBlock(human, 1.7, 2.7, 0);
      show(coffee, true); coffee.setAttribute('transform', `translate(${(iso(1.7,2.7,0)[0]+30)} ${(iso(1.7,2.7,0)[1]-70)})`);
      cursor.setAttribute('opacity', '0');
    } else { cursor.setAttribute('opacity', '1'); }

    // 署名
    const cp2 = smooth(T.creditIn, T.creditIn + 0.25, t);
    credit.setAttribute('opacity', cp2);

    // ---- 黑场：仅前 0.12s 从黑淡入 ----
    let bf = 1 - smooth(0, 0.12, t0);
    if (bf > 0.001) {
      let blk = stage.querySelector('#blackfade');
      if (!blk) { blk = el('rect', { id: 'blackfade', x: 0, y: 0, width: W, height: H, fill: '#000' }, stage); }
      blk.setAttribute('opacity', clamp(bf, 0, 1));
    } else {
      let blk = stage.querySelector('#blackfade');
      if (blk) blk.setAttribute('opacity', '0');
    }
  }

  window.render = render;
  render(0);
})();
