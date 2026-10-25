/** 中后期内容密度：通关反应、关间支线、首通馈赠 */
import { S, addGold, addItem } from '../engine/state.js';
import { CHARS } from '../data/characters.js';

/** 招牌关 / 区首领首通时的同伴短句 */
const REACT = {
  qingqiu_5:  [{ id: 'baiji',   line: '狐冢的灯……别走太远。我闻得到狐火里的旧名字。' }],
  qingqiu_10: [{ id: 'baiji',   line: '狐梦散了。你还记得回家的路吗，守灯人？' }, { id: 'yangui', line: '青丘过了。前方的潮，比狐火更难辨认。' }],
  donghai_4:  [{ id: 'xianwei', line: '发鸠山道要限时。精卫的石，我帮你记着节拍。' }],
  donghai_10: [{ id: 'xianwei', line: '毒潮退了一寸。别松手——海不会原谅第二次。' }],
  changyang_6:[{ id: 'qi',      line: '夔鼓响了。这一仗，用骨头记，不用嘴。' }],
  changyang_10:[{ id: 'qi',     line: '战魂歇了。碑上的字，还是空着——留给还活着的人。' }],
  kunlun_5:   [{ id: 'xianwei', line: '悬圃的玉阶凉。护灯时，别看穷奇的眼睛。' }],
  kunlun_10:  [{ id: 'luwu',    line: '帝之下都已开。陆吾在此——往前走。' }],
  hundun_6:   [{ id: 'ali',     line: '乱序回廊？闭目才是正路。睁眼只会迷路。' }],
  hundun_10:  [{ id: 'ali',     line: '混沌无面，可你还有灯。把灯举高一点。' }],
  yugu_5:     [{ id: 'kualing', line: '旱奴营的火会烤干灯芯。人贴着灯走。' }],
  yugu_10:    [{ id: 'kualing', line: '魃退了。夸父的影子还在——别追太阳。' }, { id: 'ba', line: '……热。可你们还活着。' }],
  beihai_5:   [{ id: 'baiji',   line: '梦蝶雪谷：睁眼是空的。闭目才有人等你。' }],
  beihai_10:  [{ id: 'xianwei', line: '九首退潮。相柳的泪，记得收好。' }],
  guixu_3:    [{ id: 'fuli',    line: '渊瞳之海两层都要走。你师父教过你：灯不偏心。' }],
  guixu_8:    [{ id: 'fuli',    line: '浮黎之誓……你若还认得我，就把共鸣留给破防。' }],
  guixu_10:   [{ id: 'fuli',    line: '钟山之下。别眨眼——这一次，我陪你。' }, { id: 'yangui', line: '……天亮之前，我们还在。' }],
};

/** 关间支线：通关某关后触发一次（旗标 mid_side_<id>） */
const SIDE = [
  { after: 'qingqiu_3', id: 'fox_lantern', title: '狐火穗', text: '林间掉下一枚狐火穗。白际说：收着，日后有用。', gold: 120, item: 'm_fur', n: 2, aff: { baiji: 2 } },
  { after: 'qingqiu_8', id: 'mirror_lake', title: '镜湖夜话', text: '镜湖倒映的不是月，是另一盏灯。你对它点了点头。', gold: 180, item: 'm_ink', n: 1 },
  { after: 'donghai_3', id: 'jingwei_stone', title: '精卫石', text: '岸边有人在丢石头。你帮她丢了三块——潮退半寸。', gold: 150, item: 'm_scale', n: 2, aff: { xianwei: 2 } },
  { after: 'donghai_7', id: 'shark_song', title: '鲛人谣', text: '暗礁里传来谣曲。闭目听完，梦屑落进灯芯。', gold: 200, dust: 3 },
  { after: 'changyang_4', id: 'bone_drum', title: '骨鼓残片', text: '戚拾起一块鼓皮：「这一仗，还没打完。」', gold: 160, item: 'm_bone', n: 3, aff: { qi: 2 } },
  { after: 'changyang_8', id: 'nameless_stele', title: '无字碑', text: '碑前静默片刻。星砂像烛泪一样掉进石缝。', gold: 220, item: 'm_bronze', n: 2 },
  { after: 'kunlun_3', id: 'jade_step', title: '玉阶余温', text: '第三阶还带着人的体温。谁刚从这里走过？', gold: 200, item: 'm_jade', n: 1 },
  { after: 'kunlun_7', id: 'yaochi_ripple', title: '瑶池涟漪', text: '外堤起了一圈涟漪。你没有伸手——有些水，不能碰。', gold: 240, item: 'm_silk', n: 2 },
  { after: 'hundun_3', id: 'blank_page', title: '空白页', text: '书魇掉下一页白纸。阿离说：写上你的名字，它就怕你。', gold: 260, item: 'm_ink', n: 3, aff: { ali: 2 } },
  { after: 'hundun_8', id: 'no_face', title: '无面之礼', text: '有人递来一副没有五官的面具。你没戴。灯更亮了。', gold: 300, dust: 4 },
  { after: 'yugu_3', id: 'scorch_mark', title: '焦痕', text: '夸灵用脚尖碾灭一截余烬：「走。太阳不会等我们。」', gold: 280, item: 'm_cinnabar', n: 2, aff: { kualing: 2 } },
  { after: 'yugu_7', id: 'jinwu_feather', title: '金乌残羽', text: '坠处拾到一根还烫的羽。灯芯「嗤」地响了一声。', gold: 320, item: 'm_goldsand', n: 1 },
  { after: 'beihai_3', id: 'ice_scale', title: '冰鳞', text: '鲲之脊上凝着一片冰鳞。贴耳时，海在叫你的名字。', gold: 340, item: 'm_frost', n: 2 },
  { after: 'beihai_7', id: 'xiangliu_echo', title: '九首回声', text: '沼面起雾。你听见第九个头在叹气——不是恨，是倦。', gold: 380, dust: 5 },
  { after: 'guixu_2', id: 'star_sand', title: '星骸一捧', text: '浮黎把一捧星砂倒进你掌心：「别省。归墟以下，灯油比命贵。」', gold: 400, item: 'm_starmarrow', n: 1, aff: { fuli: 3 } },
  { after: 'guixu_6', id: 'lamp_bridge', title: '灯烬之桥', text: '桥只在灯亮时存在。你走过去，回头——桥还在。', gold: 450, dust: 6 },
];

