/** 关卡内剧情对白：半身立绘 + 文本框；点按推进，自动 / 快进 / 跳过；安卓返回键 = 跳过 */
import { h, asset } from '../engine/ui.js';
import { CHARS } from '../data/characters.js';
import { ABOSSES } from '../action/foes.js';
import { vnPose } from '../engine/pose.js';
import { sfx } from '../engine/audio.js';
import { lines as parse } from '../action/storyBeats.js';

const root = () => document.getElementById('app') || document.body;
const T = () => window.__ZLJ_TEST && window.__ZLJ_TEST.dlg !== 'manual' ? window.__ZLJ_TEST : null;
const wait = ms => new Promise(r => setTimeout(r, ms));
let auto = false;

function speaker(who, ctx){
  if (who === 'n') return { name: '', img: null };
  if (who === 'boss') { const b = ABOSSES[ctx.boss]; return { name: b?.name || '？？？', img: b ? asset(b.img) : null, boss: true }; }
  return { name: CHARS[who]?.name || who, img: vnPose(who, ''), hero: who === 'yangui' };
}

/** 章节卡 */
export async function chapterCard(t, s, bg){
  const el = h('div.dlg-card', { style: bg ? { backgroundImage: `linear-gradient(rgba(5,6,10,.72),rgba(5,6,10,.72)),url(${bg})` } : null }, h('i.dlg-line'), h('b', {}, t), s ? h('span', {}, s) : null, h('i.dlg-line'));
  root().append(el);
  if (T()) { await wait(T().lineMs || 0); el.remove(); return; }
  await new Promise(res => { const done = () => { el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 260); }; const tm = setTimeout(done, 2300); el.onclick = () => { clearTimeout(tm); done(); }; el._back = el.onclick; });
}

/**
 * 播放一段对白。rawLines：storyBeats 格式；opts.choice：{q, opts:[{t}]}；opts.boss：首领 id。
 * 返回所选项下标（无抉择时为 null）。
 */
export async function playDialogue(rawLines, opts = {}){
  const L = parse(rawLines);
  if (!L.length && !opts.choice) return null;
  if (window.__ZLJ_TEST) (window.__ZLJ_TEST.dlgLog ||= []).push((opts.boss || '') + ':' + (L[0]?.text || '').slice(0, 10));
  const portrait = h('img.dlg-por'), name = h('b.dlg-name'), text = h('p.dlg-text'), hint = h('i.dlg-next', {}, '▾');
  const autoB = h('button.dlg-b', {}, '自动'), ffB = h('button.dlg-b', {}, '快进'), skipB = h('button.dlg-b', {}, '跳过');
  const box = h('div.dlg-box', {}, name, text, hint);
  const el = h('div.dlg', {}, opts.bg ? h('div.dlg-bg', { style: { backgroundImage: `url(${opts.bg})` } }) : null, h('div.dlg-shade'), portrait, box, h('div.dlg-tools', {}, autoB, ffB, skipB));
  root().append(el);
  let skip = false, ff = false, next = null, typing = null;
  const advance = () => { if (typing) { typing(); return; } next && next(); };
  el.addEventListener('click', e => { if (e.target.closest('.dlg-tools') || e.target.closest('.dlg-ch')) return; advance(); });
  autoB.onclick = () => { auto = !auto; autoB.classList.toggle('on', auto); if (auto) advance(); };
  ffB.onclick = () => { ff = !ff; ffB.classList.toggle('on', ff); if (ff) advance(); };
  skipB.onclick = () => { skip = true; advance(); };
  el._back = () => skipB.onclick();
  autoB.classList.toggle('on', auto);
  const test = T();
  for (const ln of L) {
    if (skip) break;
    const sp = speaker(ln.who, opts);
    el.classList.toggle('narr', !sp.name); el.classList.toggle('right', !!sp.name && !sp.hero);
    if (sp.img) { if (portrait.getAttribute('src') !== sp.img) portrait.src = sp.img; portrait.style.display = ''; portrait.classList.toggle('boss', !!sp.boss); } else portrait.style.display = 'none';
    name.textContent = sp.name; text.textContent = '';
    if (test) { text.textContent = ln.text; await wait(test.lineMs || 0); continue; }
    // 打字机
    await new Promise(res => { let i = 0; const full = ln.text; const step = () => { if (skip || ff) i = full.length; text.textContent = full.slice(0, i); if (i >= full.length) { typing = null; res(); return; } i += 1; tid = setTimeout(step, 26); }; let tid; typing = () => { clearTimeout(tid); i = full.length; text.textContent = full; typing = null; res(); }; step(); });
    if (skip) break;
    await new Promise(res => { next = res; const delay = ff ? 160 : auto ? 900 + ln.text.length * 45 : 0; if (delay) setTimeout(res, delay); });
    next = null;
  }
  let pick = null;
  if (opts.choice?.opts?.length) {
    el.classList.add('choosing'); el.classList.remove('right'); portrait.style.display = 'none';
    name.textContent = ''; text.textContent = opts.choice.q || '';
    const list = h('div.dlg-ch');
    el.append(list);
    pick = await new Promise(res => {
      opts.choice.opts.forEach((o, i) => list.append(h('button.dlg-opt', { onclick: e => { e.stopPropagation(); sfx('click'); res(i); } }, o.t)));
      el._back = () => {}; // 抉择不可跳过（返回键无效，避免误选）
      if (test) res(Math.min(opts.choice.opts.length - 1, test.choice || 0));
    });
    list.remove(); el.classList.remove('choosing');
    const after = opts.choice.opts[pick]?.after;
    if (after) { skip = false; el.remove(); await playDialogue([].concat(after), { boss: opts.boss, bg: opts.bg }); return pick; }
  }
  el.classList.add('out'); await wait(test ? 0 : 180); el.remove();
  return pick;
}

/** 非阻塞的随行对白（关内触发），3 秒后淡出 */
export function bark(raw, host){
  const ln = parse([raw])[0]; if (!ln) return;
  const sp = speaker(ln.who, {});
  const el = h('div.dlg-bark', {}, sp.img ? h('img', { src: sp.img }) : null, h('div', {}, sp.name ? h('b', {}, sp.name) : null, h('span', {}, ln.text)));
  (host || root()).append(el);
  setTimeout(() => el.classList.add('out'), 3400); setTimeout(() => el.remove(), 3800);
}
