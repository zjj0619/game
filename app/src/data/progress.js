// v1.1 成长系统：星命（天赋）· 套装 · 精炼词条 · 灯阶
// —— 星命：每 4 级 1 点，6 个节点依次点亮 ——
const common = (sig) => [
  { id:'t1', name:'根骨', desc:'气血 +10%', fx:{ hpPct:0.10 } },
  { id:'t2', name:'锋芒', desc:'攻击、术法 +8%', fx:{ atkPct:0.08, magPct:0.08 } },
  { id:'t3', name:'破势', desc:'韧性削减 +25%', fx:{ breakEff:0.25 } },
  { id:'t4', name:'灯心', desc:'能量获取 +20%', fx:{ ultGain:0.20 } },
  sig,
  { id:'t6', name:'极意', desc:'终结技伤害 +30%', fx:{ ultBoost:0.30 } },
];
export const TALENTS = {
  yangui:  common({ id:'t5', name:'长明', desc:'相生反应效果 +35%，击破时回复 1 灯焰', fx:{ reactBoost:0.35, spOnBreak:1 } }),
  baiji:   common({ id:'t5', name:'九尾', desc:'木属性伤害 +20%，暴击率 +8%', fx:{ boost:{wood:0.2}, crit:0.08 } }),
  xianwei: common({ id:'t5', name:'填海', desc:'速度 +6，开场灯焰 +1', fx:{ spd:6, spStart:1 } }),
  qi:      common({ id:'t5', name:'刑天', desc:'受击能量 +60%，开场获得护盾', fx:{ hitEnergy:0.6, startShield:1 } }),
  ali:     common({ id:'t5', name:'春生', desc:'治疗量 +30%，水属性伤害 +15%', fx:{ healBoost:0.3, boost:{water:0.15} } }),
  kualing: common({ id:'t5', name:'追日', desc:'暴击率 +12%，暴击伤害 +30%', fx:{ crit:0.12, critDmg:0.3 } }),
  fuli:    common({ id:'t5', name:'晦冥', desc:'暗属性伤害 +20%，开场能量 +30', fx:{ boost:{dark:0.2}, startEnergy:30 } }),
};
export const talentPoints = (lv) => Math.floor(lv/4);
// —— 套装：同时装备 2/3 件 ——
export const SETS = [
  { id:'s_lamp', name:'守灯人', items:['w_lantern','a_robe','c_redbell'], b2:{ desc:'韧性削减 +15%', fx:{breakEff:0.15} }, b3:{ desc:'开场能量 +25', fx:{startEnergy:25} } },
  { id:'s_fox', name:'青丘', items:['w_foxfan','a_foxcloak','c_foxtail'], b2:{ desc:'木属性伤害 +15%', fx:{boost:{wood:0.15}} }, b3:{ desc:'相生反应效果 +30%', fx:{reactBoost:0.3} } },
  { id:'s_bird', name:'精卫', items:['w_featherspear','a_featherrobe','c_pearl'], b2:{ desc:'速度 +4', fx:{spd:4} }, b3:{ desc:'击破时回复 1 灯焰', fx:{spOnBreak:1} } },
  { id:'s_war', name:'常羊', items:['w_bronzeaxe','a_bronzescale','c_tigertally'], b2:{ desc:'防御 +10%', fx:{defPct:0.10} }, b3:{ desc:'受击能量 +50%', fx:{hitEnergy:0.5} } },
  { id:'s_sun', name:'逐日', items:['w_sunbow','a_runner','c_sunamulet'], b2:{ desc:'火属性伤害 +15%', fx:{boost:{fire:0.15}} }, b3:{ desc:'暴击率 +10%', fx:{crit:0.10} } },
  { id:'s_jade', name:'昆仑', items:['w_jadespear','a_jadeplate','c_jadebi'], b2:{ desc:'气血 +8%', fx:{hpPct:0.08} }, b3:{ desc:'开场获得护盾', fx:{startShield:1} } },
  { id:'s_star', name:'星夜', items:['w_starsword','a_starcloak','c_starring'], b2:{ desc:'能量获取 +15%', fx:{ultGain:0.15} }, b3:{ desc:'终结技伤害 +25%', fx:{ultBoost:0.25} } },
  { id:'s_dragon', name:'烛龙', items:['w_dragonglaive','a_dragonrobe','c_dragoneye'], b2:{ desc:'光属性伤害 +20%', fx:{boost:{light:0.2}} }, b3:{ desc:'终结技伤害 +30%，开场灯焰 +1', fx:{ultBoost:0.3, spStart:1} } },
];
export const setOf = (itemId) => SETS.find(s=>s.items.includes(itemId));
// —— 精炼：+1～+5，每级基础属性 +10%；+3 与 +5 解锁随机词条 ——
export const AFFIXES = [
  { k:'crit', v:0.05, name:'锐目', desc:'暴击率 +5%' },
  { k:'breakEff', v:0.12, name:'裂甲', desc:'韧性削减 +12%' },
  { k:'ultGain', v:0.10, name:'聚灯', desc:'能量获取 +10%' },
  { k:'spd', v:3, name:'疾行', desc:'速度 +3' },
  { k:'reactBoost', v:0.15, name:'生克', desc:'反应效果 +15%' },
  { k:'healBoost', v:0.12, name:'回春', desc:'治疗量 +12%' },
  { k:'hpPct', v:0.06, name:'厚土', desc:'气血 +6%' },
  { k:'critDmg', v:0.15, name:'穿心', desc:'暴击伤害 +15%' },
];
export function refineCost(it, lv){ // lv = 目标等级
  const tier = Math.max(1, Math.round((it.price||800)/800));
  const mat = it.type==='weapon' ? 'm_bronze' : it.type==='armor' ? 'm_fur' : 'm_jade';
  return { gold: 80*lv*tier, need: { [mat]: lv+1, ...(lv>=3 ? { m_starmarrow: lv-2 } : {}) } };
}
// —— 灯阶：在营地用星髓晶点亮，解锁探索能力 ——
export const LAMP = [
  null,
  { name:'一阶·微光', desc:'照亮脚下的路。', cost:null },
  { name:'二阶·焚棘', desc:'灯火可烧开紫荆棘，通往隐藏的宝箱与采集点。', cost:{ gold:300, need:{ m_starmarrow:2 } } },
  { name:'三阶·破雾', desc:'驱散幽雾，显现迷雾中的宝物与秘境；照亮范围扩大。', cost:{ gold:900, need:{ m_starmarrow:4, m_ember:2 } } },
  { name:'四阶·照影', desc:'点亮上古石灯阵，并让灯斩命中的敌人陷入眩晕（先手更易）。', cost:{ gold:2000, need:{ m_starmarrow:6, m_jade:3 } } },
  { name:'五阶·长明', desc:'每场战斗开场灯焰 +1，全队能量 +10。', cost:{ gold:4000, need:{ m_starmarrow:10, m_goldsand:4 } } },
];
