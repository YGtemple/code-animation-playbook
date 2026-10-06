// smoke.js —— 渲染关键帧到 qc/smoke/，快速目检 + 抓 console 错误。
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const { T } = require('./timeline.js');
const DIR = __dirname;
const INDEX = 'file://' + path.join(DIR, 'index.html');
const OUT = path.join(DIR, 'qc', 'smoke');
fs.mkdirSync(OUT, { recursive: true });
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// (frame, label)
const KEY = [
  [10, 'cover'], [60, 'cover2'], [120, 'hero'], [150, 'think'],
  [198, 'pow'], [250, 'r1end'], [306, 'wham'], [360, 'r2end'],
  [432, 'bam'], [470, 'r3end'], [522, 'kapow'], [580, 'r4end'],
  [640, 'doc'], [720, 'down'], [800, 'down2'], [840, 'out'], [880, 'signoff']
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--force-color-profile=srgb','--hide-scrollbars','--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(INDEX, { timeout: 30000 });
  await p.evaluate(async () => {
    await Promise.all([document.fonts.load('100px AntonF'), document.fonts.load('100px KuaiLe'), document.fonts.load('100px QingKe')]);
    await document.fonts.ready;
  });
  for (const [i, label] of KEY) {
    await p.evaluate(tt => window.render(tt), i / T.fps);
    await p.screenshot({ path: path.join(OUT, `${String(i).padStart(4,'0')}_${label}.png`), clip: {x:0,y:0,width:1920,height:1080} });
    console.log('rendered', label, i);
  }
  await browser.close();
  console.log('CONSOLE ERRORS:', errs.length ? errs : 'none');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
