import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../app/dist', import.meta.url));
const OUT = fileURLToPath(new URL('../docs/premium_polish', import.meta.url));
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
page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => { window.__ZLJ_TEST = { auto: true, tut: false, holdPop: false, lineMs: 0, actBot: true }; });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const shot = async (name) => {
  const path = join(OUT, name + '.png');
  await page.screenshot({ path, type: 'png' });
  console.log('shot', name, (statSync(path).size/1024).toFixed(0)+'KB', await page.evaluate(() => [...document.querySelectorAll('.screen')].map(s=>s.className).join(' | ')));
};

await shot('01_title');
await page.getByText('山海闯关', { exact: true }).click();
await page.waitForTimeout(700);
await page.evaluate(() => {
  const S = window.__zlj.S;
  S.chapter = '第二章 · 青丘狐火'; S.gold = 5200;
  if (S.party.yangui) S.party.yangui.lv = 16;
  Object.assign(S.act, { tower: 18, team: ['yangui'], tut: { controls: true, lamp: true, eye: true, dream: true, reso: true, tower: true }, dust: 28, heroes: ['yangui'] });
  for (let i = 1; i <= 10; i++) { S.act.cleared['jincheng_' + i] = 1; S.act.best['jincheng_' + i] = 'S'; }
  for (let i = 1; i <= 4; i++) { S.act.cleared['qingqiu_' + i] = 1; S.act.best['qingqiu_' + i] = 'A'; }
  window.__zlj.game.hub();
});
await page.waitForTimeout(500);
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
  const root = document.createElement('div'); root.className = 'screen result win';
  root.innerHTML = `<div class="rs-box"><div class="rs-l"><div class="rs-title">闯 关 成 功</div><div class="rs-rank rS">S</div>
    <div class="rs-stars"><i class="on" style="animation-delay:.15s">★</i><i class="on" style="animation-delay:.27s">★</i><i class="on" style="animation-delay:.39s">★</i></div>
    <div class="rs-name">狐冢</div>
    <div class="rs-stats"><span>用时 3:12</span><span>最高连击 36</span><span>击败 22</span><span>受击 4</span></div></div>
    <div class="rs-r"><div class="rs-react"><div class="rs-rline"><b>白际：</b>狐冢的灯……别走太远。</div>
    <div class="rs-rline"><b>夜归：</b>这里的灯芯比烬城更烫。</div></div>
    <div class="rs-items"><div class="rs-it">青铜 ×2</div><div class="rs-it">狐火穗 ×1</div></div>
    <div class="rs-btns"><button class="btn">返回</button><button class="btn gold">下一关 ▶</button></div></div></div>`;
  app.appendChild(root);
});
await page.waitForTimeout(450);
await shot('04_result');

await page.evaluate(() => {
  const app = document.getElementById('app'); app.innerHTML = '';
  const root = document.createElement('div'); root.className = 'screen vn';
  root.innerHTML = `<div class="vn-bg" style="background-image:url(assets/bg/jincheng.webp);opacity:1;position:absolute;inset:0;background-size:cover"></div>
    <div class="vn-chars" style="position:absolute;inset:0"><div class="vn-char" style="position:absolute;bottom:0;left:12%"><img src="assets/por/yangui.webp" alt="" style="height:88%"></div></div>
    <div class="vn-box"><div class="vn-face"></div><div class="vn-name">言归</div>
      <div class="vn-text">灯芯还亮着。长夜未尽，我们再往前走一步。</div><div class="vn-next">◆</div></div>`;
  app.appendChild(root);
});
await page.waitForTimeout(400);
await shot('05_vn');

const boot = await page.evaluate(() => { window.__zlj.game.hub(); return { mode: window.__zlj.S?.mode }; });
console.log('boot-hub', boot, 'errs', errs.slice(0, 5));
await browser.close(); server.close();
console.log('files', readdirSync(OUT).join(','));
