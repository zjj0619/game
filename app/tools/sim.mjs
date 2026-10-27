// 剧情模拟器（validate 与测试共用）：按编译后的 story.json 跑主线，支持「定局账本」与闯关抉择穿插
import { nextBond } from '../src/data/bonds.js';
import { QUESTS } from '../src/data/quests.js';
import { vnFilter, vnApply, actOptions, actApply } from '../src/engine/canon.js';
import fs from 'fs';
const story = JSON.parse(fs.readFileSync(new URL('../src/gen/story.json', import.meta.url), 'utf8'));
const { cmds, labels } = story;
// —— 模拟 ——
const SCALE_Q = Object.values(QUESTS);
export function simulate(pick, sidesP, init={}){
  const S = { flags:{}, vars:{}, aff:{baiji:30,xianwei:30,qi:30,ali:30,kualing:30,fuli:20}, hope:init.hope??50, lost:[], members:['yangui'], inv:{}, quests:{}, ...(init.seed||{}) };
  if (init.canon) S.canon = JSON.parse(JSON.stringify(init.canon));
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
      case 'choice': { const ok0=c.opts.filter(o=>cond(o.cond)); const F=vnFilter(S, ok0); const o=pick(F.opts,S,c); path.push(o.text); if (init.trace) init.trace.push(o.to); eff(vnApply(S,o)); pc=labels[o.to]; continue; }
      case 'chapter': if (init.onChapter) init.onChapter(S, +c.n, eff); break;
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
export const rnd = ok => ok[Math.floor(Math.random()*ok.length)];
export const KEY_FLAGS = {
  A:[''], B:[''], C:[''], D:[''], E:['baiji_protected'], F:['ba_freed','fuli_forgiven','baiji_protected'],
  G:['xw_sea_oath'], H:['qi_oath'], I:['ali_wait'], J:['kl_chase'], K:['fuli_forgiven','read_sealed'],
  L:['dream_addict'], M:['kids_lamp'], N:['read_sealed'], O:['xiangliu_spared','xl_bond'],
};
export const KEY_ITEMS = {
  G:['k_keepsake_xianwei'], H:['k_keepsake_qi'], I:['k_keepsake_ali'], J:['k_keepsake_kualing'],
  K:['k_letter_sealed'], L:['k_lamp_cursed'], M:['k_false_dawn'], N:['k_letter_sealed','k_scale_black'],
  O:['k_scale_dream'],
};
export const greedy = target => (ok,S,c) => {
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
export const ALL='ABCDEFGHIJKLMNO';
export const initFor = T => {
  if (T==='D') return { hope:40, flags:{weary:true} };
  if (T==='L') return { hope:60, flags:{dream_addict:true}, vars:{dream_flips:5}, inv:{k_lamp_cursed:1} };
  if (T==='N') return { flags:{read_sealed:true}, inv:{k_letter_sealed:1,k_scale_black:1} };
  return {};
};
export const sidesFor = T => (T==='D'||T==='L') ? 0 : 1;

export { cmds, labels };
/** 闯关抉择在模拟器中的落地：choice 为 REGION_STORY 的抉择定义 */
export function actPick(S, choice, pickOpt, eff){
  const A = actOptions(S, choice); const o = pickOpt(A.opts); if (!o) return null;
  eff(actApply(S, choice, o)); return o;
}
