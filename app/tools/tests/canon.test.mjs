import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem(){}, removeItem(){} };
const { CANON, VN_LABEL, REGION_CH, vnFilter, vnApply, actOptions, actApply, canonOf, factOnly } = await import('../../src/engine/canon.js');
const { REGION_STORY } = await import('../../src/action/storyBeats.js');
const { simulate, greedy, rnd, ALL, initFor, sidesFor, actPick, labels } = await import('../sim.mjs');

// 闯关里所有抉择（带区域与主线章节）
const ACT = [];
for (const [r, R] of Object.entries(REGION_STORY)) for (const k of ['mid', 'boss']) if (R[k]?.choice) ACT.push({ region: r, ch: REGION_CH[r], choice: R[k].choice });
const KEY_FLAGS = { E: ['baiji_protected'], F: ['ba_freed', 'fuli_forgiven', 'baiji_protected'], G: ['xw_sea_oath'], H: ['qi_oath'], I: ['ali_wait'], J: ['kl_chase'], K: ['fuli_forgiven'], O: ['xiangliu_spared'] };

const pickers = {
  mercy: () => opts => opts.find(o => o.fx.some(e => /var:mercy/.test(e))) || opts[0],
  ruthless: () => opts => opts.find(o => o.fx.some(e => /var:ruthless/.test(e))) || opts[opts.length - 1],
  target: T => opts => opts.find(o => (KEY_FLAGS[T] || []).some(f => o.fx.includes('flag:' + f))) || opts.find(o => o.fx.some(e => /var:mercy/.test(e))) || opts[0],
  random: () => opts => rnd(opts),
};
/** 闯关抉择在主线某章开头（before）或该区主线章节之后（after）发生 */
function actHook(pickOpt, when){
  const done = new Set(); const log = [];
  return { log, onChapter(S, n, eff){
    for (const a of ACT) { if (done.has(a)) continue;
      const w = typeof when === 'function' ? when(a) : when;
      const at = w === 'before' ? a.ch[0] : a.ch[1] + 1;
      if (n >= at) { done.add(a); const o = actPick(S, a.choice, pickOpt, eff); log.push([a.region, o?.canon, w]); }
    } } };
}

test('canon map covers real VN labels and action choices carry matching ids', () => {
  for (const lb of Object.keys(VN_LABEL)) assert.ok(labels[lb] !== undefined, 'VN label exists: ' + lb);
  for (const a of ACT) if (a.choice.key) {
    const vals = new Set(Object.values(CANON[a.choice.key].vn));
    for (const o of a.choice.opts) if (o.canon && o.canon !== 'later') assert.ok(vals.has(o.canon), `${a.region} ${o.canon}`);
  }
});

test('decided in action → VN shows only the matching option and skips double numbers', () => {
  const S = { flags: {}, canon: {} };
  const ch = REGION_STORY.yugu.boss.choice; const seal = actOptions(S, ch).opts.find(o => o.canon === 'seal');
  const fx = actApply(S, ch, seal); assert.ok(fx.includes('flag:ba_sealed')); fx.forEach(e => { if (e.startsWith('flag:')) S.flags[e.slice(5)] = true; });
  const opts = [{ to: 'c8_free', eff: ['flag:ba_freed', 'hope+3'] }, { to: 'c8_seal', eff: ['flag:ba_sealed', 'hope-3', 'aff:ali+2'] }];
  const F = vnFilter(S, opts); assert.equal(F.locked, true); assert.deepEqual(F.opts.map(o => o.to), ['c8_seal']);
  assert.deepEqual(vnApply(S, F.opts[0]), ['flag:ba_sealed']);
  assert.deepEqual(factOnly(['aff:qi+3', 'hope-1', 'var:mercy+1', 'flag:x', 'item:y']), ['flag:x', 'item:y']);
});

test('decided in VN → action offers the VN-only outcome instead of contradicting it', () => {
  const S = { flags: { fuli_killed: true }, canon: {} };
  const ch = REGION_STORY.guixu.mid.choice; const A = actOptions(S, ch);
  assert.equal(A.locked, true); assert.equal(A.opts.length, 1); assert.equal(A.opts[0].canon, 'kill');
  const S2 = { flags: {}, canon: {} }; assert.ok(actOptions(S2, ch).opts.every(o => !o.vnOnly));
  assert.equal(canonOf({ flags: { xl_bond: true, xiangliu_spared: true } }, 'xl_fate'), 'spare');
});

test('all 15 endings stay reachable with action choices made before, after or interleaved with the VN', () => {
  for (const when of ['none', 'before', 'after', 'mixed']) {
    const hit = {};
    for (const T of ALL) {
      for (let i = 0; i < 60 && !hit[T]; i++) {
        const init = { ...initFor(T) };
        if (when !== 'none') init.onChapter = actHook(pickers.target(T), when === 'mixed' ? (a => (a.ch[0] + i) % 2 ? 'before' : 'after') : when).onChapter;
        let r = simulate(greedy(T), sidesFor(T), init);
        if (r.ending !== T && (T === 'D' || T === 'L')) r = simulate((ok, S, c) => ok.find(o => o.to === 'fin_' + T.toLowerCase()) || rnd(ok), 0, init);
        if (r.ending === T) hit[T] = true;
      }
    }
    const miss = [...ALL].filter(T => !hit[T]);
    assert.deepEqual(miss, [], `unreachable endings (${when}): ${miss.join('')}`);
  }
});

test('every ending is reachable by some whole-run action temperament (mercy / ruthless / none)', () => {
  const hit = {};
  for (const T of ALL) for (const prof of ['none', 'mercy', 'ruthless']) {
    for (let i = 0; i < 40 && !hit[T]; i++) {
      const init = { ...initFor(T) };
      if (prof !== 'none') init.onChapter = actHook(pickers[prof](), i % 2 ? 'before' : 'after').onChapter;
      let r = simulate(greedy(T), sidesFor(T), init);
      if (r.ending !== T && (T === 'D' || T === 'L')) r = simulate((ok) => ok.find(o => o.to === 'fin_' + T.toLowerCase()) || rnd(ok), 0, init);
      if (r.ending === T) hit[T] = (hit[T] || []).concat(prof);
    }
  }
  assert.deepEqual([...ALL].filter(T => !hit[T]), []);
  // 狠决路线：D 必须可达；仁心路线：E/O 的放宽条件可用
  const ruthD = simulate((ok) => ok.find(o => o.to === 'fin_d') || ok[0], 0, { onChapter: actHook(pickers.ruthless(), 'before').onChapter });
  assert.ok(ruthD.S.vars.ruthless >= 3, 'ruthless profile accumulates');
});

test('random interleaving never produces contradictory canon', () => {
  const BAD = [['fuli_forgiven', 'fuli_killed'], ['ba_freed', 'ba_sealed'], ['xiangliu_spared', 'xiangliu_slain'], ['dj_whole', 'dj_open'], ['xw_sea_oath', 'xw_pragmatic']];
  for (let i = 0; i < 400; i++) {
    const h = actHook(pickers.random(), () => Math.random() < 0.5 ? 'before' : 'after');
    const r = simulate(rnd, Math.random(), { onChapter: h.onChapter });
    assert.ok(!r.err, r.err);
    for (const [a, b] of BAD) assert.ok(!(r.S.flags[a] && r.S.flags[b]), `run ${i}: ${a} + ${b}`);
    for (const [k, v] of Object.entries(r.S.canon || {})) assert.equal(canonOf(r.S, k), v.v);
  }
});
