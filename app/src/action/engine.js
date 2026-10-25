// v2.0 横版动作闯关引擎（Canvas）：跑、跳、二段跳、冲刺、连击、技能、变身、换人、异兽助战
// 打击感：顿帧、击退、浮空连击、无敌帧、震屏；敌人 8 种 AI；首领多阶段 + 预警
import { S, ach, settings } from '../engine/state.js';
import { CHARS, EL_COLOR } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { h, asset, haptic } from '../engine/ui.js';
import { playBgm, sfx } from '../engine/audio.js';
import { ACHARS, ASKILLS, WEAPON, skillPow, skillCd } from './data.js';
import { AFOES, ABOSSES, foeStats, elTint } from './foes.js';
import { rollGear, RARITY } from './gear.js';
import { actStats, slotsOf, skillLv, petPower, ultOk } from './progress.js';
import { ULT_LV } from './data.js';
import * as HK from './hooks.js';
import { STAGE_FLAVOR } from './stages.js';

const VH = 270, GY = 232;
const GRAV = 1500, T = () => window.__ZLJ_TEST || {};
const imgC = {};
function img(p){ if (!imgC[p]) { const i = new Image(); i.src = asset(p); imgC[p] = i; } return imgC[p]; }
const ok = i => i && i.complete && i.naturalWidth > 0;
const EL_SET = { fire:1, water:1, wood:1, metal:1, earth:1, dark:1, light:1 };
// 由颜色推断五行配色（色相分桶）
function colEl(col){ if (!col || col[0] !== '#') return 'light'; const n = parseInt(col.slice(1, 7), 16); const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 0.12) return mx > 0.6 ? 'metal' : 'dark'; let hh; if (mx === r) hh = ((g - b) / (mx - mn)) % 6; else if (mx === g) hh = (b - r) / (mx - mn) + 2; else hh = (r - g) / (mx - mn) + 4; hh = (hh * 60 + 360) % 360;
  return hh < 25 || hh >= 335 ? 'fire' : hh < 50 ? 'earth' : hh < 70 ? 'light' : hh < 165 ? 'wood' : hh < 250 ? 'water' : 'dark'; }
