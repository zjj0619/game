import { S, meta, saveMeta, ach, scales } from '../engine/state.js';
import { h, asset, sleep, fmtTime } from '../engine/ui.js';
import { playBgm } from '../engine/audio.js';
import { setAmbient } from '../engine/fx.js';
import { show } from '../main.js';
import { CHARS } from '../data/characters.js';

export const ENDINGS = {
  A:{ name:'长明', bgm:'dawn', poem:['烛龙睁眼，昼夜重分。','你把灯交还给了天空，','从此人间不必再燃烧星辰。'] },
  B:{ name:'长夜', bgm:'sad', poem:['你选择了梦。','九州在玄冥的怀里安睡，','没有人再醒来，也没有人再痛苦。'] },
  C:{ name:'新烛', bgm:'warm', poem:['你成了新的烛龙。','左眼是昼，右眼是夜，','你在钟山上，替所有人守着这盏灯。'] },
  D:{ name:'归墟同眠', bgm:'guixu', poem:['灯心燃尽了。','你和所有坠落的星辰一起，','沉入那没有底的海。'] },
  E:{ name:'狐梦千年', bgm:'dream', poem:['青丘的桃花开了一千次。','她说，梦里也有日出。','你说，那就够了。'] },
  F:{ name:'昼夜双瞳', bgm:'dawn', poem:['烛龙睁开了双眼。','一只眼看着白昼，一只眼守着长夜，','而你们，都还在。'] },
  G:{ name:'衔石填海', bgm:'warm', poem:['石头会积起来。','一天一颗，也算。','东海浅了一寸。'] },
  H:{ name:'无头之誓', bgm:'tense', poem:['某无头，故无所顾瞻。','鼓声擂了三百年，','终于有人愿意放下斧。'] },
  I:{ name:'山鬼待君', bgm:'dream', poem:['草会把你带回她这里。','门永远不开，','等了很久，也不着急。'] },
  J:{ name:'逐日余烬', bgm:'battle', poem:['太阳已经落下。','那就追余烬。','地平线上，一串会跑的小太阳。'] },
  K:{ name:'师徒共灯', bgm:'dawn', poem:['密信按在灯罩上。','师父站在旁边，不是身后。','灯塔亮了两倍。'] },
  L:{ name:'噩梦永昼', bgm:'guixu', poem:['梦层与醒层粘在一起。','太阳是假的，影子会说话。','眼皮被金线缝住了。'] },
  M:{ name:'假日将尽', bgm:'warm', poem:['孩子们埋下纸太阳。','土里钻出一盏刚好够暖的光。','童子燃假日，长夜稍缓。'] },
  N:{ name:'鳞下密信', bgm:'sad', poem:['不点燃，也不沉睡。','只把密信读完。','有人说这才是成年人的勇气。'] },
  O:{ name:'相柳之泪', bgm:'dream', poem:['九头退去之后，','你把灯调暗了一点。','刚好够他看见路。'] },
};
const CREDITS = [
  ['烛龙纪 · 长夜山海',''],
  ['故事 · 世界观 · 程序',''],
  ['美术','AI 生成插画，经程序化后期处理'],
  ['音乐与音效','程序化生成（WebAudio）'],
  ['灵感取材','《山海经》《楚辞》《淮南子》《列子》'],
  ['特别感谢','每一位在长夜里点灯的人'],
];
export async function endingScreen(X){
  const E = ENDINGS[X] || ENDINGS.A;
  if (!meta.endings.includes(X)) meta.endings.push(X);
  if (!meta.cgs.includes('end_'+X.toLowerCase())) meta.cgs.push('end_'+X.toLowerCase());
  saveMeta(); ach('end_'+X.toLowerCase()); if (meta.endings.length>=15) ach('all_endings'); if (scales()>=5) ach('scales5'); ach('ch12');
  playBgm(E.bgm); setAmbient(X==='B'||X==='D'?'snow':'embers');
  const root = h('div.screen.ending', {}, h('div.end-cg', { style:{backgroundImage:`url(${asset('cg/end_'+X.toLowerCase())})`} }), h('div.end-shade'));
  const card = h('div.end-card', {}, h('div.end-x', {}, '结局 '+X), h('div.end-name', {}, E.name), ...E.poem.map(l=>h('div.end-l', {}, l)));
  root.append(card); show(root);
  const fast = window.__ZLJ_TEST;
  await sleep(fast?300:400); card.classList.add('on');
  await waitTap(root, fast?(fast.endMs||200):6000);
  card.classList.remove('on'); await sleep(fast?100:900);
  const cr = h('div.credits', {}, h('div.roll', {}, ...CREDITS.map(([a,b])=>h('div.cr', {}, h('b', {}, a), b?h('span', {}, b):null)),
    h('div.cr', {}, h('b', {}, '同行者'), h('span', {}, S.members.map(m=>CHARS[m].name).join(' · '))),
    S.lost.length ? h('div.cr', {}, h('b', {}, '留在了路上'), h('span', {}, S.lost.map(m=>CHARS[m].name).join(' · '))) : null,
    h('div.cr', {}, h('b', {}, '旅程'), h('span', {}, `用时 ${fmtTime(S.playtime||0)} · 灯心 ${S.hope} · 烛龙鳞 ${scales()}/7 · 支线 ${Object.values(S.quests).filter(x=>x==='done').length}/24`)),
    h('div.cr', {}, h('b', {}, `已见证结局 ${meta.endings.length}/15`), h('span', {}, meta.endings.length<15 ? hint() : '你见过了山海的每一种黎明与长夜。')),
    h('div.cr.fin', {}, h('b', {}, '— 完 —'))));
  root.append(cr);
  await sleep(50); cr.classList.add('on');
  await waitTap(root, fast?(fast.endMs||300):30000);
}
function hint(){
  const left = Object.keys(ENDINGS).filter(x=>!meta.endings.includes(x));
  const H = {
    A:'灯心明亮，选择唤醒烛龙', B:'在终局接受玄冥的长梦', C:'吞下七片烛瞳，成为新烛龙', D:'旅途中灯心燃尽（hope 过低）',
    E:'白霁好感≥80且受保护、未失散', F:'全员好感≥60、无失散、魃自由、浮黎宽恕、鳞≥5',
    G:'衔微信物+海誓+好感≥85', H:'戚信物+无头誓+好感≥85', I:'阿篱信物+待君旗+好感≥85', J:'夸铃信物+逐日旗+好感≥85',
    K:'浮黎密信+宽恕+同队+好感≥70+鳞≥6', L:'诅咒残灯+梦瘾+梦层翻转≥8', M:'假日之种+孩子们的灯+hope≥70',
    N:'密信已读+墨鳞在身', O:'饶过相柳+梦鳞+相柳之绊',
  };
  return '未见的结局：'+ (H[left[0]]||left[0]);
}
function waitTap(el, ms){ return new Promise(r=>{ let done=false; const f=()=>{ if (done) return; done=true; el.removeEventListener('pointerdown', f); r(); }; setTimeout(()=>el.addEventListener('pointerdown', f), 600); setTimeout(f, ms); }); }
