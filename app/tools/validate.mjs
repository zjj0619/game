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
// —— 模拟 ——
const SCALE_Q = Object.values(QUESTS);
function simulate(pick, sidesP, init={}){
  const S = { flags:{}, vars:{}, aff:{baiji:30,xianwei:30,qi:30,ali:30,kualing:30,fuli:20}, hope:init.hope??50, lost:[], members:['yangui'], inv:{}, quests:{}, ...(init.seed||{}) };
  if (init.flags) Object.assign(S.flags, init.flags);
  if (init.vars) Object.assign(S.vars, init.vars);
  if (init.inv) Object.assign(S.inv, init.inv);
  if (init.aff) Object.assign(S.aff, init.aff);
  if (init.members) S.members=init.members.slice();
  const scales = ()=>Object.keys(S.inv).filter(k=>/^k_scale/.test(k)).length;
  const atom = a => { let neg=false; a=a.trim(); if (a[0]==='!'){neg=true;a=a.slice(1);} let r; const m=a.match(/^(aff:\w+|hope|scales|lost|var:\w+|gold|lv|members)\s*(>=|<=|==|!=|>|<)\s*(-?\d+)$/);
    if (m){ const v = m[1].startsWith('aff:')?S.aff[m[1].slice(4)]: m[1]==='hope'?S.hope: m[1]==='scales'?scales(): m[1]==='lost'?S.lost.length: m[1].startsWith('var:')?(S.vars[m[1].slice(4)]||0): m[1]==='members'?S.members.length: 999;
      const n=+m[3]; r = {'>=':v>=n,'<=':v<=n,'==':v==n,'!=':v!=n,'>':v>n,'<':v<n}[m[2]]; }
    else if (a.startsWith('flag:')) r=!!S.flags[a.slice(5)]; else if (a.startsWith('item:')) r=!!S.inv[a.slice(5)]; else if (a.startsWith('party:')) r=S.members.includes(a.slice(6)); else if (a.startsWith('lostc:')) r=S.lost.includes(a.slice(6)); else if (a.startsWith('quest:')) r=S.quests[a.slice(6)]==='done'; else r=a==='true';
    return neg?!r:r; };
  const cond = c => !c || c.split('|').some(o=>o.split('&').every(atom));
  const eff = list => { for (const e of list) { let m;
    if ((m=e.match(/^aff:(\w+)([+-]\d+)$/))) S.aff[m[1]]=Math.max(0,Math.min(100,S.aff[m[1]]+ +m[2]));
    else if ((m=e.match(/^hope([+-]\d+)$/))) S.hope=Math.max(0,Math.min(100,S.hope+ +m[1]));
    else if ((m=e.match(/^flag:(\w+)$/))) { S.flags[m[1]]=true; if (/^ch\d+_done$/.test(m[1])) sides(); }
    else if ((m=e.match(/^unflag:(\w+)$/))) delete S.flags[m[1]];
    else if ((m=e.match(/^var:(\w+)([+-]\d+)$/))) S.vars[m[1]]=(S.vars[m[1]]||0)+ +m[2];
    else if ((m=e.match(/^item:(\w+)/))) S.inv[m[1]]=1;
    else if ((m=e.match(/^join:(\w+)$/))) { if(!S.members.includes(m[1])) S.members.push(m[1]); }
    else if ((m=e.match(/^(leave|lose):(\w+)$/))) { S.members=S.members.filter(x=>x!==m[2]); if (m[1]==='lose') S.lost.push(m[2]); }
  } };
  const sides = () => { for (const q of SCALE_Q) if (!S.quests[q.id] && (S.flags[q.unlock]||q.unlock.startsWith('reg_')) && Math.random()<sidesP) {
      if (q.reward.aff && Object.keys(q.reward.aff).some(c=>!S.members.includes(c))) continue;
      S.quests[q.id]='done'; for (const i of Object.keys(q.reward.items||{})) S.inv[i]=1; for (const [c,v] of Object.entries(q.reward.aff||{})) S.aff[c]=Math.min(100,S.aff[c]+v); }
    for (const m of S.members) { let lb; while ((lb=nextBond(S,m)) && Math.random()<sidesP) { S.flags[lb]=true; S.aff[m]=Math.min(100,S.aff[m]+(m==='fuli'?13:9)); } } };
  let pc = labels.start, steps=0; const path=[];
  while (steps++<20000) { const c = cmds[pc]; if (!c) return {err:'越界'};
    switch (c.t) {
      case 'choice': { const ok=c.opts.filter(o=>cond(o.cond)); const o=pick(ok,S,c); path.push(o.text); eff(o.eff); pc=labels[o.to]; continue; }
      case 'if': if (cond(c.cond)) { pc=labels[c.to]; continue; } break;
      case 'goto': pc=labels[c.a]; continue;
      case 'explore': pc=labels[c.to]; continue;
      case 'do': eff(c.eff); break;
      case 'battle': if (c.lose && Math.random()<0.1) { pc=labels[c.lose]; continue; } break;
      case 'ending': return { ending:c.a, S, scales:scales() };
      case 'return': return {err:'主线遇到 @return '+c.at};
    }
    pc++; }
  return {err:'步数超限'};
}
const rnd = ok => ok[Math.floor(Math.random()*ok.length)];
const counts={}; let simErr=null; const N=3000;
for (let i=0;i<N;i++){ const r=simulate(rnd, Math.random()); if (r.err){simErr=r.err;break;} counts[r.ending]=(counts[r.ending]||0)+1; }
// 策略：选择带正向好感/灯心最多的项，结局优先 F
const KEY_FLAGS = {
  A:[''], B:[''], C:[''], D:[''], E:['baiji_protected'], F:['ba_freed','fuli_forgiven','baiji_protected'],
  G:['xw_sea_oath'], H:['qi_oath'], I:['ali_wait'], J:['kl_chase'], K:['fuli_forgiven','read_sealed'],
  L:['dream_addict'], M:['kids_lamp'], N:['read_sealed'], O:['xiangliu_spared','xl_bond'],
};
const KEY_ITEMS = {
  G:['k_keepsake_xianwei'], H:['k_keepsake_qi'], I:['k_keepsake_ali'], J:['k_keepsake_kualing'],
  K:['k_letter_sealed'], L:['k_lamp_cursed'], M:['k_false_dawn'], N:['k_letter_sealed','k_scale_black'],
  O:['k_scale_dream'],
};
const greedy = target => (ok,S,c) => {
  const tgt = ok.find(o=>o.to==='fin_'+target.toLowerCase() || o.to==='end_'+target.toLowerCase());
  if (tgt) return tgt;
  const wantF = KEY_FLAGS[target]||[];
  const wantI = KEY_ITEMS[target]||[];
  const score = o => {
    let s = o.eff.reduce((acc,e)=>{ const m=e.match(/^(aff:\w+|hope)([+-]\d+)/); return acc+(m?+m[2]:0)
      + (/ba_freed|fuli_forgiven|baiji_protected|xw_sea_oath|qi_oath|ali_wait|kl_chase|xiangliu_spared|xl_bond|read_sealed|kids_lamp|dream_addict/.test(e)?80:0)
      + (/^lose:/.test(e)?-100:0)
      + (wantF.some(f=>e.includes('flag:'+f))?120:0)
      + (wantI.some(i=>e.includes('item:'+i))?120:0)
      + (/item:k_keepsake|item:k_letter|item:k_lamp_cursed|item:k_false_dawn|item:k_scale_/.test(e)?60:0); },0);
    if (o.to==='c9_r_self') s-=30;
    if (target==='D' && /hope-/.test(o.eff.join(' '))) s+=40;
    if (target==='L' && /dream_addict|k_lamp_cursed|dream_flips/.test(o.eff.join(' ')+o.to)) s+=100;
    if (target==='B' && /fin_b|长夜|玄冥/.test(o.to+o.text)) s+=50;
    return s;
  };
  return ok.slice().sort((a,b)=>score(b)-score(a))[0];
};
const ALL='ABCDEFGHIJKLMNO';
const initFor = T => {
  if (T==='D') return { hope:40, flags:{weary:true} };
  if (T==='L') return { hope:60, flags:{dream_addict:true}, vars:{dream_flips:5}, inv:{k_lamp_cursed:1} };
  if (T==='N') return { flags:{read_sealed:true}, inv:{k_letter_sealed:1,k_scale_black:1} };
  return {};
};
const sidesFor = T => (T==='D'||T==='L') ? 0 : 1;
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
