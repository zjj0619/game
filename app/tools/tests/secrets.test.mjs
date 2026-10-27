import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem(){}, removeItem(){} };
const stateMod = await import('../../src/engine/state.js');
const { STAGES, REGION_STAGES } = await import('../../src/action/stages.js');

const { seedSecrets, placeSecrets, hitWalls, trySecretPickup, consumeWeak, weakOpen } = await import('../../src/action/hooks.js');
const { stageUnlocked } = await import('../../src/action/progress.js');

function world(stage){
  const arenas = stage.arenas.map((a, i) => ({ ...a, i, x0: i * 1000 + 160, x1: i * 1000 + 960, done: false }));
  const st = { t: 1, secrets: seedSecrets(stage.arenas, stage) };
  placeSecrets(st, arenas);
  const said = [];
  const ctx = { stage, st, arenas, P: { x: 0, y: 232, ground: true }, say: m => said.push(m), sfx(){}, part(){}, shake(){}, num(){} };
  return { st, arenas, ctx, said };
}

test('secrets are terrain/interaction based and positioned in their arena', () => {
  const stage = STAGES[REGION_STAGES.jincheng[6]];
  const { st, arenas } = world(stage);
  const kinds = st.secrets.map(s => s.kind);
  assert.ok(kinds.includes('wall') && kinds.includes('stone'));
  assert.ok(st.secrets.some(s => s.key), 'stage 7 hides the hidden-stage map');
  for (const s of st.secrets) assert.ok(s.x >= arenas[s.ai].x0 && s.x <= arenas[s.ai].x1);
});

test('cracked walls only break to heavy hits, and the key unlocks the hidden stage', () => {
  stateMod.setState(stateMod.newGame()); const S = stateMod.S; S.act = S.act || {}; S.act.cleared = {}; S.act.hkeys = {};
  const stage = STAGES[REGION_STAGES.jincheng[6]];
  const { st, ctx } = world(stage);
  const key = st.secrets.find(s => s.key);
  for (let i = 0; i < 10; i++) { st.t += 1; hitWalls(ctx, key.x - 5, key.x + 5, 0); }
  assert.equal(key.taken, false, 'light hits do nothing');
  for (let i = 0; i < key.hp + 4 && !key.taken; i++) { st.t += 1; hitWalls(ctx, key.x - 5, key.x + 5, 1); }
  assert.equal(key.taken, true);
  assert.ok(st.secrets.some(s => s.kind === 'chest'));
  const hid = STAGES[REGION_STAGES.jincheng[10]];
  REGION_STAGES.jincheng.slice(0, 10).forEach(id => { S.act.cleared[id] = { r: 'A' }; });
  assert.equal(stageUnlocked(hid.id), true);
  stateMod.S.act.hkeys = {};
  assert.equal(stageUnlocked(hid.id), false, 'clearing all stages alone is not enough');
});

test('lamp stones must be stepped in order; wrong order resets', () => {
  const stage = STAGES[REGION_STAGES.jincheng[3]];
  const { st, ctx } = world(stage);
  const stones = st.secrets.filter(s => s.kind === 'stone').sort((a, b) => a.ord - b.ord);
  assert.equal(stones.length, 3);
  ctx.P.x = stones[1].x; trySecretPickup(ctx);
  assert.ok(stones.every(s => !s.lit), 'stepping #2 first lights nothing');
  ctx.P.x = stones[0].x; trySecretPickup(ctx);
  ctx.P.x = stones[1].x; trySecretPickup(ctx);
  ctx.P.x = stones[2].x; const r = trySecretPickup(ctx);
  assert.equal(r?.kind, 'path');
});

test('weak points need an opening (recovery, stun or back attack)', () => {
  const P = { x: 0 };
  const f = { x: 50, face: -1, state: 'idle', weakMark: 1 };
  assert.equal(weakOpen(f, P), false);
  assert.equal(consumeWeak(f, P), false);
  f.state = 'atk'; assert.equal(consumeWeak(f, P), true);
  const g = { x: 50, face: 1, state: 'idle', weakMark: 1 };
  assert.equal(consumeWeak(g, P), true, 'from behind');
});
