// 视觉小说引擎：执行 story.json 中的指令
import { S, settings, meta, saveMeta, cond, applyEffects, unlock, ach, save, AUTO } from './state.js';
import { CHARS, NAME2ID } from '../data/characters.js';
import { h, btn, asset, toast, sleep, panel } from './ui.js';
import { vnPose, portrait as posePor } from './pose.js';
import { sfx, playBgm, playVoice, stopVoice } from './audio.js';
import { shake as fxShake, flash as fxFlash, setAmbient } from './fx.js';
import { aiReady, tts } from './ai.js';
import story from '../gen/story.json';
import { vnFilter, vnApply, CANON, REGION_CH } from './canon.js';

export const hooks = { battle:null, toRegion:null, toTitle:null, openMenu:null, ending:null };
export const STORY = story;
const AMBIENT = { jincheng:'embers', dengta:'embers', campfire:'embers', qingqiu_forest:'blue', qingqiu_palace:'petals', donghai:'stars', haidi:'blue',
  changyang:'embers', changyang_altar:'embers', kunlun_gate:'snow', yaochi:'petals', shuge:'stars', hundun:'stars', yugu:'embers', chishui:'embers',
  beihai:'snow', youdu:'blue', guixu:'stars', zhulong_eye:'embers', buzhou:'stars', yuetai:'stars', dream:'stars' };
const POS = ['farleft','left','center','right','farright'];

let D = null; // DOM
let ctx = null; // {pc, main, onReturn}
let backlog = [];
let mode = { auto:false, skip:false };
let waiter = null; // 当前等待点击的回调

export function vnScreen(){
  if (D) return D.root;
  D = {};
  D.bgA = h('div.vn-bg'); D.bgB = h('div.vn-bg');
  D.chars = h('div.vn-chars'); D.cg = h('div.vn-cg');
  D.name = h('div.vn-name'); D.text = h('div.vn-text'); D.face = h('div.vn-face'); D.next = h('div.vn-next', {}, '◆');
  D.voiceBtn = btn('配音', ()=>voiceCurrent(), 'tool voice');
  D.autoBtn = btn('自动', ()=>{ mode.auto=!mode.auto; mode.skip=false; updTools(); if (mode.auto && D.done && waiter) setTimeout(()=>autoAdvance(), 300); }, 'tool');
  D.skipBtn = btn('快进', ()=>{ mode.skip=!mode.skip; mode.auto=false; updTools(); if (mode.skip && waiter) waiter(); }, 'tool');
  D.tools = h('div.vn-tools', {},
    btn('记录', ()=>openBacklog(), 'tool'), D.autoBtn, D.skipBtn, D.voiceBtn,
    btn('隐藏', ()=>{ D.root.classList.add('hideui'); }, 'tool'),
    btn('主城', (e)=>{ e && e.stopPropagation && e.stopPropagation(); hooks.toHub && hooks.toHub(); }, 'tool home'),
    btn('菜单', ()=>hooks.openMenu && hooks.openMenu(), 'tool'));
  D.box = h('div.vn-box', {}, D.face, D.name, D.text, D.next);
  D.choices = h('div.vn-choices'); D.card = h('div.vn-card');
  D.root = h('div.screen.vn', { onclick:onTap }, D.bgA, D.bgB, D.chars, D.cg, D.box, D.tools, D.choices, D.card);
  return D.root;
}
function updTools(){ D.autoBtn.classList.toggle('on', mode.auto); D.skipBtn.classList.toggle('on', mode.skip); D.voiceBtn.style.display = (aiReady() && settings.aiVoice) ? '' : 'none'; }
function onTap(e){
  if (D.root.classList.contains('hideui')) { D.root.classList.remove('hideui'); return; }
  if (mode.skip) { mode.skip=false; updTools(); }
  if (D.typing) { D.finishType(); return; }
  if (waiter) { const w=waiter; waiter=null; sfx('page'); w(); }
}
function waitTap(){ return new Promise(r => { waiter = r; }); }

