// 角色数据：立绘、简介、属性成长、技能
export const EL = { metal:'金', wood:'木', water:'水', fire:'火', earth:'土', light:'光', dark:'暗', none:'无' };
export const EL_COLOR = { metal:'#e8e3c8', wood:'#7fd08a', water:'#6fb6ff', fire:'#ff7a4a', earth:'#d9a55a', light:'#ffe28a', dark:'#b07bff', none:'#cccccc' };
// 克制：a 打 b 的倍率
const BEATS = { metal:'wood', wood:'earth', earth:'water', water:'fire', fire:'metal' };
export function elemMult(a, b) {
  if (!a || !b || a === 'none' || b === 'none') return 1;
  if ((a === 'light' && b === 'dark') || (a === 'dark' && b === 'light')) return 1.5;
  if (BEATS[a] === b) return 1.5;
  if (BEATS[b] === a) return 0.75;
  return 1;
}

export const STATUS = {
  burn:  { name:'灼烧', icon:'🔥', bad:true,  desc:'每回合损失 6% 气血' },
  poison:{ name:'中毒', icon:'☠', bad:true,  desc:'每回合损失 8% 气血' },
  freeze:{ name:'冰封', icon:'❄', bad:true,  desc:'无法行动' },
  stun:  { name:'眩晕', icon:'✦', bad:true,  desc:'无法行动' },
  charm: { name:'魅惑', icon:'♥', bad:true,  desc:'有几率攻击同伴' },
  brk:   { name:'破甲', icon:'⛉', bad:true,  desc:'受到伤害 +30%' },
  weak:  { name:'虚弱', icon:'↓', bad:true,  desc:'造成伤害 -25%' },
  shield:{ name:'护盾', icon:'◈', bad:false, desc:'吸收伤害' },
  atkup: { name:'攻势', icon:'↑', bad:false, desc:'造成伤害 +30%' },
  defup: { name:'守势', icon:'⛨', bad:false, desc:'受到伤害 -30%' },
  regen: { name:'再生', icon:'✚', bad:false, desc:'每回合恢复 8% 气血' },
  taunt: { name:'嘲讽', icon:'!', bad:false, desc:'敌人优先攻击' },
};

