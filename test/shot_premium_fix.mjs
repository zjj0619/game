import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../app/dist', import.meta.url));
const OUT = fileURLToPath(new URL('../docs/premium_fix', import.meta.url));
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

await page.evaluate(() => { window.__zlj.game.newGame(); });
await page.waitForTimeout(400);
await page.evaluate(() => {
  const S = window.__zlj.S;
  if (window.__zlj.settings) window.__zlj.settings.fx = 1;
  S.chapter = '第二章 · 青丘狐火'; S.gold = 5200;
  if (S.party.yangui) S.party.yangui.lv = 16;
  Object.assign(S.act, { tower: 18, team: ['yangui'], tut: { controls: true, lamp: true, eye: true, dream: true, reso: true, tower: true }, dust: 28, heroes: ['yangui'] });
  for (let i = 1; i <= 10; i++) { S.act.cleared['jincheng_' + i] = 1; S.act.best['jincheng_' + i] = 'S'; }
  for (let i = 1; i <= 4; i++) { S.act.cleared['qingqiu_' + i] = 1; S.act.best['qingqiu_' + i] = 'A'; }
  window.__zlj.game.hub();
});
await page.waitForSelector('.hub-grid.slim', { timeout: 5000 });
await page.waitForTimeout(500);
const hubPor = await page.evaluate(() => document.querySelector('.hh-por')?.getAttribute('src') || '');
console.log('hubPor', hubPor);
if (/yangui_lamp\.webp/.test(hubPor) && !/lamp_por/.test(hubPor)) throw new Error('HUB STILL CHIBI: ' + hubPor);
await shot('02_hub');

// open 更多
await page.evaluate(() => {
  const t = [...document.querySelectorAll('.htile b')].find(b => b.textContent === '更多');
  t?.closest('.htile')?.click();
});
await page.waitForSelector('.hub-more .hm-row', { timeout: 4000 });
await page.waitForTimeout(350);
await shot('03_hub_more');
await page.evaluate(() => { document.querySelector('.hub-more .close')?.click(); });
await page.waitForTimeout(200);

// Action combat (normal)
await page.evaluate(() => {
  const st = window.__zlj.STAGES['qingqiu_5'] || window.__zlj.STAGES['jincheng_3'] || Object.values(window.__zlj.STAGES || {})[0];
  window.__zlj.launch(st, { team: ['yangui'] }).catch(e => console.error('launch fail', e));
});
await page.waitForFunction(() => !!document.querySelector('.screen.action'), { timeout: 12000 });
await page.waitForTimeout(1400);
await page.evaluate(() => { for (const s of [...document.querySelectorAll('.screen')]) if (!s.classList.contains('action')) s.remove(); });
await shot('05_action');

// Action VFX — readable burst: clear banners, pause bot spam, mid-slash frame
await page.evaluate(() => {
  if (window.__zlj.settings) window.__zlj.settings.fx = 1;
  window.__ZLJ_TEST.actBot = false;
  document.querySelectorAll('.ak-msg,.ak-phase,.ak-mile,.ak-cutin').forEach(el => { el.classList.remove('on'); el.textContent = ''; el.remove(); });
  const act = window.__act;
  if (act) {
    // clear lingering fx so burst is the only VFX
    if (Array.isArray(act.fx)) act.fx.length = 0;
  }
  window.__ZLJ_TEST.fxBurst = Date.now();
});
await page.waitForTimeout(70);
await shot('06_action_vfx');
await page.evaluate(() => { window.__ZLJ_TEST.fxBurst = 0; document.querySelector('.screen.action')?.remove(); });

// VN with pose
await page.evaluate(() => {
  const app = document.getElementById('app'); app.innerHTML = '';
  const root = document.createElement('div'); root.className = 'screen vn';
  root.innerHTML = `<div class="vn-bg" style="background-image:url(assets/bg/qingqiu_forest.webp);opacity:1;position:absolute;inset:0;background-size:cover"></div>
    <div class="vn-chars" style="position:absolute;inset:0"><div class="vn-char" data-id="yangui" style="position:absolute;bottom:0;left:8%;height:100%"><img src="assets/por/pose/yangui_think.webp" alt="" style="height:94%;display:block"></div></div>
    <div class="vn-box"><div class="vn-face on" style="background-image:url(assets/por/pose/yangui_think.webp)"></div><div class="vn-name">言归</div>
    <div class="vn-text">灯火在雾里晃。青丘的狐……是在等我，还是在等灯熄？</div>
    <div class="vn-next">▼</div></div>`;
  app.appendChild(root);
});
await page.waitForTimeout(350);
await shot('04_vn');

// result with smile pose
await page.evaluate(() => {
  const app = document.getElementById('app'); app.innerHTML = '';
  const root = document.createElement('div'); root.className = 'screen result win';
  root.innerHTML = `<div class="hub-bg" style="background-image:url(assets/bg/qingqiu_forest.webp);position:absolute;inset:0;background-size:cover"></div>
    <div class="hub-shade" style="position:absolute;inset:0;background:rgba(5,6,14,.45)"></div>
    <img class="rs-hero" src="assets/por/pose/yangui_smile.webp" alt="">
    <div class="rs-box"><div class="rs-l"><div class="rs-title">闯 关 成 功</div><div class="rs-rank rS">S</div>
    <div class="rs-stars"><i class="on">★</i><i class="on">★</i><i class="on">★</i></div>
    <div class="rs-name">狐冢</div>
    <div class="rs-stats"><span>用时 3:12</span><span>最高连击 36</span><span>击败 22</span><span>受击 4</span></div></div>
    <div class="rs-r"><div class="rs-react"><div class="rs-rline"><b>白际：</b>狐冢的灯……别走太远。</div></div>
    <div class="rs-items"><div class="rs-it">青铜 ×2</div><div class="rs-it">狐火穗 ×1</div></div>
    <div class="rs-btns"><button class="btn">返回</button><button class="btn gold">下一关 ▶</button></div></div></div>`;
  app.appendChild(root);
});
await page.waitForTimeout(400);
await shot('07_result');

console.log('errs', errs.slice(0, 12));
console.log('shots', readdirSync(OUT).filter(f => f.endsWith('.png')).sort().join(','));
await browser.close(); server.close();
