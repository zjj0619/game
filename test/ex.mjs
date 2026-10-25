import { chromium } from 'playwright-core';
const OUT='/workspace/game/screenshots_v2/'; const W=+(process.env.W||915), H=+(process.env.H||412); const R=process.env.R||'changyang';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome' });
const p = await b.newPage({ viewport:{width:W,height:H}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{ if (m.type()==='error') errs.push('console:'+m.text()); });
await p.addInitScript(()=>{ if (!sessionStorage.getItem('i')) { localStorage.clear(); localStorage.setItem('zlj_settings', JSON.stringify({textSpeed:100})); sessionStorage.setItem('i','1'); } window.__ZLJ_TEST={tut:!!window.__TUT}; });
await p.goto('http://localhost:4173/'); await p.waitForTimeout(1500);
await p.click('text=新的旅程'); await p.waitForTimeout(600);
await p.evaluate((R)=>{ const z=window.__zlj; const S=z.S; for (const m of ['baiji','xianwei','qi']) z.add(m); for (const m of S.members) S.party[m].lv=12; S.formation=['yangui','baiji','xianwei','qi'];
  for (const r of ['jincheng','qingqiu','donghai','changyang']) S.flags['reg_'+r]=true; S.flags.ch1_done=true; S.flags.ch2_done=true; S.chapterN=3; S.gold=2400; S.explore={region:R,to:'ch3',name:'刑天的头颅'}; S.flags.tut_explore=true; window.__game.region(R); }, R);
await p.waitForTimeout(1500); await p.screenshot({path:OUT+`ex_${R}_${W}.png`});
const L = await p.evaluate(()=>window.__ex.list()); console.log(JSON.stringify(L.map(e=>[e.i,e.k,e.x,e.label])));
// walk right with keyboard
await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1600); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(500);
await p.screenshot({path:OUT+`ex_${R}_walk_${W}.png`});
const pz = L.find(e=>e.k==='tablet'); await p.evaluate(i=>window.__ex.go(i), pz.i+2); await p.waitForTimeout(900); await p.screenshot({path:OUT+`ex_${R}_puzzle_${W}.png`});
const m = L.find(e=>e.k==='main'); await p.evaluate(i=>window.__ex.go(i), m.i); await p.waitForTimeout(900); await p.screenshot({path:OUT+`ex_${R}_main_${W}.png`});
console.log('ERR', errs.join('\n'));
await b.close();
