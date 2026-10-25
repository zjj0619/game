// v2.0 闯关敌人：基于山海经异兽图鉴，派生 普通 / 精英 / 异种 三阶变体 + 首领（多阶段）
import { ENEMIES } from '../data/enemies.js';
// AI 类型：melee 近战 / charger 冲撞 / ranged 远程 / flyer 飞行 / shield 持盾 / summoner 召唤 / healer 治疗 / bomber 自爆
export const AI_NAME = {melee:'近战',charger:'冲撞',ranged:'远程',flyer:'飞行',shield:'持盾',summoner:'召唤',healer:'治愈',bomber:'自爆'};
const AI = { yegui:'melee', dengyan:'ranged', humei:'melee', gudiao:'flyer', chiru:'ranged', jellyfish:'healer', jiaoren:'shield', haiyuan:'ranged', yuanqin:'flyer',
  wushou:'melee', gugukui:'shield', kui:'charger', toulou:'charger', qinyuan:'bomber', yingzhao:'flyer', suanni:'shield', yuchan:'summoner', zheng:'charger',
  hundunyy:'ranged', huan:'melee', bifang:'flyer', haiwu:'flyer', jiaoshi:'bomber', shamang:'charger', hannu:'summoner', huoshu:'bomber', fei:'ranged',
  bingjiao:'melee', mengmo:'summoner', tubo:'shield', heishe:'melee', kun:'charger', mengdie:'healer', xinghai:'shield', yuantong:'ranged', yecha:'melee' };
const AIK = { melee:{hp:1.0,atk:1.0,spd:70,size:1.0}, charger:{hp:1.3,atk:1.2,spd:60,size:1.15}, ranged:{hp:0.8,atk:0.9,spd:55,size:0.95},
  flyer:{hp:0.75,atk:0.9,spd:80,size:0.9}, shield:{hp:1.5,atk:0.9,spd:45,size:1.15}, summoner:{hp:1.0,atk:0.8,spd:40,size:1.05},
  healer:{hp:0.9,atk:0.7,spd:50,size:0.95}, bomber:{hp:0.6,atk:1.6,spd:95,size:0.85} };
