import { p, b, errs, log, sleep } from './pt.mjs';
await p.addInitScript(()=>{ window.__ZLJ_TEST={ actBot:{}, actSpeed:2, lineMs:60, tut:false }; });
await p.goto(process.env.URL||'http://127.0.0.1:4173/'); await sleep(2000);
await p.touchscreen.tap(450,200); await sleep(1500);
for (const id of (process.env.IDS||'jincheng_5,jincheng_10,qingqiu_5').split(',')){
  await p.evaluate(id=>{ window.__ZLJ_TEST.dlgLog=[]; window.__zlj.launch(window.__zlj.STAGES[id], {}); }, id);
  const t0=Date.now(); let r=null, info;
  while(Date.now()-t0<180000){ r=await p.evaluate(()=>window.__act?.result?{win:window.__act.result.win,why:window.__act.result.why}:null); if(r) break; await sleep(1000);
    info=await p.evaluate(()=>{const a=window.__act; return a&&{t:+a.st.t.toFixed(0),talk:a.st.talk,arena:a.arenas.findIndex(x=>!x.done),foes:a.foes.filter(f=>f.hp>0).map(f=>f.id+':'+Math.round(f.hp)).join(','),P:Math.round(a.P.hp)}}); }
  log(id, JSON.stringify(r), Math.round((Date.now()-t0)/1000)+'s', JSON.stringify(info), await p.evaluate(()=>JSON.stringify(window.__ZLJ_TEST.dlgLog)));
  for(let i=0;i<30 && await p.$('.dlg, .dlg-card');i++) await sleep(500);
  await sleep(800);
}
log('ERRS', errs); await b.close();