// 程序化动画帧：assets/anim/<key>/<state><i>.webp（tools/gen/anim.py 生成），未加载时回退到静态立绘
const ANIM_N = { idle:6, run:8, atk:6, jump:2, hurt:2, cast:4 }, FANIM_N = { idle:4, walk:6, atk:4, hurt:2 };
function animKey(p){ return p.replace(/\//g, '_'); }
function frame(key, state, i, fallback){ const im = img('anim/' + key + '/' + state + i); return ok(im) ? im : null; }
export function preloadAnim(key, hero){ const N = hero ? ANIM_N : FANIM_N; for (const s in N) for (let i = 0; i < N[s]; i++) img('anim/' + key + '/' + s + i); }
export function regionImg(base, ri){ return ri > 0 && /^enemy\/[a-d]\d$/.test(base) ? 'enemy/r/' + ri + '_' + base.slice(6) : base; }
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const rnd = (a,b) => a + Math.random()*(b-a);
function hexA(hex, a){ if (!hex || hex[0] !== '#') return `rgba(255,255,255,${a})`; const n = parseInt(hex.slice(1, 7), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${Math.max(0, Math.min(1, a))})`; }
const PLATS = [ [], [[0.3,170,110],[0.65,150,110]], [[0.18,165,90],[0.5,120,120],[0.8,165,90]], [[0.4,160,180]], [[0.15,150,80],[0.45,175,80],[0.75,140,100]], [[0.25,130,90],[0.6,170,140]], [[0.2,175,70],[0.45,145,70],[0.7,115,90],[0.88,155,60]], [[0.15,170,80],[0.85,170,80]], [[0.3,155,200]], [[0.18,170,80],[0.4,140,90],[0.65,160,90],[0.88,130,70]] ];

export function runStage(stage, opts = {}){
  return new Promise(resolve => {
    const team = (opts.team && opts.team.length ? opts.team : [S.act?.team?.[0] || 'yangui']).filter(id => S.party[id]);
    const hard = !!opts.hard; const lvAdj = hard ? 8 : 0;
    for (const t of ['slash','burst','ring','spark','smoke','rune','pillar','shock','bolt','swirl','heal','shards']) for (const e of Object.keys(EL_SET)) for (let i = 0; i < 12; i++) img('vfx/' + t + '_' + e + '/' + i);
    for (const id of team) preloadAnim('p_' + id + '_s' + (S.act?.skin?.[id] || 0), true);
    const cv = h('canvas.act-cv'); const g = cv.getContext('2d');
    let W = 0, H = 0, U = 1, dpr = 1, VW = 600;
    const W_AR = () => Math.max(620, VW * 1.08);
    const arenas = stage.arenas.map((a, i) => ({ ...a, i, x0: 0, x1: 0, done: false, started: false, wave: 0 }));
    if (stage.boss && !stage.rush && !stage._handBossInArenas) arenas.push({ waves: [], boss: stage.boss, plat: 0, i: arenas.length, done: false, started: false, wave: 0 });
    function layoutArenas(){ let x = 0; for (const a of arenas) { a.x0 = x + 160; a.x1 = a.x0 + W_AR();
      const raw = (a.platsLayout && a.platsLayout.length) ? a.platsLayout : PLATS[a.boss ? 0 : (a.plat || 0) % PLATS.length];
      a.plats = raw.map(([fx, y, w]) => ({ x: a.x0 + fx * W_AR() - w / 2, y, w })); x = a.x1; } }
    let worldEnd = 0;
    const st = { t: 0, hitstop: 0, shake: 0, combo: 0, comboT: 0, maxCombo: 0, hitsTaken: 0, kills: 0, over: false, paused: false, cur: -1, locked: false, cam: 0,
      gold: 0, loot: {}, souls: {}, exp: 0, slow: 1, lamp: null, bossBar: null, potions: 3 + Math.max(0, (S.city?.herb || 1) - 1), timeLeft: stage.time || 0,
      dream: 0, dreamCd: 0, eyeOn: false, eyeCd: 0, eyeT: 0, eyeMarks: 0, reso: 0, resoReady: false, resoUsed: 0, dreamSeen: false, awakeSeen: true, dreamFlips: 0, secrets: [], secretChests: 0, secretGates: 0, secretPaths: 0, dust: 0 };
    const foes = [], shots = [], fx = [], zones = [], pickups = [], nums = [], allies = [], tele = [];
    const mk = id => { const s = actStats(id); return { id, s, hp: s.hp, mp: s.mp, rage: 0, cds: {}, alive: true }; };
    const roster = team.map(mk);
    let ri = 0; const P = { x: 60, y: GY, vx: 0, vy: 0, w: 22, h: 52, face: 1, ground: true, jumps: 0, dashT: 0, dashCd: 0, iT: 0, atkT: 0, atkCd: 0, combo: 0, comboT: 0,
      hurtT: 0, lock: 0, ultT: 0, buffs: [], swapCd: 0, slamming: null, whirl: null, beam: null,
      coyote: 0, jumpBuf: 0, dashBuf: 0, atkBuf: 0 };
    const C = () => roster[ri]; const AC = () => ACHARS[C().id]; const WP = () => WEAPON[AC().wpn];
    const pas = () => ASKILLS[AC().passive] || {}; const ultDef = () => ASKILLS[AC().ult];
    function buffV(k){ let v = 0; for (const b of P.buffs) if (typeof b[k] === 'number') v += b[k]; if (P.ultT > 0) { const u = ultDef(); if (typeof u[k] === 'number' && k !== 'dur') v += u[k]; } return v; }
    const hasFlag = k => P.buffs.some(b => b[k]) || (P.ultT > 0 && ultDef()[k]);
    const pet = S.act?.pet && S.act.pets?.[S.act.pet] ? (() => { const pd = S.act.pets[S.act.pet]; const d = AFOES[pd.base]; return d ? { base: pd.base, d, x: 30, y: GY - 60, cd: 1, pow: petPower(pd), lv: pd.lv, face: 1 } : null; })() : null;
    // —— HUD ——
    const hud = {};
    const skBtn = (i) => h('button.ak-sk', { onpointerdown: e => { e.preventDefault(); e.stopPropagation(); useSkill(i); } }, h('img.ak-ic'), h('i.ak-cd'), h('b.ak-mp'));
    hud.sk = [0,1,2,3,4].map(skBtn);
    const btnA = (cls, glyph, label, fn, hold) => h('button.ak-btn.' + cls, { onpointerdown: e => { e.preventDefault(); e.stopPropagation(); fn(true); }, onpointerup: () => { hold && fn(false); }, onpointerleave: () => { hold && fn(false); } }, h('span.g', {}, glyph), h('span.t', {}, label));
    const keys = { l: false, r: false, u: false, d: false, atk: false };
    hud.atk = btnA('ak-atk', '⚔', '攻击', v => { keys.atk = v; if (v) attack(); }, true);
    hud.jump = btnA('ak-jump', '⤒', '跳跃', v => v && jump());
    hud.dash = btnA('ak-dash', '➤', '冲刺', v => v && dash());
    hud.ult = btnA('ak-ult', '龍', '变身', v => v && ult());
    hud.swap = btnA('ak-swap', '⇄', '换人', v => v && swap());
    hud.pot = btnA('ak-pot', h('img.ak-poti', { src: asset('icon/ex/hp') }), '灵药', v => v && potion());
    hud.eye = btnA('ak-eye', '瞳', '烛瞳', v => { if (v) HK.toggleEye(hk()); });
    hud.dream = btnA('ak-dream', '梦', '闭目', v => v && HK.toggleDream(hk()));
    hud.reso = btnA('ak-reso', '灯', '共鸣', v => v && HK.fireReso(hk()));
    hud.resoBar = h('i'); hud.goals = h('div.ak-goals');
    hud.joy = h('div.ak-joy', {}, h('div.ak-knob'));
    hud.face = h('img.ak-face'); hud.hp = h('i'); hud.mp = h('i'); hud.rg = h('i'); hud.hpT = h('span'); hud.name = h('b'); hud.buf = h('div.ak-buf');
    hud.team = h('div.ak-team'); hud.combo = h('div.ak-combo'); hud.obj = h('div.ak-obj'); hud.boss = h('div.ak-boss', {}, h('b'), h('div.ak-bb', {}, h('i'), h('em')), h('span.ak-ph'));
    hud.msg = h('div.ak-msg'); hud.go = h('div.ak-go', {}, '前进 ▶'); hud.gold = h('span.ak-gold');
    const pauseB = h('button.ak-pause', { onclick: () => pause() }, 'Ⅱ');
    const root = h('div.screen.action', {}, cv,
      h('div.ak-top', {}, h('div.ak-me', {}, hud.face, h('div.ak-bars', {}, h('div.ak-nm', {}, hud.name, hud.hpT), h('div.ak-hp', {}, hud.hp), h('div.ak-mpb', {}, hud.mp), h('div.ak-rg', {}, hud.rg), hud.buf)), hud.team),
        h('div.ak-mid', {}, h('div.ak-st', {}, stage.name + (hard ? ' · 困难' : '')), hud.obj), h('div.ak-tr', {}, hud.gold, pauseB),
      hud.boss, hud.combo, hud.msg, hud.go, hud.joy,
      h('div.ak-pad', {}, hud.atk, hud.jump, hud.dash, ...hud.sk, hud.ult, hud.swap, hud.pot, hud.eye, hud.dream, hud.reso),
      hud.goals, h('div.ak-resoBar', {}, h('b', {}, '共鸣'), h('div.ak-rb', {}, hud.resoBar)), h('div.ak-flash'), h('div.ak-phase'), h('div.ak-mile'));
    document.querySelector('#app').append(root);
    let bgImg = img('bg/' + (stage.bg || 'jincheng')); let ridge = null;
    // 视差层（tools/gen/px.py）：远景 / 中景 / 前景，按区域与关卡序号取图
    const pxKey = 'px/' + (stage.region || 'jincheng') + '_' + (((stage.idx ?? 0) % 11 + 11) % 11 + 1); const GRD = img('ground/' + (stage.region || 'jincheng') + '_' + (((stage.idx ?? 0) % 8 + 8) % 8)); const PX = { far: img(pxKey + '_far'), mid: img(pxKey + '_mid'), near: img(pxKey + '_near') };
    function pxDraw(im, spd, hgt, bottom, alpha = 1){ if (!ok(im)) return false; const w = hgt * im.naturalWidth / im.naturalHeight; const ox = -((st.cam * spd * U) % w); g.globalAlpha = alpha; for (let x = ox - (ox > 0 ? w : 0); x < cv.width; x += w) g.drawImage(im, x, bottom - hgt, w, hgt); g.globalAlpha = 1; return true; }
    function resize(){ dpr = Math.min(2, devicePixelRatio || 1); W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); U = cv.height / VH; VW = cv.width / U; layoutArenas(); if (!st.secrets.length) st.secrets = HK.seedSecrets(arenas, stage); worldEnd = arenas[arenas.length - 1].x1 + 40; buildRidge(); }
    function buildRidge(){ const c = document.createElement('canvas'); c.width = Math.round(cv.width * 1.6); c.height = cv.height; const q = c.getContext('2d');
      const grd = q.createLinearGradient(0, c.height * 0.5, 0, c.height); grd.addColorStop(0, 'rgba(20,24,40,0)'); grd.addColorStop(1, 'rgba(5,6,12,.9)'); q.fillStyle = grd; q.beginPath(); q.moveTo(0, c.height);
      for (let i = 0; i <= 40; i++) q.lineTo(i / 40 * c.width, c.height * (0.62 + 0.1 * Math.sin(i * 1.3 + stage.lv) + 0.05 * Math.sin(i * 3.7))); q.lineTo(c.width, c.height); q.fill(); ridge = c; }
    const ro = new ResizeObserver(resize); ro.observe(root); resize();
    const kmap = { a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r', w: 'u', arrowup: 'u', s: 'd', arrowdown: 'd' };
    const kd = e => { if (st.over) return; const k = e.key.toLowerCase(); if (kmap[k]) keys[kmap[k]] = true;
      if (k === 'j') { keys.atk = true; attack(); } if (k === ' ' || k === 'k') jump(); if (k === 'l' || k === 'shift') dash();
      const si = ['u','i','o','p','h'].indexOf(k); if (si >= 0) useSkill(si); if (k === 'y') ult(); if (k === 'q') swap(); if (k === 'e') HK.toggleEye(hk()); if (k === 'r') HK.toggleDream(hk()); if (k === 't') HK.fireReso(hk()); if (k === 'escape') pause(); };
    const ku = e => { const k = e.key.toLowerCase(); if (kmap[k]) keys[kmap[k]] = false; if (k === 'j') keys.atk = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    let joy = null; const knob = hud.joy.firstChild;
    hud.joy.addEventListener('pointerdown', e => { joy = { id: e.pointerId, x: e.clientX, y: e.clientY }; hud.joy.setPointerCapture(e.pointerId); });
    hud.joy.addEventListener('pointermove', e => { if (!joy || e.pointerId !== joy.id) return; const dx = clamp(e.clientX - joy.x, -40, 40), dy = clamp(e.clientY - joy.y, -40, 40);
      knob.style.transform = `translate(${dx}px,${dy}px)`; keys.l = dx < -10; keys.r = dx > 10; const wasU = keys.u; keys.u = dy < -24; keys.d = dy > 24; if (keys.u && !wasU) jump(); });
    const joyEnd = () => { joy = null; knob.style.transform = ''; keys.l = keys.r = keys.u = keys.d = false; };
    hud.joy.addEventListener('pointerup', joyEnd); hud.joy.addEventListener('pointercancel', joyEnd);
    function say(text, t = 1.6){ hud.msg.textContent = text; hud.msg.classList.remove('on'); void hud.msg.offsetWidth; hud.msg.classList.add('on'); }
    function hk(){ return { C, P, st, foes, roster, ri, arenas, say, sfx, shake, ring, part, heal, hitCircle, num, GY, VH, U, VW, eyeOn: st.eyeOn, root, h, shock, crack, sparks, vfx, flashHit }; }
    function num(x, y, v, kind){ if (nums.length > 60) nums.shift(); nums.push({ x, y, v, kind, t: 0 }); }
    function fxLv(){ const v = settings?.fx; return v == null ? 1 : +v; }
    function fxCap(){ return [0, 90, 220][fxLv()] || 220; }
    function fxMul(n){ const lv = fxLv(); if (lv <= 0) return 0; if (lv === 1) return Math.max(1, Math.round(n * 0.32)); return Math.max(1, Math.round(n * 0.7)); }
    function part(x, y, col, n = 8, sp = 160, life = 0.5, sz = 3){ n = fxMul(n); for (let i = 0; i < n; i++) { if (fx.length > fxCap()) fx.shift(); const a = Math.random() * 6.283; const s = sp * (0.3 + Math.random()); fx.push({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: life * (0.6 + Math.random() * 0.6), col, sz }); } }
    // 序列帧特效（assets/vfx/<type>_<el>/0..11）：叠加混合播放
    function vfx(type, el, x, y, size, o = {}){ if (fxLv() <= 0) return; if (fx.length > fxCap()) return; fx.push({ k: 'vfx', type, el: el || 'light', x, y, size, face: o.face || 1, t: 0, life: o.life || 0.4, rot: o.rot || 0, add: type !== 'smoke' }); }
    function ring(x, y, r, col, life = 0.28){ if (fxLv() <= 0) return; fx.push({ k: 'ring', x, y, r: Math.min(r, 90), col, t: 0, life: Math.min(life, 0.4) }); if (r >= 40 && fxLv() >= 2) vfx('burst', colEl(col), x, y, Math.min(r * 1.6, 110), { life: life * 0.9 }); }
    function arc(x, y, face, r, col, life = 0.16, wide = 1){ if (fxLv() <= 0) return; const rot = rnd(-0.4, 0.4); fx.push({ k: 'arc', x, y, face, r, col, t: 0, life, wide, rot });
      if (fxLv() >= 2) { fx.push({ k: 'arc', x: x + face * 6, y: y + rnd(-4, 4), face, r: r * 0.72, col: '#ffffff', t: 0, life: life * 0.85, wide: wide * 0.55, rot: rot + rnd(-0.2, 0.2) }); }
      vfx('slash', colEl(col), x, y, r * 2.5 * Math.min(1.6, wide), { face, life: Math.max(0.2, life * 1.5), rot }); }
    function shock(x, y, r, col, life = 0.22){ if (fxLv() <= 0) return; fx.push({ k: 'shock', x, y, r: Math.min(r, 70), col, t: 0, life: Math.min(life, 0.32) }); }
    function crack(x, y, w = 80, life = 0.9){ if (fxLv() < 2) return; fx.push({ k: 'crack', x, y: y || GY, w, t: 0, life }); }
    function speedLines(face, n = 6){ if (fxLv() < 2) return; n = fxMul(n); for (let i = 0; i < n; i++) fx.push({ k: 'speed', x: P.x - face * rnd(10, 70), y: P.y - rnd(8, P.h), face, len: rnd(28, 70), t: 0, life: 0.18 + rnd(0, 0.12), col: 'rgba(255,240,200,.55)' }); }
    function sparks(x, y, col, n = 10, face = 1){ n = fxMul(n); for (let i = 0; i < n; i++) { if (fx.length > fxCap()) fx.shift(); const a = face > 0 ? rnd(-1.1, 1.1) : rnd(Math.PI - 1.1, Math.PI + 1.1); const s = rnd(140, 420); fx.push({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - rnd(40, 160), t: 0, life: 0.25 + rnd(0, 0.25), col: i % 3 === 0 ? '#ffffff' : col, sz: rnd(1.5, 3.8) }); } }
    function flashHit(heavy){ const fl = root.querySelector('.ak-flash'); if (!fl) return; fl.classList.remove('on', 'crit', 'kill'); void fl.offsetWidth; if (heavy === 'crit') fl.classList.add('on', 'crit'); else if (heavy === 'kill') fl.classList.add('on', 'kill'); else fl.classList.add('on'); }
    function comboMileFx(v){ if (fxLv() <= 0) return; const el = root.querySelector('.ak-mile'); if (el) { el.textContent = v + ' HIT'; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
      if (fxLv() >= 2) sparks(P.x + P.face * 20, P.y - P.h / 2, '#ffe08a', 6, P.face); }
    function shake(v){ st.shake = Math.max(st.shake, v); }
    const aliveFoes = () => foes.filter(f => !f.dead);
    function nearest(x, y, maxD = 1e9){ let b = null, bd = maxD; for (const f of foes) { if (f.dead) continue; const d = Math.hypot(f.x - x, (f.y - f.h/2) - y); if (d < bd) { bd = d; b = f; } } return b; }
    // —— 伤害：玩家 → 敌人 ——
    function dmgTo(f, mult, o = {}){
      if (f.dead || f.inv > 0) return 0;
      const c = C(); const s = c.s; const k = AC().stat; const ps = pas();
      let base = (k === 'mag' ? s.mag * (1 + buffV('mag')) : s.atk * (1 + buffV('atk'))) * mult * (o.skill ? skillPow(o.lv) * (1 + (s.skillDmg || 0)) : 1);
      if (P.buffs.some(b => b.zoneAtk)) base *= 1.3;
      if (ps.lowHpAtk && c.hp < c.s.hp * 0.4) base *= 1 + ps.lowHpAtk;
      if (ps.airDmg && !P.ground) base *= 1 + ps.airDmg;
      if (ps.comboDmg) base *= 1 + Math.min(0.5, st.combo * ps.comboDmg);
      if (ps.freezeDmg && (f.frozen > 0 || f.slow > 0)) base *= 1 + ps.freezeDmg;
      if (f.def_.boss) base *= 1 + (s.bossDmg || 0); if (f.def_.tier === 1) base *= 1 + (s.eliteDmg || 0);
      if (f.brk > 0) base *= 1.3;
      if (f.def_.ai === 'shield' && !o.skill && !o.launch && Math.sign(P.x - f.x) === f.face && f.guard > 0 && f.state !== 'hurt' && !f.air) { f.guard -= 1; num(f.x, f.y - f.h, '格挡', 'blk'); part(f.x + f.face * 14, f.y - f.h / 2, '#ffffff', 6, 120, 0.25, 2); sfx('hit'); if (f.guard <= 0) { f.stun = 1.4; num(f.x, f.y - f.h - 14, '破盾!', 'crit'); } return 0; }
      let crit = Math.random() < (s.crit || 0.06) + (ps.critPct || 0) + (ps.critBurn && f.burn > 0 ? ps.critBurn : 0); if (HK.consumeWeak(f)) { crit = true; st.eyeMarks = (st.eyeMarks||0)+1; }
      let d = base * 100 / (100 + f.def * 2 * HK.lampDefMul(f)) * rnd(0.92, 1.08); if (crit) d *= 1.6 + (s.critDmg || 0);
      d = Math.max(1, Math.round(d));
      f.hp -= d; f.hitT = 0.12; st.combo++; st.comboT = 2.2; st.maxCombo = Math.max(st.maxCombo, st.combo);
      c.rage = Math.min(100, c.rage + (o.skill ? 1.5 : 3) * (1 + (s.rageGain || 0)));
      if (ps.mpOnHit) c.mp = Math.min(c.s.mp, c.mp + ps.mpOnHit);
      const ls = buffV('lifesteal') + (s.lifesteal || 0); if (ls) heal(d * ls, true);
      { let nk = crit ? 'crit' : o.skill ? 'sk' : (o.el === 'fire' || o.col === '#ff9a4a' || o.col === '#ff7a3a') ? 'fire' : (o.el === 'ice') ? 'ice' : (o.brk || o.lamp) ? 'brk' : 'atk';
      num(f.x + rnd(-8, 8), f.y - f.h - 6, d, nk); }
      part(f.x, f.y - f.h / 2, o.col || '#ffd890', crit ? 10 : 5, crit ? 220 : 140, 0.28, crit ? 2.6 : 2); sparks(f.x + (o.dir || 1) * 8, f.y - f.h / 2, o.col || '#ffd890', crit ? 8 : 4, o.dir || Math.sign(f.x - P.x) || 1); if (fxLv() >= 2) vfx(crit ? 'shards' : 'spark', colEl(o.col || '#ffd890'), f.x, f.y - f.h / 2, crit ? 64 : 40, { life: 0.22, rot: rnd(0, 6) }); if (crit) { shock(f.x, f.y - f.h / 2, 36, '#ffd24a', 0.2); if (fxLv() >= 2) flashHit('crit'); } else if (o.heavy) { shock(f.x, f.y - f.h * 0.4, 24, o.col || '#ffd890', 0.16); }
      st.hitstop = Math.max(st.hitstop, crit ? 0.1 : o.heavy ? 0.09 : 0.055); if (crit || o.heavy) shake(crit ? 6 : 4.5); else if (st.combo >= 10 && st.combo % 5 === 0) shake(2);
      if (o.st) { const [k2, ch] = o.st; if (Math.random() < ch) applyStatus(f, k2, s); }
      if (P.ultT > 0 && ultDef().freezeAll && Math.random() < 0.15) applyStatus(f, 'freeze', s);
      const armor = f.def_.boss ? (f.armorT > 0 || !!f.pat) : (f.def_.tier === 1 && f.state === 'atk');
      const dir = o.dir || Math.sign(f.x - P.x) || 1;
      if (!armor) {
        f.vx = dir * (o.kb != null ? o.kb : 90) * (f.def_.boss ? 0.2 : 1);
        if (o.launch && !f.def_.boss) { f.vy = -o.launch; f.air = true; f.state = 'air'; }
        else if (f.air) { f.vy = Math.min(f.vy, -150); f.vx *= 0.5; }
        else if (f.state !== 'wind' || !f.def_.tier) { f.state = 'hurt'; f.stT = f.def_.boss ? 0.08 : 0.28; }
      } else if (f.def_.boss) { f.poise = (f.poise || 0) + d; if (f.poise > f.max * 0.08) { f.poise = 0; f.stagger = 0.9; f.pat = null; f.stT = 1; tele.length = 0; num(f.x, f.y - f.h - 20, '破韧!', 'crit'); shake(7); } }
      sfx(crit ? 'crit' : 'hit');
      if (f.hp <= 0) kill(f);
      return d;
    }
    function applyStatus(f, k, s){
      if (k === 'burn') { f.burn = 3; f.burnD = Math.max(1, Math.round((s.atk + s.mag) * 0.09 * (1 + (pas().burnDmg || 0)))); }
      else if (k === 'poison') { f.poison = 4; f.poisonD = Math.max(1, Math.round((s.atk + s.mag) * 0.07)); }
      else if (k === 'freeze') { if (!f.def_.boss) f.frozen = 1.4; else f.slow = 2; }
      else if (k === 'stun') { if (!f.def_.boss) f.stun = 1.1; }
      else if (k === 'slow') f.slow = 3; else if (k === 'brk') f.brk = 5; else if (k === 'weak') f.weak = 5; else if (k === 'charm') { if (!f.def_.boss) f.charm = 2.2; }
      num(f.x, f.y - f.h - 20, { burn: '灼烧', poison: '中毒', freeze: '冰封', stun: '眩晕', slow: '迟缓', brk: '破甲', weak: '虚弱', charm: '魅惑' }[k], 'st');
    }
    function heal(n, quiet){ const c = C(); n = Math.round(n * (1 + (pas().healBoost || 0) + (c.s.healBoost || 0))); c.hp = Math.min(c.s.hp, c.hp + n); if (!quiet && n > 0) num(P.x, P.y - P.h - 10, '+' + n, 'heal'); }
    function hurtP(dmg, fromX){
      if (P.iT > 0 || st.over || P.dashT > 0 || T().godmode) return;
      const c = C(); let d = dmg * 100 / (100 + c.s.def * 1.5 * (1 + buffV('def') + (pas().guardDef || 0)));
      const sh = P.buffs.find(b => b.shieldHp > 0); if (sh) { const a = Math.min(sh.shieldHp, d); sh.shieldHp -= a; d -= a; ring(P.x, P.y - P.h / 2, 30, '#ffe7a0', 0.25); }
      d = Math.max(1, Math.round(d)); c.hp -= d; st.hitsTaken++; num(P.x, P.y - P.h - 4, d, 'hurt');
      c.rage = Math.min(100, c.rage + 6 * (pas().guardDef ? 1.5 : 1));
      P.iT = 0.8; shake(6); haptic('medium'); sfx('hurt'); st.combo = 0; flashHit(); part(P.x, P.y - 26, '#ff6a6a', 14, 220, 0.4, 2.5); sparks(P.x, P.y - 26, '#ffffff', 8, Math.sign(P.x - fromX || 1));
      if (!hasFlag('armor')) { P.vx = Math.sign(P.x - fromX || 1) * 220; P.vy = -260; P.ground = false; P.hurtT = 0.35; P.whirl = null; P.beam = null; }
      if (c.hp <= 0) { c.hp = 0; c.alive = false; part(P.x, P.y - 30, '#ffffff', 20, 240, 0.8);
        const nx = roster.findIndex(r => r.alive); if (nx >= 0) { say(CHARS[c.id].name + ' 倒下了'); ri = nx; P.iT = 2; P.ultT = 0; P.buffs = []; refreshHud(true); } else fail('全员倒下'); }
    }
    function kill(f){
      if (f.dead) return; f.dead = true; f.deadT = 0; st.kills++; const kid = f.def_.base || f.def_.id; S.kills[kid] = (S.kills[kid] || 0) + 1;
      { const elc = elTint[f.def_.el] || '#ffffff'; const big = !!f.def_.boss;
        part(f.x, f.y - f.h / 2, elc, big ? 18 : 10, big ? 260 : 180, 0.45, big ? 2.8 : 2.2);
        sparks(f.x, f.y - f.h / 2, elc, big ? 10 : 6, 1);
        if (fxLv() >= 2) { vfx('burst', f.def_.el === 'none' ? 'dark' : f.def_.el, f.x, f.y - f.h / 2, f.h * 1.2, { life: 0.28 }); }
        shock(f.x, f.y - f.h / 2, big ? 55 : 32, elc, 0.22); if (big && fxLv() >= 2) crack(f.x, GY, 90, 0.8);
        if (big) flashHit('kill');
        // 击杀碎裂：残影上飘消散
        if (fxLv() >= 2) for (let gi = 0; gi < (big ? 4 : 2); gi++) fx.push({ k: 'ghostF', x: f.x + rnd(-10, 10), y: f.y - gi * 8, face: f.face, f, t: 0, life: 0.35 + gi * 0.08 });
      }
      if (f.def_.boss) { shake(16); st.hitstop = 0.32; st.slow = 0.22; setTimeout(() => st.slow = 1, 1100); } else if (f.def_.elite || f.max > 400) { st.hitstop = Math.max(st.hitstop, 0.14); st.slow = 0.5; setTimeout(() => { if (st.slow < 0.9) st.slow = 1; }, 320); } else { st.hitstop = Math.max(st.hitstop, 0.06); }
      const lv = stage.lv + lvAdj; const tier = f.def_.boss ? 3 : f.def_.tier || 0;
      const nc = f.def_.boss ? 24 : tier === 1 ? 8 : 2 + Math.floor(Math.random() * 3);
      const gmul = 1 + (C().s.goldBonus || 0) + (stage.reward === 'gold' ? 2 : 0);
      for (let i = 0; i < nc; i++) drop(f, 'gold', Math.max(1, Math.round((2 + lv * 0.9) * gmul)));
      if (Math.random() < (f.def_.boss ? 1 : 0.12)) drop(f, 'orb', 'hp'); if (Math.random() < 0.12) drop(f, 'orb', 'mp');
      for (const [mid, ch] of f.def_.drops || []) if (ITEMS[mid] && Math.random() < ch * (stage.reward === 'mat' ? 2 : 1)) drop(f, 'item', mid);
      const midG = stage.lv >= 28 ? 1.55 : stage.lv >= 18 ? 1.35 : stage.lv >= 14 ? 1.2 : 1;
      const gch = f.def_.boss ? 1 : (tier === 1 ? 0.38 : tier === 2 ? 0.14 : 0.05) * midG * (stage.reward === 'gear' ? 3 : 1);
      if (Math.random() < gch) for (let i = 0; i < (f.def_.boss ? (hard ? 3 : 2) : 1); i++) drop(f, 'item', rollGear(lv, (hard ? 0.08 : 0) + (f.def_.boss ? 0.1 : 0) + (stage.reward === 'gear' ? 0.08 : 0)));
      if (!f.def_.boss && f.def_.base && Math.random() < (0.025 + tier * 0.05) * (stage.reward === 'pet' ? 4 : 1)) drop(f, 'soul', f.def_.base);
      if (st.dream) { st.dust = (st.dust || 0) + (f.def_.boss ? 5 : tier === 1 ? 2 : 1); if (Math.random() < (f.def_.boss ? 0.6 : 0.08 + tier * 0.1)) drop(f, 'soul', f.def_.base || kid); drop(f, 'dust', f.def_.boss ? 3 : 1); }
      st.exp += Math.round((8 + lv * 3) * (tier === 1 ? 3 : tier === 2 ? 1.8 : f.def_.boss ? 12 : 1) * (stage.reward === 'exp' ? 2.5 : 1));
      if (f.def_.ai === 'bomber' && !f.exploded) explode(f, true);
    }
    function drop(f, k, v){ pickups.push({ k, v, x: f.x, y: f.y - f.h / 2, vx: rnd(-180, 180), vy: rnd(-420, -220), t: 0 }); }
    function collect(p){
      if (p.k === 'gold') { st.gold += p.v; sfx('coin'); }
      else if (p.k === 'orb') { if (p.v === 'hp') heal(C().s.hp * 0.15); else C().mp = Math.min(C().s.mp, C().mp + C().s.mp * 0.3); sfx('heal'); }
      else if (p.k === 'item') { st.loot[p.v] = (st.loot[p.v] || 0) + 1; const it = ITEMS[p.v]; num(P.x, P.y - P.h - 16, it?.name || p.v, 'loot' + (it?.rar ?? 0)); sfx('item'); }
      else if (p.k === 'soul') { st.souls[p.v] = (st.souls[p.v] || 0) + 1; num(P.x, P.y - P.h - 16, (AFOES[p.v]?.name || '') + '灵魄', 'loot3'); sfx('item'); }
      else if (p.k === 'dust') { st.dust = (st.dust || 0) + (p.v || 1); num(P.x, P.y - P.h - 16, '梦屑 ×' + (p.v || 1), 'loot2'); sfx('dream'); }
    }
    function spawn(id, x, y){
      const def_ = AFOES[id] || ABOSSES[id]; if (!def_) { console.warn('无此敌', id); return null; }
      const fs = foeStats(def_, stage.lv + lvAdj, hard); const sz = def_.boss ? 1.9 : def_.size || 1;
      const f = { id, def_, x, y: y ?? GY, vx: 0, vy: 0, w: 30 * sz, h: 52 * sz, face: -1, hp: fs.hp, max: fs.hp, atk: fs.atk, def: fs.def, state: 'idle', stT: 0.5 + Math.random() * 0.6, cd: 1 + Math.random(),
        air: false, fly: def_.ai === 'flyer' || def_.ai === 'healer', baseY: GY - 110 - Math.random() * 30, ph: Math.random() * 6, guard: def_.ai === 'shield' ? 5 : 0, inv: 0.4, burn: 0, poison: 0, frozen: 0, stun: 0, slow: 0, brk: 0, weak: 0, charm: 0, phase: 0, armorT: 0, pat: null };
      f.im = !def_.boss && !def_.tier ? regionImg(def_.img, stage.ri || 0) : def_.img; preloadAnim(animKey(f.im)); if (!def_.boss && (def_.el === 'dark' || def_.ai === 'assassin') && Math.random() < 0.35) { f.stealth = true; f.reveal = false; } if (st.dream && !def_.boss) { f.dream = true; f.max = Math.round(f.max * 1.35); f.hp = f.max; f.atk = Math.round(f.atk * 1.15); f.stealth = true; }
      if (f.fly) f.y = f.baseY; if (def_.boss) { st.bossBar = f; hud.boss.classList.add('on'); hud.boss.querySelector('b').textContent = def_.name; }
      foes.push(f); part(x, f.y - f.h / 2, '#222222', 14, 120, 0.6, 5); return f;
    }
    function startArena(a){
      a.started = true; st.locked = true; st.cur = a.i; hud.go.classList.remove('on');
      if (stage.obj === 'guard' && !st.lamp) { st.lamp = { x: a.x0 + 60, hp: 100, max: 100 }; say('守住灯火！'); }
      if (a.boss) { const b = spawn(a.boss, a.x1 - 120); if (b) { say('首领 · ' + b.def_.name, 2.2); playBgm('boss'); shake(10); haptic('heavy'); } }
      else nextWave(a);
    }
    function nextWave(a){
      const pool = (st.dream && a.dreamWaves && a.dreamWaves.length) ? a.dreamWaves : a.waves;
      const wi = a.wave;
      const wv = pool[wi]; if (!wv) return false; a.wave++;
      wv.forEach((id, k) => { const side = k % 3 === 2 ? -1 : 1; const x = side > 0 ? a.x1 - 40 - k * 36 : a.x0 + 30 + k * 10; setTimeout(() => !st.over && spawn(id, clamp(x, a.x0 + 20, a.x1 - 20)), k * 160); });
      a.pend = performance.now() + wv.length * 160 + 50;
      if (pool.length > 1) say((st.dream ? '梦层 ' : '') + `第 ${a.wave} / ${pool.length} 波`, 1);
      return true;
    }
    // —— 玩家动作 ——
    const busy = () => st.over || st.paused || P.hurtT > 0 || P.lock > 0;
    function jump(){ if (busy()) { P.jumpBuf = 0.14; return; }
      const max = 2 + (pas().jumps || 0) + (P.ultT > 0 && ultDef().fly ? 9 : 0);
      const canCoyote = P.coyote > 0 && P.jumps === 0;
      if (P.ground || canCoyote || P.jumps < max) {
        const fromGround = P.ground || canCoyote;
        if (fromGround) P.jumps = 0;
        P.vy = fromGround ? -560 : -500; P.ground = false; P.coyote = 0; P.jumpBuf = 0; P.jumps++;
        part(P.x, P.y, '#ffffff', 5, 80, 0.3, 2); sfx('jump');
        if (P.jumps > 1) ring(P.x, P.y, 16, AC().col, 0.25);
      } else P.jumpBuf = 0.14;
    }
    function dash(){ if (busy() || P.dashCd > 0) { P.dashBuf = 0.12; return; }
      P.dashT = 0.18; P.dashCd = 0.62; P.vx = P.face * 640; P.vy = 0; P.iT = Math.max(P.iT, 0.28); P.dashBuf = 0;
      sfx('dash'); haptic('light'); ring(P.x, P.y - P.h / 2, 18, AC().col, 0.18);
    }
    function attack(){
      if (busy() || P.atkCd > 0 || P.whirl || P.beam) { P.atkBuf = 0.12; return; }
      P.atkBuf = 0;
      const w = WP(); const seq = w.combo; if (P.comboT <= 0) P.combo = 0;
      const step = P.ground ? seq[P.combo % seq.length] : w.air; const [mult, launch, kbx] = step; const fin = P.ground && P.combo % seq.length === seq.length - 1;
      const sp = w.spd * (1 + buffV('spd') * 0.5);
      P.atkT = 0.2 / sp; P.atkCd = (fin ? 0.42 : 0.2) / sp; P.comboT = 0.75; P.combo++;
      if (P.ground) P.vx = P.face * (fin ? 160 : 80);
      sfx('swing');
      const u = P.ultT > 0 ? ultDef() : null;
      if (w.shot || (u && u.wave)) {
        const n = u && u.multi ? u.multi : 1;
        for (let i = 0; i < n; i++) shot({ x: P.x + P.face * 14, y: P.y - P.h * 0.6 - i * 6, vx: P.face * 640, vy: (i - (n - 1) / 2) * 80, r: fin ? 9 : 6, mult: mult * (w.shot ? 1 : 0.7), col: u ? u.aura : AC().col, life: 0.8, pierce: fin, kb: kbx * 10 + 40 });
        if (!w.shot) meleeHit(mult, launch, kbx, fin);
      } else meleeHit(mult, launch, kbx, fin);
      if (u && u.homing) shot({ x: P.x, y: P.y - P.h * 0.7, vx: P.face * 200, vy: -200, r: 6, mult: 0.4, col: '#9cf0b8', life: 1.6, home: true });
    }
    function meleeHit(mult, launch, kb, fin){
      const w = WP(); const reach = w.reach * (P.ultT > 0 && ultDef().scale ? ultDef().scale : 1);
      const hx = P.x + P.face * (reach / 2 + 8), hy = P.y - P.h / 2;
      { const col = P.ultT > 0 ? ultDef().aura : AC().col;
        arc(P.x + P.face * 10, hy, P.face, reach + 10, col, fin ? 0.26 : 0.16, fin ? 1.55 : 1.1);
        if (fxLv() >= 2) { arc(P.x + P.face * 4, hy - 8, P.face, reach * 0.75, '#ffffff', 0.12, 0.7); speedLines(P.face, fin ? 8 : 4); }
        if (fin) { shock(hx, hy, 42, col, 0.28); crack(hx, GY, 60, 0.7); }
        sparks(P.x + P.face * (reach * 0.6), hy, col, fin ? 12 : 5, P.face);
      }
      hitBox(hx, hy, reach + 14, P.h + 18, mult, { launch: launch > 0 ? 430 : 0, kb: kb * 12 + 60, heavy: fin, dir: P.face });
    }
    function hitBox(cx, cy, w, hh, mult, o = {}){ let n = 0; for (const f of foes) { if (f.dead) continue; if (Math.abs(f.x - cx) < (w + f.w) / 2 && Math.abs((f.y - f.h / 2) - cy) < (hh + f.h) / 2) { if (dmgTo(f, mult, o)) n++; } } return n; }
    function hitCircle(cx, cy, r, mult, o = {}){ let n = 0; for (const f of foes) { if (f.dead) continue; if (Math.hypot(f.x - cx, (f.y - f.h / 2) - cy) < r + f.w / 2) { if (dmgTo(f, mult, { ...o, dir: Math.sign(f.x - cx) || 1 })) n++; } } return n; }
    function shot(o){ if (shots.length > 140) return; shots.push({ owner: 'p', t: 0, hit: new Set(), ...o }); }
    function useSkill(i){
      if (busy() || P.whirl || P.beam || P.slamming) return; const c = C(); const sid = slotsOf(c.id)[i]; const k = ASKILLS[sid]; if (!k) return;
      if ((c.cds[sid] || 0) > 0) return; if (c.mp < k.mp) { say('法力不足', 0.8); return; }
      c.mp -= k.mp; P.castT = 0.36; const lv = skillLv(c.id, sid); c.cds[sid] = k.cd * skillCd(lv) * (1 - (c.s.cdr || 0)); const o = { skill: true, lv, st: k.st, col: EL_COLOR[k.el] || AC().col };
      const pw = k.pow || 1; const F = P.face; { const E = k.el in EL_SET ? k.el : colEl(o.col); const T = { heal: 'heal', summon: 'rune', field: 'rune', buff: 'rune', blink: 'smoke', quake: 'shock', slam: 'swirl', pull: 'swirl', beam: 'bolt', rain: 'rune', nova: 'shards', whirl: 'swirl', ult: 'rune', dash: 'slash', proj: 'bolt' }[k.type];
        if (T && fxLv() >= 2) vfx(T, E, P.x, T === 'shock' ? GY - 6 : P.y - P.h / 2, T === 'rune' ? 100 : 90, { life: 0.35, face: F });
        part(P.x, P.y - 28, o.col, 8, 140, 0.35, 2.2);
        // 元素色专属（克制：单色火花/短冲击，不叠金环）
        if (E === 'fire' || k.el === 'fire') { sparks(P.x, GY - 10, '#ff9a4a', 8, F); }
        else if (E === 'thunder' || E === 'lightning' || k.el === 'thunder') { sparks(P.x, P.y - 40, '#9fe8ff', 8, F); }
        else if (E === 'light' || k.el === 'light' || k.el === 'lamp') { sparks(P.x, P.y - 30, '#ffe7a0', 8, F); }
        else if (E === 'ice' || k.el === 'ice' || k.el === 'dream') { sparks(P.x, P.y - 30, '#b8e4ff', 7, F); }
        else if (E === 'dark' || k.el === 'dark' || k.el === 'eye') { sparks(P.x, P.y - 36, '#ff8a9a', 7, F); }
      }
      sfx('skill'); haptic('light'); say(k.name, 0.7); st.skillUsed = (st.skillUsed || 0) + 1;
      switch (k.type) {
        case 'dash': { if (k.dist < 0) { P.vx = -F * 600; P.vy = -300; P.ground = false; P.iT = 0.35; shot({ x: P.x, y: P.y - 30, vx: F * 700, vy: 0, r: 8, mult: pw * 1.4, col: o.col, life: 0.8, pierce: true, sk: o }); break; }
          P.dashT = Math.abs(k.dist) / 900; P.vx = F * 900; if (k.air) P.vy = 0; P.iT = P.dashT + 0.1; const x0 = P.x; speedLines(F, 10);
          setTimeout(() => { if (st.over) return; const x1 = P.x; hitBox((x0 + x1) / 2, P.y - P.h / 2, Math.abs(x1 - x0) + 40, P.h + 20, pw, { ...o, kb: 160, heavy: true, dir: F }); fx.push({ k: 'line', x0, x1, y: P.y - P.h / 2, col: o.col, t: 0, life: 0.3 }); }, P.dashT * 1000); break; }
        case 'proj': { const n = k.n || 1; for (let j = 0; j < n; j++) { const a = n > 1 ? (j / (n - 1) - 0.5) * (k.spread || 0.3) : 0; shot({ x: P.x + F * 16, y: P.y - P.h * 0.6, vx: Math.cos(a) * F * k.spd, vy: Math.sin(a) * k.spd, r: k.big ? 13 : 7, mult: pw, col: o.col, life: 1.4, pierce: k.pierce, home: k.home, boom: k.boom, sk: o }); } break; }
        case 'nova': { hitCircle(P.x, P.y - P.h / 2, k.r, pw, { ...o, kb: 220, heavy: true }); shock(P.x, P.y - P.h / 2, Math.min(k.r * 0.7, 70), o.col, 0.28); part(P.x, P.y - 30, o.col, 14, 220, 0.4, 2.6); shake(5); break; }
        case 'rain': { const px = P.x; for (let j = 0; j < k.n; j++) setTimeout(() => { if (st.over) return; const x = px + F * (30 + Math.random() * k.area); shot({ x, y: -20, vx: rnd(-30, 30), vy: 620, r: 8, mult: pw, col: o.col, life: 1.2, boom: k.boom || 0, rain: true, sk: o }); }, j * 70); break; }
        case 'beam': { P.beam = { t: 0, dur: k.dur, tick: 0, k, o, pw }; P.lock = k.dur; break; }
        case 'quake': { const dirs = k.dir === 2 ? [1, -1] : [F]; const px = P.x; for (const d of dirs) for (let j = 0; j < k.n; j++) setTimeout(() => { if (st.over) return; const x = px + d * (40 + j * 52); hitBox(x, GY - 26, 50, 60, pw, { ...o, kb: 120 * (k.kb || 1), launch: 260, dir: d }); fx.push({ k: 'spike', x, y: GY, col: o.col, t: 0, life: 0.45 }); shock(x, GY - 4, 36, o.col, 0.28); crack(x, GY, 48, 0.7); shake(3); }, j * 110); break; }
        case 'buff': { const b = { t: k.dur, name: k.name, ...k.buff }; if (k.buff.shield) b.shieldHp = c.s.hp * k.buff.shield; P.buffs = P.buffs.filter(x => x.name !== k.name); P.buffs.push(b); ring(P.x, P.y - P.h / 2, 40, o.col, 0.5); part(P.x, P.y - 30, o.col, 16, 140, 0.7); break; }
        case 'heal': { heal(c.s.hp * k.heal); if (k.team) for (const r of roster) if (r !== c && r.alive) r.hp = Math.min(r.s.hp, r.hp + r.s.hp * k.heal); if (k.mp) c.mp = Math.min(c.s.mp, c.mp + c.s.mp * k.mp); part(P.x, P.y - 30, '#8fe0a0', 20, 120, 0.8); break; }
        case 'summon': { allies.push({ what: k.what, x: P.x - F * 20, t: k.dur, cd: 0.3, pw, o, face: F }); ring(P.x, GY - 10, 30, o.col, 0.5); break; }
        case 'upper': { hitBox(P.x + F * 26, P.y - P.h / 2, 60, P.h + 30, pw, { ...o, launch: k.launch, kb: 40, heavy: true, dir: F }); P.vy = -480; P.ground = false; arc(P.x, P.y - P.h, F, 50, o.col, 0.25, 1.6); break; }
        case 'slam': { P.vy = -520; P.vx = F * (k.leap || 200) * 1.6; P.ground = false; P.slamming = { k, o, pw }; P.iT = 0.6; break; }
        case 'field': { zones.push({ x: P.x, r: k.r, t: 0, dur: k.dur, tick: 0, k, o, pw }); ring(P.x, GY - 10, k.r, o.col, 0.6); break; }
        case 'whirl': { P.whirl = { t: 0, n: 0, k, o, pw, mv: (k.move || 0) * F }; P.lock = k.hits * 0.11; P.iT = P.lock; break; }
        case 'blink': { const f = nearest(P.x, P.y - 30, 360); if (f) { part(P.x, P.y - 30, o.col, 14, 160, 0.4); P.x = f.x - f.face * (f.w / 2 + 20); P.face = Math.sign(f.x - P.x) || 1; P.iT = 0.4; dmgTo(f, pw, { ...o, heavy: true, kb: 160 }); arc(f.x, f.y - f.h / 2, P.face, 50, o.col, 0.25, 1.5); } else { P.vx = F * 700; P.dashT = 0.15; } break; }
        case 'pull': { for (const f of foes) { if (f.dead || f.def_.boss) continue; if (Math.abs(f.x - P.x) < k.r) f.x += (P.x + F * 30 - f.x) * 0.75; } hitCircle(P.x + F * 30, P.y - P.h / 2, 70, pw, { ...o, kb: 30 }); ring(P.x, P.y - P.h / 2, k.r, o.col, 0.4); break; }
      }
    }
    function ult(){ const c = C(); if (busy() || c.rage < 100 || P.ultT > 0) return; if (!ultOk(c.id)) { say(`${ULT_LV} 级解锁变身`); return; } c.rage = 0; const u = ultDef(); P.ultT = u.dur; P.iT = 1.2; shake(10); st.hitstop = 0.3; haptic('heavy'); sfx('ult');
      shock(P.x, P.y - P.h / 2, 70, u.aura, 0.35); part(P.x, P.y - 30, u.aura, 16, 200, 0.5, 2.6); hitCircle(P.x, P.y - P.h / 2, 150, 2.5, { skill: true, heavy: true, kb: 260, col: u.aura }); say(u.name + '！', 1.8); S.stats.ults = (S.stats.ults || 0) + 1; st.ults = (st.ults || 0) + 1; }
    function swap(){ if (roster.length < 2 || P.swapCd > 0 || st.over) return; let n = ri; for (let k = 1; k < roster.length; k++) { const j = (ri + k) % roster.length; if (roster[j].alive) { n = j; break; } } if (n === ri) return;
      ri = n; P.swapCd = 2.5; P.ultT = 0; P.buffs = []; P.iT = 0.6; HK.onSwapReso(hk()); part(P.x, P.y - 30, AC().col, 20, 200, 0.5); ring(P.x, P.y - 30, 50, AC().col, 0.4);
      hitCircle(P.x, P.y - P.h / 2, 80, 1.2, { kb: 200 }); say('换人 · ' + CHARS[C().id].name, 0.9); refreshHud(true); sfx('skill'); }
    function potion(){ if (st.potions <= 0 || st.over) return; st.potions--; heal(C().s.hp * 0.4); C().mp = Math.min(C().s.mp, C().mp + C().s.mp * 0.4); part(P.x, P.y - 30, '#8fe0a0', 20, 140, 0.8); }
    // —— 更新：玩家 ——
    function onPlat(x, yPrev, yNow){ for (const a of arenas) for (const p of a.plats || []) if (x > p.x && x < p.x + p.w && yPrev <= p.y + 1 && yNow >= p.y) return p.y; return null; }
    function updPlayer(dt){
      const c = C(); const ps = pas();
      P.iT -= dt; P.dashCd -= dt; P.atkT -= dt; P.atkCd -= dt; P.comboT -= dt; P.hurtT -= dt; P.castT = (P.castT || 0) - dt; P.lock -= dt; P.swapCd -= dt;
      for (const r of roster) { for (const k in r.cds) r.cds[k] = Math.max(0, r.cds[k] - dt); if (r.alive) r.mp = Math.min(r.s.mp, r.mp + dt * (2.2 + (r.s.mpRegen || 0) * 2) * (r === c ? 1 : 1.5)); if (r !== c && r.alive) r.hp = Math.min(r.s.hp, r.hp + r.s.hp * 0.01 * dt); }
      if (P.ultT > 0) { P.ultT -= dt; const u = ultDef(); if (u.regen) heal(c.s.hp * u.regen * dt, true); if (u.burnAura && st.t % 0.5 < dt) hitCircle(P.x, P.y - P.h / 2, 70, 0.3, { skill: true, kb: 20, st: ['burn', 0.3], col: u.aura }); if (P.ultT <= 0) say('变身结束', 0.8); }
      for (const b of P.buffs) { b.t -= dt; if (b.regen) heal(c.s.hp * b.regen * dt, true); if (b.burnAura && st.t % 0.5 < dt) hitCircle(P.x, P.y - P.h / 2, 60, 0.3, { skill: true, kb: 10, st: ['burn', 0.4] }); if (b.cleanse) { b.cleanse = 0; } }
      P.buffs = P.buffs.filter(b => b.t > 0);
      if (st.dreamCd > 0) st.dreamCd -= dt;
      HK.tickLamp(hk(), dt); HK.tickEye(hk(), dt); HK.tickReso(hk(), dt);
      const spd = 210 * (1 + buffV('spd') + (ps.runSpd || 0)) * (P.buffs.some(b => b.slowP) ? 0.6 : 1);
      if (P.dashT > 0) { P.dashT -= dt; if (P.ultT <= 0 || !ultDef().fly) P.vy = Math.min(P.vy, 0); if (st.t % 0.03 < dt) { fx.push({ k: 'ghost', x: P.x, y: P.y, face: P.face, id: c.id, t: 0, life: 0.32 }); if (fxLv() >= 2) speedLines(P.face, 3); } }
      else if (P.hurtT <= 0 && P.lock <= 0) { const mv = (keys.r ? 1 : 0) - (keys.l ? 1 : 0); if (mv) P.face = mv; const tgt = mv * spd; P.vx += (tgt - P.vx) * Math.min(1, dt * (P.ground ? 14 : 6)); }
      else P.vx *= Math.pow(0.02, dt);
      if (P.whirl) { const w = P.whirl; w.t += dt; P.vx = w.mv; if (w.t > w.n * 0.11) { w.n++; hitCircle(P.x, P.y - P.h / 2, w.k.r, w.pw, { ...w.o, kb: 40 }); arc(P.x, P.y - P.h / 2, w.n % 2 ? 1 : -1, w.k.r, w.o.col, 0.12, 1.6); } if (w.n >= w.k.hits) P.whirl = null; }
      if (P.beam) { const b = P.beam; b.t += dt; b.tick -= dt; P.vx = 0; P.vy = Math.min(P.vy, 30); if (b.tick <= 0) { b.tick = b.k.tick || 0.1; const len = b.k.len || 320; hitBox(P.x + P.face * len / 2, P.y - P.h * 0.6, len, 26, b.pw, { ...b.o, kb: 30, dir: P.face }); } if (b.t >= b.dur) P.beam = null; }
      const fly = P.ultT > 0 && ultDef().fly;
      P.vy += GRAV * dt * (fly && keys.u ? 0.25 : 1) * (P.slamming && P.vy > 0 ? 2.2 : 1);
      const yPrev = P.y; P.x += P.vx * dt; P.y += P.vy * dt;
      const minX = st.locked && st.cur >= 0 ? arenas[st.cur].x0 + 12 : 12; const maxX = st.locked && st.cur >= 0 ? arenas[st.cur].x1 - 12 : worldEnd;
      P.x = clamp(P.x, minX, maxX);
      let land = null; if (P.y >= GY) land = GY; else if (P.vy > 0 && !keys.d) land = onPlat(P.x, yPrev, P.y);
      if (land != null) { if (!P.ground && P.vy > 300) part(P.x, land, '#d8cfb8', 6, 90, 0.3, 2); P.y = land; P.vy = 0; if (!P.ground) P.jumps = 0; P.ground = true; P.coyote = 0.1;
        if (P.slamming) { const s = P.slamming; P.slamming = null; hitCircle(P.x, P.y - 20, s.k.r || 110, s.pw, { ...s.o, kb: 220, launch: 300, heavy: true }); ring(P.x, P.y - 4, s.k.r || 110, s.o.col, 0.4); fx.push({ k: 'spike', x: P.x, y: GY, col: s.o.col, t: 0, life: 0.4 }); shake(9); sfx('boom'); } }
      else if (P.y < GY) { if (P.ground && !onPlat(P.x, P.y - 2, P.y + 2) && P.y < GY - 1) P.ground = false; }
      if (P.ground && P.y < GY && !onPlat(P.x, P.y - 2, P.y + 3)) { P.ground = false; P.coyote = 0.1; }
      // 落地缓冲 / 输入缓冲：跳跃·冲刺·攻击
      P.coyote = P.ground ? 0.1 : Math.max(0, P.coyote - dt);
      P.jumpBuf = Math.max(0, P.jumpBuf - dt); P.dashBuf = Math.max(0, P.dashBuf - dt); P.atkBuf = Math.max(0, P.atkBuf - dt);
      if (P.jumpBuf > 0 && (P.ground || P.coyote > 0)) jump();
      if (P.dashBuf > 0 && P.dashCd <= 0 && !busy()) dash();
      if ((keys.atk || P.atkBuf > 0) && P.atkCd <= 0) attack();
      // 召唤物、宠物
      for (const a of allies) { a.t -= dt; a.cd -= dt; const tg = nearest(a.x, GY - 30, 420); if (tg) { a.face = Math.sign(tg.x - a.x) || a.face; const melee = a.what === 'leopard'; if (melee) { if (Math.abs(tg.x - a.x) > 34) a.x += a.face * 230 * dt; else if (a.cd <= 0) { a.cd = 0.6; dmgTo(tg, a.pw, { ...a.o, kb: 80 }); arc(a.x, GY - 24, a.face, 30, a.o.col, 0.15); } }
        else { a.x += (P.x - P.face * 34 - a.x) * dt * 3; if (a.cd <= 0) { a.cd = a.what === 'clone' ? 0.5 : 0.9; shots.push({ owner: 'p', x: a.x, y: GY - 34, vx: a.face * 520, vy: 0, r: 6, mult: a.pw, col: a.o.col, life: 1, hit: new Set(), t: 0, sk: a.o, st: a.what === 'icefox' ? ['freeze', 0.2] : null }); } } }
        else a.x += (P.x - P.face * 34 - a.x) * dt * 3; }
      for (let i = allies.length - 1; i >= 0; i--) if (allies[i].t <= 0) { part(allies[i].x, GY - 20, '#ffffff', 10, 100, 0.4); allies.splice(i, 1); }
      if (pet) { pet.x += (P.x - P.face * 40 - pet.x) * dt * 4; pet.y += (P.y - 74 + Math.sin(st.t * 3) * 6 - pet.y) * dt * 4; pet.cd -= dt; const tg = nearest(pet.x, pet.y, 380);
        if (tg) { pet.face = Math.sign(tg.x - pet.x) || 1; if (pet.cd <= 0) { pet.cd = 1.3; const a = Math.atan2(tg.y - tg.h / 2 - pet.y, tg.x - pet.x); shots.push({ owner: 'p', x: pet.x, y: pet.y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, r: 6, mult: 0, pet: pet.pow, col: elTint[pet.d.el], life: 1, hit: new Set(), t: 0 }); } } }
      // 领域
      for (const z of zones) { z.t += dt; z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; hitCircle(z.x, GY - 30, z.k.r, z.pw, { ...z.o, kb: 0 }); if (z.k.slow) for (const f of foes) if (!f.dead && Math.abs(f.x - z.x) < z.k.r) f.slow = Math.max(f.slow, 0.6); if (z.k.heal && Math.abs(P.x - z.x) < z.k.r) heal(c.s.hp * z.k.heal, true); if (z.k.drain) for (const f of foes) if (!f.dead && Math.abs(f.x - z.x) < z.k.r) heal(c.s.hp * 0.004 * z.k.drain * 10, true); } }
      for (let i = zones.length - 1; i >= 0; i--) if (zones[i].t >= zones[i].dur) zones.splice(i, 1);
    }
    // —— 飞行道具 ——
    function eShot(f, x, y, a, sp, mult = 1, r = 7, o = {}){ if (shots.length > 160) return; shots.push({ owner: 'e', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, dmg: f.atk * mult * (f.weak > 0 ? 0.7 : 1), col: elTint[f.def_.el] || '#ff6060', life: 3, t: 0, ...o }); }
    function updShots(dt){
      for (const s of shots) {
        s.t += dt; if (s.grav) s.vy += 900 * dt;
        if (s.home && s.owner === 'p') { const f = nearest(s.x, s.y, 400); if (f) { const a = Math.atan2(f.y - f.h / 2 - s.y, f.x - s.x); const sp = Math.hypot(s.vx, s.vy) || 400; const cur = Math.atan2(s.vy, s.vx); let d = a - cur; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; const na = cur + clamp(d, -dt * 5, dt * 5); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; } }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.owner === 'p') {
          for (const f of foes) { if (f.dead || s.hit.has(f)) continue; if (Math.abs(f.x - s.x) < f.w / 2 + s.r && Math.abs(f.y - f.h / 2 - s.y) < f.h / 2 + s.r) {
            s.hit.add(f); if (s.pet) petHit(f, s.pet, s.col); else dmgTo(f, s.mult, { ...(s.sk || {}), st: s.st || s.sk?.st, kb: s.kb ?? 70, dir: Math.sign(s.vx) || 1 });
            if (s.boom) { hitCircle(s.x, s.y, s.boom, s.mult * 0.6, { ...(s.sk || {}), kb: 120 }); ring(s.x, s.y, s.boom, s.col, 0.3); sfx('boom'); }
            if (!s.pierce) { s.dead = true; break; } } }
          if (s.rain && s.y >= GY - 4) { s.dead = true; if (s.boom) { hitCircle(s.x, GY - 10, s.boom, s.mult * 0.6, { ...(s.sk || {}), kb: 80 }); ring(s.x, GY - 6, s.boom, s.col, 0.3); } part(s.x, GY, s.col, 6, 120, 0.3); }
        } else {
          if (Math.abs(P.x - s.x) < P.w / 2 + s.r && Math.abs(P.y - P.h / 2 - s.y) < P.h / 2 + s.r) { hurtP(s.dmg, s.x); s.dead = true; part(s.x, s.y, s.col, 6, 100, 0.3); }
          if (s.ground && s.y >= GY - 4) { s.y = GY - 8; s.vy = 0; }
        }
        if (s.t > s.life || s.y > GY + 40 || s.x < -50 || s.x > worldEnd + 100) s.dead = true;
      }
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].dead) shots.splice(i, 1);
    }
    function petHit(f, pow, col){ const d = Math.max(1, Math.round(pow * 100 / (100 + f.def * 2) * rnd(0.9, 1.1))); f.hp -= d; f.hitT = 0.1; num(f.x, f.y - f.h - 4, d, 'pet'); part(f.x, f.y - f.h / 2, col, 5, 120, 0.3); if (f.hp <= 0) kill(f); }
    // —— 敌人 AI ——
    function frontHit(f, reach, mult){ if (Math.abs(P.x - (f.x + f.face * reach / 2)) < reach / 2 + P.w / 2 + f.w / 4 && Math.abs((P.y - P.h / 2) - (f.y - f.h / 2)) < f.h / 2 + P.h / 2) hurtP(f.atk * mult * (f.weak > 0 ? 0.7 : 1), f.x); arc(f.x + f.face * 6, f.y - f.h / 2, f.face, reach, elTint[f.def_.el] || '#ff6060', 0.15); }
    function explode(f, dead){ f.exploded = true; ring(f.x, f.y - f.h / 2, 80, '#ff8a3a', 0.4); part(f.x, f.y - f.h / 2, '#ffb060', 24, 260, 0.6, 4); shake(7); sfx('boom'); if (Math.hypot(P.x - f.x, (P.y - 26) - (f.y - f.h / 2)) < 86) hurtP(f.atk * 2, f.x); if (!dead) { f.hp = 0; kill(f); } }
    function updFoe(f, dt){
      if (f.dead) { f.deadT += dt; return; }
      f.inv -= dt; f.hitT -= dt; f.armorT -= dt; f.cd -= dt * (f.slow > 0 ? 0.5 : 1);
      for (const k of ['frozen', 'stun', 'slow', 'brk', 'weak', 'charm']) if (f[k] > 0) f[k] -= dt;
      if (f.burn > 0) { f.burn -= dt; f.bT = (f.bT || 0) - dt; if (f.bT <= 0) { f.bT = 0.5; f.hp -= f.burnD; num(f.x, f.y - f.h, f.burnD, 'burn'); if (f.hp <= 0) return kill(f); } }
      if (f.poison > 0) { f.poison -= dt; f.pT = (f.pT || 0) - dt; if (f.pT <= 0) { f.pT = 0.5; f.hp -= f.poisonD; num(f.x, f.y - f.h, f.poisonD, 'poison'); if (f.hp <= 0) return kill(f); } }
      const a = st.cur >= 0 ? arenas[st.cur] : null;
      // 物理
      if (!f.fly || f.air) { f.vy += GRAV * dt; f.y += f.vy * dt; if (f.y >= GY) { if (f.air && f.vy > 380) { f.vy = -f.vy * 0.3; part(f.x, GY, '#d8cfb8', 5, 80, 0.3); } else { f.vy = 0; if (f.air) { f.air = false; f.state = 'down'; f.stT = 0.35; if (f.fly) f.y = GY; } } if (f.y > GY) f.y = GY; } }
      f.x += f.vx * dt; f.vx *= Math.pow(f.air ? 0.4 : 0.004, dt);
      if (a) f.x = clamp(f.x, a.x0 + 10, a.x1 - 10);
      if (f.fly && !f.air && f.state !== 'dive' && f.state !== 'down') f.y += (f.baseY + Math.sin(st.t * 2 + f.ph) * 10 - f.y) * Math.min(1, dt * 3);
      if (f.fly && f.state === 'down') { f.stT -= dt; if (f.stT <= 0) f.state = 'idle'; return; }
      if (f.frozen > 0 || f.stun > 0 || f.stagger > 0) { if (f.stagger > 0) f.stagger -= dt; return; }
      if (f.air) return;
      if (f.def_.boss) return updBoss(f, dt);
      f.stT -= dt; const dx = P.x - f.x, adx = Math.abs(dx); const ai = f.def_.ai; const sp = f.def_.spd * (f.slow > 0 ? 0.5 : 1) * (hard ? 1.15 : 1);
      if (f.charm > 0) { f.face = -Math.sign(dx) || 1; f.x += f.face * sp * 0.6 * dt; return; }
      let tx = P.x; if (st.lamp && Math.abs(st.lamp.x - f.x) < adx) tx = st.lamp.x; const tdx = tx - f.x;
      switch (f.state) {
        case 'hurt': case 'down': if (f.stT <= 0) { f.state = 'idle'; f.stT = 0.2; } break;
        case 'idle': {
          if (f.state !== 'wind') f.face = Math.sign(tdx) || f.face;
          const want = ai === 'ranged' ? 200 : ai === 'summoner' || ai === 'healer' ? 240 : ai === 'charger' ? 180 : 34 + f.w / 2;
          if (ai === 'flyer' || ai === 'healer') { const hx = tx - f.face * (ai === 'healer' ? 200 : 90); f.x += clamp(hx - f.x, -1, 1) * sp * dt; }
          else if (Math.abs(tdx) > want + 8) f.x += Math.sign(tdx) * sp * dt; else if ((ai === 'ranged' || ai === 'summoner') && Math.abs(tdx) < want - 60) f.x -= Math.sign(tdx) * sp * 0.8 * dt;
          if (f.cd <= 0 && (Math.abs(tdx) < want + 30 || ai === 'ranged' || ai === 'summoner' || ai === 'healer' || ai === 'flyer')) { f.state = 'wind'; f.stT = (ai === 'charger' ? 0.65 : ai === 'bomber' ? 0.55 : 0.45) * (hard ? 0.8 : 1); f.face = Math.sign(tdx) || f.face; }
          if (st.lamp && Math.abs(st.lamp.x - f.x) < 36) { st.lamp.hp -= dt * (f.def_.tier ? 7 : 4); f.lampT = (f.lampT || 0) - dt; }
          break; }
        case 'wind': if (f.stT <= 0) { f.state = 'atk'; f.stT = 0.3;
          if (ai === 'melee' || ai === 'shield') { frontHit(f, 46 + f.w / 2, 1); f.vx = f.face * 120; sfx('swing'); }
          else if (ai === 'charger') { f.state = 'charge'; f.stT = 0.7; }
          else if (ai === 'ranged') { const ang = Math.atan2((P.y - 30) - (f.y - f.h / 2), dx); eShot(f, f.x, f.y - f.h / 2, ang, 300, 0.9); if (f.def_.tier) { eShot(f, f.x, f.y - f.h / 2, ang - 0.2, 300, 0.7); eShot(f, f.x, f.y - f.h / 2, ang + 0.2, 300, 0.7); } }
          else if (ai === 'flyer') { f.state = 'dive'; f.stT = 0.7; f.dv = { x: P.x, y: P.y - 20 }; }
          else if (ai === 'summoner') { if (aliveFoes().length < 8) { const id = (a && a.waves[0] || []).find(x => AFOES[x] && AFOES[x].ai !== 'summoner') || 'yegui'; for (let k = 0; k < (f.def_.tier ? 2 : 1); k++) spawn(id, f.x + (k ? 30 : -30)); ring(f.x, f.y - f.h / 2, 50, '#a070ff', 0.4); } else eShot(f, f.x, f.y - f.h / 2, Math.atan2((P.y - 30) - (f.y - f.h / 2), dx), 220, 1, 9, { home: false }); }
          else if (ai === 'healer') { const low = aliveFoes().filter(o => o !== f && o.hp < o.max).sort((p, q) => p.hp / p.max - q.hp / q.max)[0]; if (low) { low.hp = Math.min(low.max, low.hp + low.max * 0.15); ring(low.x, low.y - low.h / 2, 30, '#8fe0a0', 0.4); num(low.x, low.y - low.h, '+' + Math.round(low.max * 0.15), 'heal'); } else eShot(f, f.x, f.y - f.h / 2, Math.atan2((P.y - 30) - (f.y - f.h / 2), dx), 260, 0.8); }
          else if (ai === 'bomber') { explode(f); }
          f.cd = (ai === 'summoner' ? 5 : ai === 'healer' ? 3.2 : ai === 'ranged' ? 2.2 : 1.5) * rnd(0.8, 1.3) * (hard ? 0.8 : 1);
        } break;
        case 'charge': f.stT -= 0; f.x += f.face * 430 * dt; if (Math.abs(P.x - f.x) < f.w / 2 + 12 && Math.abs((P.y - 26) - (f.y - f.h / 2)) < f.h / 2 + 20) { hurtP(f.atk * 1.3, f.x); f.stT = 0; } if (st.t % 0.05 < dt) part(f.x, GY, '#d8cfb8', 2, 60, 0.3); if (f.stT <= 0 || (a && (f.x <= a.x0 + 12 || f.x >= a.x1 - 12))) { f.state = 'hurt'; f.stT = 0.6; } break;
        case 'dive': { const d = f.dv; const ang = Math.atan2(d.y - f.y, d.x - f.x); f.x += Math.cos(ang) * 420 * dt; f.y += Math.sin(ang) * 420 * dt; if (Math.abs(P.x - f.x) < 24 && Math.abs((P.y - 26) - f.y) < 34) { hurtP(f.atk * 1.1, f.x); f.stT = 0; } if (f.stT <= 0 || Math.hypot(d.x - f.x, d.y - f.y) < 12 || f.y > GY - 10) { f.state = 'hurt'; f.stT = 0.5; } break; }
        case 'atk': if (f.stT <= 0) { f.state = 'idle'; } break;
        default: f.state = 'idle';
      }
      if (ai === 'shield' && f.guard < 5 && f.state === 'idle') f.guardT = (f.guardT || 0) + dt, f.guardT > 3 && (f.guard++, f.guardT = 0);
    }
    // —— 首领：多阶段 + 预警 ——
    function tel(o){ const w = o.warn != null ? o.warn : 0.7; tele.push({ t: 0, fired: false, col: '#ff4040', ...o, warn: st.eyeOn ? Math.max(0.25, w * 0.55) : w, eyeEarly: !!st.eyeOn }); }
    function telHitsP(tl){ const px = P.x, py = P.y - P.h / 2; if (tl.shape === 'rect') return Math.abs(px - tl.x) < tl.w / 2 + P.w / 2 && Math.abs(py - tl.y) < tl.h / 2 + P.h / 2; return Math.hypot(px - tl.x, py - tl.y) < tl.r + P.w / 2; }
    function updTele(dt){ for (const tl of tele) { tl.t += dt; if (!tl.fired && tl.t >= tl.warn) { tl.fired = true; if (telHitsP(tl)) hurtP(tl.dmg, tl.x); tl.fx ? tl.fx(tl) : (tl.shape === 'rect' ? fx.push({ k: 'slab', x: tl.x, y: tl.y, w: tl.w, h: tl.h, col: tl.col, t: 0, life: 0.25 }) : ring(tl.x, tl.y, tl.r, tl.col, 0.3)); shake(tl.big ? 8 : 4); } }
      for (let i = tele.length - 1; i >= 0; i--) if (tele[i].t > tele[i].warn + 0.2) tele.splice(i, 1); }
    function bossPhase(f){ const n = f.def_.pat.length; const r = f.hp / f.max; return n >= 3 ? (r < 0.33 ? 2 : r < 0.66 ? 1 : 0) : (r < 0.5 ? 1 : 0); }
    function updBoss(f, dt){
      const ph = bossPhase(f); const a = arenas[st.cur];
      if (ph > f.phase) { f.phase = ph; f.inv = 1.4; f.pat = null; tele.length = 0; f.armorT = 1.4; const phTxt = ['', '第二阶段 · 怒', '最终阶段 · 狂'][ph] || '狂暴'; say(phTxt, 1.6); const pe = root.querySelector('.ak-phase'); if (pe) { pe.textContent = phTxt; pe.classList.remove('on'); void pe.offsetWidth; pe.classList.add('on'); } shake(8); haptic('heavy');
        const elc = elTint[f.def_.el] || '#ff6a4a';
        ring(f.x, f.y - f.h / 2, 220, elc, 0.95); ring(f.x, f.y - f.h / 2, 140, '#ffffff', 0.5); shock(f.x, GY - 4, 160, elc, 0.6);
        part(f.x, f.y - f.h / 2, elc, 14, 220, 0.45, 2.4); sparks(f.x, f.y - f.h / 2, '#ffffff', 8, 1);
        if (fxLv() >= 2) vfx('burst', f.def_.el || 'dark', f.x, f.y - f.h / 2, f.h * 1.3, { life: 0.35 });
        if (Math.hypot(P.x - f.x, P.y - f.y) < 130) { P.vx = Math.sign(P.x - f.x || 1) * 420; P.vy = -300; P.ground = false; }
        for (const m of f.def_.minions.slice(0, 1 + ph)) spawn(m, clamp(f.x + rnd(-160, 160), a.x0 + 30, a.x1 - 30)); hud.boss.querySelector('.ak-ph').textContent = '阶段 ' + (ph + 1); return; }
      const dx = P.x - f.x; const spdM = (1 + f.phase * 0.18) * (hard ? 1.15 : 1);
      if (!f.pat) {
        f.face = Math.sign(dx) || f.face;
        if (Math.abs(dx) > 120) f.x += Math.sign(dx) * 70 * spdM * dt;
        if (f.cd <= 0) { const pool = f.def_.pat.slice(0, f.phase + 1).flat(); let k = pool[Math.floor(Math.random() * pool.length)]; if (k === f.lastPat && pool.length > 1) k = pool[(pool.indexOf(k) + 1) % pool.length]; if (k === 'summon' && aliveFoes().length > 5) k = 'slash'; f.lastPat = k; f.pat = { k, t: 0, step: 0 }; say(f.def_.name + ' · ' + ({ slash: '连斩', charge: '冲撞', slam: '跃击', fan: '弹幕', rain: '天降', summon: '召唤', beam: '光束', spin: '旋身', blink: '瞬移', pillar: '地刺', nova: '环爆' })[k], 0.9); }
        return;
      }
      const p = f.pat; p.t += dt; const atk = f.atk; const cy = f.y - f.h / 2; const col = elTint[f.def_.el] || '#ff4040';
      const end = (cd = 1.6) => { f.pat = null; f.cd = cd / spdM * rnd(0.85, 1.15); };
      switch (p.k) {
        case 'slash': if (p.step < 3 && p.t > p.step * 0.45 / spdM) { if (p.step === 0) f.x += clamp(dx - f.face * 60, -120, 120); f.face = Math.sign(P.x - f.x) || f.face; tel({ shape: 'rect', x: f.x + f.face * 70, y: GY - 40, w: 130, h: 80, warn: 0.55 / spdM, dmg: atk, col }); p.step++; } if (p.t > 1.8 / spdM) end(); break;
        case 'charge': if (p.step === 0) { f.face = Math.sign(dx) || 1; const w = f.face > 0 ? a.x1 - f.x : f.x - a.x0; tel({ shape: 'rect', x: f.x + f.face * w / 2, y: GY - 34, w, h: 68, warn: 0.95 / spdM, dmg: 0, col }); p.step = 1; }
          else if (p.step === 1 && p.t > 0.75 / spdM) { p.step = 2; }
          else if (p.step === 2) { f.x += f.face * 700 * spdM * dt; if (st.t % 0.04 < dt) fx.push({ k: 'ghostF', x: f.x, y: f.y, face: f.face, f, t: 0, life: 0.25 }); if (Math.abs(P.x - f.x) < f.w / 2 + 14 && Math.abs((P.y - 26) - cy) < f.h / 2 + 10) hurtP(atk * 1.4, f.x); if (f.x <= a.x0 + 14 || f.x >= a.x1 - 14) { shake(9); f.stagger = 0.6 / spdM; part(f.x, cy, '#ffffff', 14, 200, 0.4); end(1.2); } } break;
        case 'slam': if (p.step === 0) { p.tx = clamp(P.x, a.x0 + 40, a.x1 - 40); tel({ shape: 'circle', x: p.tx, y: GY - 20, r: 90, warn: 1.15 / spdM, dmg: atk * 1.5, col, big: true, fx: tl => { ring(tl.x, GY - 6, 130, col, 0.5); shock(tl.x, GY - 6, 100, col, 0.45); crack(tl.x, GY, 120, 1.1); fx.push({ k: 'spike', x: tl.x, y: GY, col, t: 0, life: 0.5 }); part(tl.x, GY - 10, col, 24, 280, 0.55, 3); } }); p.step = 1; p.x0 = f.x; }
          else if (p.step === 1) { const k = Math.min(1, p.t / (0.95 / spdM)); f.x = p.x0 + (p.tx - p.x0) * k; f.y = GY - Math.sin(k * Math.PI) * 160; if (k >= 1) { f.y = GY; p.step = 2; sfx('boom'); for (const d of [-1, 1]) eShot(f, f.x, GY - 12, d > 0 ? 0 : Math.PI, 300 * spdM, 0.8, 10, { ground: true, life: 1.4 }); } }
          else if (p.t > 1.5 / spdM) end(); break;
        case 'fan': if (p.step < 1 + f.phase && p.t > p.step * 0.55) { const n = 5 + f.phase * 2 + (hard ? 2 : 0); const base = Math.atan2((P.y - 30) - cy, dx); for (let i = 0; i < n; i++) eShot(f, f.x, cy, base + (i / (n - 1) - 0.5) * 1.1, 230 * spdM, 0.7, 8); p.step++; sfx('skill'); } if (p.t > 0.6 + f.phase * 0.55) end(); break;
        case 'rain': if (p.step === 0) { const n = 5 + f.phase * 2 + (hard ? 2 : 0); for (let i = 0; i < n; i++) { const x = i === 0 ? P.x : rnd(a.x0 + 30, a.x1 - 30); tel({ shape: 'circle', x, y: GY - 24, r: 38, warn: (1.05 + i * 0.14) / spdM, dmg: atk * 1.1, col, fx: tl => { fx.push({ k: 'bolt', x: tl.x, col, t: 0, life: 0.3 }); part(tl.x, GY - 4, col, 8, 140, 0.4); } }); } p.step = 1; } if (p.t > 1.8 / spdM) end(1.3); break;
        case 'summon': if (p.step === 0) { p.step = 1; f.armorT = 1; for (const m of f.def_.minions.slice(0, 2)) spawn(m, clamp(f.x + rnd(-140, 140), a.x0 + 30, a.x1 - 30)); ring(f.x, cy, 90, '#a070ff', 0.6); } if (p.t > 1) end(2); break;
        case 'beam': if (p.step === 0) { const hy = P.ground ? GY - 22 : P.y - P.h / 2; tel({ shape: 'rect', x: (a.x0 + a.x1) / 2, y: hy, w: a.x1 - a.x0, h: 34, warn: 1.25 / spdM, dmg: atk * 1.6, col, big: true, fx: tl => fx.push({ k: 'slab', x: tl.x, y: tl.y, w: tl.w, h: tl.h, col: '#ffffff', t: 0, life: 0.35 }) }); p.step = 1; } if (p.t > 1.5 / spdM) end(1.8); break;
        case 'spin': f.x += Math.sign(dx) * 190 * spdM * dt; f.rot = (f.rot || 0) + dt * 18; if (st.t % 0.25 < dt) { arc(f.x, cy, 1, 70, col, 0.2, 2); if (Math.hypot(P.x - f.x, (P.y - 26) - cy) < 72) hurtP(atk * 0.7, f.x); } if (p.t > 2) { f.rot = 0; end(1.4); } break;
        case 'blink': if (p.step === 0) { part(f.x, cy, '#a070ff', 16, 180, 0.4); f.x = clamp(P.x - P.face * 90, a.x0 + 30, a.x1 - 30); f.face = Math.sign(P.x - f.x) || 1; part(f.x, f.y - f.h / 2, '#a070ff', 16, 180, 0.4); p.step = 1; tel({ shape: 'rect', x: f.x + f.face * 70, y: GY - 40, w: 140, h: 80, warn: 0.68 / spdM, dmg: atk * 1.2, col }); } if (p.t > 1.1 / spdM) end(); break;
        case 'pillar': if (p.step === 0) { const d = Math.sign(dx) || 1; const n = 6 + f.phase * 2; for (let i = 0; i < n; i++) { const x = f.x + d * (60 + i * 52); if (x < a.x0 || x > a.x1) break; tel({ shape: 'rect', x, y: GY - 36, w: 40, h: 72, warn: (0.72 + i * 0.11) / spdM, dmg: atk * 1.1, col, fx: tl => { fx.push({ k: 'spike', x: tl.x, y: GY, col, t: 0, life: 0.45 }); vfx('pillar', f.def_.el in EL_SET ? f.def_.el : 'dark', tl.x, GY - 60, 80, { life: 0.5 }); } }); } p.step = 1; } if (p.t > 1.6 / spdM) end(); break;
        case 'nova': if (p.step === 0) { f.armorT = 1.4; tel({ shape: 'circle', x: f.x, y: cy, r: 150 + f.phase * 20, warn: 1.35 / spdM, dmg: atk * 2, col, big: true, fx: tl => { ring(tl.x, tl.y, tl.r, col, 0.5); ring(tl.x, tl.y, tl.r * 0.6, '#ffffff', 0.35); } }); p.step = 1; } if (p.t > 1.6 / spdM) end(2); break;
        default: end();
      }
    }
    // —— 拾取、流程 ——
    function updPickups(dt){ const clear = !aliveFoes().length;
      for (const p of pickups) { p.t += dt; if (p.t < 0.45) { p.vy += 1200 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > GY - 6) { p.y = GY - 6; p.vy *= -0.4; p.vx *= 0.6; } continue; }
        const dx = P.x - p.x, dy = (P.y - 26) - p.y, d = Math.hypot(dx, dy); const mag = clear ? 2000 : 110 + (C().s.magnet || 0);
        if (d < mag) { const sp = 380 + (mag - d) * 3 + p.t * 200; p.x += dx / d * sp * dt; p.y += dy / d * sp * dt; } if (d < 20) { p.got = true; collect(p); } }
      for (let i = pickups.length - 1; i >= 0; i--) if (pickups[i].got) pickups.splice(i, 1); }
    function updFlow(dt){ const sec = HK.trySecretPickup(hk()); if (sec && sec.kind === 'chest') { st.gold += sec.gold || 0; if (sec.dust) st.dust = (st.dust || 0) + sec.dust; }
      if (stage.obj === 'timed' && st.timeLeft > 0) { st.timeLeft -= dt; if (st.timeLeft <= 0) return fail('时间耗尽'); }
      if (st.lamp && st.lamp.hp <= 0) return fail('灯火熄灭');
      if (st.cur < 0 || arenas[st.cur].done) { const nx = arenas.find(a => !a.started); if (nx && P.x > nx.x0 + 50) { if (st.lamp) st.lamp.x = nx.x0 + 70; startArena(nx); } return; }
      const a = arenas[st.cur];
      if (aliveFoes().length === 0 && performance.now() > (a.pend || 0) && !st.bossDying) {
        if (!a.boss && nextWave(a)) return;
        a.done = true; st.locked = false; st.bossBar = null; hud.boss.classList.remove('on');
        if (a.i === arenas.length - 1) { st.over = true; setTimeout(() => finish(true), a.boss ? 1600 : 900); say(a.boss ? '首领伏诛！' : '关卡完成！', 2); sfx('win'); if (a.boss) playBgm('dawn'); }
        else { hud.go.classList.add('on'); say('区域肃清', 1); if (st.lamp) st.lamp.hp = Math.min(100, st.lamp.hp + 25); }
      }
    }
    // —— 绘制 ——
    const NUMCOL = { crit: '#ffd24a', sk: '#9fe8ff', hurt: '#ff5a5a', heal: '#7dff9a', burn: '#ff9a4a', fire: '#ff7a3a', poison: '#b7ff6a', st: '#e0d0ff', blk: '#dddddd', pet: '#ffc6f0', brk: '#ffe9a0', lamp: '#ffcf6a', atk: '#ffffff', ice: '#9fd8ff', dark: '#c9a0ff' };
    function drawSprite(im, x, y, hgt, face, o = {}){ if (!ok(im)) { g.fillStyle = o.col || '#888'; g.fillRect(x - 12, y - hgt, 24, hgt); return; } const w = hgt * im.naturalWidth / im.naturalHeight;
      g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(face * (o.sx || 1), o.sy || 1); if (o.alpha != null) g.globalAlpha = o.alpha; if (o.filter) g.filter = o.filter; g.drawImage(im, -w / 2, -hgt, w, hgt); g.restore(); }
    function draw(){
      const sx = st.shake > 0 ? rnd(-st.shake, st.shake) : 0, sy = st.shake > 0 ? rnd(-st.shake, st.shake) * 0.6 : 0;
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#07080e'; g.fillRect(0, 0, cv.width, cv.height);
      if (ok(bgImg)) { const bw = cv.height * 1.78 * 1.15; const ox = -((st.cam * 0.25 * U) % bw); for (let x = ox; x < cv.width; x += bw) g.drawImage(bgImg, x, -cv.height * 0.05, bw, cv.height * 1.15); }
      g.fillStyle = 'rgba(6,8,16,.28)'; g.fillRect(0, 0, cv.width, cv.height);
      { const hh = cv.height * 0.62; const okF = pxDraw(PX.far, 0.38, hh, GY * U + hh * 0.04, 0.95); const okM = pxDraw(PX.mid, 0.6, hh * 0.85, GY * U + hh * 0.85 * 0.14);
        if (!okF && !okM && ridge) { const ox = -((st.cam * 0.55 * U) % ridge.width); g.drawImage(ridge, ox, 0); g.drawImage(ridge, ox + ridge.width, 0); } }
      g.setTransform(U, 0, 0, U, (-st.cam + sx) * U, sy * U);
      const L = st.cam - 40, R = st.cam + VW + 40;
      HK.drawHooks(g, { P, st, foes, U, VW, GY, VH }, { sx, sy, L, R });
      // 地面
      const gg = g.createLinearGradient(0, GY, 0, VH); gg.addColorStop(0, '#2a2418'); gg.addColorStop(0.08, '#14110c'); gg.addColorStop(1, '#07060a'); g.fillStyle = gg; g.fillRect(L, GY, R - L, VH - GY);
      if (ok(GRD)) { const tw = 128, th = VH - GY + 2; g.globalAlpha = 0.9; for (let x = Math.floor(L / tw) * tw; x < R; x += tw) g.drawImage(GRD, x, GY, tw, th); g.globalAlpha = 1; const gd = g.createLinearGradient(0, GY, 0, VH); gd.addColorStop(0, 'rgba(7,6,10,0)'); gd.addColorStop(1, 'rgba(7,6,10,.8)'); g.fillStyle = gd; g.fillRect(L, GY, R - L, VH - GY); }
      g.fillStyle = 'rgba(255,214,140,.22)'; g.fillRect(L, GY, R - L, 1.5);
      for (const a of arenas) { if (a.x1 < L || a.x0 > R) continue; for (const p of a.plats || []) { g.fillStyle = 'rgba(40,32,22,.92)'; g.fillRect(p.x, p.y, p.w, 7); if (ok(GRD)) g.drawImage(GRD, 0, 0, Math.min(512, p.w * 4), 28, p.x, p.y, p.w, 7); g.fillStyle = 'rgba(255,210,140,.45)'; g.fillRect(p.x, p.y, p.w, 1.5); }
        if (st.locked && st.cur === a.i) for (const gx of [a.x0, a.x1]) { const gr = g.createLinearGradient(gx - 8, 0, gx + 8, 0); gr.addColorStop(0, 'rgba(255,90,60,0)'); gr.addColorStop(0.5, `rgba(255,120,70,${0.35 + 0.2 * Math.sin(st.t * 6)})`); gr.addColorStop(1, 'rgba(255,90,60,0)'); g.fillStyle = gr; g.fillRect(gx - 8, 40, 16, GY - 40); } }
      if (st.lamp) { const lp = img('spr/o_lamp_lit'); drawSprite(lp, st.lamp.x, GY, 46, 1); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(st.lamp.x - 18, GY - 56, 36, 4); g.fillStyle = '#ffcf6a'; g.fillRect(st.lamp.x - 18, GY - 56, 36 * clamp(st.lamp.hp / 100, 0, 1), 4); }
      // 预警
      for (const tl of tele) { const k = clamp(tl.t / tl.warn, 0, 1); if (tl.fired) continue;
        const eye = tl.eyeEarly || st.eyeOn; const pulse = 0.15 + 0.12 * Math.sin(st.t * (8 + k * 10));
        g.globalAlpha = 0.16 + 0.28 * k + pulse; g.fillStyle = tl.col; g.strokeStyle = eye ? '#ffd24a' : (k > 0.7 ? '#ffffff' : tl.col);
        g.lineWidth = eye ? 2.6 : (tl.big ? 2.2 : 1.7);
        if (tl.shape === 'rect') { g.fillRect(tl.x - tl.w / 2, tl.y - tl.h / 2, tl.w, tl.h); g.globalAlpha = 0.95; g.strokeRect(tl.x - tl.w / 2, tl.y - tl.h / 2, tl.w, tl.h);
          g.globalAlpha = 0.4; g.fillRect(tl.x - tl.w / 2, tl.y - tl.h / 2, tl.w * k, tl.h);
          if (k > 0.55) { g.globalAlpha = 0.55 + 0.4 * k; g.fillStyle = '#fff'; g.fillRect(tl.x - tl.w / 2, tl.y - 2, tl.w * k, 3); } }
        else { g.beginPath(); g.arc(tl.x, tl.y, tl.r, 0, 6.283); g.fill(); g.globalAlpha = 0.95; g.stroke();
          g.globalAlpha = 0.45; g.beginPath(); g.arc(tl.x, tl.y, tl.r * k, 0, 6.283); g.fill();
          if (tl.big) { g.globalAlpha = 0.35 + 0.25 * Math.sin(st.t * 10); g.strokeStyle = '#ff4a3a'; g.lineWidth = 3; g.beginPath(); g.arc(tl.x, tl.y, tl.r * (1.05 + 0.04 * Math.sin(st.t * 8)), 0, 6.283); g.stroke();
            g.fillStyle = 'rgba(255,60,40,.12)'; g.beginPath(); g.ellipse(tl.x, GY - 2, tl.r * 1.1, 10, 0, 0, 6.283); g.fill(); }
          if (k > 0.55) { g.globalAlpha = 0.7; g.strokeStyle = '#fff'; g.lineWidth = 2.4; g.beginPath(); g.arc(tl.x, tl.y, tl.r * k, -1.57, -1.57 + 6.283 * k); g.stroke(); } }
        g.globalAlpha = 1; }
      for (const z of zones) { g.globalAlpha = 0.18 + 0.06 * Math.sin(st.t * 5); g.fillStyle = z.o.col; g.beginPath(); g.ellipse(z.x, GY - 2, z.k.r, 14, 0, 0, 6.283); g.fill(); g.globalAlpha = 1; }
      // 敌人
      for (const f of foes) { if (f.x < L - 60 || f.x > R + 60) continue; const base = f.im || f.def_.img; let im = img(base); let hh = f.h * 1.25;
        { const fs = f.state, akey = animKey(base); let fr = null, n;
          if (fs === 'hurt' || fs === 'down' || f.stun > 0) fr = frame(akey, 'hurt', f.hitT > 0 ? 0 : 1);
          else if (fs === 'wind') fr = frame(akey, 'atk', Math.min(1, Math.floor((st.t * 6) % 2)));
          else if (fs === 'atk' || fs === 'charge' || fs === 'dive') fr = frame(akey, 'atk', 2 + Math.floor((st.t * 8) % 2));
          else if (Math.abs(f.vx || 0) > 8 || (f.lx !== undefined && Math.abs(f.x - f.lx) > 0.3)) fr = frame(akey, 'walk', Math.floor((st.t * 10 + f.ph) % 6));
          else fr = frame(akey, 'idle', Math.floor((st.t * 5 + f.ph) % 4));
          f.lx = f.x; if (fr) { im = fr; hh *= 1.08; f.anim = true; } else f.anim = false; }
        let alpha = 1; if (f.stealth && !f.reveal && !st.eyeOn) alpha = 0.12; if (f.dead) { alpha = 1 - f.deadT / 0.5; if (alpha <= 0) continue; }
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(f.x, GY + 1, f.w * 0.7, 4, 0, 0, 6.283); g.fill();
        if (f.def_.aura) { g.globalAlpha = 0.25 + 0.1 * Math.sin(st.t * 4); g.fillStyle = f.def_.aura; g.beginPath(); g.ellipse(f.x, f.y - f.h * 0.55, f.w * 0.9, f.h * 0.75, 0, 0, 6.283); g.fill(); g.globalAlpha = 1; }
        const bob = Math.sin(st.t * 6 + f.ph) * 1.5; const wind = f.state === 'wind' || (f.pat && f.pat.t < 0.3);
        let filter = f.hitT > 0 ? 'brightness(2.4)' : f.frozen > 0 ? 'saturate(.3) brightness(1.4) hue-rotate(160deg)' : f.def_.tint && !ok(im) ? '' : '';
        drawSprite(im, f.x, f.y + (f.dead ? f.deadT * 30 : 0), hh, f.face > 0 ? -1 : 1, { sy: f.anim ? 1 : 1 + bob * 0.01 + (wind ? 0.04 : 0), sx: f.anim ? 1 : wind ? 0.95 : 1, rot: f.rot ? Math.sin(f.rot) * 0.3 : (f.air ? Math.sin(st.t * 12) * 0.3 : f.state === 'hurt' ? -f.face * 0.12 : 0), alpha, filter });
        if (f.state === 'wind' && !f.def_.boss) { g.fillStyle = '#ff4a3a'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.fillText('!', f.x, f.y - hh - 6); }
        if (!f.def_.boss && !f.dead && f.hp < f.max) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(f.x - 16, f.y - hh - 4, 32, 3); g.fillStyle = f.def_.tier === 1 ? '#ffb030' : '#ff5a4a'; g.fillRect(f.x - 16, f.y - hh - 4, 32 * f.hp / f.max, 3); }
        if (f.guard > 0 && f.def_.ai === 'shield') { g.fillStyle = 'rgba(200,220,255,.8)'; for (let i = 0; i < f.guard; i++) g.fillRect(f.x - 10 + i * 4.5, f.y - hh - 9, 3, 3); }
        if (f.burn > 0 && st.t % 0.2 < 0.02) part(f.x + rnd(-8, 8), f.y - f.h * 0.5, '#ff8a3a', 1, 40, 0.4, 2);
        if (f.poison > 0 && st.t % 0.25 < 0.02) part(f.x + rnd(-8, 8), f.y - f.h * 0.5, '#9cff5a', 1, 30, 0.5, 2);
        if (f.stun > 0 || f.stagger > 0) { g.fillStyle = '#ffe28a'; for (let i = 0; i < 3; i++) { const a2 = st.t * 5 + i * 2.1; g.beginPath(); g.arc(f.x + Math.cos(a2) * 12, f.y - hh - 2 + Math.sin(a2) * 3, 2, 0, 6.283); g.fill(); } } }
      // 召唤物 / 宠物
      for (const a of allies) { const im = img(a.what === 'clone' ? 'spr/p_baiji' : a.what === 'leopard' ? 'enemy/a3' : 'spr/p_baiji'); drawSprite(im, a.x, GY, a.what === 'leopard' ? 40 : 46, a.face, { alpha: 0.65, filter: a.what === 'icefox' ? 'hue-rotate(150deg) brightness(1.3)' : 'brightness(1.3)' }); }
      if (pet) drawSprite(img(pet.d.img), pet.x, pet.y + 18, 34, pet.face > 0 ? -1 : 1, { sy: 1 + Math.sin(st.t * 8) * 0.04 });
      // 玩家
      for (const e of fx) if (e.k === 'ghost') drawSprite(img('spr/p_' + e.id), e.x, e.y, 56, e.face, { alpha: 0.35 * (1 - e.t / e.life), filter: 'brightness(2) sepia(1) hue-rotate(-20deg)' });
      for (const e of fx) if (e.k === 'ghostF') drawSprite(img(e.f.def_.img), e.x, e.y, e.f.h * 1.25, e.face > 0 ? -1 : 1, { alpha: 0.3 * (1 - e.t / e.life) });
      const c = C(); g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(P.x, GY + 1, 14, 3.5, 0, 0, 6.283); g.fill();
      if (P.ultT > 0) { const u = ultDef(); g.globalAlpha = 0.3 + 0.12 * Math.sin(st.t * 8); g.fillStyle = u.aura; g.beginPath(); g.ellipse(P.x, P.y - 30, 26 * (u.scale || 1), 40 * (u.scale || 1), 0, 0, 6.283); g.fill(); g.globalAlpha = 1; }
      const run = P.ground && Math.abs(P.vx) > 30; const atkK = P.atkT > 0 ? P.atkT / 0.2 : 0;
      const blink = P.iT > 0 && P.dashT <= 0 && Math.floor(st.t * 20) % 2 === 0;
      const hkey = 'p_' + c.id + '_s' + (S.act?.skin?.[c.id] || 0); let him = null;
      if (P.hurtT > 0) him = frame(hkey, 'hurt', P.hurtT > 0.2 ? 0 : 1);
      else if (P.castT > 0 || P.beam) him = frame(hkey, 'cast', Math.min(3, Math.floor((0.36 - Math.max(0, P.castT)) / 0.09)));
      else if (atkK > 0) him = frame(hkey, 'atk', Math.min(5, Math.floor((1 - atkK) * 6)));
      else if (!P.ground) him = frame(hkey, 'jump', P.vy < 0 ? 0 : 1);
      else if (run) him = frame(hkey, 'run', Math.floor(st.t * 14) % 8);
      else him = frame(hkey, 'idle', Math.floor(st.t * 6) % 6);
      const hAnim = !!him; const hsc = 56 * (P.ultT > 0 && ultDef().scale ? ultDef().scale : 1);
      drawSprite(him || img('spr/p_' + c.id), P.x, P.y + (!hAnim && run ? -Math.abs(Math.sin(st.t * 14)) * 2 : 0), hAnim ? hsc * 1.08 : hsc, P.face, { rot: P.whirl ? Math.sin(st.t * 30) * 0.4 : hAnim ? 0 : P.hurtT > 0 ? -P.face * 0.2 : run ? P.face * 0.08 : atkK ? P.face * 0.12 * atkK : !P.ground ? P.face * 0.06 : 0,
        sy: hAnim ? 1 : P.ground ? 1 + Math.sin(st.t * 4) * 0.012 : 1.04, sx: hAnim ? 1 : P.ground ? 1 : 0.96, alpha: blink ? 0.45 : 1, filter: P.hurtT > 0.2 ? 'brightness(2) saturate(0)' : P.ultT > 0 ? 'brightness(1.25) saturate(1.3)' : '' });
      if (P.beam) { const len = P.beam.k.len || 320; const y = P.y - P.h * 0.6; const gr = g.createLinearGradient(0, y - 12, 0, y + 12); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, P.beam.o.col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.globalAlpha = 0.85; g.fillRect(P.face > 0 ? P.x + 10 : P.x - 10 - len, y - 12, len, 24); g.fillStyle = '#fff'; g.fillRect(P.face > 0 ? P.x + 10 : P.x - 10 - len, y - 2, len, 4); g.globalAlpha = 1; }
      // 飞行道具
      for (const s of shots) { g.fillStyle = s.col; g.globalAlpha = 0.35; g.beginPath(); g.arc(s.x - s.vx * 0.02, s.y - s.vy * 0.02, s.r * 1.6, 0, 6.283); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, s.r * 0.45, 0, 6.283); g.fill();
        if (s.owner === 'e') { g.strokeStyle = 'rgba(255,60,60,.9)'; g.lineWidth = 1.2; g.beginPath(); g.arc(s.x, s.y, s.r + 1.5, 0, 6.283); g.stroke(); } }
      // 拾取
      for (const p of pickups) { if (p.k === 'dust') { g.fillStyle = '#a8d8ff'; g.beginPath(); g.arc(p.x, p.y, 4, 0, 6.283); g.fill(); g.fillStyle = '#e8f6ff'; g.beginPath(); g.arc(p.x, p.y, 2, 0, 6.283); g.fill(); }
        else if (p.k === 'gold') { g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(p.x, p.y, 3, 0, 6.283); g.fill(); }
        else if (p.k === 'orb') { g.fillStyle = p.v === 'hp' ? '#ff6a6a' : '#6ab8ff'; g.beginPath(); g.arc(p.x, p.y, 5, 0, 6.283); g.fill(); }
        else { const it = ITEMS[p.v]; const col = p.k === 'soul' ? '#d9a0ff' : RARITY[it?.rar ?? 1]?.col || '#fff'; g.fillStyle = col; g.globalAlpha = 0.3; g.fillRect(p.x - 1.5, p.y - 40, 3, 40); g.globalAlpha = 1; g.save(); g.translate(p.x, p.y); g.rotate(st.t * 2); g.fillRect(-4, -4, 8, 8); g.restore(); } }
      // 特效
      for (const e of fx) { const k = e.t / e.life; if (k >= 1) continue; g.globalAlpha = 1 - k;
        if (e.k === 'p') { g.fillStyle = e.col; g.beginPath(); g.arc(e.x, e.y, Math.max(0.8, e.sz * 0.55), 0, 6.283); g.fill(); }
        else if (e.k === 'vfx') { g.globalAlpha = Math.min(1, (1 - k) * 2.5); const fi = Math.min(11, Math.floor(k * 12)); const im = img('vfx/' + e.type + '_' + e.el + '/' + fi); if (ok(im)) { g.save(); if (e.add) g.globalCompositeOperation = 'lighter'; g.translate(e.x, e.y); if (e.rot) g.rotate(e.rot); g.scale(e.face < 0 ? -1 : 1, 1); const sz = e.size; const ar = e.type === 'pillar' ? 1.5 : 1; g.drawImage(im, -sz / 2, -sz * ar / 2, sz, sz * ar); g.restore(); } }
        else if (e.k === 'ring') { g.strokeStyle = e.col; g.lineWidth = 1.6 * (1 - k) + 0.4; g.beginPath(); g.arc(e.x, e.y, e.r * (0.35 + 0.65 * Math.sqrt(k)), 0, 6.283); g.stroke(); }
        else if (e.k === 'arc') { g.strokeStyle = e.col; g.lineCap = 'round'; g.lineWidth = 3.2 * e.wide * (1 - k); g.beginPath(); const a0 = e.face > 0 ? -1.3 : Math.PI + 1.3; g.save(); g.translate(e.x, e.y); g.rotate(e.rot); g.arc(0, 0, e.r * (0.7 + 0.3 * k), e.face > 0 ? -1.2 : Math.PI - 1.2 + 0, e.face > 0 ? 1.2 : Math.PI + 1.2, false); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.5 * (1 - k); g.stroke(); g.restore(); }
        else if (e.k === 'line') { g.strokeStyle = e.col; g.lineWidth = 8 * (1 - k); g.beginPath(); g.moveTo(e.x0, e.y); g.lineTo(e.x1, e.y); g.stroke(); }
        else if (e.k === 'spike') { g.fillStyle = e.col; const hh = 46 * Math.sin(Math.min(1, k * 3) * Math.PI / 2); g.beginPath(); g.moveTo(e.x - 14, GY); g.lineTo(e.x - 4, GY - hh); g.lineTo(e.x + 2, GY - hh * 0.6); g.lineTo(e.x + 8, GY - hh * 0.9); g.lineTo(e.x + 14, GY); g.fill(); }
        else if (e.k === 'slab') { g.fillStyle = e.col; g.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h); }
        else if (e.k === 'bolt') { g.strokeStyle = e.col; g.lineWidth = 4; g.beginPath(); let y = 0, x = e.x; g.moveTo(x, y); while (y < GY) { y += 30; x += rnd(-10, 10); g.lineTo(x, y); } g.stroke(); }
        else if (e.k === 'shock') { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = e.col; g.lineWidth = 2.2 * (1 - k) + 0.5; g.beginPath(); g.arc(e.x, e.y, e.r * (0.35 + 0.65 * Math.sqrt(k)), 0, 6.283); g.stroke(); g.globalAlpha = (1 - k) * 0.18; g.fillStyle = e.col; g.beginPath(); g.arc(e.x, e.y, e.r * (0.25 + 0.45 * k), 0, 6.283); g.fill(); g.restore(); }
        else if (e.k === 'crack') { g.save(); g.strokeStyle = `rgba(40,28,18,${0.85 * (1 - k)})`; g.lineWidth = 2.2; g.beginPath(); const w = e.w * (0.6 + 0.4 * Math.min(1, k * 3)); g.moveTo(e.x - w / 2, e.y); g.lineTo(e.x - w * 0.2, e.y - 3); g.lineTo(e.x, e.y + 1); g.lineTo(e.x + w * 0.25, e.y - 2); g.lineTo(e.x + w / 2, e.y); g.stroke(); g.strokeStyle = `rgba(255,180,80,${0.35 * (1 - k)})`; g.lineWidth = 1; g.stroke(); g.restore(); }
        else if (e.k === 'speed') { g.strokeStyle = e.col; g.lineWidth = 1.6 * (1 - k); g.globalAlpha = 0.55 * (1 - k); g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x - e.face * e.len, e.y); g.stroke(); }
        g.globalAlpha = 1; }
      g.textAlign = 'center';
      { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); pxDraw(PX.near, 1.3, cv.height * 0.16, cv.height + cv.height * 0.02, 0.7); g.restore(); }
      for (const n of nums) { const k = n.t / 0.9; g.globalAlpha = 1 - k * k; const big = n.kind === 'crit'; const mid = n.kind === 'fire' || n.kind === 'sk' || n.kind === 'brk'; g.font = `${big ? 'bold 22' : mid ? 'bold 15' : n.kind?.startsWith?.('loot') ? 'bold 10' : n.kind === 'heal' ? 'bold 14' : 'bold 13'}px MaShan, sans-serif`;
        const col = n.kind?.startsWith?.('loot') ? (RARITY[+n.kind.slice(4)]?.col || '#fff') : NUMCOL[n.kind] || '#ffffff'; const y = n.y - 26 * Math.sqrt(k) - (big ? 6 * Math.sin(k * 9) : 0);
        g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(n.v, n.x, y); g.fillStyle = col; g.fillText(n.v, n.x, y); }
      g.globalAlpha = 1;
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (C().hp < C().s.hp * 0.3) { const vg = g.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.4, cv.width / 2, cv.height / 2, cv.width * 0.7); vg.addColorStop(0, 'rgba(120,0,0,0)'); vg.addColorStop(1, `rgba(150,0,0,${0.35 + 0.15 * Math.sin(st.t * 6)})`); g.fillStyle = vg; g.fillRect(0, 0, cv.width, cv.height); }
      HK.drawDreamTint(g, cv, st);
    }
    // —— HUD ——
    let hudCache = {};
    function refreshHud(force){
      const c = C(); const s = c.s; if (force) hudCache = {};
      const set = (k, v, fn) => { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } };
      set('face', c.id, v => { hud.face.src = asset('por/' + v); hud.name.textContent = CHARS[v].name; });
      set('hp', Math.round(c.hp), v => { hud.hp.style.width = (100 * v / s.hp) + '%'; hud.hpT.textContent = v + '/' + s.hp; });
      set('mp', Math.round(c.mp), v => hud.mp.style.width = (100 * v / s.mp) + '%');
      set('rg', Math.round(c.rage), v => { hud.rg.style.width = v + '%'; hud.ult.classList.toggle('ready', v >= 100); });
      set('ultOn', P.ultT > 0, v => hud.ult.classList.toggle('on', v));
      const sl = slotsOf(c.id);
      for (let i = 0; i < 5; i++) { const sid = sl[i]; const k = ASKILLS[sid]; const b = hud.sk[i];
        set('sk' + i, sid || '-', v => { b.style.display = k ? '' : 'none'; if (k) { b.querySelector('img').src = asset('icon/sk/' + sid); b.querySelector('b').textContent = k.mp; b.title = k.name; } });
        if (k) { const cd = c.cds[sid] || 0; const tot = k.cd * skillCd(skillLv(c.id, sid)) * (1 - (s.cdr || 0)); set('cd' + i, Math.ceil(cd * 10), () => { b.style.setProperty('--cd', (cd > 0 ? cd / tot : 0).toFixed(3)); b.querySelector('i').textContent = cd > 0 ? Math.ceil(cd) : ''; b.classList.toggle('ready-pulse', cd <= 0 && c.mp >= k.mp); }); set('nomp' + i, c.mp < k.mp, v => { b.classList.toggle('nomp', v); b.classList.toggle('ready-pulse', !v && (c.cds[sid]||0) <= 0); }); } }
      set('team', roster.map(r => r.id + (r.alive ? Math.round(r.hp / r.s.hp * 10) : 'x') + (r === c)).join(), () => { hud.team.replaceChildren(...roster.map((r, j) => h('div.ak-tm' + (j === ri ? '.cur' : '') + (r.alive ? '' : '.dead'), { onpointerdown: e => { e.stopPropagation(); if (j !== ri && r.alive && P.swapCd <= 0) { ri = (j - 1 + roster.length) % roster.length; swap(); } } }, h('img', { src: asset('por/' + r.id) }), h('i', { style: `width:${100 * r.hp / r.s.hp}%` })))); });
      hud.swap.style.display = roster.length > 1 ? '' : 'none';
      set('pot', st.potions, v => { hud.pot.querySelector('.t').textContent = '灵药 ' + v; hud.pot.classList.toggle('nomp', v <= 0); });
      set('combo', st.combo, v => { if (v >= 3) { const mile = v === 10 || v === 25 || v === 50 || v === 100; hud.combo.innerHTML = `<b>${v}</b><span>${mile ? '连击!' : '连击'}</span>`; hud.combo.classList.remove('pop'); void hud.combo.offsetWidth; hud.combo.classList.add('on', 'pop'); if (mile) { shake(4); say(v + ' 连击!', 0.7); comboMileFx(v); } } else hud.combo.classList.remove('on'); });
      set('gold', st.gold, v => hud.gold.textContent = '✦ ' + v);
      { const bi = b => b.shieldHp > 0 || b.shield ? 'shield' : b.regen ? 'regen' : b.burnAura ? 'burn' : b.slowP ? 'slow' : b.spd ? 'haste' : b.lifesteal ? 'bleed' : b.freeze ? 'freeze' : 'rage';
        const L = P.buffs.map(b => [bi(b), b.name, Math.ceil(b.t)]); if (P.ultT > 0) L.unshift(['lamp', '变身', Math.ceil(P.ultT)]);
        set('buf', L.map(x => x.join(':')).join(), () => hud.buf.replaceChildren(...L.map(([ic, n, t]) => h('span.ak-bf', { title: n }, h('img', { src: asset('icon/st/' + ic) }), h('em', {}, t))))); }
      const objT = stage.obj === 'timed' ? `限时 ${Math.max(0, Math.ceil(st.timeLeft))}秒` : stage.obj === 'guard' ? `守灯 ${Math.max(0, Math.round(st.lamp?.hp ?? 100))}%` : `区域 ${Math.min(arenas.length, Math.max(1, st.cur + 1))}/${arenas.length}`;
      set('obj', objT, v => hud.obj.textContent = v);
      set('reso', Math.round(st.reso||0), v => { hud.resoBar.style.width = (v) + '%'; hud.reso.classList.toggle('ready', !!st.resoReady || v >= 100); });
      set('dream', st.dream, v => { hud.dream.classList.toggle('on', !!v); hud.dream.querySelector('.t').textContent = v ? '睁眼' : '闭目'; });
      set('eye', st.eyeOn, v => hud.eye.classList.toggle('on', !!v));
      set('goals', (st.dreamSeen?1:0)+':'+(st.awakeSeen?1:0)+':'+(st.resoUsed||0)+':'+st.hitsTaken+':'+Math.floor(st.t), () => {
        const gs = HK.sGoals(stage, st); hud.goals.replaceChildren(...gs.map(g => h('span' + (g.ok ? '.ok' : ''), {}, g.label))); });
      const b = st.bossBar; if (b) set('boss', Math.round(b.hp / b.max * 400), v => { hud.boss.querySelector('.ak-bb i').style.width = (v / 4) + '%'; hud.boss.querySelector('.ak-bb em').textContent = Math.max(0, Math.round(b.hp)) + ' / ' + b.max; });
    }
    // —— 暂停 / 结算 ——
    let pbox = null;
    function pause(){ if (st.over) return; st.paused = !st.paused; if (!st.paused) { pbox && pbox.remove(); pbox = null; return; }
      const sl = slotsOf(C().id).map(id => ASKILLS[id]).filter(Boolean);
      pbox = h('div.ak-pausebox', {}, h('div.ak-pin', {}, h('h3', {}, '暂停 · ' + stage.name),
        h('div.ak-keys', {}, h('p', {}, '左摇杆移动，上推跳跃，下推穿过平台。⚔ 连按出连击，空中可追击；➤ 冲刺带无敌帧，可穿过预警。'), h('p', {}, '招牌：瞳(E)烛瞳见弱点 · 梦(R)闭目/睁眼切换梦层 · 灯(T)灯火共鸣合击。怒气满「龍」变身；⇄ 换人积攒共鸣。'),
          h('div.ak-sklist', {}, ...sl.map(k => h('div', {}, h('img', { src: asset('icon/sk/' + k.id) }), h('b', {}, k.name), h('span', {}, k.desc))))),
        h('div.ak-row', {}, h('button.btn', { onclick: () => pause() }, '继续'), h('button.btn.ghost', { onclick: () => { st.paused = false; end({ win: false, retry: true }); } }, '重来'), h('button.btn.ghost', { onclick: () => { st.paused = false; end({ win: false, quit: true, why: '撤退' }); } }, '撤退'))));
      root.append(pbox); }
    function fail(why){ if (st.over) return; st.over = true; say(why, 2); sfx('lose'); setTimeout(() => end({ win: false, why }), 1400); }
    function rating(){ const par = 50 + arenas.length * 35 + (stage.boss ? 60 : 0); let sc = 0; if (st.t < par) sc += 2; else if (st.t < par * 1.5) sc += 1; if (st.hitsTaken <= 3) sc += 2; else if (st.hitsTaken <= 10) sc += 1; if (st.maxCombo >= 30) sc += 2; else if (st.maxCombo >= 12) sc += 1; if (st.lamp && st.lamp.hp >= 70) sc += 1; sc += HK.ratingBonus(st); return sc >= 6 ? 'S' : sc >= 4 ? 'A' : sc >= 2 ? 'B' : 'C'; }
    function finish(win){ const rt = rating(); if (win && rt === 'S') { st.gold = Math.round(st.gold * 1.35); st.exp = Math.round(st.exp * 1.25); st.dust = (st.dust || 0) + 3; say('S 评价 · 丰厚赏赐', 1.6); sfx('ach'); } end({ win, rating: rt }); }
    let ended = false;
    function end(r){ if (ended) return; ended = true; st.over = true; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); ro.disconnect(); document.removeEventListener('visibilitychange', vis);
      const res = { win: false, ...r, time: Math.round(st.t), combo: st.maxCombo, hits: st.hitsTaken, kills: st.kills, dreamFlips: st.dreamFlips||0, resoUsed: st.resoUsed||0, eyeMarks: st.eyeMarks||0, dreamSeen: !!st.dreamSeen, awakeSeen: !!st.awakeSeen, secrets: st.secretChests||0, dust: st.dust||0, gold: r.win ? st.gold : Math.floor(st.gold * 0.3), loot: r.win ? st.loot : {}, souls: r.win ? st.souls : {}, exp: r.win ? st.exp : Math.floor(st.exp * 0.3), team, hard, fps: Math.round(fpsAvg), skills: st.skillUsed || 0, ults: st.ults || 0 };
      if (window.__act) window.__act.result = res; root.remove(); resolve(res); }
    const vis = () => { if (document.hidden && !st.paused && !st.over) pause(); }; document.addEventListener('visibilitychange', vis);
    // —— 自动战斗机器人（测试 / 托管） ——
    function bot(dt){
      const B = T().actBot; if (!B || st.over || st.paused) return; keys.l = keys.r = keys.d = false; keys.atk = false;
      const c = C(); const danger = tele.find(tl => !tl.fired && tl.warn - tl.t < 0.45 && telHitsP(tl));
      const eNear = shots.find(s => s.owner === 'e' && Math.abs(s.x - P.x) < 70 && Math.abs(s.y - (P.y - 26)) < 40 && Math.sign(P.x - s.x) === Math.sign(s.vx));
      if (c.hp < c.s.hp * 0.35 && st.potions > 0 && (B.pot ?? true)) potion();
      if (roster.length > 1 && c.hp < c.s.hp * 0.25 && P.swapCd <= 0) swap();
      if (danger || eNear) { const a = arenas[st.cur]; let d = danger ? (danger.shape === 'circle' ? Math.sign(P.x - danger.x) || 1 : (P.x > (a ? (a.x0 + a.x1) / 2 : P.x) ? -1 : 1)) : -P.face; if (danger && danger.shape === 'rect' && danger.w > 300) { jump(); if (!P.ground) jump(); return; }
        P.face = d; if (P.dashCd <= 0) dash(); else { keys[d > 0 ? 'r' : 'l'] = true; if (P.ground) jump(); } return; }
      if (c.rage >= 100) ult();
      const f = st.bossBar && !st.bossBar.dead ? st.bossBar : nearest(P.x, P.y - 26, 2000);
      if (!f) { if (!st.locked) keys.r = true; return; }
      const dx = f.x - P.x; const reach = WP().shot ? 220 : WP().reach + f.w / 2 + 6;
      P.face = Math.sign(dx) || P.face;
      if (Math.abs(dx) > reach) keys[dx > 0 ? 'r' : 'l'] = true; else if (Math.abs(dx) < 14 && !f.def_.boss) keys[dx > 0 ? 'l' : 'r'] = true;
      if ((f.fly || f.y < GY - 40) && P.ground && Math.abs(dx) < 90) jump();
      if (Math.abs(dx) < reach + 20) { keys.atk = true; if (P.atkCd <= 0) attack(); }
      const sl = slotsOf(c.id); const i = Math.floor(Math.random() * sl.length); const k = ASKILLS[sl[i]];
      if (k && Math.random() < dt * 3 && (c.cds[sl[i]] || 0) <= 0 && c.mp >= k.mp && (k.type === 'buff' || k.type === 'heal' || k.type === 'summon' || k.type === 'field' || Math.abs(dx) < 260)) useSkill(i);
    }
    // —— 主循环 ——
    let last = performance.now(), raf = 0, fpsAvg = 60, acc = 0;
    function updFx(dt){ for (const e of fx) { e.t += dt; if (e.k === 'p') { e.vy += 500 * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 0.96; } else if (e.k === 'speed') { e.x -= e.face * 420 * dt; } } for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t >= fx[i].life) fx.splice(i, 1); for (const n of nums) n.t += dt; while (nums.length && nums[0].t > 0.9) nums.shift(); }
    function step(dt){
      st.t += dt; st.comboT -= dt; if (st.comboT <= 0) st.combo = 0; st.shake = Math.max(0, st.shake - dt * 30);
      if (T().fxBurst && st._fxBurstDone !== T().fxBurst) { st._fxBurstDone = T().fxBurst; const col = AC().col || '#ffd890';
        /* 可读爆发：短刀光 + 命中侧火花，角色轮廓清晰 */
        arc(P.x + P.face * 16, P.y - P.h / 2, P.face, 58, col, 0.16, 1.1);
        sparks(P.x + P.face * 44, P.y - P.h / 2, col, 10, P.face);
        sparks(P.x + P.face * 38, P.y - P.h / 2 - 6, '#ffffff', 5, P.face);
        part(P.x + P.face * 40, P.y - P.h / 2, col, 7, 160, 0.28, 2);
        comboMileFx(12); shake(3);
        st.combo = 12; st.comboT = 2.2;
      }
      bot(dt); updPlayer(dt);
      for (const f of foes) updFoe(f, dt);
      for (let i = foes.length - 1; i >= 0; i--) if (foes[i].dead && foes[i].deadT > 0.6) foes.splice(i, 1);
      updShots(dt); updTele(dt); updPickups(dt); updFlow(dt);
      const tgt = clamp(P.x - VW * 0.4, 0, Math.max(0, worldEnd - VW)); const lk = st.locked && st.cur >= 0 ? arenas[st.cur] : null;
      let cam = tgt; if (lk) cam = clamp(cam, lk.x0 - 10, Math.max(lk.x0 - 10, lk.x1 - VW + 10)); st.cam += (cam - st.cam) * Math.min(1, dt * 6);
    }
    function loop(now){
      raf = requestAnimationFrame(loop); let dt = Math.min(0.05, (now - last) / 1000); last = now; if (dt > 0) fpsAvg += (1 / dt - fpsAvg) * 0.05;
      if (st.paused) return;
      if (ended) return;
      const ts = (T().actSpeed || 1) * st.slow;
      if (st.hitstop > 0) { st.hitstop -= dt; updFx(dt * 0.3); draw(); refreshHud(); return; }
      if (!st.over || true) { const n = ts > 1 ? Math.ceil(ts) : 1; for (let i = 0; i < n; i++) { step(dt * ts / n); if (ended) return; } }
      updFx(dt); draw(); refreshHud();
    }
    window.__act = { st, P, foes, roster, arenas, stage, fx, get fps(){ return fpsAvg; }, win: () => { for (const f of foes) { f.hp = 0; kill(f); } for (const a of arenas) { a.started = true; a.done = true; a.wave = a.waves.length; } st.over = true; finish(true); }, fail: () => fail('测试失败') };
    playBgm(stage.boss ? 'battle' : 'battle'); refreshHud(true);
    say(stage.name, 1.6); if (stage.obj === 'timed') say(`限时 ${stage.time} 秒内通关！`, 2);
    if (STAGE_FLAVOR[stage.id]) setTimeout(() => { if (!st.over) say(STAGE_FLAVOR[stage.id], 2.8); }, 1700);
    raf = requestAnimationFrame(loop);
  });
}
