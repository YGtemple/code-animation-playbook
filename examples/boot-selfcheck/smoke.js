// smoke.js —— 只渲染若干代表帧到 qc/smoke_*.png，供目检（不写 frames/）。
const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/temple/Doubao/chats/2026-10-05/new-chat-4/code-animation-playbook/node_modules/playwright-core');
const { T } = require('./timeline.js');
const DIR = __dirname;
const INDEX = 'file://' + path.join(DIR, 'index.html');
const QDIR = path.join(DIR, 'qc');
fs.mkdirSync(QDIR, { recursive: true });

const frames = [20, 70, 100, 160, 250, 360, 450, 560, 650, 675, 720, 810, 860, 885];

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb', '--hide-scrollbars', '--disable-gpu']
  });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e));
  await p.goto(INDEX, { timeout: 30000 });
  await p.evaluate(async () => { await document.fonts.ready; });
  for (const i of frames) {
    await p.evaluate(tt => window.render(tt), i / T.fps);
    await p.screenshot({ path: path.join(QDIR, `smoke_${String(i).padStart(4, '0')}.png`), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }
  console.log('console errors:', errs);
  await browser.close();
  console.log('smoke done');
})();
