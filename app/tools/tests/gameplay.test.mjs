import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { StageClock, setFoeLayer, telegraphDuration } from '../../src/action/rules.js';
import { STAGES, towerStage, rushStage, DAILY, dailyStage } from '../../src/action/stages.js';
import { AFOES, ABOSSES } from '../../src/action/foes.js';
import { assetPath } from '../../src/engine/assets.js';

test('stage timers stop when not advanced, can cancel, and respect slow motion',()=>{
  const clock=new StageClock();const hits=[];
  clock.schedule(()=>hits.push('attack'),100);
  clock.schedule(()=>hits.push('visual'),100,true);
  assert.deepEqual(hits,[]);clock.advance(.1,.5);assert.deepEqual(hits,['visual']);
  clock.advance(.1,.5);assert.deepEqual(hits,['visual','attack']);
  clock.schedule(()=>hits.push('late'),10);clock.clear();clock.advance(10);assert.equal(hits.length,2);
});
test('dream transformations preserve damage proportion without inflating stats across repeated switches',()=>{
  const foe={hp:50,max:100,atk:20,def_:{}};
  for(let i=0;i<10;i++){setFoeLayer(foe,true);assert.equal(foe.max,135);setFoeLayer(foe,false);assert.equal(foe.max,100);assert.equal(foe.atk,20);}
  assert.ok(Math.abs(foe.hp-50)<=1);
});
test('eye mode does not shorten the warning-to-damage interval',()=>{
  assert.equal(telegraphDuration(.7),.7);assert.ok(telegraphDuration(.1)>=.3);
});
test('generated normal stages have a bounded encounter count',()=>{
  for(const stage of Object.values(STAGES)) {
    if(stage.signature||stage.hidden||stage.kind==='keysecret')continue;
    const enemies=stage.arenas.flatMap(a=>a.waves).flat().length;
    assert.ok(enemies<=36,`${stage.id}: ${enemies}`);assert.ok(stage.arenas.length<=3);
  }
});
test('all fixed, tower, daily and rush enemies and bosses exist',()=>{
  const stages=[...Object.values(STAGES),...Array.from({length:100},(_,i)=>towerStage(i+1)),...DAILY.map(d=>dailyStage(d,12)),rushStage()];
  for(const stage of stages){
    if(stage.boss)assert.ok(ABOSSES[stage.boss],stage.id);
    for(const arena of stage.arenas){if(arena.boss)assert.ok(ABOSSES[arena.boss],stage.id);
      for(const foe of [...arena.waves||[],...arena.dreamWaves||[]].flat())assert.ok(AFOES[foe],`${stage.id}: ${foe}`);}
  }
});
test('every story background resolves to a bundled asset',()=>{
  const story=JSON.parse(fs.readFileSync(new URL('../../src/gen/story.json',import.meta.url)));
  for(const command of story.cmds)if(command.t==='bg'&&command.a!=='none')
    assert.ok(fs.existsSync(new URL(`../../public/assets/${assetPath('bg/'+command.a)}.webp`,import.meta.url)),`${command.at}: ${command.a}`);
});