// —— 场景呈现 ——
let bgFlip = false;
export function setBg(name, instant){
  S.bg = name; const [on, off] = bgFlip ? [D.bgA, D.bgB] : [D.bgB, D.bgA]; bgFlip=!bgFlip;
  on.style.backgroundImage = name && name!=='none' ? `url(${asset('bg/'+name)})` : 'none';
  on.classList.add('on'); off.classList.remove('on'); if (instant) { on.style.transition='none'; requestAnimationFrame(()=>on.style.transition=''); }
  setAmbient(AMBIENT[name]||'none');
}

function refreshHeroPose(mood){
  const el = D.chars && D.chars.querySelector('[data-id="yangui"] img');
  if (el) el.src = porSrc('yangui', mood || '');
  if (D.face && D.face.classList.contains('on')) D.face.style.backgroundImage = `url(${porSrc('yangui', mood || '')})`;
}
function porSrc(id, mood){ return id==='yangui' ? vnPose(id, mood) : asset('por/'+id); }
export function showChar(id, pos='center'){
  if (!CHARS[id]) return;
  S.shown[id] = pos; unlock('c_'+id);
  let el = D.chars.querySelector(`[data-id="${id}"]`);
  if (!el) { el = h('div.vn-char.enter', { 'data-id':id }, h('img', { src:porSrc(id, 'think'), draggable:'false' })); D.chars.append(el); setTimeout(()=>el.classList.remove('enter'), 30); }
  POS.forEach(p=>el.classList.remove(p)); el.classList.add(pos);
}
export function hideChar(id){
  if (id==='all') { for (const k of Object.keys(S.shown)) hideChar(k); return; }
  delete S.shown[id]; const el = D.chars.querySelector(`[data-id="${id}"]`); if (el) { el.classList.add('leave'); setTimeout(()=>el.remove(), 400); }
}
export function showCg(name){
  S.cg = name;
  if (!name || name==='off') { D.cg.classList.remove('on'); S.cg=null; return; }
  D.cg.style.backgroundImage = `url(${asset('cg/'+name)})`; D.cg.classList.add('on');
  if (!meta.cgs.includes(name)) { meta.cgs.push(name); saveMeta(); }
}
export function restoreScene(){
  vnScreen(); D.chars.replaceChildren();
  setBg(S.bg, true); const shown = {...S.shown}; S.shown = {};
  for (const [id,pos] of Object.entries(shown)) showChar(id,pos);
  showCg(S.cg); if (S.bgm) playBgm(S.bgm);
  D.choices.replaceChildren(); D.card.classList.remove('on'); D.name.textContent=''; D.text.textContent='';
}
function highlight(id){ for (const el of D.chars.children) el.classList.toggle('dim', !!id && el.dataset.id!==id); }

