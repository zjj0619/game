import { p, b, errs, bad, log, sleep, shot, layoutCheck, tap, tapText } from './pt.mjs';
await p.addInitScript(()=>{ window.__ZLJ_TEST={ actBot:{}, actSpeed:1, lineMs:0, tut:false, dlg:'manual' }; });
await p.goto(process.env.URL||'http://127.0.0.1:4173/'); await sleep(2500);
await shot('title');
await p.touchscreen.tap(450,200); await sleep(2000); await shot('stage_detail'); await p.evaluate(()=>document.querySelector('.panel-wrap') && window.__handleBack()); await sleep(1200); await shot('hub'); await layoutCheck('hub');
await p.evaluate(()=>{ window.__zlj.launch(window.__zlj.STAGES.jincheng_1, {}); }); await sleep(800); await shot('chapter_card');
await p.touchscreen.tap(450,200); await sleep(700);
for(let i=0;i<8;i++){ const w=await p.evaluate(()=>document.querySelector('.dlg-name')?.textContent||''); if(w) break; await p.touchscreen.tap(450,300); await sleep(250); await p.touchscreen.tap(450,300); await sleep(500); }
await sleep(1200); await shot('dialogue');
await p.evaluate(()=>{ window.__handleBack(); window.__ZLJ_TEST.dlg='auto'; }); await sleep(1500);
await p.evaluate(()=>window.__act.win()); await sleep(3500);
for(let i=0;i<10 && await p.$('.dlg, .dlg-card');i++){ await p.evaluate(()=>window.__handleBack()); await sleep(600); }
await p.evaluate(()=>{ window.__zlj.launch(window.__zlj.STAGES.jincheng_3, {}); }); await sleep(4200); await shot('battle_mid'); await layoutCheck('battle');
await p.evaluate(()=>window.__act.win()); await sleep(3500);
for(let i=0;i<10 && await p.$('.dlg, .dlg-card');i++){ await p.evaluate(()=>window.__handleBack()); await sleep(600); }
await shot('result'); await layoutCheck('result');
await p.evaluate(()=>{ window.__ZLJ_TEST.dlg='manual'; for(let i=1;i<=9;i++) window.__zlj.S.act.cleared['jincheng_'+i]=window.__zlj.S.act.cleared['jincheng_'+i]||1; window.__zlj.launch(window.__zlj.STAGES.jincheng_10, {}); }); await sleep(1000);
await p.evaluate(()=>window.__act.win()); await sleep(2500);
for(let i=0;i<40;i++){ if(await p.$('.dlg-opt')){ await sleep(500); await shot('story_choice'); await tap('.dlg-opt'); await sleep(800); break; } await p.touchscreen.tap(450,300); await sleep(300); }
for(let i=0;i<10 && await p.$('.dlg, .dlg-card');i++){ await p.evaluate(()=>window.__handleBack()); await sleep(600); }
await sleep(800);
await p.evaluate(()=>window.__zlj.openMenu()); await sleep(1500); await shot('menu'); await layoutCheck('menu');
log('ERRS', errs); log('BAD', bad); await b.close();
