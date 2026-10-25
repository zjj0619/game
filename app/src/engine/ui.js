// 全局：append / replaceChildren 忽略 null 与 false，避免出现 "null" 文本
for (const P of [Element.prototype, DocumentFragment.prototype]) for (const fn of ["append","prepend","replaceChildren"]) { const o = P[fn]; P[fn] = function(...k){ return o.apply(this, k.filter(x=>x!=null && x!==false)); }; }
// 小型 DOM 工具
import { sfx } from './audio.js';
export const $ = (s, r=document) => r.querySelector(s);
export function h(tag, attrs={}, ...kids){
  const [t, ...cls] = tag.split('.'); const e = document.createElement(t||'div');
  if (cls.length) e.className = cls.join(' ');
  for (const [k,v] of Object.entries(attrs||{})) {
    if (v==null || v===false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k==='html') e.innerHTML = v;
    else if (k==='style' && typeof v==='object') Object.assign(e.style, v);
    else e.setAttribute(k, v===true?'':v);
  }
  for (const k of kids.flat(9)) if (k!=null && k!==false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
export function btn(label, on, cls=''){ return h('button.btn'+(cls?'.'+cls.split(' ').join('.'):''), { onclick:(e)=>{ e.stopPropagation(); sfx('click'); on&&on(e); } }, label); }
export const asset = p => `assets/${p}.webp`;
export const icon = (key, cls='') => h('img.icon'+(cls?'.'+cls:''), { src: asset('icon/'+key), alt:'', draggable:'false' });

let toastBox;
export function toast(msg, kind=''){
  if (!toastBox) { toastBox = h('div.toasts'); document.body.append(toastBox); }
  const t = h('div.toast'+(kind?'.'+kind:''), {}, msg); toastBox.append(t); while (toastBox.children.length>4) toastBox.firstChild.remove();
  if (kind==='ach') sfx('ach');
  setTimeout(()=>t.classList.add('out'), 2600); setTimeout(()=>t.remove(), 3200);
}
// 面板：返回 {root, body, close}
export function panel(title, opts={}){
  const root = h('div.panel-wrap'+(opts.cls?'.'+opts.cls:''));
  const body = h('div.panel-body');
  const close = () => { root.classList.add('closing'); setTimeout(()=>root.remove(), 180); opts.onclose && opts.onclose(); };
  const head = h('div.panel-head', {}, h('div.panel-title', {}, title), opts.tabs||null, btn('✕', close, 'close'));
  root.append(h('div.panel', {}, head, body));
  root.addEventListener('click', e => { if (e.target===root && !opts.modal) close(); });
  document.getElementById('app').append(root);
  return { root, body, close, head };
}
export function confirmBox(text, okText='确定', cancelText='取消'){
  return new Promise(res => {
    const p = panel('提示', { modal:true, cls:'small', onclose:()=>res(false) });
    p.body.append(h('p.confirm-text', {}, text), h('div.row.center', {}, btn(okText, ()=>{ res(true); p.root.remove(); }, 'gold'), cancelText?btn(cancelText, ()=>{ res(false); p.root.remove(); }):null));
  });
}
export function promptBox(title, placeholder='', value='', multiline=false){
  return new Promise(res => {
    const p = panel(title, { modal:true, cls:'small', onclose:()=>res(null) });
    const inp = multiline ? h('textarea.input', { placeholder, rows:4 }) : h('input.input', { placeholder, value });
    if (multiline) inp.value = value;
    p.body.append(inp, h('div.row.center', {}, btn('确定', ()=>{ res(inp.value); p.root.remove(); }, 'gold'), btn('取消', ()=>{ res(null); p.root.remove(); })));
    setTimeout(()=>inp.focus(), 50);
  });
}
export const sleep = ms => new Promise(r=>setTimeout(r, ms));
export function fmtTime(sec){ sec=Math.floor(sec); const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60); return `${h}时${String(m).padStart(2,'0')}分`; }

// —— v1.1：触感反馈 ——
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { settings as _set } from './state.js';
export function haptic(kind='light'){
  if (_set.haptics===false) return;
  try {
    if (kind==='success') Haptics.notification({ type: NotificationType.Success }).catch(()=>{});
    else if (kind==='warn') Haptics.notification({ type: NotificationType.Warning }).catch(()=>{});
    else Haptics.impact({ style: kind==='heavy'?ImpactStyle.Heavy : kind==='medium'?ImpactStyle.Medium : ImpactStyle.Light }).catch(()=>{});
  } catch(e){}
}
// —— v1.1：新手引导（逐步高亮）——
// steps: [{sel|el, text, pos}]  key 存在 S.flags 中，仅首次出现
const TUT_ACTIVE = {};
export function tutorial(key, steps, flags){
  if (flags && flags['tut_'+key]) return Promise.resolve();
  if (window.__ZLJ_TEST && !window.__ZLJ_TEST.tut) { if (flags) flags['tut_'+key]=true; return Promise.resolve(); }
  if (TUT_ACTIVE[key]) return TUT_ACTIVE[key];
  return TUT_ACTIVE[key] = new Promise(res0 => { const res = () => { delete TUT_ACTIVE[key]; res0(); };
    const ov = h('div.tut'); const ring = h('div.tut-ring'); const tip = h('div.tut-tip');
    ov.append(ring, tip); document.getElementById('app').append(ov);
    let i = 0;
    const show = () => {
      const s = steps[i]; const el = s.el || (s.sel && document.querySelector(s.sel));
      tip.replaceChildren(h('div.tut-n', {}, `${i+1}/${steps.length}`), h('div.tut-t', {}, s.text), h('div.tut-tap', {}, '点击继续'));
      if (el) { const r = el.getBoundingClientRect(); const p=6;
        Object.assign(ring.style, { display:'block', left:(r.left-p)+'px', top:(r.top-p)+'px', width:(r.width+p*2)+'px', height:(r.height+p*2)+'px' });
        const below = r.top + r.height/2 < innerHeight/2; const tw = Math.min(360, innerWidth*0.42);
        let lx = Math.min(innerWidth-tw-12, Math.max(12, r.left + r.width/2 - tw/2));
        Object.assign(tip.style, { left:lx+'px', width:tw+'px', top: below ? (r.bottom+14)+'px' : '', bottom: below ? '' : (innerHeight-r.top+14)+'px' });
      } else { ring.style.display='none'; Object.assign(tip.style, { left:'50%', top:'50%', bottom:'', width:'min(420px,60vw)', transform:'translate(-50%,-50%)' }); }
    };
    ov.addEventListener('click', (e) => { e.stopPropagation(); sfx('click'); i++; tip.style.transform=''; if (i>=steps.length) { ov.remove(); if (flags) flags['tut_'+key]=true; res(); } else show(); });
    show();
  });
}
// —— v1.1：奖励弹窗（逐项飞入）——
export function rewardPop(title, items){
  return new Promise(res => {
    const ov = h('div.reward', { onclick:()=>{ ov.classList.add('out'); setTimeout(()=>{ ov.remove(); res(); }, 220); } },
      h('div.rw-box', {}, h('div.rw-title', {}, title),
        h('div.rw-items', {}, items.map((it,i)=>h('div.rw-item', { style:{animationDelay:(0.12+i*0.08)+'s'} }, it.icon ? icon(it.icon) : h('span.rw-glyph', {}, it.glyph||'✦'), h('div.rw-n', {}, it.name), it.n!=null ? h('div.rw-c', {}, '×'+it.n) : null))),
        h('div.rw-tap', {}, '点击任意处继续')));
    document.getElementById('app').append(ov); sfx('item'); haptic('success');
    if (window.__ZLJ_TEST && !window.__ZLJ_TEST.holdPop) setTimeout(()=>ov.click(), 20);
  });
}