function partyHas(id) {
  return !!(S.party?.[id] || (S.members || []).includes(id) || id === 'yangui');
}

export function companionReactions(stage, first) {
  if (!first) return [];
  const list = REACT[stage.id] || [];
  return list.filter(r => partyHas(r.id)).map(r => ({
    id: r.id,
    name: CHARS[r.id]?.name || r.id,
    line: r.line,
  }));
}

export function rollSideEvent(stage, first) {
  if (!first) return null;
  const hit = SIDE.find(s => s.after === stage.id);
  if (!hit) return null;
  const flag = 'mid_side_' + hit.id;
  if (S.flags?.[flag]) return null;
  S.flags = S.flags || {};
  S.flags[flag] = true;
  if (hit.gold) addGold(hit.gold);
  if (hit.item && hit.n) addItem(hit.item, hit.n);
  if (hit.dust) S.act.dust = (S.act.dust || 0) + hit.dust;
  if (hit.aff) {
    S.aff = S.aff || {};
    for (const [cid, n] of Object.entries(hit.aff)) {
      if (partyHas(cid)) S.aff[cid] = (S.aff[cid] || 0) + n;
    }
  }
  return { title: hit.title, text: hit.text, gold: hit.gold || 0, item: hit.item, n: hit.n, dust: hit.dust || 0 };
}

/** 中后期区中/区首领首通馈赠 */
export function midClearGifts(stage, first, out) {
  if (!first) return;
  const midBoss = stage.idx === 4 && stage.ri >= 1;
  const endBoss = stage.idx === 9 && stage.ri >= 1;
  const sig = stage.signature;
  if (midBoss) {
    const g = 100 + stage.lv * 8; addGold(g); out.gold += g;
    addItem('m_bronze', 2); out.items.push({ id: 'm_bronze', n: 2 });
    if (stage.ri >= 3) { addItem('m_jade', 1); out.items.push({ id: 'm_jade', n: 1 }); }
    out.unlocks.push('区中首领赏 · 锻造材料');
  }
  if (endBoss) {
    const g = 180 + stage.lv * 12; addGold(g); out.gold += g;
    addItem(stage.ri >= 5 ? 'm_starmarrow' : 'm_cinnabar', stage.ri >= 5 ? 2 : 3);
    out.items.push({ id: stage.ri >= 5 ? 'm_starmarrow' : 'm_cinnabar', n: stage.ri >= 5 ? 2 : 3 });
    out.unlocks.push('区首领首通 · 厚赏');
    // 轻量剧情旗：方便羁绊/支线解锁（不抢主线 VN）
    const chMap = { 1: 'ch1_done', 2: 'ch2_done', 3: 'ch3_done', 4: 'ch5_done', 5: 'ch6_done', 6: 'ch7_done', 7: 'ch9_done', 8: 'ch10_done' };
    const fl = chMap[stage.ri];
    if (fl && !S.flags[fl]) { S.flags[fl] = true; out.unlocks.push('长夜卷有新页可翻'); }
  }
  if (sig && !midBoss && !endBoss) {
    const g = 60 + stage.lv * 4; addGold(g); out.gold += g;
    out.unlocks.push('招牌关踏破 · ' + (stage.name || stage.id));
  }
}
