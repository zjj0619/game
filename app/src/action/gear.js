// v2.0 生成式装备：9 阶（对应九大区域）× 3 部位 × 3 款式 × 5 品质 = 405 件，带词条与区域套装
import { ITEMS } from '../data/items.js';
import { SETS } from '../data/progress.js';
export const RARITY = [
  { k:0, name:'凡品', col:'#c9c2b0', mult:1.0, aff:0 },
  { k:1, name:'良品', col:'#7fd08a', mult:1.2, aff:1 },
  { k:2, name:'精品', col:'#6fb6ff', mult:1.45, aff:2 },
  { k:3, name:'珍品', col:'#c48cff', mult:1.75, aff:3 },
  { k:4, name:'神品', col:'#ffcf5a', mult:2.15, aff:4 },
];
const TIER = ['烬城','青丘','东海','常羊','昆仑','混沌','禺谷','北海','归墟'];
const NOUN = {
  weapon:[['灯刃','狐爪','羽矛'],['狐火扇','月牙刀','青竹杖'],['潮音剑','珊瑚矛','鲛骨弓'],['青铜钺','断戈','战鼓槌'],['玉戈','瑶光剑','开明爪'],['无面刃','乱序杖','帝江琴'],['金乌弓','焦骨拳套','赤水刀'],['玄冰矛','鲲骨剑','冰蛟弓'],['星骸刃','长夜剑','烛龙戟']],
  armor:[['守灯袍','巡夜甲','灯油皮衣'],['狐裘','青丘纱衣','月影披风'],['鲛绡衣','贝甲','潮汐斗篷'],['青铜鳞甲','战魂铠','无首胸甲'],['玉甲','昆仑羽衣','狻猊铠'],['混沌袍','无相衣','书魇长衫'],['焦土甲','金乌羽衣','旱风袍'],['冰鳞甲','幽都斗篷','鲲皮衣'],['星辰袍','归墟铠','长夜大氅']],
  charm:[['灯芯坠','铜铃','守灯令'],['狐尾坠','月牙佩','九尾结'],['明珠','精卫石','海螺'],['虎符','战魂骨','鼓面残片'],['玉璧','不死药瓶','白泽角'],['混沌珠','空白书页','讙羽'],['日晷','金乌羽','魃之青丝'],['冰魄','梦蝶翅','玄冥鳞'],['星屑','烛龙鳞','长明灯芯']],
};
const ICON = { weapon:'weapons', armor:'armor', charm:'charms' };
const SLOTS = ['weapon','armor','charm'];
// 词条池（与精炼词条兼容，加入动作向词条）
export const GAFF = [
  { k:'crit', v:0.04, name:'锐目' }, { k:'critDmg', v:0.12, name:'穿心' }, { k:'hpPct', v:0.05, name:'厚土' }, { k:'atkPct', v:0.05, name:'锋锐' },
  { k:'magPct', v:0.05, name:'灵慧' }, { k:'defPct', v:0.05, name:'坚韧' }, { k:'spd', v:2, name:'疾行' }, { k:'healBoost', v:0.1, name:'回春' },
  { k:'cdr', v:0.05, name:'迅思' }, { k:'mpRegen', v:0.5, name:'灵泉' }, { k:'rageGain', v:0.12, name:'怒涛' }, { k:'goldBonus', v:0.1, name:'聚财' },
  { k:'lifesteal', v:0.02, name:'噬血' }, { k:'skillDmg', v:0.08, name:'术精' }, { k:'bossDmg', v:0.1, name:'屠龙' }, { k:'eliteDmg', v:0.1, name:'斩将' },
];
function rng(seed){ let s=seed||1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return ((s>>>0)%100000)/100000; }; }
export const GEAR = [];
for (let t = 0; t < 9; t++) {
  const setItems = [];
  for (const slot of SLOTS) for (let k = 0; k < 3; k++) for (const R of RARITY) {
    const id = `g_${slot[0]}${t}${k}${R.k}`; const r = rng(t*997 + k*131 + R.k*17 + slot.length*7);
    const base = 4 + t * 5.5; const m = R.mult;
    const it = { name: `${R.k>=3?TIER[t]+'·':''}${NOUN[slot][t][k]}${R.k?'·'+R.name[0]:''}`, type:slot, icon:`gen/${id}`, baseIcon: ICON[slot]+'_'+((t*3+k+R.k)%16),
      price: Math.round((40 + t*t*35 + t*60) * m * (1+R.k*0.6)), gen:true, tier:t, rar:R.k,
      desc: `${TIER[t]}一带出土的${R.name}${slot==='weapon'?'兵器':slot==='armor'?'护甲':'饰物'}。` };
    if (slot==='weapon') { const phys = k!==1; it.atk = Math.round(base*1.6*m*(phys?1:0.45)); it.mag = Math.round(base*1.6*m*(phys?0.45:1)); }
    if (slot==='armor') { it.def = Math.round(base*0.9*m); it.hp = Math.round(base*5*m); }
    if (slot==='charm') { it.hp = Math.round(base*2*m); it.mp = Math.round(base*0.6*m); it.crit = +(0.01*(1+R.k)).toFixed(2); }
    const aff = []; const pool = [...GAFF];
    for (let a = 0; a < R.aff; a++) { const i = Math.floor(r()*pool.length); const A = pool.splice(i,1)[0]; aff.push({ k:A.k, v:+(A.v*(1+t*0.12)).toFixed(3), name:A.name }); }
    it.affix = aff;
    for (const A of aff) { if (A.k==='crit') it.crit = +((it.crit||0)+A.v).toFixed(3); else if (A.k==='spd') it.spd = (it.spd||0)+Math.round(A.v); else if (A.k==='goldBonus') it.goldBonus = A.v; }
    ITEMS[id] = it; GEAR.push(id); if (R.k >= 3) setItems.push(id);
  }
  const fx2 = [{atkPct:0.08},{magPct:0.08},{hpPct:0.1},{defPct:0.1},{crit:0.06},{magPct:0.1},{atkPct:0.1},{hpPct:0.12},{atkPct:0.12,magPct:0.12}][t];
  const fx3 = [{rageGain:0.2},{mpRegen:1},{healBoost:0.2},{lifesteal:0.03},{cdr:0.1},{skillDmg:0.15},{bossDmg:0.2},{critDmg:0.25},{skillDmg:0.2,bossDmg:0.2}][t];
  SETS.push({ id:'gs_'+t, name:TIER[t]+'遗珍', items:setItems, b2:{ desc:Object.entries(fx2).map(([k,v])=>fxName(k,v)).join('，'), fx:fx2 }, b3:{ desc:Object.entries(fx3).map(([k,v])=>fxName(k,v)).join('，'), fx:fx3 } });
}
export function fxName(k, v){ const N = {atkPct:'攻击',magPct:'法术',hpPct:'气血',defPct:'防御',crit:'暴击率',critDmg:'暴击伤害',rageGain:'怒气获取',mpRegen:'法力回复/秒',healBoost:'治疗',lifesteal:'吸血',cdr:'冷却缩减',skillDmg:'技能伤害',bossDmg:'首领伤害',eliteDmg:'精英伤害',goldBonus:'金钱',spd:'速度'};
  return (N[k]||k) + ' +' + (v<1 && k!=='mpRegen' ? Math.round(v*100)+'%' : v); }
// 掉落：按关卡等级决定阶，按运气决定品质
export function rollGear(lv, luck=0, rand=Math.random){
  // 中后期（ch.3+ / lv≥14）：阶位与品质上抬，让锻造外的掉落也有期待
  const midBoost = lv >= 28 ? 0.22 : lv >= 18 ? 0.15 : lv >= 14 ? 0.1 : 0;
  const t = Math.max(0, Math.min(8, Math.floor((lv-1)/4.5) + (rand()<0.15+midBoost?1:0) - (rand()<0.2-midBoost*0.5?1:0)));
  const x = rand() - luck - midBoost * 0.35;
  const rk = x < 0.018 ? 4 : x < 0.08 ? 3 : x < 0.24 ? 2 : x < 0.52 ? 1 : 0;
  const slot = SLOTS[Math.floor(rand()*3)]; const k = Math.floor(rand()*3);
  return `g_${slot[0]}${t}${k}${rk}`;
}
export const rarOf = id => ITEMS[id]?.rar ?? (ITEMS[id]?.price > 800 ? 3 : ITEMS[id]?.price > 300 ? 2 : 1);
