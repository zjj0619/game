// 数据与剧情校验 + 随机/策略模拟通关（node tools/validate.mjs）
import { nextBond, BONDS } from '../src/data/bonds.js';
import { assetPath } from '../src/engine/assets.js';
import fs from 'fs'; import path from 'path';
const root = path.resolve('.');
const story = JSON.parse(fs.readFileSync('src/gen/story.json','utf8'));
const imp = async f => import('file://'+path.join(root,'src/data',f));
const { ITEMS, RECIPES } = await imp('items.js');
const { CHARS } = await imp('characters.js');
const { ENEMIES, ENCOUNTERS } = await imp('enemies.js');
const { REGIONS } = await imp('regions.js');
const { QUESTS } = await imp('quests.js');
const { LORE } = await imp('lore.js');
const { ACHIEVEMENTS } = await imp('achievements.js');
const audioSrc = fs.readFileSync('src/engine/audio.js','utf8');
const THEMES = new Set([...audioSrc.matchAll(/^\s{2}(\w+):\{root/gm)].map(m=>m[1]));
for(const match of audioSrc.matchAll(/(?:^|[,\n])\s*(\w+):\s*M\(/gm)) THEMES.add(match[1]);
const exists = p => fs.existsSync(path.join('public/assets', assetPath(p)+'.webp'));
const errs = [], warns = [];
const E = (at,msg)=>errs.push(`${at||''} ${msg}`);
const { cmds, labels } = story;
const PLAYABLE = ['yangui','baiji','xianwei','qi','ali','kualing','fuli'];
const FX = new Set(['embers','snow','stars','petals','blue','none','mist','dust']);
function chkEff(e, at){
  let m;
  if ((m=e.match(/^aff:(\w+)[+-]\d+$/))) { if (!PLAYABLE.includes(m[1])) warns.push(at+' 好感对象非同伴 '+m[1]); return; }
  if (/^(hope|gold|exp)[+-]\d+$/.test(e) || /^(flag|unflag):\w+$/.test(e) || /^var:\w+[+-]\d+$/.test(e) || e==='heal') return;
  if ((m=e.match(/^(item|take):(\w+)(\*\d+)?$/))) { if (!ITEMS[m[2]]) E(at,'未知物品 '+m[2]); return; }
  if ((m=e.match(/^(join|leave|lose):(\w+)$/))) { if (!PLAYABLE.includes(m[2])) E(at,'未知同伴 '+m[2]); return; }
  if ((m=e.match(/^codex:(\w+)$/))) { const id=m[1];
    const ok = id.startsWith('c_')?CHARS[id.slice(2)]: id.startsWith('e_')?ENEMIES[id.slice(2)]: id.startsWith('i_')?ITEMS[id.slice(2)]: id.startsWith('r_')?REGIONS[id.slice(2)]: id.startsWith('l_')?LORE[id]:null;
    if (!ok) E(at,'未知图鉴 '+id); return; }
  if ((m=e.match(/^ach:(\w+)$/))) { if (!ACHIEVEMENTS[m[1]]) E(at,'未知成就 '+m[1]); return; }
  if ((m=e.match(/^region:(\w+)$/))) { if (!REGIONS[m[1]]) E(at,'未知地区 '+m[1]); return; }
  E(at,'未知效果 '+e);
}
function chkCond(c, at){ if(!c) return; for (const o of c.split('|')) for (let a of o.split('&')) { a=a.trim().replace(/^!/,'');
  if (/^(aff:\w+|hope|scales|lost|var:\w+|gold|lv|members)\s*(>=|<=|==|!=|>|<)\s*-?\d+$/.test(a)) { const m=a.match(/^aff:(\w+)/); if(m&&!PLAYABLE.includes(m[1])) E(at,'条件好感对象 '+m[1]); continue; }
  let m; if ((m=a.match(/^(party|lostc):(\w+)$/))) { if(!PLAYABLE.includes(m[2])) E(at,'条件同伴 '+m[2]); continue; }
  if ((m=a.match(/^item:(\w+)$/))) { if(!ITEMS[m[1]]) E(at,'条件物品 '+m[1]); continue; }
  if ((m=a.match(/^quest:(\w+)$/))) { if(!QUESTS[m[1]]) E(at,'条件支线 '+m[1]); continue; }
  if (/^flag:\w+$/.test(a) || a==='true' || /^ending:[A-O]$/.test(a)) continue; E(at,'未知条件 '+a); } }
const speakers = new Set(); let lines=0;
for (const c of cmds) {
  const at=c.at;
  switch(c.t){
    case 'say': lines++; if (c.who) speakers.add(c.who); break;
    case 'choice': c.opts.forEach(o=>{ chkCond(o.cond,at); o.eff.forEach(e=>chkEff(e,at)); }); break;
    case 'if': chkCond(c.cond,at); break;
    case 'do': c.eff.forEach(e=>chkEff(e,at)); break;
    case 'battle': if (!ENCOUNTERS[c.enc]) E(at,'未知遭遇 '+c.enc); break;
    case 'explore': if (!REGIONS[c.region]) E(at,'未知地区 '+c.region); break;
    case 'bg': if (!exists('bg/'+c.a)) warns.push(at+' 缺少背景 '+c.a); break;
    case 'cg': if (!exists('cg/'+c.a)) E(at,'缺少CG '+c.a); break;
    case 'show': if (!exists('por/'+c.id)) E(at,'缺少立绘 '+c.id); if(!['left','right','center'].includes(c.pos)) E(at,'位置 '+c.pos); break;
    case 'bgm': if (!THEMES.has(c.a)) warns.push(at+' 未知BGM '+c.a); break;
    case 'fx': if (!FX.has(c.a)) warns.push(at+' 未知特效 '+c.a); break;
    case 'ending': if (!'ABCDEFGHIJKLMNO'.includes(c.a)||c.a.length!==1) E(at,'结局 '+c.a); break;
    case 'hide': case 'goto': case 'return': case 'chapter': case 'interlude': case 'note': case 'save': case 'wait': case 'cgoff': case 'title': case 'sfx': case 'shake': case 'flash': break;
    default: E(at,'未知指令 @'+c.t);
  }
}
// 数据交叉引用
for (const [k,enc] of Object.entries(ENCOUNTERS)) for (const f of enc.foes) { const id=f.id||f[0]; if (!ENEMIES[id]) E('enc '+k,'未知敌人 '+id); }
for (const [k,e] of Object.entries(ENEMIES)) if (e.img && !exists(e.img)) E('enemy '+k,'缺少图 '+e.img);
for (const [k,r] of Object.entries(REGIONS)) { if (!exists('bg/'+r.bg)) E('region '+k,'缺少背景'); for (const n of r.nodes||[]) for (const en of n.enc||[]) if (!ENCOUNTERS[en]) E('region '+k,'未知遭遇 '+en); }
for (const [k,q] of Object.entries(QUESTS)) {
  if (labels[q.start]===undefined) E('quest '+k,'缺少标签 '+q.start); if (labels[q.done]===undefined) E('quest '+k,'缺少标签 '+q.done);
  for (const e of Object.keys(q.need.kill||{})) if (!ENEMIES[e]) E('quest '+k,'未知敌人 '+e);
  for (const i of Object.keys(q.need.item||{})) if (!ITEMS[i]) E('quest '+k,'未知物品 '+i);
  if (q.need.win && !ENCOUNTERS[q.need.win]) E('quest '+k,'未知遭遇 '+q.need.win);
  for (const i of Object.keys(q.reward.items||{})) if (!ITEMS[i]) E('quest '+k,'奖励物品 '+i);
  for (const c of Object.keys(q.reward.aff||{})) if (!PLAYABLE.includes(c)) E('quest '+k,'奖励好感 '+c);
}
for (const r of RECIPES||[]) { if (!ITEMS[r.out]) E('recipe','产物 '+r.out); for (const i of Object.keys(r.need)) if (!ITEMS[i]) E('recipe','材料 '+i); }
for (const k of Object.keys(CHARS)) if (!exists('por/'+k)) E('char '+k,'缺少立绘');
// 可达性
const BL = Object.entries(BONDS).flatMap(([c,a])=>a.map((_,k)=>`bond_${c}_${k+1}`));
for (const b of BL) if (labels[b]===undefined) E('bond','缺少标签 '+b);
const reach = new Set(); const stack = [labels.start, ...Object.values(QUESTS).flatMap(q=>[labels[q.start],labels[q.done]]), ...BL.map(b=>labels[b]).filter(x=>x!==undefined)];
const lab = l => labels[l];
while (stack.length) { let pc = stack.pop(); while (pc!==undefined && pc<cmds.length && !reach.has(pc)) { reach.add(pc); const c=cmds[pc];
  if (c.t==='choice') { c.opts.forEach(o=>stack.push(lab(o.to))); break; }
  if (c.t==='goto') { stack.push(lab(c.a)); break; } if (c.t==='if') stack.push(lab(c.to));
  if (c.t==='explore') { stack.push(lab(c.to)); break; } if (c.t==='battle' && c.lose) stack.push(lab(c.lose));
  if (['return','ending','title'].includes(c.t)) break; pc++; } }
const unreach = cmds.map((c,i)=>i).filter(i=>!reach.has(i));
if (unreach.length) warns.push(`不可达指令 ${unreach.length} 条，如 ${unreach.slice(0,5).map(i=>cmds[i].at).join(', ')}`);
// —— 模拟（tools/sim.mjs，含主线/闯关定局账本） ——
const { simulate, rnd, greedy, ALL, initFor, sidesFor } = await import('./sim.mjs');
const counts={}; let simErr=null; const N=3000;
for (let i=0;i<N;i++){ const r=simulate(rnd, Math.random()); if (r.err){simErr=r.err;break;} counts[r.ending]=(counts[r.ending]||0)+1; }
// 策略：选择带正向好感/灯心最多的项，结局优先 F
const best={}; for (const T of ALL) { let hit=0; for (let i=0;i<120;i++){ const r=simulate(greedy(T), sidesFor(T), initFor(T)); if (r.ending===T) hit++; } best[T]=hit; }
// 额外：纯随机 + 定向种子确认 D/L 可达
for (const T of ['D','L']) {
  let ok=false; for (let i=0;i<400 && !ok;i++){ const r=simulate(rnd, 0, initFor(T)); if (r.ending===T) ok=true; }
  if (!ok) { // force-pick at finale
    const force = (okopts,S,c) => { const t=okopts.find(o=>o.to==='fin_'+T.toLowerCase()); return t||rnd(okopts); };
    for (let i=0;i<200 && !ok;i++){ const r=simulate(force, 0, initFor(T)); if (r.ending===T) ok=true; }
  }
  if (!ok) errs.push('结局 '+T+' 不可达'); else if (!best[T]) best[T]=1;
}
const missing = [...ALL].filter(T=>!(best[T]>0));
if (missing.length) warns.push('策略未命中结局: '+missing.join(''));
const sample = simulate(greedy('F'),1);
console.log(`剧情：${cmds.length} 指令，${Object.keys(labels).length} 标签，${lines} 句台词，${story.chars} 字，${speakers.size} 位说话者`);
console.log(`数据：物品 ${Object.keys(ITEMS).length}，敌人 ${Object.keys(ENEMIES).length}，遭遇 ${Object.keys(ENCOUNTERS).length}，地区 ${Object.keys(REGIONS).length}，支线 ${Object.keys(QUESTS).length}，图鉴传说 ${Object.keys(LORE).length}，成就 ${Object.keys(ACHIEVEMENTS).length}，角色 ${Object.keys(CHARS).length}`);
console.log('随机模拟结局分布', counts, simErr?('错误:'+simErr):'');
console.log('策略模拟（200次中命中）', best, '支线', Object.keys(sample.S?.quests||{}).length, '真结局样本：灯心', sample.S?.hope, '鳞', sample.scales, '好感', JSON.stringify(sample.S?.aff));
warns.forEach(w=>console.log('警告:',w));
if (errs.length){ console.error('错误 '+errs.length+' 项:\n'+errs.join('\n')); process.exit(1); }
console.log('校验通过 ✓');
