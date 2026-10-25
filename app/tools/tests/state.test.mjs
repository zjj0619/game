import test from 'node:test';
import assert from 'node:assert/strict';
const values=new Map([['zlj_settings','bad json']]);
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
const state=await import('../../src/engine/state.js');
const progress=await import('../../src/action/progress.js');
const {STAGES}=await import('../../src/action/stages.js');

test('damaged settings use defaults without deleting saves',()=>{assert.equal(state.settings.fx,1);assert.equal(values.get('zlj_settings'),'bad json');});
test('first-clear gold equals the amount displayed, including signature rewards',()=>{
  state.newGame();progress.ensureAct();const before=state.S.gold;
  const out=progress.applyResult(STAGES.jincheng_5,{win:true,rating:'B',gold:0,exp:0,team:['yangui'],kills:0,hits:1,combo:0});
  assert.equal(state.S.gold-before,out.gold);
});
test('a damaged save recovers from the previous valid write',()=>{
  state.newGame();state.S.gold=123;state.save(0);state.S.gold=456;state.save(0);
  values.set('zlj_save_0','broken');assert.equal(state.load(0),true);assert.equal(state.S.gold,123);
  assert.equal(state.slotInfo(0).lv,1);
});
test('invalid imports preserve current progress',()=>{
  state.newGame();const before=state.S;const code=btoa(JSON.stringify({party:{yangui:{lv:-5}},gold:0}));
  assert.throws(()=>state.importCode(code));assert.equal(state.S,before);
});
test('lamp paths unlock predictably and remain a free choice',()=>{
  state.newGame();progress.ensureAct();assert.equal(progress.chooseLampPath('seer'),false);
  state.S.act.cleared.jincheng_3=1;assert.equal(progress.chooseLampPath('seer'),true);assert.equal(state.S.act.lampPath,'seer');
});
test('migration preserves zero affection instead of restoring default affection',()=>{
  state.newGame();state.S.aff.baiji=0;state.setState(state.S);assert.equal(state.S.aff.baiji,0);
});