// 技能：tgt enemy/enemies/ally/allies/self；kind phys/mag/heal/buff/debuff；pow 倍率；st [状态,几率,回合]
export const SKILLS = {
  // 晏归 火/光
  yg_slash:{name:'灯刃斩',el:'fire',mp:0,tgt:'enemy',kind:'phys',pow:1.0,lv:1,desc:'以灯火为刃的基础斩击。'},
  yg_ember:{name:'余烬',el:'fire',mp:6,tgt:'enemy',kind:'mag',pow:1.5,st:['burn',0.5,3],lv:1,desc:'火属性术法，50% 灼烧。'},
  yg_guard:{name:'守灯式',el:'none',mp:5,tgt:'self',kind:'buff',st:['taunt',1,2],st2:['defup',1,2],lv:4,desc:'吸引敌人注意并进入守势。'},
  yg_eye:{name:'烛瞳一瞥',el:'light',mp:10,tgt:'enemy',kind:'mag',pow:2.0,st:['brk',0.6,3],lv:8,desc:'光属性，60% 破甲。'},
  yg_wildfire:{name:'燎原',el:'fire',mp:16,tgt:'enemies',kind:'mag',pow:1.25,st:['burn',0.35,3],lv:14,desc:'火焰席卷全体敌人。'},
  yg_dawn:{name:'破晓斩',el:'light',mp:18,tgt:'enemy',kind:'phys',pow:3.0,lv:22,desc:'凝聚烛瞳之光的重斩。'},
  yg_eternal:{name:'长明',el:'light',mp:28,tgt:'allies',kind:'heal',pow:0.9,st:['atkup',1,3],lv:30,desc:'治疗全体并赋予攻势。'},
  yg_ult:{name:'灯技·烛照九幽',el:'light',ult:true,tgt:'enemies',kind:'mag',pow:3.6,st:['brk',1,3],desc:'以烛瞳照彻长夜，对全体敌人造成巨大光属性伤害并破甲。'},
  // 白霁 木/幻
  bj_claw:{name:'狐爪',el:'wood',mp:0,tgt:'enemy',kind:'phys',pow:1.0,lv:1,desc:'迅捷的爪击。'},
  bj_foxfire:{name:'狐火',el:'wood',mp:6,tgt:'enemy',kind:'mag',pow:1.6,lv:1,desc:'青色狐火，木属性术法。'},
  bj_charm:{name:'媚眼',el:'none',mp:8,tgt:'enemy',kind:'debuff',st:['charm',0.75,2],lv:5,desc:'75% 魅惑目标两回合。'},
  bj_mirage:{name:'蜃楼',el:'none',mp:10,tgt:'allies',kind:'buff',st:['shield',1,3],shieldPow:0.6,lv:9,desc:'为全体附加幻影护盾。'},
  bj_ninetail:{name:'九尾乱舞',el:'wood',mp:15,tgt:'enemies',kind:'mag',pow:1.3,hits:1,lv:15,desc:'九尾横扫全体敌人。'},
  bj_dream:{name:'一枕黄粱',el:'none',mp:18,tgt:'enemies',kind:'debuff',st:['stun',0.45,1],st2:['weak',0.8,3],lv:23,desc:'令敌人入梦：45% 眩晕，80% 虚弱。'},
  bj_qingqiu:{name:'青丘焚夜',el:'wood',mp:26,tgt:'enemies',kind:'mag',pow:2.3,lv:31,desc:'青丘王族秘传的狐火大术。'},
  bj_ult:{name:'灯技·千年狐梦',el:'wood',ult:true,tgt:'enemies',kind:'mag',pow:3.0,st:['charm',0.8,2],desc:'把敌人困入千年之梦，造成木属性伤害并大概率魅惑。'},
  // 衔微 金
  xw_peck:{name:'衔石',el:'metal',mp:0,tgt:'enemy',kind:'phys',pow:1.05,lv:1,desc:'掷出衔来的石子。'},
  xw_dive:{name:'俯冲',el:'metal',mp:5,tgt:'enemy',kind:'phys',pow:1.7,lv:1,desc:'自高空俯冲啄击。'},
  xw_feathers:{name:'羽刃',el:'metal',mp:9,tgt:'enemies',kind:'phys',pow:1.0,lv:5,desc:'羽毛化为飞刃射向全体。'},
  xw_resolve:{name:'不移之志',el:'none',mp:8,tgt:'self',kind:'buff',st:['atkup',1,3],st2:['regen',1,3],lv:10,desc:'攻势与再生。'},
  xw_tide:{name:'逆潮',el:'metal',mp:14,tgt:'enemy',kind:'phys',pow:2.6,st:['brk',0.7,3],lv:16,desc:'迎着潮水的一击，70% 破甲。'},
  xw_cry:{name:'精卫啼',el:'metal',mp:16,tgt:'enemies',kind:'debuff',st:['weak',0.8,3],st2:['brk',0.5,3],lv:24,desc:'悲啼令敌人虚弱、破甲。'},
  xw_fill:{name:'填海',el:'metal',mp:24,tgt:'enemy',kind:'phys',pow:3.4,hits:1,lv:32,desc:'千万颗石子同时落下。'},
  xw_ult:{name:'灯技·衔石万古',el:'metal',ult:true,tgt:'enemies',kind:'phys',pow:3.2,desc:'万古不息的执念化为石雨，金属性全体物理伤害。'},
  // 戚 土
  qi_axe:{name:'干戚',el:'earth',mp:0,tgt:'enemy',kind:'phys',pow:1.1,lv:1,desc:'挥舞巨斧。'},
  qi_shield:{name:'举盾',el:'none',mp:4,tgt:'self',kind:'buff',st:['taunt',1,2],st2:['defup',1,2],lv:1,desc:'嘲讽并进入守势。'},
  qi_quake:{name:'震地',el:'earth',mp:9,tgt:'enemies',kind:'phys',pow:1.0,st:['stun',0.2,1],lv:6,desc:'震击大地，20% 眩晕全体。'},
  qi_war:{name:'战舞',el:'none',mp:10,tgt:'allies',kind:'buff',st:['atkup',1,3],lv:11,desc:'全体攻势。'},
  qi_headless:{name:'无首之怒',el:'earth',mp:15,tgt:'enemy',kind:'phys',pow:2.8,lv:17,desc:'失去头颅也不会停止的愤怒。'},
  qi_bulwark:{name:'不屈',el:'none',mp:18,tgt:'allies',kind:'buff',st:['defup',1,3],st2:['shield',1,3],shieldPow:0.5,lv:25,desc:'全体守势与护盾。'},
  qi_changyang:{name:'常羊崩',el:'earth',mp:26,tgt:'enemies',kind:'phys',pow:2.2,st:['brk',0.6,3],lv:33,desc:'将常羊山的重量砸向敌人。'},
  qi_ult:{name:'灯技·猛志常在',el:'earth',ult:true,tgt:'enemies',kind:'phys',pow:3.3,st:['stun',0.5,1],desc:'刑天舞干戚，猛志固常在。全体土属性伤害，50% 眩晕。'},
  // 阿篱 木/水 治疗
  al_vine:{name:'藤鞭',el:'wood',mp:0,tgt:'enemy',kind:'phys',pow:0.9,lv:1,desc:'荆藤抽打。'},
  al_heal:{name:'山露',el:'water',mp:6,tgt:'ally',kind:'heal',pow:1.6,lv:1,desc:'治疗一名同伴。'},
  al_cleanse:{name:'辛夷',el:'wood',mp:7,tgt:'ally',kind:'heal',pow:0.8,cleanse:true,lv:1,desc:'治疗并解除不良状态。'},
  al_rain:{name:'山雨',el:'water',mp:14,tgt:'allies',kind:'heal',pow:1.0,lv:1,desc:'治疗全体同伴。'},
  al_leopard:{name:'赤豹',el:'wood',mp:10,tgt:'enemy',kind:'phys',pow:2.0,st:['poison',0.4,3],lv:20,desc:'令赤豹扑击，40% 中毒。'},
  al_spring:{name:'春生',el:'wood',mp:16,tgt:'allies',kind:'buff',st:['regen',1,3],lv:24,desc:'全体再生。'},
  al_revive:{name:'山鬼招魂',el:'water',mp:30,tgt:'ally',kind:'heal',pow:1.0,revive:true,lv:28,desc:'复活倒下的同伴。'},
  al_ult:{name:'灯技·被薜荔兮带女萝',el:'wood',ult:true,tgt:'allies',kind:'heal',pow:2.5,revive:true,st:['regen',1,3],desc:'山中草木为你而生：复活并大幅治疗全体，赋予再生。'},
  // 夸铃 火 弓
  kl_shot:{name:'追日箭',el:'fire',mp:0,tgt:'enemy',kind:'phys',pow:1.15,lv:1,desc:'快速射击。'},
  kl_volley:{name:'箭雨',el:'fire',mp:10,tgt:'enemies',kind:'phys',pow:1.1,lv:1,desc:'向全体敌人倾泻箭矢。'},
  kl_sunarrow:{name:'日落之矢',el:'light',mp:12,tgt:'enemy',kind:'phys',pow:2.3,lv:1,desc:'光属性重箭。'},
  kl_run:{name:'逐影',el:'none',mp:8,tgt:'self',kind:'buff',st:['atkup',1,3],lv:22,desc:'攻势。'},
  kl_pierce:{name:'贯日',el:'fire',mp:16,tgt:'enemy',kind:'phys',pow:2.9,st:['brk',0.8,3],lv:24,desc:'穿透一切的箭，80% 破甲。'},
  kl_thirst:{name:'渴死之誓',el:'fire',mp:20,tgt:'enemies',kind:'phys',pow:1.7,st:['burn',0.6,3],lv:28,desc:'全体火属性，60% 灼烧。'},
  kl_staff:{name:'邓林',el:'wood',mp:24,tgt:'allies',kind:'heal',pow:1.2,lv:33,desc:'夸父之杖化为桃林，治疗全体。'},
  kl_ult:{name:'灯技·夸父逐日',el:'fire',ult:true,tgt:'enemy',kind:'phys',pow:6.0,desc:'追上太阳的一箭：对单体造成毁灭性火属性伤害。'},
  // 浮黎 暗
  fl_strike:{name:'夜刃',el:'dark',mp:0,tgt:'enemy',kind:'phys',pow:1.1,lv:1,desc:'无声的刀锋。'},
  fl_shade:{name:'影噬',el:'dark',mp:8,tgt:'enemy',kind:'mag',pow:2.0,lv:1,desc:'暗属性术法。'},
  fl_snuff:{name:'熄灯',el:'dark',mp:12,tgt:'enemies',kind:'debuff',st:['weak',0.9,3],lv:1,desc:'全体虚弱。'},
  fl_oath:{name:'守灯人之誓',el:'none',mp:14,tgt:'allies',kind:'buff',st:['shield',1,3],shieldPow:0.7,lv:1,desc:'全体护盾。'},
  fl_eclipse:{name:'蚀',el:'dark',mp:20,tgt:'enemies',kind:'mag',pow:1.9,st:['brk',0.5,3],lv:1,desc:'暗属性全体，50% 破甲。'},
  fl_penance:{name:'赎',el:'light',mp:24,tgt:'allies',kind:'heal',pow:1.4,cleanse:true,lv:1,desc:'治疗全体并净化。'},
  fl_void:{name:'长夜无灯',el:'dark',mp:30,tgt:'enemy',kind:'mag',pow:3.8,lv:1,desc:'暗属性单体巨大伤害。'},
  fl_ult:{name:'灯技·师者之灯',el:'dark',ult:true,tgt:'enemies',kind:'mag',pow:3.4,st:['stun',0.4,1],desc:'燃尽残灯为弟子开路：暗属性全体伤害，40% 眩晕。'},
};

