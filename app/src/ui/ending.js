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
  saveMeta(); ach('end_'+X.toLowerCase()); if (meta.endings.length>=6) ach('all_endings'); if (scales()>=5) ach('scales5'); ach('ch12');
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
    h('div.cr', {}, h('b', {}, `已见证结局 ${meta.endings.length}/6`), h('span', {}, meta.endings.length<6 ? hint() : '你见过了山海的每一种黎明与长夜。')),
    h('div.cr.fin', {}, h('b', {}, '— 完 —'))));
  root.append(cr);
  await sleep(50); cr.classList.add('on');
  await waitTap(root, fast?(fast.endMs||300):30000);
}
function hint(){
  const left = Object.keys(ENDINGS).filter(x=>!meta.endings.includes(x));
  const H = { A:'若灯心足够明亮，而你选择唤醒烛龙……', B:'若在最后接受玄冥的长梦……', C:'若你愿意亲自成为那盏灯……', D:'若灯心在旅途中燃尽……', E:'若有一只狐狸愿意陪你做一千年的梦……', F:'若五位同伴无一失散、皆与你心意相通，浮黎得到宽恕，魃得到自由，并集齐五枚以上的烛龙鳞……' };
  return '未见的结局：'+H[left[0]];
}
function waitTap(el, ms){ return new Promise(r=>{ let done=false; const f=()=>{ if (done) return; done=true; el.removeEventListener('pointerdown', f); r(); }; setTimeout(()=>el.addEventListener('pointerdown', f), 600); setTimeout(f, ms); }); }
