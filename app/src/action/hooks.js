// 招牌玩法：灯芯半径 / 烛瞳一瞥 / 闭目·睁眼 / 灯火共鸣
// 被 engine.js 调用；保持无状态依赖，全部经 ctx 传入。
import { S } from '../engine/state.js';
import { CHARS } from '../data/characters.js';
import { LAMP_PATHS, setFoeLayer } from './rules.js';
export const lampPath = () => LAMP_PATHS[S?.act?.lampPath] || LAMP_PATHS.keeper;

export const EYE_COST = 8;      // 每秒耗蓝
export const EYE_CD = 0.6;
export const DREAM_CD = 4.5;
export const RESO_NEED = 100;
export const LAMP_BASE = 90;    // 灯芯基础半径（世界坐标）

const NIGHT_AI = new Set(['stalker', 'shade', 'assassin', 'bomber']);
const DARK_EL = new Set(['dark', 'water']);

export function lampRadius(ctx){
  const { C, P, st } = ctx;
  let r = LAMP_BASE + (S.city?.lamp || 1) * 8 + lampPath().radius;
  if (P.buffs.some(b => b.shield || b.def)) r += 30;
  if (P.ultT > 0) r += 40;
  if (st.lamp) r += 20;
  if (C().s && C().s.lampR) r += C().s.lampR;
  return r;
}

export function isNightFoe(f){
  if (!f || !f.def_) return false;
  return DARK_EL.has(f.def_.el) || NIGHT_AI.has(f.def_.ai) || !!f.def_.night || f.dream;
}

/** 灯芯对敌人：虚弱夜鬼；梦层显形 */
export function tickLamp(ctx, dt){
  const { foes, P, st } = ctx;
  const R = lampRadius(ctx);
  st._lampR = R;
  for (const f of foes) {
    if (f.dead) continue;
    const d = Math.hypot(f.x - P.x, (f.y - f.h / 2) - (P.y - 26));
    const inL = d < R;
    f.inLamp = inL;
    if (inL && isNightFoe(f) && st.dream === 0) {
      f.lampWeak = Math.min(1, (f.lampWeak || 0) + dt * 0.6);
      f.slow = Math.max(f.slow || 0, 0.4);
      if (!f._lampBurn && f.lampWeak > 0.4) { f.burn = Math.max(f.burn || 0, 1.2); f.burnD = Math.max(f.burnD || 1, Math.round(f.atk * 0.04)); f._lampBurn = true; }
    } else {
      f.lampWeak = Math.max(0, (f.lampWeak || 0) - dt * 0.5);
      f._lampBurn = false;
    }
    // 隐身敌人：灯外几乎看不见、灯内显形
    if (f.def_.stealth || f.stealth) f.reveal = inL || (ctx.eyeOn && d < R * 1.6);
  }
}

/** 烛瞳：标记弱点 */
export function tickEye(ctx, dt){
  const { C, P, st, foes, say } = ctx;
  if (st.eyeCd > 0) st.eyeCd -= dt;
  if (!st.eyeOn) return;
  const c = C();
  const cost = EYE_COST * dt * lampPath().eyeCost;
  if (c.mp < cost) { st.eyeOn = false; say('烛瞳黯淡', 0.8); return; }
  c.mp -= cost;
  st.eyeT = (st.eyeT || 0) + dt;
  for (const f of foes) {
    if (f.dead) continue;
    const d = Math.hypot(f.x - P.x, (f.y - f.h / 2) - (P.y - 26));
    if (d < 320) {
      f.weakMark = Math.min(1, (f.weakMark || 0) + dt * (S.act?.lampPath === 'seer' ? 1.9 : 1.4));
      if (f.weakMark >= 1 && !f._marked) { f._marked = true; f.brk = Math.max(f.brk || 0, 4); }
    }
  }
}

