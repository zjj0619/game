import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem(){}, removeItem(){} };
const stateMod = await import('../../src/engine/state.js');
const { STAGES, REGION_STAGES } = await import('../../src/action/stages.js');
const MX = await import('../../src/action/mechs.js');
const { seedSecrets } = await import('../../src/action/hooks.js');

const G = 232;
function rig(rid){
  stateMod.setState(stateMod.newGame());
  const stage = STAGES[REGION_STAGES[rid][6]]; const arenas = stage.arenas.map((a, i) => ({ ...a, i, x0: 160 + i * 900, x1: 160 + i * 900 + 740 }));
  const st = { t: 0, mech: MX.seedMech(stage, arenas), eyeOn: false, dream: 0 }; const said = [];
  const P = { x: 0, y: G, ground: true }; const foes = [];
  const ctx = { st, P, foes, say: s => said.push(s), sfx(){}, part(){}, shake(){}, num(){} };
  const step = (sec = 0.1) => { for (let k = 0; k < sec / 0.05; k++) { st.t += 0.05; MX.tickMech(ctx, 0.05); } };
  return { stage, st, P, foes, ctx, said, step, S: stateMod.S };
}

test('every region except Jincheng has its own seventh-stage mechanism, Jincheng keeps the wall', () => {
  const kinds = new Set();
  for (const rid of Object.keys(REGION_STAGES)) {
    const stage = STAGES[REGION_STAGES[rid][6]]; const m = MX.seedMech(stage, stage.arenas.map((a, i) => ({ ...a, x0: i * 900, x1: i * 900 + 740 })));
    const keyWall = seedSecrets(stage.arenas, stage).some(s => s.key);
    if (rid === 'jincheng') { assert.equal(m, null); assert.ok(keyWall); continue; }
    assert.ok(m, rid); assert.ok(!keyWall, rid + ' no duplicate wall'); kinds.add(m.kind);
    assert.ok(MX.MECHS[rid].hint && MX.MECHS[rid].found.length, rid);
    for (const i of [0, 1, 2, 3, 5, 7, 8]) assert.equal(MX.seedMech(STAGES[REGION_STAGES[rid][i]], []), null);
  }
  assert.equal(kinds.size, 8, 'eight distinct mechanisms');
});

const solved = R => R.st.mech.solved && R.S.act.hkeys[R.stage.region];

test('qingqiu ledge / hundun shadow steps / guixu dream steps need the right state', () => {
  let R = rig('qingqiu'); const r = R.st.mech.relic; Object.assign(R.P, { x: r.x, y: r.y }); R.step(0.4); assert.ok(solved(R));
  R = rig('hundun'); assert.equal(MX.mechPlats(R.st).length, 0); R.st.eyeOn = true; assert.equal(MX.mechPlats(R.st).length, 3);
  R = rig('guixu'); assert.equal(MX.mechPlats(R.st).length, 0); R.st.dream = 1; assert.equal(MX.mechPlats(R.st).length, 3);
});

test('donghai plate needs an enemy, not the player', () => {
  const R = rig('donghai'); const pl = R.st.mech.plate; Object.assign(R.P, { x: pl.x }); R.step(1.5); assert.ok(!R.st.mech.solved);
  R.foes.push({ x: pl.x, y: G, def_: {} }); R.step(0.8); assert.ok(solved(R));
});

test('changyang drum wants three heavy beats 0.6–1.2s apart', () => {
  const R = rig('changyang'); const x = R.st.mech.drum.x; const hit = p => MX.mechOnHit(R.ctx, x - 20, x + 20, p);
  hit(0); R.step(0.8); hit(1); R.step(0.3); hit(1); assert.equal(R.st.mech.drum.beats.length, 1, 'too fast resets');
  R.step(0.8); hit(1); R.step(0.8); hit(1); assert.ok(solved(R));
});

test('kunlun lanterns must all burn at once; yugu shell breaks only to enemy blows; beihai ice needs a plunge', () => {
  let R = rig('kunlun'); for (const l of R.st.mech.lamps) { Object.assign(R.P, { y: l.y + 30 }); MX.mechOnHit(R.ctx, l.x - 10, l.x + 10, 0); R.step(1); }
  assert.ok(solved(R));
  R = rig('kunlun'); const L = R.st.mech.lamps; Object.assign(R.P, { y: L[0].y + 30 }); MX.mechOnHit(R.ctx, L[0].x - 5, L[0].x + 5, 0); R.step(6.5);
  Object.assign(R.P, { y: L[1].y + 30 }); MX.mechOnHit(R.ctx, L[1].x - 5, L[1].x + 5, 0); Object.assign(R.P, { y: L[2].y + 30 }); MX.mechOnHit(R.ctx, L[2].x - 5, L[2].x + 5, 0); R.step(0.1); assert.ok(!R.st.mech.solved);
  R = rig('yugu'); const tr = R.st.mech.tree; MX.mechOnHit(R.ctx, tr.x - 30, tr.x + 30, 1); R.step(0.1); assert.ok(!R.st.mech.solved);
  const f = { x: tr.x - 40, face: 1, w: 30, state: 'atk' }; R.foes.push(f); R.step(0.1); f.state = 'idle'; R.step(0.1); f.state = 'atk'; R.step(0.1); assert.ok(solved(R));
  R = rig('beihai'); const ic = R.st.mech.ice; MX.mechOnLand(R.ctx, ic.x, 600); assert.ok(!R.st.mech.solved); MX.mechOnLand(R.ctx, ic.x, 1000); assert.ok(solved(R));
});

test('boss weak windows vary by boss and only open on their rule', async () => {
  const { ABOSSES } = await import('../../src/action/foes.js');
  const HK = await import('../../src/action/hooks.js');
  const rules = Object.entries(ABOSSES).map(([id, d]) => HK.bossWeakRule({ id, ...d }));
  assert.ok(new Set(rules.map(r => r.v)).size >= 3, 'at least three different window styles');
  assert.ok(rules.some(r => r.parry) && rules.some(r => !r.parry) && rules.every(r => r.phase && r.desc));
  const f = { def_: { boss: true, id: 'x' }, x: 0, y: 232, h: 80, weakMark: 1, face: 1 };
  const P = { x: -50 };
  assert.equal(HK.weakOpen(f, P), false, 'back attacks no longer open a boss');
  HK.openBossWeak(f, 1, 'after'); assert.equal(HK.consumeWeak(f, P), true);
  const g = { def_: { boss: true }, weakMark: 1 }; HK.openBossWeak(g, 2, 'phase'); assert.equal(HK.weakOpen(g, P), false, 'phase window waits for invulnerability');
});
