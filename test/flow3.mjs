import { p, b, errs, bad, log, sleep, shot, tap, tapText, state, layoutCheck } from './pt.mjs';
await p.addInitScript(()=>{ window.__ZLJ_TEST={ actBot:{}, actSpeed:2, lineMs:0, tut:false }; });
await p.goto(process.env.URL||'http://127.0.0.1:4173/'); await sleep(2000);
await p.touchscreen.tap(450,200); await sleep(1500);
const actInfo=()=>p.evaluate(()=>{ const a=window.__act; if(!a) return null; return {over:a.st.over,t:+a.st.t.toFixed(1),foes:a.foes.filter(f=>f.hp>0).length,arena:a.arenas.findIndex(x=>!x.done),n:a.arenas.length,res:a.result?{win:a.result.win,why:a.result.why,rating:a.result.rating,time:a.result.time}:null,stage:a.stage.id, roster:a.roster.map(r=>r.id)}; });
async function runOne(maxMs=120000, onMid){ const t0=Date.now(); let mid=false; let lastT=-1, stuck=0;
  while(Date.now()-t0<maxMs){ const s=await actInfo(); if(!s){ await sleep(300); continue;} if(s.res) return s; 
    if(!mid && s.t>6 && onMid){ mid=true; await onMid(s); }
    if(s.t===lastT) { stuck++; if(stuck>20){ log('  STUCK?', s, await state()); return s; } } else stuck=0; lastT=s.t; await sleep(500); }
  log('  TIMEOUT', await actInfo()); return null; }
const scr=()=>p.evaluate(()=>[...document.querySelectorAll('#app>.screen')].map(s=>s.className).join(' | '));
for (const id of ['jincheng_1','jincheng_2','jincheng_3','jincheng_4','jincheng_5','jincheng_6']){
  await p.evaluate(id=>{ window.__zlj.launch(window.__zlj.STAGES[id], {}); }, id); await sleep(800);
  const r=await runOne(150000, async s=>{ // pause/resume via touch
    if(id==='jincheng_2'){ await tap('.ak-pause'); await sleep(400); const pz=await p.evaluate(()=>window.__act.st.paused); await shot('paused'); await tapText('继续'); await sleep(300); log('  pause',pz,'resumed',!(await p.evaluate(()=>window.__act.st.paused))); }
    if(id==='jincheng_4'){ await p.evaluate(()=>{ window.__ZLJ_TEST.actBot=null; }); await sleep(400); await layoutCheck('battle-'+id); await shot('battle_mid'); await p.evaluate(()=>{ window.__ZLJ_TEST.actBot={}; }); }
  });
  log(id, JSON.stringify(r), '->', await scr(), 'mode', (await state()).mode);
  await sleep(1200);
}
await shot('result_j6'); await layoutCheck('result');
log('gold', await p.evaluate(()=>window.__zlj.S.gold), 'party', await p.evaluate(()=>Object.keys(window.__zlj.S.party)), 'team', await p.evaluate(()=>window.__zlj.S.act.team));
// retreat test
await p.evaluate(()=>{ window.__ZLJ_TEST.actBot=null; window.__zlj.launch(window.__zlj.STAGES.jincheng_7, {}); }); await sleep(1500);
await tap('.ak-pause'); await sleep(300); await tapText('撤退'); await sleep(1200); log('retreat ->', await scr(), (await state()).mode, 'act loop alive?', await p.evaluate(()=>!window.__act.st.over));
// retry
await p.evaluate(()=>{ window.__zlj.launch(window.__zlj.STAGES.jincheng_7, {}); }); await sleep(1500);
await tap('.ak-pause'); await sleep(300); await tapText('重来'); await sleep(1500); log('retry ->', await scr(), JSON.stringify(await actInfo()));
// fail
await p.evaluate(()=>window.__act.fail()); await sleep(3000); log('fail ->', await scr()); await shot('fail_result'); await layoutCheck('fail');
await tapText('重新挑战'); await sleep(1500); log('retry from fail ->', await scr());
await p.evaluate(()=>window.__act.win()); await sleep(2500); log('win ->', await scr());
await tapText('下一关 ▶'); await sleep(1000); log('next ->', await state());
log('ERRS', errs); log('BAD', bad);
await b.close();
