import { chromium } from 'playwright-core';
const OUT = process.env.OUT || '/workspace/game/screenshots_v2/';
const W = +(process.env.W||915), H = +(process.env.H||412);
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome' });
const p = await b.newPage({ viewport:{width:W,height:H}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.addInitScript(()=>{ if (!sessionStorage.getItem('i')) { localStorage.clear(); localStorage.setItem('zlj_settings', JSON.stringify({textSpeed:100})); sessionStorage.setItem('i','1'); } });
const shot = async n => { await p.waitForTimeout(700); await p.screenshot({ path: OUT+'ui_'+n+'_'+W+'.png' }); console.log(n); };
await p.goto('http://localhost:4173/'); await p.waitForTimeout(2500); await shot('title');
await p.click('text=新的旅程'); await p.waitForTimeout(1500);
for (let i=0;i<12;i++){ await p.mouse.click(W/2,H*0.8); await p.waitForTimeout(250); }
await shot('dialogue');
// jump to a mid-game state
await p.evaluate(()=>{ const z=window.__zlj; const S=z.S; S.members=['yangui','baiji','xianwei','qi']; S.formation=['yangui','baiji','xianwei','qi'];
  S.members=['yangui']; S.formation=['yangui']; for (const m of ['baiji','xianwei','qi']) window.__zlj.add(m); for (const m of S.members) S.party[m].lv=12;
  for (const r of ['jincheng','qingqiu','donghai','changyang']) S.flags['reg_'+r]=true; S.chapterN=3; S.explore={region:'changyang',to:'ch3',name:'常羊山'}; S.flags.tut_explore=true; });
await p.evaluate(()=>window.__game.region('changyang')); await p.waitForTimeout(400); await shot('region');
await p.evaluate(()=>window.__game.world()); await shot('world');
await p.evaluate(()=>window.__game.region('changyang'));
await p.evaluate(()=>{ window.__game.battle('cy_a', {}); }); await p.waitForTimeout(1800); await shot('battle');
await p.click('.cb.csk').catch(()=>{}); await shot('battle_skills');
await p.evaluate(()=>document.querySelectorAll('.screen.bt,.tut').forEach(e=>e.remove()));
await p.evaluate(()=>window.__game.region('changyang'));
for (const t of ['party','bag','craft','quest','codex','ach','save','settings']) { await p.evaluate(t=>{ document.querySelectorAll('.panel-wrap').forEach(e=>e.remove()); window.__zlj.openMenu(t); }, t); await shot('menu_'+t); }
await p.evaluate(()=>document.querySelectorAll('.panel-wrap').forEach(e=>e.remove()));
await p.evaluate(()=>{ const L=window.__ex.list(); window.__ex.act(L.find(e=>e.k==='camp').i); }); await shot('camp');
await p.evaluate(()=>{ const z=window.__zlj; z.S.gold=9999; for (const k of ['m_starmarrow','m_ember','m_bronze','m_fur','m_jade']) z.S.inv[k]=12; document.querySelectorAll('.panel-wrap').forEach(e=>e.remove()); const L=window.__ex.list(); window.__ex.act(L.find(e=>e.k==='camp').i); });
await shot('camp_ready');
await p.click('.cmr:nth-child(2)'); await shot('lamp');
await p.click('.lamp .btn.gold, .lamp button.gold').catch(e=>console.log('nolampbtn')); await p.waitForTimeout(600); await shot('lamp_up');
await p.evaluate(()=>{ document.querySelectorAll('.panel-wrap,.reward').forEach(e=>e.remove()); window.__zlj.openMenu('party'); });
await p.click('.pd-tabs button:nth-child(2)'); await shot('talent');
await p.click('.tn.can').catch(()=>console.log('notn')); await p.waitForTimeout(300); await p.click('.tn.can').catch(()=>{}); await shot('talent_on');
await p.click('.pd-tabs button:nth-child(1)'); await shot('party_attr');
await p.click('.es-rf'); await shot('refine');
for (let i=0;i<3;i++){ await p.click('.refine button.gold').catch(()=>{}); await p.waitForTimeout(500); await p.evaluate(()=>document.querySelectorAll('.reward').forEach(e=>e.remove())); }
await shot('refine3');
await p.evaluate(()=>document.querySelectorAll('.panel-wrap.refine').forEach(e=>e.remove())); await shot('party_refined');
console.log('ERR', errs.join('\n'));
await b.close();
