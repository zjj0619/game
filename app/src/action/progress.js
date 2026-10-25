// v2.0 闯关养成：角色解锁、技能等级与技能槽、异兽、结算奖励、每日、烬城建设
import { S, stats, addItem, addGold, gainExp, ach, unlock } from '../engine/state.js';
import { CHARS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { ACHARS, ASKILLS, ACTION_ROSTER, UNLOCK_LV, ULT_LV, SKILL_MAX, SKINS } from './data.js';
import { AFOES } from './foes.js';
import { STAGES, REGION_STAGES } from './stages.js';
import { companionReactions, rollSideEvent, midClearGifts } from './midEvents.js';
import { REGION_ORDER } from '../data/regions.js';
import './gear.js';

export function ensureAct(){
  if (!S) return null;
  S.act ??= {}; const A = S.act;
  A.cleared ??= {}; A.skin ??= {}; A.skins ??= {}; A.best ??= {}; A.tower ??= 0; A.team ??= ['yangui']; A.slv ??= {}; A.slots ??= {}; A.spSpent ??= {}; A.spBonus ??= {}; A.dust ??= 0;
  A.pets ??= {}; A.pet ??= null; A.souls ??= {}; A.heroes ??= []; A.hard ??= {}; A.rush ??= 0; A.tut ??= {}; A.runs ??= 0; A.seen ??= {};
  S.city ??= { lamp:1, forge:1, herb:1, beast:1, market:1 };
  S.daily ??= { day:'', done:{}, prog:{}, claimed:{} };
  rollDaily();
  for (const id of A.heroes) if (!S.party[id]) addHero(id);
  return A;
}
// —— 角色 ——
const HERO_UNLOCK = { tushanjiao:'qingqiu_10', luwu:'kunlun_10', ba:'yugu_10' };
export const heroUnlockHint = id => HERO_UNLOCK[id] ? `通关「${STAGES[HERO_UNLOCK[id]].name}」后加入` : '随主线剧情加入';
export function addHero(id){
  if (!S.party[id]) { const lvs = Object.values(S.party).map(p => p.lv); const L = Math.max(1, Math.round(lvs.reduce((a, b) => a + b, 0) / Math.max(1, lvs.length)));
    S.party[id] = { lv:L, exp:0, equip:{ weapon:null, armor:null, charm:null }, perm:{}, talents:[] }; const st = stats(id); S.party[id].hp = st.hp; S.party[id].mp = st.mp; }
  if (!S.act.heroes.includes(id)) S.act.heroes.push(id); unlock('c_' + id);
}
export const actRoster = () => ACTION_ROSTER.filter(id => S.party[id]);
export function actStats(id){ const s = stats(id); const pd = S.act?.pet && S.act.pets[S.act.pet]; if (pd) { const b = petBonus(pd); for (const k in b) s[k] = Math.round(s[k] * (1 + b[k])); }
  const ns = Math.max(0, (S.act?.skins?.[id] || [0]).length - 1); if (ns) { for (const k of ['hp', 'atk', 'mag']) s[k] = Math.round(s[k] * (1 + ns * 0.01)); }
  s.hp = Math.round(s.hp * 1.6); s.mp = Math.max(30, s.mp); s.potion = 3 + (S.city?.herb || 1) - 1; return s; }
export const ultOk = id => (S.party[id]?.lv || 1) >= ULT_LV;
// —— 技能 ——
export function skillUnlocked(id, sid){ const i = ACHARS[id].skills.indexOf(sid); return i >= 0 && (S.party[id]?.lv || 1) >= UNLOCK_LV[i]; }
export function skillLv(id, sid){ return skillUnlocked(id, sid) ? (S.act?.slv?.[id]?.[sid] || 1) : 0; }
export function spTotal(id){ return Math.floor((S.party[id]?.lv || 1) / 2) + (S.act.spBonus[id] || 0); }
export function spFree(id){ return spTotal(id) - (S.act.spSpent[id] || 0); }
export const skillUpCost = (lv) => ({ sp:1, gold: 60 * lv * lv });
export function skillUp(id, sid){ const lv = skillLv(id, sid); if (!lv || lv >= SKILL_MAX) return '已满级'; const c = skillUpCost(lv); if (spFree(id) < c.sp) return '技能点不足（每升 2 级获得 1 点，首次 S 评价也会奖励）'; if (S.gold < c.gold) return '星砂不足';
  addGold(-c.gold); S.act.spSpent[id] = (S.act.spSpent[id] || 0) + c.sp; (S.act.slv[id] ??= {})[sid] = lv + 1; if (lv + 1 >= SKILL_MAX) ach('skillmax'); return null; }
export function slotsOf(id){ const un = ACHARS[id].skills.filter(k => skillUnlocked(id, k)); let sl = (S.act?.slots?.[id] || []).filter(k => un.includes(k)); for (const k of un) if (sl.length < 5 && !sl.includes(k)) sl.push(k); return sl.slice(0, 5); }
export function setSlot(id, i, sid){ const sl = slotsOf(id); const j = sl.indexOf(sid); if (j >= 0) sl[j] = sl[i]; sl[i] = sid; S.act.slots[id] = sl.filter(Boolean); }
// —— 异兽 ——
export const SOUL_NEED = 3;
/** 异兽助战一句人话说明，避免图鉴空壳感 */
export function petTrait(id){
  const d = AFOES[id]; if (!d) return '击败对应异兽收集灵魄即可孵化。';
  const byAi = { melee:'近战助攻，贴身补刀。', charger:'冲撞开场，打断敌人读条。', ranged:'远程点射，安全输出。', flyer:'空中支援，追击飞行敌人。', shield:'承伤护卫，降低你受击。', summoner:'召唤小影分摊仇恨。', healer:'战斗中缓慢回血。', bomber:'自爆型爆发，清波快手。' };
  const byEl = { fire:'火属：灼烧叠层。', water:'水属：减速。', wood:'木属：吸血。', metal:'金属：破甲。', earth:'土属：护盾。', dark:'暗属：梦层更强。', light:'光属：灯芯半径略增。', none:'' };
  return (byAi[d.ai] || '随队助战。') + ' ' + (byEl[d.el] || '') + ' 升星强化助战威力与队伍加成。';
}

export const PETS = Object.fromEntries(Object.entries(AFOES).filter(([k, v]) => v.tier === 0).map(([k, v]) => [k, { id:k, name:v.name, img:v.img, el:v.el, ai:v.ai, desc:v.desc }]));
const PET_BONUS = { fire:'atk', metal:'atk', water:'hp', wood:'mag', earth:'def', light:'mag', dark:'atk', none:'hp' };
export function petBonus(pd){ const k = PET_BONUS[AFOES[pd.base]?.el] || 'hp'; return { [k]: Math.min(0.3, 0.02 + pd.lv * 0.006 + (pd.star || 0) * 0.02) }; }
export function petPower(pd){ return Math.round((14 + pd.lv * 7.5) * (1 + (pd.star || 0) * 0.3)); }
export const petExpNeed = lv => 20 + lv * lv * 3;
export function hatch(base){ if ((S.act.souls[base] || 0) < SOUL_NEED || S.act.pets[base]) return false; S.act.souls[base] -= SOUL_NEED; S.act.pets[base] = { base, lv:1, exp:0, star:0 }; if (!S.act.pet) S.act.pet = base; unlock('e_' + base); const n = Object.keys(S.act.pets).length; if (n >= 1) ach('pet1'); if (n >= 10) ach('pet10'); return true; }
export function petFeed(base, gold){ const pd = S.act.pets[base]; if (!pd || S.gold < gold || pd.lv >= 50) return false; addGold(-gold); pd.exp += Math.round(gold / 5); while (pd.lv < 50 && pd.exp >= petExpNeed(pd.lv)) { pd.exp -= petExpNeed(pd.lv); pd.lv++; } return true; }
export function petStar(base){ const pd = S.act.pets[base]; if (!pd || (pd.star || 0) >= 5) return false; const need = SOUL_NEED * (pd.star + 1); if ((S.act.souls[base] || 0) < need) return false; S.act.souls[base] -= need; pd.star++; return true; }
// —— 关卡解锁 ——
export function stageUnlocked(id){ const st = STAGES[id]; if (!st) return false;
  if (st.kind === 'keysecret') {
    if (st.needItem && !(S.inv[st.needItem] > 0)) return false;
    if (st.needFlag && !S.flags[st.needFlag]) return false;
    // 至少通关该区第 5 关，避免过早闯入
    const gate = REGION_STAGES[st.region]?.[4];
    return gate ? !!S.act.cleared[gate] : true;
  }
  if (st.hidden) return REGION_STAGES[st.region].slice(0, 10).every(x => S.act.cleared[x]);
  if (st.idx > 0) return !!S.act.cleared[REGION_STAGES[st.region][st.idx - 1]]; if (st.ri === 0) return true; return !!S.act.cleared[REGION_STAGES[REGION_ORDER[st.ri - 1]][9]]; }
export const regionUnlocked = rid => stageUnlocked(REGION_STAGES[rid][0]);
export const stars = r => ({ S:3, A:2, B:1, C:1 })[r] || 0;
export function regionStars(rid){ return REGION_STAGES[rid].reduce((a, id) => a + (S.act.best[id] ? stars(S.act.best[id]) : 0), 0); }
export function totalStars(){ return Object.values(S.act.best).reduce((a, r) => a + stars(r), 0); }
// —— 结算 ——
const RANK = { S:4, A:3, B:2, C:1 };
export function applyResult(stage, res){
  const A = ensureAct(); const out = { gold:0, exp:0, dust:0, items:[], ups:{}, first:false, newBest:false, unlocks:[], sp:0 };
  A.runs++; S.stats.battles = (S.stats.battles || 0) + 1;
  const cityG = 1 + ((S.city.market || 1) - 1) * 0.05, cityE = 1 + ((S.city.lamp || 1) - 1) * 0.05;
  out.gold = Math.round(res.gold * cityG); out.exp = Math.round(res.exp * cityE);
  if (res.win) {
    const k = stage.id; const first = !A.cleared[k] && stage.kind !== 'daily'; out.first = first;
    if (first) { out.gold += 80 + stage.lv * 25; out.exp += 40 + stage.lv * 12; }
    if (res.rating && (!A.best[k] || RANK[res.rating] > RANK[A.best[k]])) { if (res.rating === 'S' && A.best[k] !== 'S' && stage.kind !== 'daily') { A.spBonus[res.team[0]] = (A.spBonus[res.team[0]] || 0) + 1; out.sp = 1; } A.best[k] = res.rating; out.newBest = true; }
    A.cleared[k] = (A.cleared[k] || 0) + 1;
    if (res.hard) A.hard[k] = true;
    if (stage.kind === 'tower') A.tower = Math.max(A.tower, stage.floor);
    if (stage.kind === 'rush') A.rush = (A.rush || 0) + 1;
    for (const [hid, sk] of Object.entries(HERO_UNLOCK)) if (sk === k && !S.party[hid]) { addHero(hid); out.unlocks.push('新伙伴 · ' + CHARS[hid].name); }
    if (stage.idx === 9 && stage.region) { const nx = REGION_ORDER[stage.ri + 1]; if (nx && first) out.unlocks.push('新区域开放'); }
    if (first && stage.idx === 9 && REGION_STAGES[stage.region]) out.unlocks.push('秘境关「' + STAGES[REGION_STAGES[stage.region][10]].name + '」需本区十关全通');
    if (first && stage.kind === 'keysecret') {
      out.gold += 200 + stage.lv * 15; out.exp += 120 + stage.lv * 8; out._secDust = 8;
      addItem('m_starmarrow', 2); out.items.push({ id:'m_starmarrow', n:2 });
      out.unlocks.push('信物秘境踏破 · 回忆已解锁');
      const n = Object.keys(A.cleared).filter(x => STAGES[x]?.kind === 'keysecret').length;
      if (n >= 1) ach('keysecret1'); if (n >= 4) ach('keysecret4'); if (n >= 8) ach('keysecret8');
      const fmap = { sec_cursed_lamp:'sec_cleared_cursed', sec_sealed_letter:'sec_cleared_letter', sec_false_dawn:'sec_cleared_dawn',
        sec_dream_scale:'sec_cleared_dream', sec_black_scale:'sec_cleared_black', sec_gold_scale:'sec_cleared_gold',
        sec_xiangliu_tear:'sec_cleared_tear', sec_keepsake_fox:'sec_cleared_fox' };
      if (fmap[stage.id]) S.flags[fmap[stage.id]] = true;
    }
    if (res.rating === 'S') ach('rankS'); ach('stage1'); if (res.combo >= 50) ach('combo50'); if (res.combo >= 150) ach('combo150'); if (res.hard) ach('hard1'); if (A.tower >= 10) ach('tower10'); if (A.tower >= 50) ach('tower50'); if (A.tower >= 100) ach('tower100'); if (stage.kind === 'rush') ach('rush'); if (actRoster().length >= 10) ach('hero_all'); if (Object.keys(A.cleared).filter(x => STAGES[x]).length >= 99) ach('allstages'); if (res.hits === 0 && stage.boss) ach('nohitboss');

    // 前三十分钟「系统变实」：首通送材料/灵魄，让铁坊·异兽·建设立刻可玩
    if (first && stage.id === 'jincheng_1') {
      addItem('m_bone', 5); addItem('m_fur', 3); addItem('m_feather', 2);
      out.items.push({ id:'m_bone', n:5 }, { id:'m_fur', n:3 });
      out.unlocks.push('铸灯铁坊材料到货 · 可试锻第一件兵器');
    }
    if (first && stage.id === 'jincheng_3') {
      A.souls.yegui = (A.souls.yegui || 0) + 3;
      out.items.push({ soul:'yegui', n:3 });
      out.unlocks.push('夜鬼灵魄 ×3 · 去「山海异兽」孵化助战');
    }
    if (first && stage.id === 'jincheng_5') {
      addGold(400); out.gold += 400;
      addItem('m_ink', 4); addItem('m_bronze', 3);
      out.unlocks.push('烬城建设开放升级 · 灯塔与铁坊值得点一级');
    }
    if (first && stage.id === 'jincheng_10') {
      out.unlocks.push('试炼·镇妖塔已可挑战（失败可重试）');
    }

    dailyProg('clear', 1); if (res.rating === 'S') dailyProg('rankS', 1); if (stage.boss) dailyProg('boss', 1);
  }
  dailyProg('kills', res.kills || 0); dailyProg('ults', res.ults || 0);
  if (res.dreamFlips) dailyProg('dream', res.dreamFlips); if (res.eyeMarks) dailyProg('eye', res.eyeMarks);
  addGold(out.gold); out.dust = (res.dust || 0) + (out._secDust || 0); if (out.dust) A.dust = (A.dust || 0) + out.dust;
  for (const id of res.team) { const ups = gainExp(id, out.exp); if (ups.length) out.ups[id] = ups; }
  for (const [id, n] of Object.entries(res.loot || {})) { if (!ITEMS[id]) continue; addItem(id, n); if (ITEMS[id].rar >= 4) ach('forge_god'); out.items.push({ id, n }); }
  for (const [b, n] of Object.entries(res.souls || {})) { A.souls[b] = (A.souls[b] || 0) + n; out.items.push({ soul:b, n }); }
  for (const id of res.team) { const st = stats(id); S.party[id].hp = st.hp; S.party[id].mp = st.mp; }
  if (res.win) {
    midClearGifts(stage, out.first, out);
    out.reactions = companionReactions(stage, out.first);
    const side = rollSideEvent(stage, out.first);
    if (side) {
      out.side = side;
      out.gold += side.gold || 0;
      if (side.item && side.n) out.items.push({ id: side.item, n: side.n });
      if (side.dust) out.dust = (out.dust || 0) + side.dust;
      out.unlocks.push('关间·' + side.title + '：' + side.text);
    }
  }
  return out;
}
// —— 每日 ——
export const MISSIONS = [
  { id:'clear', name:'闯过 3 个关卡', need:3, gold:300 }, { id:'kills', name:'击败 60 只异兽', need:60, gold:300 },
  { id:'boss', name:'讨伐 1 名首领', need:1, gold:400 }, { id:'ults', name:'变身 3 次', need:3, gold:250 }, { id:'rankS', name:'获得 1 次 S 评价', need:1, gold:500 },
  { id:'dream', name:'闭目切换 5 次', need:5, gold:280 }, { id:'eye', name:'烛瞳破弱点 8 处', need:8, gold:280 },
];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function rollDaily(){ const t = today(); if (S.daily.day !== t) S.daily = { day:t, done:{}, prog:{}, claimed:{} }; }
export function dailyProg(k, n){ if (!S?.daily) return; rollDaily(); S.daily.prog[k] = (S.daily.prog[k] || 0) + n; }
export function claimMission(id){ const m = MISSIONS.find(x => x.id === id); if (!m || S.daily.claimed[id] || (S.daily.prog[id] || 0) < m.need) return false; S.daily.claimed[id] = true; addGold(m.gold); if (MISSIONS.every(x => S.daily.claimed[x.id])) ach('daily'); return true; }
export const DAILY_TRIES = 2;
// —— 烬城建设 ——
export const CITY = [
  { id:'lamp', name:'长明灯塔', max:5, desc:lv => `闯关经验 +${(lv - 1) * 5}%`, mats:['m_feather','m_ink'] },
  { id:'forge', name:'铸灯铁坊', max:5, desc:lv => `可锻造 ${['烬城','青丘','东海','常羊','昆仑','混沌','禺谷','北海','归墟'][Math.min(8, lv * 2 - 1)]} 及以下阶装备`, mats:['m_bone','m_bronze'] },
  { id:'herb', name:'百草药庐', max:4, desc:lv => `每关灵药 ${3 + lv - 1} 瓶`, mats:['m_herb','m_fang'] },
  { id:'beast', name:'异兽苑', max:5, desc:lv => `喂养效率 +${(lv - 1) * 20}%`, mats:['m_fur','m_bone'] },
  { id:'market', name:'灯市', max:5, desc:lv => `闯关金钱 +${(lv - 1) * 5}%`, mats:['m_silk','m_scale'] },
];
export const cityCost = lv => ({ gold: Math.round((lv <= 1 ? 280 : 520) * lv * lv), mat: Math.max(2, 2 + lv) });
export function cityUp(id){ const b = CITY.find(x => x.id === id); const lv = S.city[id] || 1; if (lv >= b.max) return '已满级'; const c = cityCost(lv);
  if (S.gold < c.gold) return '星砂不足'; if ((S.inv[b.mats[0]] || 0) < c.mat || (S.inv[b.mats[1]] || 0) < Math.ceil(c.mat * 0.6)) return '材料不足';
  addGold(-c.gold); addItem(b.mats[0], -c.mat); addItem(b.mats[1], -Math.ceil(c.mat * 0.6)); S.city[id] = lv + 1; if (lv + 1 >= b.max) ach('city'); return null; }
// —— 铁坊 ——
export const TIER_MAT = ['m_bone','m_fur','m_scale','m_bronze','m_jade','m_cinnabar','m_goldsand','m_frost','m_starmarrow'];
export const TIER_NAME = ['烬城','青丘','东海','常羊','昆仑','混沌','禺谷','北海','归墟'];
export function forgeMaxTier(){ const byCity = Math.min(8, (S.city.forge || 1) * 2 - 1); let reg = 0; REGION_ORDER.forEach((r, i) => { if (stageUnlocked(REGION_STAGES[r][0])) reg = i; }); return Math.min(byCity, reg + 1 > 8 ? 8 : reg + 1); }
export const forgeCost = t => ({ gold: 150 + t * t * 120 + t * 100, mat: 3 + t, mat2: 2 + Math.floor(t / 2) });
export function forge(t, slot, k){ const c = forgeCost(t); const m = TIER_MAT[t]; if (t > forgeMaxTier()) return { err:'铁坊等级或区域进度不足' }; if (S.gold < c.gold) return { err:'星砂不足' }; if ((S.inv[m] || 0) < c.mat) return { err:'材料不足' }; if ((S.inv.m_starmarrow || 0) < c.mat2 && t >= 4) return { err:'星髓晶不足' };
  addGold(-c.gold); addItem(m, -c.mat); if (t >= 4) addItem('m_starmarrow', -c.mat2); const x = Math.random(); const rk = x < 0.05 ? 4 : x < 0.2 ? 3 : x < 0.5 ? 2 : 1;
  const id = `g_${slot[0]}${t}${k}${rk}`; addItem(id, 1); S.stats.crafts = (S.stats.crafts || 0) + 1; if (rk >= 4) ach('forge_god'); return { id }; }
export function salvage(id){ const it = ITEMS[id]; if (!it || !it.gen || !(S.inv[id] > 0)) return null; addItem(id, -1); const n = 1 + (it.rar || 0); const g = Math.round(it.price * 0.25); addGold(g); addItem(TIER_MAT[it.tier], n); return { gold:g, mat:TIER_MAT[it.tier], n }; }

// —— 外观 ——
export function skinReqText(k){ const n = SKINS[k].need; if (!n) return '初始'; if (n.cleared) return `累计通关 ${n.cleared} 个关卡`; if (n.tower) return `镇妖塔达到第 ${n.tower} 层`; if (n.rush) return '通关首领连战·十殿'; return ''; }
export function skinReqOk(k){ const n = SKINS[k].need; if (!n) return true; if (n.cleared) return Object.keys(S.act.cleared).filter(x => !x.startsWith('tower') && x !== 'rush').length >= n.cleared; if (n.tower) return (S.act.tower || 0) >= n.tower; if (n.rush) return (S.act.rush || 0) >= n.rush; return false; }
export const skinOwned = (id, k) => k === 0 || (S.act.skins[id] || []).includes(k);
export function buySkin(id, k){ if (skinOwned(id, k)) return null; if (!skinReqOk(k)) return '尚未达成：' + skinReqText(k); if ((S.gold || 0) < SKINS[k].gold) return '金铢不足'; addGold(-SKINS[k].gold); const l = (S.act.skins[id] ??= [0]); if (!l.includes(0)) l.unshift(0); l.push(k); S.act.skin[id] = k; return null; }