export function toggleEye(ctx){
  const { st, C, say, sfx, P, ring, part, sparks, flashHit } = ctx;
  if (st.over) return;
  if (st.eyeOn) { st.eyeOn = false; st.eyeCd = EYE_CD; part && part(P.x, P.y - 40, '#ff8a9a', 10, 120, 0.4, 2); return; }
  if (st.eyeCd > 0) return;
  if (C().mp < 5) { say('法力不足', 0.7); return; }
  st.eyeOn = true; sfx && sfx('eye'); say('烛瞳 · 开', 0.6);
  part && part(P.x, P.y - 36, '#ff8a9a', 6, 100, 0.28, 2);
}

/** 命中时消费弱点 → 必暴 */
/** 弱点需要「破绽」才吃得到：敌人出招后摇、被弹反/眩晕/冻结、或从背后打 */
export function weakOpen(f, P){
  if (!f) return false;
  if (f.state === 'atk' || f.state === 'hurt' || f.state === 'down' || (f.stun || 0) > 0 || (f.frozen || 0) > 0 || (f.stagger || 0) > 0) return true;
  if (P && f.face && Math.sign(P.x - f.x) === -Math.sign(f.face)) return true;
  return false;
}
export function consumeWeak(f, P){
  if (!f || !(f.weakMark >= 1)) return false;
  if (P && !weakOpen(f, P)) return false;
  f.weakMark = 0; f._marked = false; return true;
}

/** 闭目/睁眼切换 */
export function toggleDream(ctx){
  const { st, say, sfx, shake, part, P, foes, arenas } = ctx;
  if (st.over || st.dreamCd > 0) return;
  st.dream = st.dream ? 0 : 1;
  st.dreamCd = DREAM_CD;
  st.dreamFlips = (st.dreamFlips || 0) + 1;
  if (st.dream) st.dreamSeen = true; else st.awakeSeen = true;
  sfx && sfx('flip'); shake && shake(8);
  part && part(P.x, P.y - 30, st.dream ? '#7ec8ff' : '#ffcf6a', 12, 160, 0.4, 2.4);
  ctx.shock && ctx.shock(P.x, P.y - 20, 40, st.dream ? '#7ec8ff' : '#ffcf6a', 0.22);
  ctx.flashHit && ctx.flashHit();
  say(st.dream ? '闭目 · 堕入梦层' : '睁眼 · 回到长夜', 1.4);
  // 梦层：现有敌人转为梦魇形态；睁眼层恢复
  for (const f of foes) {
    if (f.dead || f.def_.boss) continue;
    setFoeLayer(f, st.dream);
  }
  // 梦层平台：隐藏偶数平台，露出「梦桥」
  for (const a of arenas) {
    if (!a.plats) continue;
    if (!a._platsBase) a._platsBase = a.plats.map(p => ({ ...p }));
    if (st.dream) {
      a.plats = a._dreamPlats ? a._dreamPlats.map(p=>({...p})) : a._platsBase.filter((_, i) => i % 2 === 1).concat(
        a._platsBase.filter((_, i) => i % 2 === 0).map(p => ({ x: p.x + 40, y: Math.max(90, p.y - 40), w: p.w * 0.7, dream: true }))
      );
    } else a.plats = a._platsBase.map(p => ({ ...p }));
  }
}

/** 灯火共鸣 */
export function tickReso(ctx, dt){
  const { roster, ri, P, st, foes, say, sfx, shake, ring, part, heal, hitCircle, num } = ctx;
  if (roster.length < 2) return;
  // Active play earns most of the gauge; waiting and repeated swaps cannot fill it.
  if (foes.some(f => !f.dead) && st.reso < 20) st.reso = Math.min(20, st.reso + dt);
  st.relayWindow = Math.max(0, (st.relayWindow || 0) - dt);
  st.relayCd = Math.max(0, (st.relayCd || 0) - dt);
  if (st.reso >= RESO_NEED && !st.resoReady) { st.resoReady = true; say('灯火共鸣就绪', 1); sfx && sfx('bell'); }
}

