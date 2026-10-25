import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../app/dist', import.meta.url));
const OUT = fileURLToPath(new URL('../docs/polish_mid', import.meta.url));
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
page.on('console', m => { if (m.type() === 'error' || /launch|action|err/i.test(m.text())) console.log('PAGE', m.type(), m.text()); });
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.addInitScript(() => { window.__ZLJ_TEST = { auto: true, tut: false, holdPop: false, lineMs: 0, actBot: true }; });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const shot = async (name) => {
  const path = join(OUT, name + '.png');
  await page.screenshot({ path, type: 'png' });
  console.log('shot', name, (statSync(path).size/1024).toFixed(0)+'KB', await page.evaluate(() => document.querySelector('.screen')?.className || '?'));
};

await page.getByText('山海闯关', { exact: true }).click();
await page.waitForTimeout(900);

await page.evaluate(() => {
  const S = window.__zlj.S;
  S.chapter = '第二章 · 青丘狐火';
  S.gold = 5200;
  if (S.party.yangui) S.party.yangui.lv = 16;
  Object.assign(S.act, {
    tower: 18, team: ['yangui'],
    tut: { controls: true, lamp: true, eye: true, dream: true, reso: true, tower: true },
    dust: 28, heroes: ['yangui'],
  });
  for (let i = 1; i <= 10; i++) { S.act.cleared['jincheng_' + i] = 1; S.act.best['jincheng_' + i] = 'S'; }
  for (let i = 1; i <= 4; i++) { S.act.cleared['qingqiu_' + i] = 1; S.act.best['qingqiu_' + i] = 'A'; }
  window.__zlj.game.hub();
});
await page.waitForTimeout(500);
await shot('01_hub');

await page.evaluate(() => {
  const n = [...document.querySelectorAll('.htile,.tile')].find(x => (x.textContent||'').includes('山海闯关'));
  n?.click();
});
await page.waitForTimeout(600);
await page.evaluate(() => {
  const tab = [...document.querySelectorAll('.adv-tab')].find(x => (x.textContent||'').includes('青丘'));
  tab?.click();
});
await page.waitForTimeout(600);
await shot('02_qingqiu_map');

await page.evaluate(() => {
  const n = [...document.querySelectorAll('.snode')].find(x => (x.textContent||'').includes('狐冢'));
  n?.click();
});
await page.waitForTimeout(500);
await shot('03_signature_detail');

// Close detail, then launch via API without awaiting (fire-and-forget)
const info = await page.evaluate(() => {
  document.querySelectorAll('.panel-wrap').forEach(p => p.remove());
  const st = window.__zlj.STAGES['qingqiu_5'];
  const has = !!(window.__zlj.launch && st);
  if (has) {
    // don't await — leave action running for shots
    window.__zlj.launch(st, { team: ['yangui'] }).catch(e => console.error('launch fail', e));
  }
  return { has, id: st?.id, name: st?.name, arenas: st?.arenas?.length, sig: !!st?.signature, plats: !!st?.arenas?.[0]?.platsLayout };
});
console.log('launch info', info);

await page.waitForFunction(() => !!document.querySelector('.screen.action'), { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(1800);
console.log('cls', await page.evaluate(() => document.querySelector('.screen')?.className));
await shot('04_action_fox_tomb');

await page.evaluate(() => document.querySelector('.ak-eye')?.click());
await page.waitForTimeout(450);
await shot('05_eye_ux');

await page.evaluate(() => document.querySelector('.ak-dream')?.click());
await page.waitForTimeout(600);
await shot('06_dream_ux');

// Result with reactions
await page.evaluate(() => {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'screen result win';
  root.innerHTML = `<div class="rs-box"><div class="rs-l"><div class="rs-title">闯 关 成 功</div><div class="rs-rank rS">S</div><div class="rs-name">狐冢</div>
    <div class="rs-stats"><span>用时 3:12</span><span>最高连击 36</span><span>击败 22</span><span>受击 4</span></div></div>
    <div class="rs-r"><div class="rs-unl"><div>✧ 招牌关踏破 · 狐冢</div><div>✧ 关间·狐火穗：林间掉下一枚狐火穗。</div></div>
    <div class="rs-react"><div class="rs-rline"><b>白际：</b>狐冢的灯……别走太远。我闻得到狐火里的旧名字。</div>
    <div class="rs-rline"><b>夜归：</b>这里的灯芯比烬城更烫。盯着脚下的光。</div></div>
    <div class="rs-items"><div class="rs-it">青铜 ×2</div><div class="rs-it">狐火穗 ×1</div></div></div></div>`;
  app.appendChild(root);
});
await page.waitForTimeout(250);
await shot('07_result_reactions');

await browser.close();
server.close();
console.log('files', readdirSync(OUT).join(','));