export const CHARS = {
  yangui:{name:'晏归',title:'烬城守灯人',el:'fire',el2:'light',voice:'male-qn-qingse',playable:true,
    base:{hp:120,mp:30,atk:14,mag:13,def:10,spd:11},grow:{hp:15,mp:2.6,atk:2.6,mag:2.5,def:1.9,spd:0.6},
    skills:['yg_slash','yg_ember','yg_guard','yg_eye','yg_wildfire','yg_dawn','yg_eternal'],ult:'yg_ult',
    bio:'十九岁，烬城最年轻的守灯人。左眼嵌着一枚会发烫的“烛瞳”碎片。说话不多，习惯先把灯护好再想别的。他不记得自己的父母，只记得师父浮黎的手很暖。'},
  baiji:{name:'白霁',title:'青丘狐族公主',el:'wood',voice:'female-shaonv',playable:true,
    base:{hp:95,mp:40,atk:10,mag:16,def:8,spd:14},grow:{hp:12,mp:3.4,atk:1.8,mag:3.0,def:1.5,spd:0.8},
    skills:['bj_claw','bj_foxfire','bj_charm','bj_mirage','bj_ninetail','bj_dream','bj_qingqiu'],ult:'bj_ult',
    bio:'涂山娇的妹妹，偷走了青丘的狐火，只因为她想看一次真正的日出。爱笑，嘴硬，害怕孤独胜过害怕死。'},
  xianwei:{name:'衔微',title:'精卫转世',el:'metal',voice:'female-yujie',playable:true,
    base:{hp:105,mp:28,atk:15,mag:9,def:9,spd:13},grow:{hp:13.5,mp:2.2,atk:2.8,mag:1.5,def:1.7,spd:0.75},
    skills:['xw_peck','xw_dive','xw_feathers','xw_resolve','xw_tide','xw_cry','xw_fill'],ult:'xw_ult',
    bio:'发鸠山下的渔家少女，梦里总是在飞。她记得自己曾溺死在东海，也记得自己发过誓。'},
  qi:{name:'戚',title:'刑天残魂',el:'earth',voice:'male-qn-jingying',playable:true,
    base:{hp:150,mp:22,atk:15,mag:6,def:14,spd:7},grow:{hp:19,mp:1.8,atk:2.7,mag:0.9,def:2.5,spd:0.45},
    skills:['qi_axe','qi_shield','qi_quake','qi_war','qi_headless','qi_bulwark','qi_changyang'],ult:'qi_ult',
    bio:'常羊山上无首的战魂。以乳为目，以脐为口。说话时声音从胸腔里传出，像擂鼓。他在找自己的头，也在找自己为何而战。'},
  ali:{name:'阿篱',title:'山鬼',el:'wood',el2:'water',voice:'female-chengshu',playable:true,
    base:{hp:100,mp:45,atk:9,mag:15,def:9,spd:12},grow:{hp:12.5,mp:3.6,atk:1.5,mag:2.8,def:1.6,spd:0.7},
    skills:['al_vine','al_heal','al_cleanse','al_rain','al_leopard','al_spring','al_revive'],ult:'al_ult',
    bio:'乘赤豹、从文狸的山鬼。被帝江留在混沌之宫当了三百年的乐师。温柔，健忘，总在等一个不会来的人。'},
  kualing:{name:'夸铃',title:'夸父后裔',el:'fire',voice:'male-qn-daxuesheng',playable:true,
    base:{hp:110,mp:30,atk:17,mag:8,def:9,spd:13},grow:{hp:13.5,mp:2.4,atk:3.0,mag:1.3,def:1.6,spd:0.8},
    skills:['kl_shot','kl_volley','kl_sunarrow','kl_run','kl_pierce','kl_thirst','kl_staff'],ult:'kl_ult',
    bio:'夸父族最后的弓手，在禺谷守着太阳的尸骸。少年意气，嗓门大，喝水比谁都多。'},
  fuli:{name:'浮黎',title:'守灯人之长',el:'dark',voice:'male-qn-badao',playable:true,
    base:{hp:130,mp:40,atk:16,mag:17,def:12,spd:12},grow:{hp:15,mp:3.2,atk:2.7,mag:2.9,def:2.0,spd:0.7},
    skills:['fl_strike','fl_shade','fl_snuff','fl_oath','fl_eclipse','fl_penance','fl_void'],ult:'fl_ult',
    bio:'晏归的师父。三年前独自北上，再回来时，带着玄冥的面具。'},
  xuanming:{name:'玄冥',title:'北方夜神',voice:'male-qn-badao',bio:'冬与夜的主宰。三百年前，他让烛龙闭上了眼睛。他相信长夜是慈悲。'},
  xiwangmu:{name:'西王母',title:'昆仑之主',voice:'female-yujie',bio:'蓬发戴胜，豹尾虎齿而善啸。司天之厉及五残。掌不死之药。'},
  baize:{name:'白泽',title:'通晓万物的神兽',voice:'male-qn-jingying',bio:'能言，达于万物之情。曾为黄帝述天下鬼神之事一万一千五百二十种。图鉴的主人。'},
  xiangliu:{name:'相柳',title:'九首蛇神',voice:'male-qn-badao',bio:'共工之臣，九首人面，蛇身而青。其所歍所尼，即为源泽。'},
  dijiang:{name:'帝江',title:'混沌之神',voice:'male-qn-qingse',bio:'状如黄囊，赤如丹火，六足四翼，浑敦无面目，是识歌舞。'},
  zhulong:{name:'烛龙',title:'钟山之神',voice:'male-qn-jingying',bio:'人面蛇身而赤，直目正乘。其瞑乃晦，其视乃明。'},
  luwu:{name:'陆吾',title:'昆仑守卫',voice:'male-qn-jingying',bio:'其神状虎身而九尾，人面而虎爪。司天之九部及帝之囿时。'},
  ba:{name:'魃',title:'旱神',voice:'female-chengshu',bio:'黄帝之女，衣青衣。所居不雨。被锁在赤水之北已三千年。'},
  tushanjiao:{name:'涂山娇',title:'青丘女王',voice:'female-yujie',bio:'青丘九尾狐之王，白霁的姐姐。冷静、骄傲，把族人的存续看得比一切都重。'},
};
export const PLAYABLE = ['yangui','baiji','xianwei','qi','ali','kualing','fuli'];
export const COMPANIONS = ['baiji','xianwei','qi','ali','kualing'];
export const NAME2ID = Object.fromEntries(Object.entries(CHARS).map(([k,v])=>[v.name,k]));