export function gainReso(ctx, amount){
  if (ctx.roster.filter(r=>r.alive).length < 2) return;
  const bonus = ctx.st.dream ? lampPath().resonance : 1;
  ctx.st.reso = Math.min(RESO_NEED, (ctx.st.reso || 0) + amount * bonus);
}
export function onSwapReso(ctx){
  if (ctx.st.relayWindow > 0 && !(ctx.st.relayCd > 0)) {
    gainReso(ctx, 16); ctx.st.relayWindow = 0; ctx.st.relayCd = 5;
    ctx.say('接力成功 · 共鸣 +16', 0.8);
  }
}

export function fireReso(ctx){
  const { st, P, C, roster, ri, say, sfx, shake, ring, part, heal, hitCircle, num, GY } = ctx;
  if (!st.resoReady && (st.reso || 0) < RESO_NEED) return;
  st.reso = 0; st.resoReady = false;
  const me = C().id;
  const mate = roster.find((r, i) => i !== ri && r.alive) || roster[ri];
  const bond = Math.max(S.aff?.[me] || 0, S.aff?.[mate.id] || 0);
  const bondMul = 1 + (bond >= 90 ? 0.35 : bond >= 60 ? 0.2 : bond >= 30 ? 0.1 : 0);
  const title = RESO_TITLE[me + '+' + mate.id] || RESO_TITLE[mate.id + '+' + me] || `${CHARS[me]?.name || ''} × ${CHARS[mate.id]?.name || ''} · 灯火共鸣`;
  const fancy = bond >= 60 ? (bond >= 90 ? ' ★★★' : ' ★★') : '';
  say(title + fancy, 1.0); sfx && sfx('reso'); shake && shake(6);
  if (ctx.root && ctx.h) {
    const cut = ctx.h('div.ak-cutin' + (bond >= 60 ? '.fancy' : ''), {},
      ctx.h('img.ak-cutin-bg', { src: 'assets/cg/key_skill_cutin.webp', alt: '' }),
      ctx.h('em', {}, '灯火共鸣'), ctx.h('b', {}, title + fancy));
    ctx.root.append(cut); setTimeout(() => cut.remove(), 700);
  }
  const support = mate.id === me ? me : mate.id;
  const profile = support === 'qi' ? {rad:170,pow:4,st:['stun',1]} : support === 'xianwei' ? {rad:240,pow:3.2,launch:400}
    : support === 'baiji' ? {rad:220,pow:3.4,st:['poison',1]} : support === 'tushanjiao' ? {rad:200,pow:3,st:['freeze',1]}
    : support === 'ali' ? {rad:180,pow:2.2,heal:0.2} : {rad:200,pow:3.6,st:['brk',1]};
  const rad = profile.rad * bondMul;
  ctx.shock && ctx.shock(P.x, P.y - 26, Math.min(rad * 0.4, 50), '#ffcf6a', 0.28);
  part && part(P.x, P.y - 30, '#ffe7a0', 12, 180, 0.4, 2.4);
  ctx.sparks && ctx.sparks(P.x, P.y - 30, '#ffffff', 8, 1);
  hitCircle && hitCircle(P.x, P.y - P.h / 2, rad, profile.pow * bondMul, { skill: true, heavy: true, kb: 180, launch:profile.launch, col: '#ffcf6a', st: profile.st });
  for (const r of roster) if (r.alive) { const n = Math.round(r.s.hp * (profile.heal || 0.06) * bondMul); r.hp = Math.min(r.s.hp, r.hp + n); }
  st.resoUsed = (st.resoUsed || 0) + 1;
}

const RESO_TITLE = {
  'yangui+baiji': '晏归 × 白霁 · 狐火长明',
  'yangui+xianwei': '晏归 × 衔微 · 填海之光',
  'yangui+qi': '晏归 × 戚 · 断首守灯',
  'yangui+ali': '晏归 × 阿篱 · 琴弦灯花',
  'yangui+kualing': '晏归 × 夸铃 · 逐日同辉',
  'baiji+xianwei': '白霁 × 衔微 · 青丘东海',
  'qi+kualing': '戚 × 夸铃 · 战鼓逐日',
  'ali+baiji': '阿篱 × 白霁 · 梦与狐火',
};

