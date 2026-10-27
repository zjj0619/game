import { p, b, errs, log, sleep, shot, layoutCheck, tap } from './pt.mjs';
await p.addInitScript(()=>{ window.__ZLJ_TEST={ actBot:null, lineMs:0, tut:false, dlg:'manual' }; });
await p.goto(process.env.URL||'http://127.0.0.1:4173/'); await sleep(2000);
await p.touchscreen.tap(450,200); await sleep(1500);
await p.evaluate(()=>{ window.__zlj.launch(window.__zlj.STAGES.jincheng_1, {}); }); await sleep(700);
await p.touchscreen.tap(450,200); await sleep(700);
for(let i=0;i<8;i++){ const w=await p.evaluate(()=>document.querySelector('.dlg-name')?.textContent||''); if(w){ break;} await p.touchscreen.tap(450,300); await sleep(250); await p.touchscreen.tap(450,300); await sleep(500); }
await sleep(1200); await shot('dialogue_speaker'); await layoutCheck('dlg');
await p.evaluate(()=>window.__handleBack()); await sleep(1500);
await p.evaluate(()=>window.__act.win()); await sleep(3000);
for(let i=0;i<10 && await p.$('.dlg, .dlg-card');i++){ await p.evaluate(()=>window.__handleBack()); await sleep(600); }
await shot('result'); await layoutCheck('result');
await p.evaluate(()=>{ window.__zlj.launch(window.__zlj.STAGES.jincheng_2, {}); }); await sleep(1500);
await p.evaluate(()=>window.__act.fail()); await sleep(3000); await shot('fail'); await layoutCheck('fail');
log('ERRS', errs); await b.close();
