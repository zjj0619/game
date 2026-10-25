import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../app/dist', import.meta.url));
const OUT = fileURLToPath(new URL('../docs/premium_polish2', import.meta.url));
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.png')) unlinkSync(join(OUT, f));
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf' };
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = join(ROOT, p);
  if (!fp.startsWith(ROOT) || !existsSync(fp)) { res.writeHead(404); res.end('no'); return; }
  try { res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' }); res.end(readFileSync(fp)); }
  catch { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required','--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push('PE:' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CE:' + m.text()); });
await page.addInitScript(() => { window.__ZLJ_TEST = { auto: true, tut: false, holdPop: false, lineMs: 0, actBot: true }; });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const shot = async (name) => {
  const path = join(OUT, name + '.png');
  await page.screenshot({ path, type: 'png' });
  console.log('shot', name, (statSync(path).size/1024).toFixed(0)+'KB', await page.evaluate(() => [...document.querySelectorAll('.screen')].map(s=>s.className).join(' | ')));
};

await page.waitForSelector('.t-tap-bar', { timeout: 8000 });
await shot('01_title');

// newGame then seed + hub
await page.evaluate(() => { window.__zlj.game.newGame(); });
await page.waitForTimeout(400);
await page.evaluate(() => {
  const S = window.__zlj.S;
  S.chapter = '第二章 · 青丘狐火'; S.gold = 5200;
  if (S.party.yangui) S.party.yangui.lv = 16;
  Object.assign(S.act, { tower: 18, team: ['yangui'], tut: { controls: true, lamp: true, eye: true, dream: true, reso: true, tower: true }, dust: 28, heroes: ['yangui'] });
  for (let i = 1; i <= 10; i++) { S.act.cleared['jincheng_' + i] = 1; S.act.best['jincheng_' + i] = 'S'; }
  for (let i = 1; i <= 4; i++) { S.act.cleared['qingqiu_' + i] = 1; S.act.best['qingqiu_' + i] = 'A'; }
  window.__zlj.game.hub();
});
await page.waitForTimeout(600);
await page.waitForSelector('.hub-grid.slim', { timeout: 5000 });
await shot('02_hub');

await page.evaluate(() => {
  const st = window.__zlj.STAGES['qingqiu_5'];
  window.__zlj.launch(st, { team: ['yangui'] }).catch(e => console.error('launch fail', e));
});
await page.waitForFunction(() => !!document.querySelector('.screen.action'), { timeout: 12000 });
await page.waitForTimeout(1600);
await page.evaluate(() => { for (const s of [...document.querySelectorAll('.screen')]) if (!s.classList.contains('action')) s.remove(); });
await shot('03_action');

await page.evaluate(() => {
  const app = document.getElementById('app'); app.innerHTML = '';
  const root = document.createElement('div'); root.className = 'screen vn';
  root.innerHTML = `<div class="vn-bg" style="background-image:url(assets/bg/jincheng.webp);opacity:1;position:absolute;inset:0;background-size:cover"></div>
    <div class="vn-chars" style="position:absolute;inset:0"><div class="vn-char" style="position:absolute;bottom:0;left:12%;height:100%"><img src="assets/por/yangui.webp" alt="" style="height:92%;display:block"></div></div>
    <div class="vn-box"><div class="vn-face"></div><div class="vn-name">言归</div>
    <div class="vn-text">灯还没灭。我们往青丘走——长夜很长，但还有人在等。</div>
    <div class="vn-next">▼</div></div>`;
  app.appendChild(root);
});
await page.waitForTimeout(400);
await shot('04_vn');

console.log('errs', errs.slice(0, 12));
await browser.close(); server.close();