/** 评级：加入双层与共鸣 */
export function ratingBonus(st){
  let sc = 0;
  if ((st.layerClears?.[0] || 0) > 0 && (st.layerClears?.[1] || 0) > 0) sc += 1;
  if ((st.resoUsed || 0) >= 1) sc += 1;
  if ((st.eyeMarks || 0) >= 5) sc += 1;
  if ((st.perfectDodges || 0) >= 2) sc += 1;
  return sc;
}

/** 绘制：灯芯光域 + 烛瞳弱点 + 梦层色调 */
export function drawHooks(g, ctx, camHelpers){
  const { P, st, foes, U, VW, GY, VH } = ctx;
  const { sx, sy, L, R } = camHelpers;
  const Rlamp = st._lampR || LAMP_BASE;
  // 灯芯光域（克制：淡光晕，不画大描边环）
  g.save();
  const grd = g.createRadialGradient(P.x, P.y - 20, 4, P.x, P.y - 20, Rlamp);
  grd.addColorStop(0, st.dream ? 'rgba(120,200,255,0.10)' : 'rgba(255,200,100,0.12)');
  grd.addColorStop(0.45, st.dream ? 'rgba(80,140,220,0.03)' : 'rgba(255,170,60,0.03)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(P.x, P.y - 20, Rlamp, 0, 6.283); g.fill();
  g.globalAlpha = 0.18 + 0.06 * Math.sin(st.t * 3);
  g.strokeStyle = st.dream ? 'rgba(160,220,255,0.55)' : 'rgba(255,210,120,0.55)';
  g.lineWidth = 0.8; g.beginPath(); g.arc(P.x, P.y - 20, Rlamp * 0.98, 0, 6.283); g.stroke();
  if (!st.dream) {
    g.globalAlpha = 0.4 + 0.12 * Math.sin(st.t * 6);
    g.fillStyle = '#ffcf6a';
    g.beginPath(); g.arc(P.x, P.y - 28 - Math.sin(st.t * 5) * 2, 3.5, 0, 6.283); g.fill();
  }
  g.restore();

  // 烛瞳：弱点红点 + 隐身显形提示
  if (st.eyeOn) {
    g.save();
    for (const f of foes) {
      if (f.dead) continue;
      if (f.weakMark > 0.3) {
        const a = Math.min(1, f.weakMark); const y = f.y - f.h - 10;
        g.globalAlpha = 0.5 + 0.5 * a; g.fillStyle = '#ff3a3a';
        g.beginPath(); g.arc(f.x, y, 3.5 + a * 2, 0, 6.283); g.fill();
        if (f.weakMark >= 1) { const op = weakOpen(f, P); g.globalAlpha = op ? 1 : 0.6; g.fillStyle = op ? '#ffe08a' : '#c9a0a0'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; if (op) g.fillText('破绽！', f.x, y - 10); }
      }
    }
    g.restore();
  }
  // 隐身敌人：灯外几乎透明
  for (const f of foes) {
    if (f.dead || !(f.def_.stealth || f.stealth)) continue;
    f._alphaMul = f.reveal || st.eyeOn ? 1 : 0.15;
  }

  // 机关绘制：裂墙/灯石常显（是地形），烛瞳只给提示（裂缝高亮、灯石次序）
  const secrets = st.secrets || [];
  for (const s of secrets) {
    if (s.taken || s.x == null) continue;
    g.save();
    if (s.kind === 'wall') {
      const jx = (s.shakeT > 0 ? (Math.random() - 0.5) * 3 : 0); s.shakeT = Math.max(0, (s.shakeT || 0) - 1 / 60);
      const x = s.x - s.w / 2 + jx, y = s.y - s.h;
      g.fillStyle = '#4a4440'; g.fillRect(x, y, s.w, s.h);
      g.fillStyle = '#5c5550'; for (let r = 0; r < s.h; r += 9) g.fillRect(x + ((r / 9) % 2 ? 0 : 5), y + r, s.w - 5, 4);
      g.strokeStyle = st.eyeOn ? 'rgba(255,214,120,0.95)' : 'rgba(20,16,14,0.8)'; g.lineWidth = st.eyeOn ? 1.6 : 1;
      g.beginPath(); g.moveTo(s.x - 4, y + 4); g.lineTo(s.x + 3, y + s.h * 0.35); g.lineTo(s.x - 3, y + s.h * 0.6); g.lineTo(s.x + 4, y + s.h - 4); g.stroke();
      if (st.eyeOn) { g.fillStyle = '#ffe08a'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillText(s.key ? '裂墙 · 残图' : '裂墙 · 重击', s.x, y - 5); }
    } else if (s.kind === 'stone') {
      g.fillStyle = s.lit ? '#ffcf6a' : '#3c3a44'; g.beginPath(); g.ellipse(s.x, s.y - 4, 9, 5, 0, 0, 6.283); g.fill();
      g.strokeStyle = s.lit ? '#fff1c0' : '#6b6878'; g.lineWidth = 1; g.stroke();
      if (s.lit) { g.globalAlpha = 0.35; g.fillStyle = '#ffcf6a'; g.beginPath(); g.arc(s.x, s.y - 8, 14, 0, 6.283); g.fill(); g.globalAlpha = 1; }
      if (st.eyeOn && !s.lit) { g.fillStyle = '#ffe08a'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText(String(s.ord), s.x, s.y - 14); }
    } else {
      const d = Math.hypot(s.x - P.x, s.y - (P.y - 26));
      const lit = s.kind === 'gate' ? true : (s.revealed || d < Rlamp);
      if (s.kind !== 'gate') s.revealed = s.revealed || lit;
      if (!lit) { g.restore(); continue; }
      if (s.kind === 'chest') {
        g.fillStyle = '#8a6a2a'; g.fillRect(s.x - 8, s.y - 14, 16, 12);
        g.fillStyle = '#d8b65a'; g.fillRect(s.x - 8, s.y - 14, 16, 3);
      } else if (s.kind === 'gate') {
        g.globalAlpha = st.dream ? 0.9 : 0.35;
        g.strokeStyle = st.dream ? '#7ec8ff' : '#c9b9ff'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(s.x, s.y - 20, 12, 22, 0, 0, 6.283); g.stroke();
      }
    }
    g.restore();
  }
}

export function drawDreamTint(g, cv, st){
  if (!st.dream) return;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = 'rgba(40,70,120,0.18)'; g.fillRect(0, 0, cv.width, cv.height);
  // 梦层边缘 vignette
  const vg = g.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.35, cv.width / 2, cv.height / 2, cv.width * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,20,50,0.45)');
  g.fillStyle = vg; g.fillRect(0, 0, cv.width, cv.height);
  // 漂浮梦尘
  g.globalAlpha = 0.35;
  for (let i = 0; i < 12; i++) {
    const x = ((st.t * 30 + i * 97) % (cv.width + 40)) - 20;
    const y = (Math.sin(st.t * 1.3 + i) * 0.35 + 0.5) * cv.height;
    g.fillStyle = i % 2 ? '#9ad4ff' : '#c9e8ff';
    g.beginPath(); g.arc(x, y, 1.5 + (i % 3), 0, 6.283); g.fill();
  }
  g.globalAlpha = 1;
}

