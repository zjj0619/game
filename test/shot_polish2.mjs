import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, copyFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../app/dist', import.meta.url));
const OUT = fileURLToPath(new URL('../shots', import.meta.url));
mkdirSync(OUT, { recursive: true });
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.svg':'image/svg+xml','.json':'application/json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = join(ROOT, p);
  if (!fp.startsWith(ROOT) || !existsSync(fp)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' });
  res.end(readFileSync(fp));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required','--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 720 } });
await page.addInitScript(() => { window.__ZLJ_TEST = { auto: true, tut: false, holdPop: false, lineMs: 0 }; });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.click('text=山海闯关');
await page.waitForTimeout(700);

// Unlock false dawn secret + some stages
await page.evaluate(() => {
  const S = window.__zlj.S;
  S.act = S.act || {};
  S.act.cleared = S.act.cleared || {};
  for (let i = 1; i <= 10; i++) S.act.cleared['jincheng_' + i] = { rating: 'S', stars: 3 };
  for (let i = 1; i <= 5; i++) S.act.cleared['qingqiu_' + i] = { rating: 'A', stars: 2 };
  S.inv = Object.assign(S.inv || {}, {
    k_false_dawn: 1, k_keepsake_baiji: 1, k_lamp_cursed: 1, k_letter_sealed: 1,
    k_scale_dream: 1, k_scale_black: 1, k_scale_gold: 1, k_xiangliu_tear: 1,
  });
  S.flags = Object.assign(S.flags || {}, {
    kids_lamp: true, baiji_protected: true, read_sealed: true, xl_bond: true,
    path_night: true, path_day: true, xiangliu_spared: true,
  });
  window.__zlj.game.hub();
});
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, 'hub.png') });

await page.evaluate(() => {
  const n = [...document.querySelectorAll('.tile,.htile,button')].find(x => (x.textContent||'').includes('信物秘境'));
  if (n) n.click();
});
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, 'secret.png') });
console.log('secret cls', await page.evaluate(() => document.querySelector('.screen')?.className));
console.log('unlocked cards', await page.evaluate(() => [...document.querySelectorAll('.sec-c:not(.lock)')].map(x => x.textContent.slice(0,40))));

// Isolated clear card page
await page.evaluate(() => {
  const app = document.getElementById('app') || document.body;
  app.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'screen result win';
  wrap.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0a0806;';
  const bg = document.createElement('div');
  bg.style.cssText = 'position:absolute;inset:0;background:url(assets/bg/jincheng.webp) center/cover;filter:brightness(.4);';
  wrap.appendChild(bg);
  const box = document.createElement('div');
  box.className = 'rs-box';
  box.style.cssText = 'position:relative;z-index:1;display:flex;gap:2.5rem;align-items:center;';
  box.innerHTML = `
    <div class="rs-l">
      <div class="rs-title">闯 关 成 功</div>
      <div class="rs-rank rS">S</div>
      <div class="rs-name">秘境·纸日旷野</div>
      <div class="rs-stats"><span>用时 2:18</span><span>最高连击 42</span><span>击败 28</span><span>受击 3</span></div>
      <div id="clear-card" class="rs-card">
        <img class="rs-card-bg" src="assets/cg/key_clearcard.webp" alt=""/>
        <div class="rs-card-t">通 关 札</div>
        <div class="rs-card-rank">S</div>
        <div class="rs-card-name">秘境·纸日旷野</div>
        <div class="rs-card-row"><em>用时</em><b>2:18</b></div>
        <div class="rs-card-row"><em>最高连击</em><b>42</b></div>
        <div class="rs-card-row"><em>梦层切换</em><b>3 次</b></div>
        <div class="rs-card-row"><em>灯火共鸣</em><b>5 次</b></div>
        <div class="rs-card-row"><em>烛瞳破弱点</em><b>7 处</b></div>
        <div class="rs-card-row"><em>秘匣</em><b>2 个</b></div>
        <div class="rs-card-row"><em>梦屑</em><b>36</b></div>
        <div class="rs-card-row"><em>两层皆历</em><b>✓</b></div>
        <div class="rs-card-s">《烛龙纪·长夜山海》</div>
        <button class="rs-share" type="button">✦ 收进画廊</button>
      </div>
    </div>
    <div class="rs-r">
      <img class="rs-reward" src="assets/cg/key_reward_popup.webp" alt="" style="max-width:280px;opacity:.9"/>
      <div class="rs-gain"><b>✦ 1280</b><b>经验 +640</b><b class="dust">梦屑 +36</b><em class="sbonus">S · 丰厚赏赐</em><em>首次通关</em></div>
    </div>`;
  wrap.appendChild(box);
  app.appendChild(wrap);
});
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, 'clearcard.png') });

// adventure shot
await page.evaluate(() => { window.__zlj.game.hub(); });
await page.waitForTimeout(400);
await page.evaluate(() => {
  const n = [...document.querySelectorAll('.tile,.htile')].find(x => (x.textContent||'').includes('山海闯关'));
  if (n) n.click();
});
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, 'adventure.png') });

// BGM smoke: dynamic import audio
const bgm = await page.evaluate(async () => {
  // trigger play via hub already; create Audio ourselves to verify decode
  const names = ['theme_title','theme_hub','theme_battle','theme_boss','theme_dream','theme_ending','theme_jincheng'];
  const out = {};
  for (const n of names) {
    try {
      const a = new Audio('assets/music/' + n + '.mp3');
      a.volume = 0.01;
      await a.play();
      out[n] = { ok: true, dur: a.duration, paused: a.paused };
      a.pause();
    } catch (e) { out[n] = { ok: false, err: String(e) }; }
  }
  return out;
});
console.log('bgm play', bgm);
writeFileSync(join(OUT, 'bgm_play.json'), JSON.stringify(bgm, null, 2));

const sizes = Object.fromEntries(['hub.png','secret.png','clearcard.png','adventure.png'].map(f => [f, statSync(join(OUT, f)).size]));
console.log('sizes', sizes);
await browser.close(); server.close();
