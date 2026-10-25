import { S, settings, meta, save, load, newGame, slotInfo, SAVE_SLOTS, AUTO, stats, addItem, addGold, gainExp, affAdd, ach, healAll, has } from '../engine/state.js';
import { CHARS } from '../data/characters.js';
import { REGIONS, REGION_ORDER } from '../data/regions.js';
import { QUESTS } from '../data/quests.js';
import { ITEMS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { h, btn, asset, icon, toast, panel, confirmBox, fmtTime } from '../engine/ui.js';
import { playBgm, sfx } from '../engine/audio.js';
import { setAmbient } from '../engine/fx.js';
import { runSub } from '../engine/vn.js';
import { vnScreen, restoreScene } from '../engine/vn.js';
import { game, show } from '../main.js';
import { openMenu, openSaves, openSettings, openGallery, openAchievements, openShop } from './menu.js';
import { openCamp } from './camp.js';

// —— 标题 ——
export function titleScreen(){
  const latest = latestSave();
  const primary = latest!=null
    ? btn('继续旅程', ()=>game.loadSlot(latest), 'tmenu primary gold-lacquer')
    : btn('新的旅程', async ()=>{ if (latest!=null && !(await confirmBox('开始新的旅程？已有存档不会被删除。'))) return; game.newGame(); }, 'tmenu primary gold-lacquer');
  const secondary = latest!=null
    ? btn('新的旅程', async ()=>{ if (!(await confirmBox('开始新的旅程？已有存档不会被删除。'))) return; game.newGame(); }, 'tmenu secondary')
    : null;
  const root = h('div.screen.title', {},
    h('div.t-bg', { style:{backgroundImage:`url(${asset('cg/key_title_splash')})`} }),
    h('div.t-bg.t-bg2', { style:{backgroundImage:`url(${asset('cg/key_dream_layers')})`, opacity:'0.28'} }),
    h('div.t-shade'),
    h('div.t-wick'),
    h('div.t-logo', {}, h('div.t-main', {}, '烛龙纪'), h('div.t-sub', {}, '长 夜 山 海'), h('div.t-en', {}, 'CHRONICLE OF THE TORCH DRAGON'), h('div.t-hook', {}, '灯芯 · 烛瞳 · 梦层 · 共鸣')),
    h('div.t-menu', {},
      primary,
      btn('山海闯关', ()=>{ if (latest!=null) { if (!load(latest)) return; } else newGame(); game.hub(); }, 'tmenu secondary'),
      secondary,
      h('div.t-sec', {},
        btn('档', ()=>openSaves('load'), 'tmenu ticon'),
        btn('忆', ()=>openGallery(), 'tmenu ticon'),
        btn('成', ()=>openAchievements(), 'tmenu ticon'),
        btn('设', ()=>openSettings(), 'tmenu ticon'))),
    h('div.t-foot', {}, `已见证结局 ${meta.endings.length}/15 · v2.0 · 山海经神话原创故事`));
  return root;
}
function latestSave(){
  let best=null, bt=0;
  for (const i of [AUTO, ...Array.from({length:SAVE_SLOTS},(_, k)=>k)]) { const s=slotInfo(i); if (s && s.time>bt) { bt=s.time; best=i; } }
  return best;
}

// —— 顶栏 ——
function topBar(title, extra=[]){
  return h('div.topbar', {},
    h('div.tb-title', {}, title),
    h('div.tb-info', {}, h('span.gold', {}, '✦ '+S.gold), h('span.hope', { title:'灯心' }, '灯心 '+S.hope)),
    h('div.tb-btns', {}, ...extra, btn('菜单', ()=>openMenu(), 'sm')));
}

// —— 世界地图 ——
export function worldScreen(){
  const pins = REGION_ORDER.filter(r=>S.flags['reg_'+r]).map(id => {
    const R = REGIONS[id]; const main = S.explore?.region===id;
    return h('div.wpin'+(main?'.main':'')+(S.region===id?'.here':''), { style:{left:R.wx+'%', top:R.wy+'%'}, onclick:()=>{ sfx('click'); game.region(id); } },
      h('div.wdot'), h('div.wname', {}, R.name.split('·')[0]), h('div.wlv', {}, 'Lv '+R.lv), main?h('div.wmain', {}, '主线'):null);
  });
  return h('div.screen.world', {},
    h('div.w-map', { style:{backgroundImage:`url(${asset('ui/worldmap')})`} }, ...pins),
    topBar('九州山海图', [btn('山海闯关', ()=>game.hub(), 'sm gold'), S.explore ? h('span.hint', {}, '主线：'+REGIONS[S.explore.region].name) : null]));
}

// —— 区域地图 ——
export function questState(q){
  const st = S.quests[q.id];
  if (st==='done') return 'done';
  if (!st) return 'new';
  return questMet(q) ? 'ready' : 'active';
}
export function questProgress(q){
  const n = q.need; const out=[];
  if (n.kill) for (const [e,c] of Object.entries(n.kill)) out.push(`${ENEMIES[e].name} ${Math.min(c,(S.kills[e]||0)-(S.qsnap[q.id]?.[e]||0))}/${c}`);
  if (n.item) for (const [i,c] of Object.entries(n.item)) out.push(`${ITEMS[i].name} ${Math.min(c,S.inv[i]||0)}/${c}`);
  if (n.win) out.push(S.flags['won_'+n.win] ? '已击败精英' : '击败精英敌人');
  if (n.none) out.push('与委托人交谈');
  return out.join('，');
}
function questMet(q){
  const n=q.need;
  if (n.kill) for (const [e,c] of Object.entries(n.kill)) if ((S.kills[e]||0)-(S.qsnap[q.id]?.[e]||0) < c) return false;
  if (n.item) for (const [i,c] of Object.entries(n.item)) if (!has(i,c)) return false;
  if (n.win && !S.flags['won_'+n.win]) return false;
  return true;
}
function finishQuest(q){
  if (q.need.item) for (const [i,c] of Object.entries(q.need.item)) addItem(i,-c);
  const r=q.reward; const got=[];
  if (r.gold) { addGold(r.gold); got.push('星砂 '+r.gold); }
  for (const [i,c] of Object.entries(r.items||{})) { addItem(i,c); got.push(ITEMS[i].name+'×'+c); }
  if (r.exp) { for (const m of S.members) gainExp(m, r.exp); got.push('经验 '+r.exp); }
  for (const [c,v] of Object.entries(r.aff||{})) { affAdd(c,v); got.push(CHARS[c].name+' 好感+'+v); }
  S.quests[q.id]='done'; sfx('ach');
  const n = Object.values(S.quests).filter(x=>x==='done').length; if (n>=5) ach('sq5'); if (n>=24) ach('sq24');
  toast('支线完成：'+q.name, 'good'); toast('获得：'+got.join('、'));
}
function playQuestScene(label, then){
  show(vnScreen()); restoreScene();
  runSub(label, () => { then && then(); game.region(S.region); });
}
export function onQuest(q){
  const st = questState(q);
  if (st==='new') {
    const bg = S.bg; S.bg = REGIONS[q.region].bg; S.shown = {}; S.cg = null;
    playQuestScene(q.start, () => {
      S.quests[q.id] = 'active'; S.qsnap[q.id] = {...S.kills};
      if (q.need.kill) S.qsnap[q.id] = Object.fromEntries(Object.keys(q.need.kill).map(e=>[e,S.kills[e]||0]));
      toast('接受支线：'+q.name);
    });
  } else if (st==='ready') {
    S.bg = REGIONS[q.region].bg; S.shown = {}; S.cg = null;
    playQuestScene(q.done, () => finishQuest(q));
  } else {
    const p = panel(q.name, { cls:'small' });
    p.body.append(h('p', {}, q.desc), h('p.prog', {}, '进度：'+questProgress(q)), h('div.row.center', {}, btn('知道了', p.close, 'gold')));
  }
}
// 主线节点放在离其他节点最远的位置，避免重叠
function mainPos(R, id){
  const pts = [...R.nodes, ...Object.values(QUESTS).filter(q=>q.region===id)].map(n=>[n.x, n.y]);
  let best={x:50,y:50}, bd=-1;
  for (let x=22;x<=78;x+=4) for (let y=28;y<=70;y+=4) {
    let d = Math.min(...pts.map(([a,b])=>Math.hypot((a-x)*1.6, b-y)), 999) - Math.hypot(x-50,y-48)*0.25;
    if (d>bd) { bd=d; best={x,y}; } }
  return best;
}
const NODE_ICON = { camp:'⛺', shop:'⚖', battle:'⚔', gather:'✿', elite:'☠' };
export function regionScreen(id){
  const R = REGIONS[id];
  playBgm(R.bgm); setAmbient({jincheng:'embers',qingqiu:'blue',donghai:'stars',changyang:'embers',kunlun:'snow',hundun:'stars',yugu:'embers',beihai:'snow',guixu:'stars'}[id]);
  const nodes = R.nodes.map(n => h('div.node.'+n.type, { style:{left:n.x+'%', top:n.y+'%'}, onclick:()=>{ sfx('click'); onNode(id, n); } },
    h('div.n-ic', {}, NODE_ICON[n.type]), h('div.n-name', {}, n.name), n.type==='gather' && S.gather[n.id]>0 ? h('div.n-cd', {}, `${S.gather[n.id]}战后`) : null));
  const qs = Object.values(QUESTS).filter(q => q.region===id && S.flags[q.unlock] && S.quests[q.id]!=='done').map(q => {
    const st = questState(q);
    return h('div.node.quest.'+st, { style:{left:q.x+'%', top:q.y+'%'}, onclick:()=>{ sfx('click'); onQuest(q); } },
      h('div.n-ic', {}, st==='new'?'!':st==='ready'?'✔':'…'), h('div.n-name', {}, q.giver));
  });
  const mp = mainPos(R, id);
  const main = S.explore?.region===id ? h('div.node.mainnode', { style:{left:mp.x+'%', top:mp.y+'%'}, onclick:()=>{ sfx('bell'); game.continueMain(); } },
    h('div.n-ic', {}, '◆'), h('div.n-name', {}, S.explore.name)) : null;
  const anyWorld = REGION_ORDER.filter(r=>S.flags['reg_'+r]).length>1;
  const party = h('div.r-party', {}, S.formation.map(m => { const st=stats(m); const p=S.party[m];
    return h('div.rp-card', { onclick:()=>openMenu('party') }, h('div.a-face.sm', {style:{backgroundImage:`url(${asset('por/'+m)})`}}),
      h('div', {}, h('div.rp-n', {}, CHARS[m].name+' Lv'+p.lv), h('div.bar.hp.thin', {}, h('i', {style:{width:(p.hp/st.hp*100)+'%'}})), h('div.bar.mp.thin', {}, h('i', {style:{width:(p.mp/st.mp*100)+'%'}})))); }));
  return h('div.screen.region', {},
    h('div.r-bg', { style:{backgroundImage:`url(${asset('bg/'+R.bg)})`} }), h('div.r-shade'),
    h('div.r-nodes', {}, ...nodes, ...qs, main),
    topBar(R.name, [btn('闯关', ()=>game.hub(), 'sm'), anyWorld ? btn('山海图', ()=>game.world(), 'sm') : null]),
    h('div.r-desc', {}, R.desc), party,
    S.explore && S.explore.region!==id ? h('div.r-hint', {}, '主线在：'+REGIONS[S.explore.region].name) : null);
}
const rnd = a => a[Math.floor(Math.random()*a.length)];
async function onNode(rid, n){
  if (n.type==='camp') openCamp(rid);
  else if (n.type==='shop') openShop(rid);
  else if (n.type==='battle' || n.type==='elite') {
    const enc = rnd(n.enc);
    if (n.type==='elite' && !(await confirmBox('前方是强大的精英敌人，确定挑战吗？'))) return;
    const r = await game.battle(enc, {});
    if (r.win && n.type==='elite') S.flags['won_'+enc] = true;
    if (r.load) { openMenu('load'); return; }
    game.region(rid);
  } else if (n.type==='gather') { if (gatherNode(n)) game.region(rid); }
}
export function gatherNode(n){
  if (S.gather[n.id]>0) { toast(`这里的资源还未恢复（再战斗 ${S.gather[n.id]} 场）`); return null; }
  const got={}; const k = 2 + Math.floor(Math.random()*3);
  for (let i=0;i<k;i++) { const m=rnd(n.mats); got[m]=(got[m]||0)+1; }
  for (const [m,c] of Object.entries(got)) addItem(m,c);
  S.gather[n.id] = 3; sfx('item');
  return got;
}
