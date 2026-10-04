// render_frames.js —— 逐帧渲染 900 张 PNG；断点续渲，页面/浏览器崩溃均自动重建重试。
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const { T } = require('./timeline.js');
const TOTAL = T.duration * T.fps;
const WORKERS = Number(process.env.WORKERS || 2);
const DIR = __dirname;
const INDEX = 'file://' + path.join(DIR, 'index.html');
const FRAME_DIR = path.join(DIR, 'frames');

const frameName = i => `frame_${String(i).padStart(4, '0')}.png`;
const framePath = i => path.join(FRAME_DIR, frameName(i));

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/local/bin/chromium';

let browser = null, context = null;

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
      // 主动收集 console error / pageerror（P1：SVG NaN 静默）
      const errs = [];
      p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      p.on('pageerror', e => errs.push(String(e)));
      await p.goto(INDEX, { timeout: 30000 });
      await p.evaluate(async () => {
        await Promise.all([
          document.fonts.load('100px OrbitronF'), document.fonts.load('100px MonoF'),
          document.fonts.load('100px TermF'), document.fonts.load('100px ZCOOL')
        ]);
        await document.fonts.ready;
      });
      p.__errs = errs;
      if (needCues) {
        const cues = await p.evaluate(() => window.SFX_CUES);
        fs.writeFileSync(path.join(DIR, 'sfx_cues.json'), JSON.stringify(cues));
        console.log('SFX cues:', cues.length);
      }
      return p;
    } catch (e) {
      console.log('freshPage failed, relaunch browser:', String(e).split('\n')[0]);
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
    // NaN 断言（P1）：遍历所有几何属性
    const nanCount = await p.evaluate(() => {
      let bad = 0;
      document.querySelectorAll('#stage *').forEach(el => {
        for (const a of ['x','y','x1','y1','x2','y2','cx','cy','r','width','height','d','stdDeviation','scale']) {
          const v = el.getAttribute(a);
          if (v && /\bNaN\b/.test(v)) bad++;
        }
        const tr = el.getAttribute('transform');
        if (tr && /\bNaN\b/.test(tr)) bad++;
      });
      return bad;
    });
    if (nanCount > 0) throw new Error('NaN attributes on frame ' + i);
    if (p.__errs && p.__errs.length) {
      console.log('console errors on frame', i, p.__errs.slice(0, 3));
    }
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
      if (i % 50 === 0) console.log(`w${wid} frame ${i}`);
    }
    try { await page.close(); } catch (_) {}
  }

  await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)));
  try { await browser.close(); } catch (_) {}
  const have = fs.readdirSync(FRAME_DIR).filter(f => f.endsWith('.png')).length;
  console.log('DONE frames:', have);
  if (have !== TOTAL) process.exitCode = 3;
})().catch(e => { console.error('FATAL', e); process.exit(1); });
