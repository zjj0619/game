// 真实流程回归：标题→枢纽→关卡→结算→菜单→存档
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const W=+(process.env.W||915), H=+(process.env.H||412); const OUT=process.env.OUT||'/tmp/pt/';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args:['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const p = await ctx.newPage();
const errs=[]; const bad=[];
p.on('pageerror', e=>errs.push('PAGEERROR '+e.message+' @'+(e.stack||'').split('\n').slice(1,3).join(' | ')));
p.on('console', m=>{ if (m.type()==='error' || m.type()==='warning') errs.push(m.type()+': '+m.text()); });
p.on('response', r=>{ if (r.status()>=400) bad.push(r.status()+' '+r.url()); });
p.on('requestfailed', r=>{ if(!/api.github.com/.test(r.url())) bad.push('FAIL '+r.url()+' '+r.failure()?.errorText); });
const log=(...a)=>console.log(...a);
const sleep=ms=>p.waitForTimeout(ms);
let n=0; const shot=async name=>{ await sleep(350); await p.screenshot({path:`${OUT}${String(++n).padStart(2,'0')}_${name}_${W}.png`}); };
const tap=async sel=>{ const el=await p.$(sel); if(!el){ log('  !! missing', sel); return false;} const bb=await el.boundingBox(); if(!bb){log('  !! invisible',sel);return false;} await p.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2); return true; };
const tapText=async (t, scope='')=>{ const el=p.locator(`${scope} :text-is("${t}")`).last(); if(!await el.count()){ log('  !! no text',t); return false;} const bb=await el.boundingBox(); if(!bb){log('  !! invisible text',t); return false;} await p.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2); return true; };
const state=()=>p.evaluate(()=>({mode:window.__zlj?.S?.mode, screens:[...document.querySelectorAll('#app>.screen')].map(s=>s.className), panels:[...document.querySelectorAll('.panel-wrap')].map(x=>x.className+' :: '+(x.querySelector('.panel-title,h2,.ttl')?.textContent||'')), act:!!window.__act && !window.__act.st.over }));
// overlap / offscreen check of visible interactive elements
const layoutCheck=async(label)=>{ const r=await p.evaluate(()=>{ const out=[]; const vw=innerWidth, vh=innerHeight;
  const els=[...document.querySelectorAll('button, .btn, .htile, .hm-row, .tab, .snode, .ak-btn, .ak-sk, .t-ico')].filter(e=>{const cs=getComputedStyle(e); const r=e.getBoundingClientRect(); return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0&& !e.closest('[hidden]') && (()=>{ const cx=Math.min(vw-1,Math.max(0,r.left+r.width/2)), cy=Math.min(vh-1,Math.max(0,r.top+r.height/2)); const t=document.elementFromPoint(cx,cy); return !t || e.contains(t) || t.contains(e) || !(r.left>=0&&r.top>=0&&r.right<=vw&&r.bottom<=vh); })(); });
  for(const e of els){ const r=e.getBoundingClientRect(); if(r.right>vw+2||r.bottom>vh+2||r.left<-2||r.top<-2){ const sc=e.closest('.panel-body,.hr-body,.rs-l,.rs-r,.menu-body,[class*=scroll]'); if(!sc) out.push('OFF '+(e.className||e.tagName)+' "'+e.textContent.trim().slice(0,12)+'" '+[r.left,r.top,r.right,r.bottom].map(Math.round)); } }
  for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){ const a=els[i].getBoundingClientRect(), b=els[j].getBoundingClientRect(); if(els[i].contains(els[j])||els[j].contains(els[i])) continue; const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left), oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top); if(ox>6&&oy>6) out.push('OVL "'+els[i].textContent.trim().slice(0,8)+'"('+els[i].className.slice(0,20)+') x "'+els[j].textContent.trim().slice(0,8)+'"('+els[j].className.slice(0,20)+') '+Math.round(ox)+'x'+Math.round(oy)); }
  return out.slice(0,25); }); if(r.length) log('  layout['+label+']:\n    '+r.join('\n    ')); };
export { p, b, ctx, errs, bad, log, sleep, shot, tap, tapText, state, layoutCheck };
