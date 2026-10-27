// v1.1 可行走的横版卷轴探索：视差远景、摇杆/点击移动、NPC、宝箱、采集、明雷敌人（灯斩先手）、秘密、石灯谜题。
import { S, addItem, addGold, stats, ach } from './state.js';
import { REGIONS, REGION_ORDER } from '../data/regions.js';
import { QUESTS } from '../data/quests.js';
import { ITEMS } from '../data/items.js';
import { ENEMIES, ENCOUNTERS } from '../data/enemies.js';
import { CHARS } from '../data/characters.js';
import { LAMP } from '../data/progress.js';
import { h, btn, asset, toast, confirmBox, haptic, tutorial, rewardPop } from './ui.js';
import { playBgm, sfx } from './audio.js';
import { setAmbient, burst, rise } from './fx.js';
import { game } from '../main.js';
import { openMenu, openShop } from '../ui/menu.js';
import { openCamp } from '../ui/camp.js';
import { onQuest, questState, questProgress, gatherNode } from '../ui/screens.js';

const TINT = { jincheng:['#2a1a12','#5a3420','#ff9a4a'], qingqiu:['#0f1d24','#1f3d44','#6fd8ff'], donghai:['#0c1a24','#1d3a4a','#7fe0d0'],
  changyang:['#1c1410','#3a2a1e','#ffb070'], kunlun:['#141a26','#2c3a50','#cfe6ff'], hundun:['#160f20','#2e2240','#c79bff'],
  yugu:['#24100c','#4a2014','#ff7a3a'], beihai:['#0b1520','#1c3048','#9fd8ff'], guixu:['#0a0a18','#1c1a3a','#ffe7a0'] };
const AMB = {jincheng:'embers',qingqiu:'blue',donghai:'stars',changyang:'embers',kunlun:'snow',hundun:'stars',yugu:'embers',beihai:'snow',guixu:'stars'};
const GROUND = 84;           // 地面（视口高 100 单位）
const T = () => window.__ZLJ_TEST;
const imgCache = {};
function img(path){ if (!imgCache[path]) { const i = new Image(); i.src = asset(path); imgCache[path] = i; } return imgCache[path]; }
function npcSprite(name){ return /魂|兵|鬼|灵|影/.test(name) ? 'spr/n_ghost' : /渔|舟|鲛|海/.test(name) ? 'spr/n_fisher' : /老|婆|长老|郎中|匠|翁/.test(name) ? 'spr/n_elder' : 'spr/n_merchant'; }
function hash(s){ let x=2166136261; for (const c of s) { x^=c.charCodeAt(0); x=Math.imul(x,16777619); } return x>>>0; }
function rng(seed){ let s=seed||1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return ((s>>>0)%100000)/100000; }; }
const ELS = ['wood','fire','earth','metal','water']; const ELN = {wood:'木',fire:'火',earth:'土',metal:'金',water:'水'}; const ELC = {wood:'#7ddc6a',fire:'#ff7a3a',earth:'#e0b060',metal:'#e8e8f0',water:'#6fc8ff'};