// —— 文本 ——
function typeText(text){
  return new Promise(res => {
    D.text.textContent=''; D.done=false; D.next.classList.remove('on');
    const speed = mode.skip ? 0 : settings.textSpeed; let i=0;
    const finish = () => { clearInterval(D.ti); D.text.textContent=text; D.typing=false; D.done=true; D.next.classList.add('on'); res(); };
    D.finishType = finish;
    if (!speed || speed>=100) { finish(); return; }
    D.typing = true; const per = Math.max(8, 1000/speed);
    D.ti = setInterval(()=>{ i++; D.text.textContent = text.slice(0,i); if (i>=text.length) finish(); }, per);
  });
}
let curLine = null;
async function voiceCurrent(){
  if (!curLine || !aiReady()) return;
  const id = NAME2ID[curLine.who]; if (!id) { toast('旁白不配音'); return; }
  try { D.voiceBtn.classList.add('busy'); const url = await tts(curLine.text, id); playVoice(url); }
  catch(e){ toast('配音失败：'+e.message); } finally { D.voiceBtn.classList.remove('busy'); }
}
function autoAdvance(){ if (waiter && mode.auto) { const w=waiter; waiter=null; w(); } }
async function say(c){
  curLine = c; stopVoice();
  const id = c.who ? NAME2ID[c.who] : null;
  D.box.classList.toggle('narr', !c.who);
  D.name.textContent = c.who || ''; D.name.style.display = c.who ? '' : 'none';
  const text = c.text.replace(/\{name\}/g, '晏归');
  if (id && CHARS[id] && !S.shown[id]) { D.face.style.backgroundImage=`url(${porSrc(id, text)})`; D.face.classList.add('on'); } else D.face.classList.remove('on');
  if (id === 'yangui' || (S.shown && S.shown.yangui)) refreshHeroPose(text);
  highlight(id && S.shown[id] ? id : null);
  backlog.push({who:c.who, text}); if (backlog.length>300) backlog.shift();
  const read = meta.readLines[c.at];
  if (mode.skip && !read && !settings.skipAll) { mode.skip=false; updTools(); }
  await typeText(text);
  meta.readLines[c.at]=1; if (Math.random()<0.1) saveMeta();
  if (settings.aiVoice && settings.autoVoice && aiReady() && id && !mode.skip) voiceCurrent();
  if (mode.skip) { await sleep(40); return; }
  let t; if (mode.auto) t = setTimeout(autoAdvance, settings.autoDelay + text.length*45);
  if (window.__ZLJ_TEST) { await sleep(window.__ZLJ_TEST.lineMs||0); clearTimeout(t); return; }
  await waitTap(); clearTimeout(t);
}
function choose(c){
  const F = vnFilter(S, c.opts.filter(o => cond(o.cond))); const opts = F.opts;
  if (F.locked) toast('闯关中已做出这个决定 · ' + CANON[F.key].name);
  mode.skip=false; updTools();
  return new Promise(res => {
    D.choices.replaceChildren(...opts.map((o,i) => h('button.choice'+(o.cond?'.special':'')+(F.locked?'.locked':''), { onclick:(e)=>{ e.stopPropagation(); e.currentTarget.classList.add('picked'); sfx('choice'); setTimeout(()=>{ D.choices.classList.remove('on'); res(o); }, 90); } }, o.text)));
    D.choices.classList.add('on');
    if (window.__ZLJ_TEST) { const pickFn = window.__ZLJ_TEST.choose; const o = pickFn ? pickFn(c, opts) : opts[0]; setTimeout(()=>{ D.choices.classList.remove('on'); res(o); }, 5); }
  });
}
async function chapterCard(c){
  if (!c.inter) { S.chapter = c.title; S.chapterN = +c.n || 0; if (S.chapterN < 14) S.vnMax = Math.max(S.vnMax || 0, S.chapterN); }
  const rid = !c.inter && Object.keys(REGION_CH).find(r => REGION_CH[r][0] === +c.n);
  if (rid && S.act?.cleared?.[rid + '_10']) setTimeout(() => toast('闯关中已走过这一程——那里做过的抉择，主线会沿用'), 600);
  D.card.replaceChildren(h('div.card-n', {}, c.inter?'幕间':c.n==='0'?'序章':c.n==='13'?'终章':`第${['','一','二','三','四','五','六','七','八','九','十','十一','十二'][+c.n]||c.n}章`), h('div.card-t', {}, c.title), h('div.card-s', {}, c.sub||''));
  D.card.classList.add('on'); sfx('bell');
  try { save(AUTO); } catch(e){}
  await Promise.race([sleep(window.__ZLJ_TEST?10:3200), new Promise(r=>{ D.card.onclick=(e)=>{ e.stopPropagation(); r(); }; })]);
  D.card.classList.remove('on');
}
function logFx(msg, kind){ toast(msg, kind==='bad'?'bad':kind==='good'?'good':''); }

