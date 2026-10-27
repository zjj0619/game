import { p, b, errs, bad, log, sleep, shot, tap, tapText, state, layoutCheck } from './pt.mjs';
await p.goto(process.env.URL||'http://127.0.0.1:4173/'); await sleep(2000);
await p.touchscreen.tap(450,200); await sleep(1500);
await tapText('出 战'); await sleep(2500);
log('launch', await state()); await shot('pre_battle');
// dismiss overlays (tutorial/guide)
async function clearOverlays(){ for(let k=0;k<12;k++){ const o=await p.evaluate(()=>{ const t=document.querySelector('.tut'); if(t) return 'tut'; const w=document.querySelector('.panel-wrap'); if(w) return 'panel:'+w.className+':'+(w.textContent.slice(0,40)); return null;}); if(!o) return; log('  overlay',o); if(o==='tut'){ await p.touchscreen.tap(20,20);} else { const ok=await p.evaluate(()=>{const w=[...document.querySelectorAll('.panel-wrap')].pop(); const bs=[...w.querySelectorAll('button,.btn')]; const pick=bs.find(x=>/开始|知道|继续|确定|好|出发|关闭|跳过/.test(x.textContent))||w.querySelector('.panel-x,.x'); if(pick){pick.click(); return pick.textContent;} return null;}); log('   clicked',ok); if(!ok) await p.touchscreen.tap(5,5);} await sleep(500);} }
await clearOverlays(); log('after overlays', await state()); await layoutCheck('battle');
const box=async s=>{ const e=await p.$(s); return e && await e.boundingBox(); };
const joy=await box('.ak-joy'); log('joy',joy);
const t0=Date.now(); let i=0; let midShot=false;
while(Date.now()-t0<150000){
  const s=await p.evaluate(()=>{ const a=window.__act; if(!a) return null; return {over:a.st.over, t:a.st.t?.toFixed?.(1), foes:a.foes.filter(f=>f.hp>0).length, hp:Math.round(a.P?.hp??0), x:Math.round(a.P?.x??0), arena:a.arenas.findIndex(x=>!x.done), res:!!a.result, paused:!!a.st.paused, tut:!!document.querySelector('.tut'), panel:!!document.querySelector('.panel-wrap')}; });
  if(!s || s.over || s.res) { log('end', s); break; }
  if(s.tut||s.panel){ await clearOverlays(); continue; }
  if(i%10===0) log(JSON.stringify(s));
  // move right if no foes nearby, else attack
  await p.mouse.move(joy.x+joy.width/2, joy.y+joy.height/2); await p.mouse.down(); await p.mouse.move(joy.x+joy.width/2+(s.foes? (i%6<2?-30:30):35), joy.y+joy.height/2,{steps:2});
  for(let k=0;k<4;k++){ await tap('.ak-atk'); await sleep(90); }
  if(i%7===3) await tap('.ak-sk[data-slot="0"]');
  if(i%9===5) await tap('.ak-sk[data-slot="1"]');
  if(i%11===6) await tap('.ak-dash');
  if(i%13===2) await tap('.ak-jump');
  await p.mouse.up();
  if(!midShot && s.foes>0 && i>8){ midShot=true; await p.screenshot({path:'/tmp/pt/mid_'+innerWidthTag()+'.png'}).catch(()=>{}); }
  i++;
}
function innerWidthTag(){return process.env.W||'915';}
await sleep(2500); log('after battle', await state()); await shot('result'); await layoutCheck('result');
log('ERRS', errs); log('BAD', bad);
await b.close();
