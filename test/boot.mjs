import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome' });
const p = await b.newPage({ viewport:{width:900,height:405}, hasTouch:true });
const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{ if (m.type()==='error') errs.push(m.text()); });
p.on('requestfailed', r=>errs.push('REQFAIL '+r.url()));
await p.addInitScript(()=>{ window.__ZLJ_TEST={auto:true}; });
await p.goto('http://localhost:4173/'); await p.waitForTimeout(2000);
await p.click('text=山海闯关'); await p.waitForTimeout(500); await p.screenshot({path:'/tmp/boot_0.png'});
const out=[];
for (const t of ['伙伴','山海异兽','铸灯铁坊','烬城建设','试炼','山海闯关']) { try { await p.click(t==='山海闯关'?'.htile.t-adv':'.htile >> text='+t, {timeout:2000}); await p.waitForTimeout(400); out.push(t+':'+(await p.evaluate(()=>document.querySelector('.screen')?.className))); await p.screenshot({path:'/tmp/boot_'+out.length+'.png'}); if (t!=='山海闯关') { await p.click('text=‹ 返回'); await p.waitForTimeout(300);} } catch(e){ out.push(t+':ERR '+e.message.slice(0,80)); } }
console.log(JSON.stringify({out, errs}, null, 1));
await b.close();