// —— 解释器 ——
export function runMain(fromLabel){
  if (fromLabel) S.pc = STORY.labels[fromLabel];
  S.mode = 'vn'; ctx = { pc:S.pc, main:true };
  return exec();
}
export function runSub(label, onReturn){
  ctx = { pc:STORY.labels[label], main:false, onReturn };
  if (ctx.pc===undefined) { console.error('无此标签', label); onReturn && onReturn(); return; }
  S.inSub = true;
  return exec();
}
export function inSub(){ return !!ctx && !ctx.main; }
let running = 0;
async function exec(){
  const my = ++running; updTools();
  const C = STORY.cmds;
  while (my===running) {
    const c = C[ctx.pc];
    if (!c) { console.error('剧情越界', ctx.pc); hooks.toTitle && hooks.toTitle(); return; }
    if (ctx.main) S.pc = ctx.pc;
    let next = ctx.pc + 1;
    switch (c.t) {
      case 'say': await say(c); break;
      case 'choice': { const o = await choose(c); backlog.push({who:null, text:'▸ '+o.text, choice:true}); applyEffects(vnApply(S, o), logFx); next = STORY.labels[o.to]; break; }
      case 'if': if (cond(c.cond)) next = STORY.labels[c.to]; break;
      case 'goto': next = STORY.labels[c.a]; break;
      case 'do': applyEffects(c.eff, logFx); break;
      case 'bg': setBg(c.a); break;
      case 'bgm': S.bgm = c.a; playBgm(c.a); break;
      case 'sfx': sfx(c.a); break;
      case 'show': showChar(c.id, c.pos); break;
      case 'hide': hideChar(c.a); break;
      case 'cg': showCg(c.a); break;
      case 'cgoff': showCg(null); break;
      case 'shake': fxShake(); sfx('shake'); break;
      case 'flash': fxFlash(c.a||'#fff'); break;
      case 'fx': setAmbient(c.a); break;
      case 'note': toast(c.a); break;
      case 'save': try { save(AUTO); } catch(e){} break;
      case 'wait': if (c.a) await sleep(window.__ZLJ_TEST?5:+c.a); else { D.next.classList.add('on'); await waitTap(); } break;
      case 'chapter': await chapterCard(c); break;
      case 'interlude': await chapterCard({ ...c, inter: true }); break;
      case 'battle': {
        if (ctx.main) S.pc = ctx.pc;
        D.root.classList.add('inbattle');
        const r = await hooks.battle(c.enc, { story:true, noFlee:true, loseLabel:c.lose });
        D.root.classList.remove('inbattle');
        if (my!==running) return;
        if (r.load) { hooks.openMenu && hooks.openMenu('load'); next = ctx.pc; running++; return; }
        if (S.bgm) playBgm(S.bgm);
        if (!r.win) { if (c.lose) next = STORY.labels[c.lose]; else next = ctx.pc; }
        break; }
      case 'explore': {
        S.flags['reg_'+c.region]=true; S.explore = { region:c.region, to:c.to, name:c.name };
        S.pc = next; running++; hooks.toRegion(c.region); return; }
      case 'return': { S.inSub=false; running++; const f = ctx.onReturn; ctx = null; f && f(); return; }
      case 'ending': running++; await hooks.ending(c.a); return;
      case 'title': running++; hooks.toTitle(); return;
      default: console.warn('未知指令', c.t, c.at);
    }
    if (my!==running) return;
    ctx.pc = next;
  }
}
export function stopVN(){ running++; waiter=null; ctx=null; if (S) S.inSub=false; mode.auto=false; mode.skip=false; }

function openBacklog(){
  const p = panel('对话记录', { cls:'backlog' });
  p.body.append(...backlog.slice(-150).map(l => h('div.bl'+(l.choice?'.ch':''), {}, l.who?h('b', {}, l.who):null, h('span', {}, l.text))));
  setTimeout(()=>p.body.scrollTop = p.body.scrollHeight, 30);
}
export function clearBacklog(){ backlog = []; }