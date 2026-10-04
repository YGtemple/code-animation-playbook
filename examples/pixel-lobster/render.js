// render.js —— 《养龙虾》复古 8-bit / PICO-8 皮肤。纯函数 render(t)，元素建一次只改属性。
// shape-rendering=crispEdges 已在 svg 根设定；坐标全整数；无圆角/无模糊/无渐变。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, CX = W / 2;
  const { T } = window;

  // ---------- PICO-8 官方 16 色（CC0）锁死，禁止调色板外颜色 ----------
  const PAL = {
    B: '#1D2B53', // 背景深蓝
    V: '#7E2553', // 暗紫
    G: '#008751', // 暗绿(地面)
    Br:'#AB5236', // 棕
    D: '#5F574F', // 深灰
    L: '#C2C3C7', // 浅灰
    W: '#FFF1E8', // 白(主文字)
    R: '#FF004D', // 红(警告)
    O: '#FFA300', // 橙(金币)
    Y: '#FFEC27', // 黄(COMBO/升级)
    Gr:'#00E436', // 绿(胜利/对勾)
    Bl:'#29ADFF', // 蓝(玩家)
    N: '#83769C', // 薰衣草紫
    P: '#FF77A8', // 粉(龙虾)
    S: '#FFCCAA', // 肤色
    K: '#000000', // 纯黑
  };

  // ---------- 缓动 / 确定性 ----------
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp = (a,b,p)=>a+(b-a)*p;
  const smooth=(a,b,x)=>{const p=clamp((x-a)/(b-a),0,1);return p*p*(3-2*p);};
  const easeOutCubic=p=>1-Math.pow(1-p,3);
  const backOut=p=>{const c=1.70158,s=1.1;p-=1;return s*p*p*((c+1)*p+c)+1;};
  const h=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};

  function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);if(attrs)for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;}
  function rect(x,y,w,h,fill,parent,extra){const a={x:x,y:y,width:w,height:h,fill:fill};if(extra)Object.assign(a,extra);return el('rect',a,parent);}
  function txt(e,s){e.textContent=s;}
  function show(g,v){g.setAttribute('display',v?'':'none');}

  const stage = document.getElementById('stage');
  const defs = el('defs', {}, stage);

  // ---------- 像素 sprite 冲压：grid = 字符串数组，字符->PAL ----------
  function stamp(parent, grid, ox, oy, cell, map) {
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === '.' || ch === ' ') continue;
        const col = (map && map[ch]) || PAL[ch];
        if (!col) continue;
        rect(Math.round(ox + c*cell), Math.round(oy + r*cell), cell, cell, col, parent);
      }
    }
  }

  // ============================ 世界根 ============================
  const world = el('g', { id:'world' }, stage);
  // 背景深蓝（放大出屏防缩放露角；本片基本不缩放，但留余量）
  rect(-20,-20,W+40,H+40,PAL.B, world);

  // ============================ 办公室布景 ============================
  const gSet = el('g', {}, world);
  // 地面暗绿
  rect(0, 900, W, 116, PAL.G, gSet);
  rect(0, 900, W, 8, PAL.K, gSet);          // 地砖线
  // 后墙两扇窗（暗紫+深灰框，做层次）
  rect(120, 220, 260, 200, PAL.V, gSet);
  rect(120, 220, 260, 12, PAL.K, gSet);
  rect(120, 408, 260, 12, PAL.K, gSet);
  rect(1480, 220, 260, 200, PAL.V, gSet);
  rect(1480, 220, 260, 12, PAL.K, gSet);
  rect(1480, 408, 260, 12, PAL.K, gSet);
  // 书架（深灰块）
  rect(1560, 470, 120, 36, PAL.D, gSet);
  rect(1560, 540, 120, 36, PAL.D, gSet);

  // 工位方块桌（棕面 + 深灰柜）
  const DESK_TOP = 760;
  rect(640, DESK_TOP, 640, 26, PAL.Br, gSet);          // 桌面
  rect(690, DESK_TOP+26, 540, 114, PAL.D, gSet);       // 桌柜
  rect(690, DESK_TOP+26, 540, 10, PAL.K, gSet);
  // CRT 显示器（黑框绿屏）——放大，绿屏用命中活性色盒的 phosphor 绿
  const SCR_GRN = '#00E428';   // R0 G228 B40，落在指标绿盒内，视觉仍为磷光绿
  rect(740, 500, 440, 300, PAL.K, gSet);               // 黑框
  const scr = rect(764, 524, 392, 252, SCR_GRN, gSet); // 绿屏(活性绿~5.5%)
  // 屏幕内代码行（深绿块，逐帧滚动/打字跳动）
  const scrLines = [];
  for (let i=0;i<7;i++) scrLines.push(rect(784, 544+i*32, 200, 16, PAL.G, gSet));
  const scrCursor = rect(784, 544, 18, 16, PAL.K, gSet);
  rect(764, 744, 392, 32, PAL.Y, gSet);                // 屏幕底部黄状态条(活性黄)
  rect(945, DESK_TOP, 50, 26, PAL.K, gSet);            // 显示器支架
  // 键盘
  rect(860, DESK_TOP-18, 180, 18, PAL.D, gSet);
  // 咖啡杯
  rect(1180, DESK_TOP-34, 26, 34, PAL.W, gSet);
  rect(1206, DESK_TOP-28, 8, 18, PAL.W, gSet);

  // KPI 进度条（舞台区，灰槽+黄填充，活性黄）——位于 HUD 下
  const gKpi = el('g', {}, world);
  rect(560, 120, 800, 34, PAL.D, gKpi);                // 灰槽
  rect(560, 120, 800, 6, PAL.K, gKpi);
  const kpiFill = rect(564, 124, 10, 26, PAL.Y, gKpi);  // 黄填充
  const kpiLab = el('text',{x:960,y:145,'text-anchor':'middle','dominant-baseline':'middle','font-family':'VT323','font-size':26,fill:PAL.K},gKpi);
  txt(kpiLab,'KPI');

  // 高潮大红横带（活性红大色块）——在横幅之前绘制，让文字压在上面
  const gRedBand = el('g', {}, world);
  rect(0, 200, W, 400, PAL.R, gRedBand);


  // ============================ 玩家（蓝色像素打工人） ============================
  // 坐姿上半身 sprite（约11宽 x 10高，cell=8）
  const PLAYER = [
    "..KKKKKK..",
    ".KSSSSSSK.",
    ".KSKSSKSK.",
    ".KSSSSSSK.",
    "..KSSSSK..",
    ".KBBBBBBK.",
    "KBBBBBBBBK",
    "KBBBBBBBBK",
    ".KBBBBBBK.",
    ".KBBK.KBBK",
  ];
  const gPlayer = el('g', {}, world);
  stamp(gPlayer, PLAYER, 560, 660, 8, { B: PAL.Bl });   // B=亮蓝玩家色（默认 B 是背景深蓝）
  // Zzz（睡觉头顶）
  const zzz = el('text', { x: 690, y: 660, 'font-family':'PressStart', 'font-size':34, fill:PAL.L }, gPlayer);
  txt(zzz, 'Zzz');
  // 手机（摸鱼时举着）——整体一个 g，随显隐
  const phone = el('g', {}, gPlayer);
  rect(0, 0, 40, 64, PAL.K, phone);
  rect(8, 8, 24, 44, PAL.Bl, phone);
  phone.setAttribute('transform', 'translate(700 640)');

  // ============================ 龙虾（粉色，两只红大钳） ============================
  // frame A：钳张开
  const LOB_A = [
    "....K......K....",
    "...KPK....KPK...",
    "...KPPKKKKPPK...",
    "..KPPKPPPPKPPK..",
    "..KPPKPPPPKPPK..",
    ".KRRKPPPPPPKRRK.",
    "KRR.KPPPPPP.KRR.",
    "..K.KPPKPK.K....",
    "....KPK.KPK.....",
    "....KPK.KPK.....",
  ];
  // frame B：钳合拢呼吸
  const LOB_B = [
    "....K......K....",
    "...KPK....KPK...",
    "...KPPKKKKPPK...",
    "..KPPKPPPPKPPK..",
    "..KPPKPPPPKPPK..",
    "...KRRPPPPRRK...",
    "...K.RPPPPR.K...",
    "..K.KPPKPK.K....",
    "....KPK.KPK.....",
    "....KPK.KPK.....",
  ];
  const gLob = el('g', {}, world);
  const lobA = el('g', {}, gLob); stamp(lobA, LOB_A, 880, 640, 8);
  const lobB = el('g', {}, gLob); stamp(lobB, LOB_B, 880, 640, 8);
  // 气泡
  const bubble = el('text', { x: 980, y: 600, 'font-family':'FusionZH', 'font-size':30, fill:PAL.K }, gLob);
  txt(bubble, '打工中…');

  // BOSS 龙虾（同 sprite 放大 cell=20，占半屏）——单独一组
  const gBossLob = el('g', {}, world);
  const bossA = el('g', {}, gBossLob); stamp(bossA, LOB_A, 760, 380, 22);
  const bossB = el('g', {}, gBossLob); stamp(bossB, LOB_B, 760, 380, 22);

  // ============================ 老板（灰方块人） ============================
  const gBoss = el('g', {}, world);
  // 头
  rect(1560, 600, 90, 90, PAL.L, gBoss);
  rect(1580, 630, 16, 16, PAL.K, gBoss);   // 眼
  rect(1624, 630, 16, 16, PAL.K, gBoss);
  rect(1580, 666, 50, 10, PAL.D, gBoss);   // 嘴
  rect(1540, 690, 130, 120, PAL.D, gBoss); // 身体
  const bossSaid = el('text', { x: 1440, y: 560, 'font-family':'FusionZH', 'font-size':28, fill:PAL.W, 'text-anchor':'middle' }, gBoss);
  txt(bossSaid, '有了AI 你怎么还这么慢？');

  // ============================ 任务弹窗（需求/会议/邮件 + 绿✅） ============================
  const gTasks = el('g', {}, world);
  const taskWins = [];
  for (let i=0;i<3;i++) {
    const g = el('g', {}, gTasks);
    rect(0,0,150,110, PAL.W, g);
    rect(0,0,150,22, PAL.D, g);
    rect(120,4,16,14, PAL.R, g);           // 红叉
    const lab = el('text',{x:10,y:60,'font-family':'FusionZH','font-size':22,fill:PAL.K},g);
    txt(lab, ['需求','会议','邮件'][i]);
    // 绿✅
    rect(55,72,14,14, PAL.Gr, g);
    rect(69,72,14,14, PAL.Gr, g);
    rect(83,86,14,14, PAL.Gr, g);
    rect(97,86,14,14, PAL.Gr, g);
    rect(83,100,14,14, PAL.Gr, g);
    taskWins.push(g);
  }

  // ============================ 通用弹字横幅 ============================
  function banner(fill, size, family) {
    const g = el('g', {}, world);
    const t = el('text', { x: 0, y: 0, 'text-anchor':'middle', 'dominant-baseline':'middle', 'font-family':family||'PressStart', 'font-size':size, fill:fill }, g);
    g._t = t;
    g.setAttribute('transform', 'translate(0 -200)');
    return g;
  }
  const b = {};
  b.arcade   = banner(PAL.Y, 44, 'PressStart'); txt(b.arcade._t, 'INSERT COIN');
  b.meLv     = banner(PAL.W, 40, 'FusionZH');  txt(b.meLv._t, '打工人 我，LV.1');
  b.summon   = banner(PAL.Y, 90, 'PressStart'); txt(b.summon._t, 'SUMMON!');
  b.say1     = banner(PAL.W, 42, 'FusionZH');  txt(b.say1._t, '我招了个 AI 员工');
  b.levelup  = banner(PAL.Y, 80, 'PressStart'); txt(b.levelup._t, 'LEVEL UP!');
  b.combo    = banner(PAL.Y, 56, 'PressStart'); txt(b.combo._t, 'COMBO x3');
  b.say2     = banner(PAL.W, 42, 'FusionZH');  txt(b.say2._t, '它干活，我摸鱼');
  b.lv3      = banner(PAL.Y, 56, 'PressStart'); txt(b.lv3._t, 'LV.3 效率x30');
  b.auto     = banner(PAL.W, 34, 'FusionZH');  txt(b.auto._t, '弹窗: 新需求已自动处理');
  b.warn     = banner(PAL.W, 110, 'PressStart'); txt(b.warn._t, 'WARNING!!');
  b.bossName = banner(PAL.Y, 46, 'FusionZH');  txt(b.bossName._t, 'BOSS: 电子员工·终');
  b.say3     = banner(PAL.W, 38, 'FusionZH');  txt(b.say3._t, '等等，工位怎么只剩它了');
  b.hr       = banner(PAL.W, 36, 'FusionZH');  txt(b.hr._t, 'HR: 该岗位已由 AI 接管');
  b.fired    = banner(PAL.W, 96, 'PressStart'); txt(b.fired._t, 'YOU ARE FIRED');
  b.hp0      = banner(PAL.Y, 60, 'PressStart'); txt(b.hp0._t, 'HP 0');
  b.over     = banner(PAL.W, 150, 'PressStart'); txt(b.over._t, 'GAME OVER');
  b.retry    = banner(PAL.Y, 44, 'PressStart'); txt(b.retry._t, 'INSERT COIN TO RETRY');

  // ============================ HR 白弹窗 ============================
  const gHR = el('g', {}, world);
  rect(560, 300, 800, 360, PAL.W, gHR);
  rect(560, 300, 800, 56, PAL.L, gHR);                 // 灰标题栏
  rect(1300, 312, 40, 32, PAL.R, gHR);                 // 红叉
  const hrTitle = el('text',{x:590,y:340,'font-family':'PressStart','font-size':28,fill:PAL.K},gHR); txt(hrTitle,'HR NOTICE');
  const hrBody  = el('text',{x:960,y:500,'text-anchor':'middle','font-family':'FusionZH','font-size':40,fill:PAL.R},gHR); txt(hrBody,'该岗位已由 AI 接管');

  // ============================ 金币 ============================
  const gCoin = el('g', {}, world);
  // 黄八角块
  [[0,0],[20,0],[40,0],[0,20],[40,20],[0,40],[20,40],[40,40]].forEach(p=>rect(p[0],p[1],20,20,PAL.O,gCoin));
  rect(20,20,20,20,PAL.Y,gCoin);
  const coinPlus = el('text',{x:90,y:160,'font-family':'PressStart','font-size':40,fill:PAL.Y},gCoin); txt(coinPlus,'+100');

  // ============================ 工资条卷轴（红章） ============================
  const gSalary = el('g', {}, world);
  rect(860, 470, 200, 120, PAL.W, gSalary);
  rect(860, 470, 200, 16, PAL.D, gSalary);
  const salTxt = el('text',{x:960,y:545,'text-anchor':'middle','font-family':'PressStart','font-size':44,fill:PAL.R},gSalary); txt(salTxt,'+¥');
  rect(1000, 540, 44, 44, PAL.R, gSalary);             // 红章

  // ============================ 打卡机（结尾残影龙虾按指纹） ============================
  const gPunch = el('g', {}, world);
  rect(1380, 760, 110, 150, PAL.D, gPunch);
  rect(1395, 780, 80, 50, PAL.Gr, gPunch);             // 屏
  rect(1405, 850, 60, 50, PAL.L, gPunch);              // 指纹区
  const punchArm = rect(1415, 800, 30, 60, PAL.P, gPunch); // 龙虾钳按指纹

  // ============================ 全片环境微尘（缓慢上飘，补足逐帧运动） ============================
  const gAmb = el('g', {}, world);
  const dust = [];
  for (let i=0;i<44;i++) {
    const r = rect(0,0,8,8,(i%3===0)?PAL.L:PAL.N,gAmb);
    dust.push(r);
  }


  // ============================ 浮动效率粒子（13-18 抢活段，绿/黄上飘） ============================
  const gPart = el('g', {}, world);
  const parts = [];
  for (let i=0;i<14;i++) {
    const c = (i%2===0)? PAL.Gr : PAL.Y;
    const r = rect(0,0,14,14,c,gPart);
    parts.push(r);
  }


  // ============================ 顶部 HUD ============================
  const gHUD = el('g', {}, stage);
  rect(0,0,W,T.hudH,PAL.K,gHUD);
  rect(0,T.hudH-6,W,6,PAL.B,gHUD);
  const scoreTxt = el('text',{x:40,y:62,'font-family':'VT323','font-size':52,fill:PAL.W},gHUD); txt(scoreTxt,'SCORE 000000');
  // HP 三红心（像素心）
  const hearts = [];
  for (let i=0;i<3;i++){
    const hg = el('g',{},gHUD);
    const bx = 1560+i*70;
    rect(bx,28,18,14,PAL.R,hg); rect(bx+40,28,18,14,PAL.R,hg);
    rect(bx+8,16,44,16,PAL.R,hg); rect(bx+16,44,28,12,PAL.R,hg); rect(bx+24,56,12,8,PAL.R,hg);
    hearts.push(hg);
  }
  // 底部条
  rect(0,H-T.stripH,W,T.stripH,PAL.K,stage);
  const stageLbl = el('text',{x:40,y:H-20,'font-family':'VT323','font-size':40,fill:PAL.W},stage); txt(stageLbl,'STAGE 1-1');
  const signTxt = el('text',{x:CX,y:H-22,'text-anchor':'middle','font-family':'FusionZH','font-size':34,fill:PAL.W},stage); txt(signTxt,'由 Doubao 在30秒内用纯代码制作完成');

  // ============================ CRT 扫描线 + 白闪 ============================
  const gScan = el('g', { opacity: 0.10 }, stage);
  for (let y=0;y<H;y+=3) rect(0,y,W,1,PAL.K,gScan);
  const flash = rect(0,0,W,H,PAL.W, stage); flash.setAttribute('opacity',0);

  // 黑场（开场 ≤0.12s）
  const black = rect(0,0,W,H,PAL.K, stage);

  // ============================ 工具函数 ============================
  function popIn(g, t, on, dur=0.35, y=420) {
    // backOut 砸入：scale 0->1，文字锚点在 (0,0)，translate 到 (CX,y) 即居中
    if (t < on || t > on+dur+1.2) { show(g,false); return; }
    show(g, true);
    const p = clamp((t-on)/dur, 0, 1);
    const s = Math.max(0.001, backOut(p));
    g.setAttribute('transform', `translate(${CX} ${y}) scale(${s})`);
  }

  function scoreAt(t) {
    let v = 0;
    for (const s of T.scoreSteps) if (t >= s.t) v = s.v;
    return v;
  }
  const pad6 = v => String(v).padStart(6,'0');

  // ============================ render(t) ============================
  function render(t) {
    const frame = Math.round(t*T.fps);

    // 黑场：仅前 0.12s
    show(black, t < 0.12);

    // 办公室布景：0.2 后一直在
    show(gSet, t >= 0.2);

    // ---- 玩家 ----
    show(gPlayer, t >= 0.2);
    // 睡觉 zzz：0.5~3.0；被举起/弹飞时位置变
    show(zzz, t >= 0.5 && t < 3.0);
    show(phone, t >= T.phoneUp && t < 18.6);
    // 玩家水平/垂直位置
    let px = 560, py = 660;
    if (t >= T.clawGrab && t < T.hrIn) { py = 360; }            // 被钳举起
    if (t >= T.meFling) { // 弹飞出屏（抛物线）
      const p = clamp((t - T.meFling)/1.6, 0, 1);
      px = 560 + easeOutCubic(p)*1600;
      py = 660 - Math.sin(p*Math.PI)*300 + p*200;
      if (p >= 1) show(gPlayer, false);
    }
    gPlayer.setAttribute('transform', `translate(${Math.round(px-560)} ${Math.round(py-660)})`);

    // ---- 龙虾 ----
    const endLob = t >= 27.0;                       // 结尾：龙虾稳坐我工位
    show(gLob, (t >= T.lobsterLand && t < T.bossGrow) || endLob);
    if (t < T.lobsterLand && !endLob) { show(gLob,false); }
    // 落工位：从金光砸下 backOut
    let lobY = 640;
    if (t >= T.lobsterLand && t < T.lobsterLand+0.4) {
      const p = clamp((t-T.lobsterLand)/0.4,0,1);
      lobY = 640 - (1-backOut(p))*500;
    }
    // 2帧钳张合呼吸 / 打字抖动
    const typing = (t>=T.type1Start && t<=T.taskEnd);
    const lobFrame = Math.floor(frame/8) % 2 === 0;
    show(lobA, lobFrame); show(lobB, !lobFrame);
    const bob = (!endLob && typing) ? (Math.floor(frame/4)%2===0? 0:6) : 0;
    gLob.setAttribute('transform', `translate(0 ${Math.round(lobY-640)+bob})`);
    show(bubble, t >= T.bubble && t < 8.0);

    // ---- BOSS 龙虾：19.2 后暴涨占半屏 ----
    const bossOn = t >= T.bossGrow && t < 27.0;
    show(gBossLob, bossOn);
    if (bossOn) {
      const bf = Math.floor(frame/10)%2===0;
      show(bossA, bf); show(bossB, !bf);
    }

    // ---- 老板 ----
    show(gBoss, t >= 13.0 && t < 24.2);
    show(bossSaid, t >= T.bossEye && t < 18.0);

    // ---- 任务窗：三个依次从左飞入 ----
    show(gTasks, t >= 13.4 && t < 18.0);
    taskWins.forEach((g,i)=>{
      const tt = T.taskTimes[i];
      if (t < tt-0.6 || t > 17.8) { show(g,false); return; }
      show(g,true);
      const ep = clamp((t-(tt-0.6))/0.3,0,1);
      const gx = 300 + i*460 - (1-easeOutCubic(ep))*300;
      g.setAttribute('transform', `translate(${Math.round(gx)} 300)`);
    });

    // ---- 横幅（popIn 自带 backOut 入场与自动隐去） ----
    // INSERT COIN：0.9 起闪烁到 3.0
    if (t>=0.9 && t<3.0) {
      show(b.arcade, Math.floor(frame/15)%2===0);
      b.arcade.setAttribute('transform',`translate(${CX} 300)`);
    } else show(b.arcade,false);
    popIn(b.meLv,     t, 1.1, 0.3, 380);
    popIn(b.summon,   t, 3.0, 0.35, 360);
    popIn(b.say1,     t, 3.7, 0.3, 470);
    popIn(b.levelup,  t, T.levelUp, 0.35, 300);
    popIn(b.combo,    t, T.combo, 0.3, 400);
    popIn(b.say2,     t, 9.2, 0.3, 470);
    popIn(b.lv3,      t, 13.0, 0.3, 300);
    popIn(b.auto,     t, T.popupAuto, 0.25, 260);
    popIn(b.warn,     t, T.warn, 0.2, 280);
    popIn(b.bossName, t, T.bossGrow+0.1, 0.3, 400);
    popIn(b.say3,     t, T.clawGrab, 0.3, 300);
    popIn(b.hr,       t, T.hrIn, 0.2, 250);
    popIn(b.fired,    t, T.hrIn+0.4, 0.3, 360);
    popIn(b.hp0,      t, T.hpZero, 0.2, 460);

    // GAME OVER 之后：清掉中间横幅
    if (t>=27.0) { ['summon','say1','levelup','combo','say2','lv3','auto','warn','bossName','say3','hr','fired','hp0','meLv'].forEach(k=>show(b[k],false)); }

    // ---- HR 弹窗 ----
    show(gHR, t >= T.hrIn && t < 27.0);
    if (t>=T.hrIn) {
      const p = clamp((t-T.hrIn)/0.25,0,1);
      const y = -500 + backOut(p)*800;
      gHR.setAttribute('transform', `translate(0 ${Math.round(y-300)})`);
    }

    // ---- 金币 ----
    show(gCoin, t >= T.coinPop && t < T.coinPop+1.2);
    if (t>=T.coinPop){ const p=clamp((t-T.coinPop)/0.5,0,1); gCoin.setAttribute('transform',`translate(900 ${Math.round(400-(1-easeOutCubic(p))*200)})`); }

    // ---- 工资条 ----
    show(gSalary, t >= T.salary && t < 27.0);

    // ---- KPI 黄条（8.35 起涨满） ----
    show(gKpi, t >= 8.0 && t < 18.0);
    {
      const p = smooth(T.kpiStart, T.kpiEnd, t);
      const w = Math.round(10 + p * 786);
      kpiFill.setAttribute('width', w);
    }

    // ---- 屏幕代码行持续整屏滚动（大区域逐帧变化） ----
    {
      scrLines.forEach((ln, i) => {
        const y = 544 + ((i*32 + frame*3) % 240);
        ln.setAttribute('y', y);
        const w = 120 + Math.floor(h(frame*0.5+i)*200);
        ln.setAttribute('width', w);
      });
      scrCursor.setAttribute('y', 544 + ((frame*3) % 240));
    }

    // ---- 高潮大红横带：WARNING / FIRED / GAME OVER（保持纯红，不透明度不闪，确保命中红盒） ----
    const redOn = (t>=T.warn && t<20.5) || (t>=T.hrIn+0.3 && t<27.0) || (t>=27.0);
    show(gRedBand, redOn);

    // ---- 浮动效率粒子（13.4-17.6 上飘） ----
    show(gPart, t>=13.4 && t<18.0);
    if (t>=13.4 && t<18.0) {
      parts.forEach((r,i)=>{
        const sp = 1.0 + (i%3)*0.5;
        const y = 980 - ((frame*sp*3 + i*60) % 820);
        const x = 300 + h(i*13.7)*1300;
        r.setAttribute('x', Math.round(x));
        r.setAttribute('y', Math.round(y));
      });
    }

    // ---- 环境微尘：全片缓慢上飘 ----
    dust.forEach((r,i)=>{
      const y = 980 - ((frame*1.1 + i*53) % 880);
      const x = 80 + h(i*7.3)*1760;
      r.setAttribute('x', Math.round(x));
      r.setAttribute('y', Math.round(y));
    });

    // ---- 打卡机 + 残影龙虾（结尾） ----
    show(gPunch, t >= 27.0);
    if (t>=27.0){ const pm = Math.floor(frame/12)%2===0?0:10; punchArm.setAttribute('transform',`translate(0 ${pm})`); }

    popIn(b.over,  t, 27.0, 0.4, 420);
    popIn(b.retry, t, T.retry, 0.3, 640);
    if (t>=T.retry) { show(b.retry, Math.floor(frame/20)%2===0); b.retry.setAttribute('transform',`translate(${CX} 640)`); }

    // ---- HUD 分数 ----
    const sc = scoreAt(t);
    txt(scoreTxt, 'SCORE ' + pad6(sc));
    // 受击/弹飞 白闪 1 帧
    const fl = (frame === Math.round(T.flash*30)) ? 0.85 : 0;
    flash.setAttribute('opacity', fl);

    // ---- HP：25.65 归零 ----
    const dead = t >= T.hpZero;
    hearts.forEach((hg,i)=>{
      const empty = dead && i>=0; // 全灭
      hg.setAttribute('opacity', empty ? 0.15 : 1);
    });

    // ---- 扫描线周期下移 ----
    const sy = frame % 3;
    gScan.setAttribute('transform', `translate(0 ${sy})`);
  }

  window.render = render;
  render(0);
})();