// —— 布局：把区域节点、支线、宝箱、谜题排成一条可行走的卷轴 ——
function layout(id){
  const R = REGIONS[id]; const ri = REGION_ORDER.indexOf(id); const r = rng(hash(id));
  const ents = []; let x = 46;
  const push = (e, w=46) => { e.x = x; ents.push(e); x += w; return e; };
  push({ k:'exit', name:'山海图', sprite:null, h:0 }, 0); ents[0].x = 14; x = 46;
  const camp = R.nodes.find(n=>n.type==='camp'); if (camp) push({ k:'camp', node:camp, name:camp.name }, 52);
  const shop = R.nodes.find(n=>n.type==='shop'); if (shop) push({ k:'shop', node:shop, name:shop.name, sprite:'spr/o_stall', h:26 }, 50);
  const mixed = [];
  for (const q of Object.values(QUESTS).filter(q=>q.region===id).sort((a,b)=>a.x-b.x)) mixed.push({ k:'quest', q, name:q.giver, sprite:npcSprite(q.giver), h:27 });
  for (const n of R.nodes.filter(n=>n.type==='gather')) mixed.push({ k:'gather', node:n, name:n.name });
  for (const n of R.nodes.filter(n=>n.type==='battle')) n.enc.slice(0,2).forEach((enc,i)=>mixed.push({ k:'foe', node:n, enc, name:n.name, i }));
  mixed.push({ k:'chest', key:id+'_c1', name:'宝箱', sprite:'spr/o_chest', h:12 });
  mixed.push({ k:'chest', key:id+'_c2', name:'荆棘后的宝箱', sprite:'spr/o_chest', h:12, gate:2 });
  mixed.push({ k:'secret', key:id+'_s', name:'微光' });
  for (let i=mixed.length-1;i>0;i--) { const j=Math.floor(r()*(i+1)); [mixed[i],mixed[j]]=[mixed[j],mixed[i]]; }
  // 支线 NPC 不要连着排，敌人前留空地
  for (const e of mixed) push(e, e.k==='foe' ? 60 : 44);
  x += 10; push({ k:'chest', key:id+'_c3', name:'雾中宝箱', sprite:'spr/o_chest', h:12, gate:3 }, 50);
  // 石灯阵（照影）
  const order = ELS.slice(); const start = Math.floor(r()*5); const seq = order.slice(start).concat(order.slice(0,start));
  const shuffled = seq.slice(); for (let i=4;i>0;i--){ const j=Math.floor(r()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
  push({ k:'tablet', name:'石碑', seq, key:id+'_p' }, 26);
  shuffled.forEach((el,i)=>push({ k:'lamp', el, key:id+'_p', name:ELN[el]+'灯', sprite:'spr/o_lamp', h:22 }, 22));
  x += 6; push({ k:'chest', key:id+'_p', name:'石灯宝箱', sprite:'spr/o_chest', h:13, gate:4, puzzle:true }, 56);
  const elite = R.nodes.find(n=>n.type==='elite'); if (elite) push({ k:'foe', node:elite, enc:elite.enc[0], name:elite.name, elite:true }, 70);
  push({ k:'main', name:'主线' }, 40);
  for (const e of ents) e.id = e.k+'_'+Math.round(e.x);
  return { ents, len: x + 30, ri };
}
function chestLoot(id, key, ri){
  const R = REGIONS[id]; const r = rng(hash(key)); const g = R.nodes.find(n=>n.type==='gather');
  const mats = g ? g.mats : ['m_starmarrow']; const big = /_p$|_c3$/.test(key);
  const items = { m_starmarrow: 1 + (big?2:0) + Math.floor(ri/3) };
  const m = mats[Math.floor(r()*mats.length)]; items[m] = (items[m]||0) + 2 + (big?2:0);
  if (/_c3$/.test(key)) items.m_ember = (items.m_ember||0) + 1 + Math.floor(ri/3);
  if (/_p$/.test(key)) { items[ri>=4?'m_goldsand':'m_jade'] = 1 + Math.floor(ri/3); }
  return { gold: Math.round((80 + ri*90) * (big?2.2:1) * (0.9+r()*0.3)), items };
}

export function exploreScreen(id){
  const R = REGIONS[id]; const L = layout(id); const tint = TINT[id] || TINT.jincheng;
  playBgm(R.bgm); setAmbient(AMB[id]);
  const cv = h('canvas.ex-cv'); const ctx = cv.getContext('2d');
  const st = { x: S.pos?.[id] ?? 30, vx:0, face:1, t:0, walk:0, trail:[], target:null, joy:null, keys:{}, busy:false, cam:0, near:null, defeated:new Set(), aggro:null, lastHud:0, lit:[] };
  if (S.explore?.region===id && S.pos?.[id]==null) st.x = 30;
  const ents = L.ents.filter(e => !(e.k==='main' && S.explore?.region!==id));
  const foes = ents.filter(e=>e.k==='foe');
  for (const e of foes) { e.home = e.x; e.dir = -1; e.ex = e.x; }
  // —— HUD ——
  const obj = h('div.ex-obj'); const mm = h('div.ex-mm', {}, h('i.mm-track')); const hint = h('div.ex-hint');
  const actBtn = h('button.ex-act', { onpointerdown:(e)=>{ e.stopPropagation(); interact(); } }, h('span.g', {}, '✋'), h('span.t', {}, '交互'));
  const atkBtn = h('button.ex-atk', { onpointerdown:(e)=>{ e.stopPropagation(); lampStrike(); } }, h('span.g', {}, '⚔'), h('span.t', {}, '灯斩'));
  const joyBase = h('div.ex-joy', {}, h('div.ex-knob'));
  const gold = h('span.ex-gold'); const lampB = h('button.ex-lamp', { onclick:()=>lampInfo() });
  const faces = h('div.ex-faces');
  const root = h('div.screen.explore', {}, cv,
    h('div.ex-top', {},
      h('div.ex-tl', {}, h('div.ex-region', {}, R.name), obj),
      mm,
      h('div.ex-tr', {}, faces, gold, lampB, btn('山海图', ()=>game.world(), 'sm ic-map'), btn('菜单', ()=>openMenu(), 'sm ic-menu'))),
    joyBase, hint, actBtn, atkBtn);
  // —— 尺寸 ——
  let W=0, H=0, U=1, dpr=1;
  function resize(){ dpr = Math.min(2, devicePixelRatio||1); W = root.clientWidth||innerWidth; H = root.clientHeight||innerHeight; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); U = cv.height/100; buildLayers(); }
  const viewW = () => cv.width / U;   // 视口宽（单位）
  // 远山图层（预渲染）
  let ridge = null, ridge2 = null;
  function buildLayers(){
    const r = rng(hash(id+'r')); const w = Math.round(cv.width*2.2), hgt = cv.height;
    const mk = (amp, base, col, alpha, seedMul) => { const c = document.createElement('canvas'); c.width=w; c.height=hgt; const g=c.getContext('2d');
      const grd = g.createLinearGradient(0, hgt*base-amp*hgt, 0, hgt); grd.addColorStop(0, col); grd.addColorStop(1, '#05050a');
      g.fillStyle = grd; g.globalAlpha = alpha; g.beginPath(); g.moveTo(0, hgt);
      let y = hgt*base; const N = 60; const pts=[]; for (let i=0;i<=N;i++){ y = hgt*base - (Math.sin(i*0.7*seedMul + r()*2)*0.5+0.5)*amp*hgt - r()*amp*hgt*0.4; pts.push([i/N*w, y]); }
      for (let i=0;i<pts.length;i++){ const [px,py]=pts[i]; if (!i) g.lineTo(px,py); else { const [qx,qy]=pts[i-1]; g.quadraticCurveTo(qx, qy, (px+qx)/2, (py+qy)/2); } }
      g.lineTo(w, hgt); g.closePath(); g.fill();
      // 墨迹纹理
      g.globalAlpha = alpha*0.25; g.strokeStyle = 'rgba(255,255,255,.12)'; for (let i=0;i<40;i++){ const px=r()*w, py=hgt*base+r()*hgt*0.3; g.beginPath(); g.moveTo(px,py); g.lineTo(px+20+r()*60, py+4+r()*10); g.stroke(); }
      return c; };
    ridge = mk(0.22, 0.72, tint[1], 0.85, 1); ridge2 = mk(0.12, 0.84, tint[0], 1, 1.7);
  }
  // —— 输入 ——
  function setKey(e, v){ const k = e.key.toLowerCase(); if (['arrowleft','a'].includes(k)) st.keys.l=v; if (['arrowright','d'].includes(k)) st.keys.r=v; if (v && (k==='e'||k===' '||k==='enter')) interact(); if (v && k==='f') lampStrike(); }
  const kd = e => { if (!root.isConnected) return; if (busy()) return; setKey(e, true); }, ku = e => setKey(e, false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  cv.addEventListener('pointerdown', e => {
    if (busy()) return; const rx = e.clientX / W;
    if (rx < 0.42 && e.clientY > H*0.35) { st.joy = { id:e.pointerId, x0:e.clientX, y0:e.clientY, dx:0 }; joyBase.style.left=(e.clientX-50)+'px'; joyBase.style.top=(e.clientY-50)+'px'; joyBase.classList.add('on'); cv.setPointerCapture(e.pointerId); st.target=null; return; }
    // 点击实体或地面 → 走过去
    const wx = st.cam + e.clientX*dpr/U; const wy = e.clientY*dpr/U;
    let hit = null; for (const en of ents) { if (en.gone) continue; const hh = (en.h||20); if (Math.abs((en.ex??en.x) - wx) < 9 + hh*0.2 && wy > GROUND-hh-6 && wy < GROUND+4) hit = en; }
    st.target = { x: hit ? (hit.ex ?? hit.x) - 8*Math.sign((hit.ex??hit.x)-st.x || 1) : wx, ent: hit && hit.k!=='foe' ? hit : null };
  });
  cv.addEventListener('pointermove', e => { if (st.joy && e.pointerId===st.joy.id) { const dx = Math.max(-46, Math.min(46, e.clientX-st.joy.x0)); st.joy.dx = dx/46; joyBase.firstChild.style.transform = `translateX(${dx}px)`; } });
  const up = e => { if (st.joy && e.pointerId===st.joy.id) { st.joy=null; joyBase.classList.remove('on'); joyBase.firstChild.style.transform=''; } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  function busy(){ return st.busy || !!document.querySelector('.screen.bt, .panel-wrap, .tut, .reward, .confirm'); }
  // —— 交互 ——
  function nearest(){ let best=null, bd=15; for (const e of ents) { if (e.gone || e.k==='foe') continue; const d = Math.abs((e.ex??e.x) - st.x); if (d < bd && available(e)) { bd=d; best=e; } } return best; }
  function available(e){ if (e.k==='secret') return !S.chests[e.key]; if (e.k==='chest') return !S.chests[e.key]; return true; }
  function label(e){
    if (!e) return '';
    switch (e.k) {
      case 'camp': return '营火 · 休整'; case 'shop': return '商店'; case 'exit': return '山海图';
      case 'quest': { const s=questState(e.q); if (!S.flags[e.q.unlock]) return '交谈'; return s==='new'?'接受委托':s==='ready'?'回报委托':s==='done'?'交谈':'询问进度'; }
      case 'gather': return S.gather[e.node.id]>0 ? `采集（${S.gather[e.node.id]}战后恢复）` : '采集';
      case 'chest': return e.gate===2 && !S.chests[e.key+'_thorn'] ? (S.lamp>=2?'焚棘':'荆棘挡路') : e.gate===3 && S.lamp<3 ? '幽雾太浓' : e.gate===4 && !S.puzzles[e.key] ? '石灯未亮' : '开启宝箱';
      case 'secret': return '拾取微光'; case 'tablet': return '阅读石碑'; case 'lamp': return S.puzzles[e.key] ? '已点亮' : S.lamp>=4 ? '点灯 · '+ELN[e.el] : '石灯（需照影）';
      case 'main': return '继续主线 · '+(S.explore?.name||'');
    }
    return '';
  }
  async function interact(){
    if (busy()) return; const e = st.near; if (!e) { sfx('click'); return; }
    st.keys = {}; st.target = null; sfx('click'); haptic('light');
    S.pos[id] = st.x;
    switch (e.k) {
      case 'exit': game.world(); return;
      case 'camp': openCamp(id); return;
      case 'shop': openShop(id); return;
      case 'quest': if (!S.flags[e.q.unlock]) { toast(`${e.q.giver}：「……旅人，今天的风好冷。」`); return; } if (questState(e.q)==='done') { toast(`${e.q.giver}向你点头致意：「多谢你了。」`); return; } onQuest(e.q); return;
      case 'main': sfx('bell'); S.pos[id] = null; game.continueMain(); return;
      case 'gather': { const got = gatherNode(e.node); if (got) { rise(...scr(e.x, GROUND-6)); await rewardPop('采集', Object.entries(got).map(([m,c])=>({ icon:ITEMS[m].icon, name:ITEMS[m].name, n:c }))); } return; }
      case 'secret': { S.chests[e.key]=true; const ri=L.ri; const g = 60+ri*50; addGold(g); addItem('m_starmarrow',1); sfx('item'); rise(...scr(e.x, GROUND-10), '#fff3b0', 30);
        ach('secret'); await rewardPop('发现秘密', [{ glyph:'✦', name:'星砂', n:g }, { icon:ITEMS.m_starmarrow.icon, name:ITEMS.m_starmarrow.name, n:1 }]); return; }
      case 'tablet': { const p = h('div'); toast('石碑：'+riddle(e.seq), 'long'); if (S.lamp<4) toast('石灯需要「四阶·照影」的灯火才能点亮。'); return; }
      case 'lamp': return lightLamp(e);
      case 'chest': return openChest(e);
    }
  }
  function riddle(seq){ const W={wood:'青木',fire:'赤火',earth:'黄土',metal:'白金',water:'玄水'}; return `「${W[seq[0]]}为始，循相生之序，五灯相续，宝匣自开。」`; }
  async function lightLamp(e){
    if (S.puzzles[e.key]) return; if (S.lamp<4) { toast('石灯沉睡着。也许更亮的灯火（照影）能唤醒它。'); return; }
    const tab = ents.find(x=>x.k==='tablet' && x.key===e.key); const want = tab.seq[st.lit.length];
    if (e.lit) return;
    if (e.el===want) { e.lit = true; st.lit.push(e.el); sfx('bell'); haptic('medium'); burst(...scr(e.x, GROUND-18), ELC[e.el], 24, 4);
      if (st.lit.length===5) { S.puzzles[e.key]=true; sfx('ach'); haptic('success'); toast('五灯相续——石匣开启了！', 'good'); ach('puzzle'); } }
    else { sfx('debuff'); haptic('warn'); toast(`${ELN[e.el]}灯一闪即灭……顺序不对。`); for (const x of ents) if (x.k==='lamp' && x.key===e.key) x.lit=false; st.lit=[]; }
  }
  async function openChest(e){
    if (S.chests[e.key]) return;
    if (e.gate===2 && !S.chests[e.key+'_thorn']) {
      if (S.lamp<2) { toast('紫荆棘缠住了宝箱。需要灯具「二阶·焚棘」（营地升级）。'); return; }
      S.chests[e.key+'_thorn']=true; sfx('fire'); haptic('medium'); burst(...scr(e.x, GROUND-10), '#ff8a3a', 40, 5); toast('灯火烧开了荆棘。'); return;
    }
    if (e.gate===3 && S.lamp<3) { toast('幽雾里似乎藏着什么，但灯火照不透。需要「三阶·破雾」。'); return; }
    if (e.gate===4 && !S.puzzles[e.key]) { toast('石匣紧闭。石碑上的谜题也许是钥匙。'); return; }
    const loot = chestLoot(id, e.key, L.ri); S.chests[e.key]=true; addGold(loot.gold); for (const [m,c] of Object.entries(loot.items)) addItem(m,c);
    S.stats.chests=(S.stats.chests||0)+1; if (S.stats.chests>=20) ach('chest20');
    sfx('item'); haptic('success'); burst(...scr(e.x, GROUND-8), '#ffd76a', 36, 5);
    await rewardPop(e.name, [{ glyph:'✦', name:'星砂', n:loot.gold }, ...Object.entries(loot.items).map(([m,c])=>({ icon:ITEMS[m].icon, name:ITEMS[m].name, n:c }))]);
  }
  async function lampStrike(){
    if (busy() || st.strike>0) return; st.strike = 0.35; sfx('slash'); haptic('light');
    const f = foes.find(f => !st.defeated.has(f) && Math.abs(f.ex - (st.x + st.face*10)) < 16);
    if (f) { haptic('heavy'); burst(...scr(f.ex, GROUND-14), '#ffe7a0', 30, 6); await fight(f, 'player'); }
  }
  async function fight(f, amb){
    if (st.busy) return; st.busy = true; st.keys={}; st.joy=null; joyBase.classList.remove('on'); st.target=null;
    if (f.elite && !(await confirmBox(`「${f.name}」盘踞着强大的精英敌人，确定挑战吗？`))) { st.busy=false; st.x -= 14*Math.sign(f.ex-st.x||1); return; }
    S.pos[id] = st.x;
    const r = await game.battle(f.enc, { ambush: amb, elite: !!f.elite, lampStun: amb==='player' && S.lamp>=4 });
    st.busy = false;
    if (r.load) { openMenu('load'); return; }
    if (r.win) { st.defeated.add(f); if (f.elite) S.flags['won_'+f.enc] = true; }
    else { st.x = Math.max(20, f.ex - 30); f.ex = f.home; }
    refreshHud(true);
  }
  function lampInfo(){ const Lp = LAMP[S.lamp]; toast(`灯具 ${Lp.name}：${Lp.desc}` + (LAMP[S.lamp+1] ? `　下一阶「${LAMP[S.lamp+1].name}」可在营火处升级。` : ''), 'long'); }
  const scr = (wx, wy) => [ (wx - st.cam)*U/dpr, wy*U/dpr ];
  // —— HUD 刷新 ——
  function refreshHud(force){
    gold.textContent = '✦ '+S.gold; lampB.textContent = '灯 '+['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'][S.lamp];
    if (force || !faces.childElementCount) faces.replaceChildren(...S.formation.map(m=>{ const s=stats(m); const p=S.party[m]; return h('div.ex-face', { onclick:()=>openMenu('party'), style:{'--hp':(p.hp/s.hp*100)+'%', backgroundImage:`url(${asset('por/'+m)})`} }); }));
    const lines = [];
    if (S.explore) lines.push(S.explore.region===id ? h('div.ob.main', {}, h('b', {}, '主线'), ` ${S.explore.name}`, h('em', {}, '→ 向前')) : h('div.ob.main', {}, h('b', {}, '主线'), ` 前往「${REGIONS[S.explore.region].name.split('·')[0]}」`, h('em', {}, '山海图')));
    for (const q of Object.values(QUESTS).filter(q=>q.region===id && S.flags[q.unlock] && S.quests[q.id] && S.quests[q.id]!=='done').slice(0,2)) {
      const s = questState(q); lines.push(h('div.ob'+(s==='ready'?'.ready':''), {}, h('b', {}, s==='ready'?'回报':'支线'), ` ${q.name}`, h('em', {}, s==='ready' ? q.giver : questProgress(q))));
    }
    const newQ = Object.values(QUESTS).filter(q=>q.region===id && S.flags[q.unlock] && !S.quests[q.id]).length;
    if (newQ && lines.length<3) lines.push(h('div.ob.new', {}, h('b', {}, '委托'), ` 此地有 ${newQ} 位委托人`));
    if (!lines.length) lines.push(h('div.ob', {}, h('b', {}, '探索'), ' 寻找宝箱与秘密'));
    obj.replaceChildren(...lines);
    // 小地图
    const track = mm.firstChild; track.replaceChildren(...ents.filter(e=>!e.gone && e.k!=='lamp').map(e=>{
      const cls = e.k==='foe' ? (st.defeated.has(e)?'':'m-foe'+(e.elite?'.m-elite':'')) : e.k==='quest' ? 'm-q.m-'+questState(e.q) : e.k==='chest' ? (S.chests[e.key]?'':'m-chest') : e.k==='main' ? 'm-main' : e.k==='camp' ? 'm-camp' : '';
      return cls ? h('i.mm.'+cls, { style:{left:(e.x/L.len*100)+'%'} }) : null; }).filter(Boolean), h('i.mm.m-me', { style:{left:(st.x/L.len*100)+'%'} }));
  }
  // —— 主循环 ——
  let last = performance.now(), frame = 0, raf = 0;
  function loop(now){
    if (!root.isConnected) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('resize', resize); return; }
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now-last)/1000); last = now; st.t += dt; frame++;
    if (document.querySelector('.screen.bt')) return;   // 战斗中暂停渲染
    update(dt); draw();
    if (frame % 20 === 0) { st.near = nearest(); const lb = label(st.near); actBtn.classList.toggle('on', !!st.near); actBtn.lastChild.textContent = st.near ? (lb.match(/（(.+)）/)?.[1] || lb.split(' · ')[0]).slice(0,5) : '交互';
      hint.textContent = st.near ? lb : ''; hint.classList.toggle('on', !!st.near);
      mm.querySelector('.mm.m-me')?.style.setProperty('left', (st.x/L.len*100)+'%'); }
    if (frame % 90 === 0) refreshHud();
  }
  function update(dt){
    const b = busy();
    let mv = 0;
    if (!b) { if (st.keys.l) mv -= 1; if (st.keys.r) mv += 1; if (st.joy) mv = Math.abs(st.joy.dx) > 0.15 ? st.joy.dx : 0;
      if (!mv && st.target) { const d = st.target.x - st.x; if (Math.abs(d) < 1.5) { const en = st.target.ent; st.target = null; if (en) { st.near = en; interact(); } } else mv = Math.sign(d); } }
    const speed = 46; st.vx = mv * speed; st.x = Math.max(8, Math.min(L.len-10, st.x + st.vx*dt));
    if (mv) { st.face = mv>0?1:-1; st.walk += dt*Math.abs(mv)*9; } else st.walk *= 0.8;
    st.trail.unshift(st.x); if (st.trail.length > 90) st.trail.pop();
    if (st.strike>0) st.strike -= dt;
    // 摄像机
    const vw = viewW(); const tgt = Math.max(0, Math.min(L.len - vw, st.x - vw*0.42 + st.face*vw*0.06)); st.cam += (tgt - st.cam) * Math.min(1, dt*4);
    // 敌人巡逻/追击
    for (const f of foes) { if (st.defeated.has(f)) continue;
      const d = st.x - f.ex; const sees = Math.abs(d) < (f.elite?0:34) && !b;
      if (sees) { f.ex += Math.sign(d)*26*dt; f.alert = Math.min(1,(f.alert||0)+dt*3); }
      else { f.alert = Math.max(0,(f.alert||0)-dt); f.ex += f.dir*8*dt; if (Math.abs(f.ex-f.home) > 18) f.dir *= -1; }
      if (!b && Math.abs(st.x - f.ex) < (f.elite?10:7)) { haptic('heavy'); fight(f, f.elite ? null : 'enemy'); break; }
    }
  }
  function sprite(path, wx, hU, opt={}){
    const im = img(path); if (!im.complete || !im.naturalWidth) return;
    const hpx = hU*U, wpx = hpx*im.naturalWidth/im.naturalHeight; const sx = (wx - st.cam)*U; const by = (opt.y ?? GROUND)*U;
    if (sx < -wpx || sx > cv.width + wpx) return;
    ctx.save(); ctx.translate(sx, by); if (opt.flip) ctx.scale(-1,1); if (opt.sq) ctx.scale(1+opt.sq, 1-opt.sq);
    if (opt.alpha!=null) ctx.globalAlpha = opt.alpha; if (opt.filter) ctx.filter = opt.filter;
    ctx.drawImage(im, -wpx/2, -hpx, wpx, hpx); ctx.restore();
  }
  function shadow(wx, w){ const sx=(wx-st.cam)*U; ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(sx, GROUND*U, w*U, w*U*0.22, 0, 0, Math.PI*2); ctx.fill(); }
  function text(s, wx, wy, col='#f3e6c8', size=13){ const sx=(wx-st.cam)*U; ctx.font = `${size*dpr}px "ZLJ Wenkai",serif`; ctx.textAlign='center'; ctx.lineWidth=3*dpr; ctx.strokeStyle='rgba(0,0,0,.75)'; ctx.strokeText(s, sx, wy*U); ctx.fillStyle=col; ctx.fillText(s, sx, wy*U); }
  function glow(wx, wy, r, col, a=1){ const sx=(wx-st.cam)*U, sy=wy*U; const g=ctx.createRadialGradient(sx,sy,0,sx,sy,r*U); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.globalAlpha=a; ctx.fillStyle=g; ctx.fillRect(sx-r*U, sy-r*U, r*2*U, r*2*U); ctx.globalAlpha=1; }
  function marker(wx, wy, ch, col){ const sx=(wx-st.cam)*U, sy=(wy + Math.sin(st.t*3)*1.2)*U; ctx.font=`bold ${22*dpr}px "ZLJ Title",serif`; ctx.textAlign='center'; ctx.lineWidth=4*dpr; ctx.strokeStyle='rgba(0,0,0,.8)'; ctx.strokeText(ch, sx, sy); ctx.fillStyle=col; ctx.fillText(ch, sx, sy); }
  function draw(){
    const cw = cv.width, ch = cv.height; ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = tint[0]; ctx.fillRect(0,0,cw,ch);
    // 远景
    const bg = img('bg/'+R.bg);
    if (bg.complete && bg.naturalWidth) { const bh = ch*1.0, bw = bh*bg.naturalWidth/bg.naturalHeight; const need = cw + (L.len*U - cw)*0.15; const s = Math.max(1, need/bw);
      ctx.globalAlpha = 0.9; ctx.drawImage(bg, -st.cam*U*0.15, ch - bh*s*0.98, bw*s, bh*s); ctx.globalAlpha = 1; }
    const sky = ctx.createLinearGradient(0,0,0,ch); sky.addColorStop(0,'rgba(0,0,0,.15)'); sky.addColorStop(0.6,'rgba(0,0,0,0)'); ctx.fillStyle=sky; ctx.fillRect(0,0,cw,ch);
    if (ridge) { const off = -(st.cam*U*0.4) % ridge.width; ctx.drawImage(ridge, off, 0); ctx.drawImage(ridge, off+ridge.width, 0);
      const off2 = -(st.cam*U*0.7) % ridge2.width; ctx.drawImage(ridge2, off2, 0); ctx.drawImage(ridge2, off2+ridge2.width, 0); }
    // 地面
    const gy = GROUND*U; const gg = ctx.createLinearGradient(0, gy-2*U, 0, ch); gg.addColorStop(0, tint[1]); gg.addColorStop(0.08, '#0d0c12'); gg.addColorStop(1, '#050508');
    ctx.fillStyle = gg; ctx.fillRect(0, gy-1.2*U, cw, ch-gy+1.2*U);
    ctx.strokeStyle = tint[2]; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.2*dpr; ctx.beginPath(); ctx.moveTo(0, gy-1.2*U); ctx.lineTo(cw, gy-1.2*U); ctx.stroke(); ctx.globalAlpha = 1;
    // 地面石纹
    ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let i=Math.floor(st.cam/9)-1;i<(st.cam+viewW())/9+1;i++){ const r=((i*9301+49297)%233280)/233280; ctx.fillRect((i*9-st.cam)*U, gy + (2+r*10)*U, (3+r*6)*U, 0.5*U); }
    // 实体
    const ord = ents.slice().sort((a,b)=>(a.k==='foe'?1:0)-(b.k==='foe'?1:0));
    for (const e of ord) drawEnt(e);
    // 同伴（拖尾跟随）
    const fol = S.formation.slice(1); st.fol = st.fol || fol.map((_,i)=>st.x - st.face*13*(i+1));
    for (let i=fol.length-1;i>=0;i--){ const lead = i ? st.fol[i-1] : st.x; let fx = st.fol[i]; const d = fx - lead; if (Math.abs(d) > 13) fx = lead + Math.sign(d)*13; else if (!st.vx && Math.abs(d) < 9) fx += Math.sign(d||-st.face)*0.15; st.fol[i] = fx;
      const fface = lead >= fx ? 1 : -1; const bob = st.vx ? Math.abs(Math.sin(st.walk + i*1.3))*0.8 : 0;
      shadow(fx, 3.5); sprite('spr/p_'+fol[i], fx, 25, { flip: (fface<0) !== (fol[i]==='yangui'), y: GROUND - bob, alpha: 0.95 }); }
    // 玩家
    const bob = Math.abs(Math.sin(st.walk))*1.2; shadow(st.x, 5);
    sprite('spr/p_'+S.formation[0], st.x, 29, { flip: (st.face<0) !== (S.formation[0]==='yangui'), y: GROUND - bob, sq: st.vx ? Math.sin(st.walk*2)*0.015 : Math.sin(st.t*2)*0.008 });
    glow(st.x + st.face*3, GROUND-16, 7+S.lamp, 'rgba(255,214,140,.55)', 0.8);
    if (st.strike>0) { const sx=(st.x + st.face*10 - st.cam)*U, sy=(GROUND-14)*U; ctx.save(); ctx.translate(sx,sy); ctx.scale(st.face,1); ctx.strokeStyle='rgba(255,231,160,'+(st.strike/0.35)+')'; ctx.lineWidth=4*dpr; ctx.beginPath(); ctx.arc(0,0,14*U*(1.2-st.strike), -1.2, 1.2); ctx.stroke(); ctx.restore(); }
    // 暗夜与灯光
    lighting();
    // 前景草
    ctx.fillStyle = 'rgba(4,4,8,.92)'; for (let i=Math.floor(st.cam*1.25/23)-1; i<(st.cam*1.25+viewW())/23+1; i++){ const r=((i*7919+104729)%1000)/1000; const sx=(i*23 - st.cam*1.25)*U; const hgt=(4+r*7)*U;
      ctx.beginPath(); ctx.moveTo(sx, ch); for (let k=0;k<5;k++){ ctx.quadraticCurveTo(sx+(k*3+1.5)*U+Math.sin(st.t+i+k)*0.6*U, ch-hgt*(0.6+((k*37+i)%5)/10), sx+(k*3+3)*U, ch); } ctx.fill(); }
  }
  let darkC = null;
  function lighting(){
    const cw = cv.width, ch = cv.height; const q = 4;
    if (!darkC || darkC.width !== Math.ceil(cw/q)) { darkC = document.createElement('canvas'); darkC.width=Math.ceil(cw/q); darkC.height=Math.ceil(ch/q); }
    const g = darkC.getContext('2d'); g.globalCompositeOperation='source-over'; g.clearRect(0,0,darkC.width,darkC.height);
    g.fillStyle = 'rgba(4,4,12,'+(0.5 - S.lamp*0.04)+')'; g.fillRect(0,0,darkC.width,darkC.height);
    g.globalCompositeOperation = 'destination-out';
    const hole = (wx, wy, r) => { const sx=(wx-st.cam)*U/q, sy=wy*U/q, rr=r*U/q; const gr=g.createRadialGradient(sx,sy,0,sx,sy,rr); gr.addColorStop(0,'rgba(0,0,0,1)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(sx-rr,sy-rr,rr*2,rr*2); };
    hole(st.x, GROUND-14, 34 + S.lamp*7);
    for (const e of ents) { if (e.k==='camp') hole(e.x, GROUND-8, 40); if (e.k==='main') hole(e.x, GROUND-20, 30); if (e.k==='lamp' && (e.lit||S.puzzles[e.key])) hole(e.x, GROUND-18, 18); }
    ctx.drawImage(darkC, 0, 0, cw, ch);
  }
  function drawEnt(e){
    const vw = viewW(); const ex = e.ex ?? e.x; if (ex < st.cam - 40 || ex > st.cam + vw + 40) return;
    const near = st.near === e;
    switch (e.k) {
      case 'exit': { const sx=(e.x-st.cam)*U; ctx.fillStyle='#2a2630'; ctx.fillRect(sx-2*U, (GROUND-20)*U, 4*U, 20*U); ctx.fillStyle='#3b3442'; ctx.fillRect(sx-9*U,(GROUND-19)*U,18*U,6*U); text('← 山海图', e.x, GROUND-15, '#e8d7b0', 12); break; }
      case 'camp': { shadow(e.x, 8); const sx=(e.x-st.cam)*U, gy=GROUND*U; ctx.fillStyle='#3a2414'; ctx.save(); ctx.translate(sx, gy-0.8*U); ctx.rotate(0.25); ctx.fillRect(-6*U,-1*U,12*U,2*U); ctx.rotate(-0.5); ctx.fillRect(-6*U,-1*U,12*U,2*U); ctx.restore();
        for (let i=0;i<3;i++){ const fl = 6 + Math.sin(st.t*9+i*2)*1.5 + i; glow(e.x + (i-1)*1.4, GROUND-3-i, fl*0.7, i? 'rgba(255,140,40,.9)' : 'rgba(255,230,150,1)'); }
        glow(e.x, GROUND-6, 26, 'rgba(255,150,60,.22)'); if (Math.random()<0.25) rise(sx/dpr, (GROUND-6)*U/dpr, '#ffb35a', 1);
        text(e.name, e.x, GROUND-17, '#ffd890'); break; }
      case 'shop': sprite(e.sprite, e.x, e.h); text(e.name, e.x, GROUND-e.h-2); break;
      case 'quest': { const s = questState(e.q); sprite(e.sprite, e.x, e.h, { flip: st.x > e.x ? false : true, sq: Math.sin(st.t*1.6+e.x)*0.01 });
        text(e.name, e.x, GROUND-e.h-2, '#f3e6c8', 12);
        if (S.flags[e.q.unlock] && s!=='done') marker(e.x, GROUND-e.h-6, s==='new'?'!':s==='ready'?'?':'…', s==='new'?'#ffd34a':s==='ready'?'#7dff9a':'#a8a8b8');
        break; }
      case 'gather': { const cd = S.gather[e.node.id]>0; const sx=(e.x-st.cam)*U, gy=GROUND*U;
        ctx.fillStyle = cd ? '#2a3a2a' : '#3f7a4a'; for (let k=0;k<7;k++){ ctx.beginPath(); ctx.ellipse(sx+(k-3)*1.6*U, gy-2*U, 0.8*U, (3+(k%3))*U, (k-3)*0.25, 0, Math.PI*2); ctx.fill(); }
        if (!cd) { glow(e.x, GROUND-4, 7, 'rgba(160,255,190,.5)', 0.6+Math.sin(st.t*3)*0.3); for (let k=0;k<3;k++){ const a=st.t*1.5+k*2.1; glow(e.x+Math.cos(a)*4, GROUND-6+Math.sin(a*1.3)*3, 1.2, 'rgba(220,255,220,1)'); } }
        text(e.node.name, e.x, GROUND-11, cd?'#8a8a90':'#c8ffd8', 12); break; }
      case 'foe': { if (st.defeated.has(e)) break; const d = ENEMIES[ENC_LEAD(e.enc)] || {}; const hU = e.elite ? 40 : 25; const by = GROUND - (d.fly?6:0) - Math.abs(Math.sin(st.t*2.4+e.home))*1.2;
        shadow(e.ex, e.elite?9:6); if (d.img) sprite(d.img, e.ex, hU, { y: by, flip: st.x > e.ex, filter: e.elite ? 'drop-shadow(0 0 6px rgba(255,60,40,.8))' : 'none' });
        if (e.alert>0.3) marker(e.ex, GROUND-hU-3, '!', '#ff5a3a'); else text(e.elite ? '精英 · '+(d.name||'') : (d.name||''), e.ex, GROUND-hU-1, e.elite?'#ff9a7a':'#e8c8c0', 12); break; }
      case 'chest': { const opened = S.chests[e.key]; const mist = e.gate===3 && S.lamp<3;
        if (e.gate===4 && !S.puzzles[e.key] && !opened) { sprite('spr/o_chest', e.x, e.h, { alpha:0.35, filter:'grayscale(1)' }); text('石匣', e.x, GROUND-e.h-2, '#9a9aa8', 12); break; }
        sprite(opened ? 'spr/o_chest_open' : 'spr/o_chest', e.x, e.h, { alpha: mist ? 0.25 : 1 });
        if (!opened && !mist) glow(e.x, GROUND-6, 9, 'rgba(255,215,110,.5)', 0.5+Math.sin(st.t*2.5)*0.25);
        if (e.gate===2 && !S.chests[e.key+'_thorn']) sprite('spr/o_thorn', e.x, 22);
        if (mist) for (let k=0;k<6;k++){ const a = st.t*0.3+k; glow(e.x + Math.sin(a)*14 + (k-3)*6, GROUND-8-Math.cos(a*0.7)*5, 16, 'rgba(150,160,200,.45)'); }
        if (!opened && near) text(e.name, e.x, GROUND-e.h-3, '#ffe3a0', 12); break; }
      case 'secret': if (S.chests[e.key]) break; { const dd = Math.abs(st.x - e.x); if (dd < 36) { const a = 1 - dd/36; glow(e.x, GROUND-9 + Math.sin(st.t*2)*1.5, 4, 'rgba(255,250,210,1)', a); glow(e.x, GROUND-9, 10, 'rgba(255,240,170,.4)', a*0.7); } } break;
      case 'tablet': { const sx=(e.x-st.cam)*U, gy=GROUND*U; ctx.fillStyle='#24222c'; ctx.beginPath(); ctx.moveTo(sx-5*U, gy); ctx.lineTo(sx-4.5*U, gy-15*U); ctx.quadraticCurveTo(sx, gy-18*U, sx+4.5*U, gy-15*U); ctx.lineTo(sx+5*U, gy); ctx.fill();
        ctx.strokeStyle='rgba(226,191,110,.5)'; ctx.lineWidth=1*dpr; for (let k=0;k<4;k++){ ctx.beginPath(); ctx.moveTo(sx-2.5*U+k*1.6*U, gy-13*U); ctx.lineTo(sx-2.5*U+k*1.6*U, gy-4*U); ctx.stroke(); }
        if (near) text('石碑', e.x, GROUND-20, '#e8d7b0', 12); break; }
      case 'lamp': { const on = e.lit || S.puzzles[e.key]; sprite(on ? 'spr/o_lamp_lit' : 'spr/o_lamp', e.x, e.h);
        if (on) glow(e.x, GROUND-e.h+5, 9, ELC[e.el], 0.55+Math.sin(st.t*4+e.x)*0.15);
        text(ELN[e.el], e.x, GROUND-e.h-2, ELC[e.el], 14); break; }
      case 'main': { const sx=(e.x-st.cam)*U; const gr = ctx.createLinearGradient(sx-6*U,0,sx+6*U,0); gr.addColorStop(0,'rgba(255,215,120,0)'); gr.addColorStop(0.5,'rgba(255,225,150,.55)'); gr.addColorStop(1,'rgba(255,215,120,0)');
        ctx.fillStyle = gr; ctx.fillRect(sx-6*U, 0, 12*U, GROUND*U); glow(e.x, GROUND-2, 14, 'rgba(255,220,140,.7)');
        ctx.save(); ctx.translate(sx, (GROUND-24+Math.sin(st.t*2)*1.5)*U); ctx.rotate(Math.PI/4 + st.t*0.6); ctx.strokeStyle='#ffe7a0'; ctx.lineWidth=2.5*dpr; ctx.strokeRect(-3*U,-3*U,6*U,6*U); ctx.restore();
        text('主线 · '+(S.explore?.name||''), e.x, GROUND-32, '#ffe7a0', 14); break; }
    }
  }
  function ENC_LEAD(enc){ return ENCOUNTERS[enc]?.foes[0][0]; }
  // —— 测试钩子 ——
  window.__ex = {
    list: () => ents.map((e,i)=>({ i, k:e.k, x:Math.round(e.ex??e.x), name:e.name, label:label(e), q:e.q?.id, qs:e.q?questState(e.q):null, opened:!!(e.key && S.chests[e.key]), gone: e.k==='foe' && st.defeated.has(e), elite:!!e.elite, el:e.el })),
    go: (i) => { const e = ents[i]; st.x = (e.ex??e.x) - 6; st.cam = Math.max(0, st.x - viewW()*0.4); st.near = (e.k==='foe') ? null : e; },
    act: (i) => { window.__ex.go(i); const e = ents[i]; if (e.k==='foe') return fight(e, 'player'); st.near = e; return interact(); },
    get x(){ return st.x; }, len: L.len,
  };
  requestAnimationFrame(()=>{ resize(); refreshHud(true); raf = requestAnimationFrame(loop);
    tutorial('explore', [
      { sel:'.ex-joy-hint', text:'按住屏幕左侧拖动来行走；也可以直接点击远处的人或物，角色会自己走过去。' },
      { sel:'.ex-obj', text:'左上角是目标追踪：主线、支线进度都在这里。小地图上能看到宝箱、委托人和敌人。' },
      { sel:'.ex-atk', text:'敌人在场景里游荡。用「灯斩」从背后先手，我方将抢先行动；被敌人撞上则会遭到偷袭。' },
      { sel:'.ex-act', text:'靠近人或物时，按「交互」。宝箱、采集点、隐藏的微光……都值得找一找。' },
    ], S.flags);
  });
  addEventListener('resize', resize);
  root.append(h('div.ex-joy-hint', {}, h('i'), '拖动行走'));
  return root;
}
