import './style.css';
import './theme.css';
import './battle.css';
import './explore.css';
import './action.css';
import './hub.css';
import './premium.css';
import './improvements.css';
import { addMember, healAll, S, settings, meta, saveMeta, newGame, setToast, load, save, AUTO, ach, slotInfo, SAVE_SLOTS } from './engine/state.js';
import { initAudio, playBgm, stopBgm } from './engine/audio.js';
import { h, toast, asset, confirmBox } from './engine/ui.js';
import { vnScreen, runMain, restoreScene, hooks, stopVN, clearBacklog, STORY } from './engine/vn.js';
import { battle } from './engine/battle.js';
import { titleScreen, worldScreen, regionScreen } from './ui/screens.js';
import { exploreScreen } from './engine/explore.js';
import { openMenu } from './ui/menu.js';
import { hubScreen, launch, adventureScreen, stageDetail } from './ui/hub.js';
import { STAGES, SIGNATURE_IDS } from './action/stages.js';
import { ensureAct } from './action/progress.js';
import { endingScreen } from './ui/ending.js';
import { setAmbient, ensureDust } from './engine/fx.js';
import { nextBond } from './data/bonds.js';
import { ITEMS } from './data/items.js';
import { initUpdates } from './engine/updates.js';

const app = document.getElementById('app');
setToast((m,k)=>toast(m,k));
let firstGesture = false;
document.addEventListener('pointerdown', () => { if (!firstGesture) { firstGesture = true; initAudio(); } }, { capture:true });

export function clearScreens(){ for (const s of [...app.querySelectorAll('.screen')]) { s.dispose?.(); s.remove(); } for (const p of [...app.querySelectorAll('.panel-wrap')]) p.remove(); }
const TRANS = { title:'fade', hub:'gold', action:'ink', result:'gold', vn:'fade', world:'slide', region:'slide', explore:'slide', adventure:'gold' };
export function show(el, kind){
  clearScreens(); app.append(el);
  if (window.__ZLJ_TEST?.auto) return;
  const cls = kind || TRANS[[...el.classList].find(c => TRANS[c])] || 'ink';
  const w = document.createElement('div'); w.className = 'zlj-trans ' + cls;
  document.body.append(w); setTimeout(()=>w.remove(), 650);
}

export const game = {
  title(){ stopVN(); S && (S.mode='title'); show(titleScreen()); playBgm('title'); setAmbient('embers'); },
  newGame(){ newGame(); clearBacklog(); show(vnScreen()); restoreScene(); runMain('start'); },
  newAdventure(){ newGame(); clearBacklog(); S.prevMode='vn'; game.hub(); stageDetail(STAGES.jincheng_1); },
  resume(){ // 根据 S.mode 恢复
    stopVN(); clearBacklog();
    if (S.mode==='hub' || S.mode==='action') { game.hub(); return; }
    if (S.mode==='region' || S.mode==='world') { if (S.mode==='world') game.world(); else game.region(S.region); return; }
    show(vnScreen()); restoreScene(); runMain();
  },
  loadSlot(i){ if (!load(i)) { toast('存档不存在'); return false; } game.resume(); toast('读取完成'); return true; },
  world(){ stopVN(); S.mode='world'; show(worldScreen()); playBgm('dawn'); setAmbient('stars'); },
  region(id){ stopVN(); S.mode='region'; S.region=id; S.visited[id]=true; S.flags['reg_'+id]=true; show(exploreScreen(id)); },
  hub(){ stopVN(); if (S.mode!=='hub' && S.mode!=='action' && S.mode!=='title') S.prevMode = S.mode; S.mode='hub'; ensureAct(); show(hubScreen()); playBgm('jincheng'); setAmbient('embers'); },
  story(){ S.mode = (S.prevMode && S.prevMode!=='hub') ? S.prevMode : 'vn'; game.resume(); },
  continueMain(){ const to = S.explore?.to; S.explore = null; show(vnScreen()); restoreScene(); runMain(to); },
  battle(enc, opts){ return battle(enc, opts); },
};
window.__game = game;
window.__zlj = { get S(){ return S; }, game, STORY, meta, settings, openMenu, nextBond, ach, add:addMember, ITEMS, healAll, launch, adventureScreen, STAGES, SIGNATURE_IDS };

hooks.battle = (enc, opts) => battle(enc, opts);
hooks.toRegion = (id) => game.region(id);
hooks.toTitle = () => game.title();
hooks.toHub = async () => { if (S.inSub && !(await confirmBox('支线剧情进行中，现在回主城将从本段支线开头重来。确定离开？'))) return; for (const p of [...app.querySelectorAll('.panel-wrap')]) p.remove(); game.hub(); };
hooks.openMenu = (tab) => openMenu(tab);
hooks.ending = async (x) => { await endingScreen(x); game.title(); };

// 计时
setInterval(()=>{ if (S && S.mode!=='title') S.playtime = (S.playtime||0) + 1; }, 1000);
// 返回键（Android）
window.__handleBack = () => {
  { const d = [...document.querySelectorAll('.dlg, .dlg-card')].pop(); if (d) { d._back && d._back(); return true; } }
  const last = sel => { const a = app.querySelectorAll(sel); return a.length ? a[a.length - 1] : null; };
  // 由上到下：大图查看 → 奖励弹窗 → 新手引导 → 面板 → 当前画面
  const viewer = last('.viewer'); if (viewer) { viewer.click(); return true; }
  const rw = last('.reward'); if (rw) { rw.click(); return true; }
  const tut = last('.tut'); if (tut) { (tut.querySelector('.tut-skip') || tut).click(); return true; }
  const pw = [...app.querySelectorAll('.panel-wrap')].filter(p => !p.classList.contains('closing')).pop();
  if (pw) { const c = pw.querySelector('.panel-head .close'); if (c) c.click(); else pw.remove(); return true; }
  const scr = last('.screen');
  if (!scr) return false;
  if (scr.classList.contains('action')) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return true; }
  if (scr.classList.contains('title')) return false;
  if (scr.classList.contains('vn') && scr.classList.contains('hideui')) { scr.classList.remove('hideui'); return true; }
  const back = scr.querySelector('.hb-back, .rs-back, [data-back]'); if (back) { back.click(); return true; }
  if (scr.classList.contains('result')) { const b = scr.querySelector('.rs-btns button:last-child'); if (b) { b.click(); return true; } }
  if (scr.classList.contains('ending')) { scr.click(); return true; }
  if (S && S.mode !== 'title') { openMenu(); return true; }
  return false;
};
document.addEventListener('backbutton',window.__handleBack,false);
// 后台自动存档
document.addEventListener('visibilitychange', ()=>{ if (document.hidden && S && S.mode && S.mode!=='title' && !S.inSub) { try { save(AUTO); } catch(e){} } });

// 测试钩子（Playwright）

// 启动：预载关键图片
async function boot(){
  const loader = h('div.screen.loading', {}, h('div.load-title', {}, '烛龙纪'), h('div.load-bar', {}, h('i')), h('div.load-tip', {}, '点灯中……'));
  app.append(loader);
  const imgs = ['ui/title','ui/worldmap','bg/jincheng','bg/dengta','por/yangui','por/fuli','por/baiji'];
  let n=0; await Promise.all(imgs.map(p=>new Promise(r=>{ const im=new Image(); im.onload=im.onerror=()=>{ n++; loader.querySelector('i').style.width=(n/imgs.length*100)+'%'; r(); }; im.src=asset(p); })));
  setTimeout(()=>game.title(), 200);
}
ensureDust();
boot();
initUpdates();
