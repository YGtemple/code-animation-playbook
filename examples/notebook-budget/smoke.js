// smoke.js —— 渲关键帧到 qc/smoke_*.png，目检布局/NaN。
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const DIR = __dirname;
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const INDEX = 'file://' + path.join(DIR, 'index.html');

const KEYS = [
  ['01_open', 1.0], ['02_title', 4.0], ['03_note', 4.7], ['04_r1', 8.5],
  ['05_r2r3', 16.5], ['06_r4', 20.5], ['07_detail', 23.8], ['08_expense', 26.5],
  ['09_reveal', 29.0]
];

(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox','--disable-dev-shm-usage','--force-color-profile=srgb','--hide-scrollbars','--disable-gpu'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR '+e));
  await p.goto(INDEX, { timeout: 30000 });
  await p.evaluate(async () => { await Promise.all([document.fonts.load('100px WenKai'),document.fonts.load('100px KuaiLe')]); await document.fonts.ready; });
  for (const [name, tt] of KEYS) {
    await p.evaluate(x => window.render(x), tt);
    const nan = await p.evaluate(()=>{let b=0;document.querySelectorAll('svg *').forEach(e=>{for(const a of['x','y','cx','cy','width','height','d','transform']){const v=e.getAttribute(a);if(v&&/\bNaN\b/.test(v))b++;}});return b;});
    await p.screenshot({ path: path.join(DIR,'qc','smoke_'+name+'.png'), clip:{x:0,y:0,width:1920,height:1080} });
    console.log(name, 't='+tt, 'NaN='+nan);
  }
  console.log('ERRORS:', errs.slice(0,10));
  await b.close();
})();