export function sGoals(stage, st){
  const par = 50 + (stage.arenas?.length || 2) * 35 + (stage.boss ? 60 : 0);
  return [
    { k: 'time',  label: `速通 < ${Math.ceil(par)}s`, ok: st.t > 0 && st.t < par },
    { k: 'hits',  label: '受伤 ≤ 3', ok: st.hitsTaken <= 3 },
    { k: 'technique', label: '巧战：破弱点或精准闪避', ok: (st.eyeMarks || 0) >= 3 || (st.perfectDodges || 0) >= 2 },
    { k: 'dream', label: '双层清波（额外加分）', ok: (st.layerClears?.[0] || 0) > 0 && (st.layerClears?.[1] || 0) > 0 },
  ];
}


/** 关卡机关（地形/交互型，非「开瞳即得」）：
 *  - wall  裂墙：只有重击（连段终结/技能/冲刺突刺）才能击碎，碎后露出秘匣；第 7 关的裂墙藏「秘境残图」，集齐才开隐藏关
 *  - stones 灯石阵：三块灯石须按正确次序踩亮（烛瞳可看次序），错则全灭；成功升起窄台，需精准二段跳取高处秘匣
 *  - gate  梦门：清场后闭目（梦层）方可进入
 *  位置用比例 fx 记录，placeSecrets 在每次排布场地后换算成世界坐标 */
