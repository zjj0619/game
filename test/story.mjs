import { p, b, errs, bad, log, sleep, shot, tap, tapText, state, layoutCheck } from './pt.mjs';
await p.addInitScript(()=>{ window.__ZLJ_TEST={ actBot:{}, actSpeed:2, lineMs:0, tut:false, dlg:'manual' }; });
await p.goto(process.env.URL||'http://127.0.0.1:4173/'); await sleep(2000);
await p.touchscreen.tap(450,200); await sleep(1500);
const dlg=()=>p.evaluate(()=>({card:!!document.querySelector('.dlg-card'), dlg:!!document.querySelector('.dlg'), text:document.querySelector('.dlg-text')?.textContent||'', who:document.querySelector('.dlg-name')?.textContent||'', choice:document.querySelectorAll('.dlg-opt').length, act:!!window.__act&&!window.__act.st.over, talk:!!window.__act?.st.talk }));
const actRes=()=>p.evaluate(()=>window.__act?.result ? {win:window.__act.result.win} : null);
// 1. 章节开场
await p.evaluate(()=>{ window.__zlj.launch(window.__zlj.STAGES.jincheng_1, {}); }); await sleep(700);
log('card', await dlg()); await shot('chapter_card'); await p.touchscreen.tap(450,200); await sleep(700);
log('dlg1', await dlg()); await sleep(900); await shot('dialogue'); await layoutCheck('dialogue');
await p.touchscreen.tap(450,300); await sleep(200); await p.touchscreen.tap(450,300); await sleep(500); log('dlg2', await dlg());
// android back skips
await p.evaluate(()=>document.querySelector('.dlg') && window.__handleBack()); await sleep(800); log('after back', await dlg());
let t0=Date.now(); while(!(await actRes()) && Date.now()-t0<120000) { await p.evaluate(()=>document.querySelector('.dlg') && window.__handleBack()); await sleep(500); }
log('j1 result', await actRes(), (await state()).screens);
// 2. 首领战前（中段首领）：自动对白
await p.evaluate(()=>{ window.__ZLJ_TEST.dlg='auto'; window.__ZLJ_TEST.lineMs=60; window.__zlj.launch(window.__zlj.STAGES.jincheng_5, {}); }); await sleep(800);
let sawBoss=false, sawBark=false; t0=Date.now();
while(!(await actRes()) && Date.now()-t0<150000){ const d=await dlg(); if(d.talk&&d.dlg&&!sawBoss){ sawBoss=true; log('boss talk', d); await p.evaluate(()=>{window.__ZLJ_TEST.dlg='manual';}); await sleep(600); await shot('boss_pre'); await p.evaluate(()=>{window.__ZLJ_TEST.dlg='auto'; if(document.querySelector('.dlg')) window.__handleBack();}); } if(await p.$('.dlg-bark')) sawBark=true; await sleep(250); }
log('j5', await actRes(), 'sawBoss', sawBoss, 'sawBark', sawBark);
await sleep(1500); const d5=await dlg(); log('j5 after', d5); if(d5.dlg){ await sleep(3000); }
log('vars', await p.evaluate(()=>JSON.stringify(window.__zlj.S.vars)));
// 3. 终局首领 + 抉择
await p.evaluate(()=>{ window.__ZLJ_TEST.dlg='manual'; for(let i=1;i<=9;i++) window.__zlj.S.act.cleared['jincheng_'+i]=window.__zlj.S.act.cleared['jincheng_'+i]||1; window.__zlj.launch(window.__zlj.STAGES.jincheng_10, {}); }); await sleep(800);
await p.evaluate(()=>window.__act && window.__act.win()); await sleep(2500);
log('j10 post', await dlg());
for(let i=0;i<40;i++){ const d=await dlg(); if(d.choice){ await shot('choice'); await layoutCheck('choice'); await tap('.dlg-opt:nth-child(2)'); await sleep(900); break; } if(!d.dlg&&!d.card) break; await p.touchscreen.tap(450,300); await sleep(300); }
for(let i=0;i<30;i++){ const d=await dlg(); if(!d.dlg&&!d.card) break; await p.touchscreen.tap(450,300); await sleep(400); }
log('after choice vars', await p.evaluate(()=>JSON.stringify({v:window.__zlj.S.vars, f:Object.keys(window.__zlj.S.flags).filter(k=>/oath|protect|spared|mercy|ruth|baiji/.test(k)), seen:Object.keys(window.__zlj.S.act.storySeen||{}).length})), (await state()).screens);
await sleep(800); await shot('result_after_story'); await layoutCheck('result');
// replay: no dialogue second time
await p.evaluate(()=>{ window.__zlj.launch(window.__zlj.STAGES.jincheng_1, {}); }); await sleep(900); log('replay j1', await dlg());
await p.evaluate(()=>window.__act && window.__act.fail()); await sleep(1500);
log('ERRS', errs); log('BAD', bad);
await b.close();
