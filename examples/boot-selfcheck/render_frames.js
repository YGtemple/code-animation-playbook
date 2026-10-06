// render_frames.js —— 逐帧渲染 900 张内容 PNG（干净、可压缩）；断点续渲，崩溃自动重建。
// 胶片颗粒/划痕/暗角/抖动由 filmify.py 统一后处理，本脚本只出“内容帧”。
const path = require('path');
const fs = require('fs');
// playwright-core 直接指向共享仓库的 node_modules（避免复制占磁盘）
const { chromium } = require('C:/Users/temple/Doubao/chats/2026-10-05/new-chat-4/code-animation-playbook/node_modules/playwright-core');

const { T } = require('./timeline.js');
const TOTAL = T.duration * T.fps;
const WORKERS = Number(process.env.WORKERS || 2);
const DIR = __dirname;
const INDEX = 'file://' + path.join(DIR, 'index.html');
const FRAME_DIR = path.join(DIR, 'frames');

const frameName = i => `frame_${String(i).padStart(4, '0')}.png`;
const framePath = i => path.join(FRAME_DIR, frameName(i));

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let browser = null, context = null;
const consoleErrs = [];

async function launchBrowser() {
  try { if (browser) await browser.close(); } catch (_) {}
  browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--force-color-profile=srgb', '--hide-scrollbars', '--disable-gpu',
      '--js-flags=--max-old-space-size=1536', '--renderer-process-limit=4']
  });
  browser.on('disconnected', () => { browser = null; context = null; });
  context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
}

async function freshPage(needCues) {
  for (let tries = 0; tries < 3; tries++) {
    try {
      if (!browser || !context) await launchBrowser();
      const p = await context.newPage();
      p.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
      p.on('pageerror', e => consoleErrs.push('PAGEERROR: ' + String(e)));
      await p.goto(INDEX, { timeout: 30000 });
      await p.evaluate(async () => {
        await Promise.all([
          document.fonts.load('100px PlayfairF'),
          document.fonts.load('100px SimSun'),
        ]);
        await document.fonts.ready;
      });
      // 主动断言无 NaN
      const nanCount = await p.evaluate(() => {
        let n = 0;
        document.querySelectorAll('*').forEach(e => {
          for (const a of e.attributes) { if (/transform|x|y|cx|cy|d|width|height/.test(a.name) && /nan/i.test(a.value)) n++; }
        });
        return n;
      });
      if (nanCount) console.log('!! NaN attrs detected:', nanCount);
      if (needCues) {
        const cues = await p.evaluate(() => window.SFX_CUES);
        fs.writeFileSync(path.join(DIR, 'sfx_cues.json'), JSON.stringify(cues));
        console.log('SFX cues:', cues.length);
      }
      return p;
    } catch (e) {
      console.log('freshPage failed, relaunch:', String(e).split('\n')[0]);
      try { if (browser) await browser.close(); } catch (_) {}
      browser = null; context = null;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('could not create a page after retries');
}

(async () => {
  fs.mkdirSync(FRAME_DIR, { recursive: true });
  let queue = [];
  for (let i = 0; i < TOTAL; i++) if (!fs.existsSync(framePath(i))) queue.push(i);
  console.log('workers', WORKERS, 'frames to render:', queue.length);
  let ptr = 0;

  async function shoot(p, i) {
    await p.evaluate(tt => window.render(tt), i / T.fps);
    await p.screenshot({ path: framePath(i), clip: { x: 0, y: 0, width: 1920, height: 1080 }, timeout: 30000 });
  }

  async function worker(wid) {
    let page = await freshPage(wid === 0 && !fs.existsSync(path.join(DIR, 'sfx_cues.json')));
    while (ptr < queue.length) {
      const i = queue[ptr++];
      let ok = false;
      for (let attempt = 0; attempt < 6 && !ok; attempt++) {
        try { await shoot(page, i); ok = true; }
        catch (e) {
          console.log(`w${wid} frame ${i} failed (a${attempt + 1}): ${String(e).split('\n')[0]}`);
          try { await page.close(); } catch (_) {}
          await new Promise(r => setTimeout(r, 700));
          page = await freshPage(false);
        }
      }
      if (!ok) { console.log('GIVE UP frame', i); process.exitCode = 3; }
      if (i % 100 === 0) console.log(`w${wid} frame ${i}`);
    }
    try { await page.close(); } catch (_) {}
  }

  await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)));
  try { await browser.close(); } catch (_) {}
  const have = fs.readdirSync(FRAME_DIR).filter(f => f.endsWith('.png')).length;
  console.log('DONE frames:', have);
  if (consoleErrs.length) console.log('CONSOLE ERRORS:', consoleErrs.slice(0, 10));
  if (have !== TOTAL) process.exitCode = 3;
})().catch(e => { console.error('FATAL', e); process.exit(1); });