export function seedSecrets(arenas, stage){
  const out = [];
  if (!stage || !arenas?.length || stage.kind === 'tower') return out;
  const seed = [...String(stage.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const normal = arenas.map((a, i) => ({ a, i })).filter(o => !o.a.boss);
  if (!normal.length) return out;
  const wA = normal[0].i;
  out.push({ kind: 'wall', ai: wA, fx: 0.68, w: 22, h: 46, hp: 3, taken: false });
  if (stage.idx === 6 && !stage.hidden) {
    const last = normal[normal.length - 1].i;
    out.push({ kind: 'wall', ai: last, fx: last === wA ? 0.6 : 0.8, w: 24, h: 52, hp: 4, taken: false, key: true });
  }
  if (stage.idx >= 1 || stage.hidden) {
    const sA = (normal[1] || normal[0]).i;
    const orders = [[1, 2, 3], [2, 3, 1], [3, 1, 2], [1, 3, 2], [2, 1, 3], [3, 2, 1]][seed % 6];
    [0.22, 0.48, 0.7].forEach((fx, k) => out.push({ kind: 'stone', ai: sA, fx, w: 16, h: 10, ord: orders[k], lit: false, taken: false, group: sA }));
  }
  for (const { a, i } of normal) {
    if (i < arenas.length - 1 && (stage.dream || i % 2 === 0)) out.push({ kind: 'gate', ai: i, arena: i, fx: 0.92, w: 24, h: 40, taken: false });
  }
  return out;
}

export function placeSecrets(st, arenas){
  for (const s of st.secrets || []) {
    const a = arenas[s.ai]; if (!a || s.fx == null) continue;
    s.x = a.x0 + s.fx * (a.x1 - a.x0); if (s.y == null) s.y = 232; s.arena = s.ai;
  }
}

/** 近战/技能命中区域检测裂墙。power: 0 普通 1 重击 */
export function hitWalls(ctx, x0, x1, power){
  const { st, say, sfx, part, shake, num } = ctx;
  for (const s of st.secrets || []) {
    if (s.kind !== 'wall' || s.taken || s.x == null) continue;
    if (s.x + s.w / 2 < x0 || s.x - s.w / 2 > x1) continue;
    if ((s.cd || 0) > st.t) continue; s.cd = st.t + 0.18;
    if (!power) { part && part(s.x, s.y - 24, '#9a8f80', 4, 90, 0.3, 2); if (st.t > (s.hintAt || 0)) { say('墙体坚硬 · 需重击（连段终结 / 冲刺突刺 / 技能）', 1.4); s.hintAt = st.t + 5; } sfx && sfx('hit'); continue; }
    s.hp--; s.shakeT = 0.2; shake && shake(2.5); sfx && sfx('heavy');
    part && part(s.x, s.y - 24, '#b8a68a', 10, 170, 0.45, 3);
    if (s.hp > 0) { num && num(s.x, s.y - s.h - 6, '裂', '#e6d3a8'); continue; }
    s.taken = true; sfx && sfx('secret'); part && part(s.x, s.y - 20, '#ffd24a', 18, 200, 0.6, 3);
    st.secretWalls = (st.secretWalls || 0) + 1;
    if (s.key) {
      const rid = ctx.stage?.region;
      if (rid && S.act) { S.act.hkeys = S.act.hkeys || {}; S.act.hkeys[rid] = true; }
      st.foundKey = true;
      say('裂墙崩落 · 得「秘境残图」——本域隐藏关的入口显现了', 2.4);
    } else say('裂墙崩落 · 内藏秘匣', 1.4);
    st.secrets.push({ kind: 'chest', x: s.x, y: 232, w: 20, h: 14, taken: false, revealed: true });
  }
}

/** 拾取秘匣 / 灯石 / 梦门 */
export function trySecretPickup(ctx){
  const { st, P, say, sfx, part } = ctx;
  if (!st.secrets) return null;
  for (const s of st.secrets) {
    if (s.taken || s.x == null) continue;
    if (s.kind === 'wall') continue;
    if (s.kind === 'stone') {
      if (s.lit || !P.ground || Math.abs(s.x - P.x) > 14) continue;
      const grp = st.secrets.filter(o => o.kind === 'stone' && o.group === s.group);
      const next = grp.filter(o => o.lit).length + 1;
      if (s.ord === next) {
        s.lit = true; sfx && sfx('bell'); part && part(s.x, s.y - 6, '#ffcf6a', 8, 110, 0.4, 2);
        if (next === grp.length) {
          grp.forEach(o => { o.taken = true; });
          st.secretPaths = (st.secretPaths || 0) + 1;
          return { kind: 'path', x: grp.reduce((m, o) => Math.max(m, o.x), 0) - 60, arena: s.ai };
        }
      } else {
        grp.forEach(o => { o.lit = false; }); s.failT = 0.5; sfx && sfx('warn');
        if (st.t > (s.hintAt || 0)) { say('灯石次序错乱 · 全部熄灭（开烛瞳可见次序）', 1.6); s.hintAt = st.t + 3; }
      }
      continue;
    }
    if (!s.revealed && s.kind !== 'gate') continue;
    if (Math.abs(s.x - P.x) > 22 || Math.abs(s.y - P.y) > 40) continue;
    if (s.kind === 'gate' && (!st.dream || !ctx.arenas[s.arena]?.done)) {
      if (st.t > (s.hintAt || 0)) { say(!st.dream ? '梦门微亮 · 清场后闭目走入，可挑战额外灵魄' : '先肃清此地，再进入梦门', 1); s.hintAt=st.t+4; }
      continue;
    }
    s.taken = true;
    if (s.kind === 'chest') {
      say('秘匣开启', 1.2); sfx && sfx('secret');
      part && part(s.x, s.y - 10, '#ffd24a', 16, 160, 0.6, 3);
      st.secretChests = (st.secretChests || 0) + 1;
      return { kind: 'chest', gold: 40 + Math.round(Math.random() * 60), dust: st.dream ? 2 : 0 };
    }
    if (s.kind === 'gate') {
      say('梦门开启 · 击退梦魇，赢取灵魄', 1.4); sfx && sfx('portal');
      st.secretGates = (st.secretGates || 0) + 1;
      return { kind: 'gate', arena:s.arena };
    }
  }
  return null;
}

/** 烛瞳使首领预警更早可见（缩短感知延迟） */
export function eyeWarnScale(st){
  return st.eyeOn ? 0.55 : 1; // 预警时间视觉加速：实际 warn 仍由引擎控制，此值用于绘制闪烁
}

/** 灯域内夜鬼防御削弱系数 */
export function lampDefMul(f){
  if (!f || !f.inLamp || !f.lampWeak) return 1;
  return Math.max(0.55, 1 - f.lampWeak * 0.45);
}
