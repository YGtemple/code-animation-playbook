// render.js —— 第18支《这个月，我要纯过日子》手绘笔记本涂鸦风。
// 铁律：纯函数 render(t)；禁 Math.random/异步；随机走帧号哈希；一次建全部元素。
(function (global) {
  const { T } = global;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const stage = document.getElementById('stage');

  // ---------- 调色板 ----------
  const PAL = {
    paper: '#f7f1e3', line: '#c9d6e8', margin: '#e08a8a',
    ink: '#2b4a6f', red: '#c0392b', pencil: '#5a5a5a',
    sticky: '#f5e6a3', green: '#6a9955', whiteout: '#fffdf6', desk: '#d9d2c2'
  };

  // ---------- 工具 ----------
  function el(name, attrs, parent) {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
  const backOut = x => { x = clamp01(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  // 逐字书写：chars 各自独立 text，p = 已写进度（字数，可小数）
  function makeChars(parent, str, x, y, size, family, color, opts) {
    opts = opts || {};
    const g = el('g', {}, parent);
    const chars = [...str];
    const adv = opts.adv || size * 1.0;
    const nodes = chars.map((ch, i) => {
      const wob = (h(i * 7.3 + (opts.seed || 0)) - 0.5) * 7;   // 基线故意歪斜
      const t = el('text', {
        x: x + i * adv, y: y + wob, 'font-size': size,
        'font-family': family, fill: color, opacity: 0,
        'text-anchor': 'start'
      }, g);
      t.textContent = ch;
      return t;
    });
    return {
      g, nodes, chars,
      set(p) {
        for (let i = 0; i < chars.length; i++) {
          const local = clamp01(p - i);
          nodes[i].setAttribute('opacity', local.toFixed(3));
        }
      }
    };
  }

  // 一笔画出的路径（stroke-dasharray 动画）：返回 set(p) 0..1
  function drawStroke(parent, d, attrs) {
    const p = el('path', Object.assign({
      d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }, attrs), parent);
    p.setAttribute('pathLength', 100);
    p.setAttribute('stroke-dasharray', 100);
    p.setAttribute('stroke-dashoffset', 100);
    return {
      node: p,
      set(q) { p.setAttribute('stroke-dashoffset', (100 * (1 - clamp01(q))).toFixed(2)); }
    };
  }

  // ============================================================
  // 背景层（固定不动）：纸 + 横线 + 红margin + 页码
  // ============================================================
  const gBg = el('g', { id: 'bg' }, stage);
  el('rect', { x: -20, y: -20, width: 1960, height: 1120, fill: PAL.paper }, gBg);
  // 四角极轻旧化
  el('ellipse', { cx: 0, cy: 0, rx: 220, ry: 160, fill: '#e8dfc8', opacity: 0.5 }, gBg);
  el('ellipse', { cx: 1920, cy: 1080, rx: 260, ry: 180, fill: '#e8dfc8', opacity: 0.4 }, gBg);

  // 横线 行距72px
  for (let y = 96; y <= 1010; y += 72) {
    el('line', { x1: 40, y1: y, x2: 1880, y2: y, stroke: PAL.line, 'stroke-width': 1 }, gBg);
  }
  // 红 margin 竖线 距左110px 粗2px
  el('line', { x1: 110, y1: 30, x2: 110, y2: 1050, stroke: PAL.margin, 'stroke-width': 2 }, gBg);
  // 页码
  const pageno = el('text', {
    x: 960, y: 1052, 'font-size': 26, 'font-family': 'WenKai', fill: PAL.pencil,
    'text-anchor': 'middle', opacity: 0.85
  }, gBg);
  pageno.textContent = '- 7 -';

  // ============================================================
  // Page A（beat0–5，0–21s）
  // ============================================================
  const gPageA = el('g', { id: 'pageA' }, stage);

  // --- 大标题 本月省钱计划 ---
  const gTitle = el('g', {}, gPageA);
  const titleChars = makeChars(gTitle, '本月省钱计划', 320, 225, 96, 'KuaiLe', PAL.ink, { adv: 118, seed: 1 });
  // 标题下两道重点线（红圆珠笔二次描）
  const titleUnder = drawStroke(gTitle, 'M315 250 Q700 268 1080 252', { stroke: PAL.red, 'stroke-width': 3 });

  // --- 笔落下（一支圆珠笔笔尖） ---
  const gPen = el('g', { id: 'pen', opacity: 0 }, gPageA);
  el('path', { d: 'M0 0 L10 -16 L16 2 Z', fill: PAL.ink }, gPen);
  el('rect', { x: 6, y: -30, width: 8, height: 22, rx: 3, fill: PAL.red, transform: 'rotate(20)' }, gPen);

  // --- 黄便利贴 冲！ ---
  const gNote = el('g', { id: 'note', opacity: 0 }, gPageA);
  gNote.setAttribute('transform', 'translate(1490 830) rotate(4)');
  el('rect', { x: 0, y: 0, width: 300, height: 230, fill: PAL.sticky }, gNote);
  // 便利贴投影（2-3px 15%灰错位）
  el('rect', { x: 3, y: 4, width: 300, height: 230, fill: '#000', opacity: 0.12, transform: 'translate(0 0)' }, gNote);
  // 注意：投影垫在下面——重画顺序
  const noteBang = el('text', { x: 150, y: 120, 'font-size': 96, 'font-family': 'KuaiLe', fill: PAL.red, 'text-anchor': 'middle' }, gNote);
  noteBang.textContent = '冲!';
  const noteSmall = makeChars(gNote, 'Token余额：不足⚠', 18, 210, 22, 'WenKai', PAL.pencil, { adv: 24, seed: 9 });

  // ---------- 通用：一行计划 + 打钩 ----------
  function planRow(parent, text, y, seedOff) {
    const g = el('g', {}, parent);
    const chars = makeChars(g, text, 170, y, 52, 'WenKai', PAL.ink, { adv: 62, seed: seedOff });
    // 红√
    const check = drawStroke(g, 'M105 ' + (y - 8) + ' l16 20 l34 -44', { stroke: PAL.red, 'stroke-width': 6 });
    return { g, chars, check };
  }

  // R1
  const r1 = planRow(gPageA, '①戒奶茶·戒30块的咖啡', 380, 11);
  // 咖啡杯涂鸦
  const gCup = el('g', { opacity: 0 }, gPageA);
  el('path', { d: 'M1500 340 h90 v70 a20 20 0 0 1 -20 20 h-50 a20 20 0 0 1 -20 -20 z', fill: 'none', stroke: PAL.ink, 'stroke-width': 3 }, gCup);
  el('path', { d: 'M1590 355 q35 5 0 30', fill: 'none', stroke: PAL.ink, 'stroke-width': 3 }, gCup);
  el('path', { d: 'M1525 325 q6 -12 0 -22 M1555 325 q6 -12 0 -22', fill: 'none', stroke: PAL.ink, 'stroke-width': 2 }, gCup);
  const cupCross = drawStroke(gCup, 'M1490 330 L1610 430 M1610 330 L1490 430', { stroke: PAL.red, 'stroke-width': 5 });
  // 划掉 ¥30/天
  const r1Yuan = makeChars(gPageA, '¥30/天', 1180, 388, 44, 'WenKai', PAL.ink, { adv: 50, seed: 21 });
  const r1YuanCross = drawStroke(gPageA, 'M1175 378 L1400 392', { stroke: PAL.red, 'stroke-width': 4 });

  // R2
  const r2 = planRow(gPageA, '②自己带饭，不点外卖', 540, 31);
  // 丑便当
  const gBento = el('g', { opacity: 0 }, gPageA);
  el('rect', { x: 1490, y: 495, width: 130, height: 90, rx: 12, fill: 'none', stroke: PAL.ink, 'stroke-width': 3 }, gBento);
  el('path', { d: 'M1510 520 q15 -12 30 0 q15 12 30 0 M1510 545 q15 -10 30 0 q15 10 30 0', fill: 'none', stroke: PAL.ink, 'stroke-width': 2.5 }, gBento);
  el('circle', { cx: 1590, cy: 520, r: 9, fill: 'none', stroke: PAL.ink, 'stroke-width': 2.5 }, gBento);
  el('circle', { cx: 1595, cy: 555, r: 7, fill: 'none', stroke: PAL.green, 'stroke-width': 2.5 }, gBento);
  // 星星
  const gStars = el('g', { opacity: 0 }, gPageA);
  [[1660, 500, 14], [1690, 540, 10], [1655, 560, 8]].forEach((s, i) => {
    el('path', { d: starPath(s[0], s[1], s[2]), fill: PAL.sticky, stroke: PAL.red, 'stroke-width': 1.5 }, gStars);
  });
  function starPath(cx, cy, r) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rr = (i % 2 === 0) ? r : r * 0.45;
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d + 'Z';
  }
  const r2Save = makeChars(gPageA, '省¥25/顿', 1180, 548, 44, 'WenKai', PAL.green, { adv: 52, seed: 41 });

  // R3
  const r3 = planRow(gPageA, '③走路通勤，不打车', 700, 51);
  // 火柴人狂奔
  const gRun = el('g', { opacity: 0 }, gPageA);
  const runBody = el('g', {}, gRun);
  el('circle', { cx: 1560, cy: 660, r: 20, fill: 'none', stroke: PAL.ink, 'stroke-width': 3 }, runBody);   // 头
  el('path', { d: 'M1560 680 L1555 725', stroke: PAL.ink, 'stroke-width': 3, fill: 'none' }, runBody);     // 身
  // 四肢（跑步，用 transform 摆动）
  const armF = el('path', { d: 'M1558 690 L1525 705', stroke: PAL.ink, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, runBody);
  const armB = el('path', { d: 'M1558 690 L1585 678', stroke: PAL.ink, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, runBody);
  const legF = el('path', { d: 'M1555 725 L1520 745', stroke: PAL.ink, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, runBody);
  const legB = el('path', { d: 'M1555 725 L1590 740', stroke: PAL.ink, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, runBody);
  // 汗滴
  const sweat = el('ellipse', { cx: 1590, cy: 655, rx: 4, ry: 7, fill: PAL.line, stroke: PAL.ink, 'stroke-width': 1 }, gRun);
  // 速度线
  el('line', { x1: 1480, y1: 680, x2: 1510, y2: 680, stroke: PAL.pencil, 'stroke-width': 2 }, gRun);
  el('line', { x1: 1475, y1: 700, x2: 1505, y2: 700, stroke: PAL.pencil, 'stroke-width': 2 }, gRun);
  // 笑脸
  const gSmile = el('g', { opacity: 0 }, gPageA);
  el('circle', { cx: 1720, cy: 690, r: 30, fill: 'none', stroke: PAL.red, 'stroke-width': 3 }, gSmile);
  el('path', { d: 'M1705 690 q15 14 30 0', fill: 'none', stroke: PAL.red, 'stroke-width': 2.5 }, gSmile);
  el('circle', { cx: 1711, cy: 682, r: 2.5, fill: PAL.red }, gSmile);
  el('circle', { cx: 1729, cy: 682, r: 2.5, fill: PAL.red }, gSmile);
  const r3Save = makeChars(gPageA, '省¥40/天', 1180, 708, 44, 'WenKai', PAL.green, { adv: 52, seed: 61 });

  // R4
  const r4 = planRow(gPageA, '④不买！能蹭就蹭！', 860, 71);
  // 页边举旗小怪兽
  const gMonster = el('g', { id: 'monsterA', opacity: 0 }, gPageA);
  el('path', { d: 'M60 880 q-20 -70 40 -80 q60 -10 70 50 q8 50 -30 60 q-60 12 -80 -30 z', fill: PAL.sticky, stroke: PAL.ink, 'stroke-width': 3 }, gMonster);
  el('circle', { cx: 80, cy: 860, r: 5, fill: PAL.ink }, gMonster);
  el('circle', { cx: 105, cy: 858, r: 5, fill: PAL.ink }, gMonster);
  el('path', { d: 'M78 885 q15 8 30 0', fill: 'none', stroke: PAL.ink, 'stroke-width': 2 }, gMonster);
  el('line', { x1: 115, y1: 810, x2: 150, y2: 760, stroke: PAL.ink, 'stroke-width': 3 }, gMonster);
  el('path', { d: 'M150 760 l45 12 l-45 16 z', fill: PAL.green, stroke: PAL.ink, 'stroke-width': 2 }, gMonster);
  // 红钩打满半页（6个小√散点）
  const gChecks = el('g', { opacity: 0 }, gPageA);
  const checkSpots = [[450, 950], [650, 960], [850, 945], [1050, 965], [1250, 950], [1450, 960]];
  const checkDots = checkSpots.map(s => drawStroke(gChecks, `M${s[0]} ${s[1]} l10 12 l22 -26`, { stroke: PAL.red, 'stroke-width': 5 }));
  // 蓝章 已省（并没有）
  const gStamp = el('g', { id: 'stamp', opacity: 0 }, gPageA);
  gStamp.setAttribute('transform', 'translate(1500 150) rotate(-8)');
  el('rect', { x: -110, y: -40, width: 230, height: 78, rx: 8, fill: 'none', stroke: '#2a6f9e', 'stroke-width': 4 }, gStamp);
  const stampTxt = el('text', { x: 5, y: 12, 'font-size': 34, 'font-family': 'KuaiLe', fill: '#2a6f9e', 'text-anchor': 'middle' }, gStamp);
  stampTxt.textContent = '已省(并没有)';

  // ============================================================
  // Page B（beat6–8，21–30s）：记账明细 + 支出 + 结余
  // ============================================================
  const gPageB = el('g', { id: 'pageB', opacity: 0 }, stage);
  const bTitle = makeChars(gPageB, '本月记账明细', 320, 200, 80, 'KuaiLe', PAL.ink, { adv: 92, seed: 77 });
  // 三笔省下
  const dRow1 = makeChars(gPageB, '奶茶咖啡   省 30', 360, 330, 46, 'WenKai', PAL.green, { adv: 52, seed: 81 });
  const dRow2 = makeChars(gPageB, '带饭       省 25', 360, 405, 46, 'WenKai', PAL.green, { adv: 52, seed: 83 });
  const dRow3 = makeChars(gPageB, '走路通勤   省 40', 360, 480, 46, 'WenKai', PAL.green, { adv: 52, seed: 85 });

  // 支出（划掉又写回）
  const e1 = makeChars(gPageB, '直播间9.9包邮×37', 360, 610, 44, 'WenKai', PAL.ink, { adv: 50, seed: 91 });
  const e1x = drawStroke(gPageB, 'M355 600 L980 615', { stroke: PAL.red, 'stroke-width': 4 });
  const e2 = makeChars(gPageB, '大米×20袋', 360, 690, 44, 'WenKai', PAL.ink, { adv: 50, seed: 93 });
  const e2x = drawStroke(gPageB, 'M355 680 L720 693', { stroke: PAL.red, 'stroke-width': 4 });
  const e3 = makeChars(gPageB, '洗衣液×8瓶', 360, 770, 44, 'WenKai', PAL.ink, { adv: 50, seed: 95 });
  const e3x = drawStroke(gPageB, 'M355 760 L730 773', { stroke: PAL.red, 'stroke-width': 4 });

  // 手型光标戳购物车
  const gHand = el('g', { opacity: 0 }, gPageB);
  el('path', { d: 'M990 590 l20 -18 l16 12 l-6 14 l14 10 l-6 14 l-16 -4 l-4 16 l-14 -2 z', fill: '#f2c9a0', stroke: PAL.ink, 'stroke-width': 2 }, gHand);
  // 小车
  el('path', { d: 'M1050 600 l10 30 h70 M1060 608 l6 22 M1090 608 l-4 22', fill: 'none', stroke: PAL.ink, 'stroke-width': 2.5 }, gPageB);
  el('circle', { cx: 1075, cy: 640, r: 4, fill: PAL.ink }, gPageB);
  el('circle', { cx: 1105, cy: 640, r: 4, fill: PAL.ink }, gPageB);

  // 总额 + 涂改液盖三层
  const totalTxt = makeChars(gPageB, '本月合计：¥ 9,876', 360, 880, 50, 'WenKai', PAL.ink, { adv: 56, seed: 97 });
  // 涂改液白块（边缘毛）
  const gWhite = el('g', { id: 'whiteout', opacity: 0 }, gPageB);
  el('path', { d: 'M350 850 q120 -14 260 -6 q140 8 300 -2 q10 40 -8 70 q-160 10 -300 4 q-140 -6 -250 2 q-16 -36 -2 -68 z', fill: PAL.whiteout, stroke: '#e6e0d0', 'stroke-width': 1.5 }, gWhite);
  el('path', { d: 'M360 860 q150 -8 280 -2 q120 6 280 0 q6 24 -6 46 q-150 8 -280 2 q-140 -6 -270 2 q-10 -26 -4 -48 z', fill: PAL.whiteout, opacity: 0.9 }, gWhite);
  el('path', { d: 'M370 868 q160 -6 300 0 q120 5 260 -2 q4 16 -4 30 q-160 6 -300 0 q-130 -5 -260 0 q-6 -16 4 -28 z', fill: PAL.whiteout }, gWhite);

  // 红圈/箭头戳涂改液
  const gArrow = el('g', { opacity: 0 }, gPageB);
  el('circle', { cx: 760, cy: 880, r: 90, fill: 'none', stroke: PAL.red, 'stroke-width': 4 }, gArrow);
  el('path', { d: 'M1050 980 L830 920', stroke: PAL.red, 'stroke-width': 4, 'marker-end': '' }, gArrow);
  el('path', { d: 'M830 920 l-30 2 l16 -26 z', fill: PAL.red }, gArrow);

  // 结余（被白块盖住，掀开后露出；与总额同位，顶替它）
  const gBal = el('g', { opacity: 0 }, gPageB);
  const balTxt = el('text', { x: 360, y: 890, 'font-size': 60, 'font-family': 'KuaiLe', fill: PAL.red }, gBal);
  balTxt.textContent = '结余：¥0.00';

  // 破防小怪兽（页面下方）
  const gMonster2 = el('g', { id: 'monsterB', opacity: 0 }, gPageB);
  el('path', { d: 'M1500 980 q-30 -110 60 -125 q90 -15 105 75 q12 75 -45 95 q-90 18 -120 -45 z', fill: PAL.sticky, stroke: PAL.ink, 'stroke-width': 3 }, gMonster2);
  const m2EyeL = el('circle', { cx: 1535, cy: 945, r: 6, fill: PAL.ink }, gMonster2);
  const m2EyeR = el('circle', { cx: 1585, cy: 945, r: 6, fill: PAL.ink }, gMonster2);
  const m2Mouth = el('path', { d: 'M1535 985 q25 -18 50 0', fill: 'none', stroke: PAL.ink, 'stroke-width': 2.5 }, gMonster2);
  const m2Tear = el('path', { d: 'M1530 955 q-6 18 2 26 q8 -8 2 -26 z', fill: PAL.line, stroke: PAL.ink, 'stroke-width': 1, opacity: 0 }, gMonster2);

  // 彩蛋 + 署名
  const egg = makeChars(gPageB, '您已下单第402件小垃圾', 360, 1010, 24, 'WenKai', PAL.pencil, { adv: 27, seed: 101 });
  const sign = makeChars(gPageB, '由 Doubao 在30秒内用纯代码制作完成', 640, 1052, 22, 'WenKai', PAL.pencil, { adv: 25, seed: 103 });

  // ============================================================
  // render(t) 纯函数
  // ============================================================
  function setOp(node, v) { node.setAttribute('opacity', clamp01(v).toFixed(3)); }

  function render(t) {
    const frame = Math.round(t * T.fps);

    // ---- 背景淡入（beat0） ----
    gBg.setAttribute('opacity', smooth(t / 0.6).toFixed(3));

    // ===================== PAGE A =====================
    // 翻页淡出
    let aOpacity = 1;
    if (t >= T.flipStart) {
      const f = smooth((t - T.flipStart) / (T.flipDone - T.flipStart));
      aOpacity = 1 - f;
      gPageA.setAttribute('transform', `translate(${(-120 * f).toFixed(1)} 0) rotate(${(-3 * f).toFixed(1)})`);
    }
    setOp(gPageA, aOpacity);

    // 标题
    {
      const charDur = (T.titleDone - T.titleStart) / T.titleChars;
      const p = (t - T.titleStart) / charDur;
      titleChars.set(p);
      titleUnder.set(clamp01((t - (T.titleStart + T.titleChars * charDur + 0.1)) / 0.4));
    }
    // 笔落下
    {
      const pd = smooth((t - T.penDown) / 0.35);
      if (t >= T.penDown && t < T.titleDone + 0.2) {
        gPen.setAttribute('opacity', 0.9);
        // 笔随标题字前进
        const prog = clamp01((t - T.titleStart) / (T.titleDone - T.titleStart));
        gPen.setAttribute('transform', `translate(${(320 + prog * 680).toFixed(0)} ${(235 - 15 * Math.sin(frame * 0.5)).toFixed(0)})`);
      } else gPen.setAttribute('opacity', 0);
    }
    // 便利贴
    {
      const pop = backOut((t - T.noteIn) / 0.35);
      gNote.setAttribute('opacity', t >= T.noteIn ? 0.98 : 0);
      gNote.setAttribute('transform', `translate(${(1490 - (1 - pop) * 40).toFixed(1)} ${(830 - (1 - pop) * 30).toFixed(1)}) rotate(4)`);
      noteSmall.set((t - T.noteSmall) / 0.08);
    }

    // R1
    r1.chars.set((t - T.r1Text) / 0.09);
    r1.check.set(clamp01((t - T.r1Check) / 0.3));
    setOp(gCup, t >= T.r1Cup ? 1 : 0);
    cupCross.set(clamp01((t - (T.r1Cup + 0.35)) / 0.25));
    r1Yuan.set((t - T.r1CrossYuan) / 0.1);
    r1YuanCross.set(clamp01((t - T.r1CrossYuan) / 0.3));

    // R2
    r2.chars.set((t - T.r2Text) / 0.09);
    setOp(gBento, t >= T.r2Bento ? 1 : 0);
    r2.check.set(clamp01((t - T.r2Check) / 0.3));
    {
      const sp = backOut((t - T.r2Stars) / 0.4);
      setOp(gStars, t >= T.r2Stars ? 1 : 0);
      gStars.setAttribute('transform', `scale(${sp.toFixed(3)}) translate(${(-1660 * (1 - sp)).toFixed(1)} ${(-530 * (1 - sp)).toFixed(1)})`);
    }
    r2Save.set((t - T.r2Save) / 0.12);

    // R3
    r3.chars.set((t - T.r3Text) / 0.09);
    setOp(gRun, t >= T.r3Run ? 1 : 0);
    // 跑步循环摆臂摆腿 + 汗滴
    if (t >= T.r3Run) {
      const cyc = frame * 0.5;
      armF.setAttribute('transform', `rotate(${Math.sin(cyc) * 30} 1558 690)`);
      armB.setAttribute('transform', `rotate(${-Math.sin(cyc) * 30} 1558 690)`);
      legF.setAttribute('transform', `rotate(${-Math.sin(cyc) * 28} 1555 725)`);
      legB.setAttribute('transform', `rotate(${Math.sin(cyc) * 28} 1555 725)`);
      sweat.setAttribute('cy', 655 + ((frame * 3) % 20));
    }
    r3.check.set(clamp01((t - T.r3Check) / 0.3));
    setOp(gSmile, t >= T.r3Smile ? backOut((t - T.r3Smile) / 0.35) : 0);
    r3Save.set((t - T.r3Save) / 0.12);

    // R4
    r4.chars.set((t - T.r4Text) / 0.09);
    {
      const mp = backOut((t - T.r4Monster) / 0.4);
      setOp(gMonster, t >= T.r4Monster ? 1 : 0);
      gMonster.setAttribute('transform', `translate(${((1 - mp) * -60).toFixed(1)} 0) scale(${mp.toFixed(3)})`);
    }
    setOp(gChecks, t >= T.r4Checks ? 1 : 0);
    checkDots.forEach((c, i) => c.set(clamp01((t - (T.r4Checks + i * 0.09)) / 0.15)));
    {
      const st = backOut((t - T.r4Stamp) / 0.35);
      setOp(gStamp, t >= T.r4Stamp ? 0.92 : 0);
      gStamp.setAttribute('transform', `translate(1500 150) rotate(-8) scale(${(0.6 + 0.4 * st).toFixed(3)})`);
    }

    // ===================== PAGE B =====================
    {
      const f = smooth((t - T.flipStart) / (T.flipDone - T.flipStart));
      setOp(gPageB, f);
      gPageB.setAttribute('transform', `translate(${(100 * (1 - f)).toFixed(1)} 0)`);
    }
    bTitle.set((t - T.detailTitle) / 0.1);
    dRow1.set((t - T.detailRows[0]) / 0.1);
    dRow2.set((t - T.detailRows[1]) / 0.1);
    dRow3.set((t - T.detailRows[2]) / 0.1);

    e1.set((t - T.e1Text) / 0.1);
    e1x.set(clamp01((t - T.e1Cross) / 0.3));
    e2.set((t - T.e2Text) / 0.1);
    e2x.set(clamp01((t - T.e2Cross) / 0.25));
    e3.set((t - T.e3Text) / 0.1);
    e3x.set(clamp01((t - T.e3Cross) / 0.25));

    // 手光标戳车
    if (t >= T.e1Cross - 0.25 && t < T.e1Cross + 0.5) {
      const bump = Math.sin(clamp01((t - (T.e1Cross - 0.25)) / 0.75) * Math.PI) * 14;
      gHand.setAttribute('opacity', 0.95);
      gHand.setAttribute('transform', `translate(${(bump).toFixed(1)} 0)`);
    } else gHand.setAttribute('opacity', 0);

    totalTxt.set(clamp01((t - 26.2) / 0.12) * (t < T.lift ? 1 : clamp01(1 - (t - T.lift) / 0.3)));
    // 涂改液盖三层
    {
      const w = clamp01((t - T.totalCover) / 0.5);
      setOp(gWhite, t >= T.totalCover ? 0.98 : 0);
      // 三层逐块淡入
      gWhite.children[0].setAttribute('opacity', Math.min(1, w * 2).toFixed(2));
      gWhite.children[1].setAttribute('opacity', Math.min(1, Math.max(0, w * 2 - 0.5)).toFixed(2) * 0.9);
      gWhite.children[2].setAttribute('opacity', Math.min(1, Math.max(0, w * 2 - 1)).toFixed(2));
    }

    // 红圈箭头
    setOp(gArrow, t >= T.revealArrow ? backOut((t - T.revealArrow) / 0.4) : 0);

    // 掀开白块露结余
    {
      const lift = smooth((t - T.lift) / 0.6);
      if (t >= T.lift) {
        gWhite.setAttribute('transform', `translate(0 ${(-130 * lift).toFixed(1)})`);
        gWhite.setAttribute('opacity', (0.98 * (1 - lift * 0.9)).toFixed(3));
      }
      setOp(gBal, t >= T.lift ? easeOut((t - T.lift) / 0.4) : 0);
    }

    // 小怪兽破防
    {
      setOp(gMonster2, t >= T.monsterBreak ? 1 : 0);
      if (t >= T.monsterBreak) {
        const bk = smooth((t - T.monsterBreak) / 0.5);
        m2Mouth.setAttribute('d', bk > 0.5 ? 'M1535 988 q25 12 50 0' : 'M1535 985 q25 -18 50 0');
        m2Tear.setAttribute('opacity', bk.toFixed(2));
        m2Tear.setAttribute('cy', (960 + ((frame * 2) % 30)).toFixed(1));
      }
    }

    egg.set((t - T.egg) / 0.08);
    sign.set((t - 28.95) / 0.045);
    // 翻到第二页后隐藏页码（让位署名）
    pageno.setAttribute('opacity', t >= T.flipDone ? 0 : 0.85);
  }

  global.render = render;
  render(0);
})(window);
