import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, statSync, copyFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../app/dist', import.meta.url));
const OUT = fileURLToPath(new URL('../docs/final_shots', import.meta.url));
mkdirSync(OUT, { recursive: true });
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf' };
function statOk(fp){ try { return statSync(fp).isFile(); } catch { return false; } }
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = join(ROOT, p);
  if (!fp.startsWith(ROOT) || !existsSync(fp) || !statOk(fp)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' });
  res.end(readFileSync(fp));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const VW = 844, VH = 390;
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required','--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
await page.addInitScript(() => { window.__ZLJ_TEST = { auto: true, tut: false, holdPop: false, lineMs: 0 }; });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const shot = async (name) => {
  const path = join(OUT, name + '.png');
  await page.screenshot({ path, type: 'png' });
  console.log('shot', name, (statSync(path).size/1024).toFixed(0)+'KB', await page.evaluate(() => document.querySelector('.screen')?.className || '?'));
};

await shot('01_title');
await page.getByText('山海闯关', { exact: true }).click();
await page.waitForTimeout(1000);

await page.evaluate(() => {
  const S = window.__zlj.S;
  const meta = window.__zlj.meta;
  S.chapter = '第一章 · 烬城灯影';
  S.gold = 3200;
  if (S.party.yangui) S.party.yangui.lv = 12;
  Object.assign(S.act, {
    tower: 18, team: ['yangui'],
    pets: { yegui: { base: 'yegui', lv: 6, exp: 0, star: 1 } }, pet: 'yegui',
    souls: { yegui: 4, dengyan: 2 }, dust: 40, heroes: ['yangui'],
    seen: { yegui: 1, dengyan: 1, humei: 1 },
    tut: { controls: true, lamp: true, eye: true, dream: true, reso: true, tower: true },
  });
  for (let i = 1; i <= 10; i++) { S.act.cleared['jincheng_' + i] = 1; S.act.best['jincheng_' + i] = i >= 7 ? 'S' : 'A'; }
  for (let i = 1; i <= 6; i++) { S.act.cleared['qingqiu_' + i] = 1; S.act.best['qingqiu_' + i] = 'A'; }
  Object.assign(S.inv, {
    k_false_dawn: 1, k_keepsake_baiji: 1, k_lamp_cursed: 1, k_letter_sealed: 1,
    k_scale_dream: 1, k_scale_black: 1, k_scale_gold: 1, k_xiangliu_tear: 1,
    m_bone: 14, m_fur: 10, m_feather: 8, m_ink: 7, m_bronze: 6, m_herb: 5, m_fang: 5, m_silk: 4, m_scale: 4,
  });
  Object.assign(S.flags, { kids_lamp: true, baiji_protected: true, read_sealed: true, xl_bond: true, path_night: true, path_day: true, xiangliu_spared: true });
  S.city = { lamp: 2, forge: 2, herb: 2, beast: 2, market: 1 };
  for (const e of ['A', 'E']) if (!meta.endings.includes(e)) meta.endings.push(e);
  window.__zlj.game.hub();
});
await page.waitForTimeout(700);
await shot('02_hub');

await page.locator('.htile.t-adv').click();
await page.waitForTimeout(900);
await shot('03_adventure');

await page.evaluate(() => window.__zlj.game.hub());
await page.waitForTimeout(500);
await page.locator('.htile.t-secret').click();
await page.waitForTimeout(900);
await shot('04_secret');

await page.evaluate(() => window.__zlj.game.hub());
await page.waitForTimeout(400);
await page.locator('.htile.t-pet').click();
await page.waitForTimeout(900);
await shot('05_pets');

await page.evaluate(() => {
  const app = document.getElementById('app') || document.body;
  app.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'screen result win';
  wrap.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0a0806;overflow:hidden;';
  wrap.innerHTML = `
    <div style="position:absolute;inset:0;background:url(assets/bg/jincheng.webp) center/cover;filter:brightness(.42)"></div>
    <div class="rs-box" style="position:relative;z-index:1;transform:scale(.78);transform-origin:center">
      <div class="rs-l">
        <div class="rs-title">闯 关 成 功</div>
        <div class="rs-rank rS">S</div>
        <div class="rs-name">烬城 · 灯芯初燃</div>
        <div id="clear-card" class="rs-card">
          <img class="rs-card-bg" src="assets/cg/key_clearcard.webp" alt=""/>
          <div class="rs-card-t">通 关 札</div>
          <div class="rs-card-rank">S</div>
          <div class="rs-card-name">烬城 · 灯芯初燃</div>
          <div class="rs-card-row"><em>用时</em><b>1:42</b></div>
          <div class="rs-card-row"><em>最高连击</em><b>28</b></div>
          <div class="rs-card-row"><em>梦层切换</em><b>2 次</b></div>
          <div class="rs-card-row"><em>烛瞳破弱点</em><b>5 处</b></div>
          <div class="rs-card-s">《烛龙纪·长夜山海》</div>
        </div>
      </div>
    </div>`;
  app.appendChild(wrap);
});
await page.waitForTimeout(500);
await shot('06_clearcard');

await browser.close();
server.close();
console.log('done');
