// smoke.js —— 只渲若干关键帧到 qc/，用于布局目检。
const { chromium } = require('playwright-core');
const path = require('path'); const fs = require('fs');
const { T } = require('./timeline.js');
const DIR = __dirname;
const INDEX = 'file://' + path.join(DIR, 'index.html');
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const KEY = [0, 150, 300, 480, 600, 720, 850];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox','--disable-dev-shm-usage','--force-color-profile=srgb','--hide-scrollbars','--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', String(e).split('\n')[0]));
  p.on('console', m => { if (m.type()==='error') console.log('CONSOLE-ERR:', m.text()); });
  await p.goto(INDEX, { timeout: 30000 });
  await p.evaluate(async () => {
    await Promise.all([document.fonts.load('100px KuaiLe'), document.fonts.load('100px HuangYou'), document.fonts.load('100px Noto')]);
    await document.fonts.ready;
  });
  fs.mkdirSync(path.join(DIR,'qc'), { recursive: true });
  for (const i of KEY) {
    await p.evaluate(tt => window.render(tt), i / T.fps);
    await p.screenshot({ path: path.join(DIR, 'qc', 'smoke_' + String(i).padStart(4,'0') + '.png'),
      clip: { x:0,y:0,width:1920,height:1080 } });
    const bad = await p.evaluate(() => { const b=[]; document.querySelectorAll('svg *').forEach(n=>{ for(const a of ['x','y','cx','cy','r','d','transform']){ const v=n.getAttribute(a); if(v&&/\bNaN\b/.test(v)) b.push(n.tagName+'.'+a);} }); return b.slice(0,3); });
    console.log('frame', i, 'NaN?', bad.length ? bad : 'none');
  }
  await browser.close();
  console.log('SMOKE DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
