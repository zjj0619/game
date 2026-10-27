import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem(){}, removeItem(){} };
const stateMod = await import('../../src/engine/state.js');
const { STAGES, REGION_STAGES } = await import('../../src/action/stages.js');
const { CHARS } = await import('../../src/data/characters.js');
const { ABOSSES } = await import('../../src/action/foes.js');
const { REGION_STORY, beatsFor, storyMods, parseLine } = await import('../../src/action/storyBeats.js');
const { REGION_ORDER } = await import('../../src/data/regions.js');

const EFFECT = /^(aff:\w+[+-]\d+|hope[+-]\d+|flag:\w+|var:\w+[+-]\d+|item:\w+(\*\d+)?)$/;

function allLines(R){
  const out = [...(R.intro || []), ...Object.values(R.barks || {})];
  for (const k of ['mid', 'boss', 'hidden']) { const b = R[k]; if (!b) continue; out.push(...(b.pre || []), ...(b.post || [])); for (const o of b.choice?.opts || []) if (o.after) out.push(...[].concat(o.after)); }
  return out;
}

test('every region on the main path has story beats with valid speakers', () => {
  stateMod.setState(stateMod.newGame());
  for (const r of Object.keys(REGION_STAGES)) {
    const R = REGION_STORY[r]; assert.ok(R, 'story for ' + r);
    assert.ok(R.intro?.length && R.boss?.pre?.length && R.boss?.post?.length && R.hidden?.pre?.length, 'beats for ' + r);
    for (const raw of allLines(R)) {
      const s = String(raw).replace(/^\?\S+ /, '');
      const who = s.slice(0, s.indexOf('|'));
      assert.ok(s.includes('|'), 'format: ' + raw);
      assert.ok(who === 'n' || who === 'boss' || CHARS[who], `speaker ${who} in ${r}`);
    }
  }
});

test('choices only add progress (no weary, no flag removal) and parse cleanly', () => {
  for (const [r, R] of Object.entries(REGION_STORY)) for (const k of ['mid', 'boss']) {
    const c = R[k]?.choice; if (!c) continue;
    assert.ok(c.q && c.opts.length >= 2, 'choice ' + r);
    for (const o of c.opts) for (const e of o.fx) {
      assert.match(e, EFFECT, `${r} effect ${e}`);
      assert.ok(!/weary|unflag|lose:|leave:/.test(e), `${r} must not lock endings: ${e}`);
    }
  }
});

test('beatsFor maps stages: chapter card on first, boss talk on 5/10, hidden side story', () => {
  stateMod.setState(stateMod.newGame());
  for (const r of Object.keys(REGION_STAGES)) {
    const ids = REGION_STAGES[r];
    const b0 = beatsFor(STAGES[ids[0]]); assert.ok(b0.card && b0.intro, 'intro ' + r);
    const b9 = beatsFor(STAGES[ids[9]]); assert.ok(b9.bossPre && b9.outro && b9.choice, 'boss ' + r);
    assert.ok(ABOSSES[STAGES[ids[9]].boss], 'boss exists ' + r);
    const hid = ids.map(i => STAGES[i]).find(s => s.hidden);
    if (hid) { const bh = beatsFor(hid); assert.ok(bh.intro && bh.outro, 'hidden ' + r); }
  }
});

test('choices change later stages via storyMods; conditional lines follow flags', () => {
  stateMod.setState(stateMod.newGame());
  assert.equal(storyMods().tag.length, 0);
  stateMod.applyEffects(['var:ruthless+1']);
  const m = storyMods(); assert.ok(m.atk > 1 && m.foeHp > 1 && m.tag.length === 1);
  stateMod.applyEffects(['var:mercy+2']);
  assert.ok(storyMods().hp > 1);
  assert.equal(parseLine('?flag:nope yangui|x'), null);
  stateMod.applyEffects(['flag:nope']);
  assert.deepEqual(parseLine('?flag:nope yangui|x'), { who: 'yangui', text: 'x' });
});

test('ordinary stages carry their own story beats, and intros switch to reunions once the VN is past', async () => {
  const { STAGE_BEATS, KNOWN_INTRO } = await import('../../src/action/stageBeats.js');
  stateMod.setState(stateMod.newGame());
  const seen = new Set();
  for (const r of Object.keys(REGION_STAGES)) for (const i of [1, 2, 3, 5, 6, 7, 8]) {
    const b = beatsFor(STAGES[REGION_STAGES[r][i]]); assert.ok(b.intro?.length >= 2 && b.barks?.[1], `beats ${r} ${i}`);
    const k = b.intro.join(); assert.ok(!seen.has(k), 'no repeated stage beat'); seen.add(k);
    for (const raw of [...b.intro, b.barks[1]]) { const s = String(raw).replace(/^\?\S+ /, ''); const who = s.slice(0, s.indexOf('|')); assert.ok(who === 'n' || who === 'boss' || CHARS[who], `speaker ${who}`); }
  }
  const S = stateMod.S; S.chapterN = 0;
  assert.equal(beatsFor(STAGES[REGION_STAGES.qingqiu[0]]).intro, REGION_STORY.qingqiu.intro);
  S.vnMax = 5; assert.equal(beatsFor(STAGES[REGION_STAGES.qingqiu[0]]).intro, KNOWN_INTRO.qingqiu);
  S.lost.push('baiji'); assert.ok(parseLine('baiji|hi') === null);
  S.flags.fuli_killed = true; assert.ok(parseLine('fuli|hi') === null);
});
