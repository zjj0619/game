import { p, b, errs, bad, log, sleep, layoutCheck } from './pt.mjs';
const W = +(process.env.W || 915); const OUT = '/workspace/game/docs/pass2_2026-10-26/';
const shot = async name => { await p.screenshot({ path: `${OUT}${name}_${W}.png` }); log('shot', name); };
await p.addInitScript(() => { window.__ZLJ_TEST = { lineMs: 0, tut: false }; });
await p.goto('http://127.0.0.1:4173/'); await sleep(2500);
await shot('01_title');
await p.touchscreen.tap(450, 200); await sleep(1500);
const skipDlg = async () => { for (let i = 0; i < 40; i++) { const d = await p.$('.dlg, .dlg-card'); if (!d) return; const bb = await d.boundingBox(); if (bb) await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(150); } };
// 1) 普通关剧情节拍（青丘第 3 关）
await p.evaluate(() => { window.__ZLJ_TEST.lineMs = 6000; window.__zlj.launch(window.__zlj.STAGES.qingqiu_3, {}); }); await sleep(1500);
await shot('02_stage_beat_intro'); await p.evaluate(() => { window.__ZLJ_TEST.lineMs = 0; }); await skipDlg(); await sleep(600);
// 2) 战斗中打击特效：开机器人打一会儿，多次抓帧
await p.evaluate(() => { window.__ZLJ_TEST.actBot = {}; }); 
for (let k = 0; k < 3; k++) { await sleep(1700); await shot('03_battle_vfx_' + k); }
await p.evaluate(() => { window.__ZLJ_TEST.actBot = null; });
// 3) 各区秘境机关
const mech = async (rid, setup) => {
  await p.evaluate(() => { const a = window.__act; if (a && !a.st.over) { a.st.over = true; } });
  await p.evaluate(id => { window.__zlj.launch(window.__zlj.STAGES[id], {}); }, rid + '_7'); await sleep(1200); await skipDlg(); await sleep(400);
  await p.evaluate(() => { const a = window.__act, ai = a.st.mech.ai; for (const f of a.foes) { f.hp = 0; f.dead = true; } a.foes.length = 0; for (const ar of a.arenas) if (ar.i < ai || a.arenas.indexOf(ar) < ai) { ar.started = true; ar.done = true; ar.wave = ar.waves.length; } a.st.locked = false; a.P.x = a.arenas[ai].x0 + 20; }); await sleep(900);
  if (rid !== 'donghai' && rid !== 'yugu') { await p.evaluate(() => { const a = window.__act, ar = a.arenas[a.st.mech.ai]; for (const f of a.foes) { f.hp = 0; f.dead = true; } a.foes.length = 0; ar.started = true; ar.done = true; ar.wave = ar.waves.length; a.st.locked = false; }); await sleep(300); }
  const info = await p.evaluate(setup); await sleep(700); await shot('04_mech_' + rid); return info;
};
const fns = {
  qingqiu: () => { const a = window.__act, m = a.st.mech; a.P.x = m.relic.x - 70; return m.kind; },
  donghai: () => { const a = window.__act, m = a.st.mech; a.P.x = m.plate.x - 90; return m.kind; },
  changyang: () => { const a = window.__act, m = a.st.mech; a.P.x = m.drum.x - 50; m.drum.beats = [a.st.t]; return m.kind; },
  kunlun: () => { const a = window.__act, m = a.st.mech; a.P.x = m.lamps[1].x; m.lamps[0].lit = 4; return m.kind; },
  hundun: () => { const a = window.__act, m = a.st.mech; a.P.x = m.plats[0].x - 30; a.st.eyeOn = true; return m.kind; },
  yugu: () => { const a = window.__act, m = a.st.mech; a.P.x = m.tree.x - 80; return m.kind; },
  beihai: () => { const a = window.__act, m = a.st.mech; a.P.x = m.ice.x - 60; return m.kind; },
  guixu: () => { const a = window.__act, m = a.st.mech; a.P.x = m.plats[0].x - 30; return m.kind; },
};
for (const [rid, fn] of Object.entries(fns)) { try { log(rid, await mech(rid, fn)); } catch (e) { log('mech fail', rid, e.message); } }
// 梦阶：闭目后
await p.evaluate(() => { const a = window.__act; a.st.dream = 1; }); await sleep(500); await shot('04_mech_guixu_dream');
// 4) 首领破绽窗口
await p.evaluate(() => { const a = window.__act; a.st.over = true; });
await p.evaluate(() => { window.__zlj.launch(window.__zlj.STAGES.qingqiu_5, {}); }); await sleep(1200); await skipDlg();
await p.evaluate(() => { const a = window.__act, ai = a.arenas.length - 1; for (const f of a.foes) { f.hp = 0; f.dead = true; } a.foes.length = 0; a.arenas.forEach((ar, i) => { if (i < ai) { ar.started = true; ar.done = true; ar.wave = ar.waves.length; } }); a.st.locked = false; a.P.x = a.arenas[ai].x0 + 40; window.__ZLJ_TEST.actBot = {}; }); await sleep(1500); await skipDlg();
for (let i = 0; i < 40; i++) { const r = await p.evaluate(() => { const a = window.__act; const f = a?.foes.find(x => x.def_.boss && !x.dead); if (!f) return null; if (Math.abs(a.P.x - f.x) > 220) a.P.x = f.x - 150; if (f.weakRule && (f.weakT > 0)) return 'open'; return f.weakRule?.desc || 'wait'; }); if (r === 'open') { await shot('05_boss_weak_window'); break; } await skipDlg(); await sleep(500); if (i === 39) { log('no weak window seen', r); await shot('05_boss_fight'); } }
log('weakRule', await p.evaluate(() => window.__act?.foes.find(x => x.def_.boss)?.weakRule?.desc));
await p.evaluate(() => { window.__ZLJ_TEST.actBot = null; const a = window.__act; a.st.over = true; });
// 5) 闯关地图：同步行 + 机关提示
await sleep(800);
await p.evaluate(() => { const S = window.__zlj.S; S.act.cleared.qingqiu_10 = true; S.canon = { qq_trial: { v: 'protect', from: 'act' } }; S.flags.baiji_protected = true; window.__zlj.adventureScreen?.(); }); await sleep(1200);
await shot('06_adventure_sync'); await layoutCheck('adventure');
log('ERRS', errs.filter(e => !/favicon/.test(e)).slice(0, 15)); log('BAD', bad.slice(0, 10)); await b.close();
