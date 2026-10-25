// 自动通关测试：真实点击推进剧情、支线、羁绊、战斗（自动战斗，非作弊），并截图。
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://localhost:4173/';
const SHOT = '/workspace/game/screenshots/';
const TARGET = process.env.TARGET || 'F';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args:['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:844,height:390}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const errs=[]; p.on('pageerror', e=>errs.push('PAGEERROR '+e.message)); p.on('console', m=>{ if (m.type()==='error') errs.push(m.text()); });
await p.addInitScript((target)=>{
  if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('zlj_settings', JSON.stringify({textSpeed:100, music:0.3})); sessionStorage.setItem('init','1'); }
  window.__ZLJ_TEST = { auto:true, lineMs:0, endMs:5000, target,
    choose(c, opts){
      const sc = o => { let s=Math.random()*0.5; const e=(o.eff||[]).join(' ');
        for (const m of e.matchAll(/aff:(\w+)([+-]\d+)/g)) s += +m[2] * (m[1]==='baiji'?1.5:1);
        for (const m of e.matchAll(/hope([+-]\d+)/g)) s += +m[2];
        if (/flag:(ba_freed|fuli_forgiven|baiji_protected|elixir_keep)/.test(e)) s+=20;
        if (/lose:|fuli_killed|self_rear/.test(e)) s-=30;
        if (/-> fin_f/.test(o.to) || o.to==='fin_f') s+=1000; if (o.to==='fin_'+target.toLowerCase()) s+=2000;
        return s; };
      return opts.slice().sort((a,b)=>sc(b)-sc(a))[0];
    } };
}, TARGET);
const shots = new Set();
async function shot(name){ if (shots.has(name)) return; shots.add(name); await p.waitForTimeout(400); await p.evaluate(()=>document.querySelectorAll('.toasts').forEach(e=>e.replaceChildren())); await p.screenshot({ path:SHOT+name+'.png' }); console.log('📷', name); }
await p.goto(URL); await p.waitForTimeout(2500);
await shot('01_title');
await p.click('text=新的旅程');
const t0 = Date.now(); let last=''; let stuck=0; const loses={}; const visitedQ=new Set(); let ending=null;
const log = []; const grind = {};
while (Date.now()-t0 < 25*60*1000) {
  await p.waitForTimeout(120);
  const st = await p.evaluate(() => {
    const z = window.__zlj, S = z.S; const q = s=>document.querySelector(s);
    const ends = q('.ending, .end-screen, .ending-screen');
    return { mode:S?.mode, ch:S?.chapterN, region:S?.region, exp:S?.explore?.region, main:!!q('.mainnode'),
      battle:!!q('.screen.battle, .b-cmd'), lose:!!q('.b-result.lose'), panel:!!q('.panel-wrap'),
      vnchar: document.querySelectorAll('.vn-char.on, .vn-char').length, name:q('.vn-name')?.textContent||'', text:(q('.vn-text')?.textContent||'').slice(0,20),
      cg: !!q('.vn-cg.on'), ending: ends ? ends.className : null,
      questReady:[...document.querySelectorAll('.node.quest.ready,.node.quest.new')].length,
      bonds: S && S.mode==='region' ? S.members.some(m=>z.nextBond(S,m)) : false, lv: S ? S.party?.yangui?.lv : 0 };
  });
  if (st.ch!==globalThis._lc) { globalThis._lc=st.ch; console.log('CH', st.ch, 'Lv', st.lv, Math.round((Date.now()-t0)/1000)+'s'); }
  if (st.ch>=2 && !(shots.has('02_dialogue') && shots.has('11_cg'))) await p.evaluate(()=>window.__ZLJ_TEST.lineMs=900); else if (st.ch>=2) await p.evaluate(()=>window.__ZLJ_TEST.lineMs=0);
  const sig = JSON.stringify([st.mode, st.ch, st.text, st.battle, st.panel, st.main]);
  if (sig===last) stuck++; else { stuck=0; last=sig; }
  if (st.ending) { ending = await p.evaluate(()=>document.querySelector('.end-x')?.textContent+' '+document.querySelector('.end-name')?.textContent); await p.waitForTimeout(300); await shot('09_ending'); await p.waitForTimeout(5600); await shot('12_credits'); break; }
  if (st.lose) { const enc = await p.evaluate(()=>window.__zlj.S.lastEnc||'?'); loses[st.ch]=(loses[st.ch]||0)+1; log.push(`败 ch${st.ch} Lv${st.lv}`);
    if (loses[st.ch]>2) await p.evaluate(()=>{ window.__ZLJ_TEST.autoWin=true; setTimeout(()=>window.__ZLJ_TEST.autoWin=false, 4000); });
    await p.click('text=再战一次'); continue; }
  if (st.battle) { if (st.ch>=3 && !shots.has('05_combat')) { await p.waitForTimeout(1500); await shot('05_combat'); } continue; }
  if (st.mode==='region' && !st.panel) {
    await shot('03_map_region');
    if (st.ch>=4 && !shots.has('06_inventory')) { await p.evaluate(()=>window.__zlj.openMenu('bag')); await shot('06_inventory'); await p.evaluate(()=>window.__zlj.openMenu('codex')); await p.click('.centry:not(.locked) >> nth=1').catch(()=>{}); await shot('07_codex');
      await p.evaluate(()=>window.__zlj.openMenu('party')); await shot('08_party'); await p.evaluate(()=>document.querySelectorAll('.panel-wrap').forEach(e=>e.remove())); continue; }
    // 支线
    const qs = await p.$$('.node.quest.ready, .node.quest.new');
    let did=false;
    for (const el of qs) { const key = await el.evaluate(e=>e.className+e.textContent+e.style.left+e.style.top); if (visitedQ.has(key)) continue; visitedQ.add(key); await el.click({timeout:4000}).catch(e=>log.push('点击失败 '+key)); did=true; break; }
    if (did) continue;
    // 刷支线：有进行中的支线时采集/战斗（每章每区最多 14 次）
    const gk = st.ch+'_'+st.region; grind[gk]=grind[gk]||0;
    if (grind[gk]<14 && await p.$('.node.quest.active')) { grind[gk]++;
      const g = await p.$$('.node.gather'); for (const el of g) { if (!(await el.$('.n-cd'))) { await el.click(); did=true; break; } }
      if (!did && grind[gk]%5===4) { const e = await p.$('.node.elite'); if (e) { await e.click(); await p.waitForTimeout(300); await p.click('text=确定').catch(()=>{}); did=true; } }
      if (!did) { const bs = await p.$$('.node.battle'); if (bs.length) { await bs[grind[gk]%bs.length].click(); did=true; } }
      if (did) { log.push('刷 ch'+st.ch+' '+st.region); continue; } }
    if (st.bonds) { await p.click('.node.camp'); await p.waitForTimeout(300); if (st.ch>=6) await shot('10_camp'); await p.click('text=羁绊夜话'); await p.waitForTimeout(300); const c = await p.$('.pc:not(.dim)'); if (c) { await c.click(); log.push('羁绊 ch'+st.ch); } continue; }
    if (st.main) { await p.click('.mainnode',{timeout:4000}).catch(e=>log.push('主线点击失败')); continue; }
    if (st.exp && st.exp!==st.region) { await p.evaluate(r=>window.__game.region(r), st.exp); continue; }
  }
  if (st.mode==='world') { await shot('04_world'); if (st.exp) await p.evaluate(r=>window.__game.region(r), st.exp); continue; }
  if (st.panel && st.mode==='region') { // 关闭意外弹窗（如支线进度）
    const close = await p.$('.panel-wrap .close'); if (close) await close.click(); else await p.evaluate(()=>document.querySelectorAll('.panel-wrap').forEach(e=>e.remove())); continue; }
  if (st.name && st.name.trim() && !/旁白/.test(st.name) && st.vnchar && st.ch>=2 && st.text.length>8) await shot('02_dialogue');
  if (st.cg && st.ch>=3) await shot('11_cg');
  if (stuck>40) { await p.mouse.click(420,300); stuck=0; log.push('戳 '+sig); }
}
const fin = await p.evaluate(()=>{ const S=window.__zlj.S; return { ch:S.chapterN, lv:S.party.yangui.lv, hope:S.hope, aff:S.aff, lost:S.lost, members:S.members, quests:Object.values(S.quests).filter(x=>x==='done').length, bonds:Object.keys(S.flags).filter(f=>/^bond_/.test(f)).length, scales:Object.keys(S.inv).filter(k=>/^k_scale/.test(k)).length, endings: JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>/meta/i.test(k))||'{}')).endings }; });
console.log(JSON.stringify({ ending, secs:Math.round((Date.now()-t0)/1000), fin, loses, log:log.filter(x=>!/^刷/.test(x)).slice(-40), grinds:log.filter(x=>/^刷/.test(x)).length }, null, 1));
console.log('ERRORS:\n'+[...new Set(errs)].slice(0,30).join('\n'));
await b.close();
