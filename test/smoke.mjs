import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome' });
const p = await b.newPage({ viewport:{width:844,height:390}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{ if (m.type()==='error') errs.push(m.text()); });
p.on('requestfailed', r=>errs.push('REQFAIL '+r.url()));
await p.addInitScript(()=>{ window.__ZLJ_TEST={auto:true,lineMs:0,endMs:500,autoWin:true}; });
await p.goto('http://localhost:4173/'); await p.waitForTimeout(2500);
await p.click('text=新的旅程');
const t0=Date.now(); let st;
while (Date.now()-t0<60000) { await p.waitForTimeout(1000); st = await p.evaluate(()=>({ch:window.__zlj.S?.chapterN, mode:window.__zlj.S?.mode})); if (st.ch>=1) break; }
const imgs = await p.evaluate(()=>Promise.all(['bg/zhulong_eye','por/baiji','enemy/yegui','cg/'+'x'].slice(0,3).map(a=>new Promise(r=>{const i=new Image(); i.onload=()=>r(a+':'+i.width); i.onerror=()=>r(a+':ERR'); i.src='assets/'+a+'.webp';}))));
await p.screenshot({path:'/tmp/smoke.png'});
console.log(JSON.stringify({st, imgs, secs:(Date.now()-t0)/1000, errs}));
await b.close();
