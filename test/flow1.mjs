import { p, b, errs, bad, log, sleep, shot, tap, tapText, state, layoutCheck } from './pt.mjs';
await p.goto(process.env.URL||'http://127.0.0.1:4173/'); await sleep(2500);
log('boot', await state()); await shot('title'); await layoutCheck('title');
await p.touchscreen.tap(450,200); await sleep(2000);
log('after tap', await state()); await shot('after_title'); await layoutCheck('after');
log('ERRS', errs); log('BAD', bad);
await b.close();
