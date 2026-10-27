import { p, b, errs, log, sleep, shot } from './pt.mjs';
await p.addInitScript(()=>{ window.__ZLJ_TEST={ actBot:{}, actSpeed:1, lineMs:0, tut:false }; });
await p.goto('http://127.0.0.1:4173/'); await sleep(2000); await p.touchscreen.tap(450,200); await sleep(1500);
await p.evaluate(()=>{ window.__zlj.launch(window.__zlj.STAGES.jincheng_2, {}); });
let seen=null; for(let i=0;i<80 && !seen;i++){ seen=await p.evaluate(()=>document.querySelector('.dlg-bark')?.textContent||null); if(seen) await shot('bark'); await sleep(250); }
log('bark', seen, errs); await b.close();
