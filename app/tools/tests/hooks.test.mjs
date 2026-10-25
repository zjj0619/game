import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const hooks=await import('../../src/action/hooks.js');

test('an awake or uncleared dream gate remains available until entry conditions are met',()=>{
  const secret={kind:'gate',x:100,y:232,arena:0,taken:false,revealed:true};
  const ctx={st:{dream:0,t:10,secrets:[secret]},P:{x:100,y:232},arenas:[{done:true}],say:()=>{},sfx:()=>{},part:()=>{}};
  assert.equal(hooks.trySecretPickup(ctx),null);assert.equal(secret.taken,false);
  ctx.st.dream=1;ctx.arenas[0].done=false;assert.equal(hooks.trySecretPickup(ctx),null);assert.equal(secret.taken,false);
  ctx.arenas[0].done=true;assert.equal(hooks.trySecretPickup(ctx).kind,'gate');assert.equal(secret.taken,true);
});
test('waiting and repeated empty swaps cannot fill resonance',()=>{
  const ctx={roster:[{alive:true},{alive:true}],ri:0,P:{},st:{reso:0},foes:[{dead:false}],say:()=>{},sfx:()=>{}};
  for(let i=0;i<100;i++){hooks.tickReso(ctx,1);hooks.onSwapReso(ctx);}
  assert.equal(ctx.st.reso,20);
  ctx.st.relayWindow=2;hooks.onSwapReso(ctx);assert.equal(ctx.st.reso,36);hooks.onSwapReso(ctx);assert.equal(ctx.st.reso,36);
});
test('switching layers alone no longer grants a rating bonus',()=>{
  assert.equal(hooks.ratingBonus({dreamSeen:true,awakeSeen:true,layerClears:[0,0]}),0);
  assert.equal(hooks.ratingBonus({layerClears:[1,1]}),1);
});