const EL_TINT = { fire:'#ff7a3a', water:'#5fb8ff', wood:'#7ddc6a', metal:'#e8e8f0', earth:'#e0b060', dark:'#a070ff', light:'#ffe28a', none:'#cccccc' };
const SHIFT = { fire:'water', water:'earth', earth:'wood', wood:'metal', metal:'fire', dark:'light', light:'dark', none:'dark' };
export const AFOES = {};
for (const [id, e] of Object.entries(ENEMIES)) {
  if (e.arch === 'boss') continue;
  const ai = AI[id] || 'melee'; const k = AIK[ai];
  const base = { base:id, name:e.name, img:e.img, el:e.el, ai, hp:k.hp, atk:k.atk, spd:k.spd, size:k.size, drops:e.drops||[], desc:e.desc };
  AFOES[id] = { ...base, tier:0 };
  AFOES[id+'_e'] = { ...base, name:e.name+'·精英', tier:1, hp:k.hp*3.2, atk:k.atk*1.4, size:k.size*1.25, aura:EL_TINT[e.el] };
  const el2 = SHIFT[e.el] || 'dark';
  AFOES[id+'_v'] = { ...base, name:'异种'+e.name, tier:2, el:el2, img:e.img.replace('enemy/','enemy/v_'), hp:k.hp*1.6, atk:k.atk*1.25, size:k.size*1.05, tint:EL_TINT[el2], spd:k.spd*1.15 };
}
// 首领：招式池与阶段。图像沿用已有首领立绘
// 招式：slash 连斩 / charge 冲撞 / slam 跃击震波 / fan 扇形弹幕 / rain 天降 / summon 召唤 / beam 横扫光束 / spin 旋身 / blink 瞬移 / pillar 地刺 / nova 环爆
const B = (id, name, img, el, pat, minions, hp=1, extra={}) => [id, { id, name, img, el, boss:true, pat, minions, hp, ...extra }];
export const ABOSSES = Object.fromEntries([
  B('ab_yeguiwang','夜鬼王','boss/yeguiwang','dark',[['slash','charge','summon'],['slam','fan'],['nova']],['yegui','dengyan']),
  B('ab_humeng','狐梦之主','boss/humeng','wood',[['fan','blink','summon'],['rain','beam'],['nova','spin']],['humei','humei_e']),
  B('ab_duchao','毒潮蛟','boss/duchaojiao','water',[['charge','fan','slash'],['beam','summon'],['rain','pillar']],['jellyfish','chiru']),
  B('ab_zhanhun','常羊战魂','boss/zhanhun','earth',[['slash','slam','charge'],['pillar','spin'],['nova']],['wushou','gugukui'],1.15),
  B('ab_luwu','陆吾','por/luwu','metal',[['charge','slash','blink'],['spin','nova'],['rain','slam']],['yingzhao','suanni'],1.15),
  B('ab_shuyan','书魇','boss/shuyan','dark',[['fan','blink','summon'],['beam','rain'],['nova','pillar']],['fei','hundunyy']),
  B('ab_hundun','混沌','boss/hundun','none',[['slam','charge','summon'],['spin','fan'],['nova','rain','beam']],['hundunyy','huan'],1.2),
  B('ab_jinwu','金乌骸','boss/jinwu','fire',[['fan','rain','charge'],['beam','pillar'],['nova']],['bifang','huoshu']),
  B('ab_ba','魃','por/ba','fire',[['slash','pillar','nova'],['rain','charge'],['beam','spin']],['jiaoshi','hannu'],1.2),
  B('ab_yinglong','应龙','boss/yinglong','water',[['charge','beam','fan'],['rain','slam'],['nova','spin']],['bingjiao','heishe'],1.25),
  B('ab_xiangliu','相柳','por/xiangliu','water',[['fan','beam','summon'],['pillar','rain'],['nova','charge']],['heishe','jellyfish_v'],1.3),
  B('ab_fuli','浮黎','por/fuli','dark',[['slash','blink','beam'],['spin','fan'],['nova','rain']],['yecha'],1.3),
  B('ab_guixu','归墟之主','boss/guixu','dark',[['summon','fan','pillar'],['beam','rain'],['nova','slam','spin']],['yuantong','xinghai','mengmo'],1.4),
  B('ab_xuanming','玄冥','por/xuanming','dark',[['slash','blink','fan'],['beam','rain','summon'],['nova','pillar','spin']],['yecha_e','mengmo'],1.5),
  B('ab_zhulong','烛龙之影','por/zhulong','light',[['beam','fan','rain'],['nova','pillar','charge'],['spin','slam','blink']],['xinghai_v','mengdie'],1.6),
  // 次级首领（关卡中段 / 隐藏关）
  B('ab_jiuying','九婴','enemy/v_heishe','water',[['fan','charge'],['rain','summon']],['heishe'],0.9),
  B('ab_taotie','饕餮','enemy/v_kui','dark',[['charge','slam'],['nova','summon']],['toulou'],0.95),
  B('ab_qiongqi','穷奇','enemy/v_zheng','metal',[['charge','blink'],['spin','fan']],['zheng'],0.95),
  B('ab_taowu','梼杌','enemy/v_shamang','earth',[['slam','charge'],['pillar','spin']],['shamang'],1.0),
  B('ab_fengxi','封豨','enemy/v_toulou','earth',[['charge','slash'],['slam','nova']],['toulou'],0.85),
  B('ab_zaochi','凿齿','enemy/v_wushou','metal',[['slash','charge'],['spin','pillar']],['wushou'],0.9),
  B('ab_dafeng','大风','enemy/v_gudiao','metal',[['fan','charge'],['rain','spin']],['gudiao','yuanqin'],0.9),
  B('ab_xiushe','修蛇','enemy/v_heishe','wood',[['charge','fan'],['beam','pillar']],['heishe'],1.0),
  B('ab_kuafu','夸父残影','enemy/v_jiaoshi','fire',[['charge','rain'],['beam','nova']],['jiaoshi'],1.05),
]);
export const BOSS_PAT_NAME = {slash:'连斩',charge:'冲撞',slam:'跃击',fan:'弹幕',rain:'天降',summon:'召唤',beam:'光束',spin:'旋身',blink:'瞬移',pillar:'地刺',nova:'环爆'};
export const elTint = EL_TINT;
// 数值：按关卡等级缩放
export function foeStats(def, lv, hard){
  const m = hard ? 1.6 : 1;
  const hp = Math.round((60 + lv*30 + lv*lv*1.2) * (def.hp||1) * (def.boss ? 14 : 1) * m);
  const atk = Math.round((6 + lv*2.4) * (def.atk||1) * (def.boss ? 1.25 : 1) * (hard?1.35:1));
  const def_ = Math.round(2 + lv*1.1);
  return { hp, atk, def:def_ };
}
