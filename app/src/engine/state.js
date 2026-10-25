import { TALENTS, SETS, setOf, AFFIXES } from '../data/progress.js';
import { CHARS, SKILLS, COMPANIONS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

export const SAVE_SLOTS = 6;
const KEY = 'zlj_save_'; const META = 'zlj_meta'; const SET = 'zlj_settings';

export const settings = Object.assign({
  master:0.8, music:0.6, sfx:0.8, voice:0.9, textSpeed:40, autoDelay:1600, fx:1,
  aiEnabled:true, haptics:true, aiVoice:false, apiKey:'', aiBase:'https://api.minimax.cn', battleSpeed:1, autoBattle:false,
}, JSON.parse(localStorage.getItem(SET) || '{}'));
export function saveSettings(){ localStorage.setItem(SET, JSON.stringify(settings)); }

export const meta = Object.assign({ endings:[], cgs:[], ach:{}, readLines:{} }, JSON.parse(localStorage.getItem(META)||'{}'));
export function saveMeta(){ try { localStorage.setItem(META, JSON.stringify(meta)); } catch(e){} }

export let S = null;
export function newGame(){
  S = {
    ver:1, created:Date.now(), playtime:0, chapter:'序章', chapterN:0,
    pc:0, mode:'vn', explore:null, region:'jincheng', bg:null, bgm:null, shown:{}, cg:null,
    party:{}, members:[], formation:[], lost:[],
    aff:Object.fromEntries(COMPANIONS.map(c=>[c,30]).concat([['fuli',20]])), hope:50,
    flags:{}, vars:{}, inv:{}, gold:100,
    quests:{}, qsnap:{}, kills:{}, codex:{}, stats:{wins:0,weak:0,ults:0,crafts:0,battles:0},
    gather:{}, dreams:[], fortune:null, visited:{},
    lamp:1, refine:{}, chests:{}, puzzles:{}, pos:{},
  };
  addMember('yangui', 1);
  S = migrate(S);
  return S;
}
export function migrate(s){ if (!s) return s; s.lamp ??= 1; s.refine ??= {}; s.chests ??= {}; s.puzzles ??= {}; s.pos ??= {}; for (const m of Object.keys(s.party||{})) { s.party[m].talents ??= []; s.party[m].equip ??= {weapon:null,armor:null,charm:null}; s.party[m].perm ??= {}; }
  s.act ??= {}; const A = s.act; A.cleared ??= {}; A.best ??= {}; A.tower ??= 0; A.team ??= ['yangui']; A.slv ??= {}; A.slots ??= {}; A.spSpent ??= {}; A.spBonus ??= {}; A.pets ??= {}; A.pet ??= null; A.souls ??= {}; A.heroes ??= []; A.hard ??= {}; A.rush ??= 0; A.tut ??= {}; A.runs ??= 0; A.seen ??= {};
  A.team = A.team.filter(id => s.party?.[id]); if (!A.team.length) A.team = ['yangui'];
  s.city ??= { lamp:1, forge:1, herb:1, beast:1, market:1, tower:1 }; s.daily ??= { day:'', done:{}, prog:{}, claimed:{} }; s.stats ??= {}; s.ver = Math.max(s.ver||0, 3);
  return s; }
export function setState(s){ S = migrate(s); }

// —— 角色 ——
export function addMember(id, lv){
  if (!S.party[id]) {
    const avg = S.members.length ? Math.round(S.members.reduce((a,m)=>a+S.party[m].lv,0)/S.members.length) : 1;
    const L = Math.max(lv||1, avg);
    S.party[id] = { lv:L, exp:0, equip:{ weapon: id==='yangui'?'w_lantern':null, armor: id==='yangui'?'a_robe':null, charm:null }, perm:{}, talents:[] };
    const st = stats(id); S.party[id].hp = st.hp; S.party[id].mp = st.mp;
  }
  if (!S.members.includes(id)) S.members.push(id);
  S.lost = S.lost.filter(x=>x!==id);
  if (S.formation.length < 4 && !S.formation.includes(id)) S.formation.push(id);
  unlock('c_'+id);
}
export function removeMember(id, lost){
  S.members = S.members.filter(x=>x!==id); S.formation = S.formation.filter(x=>x!==id);
  if (lost && !S.lost.includes(id)) S.lost.push(id);
  fillFormation();
}
export function fillFormation(){ for (const m of S.members) if (S.formation.length<4 && !S.formation.includes(m)) S.formation.push(m); }

export function stats(id){
  const c = CHARS[id]; const p = S.party[id]; const L = p.lv;
  const s = {}; for (const k of ['hp','mp','atk','mag','def','spd']) s[k] = Math.round(c.base[k] + c.grow[k]*(L-1));
  s.crit = 0.06; s.immune = []; s.res = []; s.boost = {}; s.regen = 0; s.mpregen = 0; s.goldBonus = 0;
  for (const slot of ['weapon','armor','charm']) {
    const it = ITEMS[p.equip[slot]]; if (!it) continue;
    for (const k of ['hp','mp','atk','mag','def','spd']) if (it[k]) s[k] += it[k];
    if (it.crit) s.crit += it.crit; if (it.immune) s.immune.push(...it.immune); if (it.res) s.res.push(it.res);
    if (it.boost) for (const [e,v] of Object.entries(it.boost)) s.boost[e]=(s.boost[e]||0)+v;
    if (it.el && slot==='weapon') s.wel = it.el;
    if (it.regen) s.regen += it.regen; if (it.mpregen) s.mpregen += it.mpregen; if (it.goldBonus) s.goldBonus += it.goldBonus;
    if (it.spd2) s.aspd = (s.aspd||0) + it.spd2;
  }
  for (const [k,v] of Object.entries(p.perm||{})) s[k]+=v;
  // v1.1：精炼、套装、星命
  const fx = []; const counted = {};
  for (const slot of ['weapon','armor','charm']) {
    const iid = p.equip[slot]; const it = ITEMS[iid]; if (!it) continue; const R = S.refine?.[iid];
    if (R && R.lv) { for (const k of ['hp','mp','atk','mag','def']) if (it[k]) s[k] += Math.round(it[k]*0.10*R.lv); for (const a of R.aff||[]) { const A = AFFIXES.find(x=>x.k===a); if (A) fx.push({[A.k]:A.v}); } }
    for (const a of it.affix||[]) if (!['crit','spd','goldBonus'].includes(a.k)) fx.push({[a.k]:a.v});
    const set = setOf(iid); if (set) counted[set.id] = (counted[set.id]||0)+1;
  }
  for (const set of SETS) { const n = counted[set.id]||0; if (n>=2) fx.push(set.b2.fx); if (n>=3) fx.push(set.b3.fx); }
  const tl = TALENTS[id]; const got = p.talents||[]; if (tl) for (const node of tl) if (got.includes(node.id)) fx.push(node.fx);
  const pct = { hp:0, atk:0, mag:0, def:0 };
  for (const f of fx) for (const [k,v] of Object.entries(f)) {
    if (k==='boost') { for (const [e,b] of Object.entries(v)) s.boost[e]=(s.boost[e]||0)+b; }
    else if (k.endsWith('Pct')) pct[k.slice(0,-3)] += v;
    else s[k] = (s[k]||0) + v;
  }
  for (const k in pct) if (pct[k]) s[k] = Math.round(s[k]*(1+pct[k]));
  // 好感被动：好感 ≥60 全属性 +5%，≥90 再 +5%
  const a = S.aff[id]; if (a>=60) for (const k of ['hp','atk','mag','def']) s[k] = Math.round(s[k]*(a>=90?1.1:1.05));
  return s;
}
export function skillsOf(id){ const c=CHARS[id]; const L=S.party[id].lv; return c.skills.filter(k=>SKILLS[k].lv<=L); }
export function expNeed(lv){ return Math.round(30 + lv*lv*4.2); }
export function gainExp(id, n){
  const p = S.party[id]; if (!p) return [];
  const ups=[]; if (p.lv>=40) return ups; p.exp += n;
  while (p.lv<40 && p.exp >= expNeed(p.lv)) { p.exp -= expNeed(p.lv); p.lv++; ups.push(p.lv);
    const st=stats(id); p.hp=st.hp; p.mp=st.mp; }
  if (p.lv>=20) ach('lv20'); if (p.lv>=40) ach('lv40');
  return ups;
}
export function healAll(){ for (const m of S.members){ const st=stats(m); S.party[m].hp=st.hp; S.party[m].mp=st.mp; } }

// —— 物品 ——
export function addItem(id, n=1){ S.inv[id]=(S.inv[id]||0)+n; if (S.inv[id]<=0) delete S.inv[id]; if (ITEMS[id]?.type==='key') unlock('i_'+id); if (scales()>=5) ach('scales5'); }
export function has(id, n=1){ return (S.inv[id]||0) >= n; }
export function scales(){ return Object.keys(S.inv).filter(k=>ITEMS[k]?.scale && S.inv[k]>0).length; }
export function addGold(n){ S.gold=Math.max(0,S.gold+n); if (S.gold>=10000) ach('rich'); }

// —— 图鉴/成就 ——
let onToast = ()=>{}; export function setToast(f){ onToast=f; }
export function unlock(id){ if (!S || S.codex[id]) return; S.codex[id]=true; const n=Object.keys(S.codex).length; if(n>=30) ach('codex30'); }
export function ach(id){ if (meta.ach[id] || !ACHIEVEMENTS[id]) return; meta.ach[id]=Date.now(); saveMeta(); onToast('成就达成 · '+ACHIEVEMENTS[id].name, 'ach'); }
export function affAdd(id, n){ if (S.aff[id]===undefined) return; S.aff[id]=Math.max(0,Math.min(100,S.aff[id]+n)); if (S.aff[id]>=100) ach('aff100'); }

// —— 条件与效果 ——
export function cond(expr){
  if (!expr) return true;
  return expr.split('|').some(or => or.split('&').every(a => atom(a.trim())));
}
function cmp(v, op, n){ return op==='>='?v>=n: op==='<='?v<=n: op==='>'?v>n: op==='<'?v<n: op==='=='?v==n: v!=n; }
function atom(a){
  let neg=false; if (a.startsWith('!')) { neg=true; a=a.slice(1); }
  let r;
  let m = a.match(/^(aff:\w+|hope|scales|lost|var:\w+|gold|lv|members)\s*(>=|<=|==|!=|>|<)\s*(-?\d+)$/);
  if (m) {
    const [_,k,op,n]=m; let v;
    if (k.startsWith('aff:')) v=S.aff[k.slice(4)]??0; else if (k==='hope') v=S.hope; else if (k==='scales') v=scales();
    else if (k==='lost') v=S.lost.length; else if (k.startsWith('var:')) v=S.vars[k.slice(4)]||0; else if (k==='gold') v=S.gold;
    else if (k==='lv') v=S.party.yangui.lv; else if (k==='members') v=S.members.length;
    r = cmp(v,op,+n);
  } else if (a.startsWith('flag:')) r = !!S.flags[a.slice(5)];
  else if (a.startsWith('item:')) r = has(a.slice(5));
  else if (a.startsWith('party:')) r = S.members.includes(a.slice(6));
  else if (a.startsWith('lostc:')) r = S.lost.includes(a.slice(6));
  else if (a.startsWith('quest:')) r = S.quests[a.slice(6)]==='done';
  else if (a.startsWith('ending:')) r = meta.endings.includes(a.slice(8).toUpperCase());
  else if (a==='true') r = true;
  else { console.warn('未知条件', a); r=false; }
  return neg ? !r : r;
}
export function applyEffects(list, log){
  for (const e of list||[]) {
    let m;
    if ((m=e.match(/^aff:(\w+)([+-]\d+)$/))) { affAdd(m[1], +m[2]); log&&log(`${CHARS[m[1]]?.name||m[1]} 好感 ${m[2]}`, +m[2]>0?'good':'bad'); }
    else if ((m=e.match(/^hope([+-]\d+)$/))) { S.hope=Math.max(0,Math.min(100,S.hope+ +m[1])); log&&log(`灯心 ${m[1]}`, +m[1]>0?'good':'bad'); }
    else if ((m=e.match(/^flag:(\w+)$/))) S.flags[m[1]]=true;
    else if ((m=e.match(/^unflag:(\w+)$/))) delete S.flags[m[1]];
    else if ((m=e.match(/^var:(\w+)([+-]\d+)$/))) S.vars[m[1]]=(S.vars[m[1]]||0)+ +m[2];
    else if ((m=e.match(/^item:(\w+)(?:\*(\d+))?$/))) { addItem(m[1], +(m[2]||1)); log&&log(`获得 ${ITEMS[m[1]]?.name} ×${m[2]||1}`,'item'); }
    else if ((m=e.match(/^take:(\w+)(?:\*(\d+))?$/))) { addItem(m[1], -(m[2]||1)); }
    else if ((m=e.match(/^gold([+-]\d+)$/))) { addGold(+m[1]); log&&log(`星砂 ${m[1]}`,'item'); }
    else if ((m=e.match(/^exp\+(\d+)$/))) { for (const id of S.members) gainExp(id, +m[1]); log&&log(`全队经验 +${m[1]}`,'good'); }
    else if ((m=e.match(/^join:(\w+)$/))) { addMember(m[1]); log&&log(`${CHARS[m[1]].name} 加入了队伍`,'good'); }
    else if ((m=e.match(/^leave:(\w+)$/))) { removeMember(m[1], false); log&&log(`${CHARS[m[1]].name} 离开了队伍`,'bad'); }
    else if ((m=e.match(/^lose:(\w+)$/))) { removeMember(m[1], true); log&&log(`${CHARS[m[1]].name} ……`,'bad'); }
    else if ((m=e.match(/^codex:(\w+)$/))) { unlock(m[1]); log&&log('图鉴已更新','item'); }
    else if ((m=e.match(/^ach:(\w+)$/))) ach(m[1]);
    else if ((m=e.match(/^heal$/))) healAll();
    else if ((m=e.match(/^region:(\w+)$/))) { S.flags['reg_'+m[1]]=true; }
    else console.warn('未知效果', e);
  }
}

// —— 存档 ——
export function slotInfo(i){ try { const d=JSON.parse(localStorage.getItem(KEY+i)||'null'); return d && {time:d.time, chapter:d.s.chapter, lv:d.s.party.yangui.lv, playtime:d.s.playtime, region:d.s.region}; } catch(e){ return null; } }
export function save(i){ const d={time:Date.now(), s:S}; localStorage.setItem(KEY+i, JSON.stringify(d)); }
export function load(i){ const d=JSON.parse(localStorage.getItem(KEY+i)||'null'); if (!d) return false; S=migrate(d.s); return true; }
export function exportCode(){ return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
export function importCode(c){ const s=JSON.parse(decodeURIComponent(escape(atob(c.trim())))); if (!s.party||!s.party.yangui) throw new Error('存档码无效'); S=migrate(s); }
export const AUTO = 'auto';
