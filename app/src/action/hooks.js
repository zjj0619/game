// 招牌玩法：灯芯半径 / 烛瞳一瞥 / 闭目·睁眼 / 灯火共鸣
// 被 engine.js 调用；保持无状态依赖，全部经 ctx 传入。
import { S } from '../engine/state.js';
import { CHARS } from '../data/characters.js';

export const EYE_COST = 8;      // 每秒耗蓝
export const EYE_CD = 0.6;
export const DREAM_CD = 4.5;
export const RESO_NEED = 100;
export const LAMP_BASE = 90;    // 灯芯基础半径（世界坐标）

const NIGHT_AI = new Set(['stalker', 'shade', 'assassin', 'bomber']);
const DARK_EL = new Set(['dark', 'water']);

export function lampRadius(ctx){
  const { C, P, st } = ctx;
  let r = LAMP_BASE + (S.city?.lamp || 1) * 8;
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
  const cost = EYE_COST * dt;
  if (c.mp < cost) { st.eyeOn = false; say('烛瞳黯淡', 0.8); return; }
  c.mp -= cost;
  st.eyeT = (st.eyeT || 0) + dt;
  for (const f of foes) {
    if (f.dead) continue;
    const d = Math.hypot(f.x - P.x, (f.y - f.h / 2) - (P.y - 26));
    if (d < 320) {
      f.weakMark = Math.min(1, (f.weakMark || 0) + dt * 1.4);
      if (f.weakMark >= 1 && !f._marked) { f._marked = true; f.brk = Math.max(f.brk || 0, 4); }
    }
  }
}

export function toggleEye(ctx){
  const { st, C, say, sfx } = ctx;
  if (st.over) return;
  if (st.eyeOn) { st.eyeOn = false; st.eyeCd = EYE_CD; return; }
  if (st.eyeCd > 0) return;
  if (C().mp < 5) { say('法力不足', 0.7); return; }
  st.eyeOn = true; sfx && sfx('eye'); say('烛瞳 · 开', 0.6);
}

/** 命中时消费弱点 → 必暴 */
export function consumeWeak(f){
  if (!f || !(f.weakMark >= 1)) return false;
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
  part && part(P.x, P.y - 30, st.dream ? '#7ec8ff' : '#ffcf6a', 36, 280, 0.9, 4);
  say(st.dream ? '闭目 · 堕入梦层' : '睁眼 · 回到长夜', 1.4);
  // 梦层：现有敌人转为梦魇形态；睁眼层恢复
  for (const f of foes) {
    if (f.dead || f.def_.boss) continue;
    if (st.dream) {
      if (!f._awakeHp) { f._awakeHp = f.hp; f._awakeMax = f.max; f._awakeAtk = f.atk; }
      f.dream = true; f.max = Math.round(f._awakeMax * 1.35); f.hp = Math.min(f.max, Math.round(f.hp * 1.35)); f.atk = Math.round(f._awakeAtk * 1.15);
      f.stealth = true; f.reveal = false;
    } else if (f._awakeHp != null) {
      f.dream = false; f.stealth = false; f.reveal = true;
      const ratio = f.hp / f.max; f.max = f._awakeMax; f.hp = Math.max(1, Math.round(f.max * ratio)); f.atk = f._awakeAtk;
    }
  }
  // 梦层平台：隐藏偶数平台，露出「梦桥」
  for (const a of arenas) {
    if (!a.plats) continue;
    if (!a._platsBase) a._platsBase = a.plats.map(p => ({ ...p }));
    if (st.dream) {
      a.plats = a._platsBase.filter((_, i) => i % 2 === 1).concat(
        a._platsBase.filter((_, i) => i % 2 === 0).map(p => ({ x: p.x + 40, y: Math.max(90, p.y - 40), w: p.w * 0.7, dream: true }))
      );
    } else a.plats = a._platsBase.map(p => ({ ...p }));
  }
}

/** 灯火共鸣 */
export function tickReso(ctx, dt){
  const { roster, ri, P, st, foes, say, sfx, shake, ring, part, heal, hitCircle, num } = ctx;
  if (roster.length < 2) return;
  const near = roster.filter((r, i) => i !== ri && r.alive);
  // 简化：队伍里有存活同伴即缓慢积攒；换人瞬间猛涨
  const rate = 6 + near.length * 4 + (st._resoBoost || 0);
  st.reso = Math.min(RESO_NEED, (st.reso || 0) + rate * dt);
  st._resoBoost = Math.max(0, (st._resoBoost || 0) - dt * 20);
  if (st.reso >= RESO_NEED && !st.resoReady) { st.resoReady = true; say('灯火共鸣就绪', 1); sfx && sfx('bell'); }
}

export function onSwapReso(ctx){ ctx.st._resoBoost = 40; ctx.st.reso = Math.min(RESO_NEED, (ctx.st.reso || 0) + 18); }

export function fireReso(ctx){
  const { st, P, C, roster, ri, say, sfx, shake, ring, part, heal, hitCircle, num } = ctx;
  if (!st.resoReady && (st.reso || 0) < RESO_NEED) return;
  st.reso = 0; st.resoReady = false;
  const me = C().id;
  const mate = roster.find((r, i) => i !== ri && r.alive) || roster[ri];
  const bond = Math.max(S.aff?.[me] || 0, S.aff?.[mate.id] || 0);
  const bondMul = 1 + (bond >= 90 ? 0.35 : bond >= 60 ? 0.2 : bond >= 30 ? 0.1 : 0);
  const title = RESO_TITLE[me + '+' + mate.id] || RESO_TITLE[mate.id + '+' + me] || `${CHARS[me]?.name || ''} × ${CHARS[mate.id]?.name || ''} · 灯火共鸣`;
  const fancy = bond >= 60 ? (bond >= 90 ? ' ★★★' : ' ★★') : '';
  say(title + fancy, 2.2); sfx && sfx('reso'); shake && shake(12 + (bond >= 60 ? 4 : 0));
  if (ctx.root && ctx.h) {
    const cut = ctx.h('div.ak-cutin' + (bond >= 60 ? '.fancy' : ''), {},
      ctx.h('img.ak-cutin-bg', { src: 'assets/cg/key_skill_cutin.webp', alt: '' }),
      ctx.h('em', {}, '灯火共鸣'), ctx.h('b', {}, title + fancy));
    ctx.root.append(cut); setTimeout(() => cut.remove(), 1600 + (bond >= 90 ? 400 : 0));
  }
  const rad = 200 * bondMul;
  ring && ring(P.x, P.y - 26, rad * 0.9, '#ffcf6a', 0.8);
  part && part(P.x, P.y - 30, '#ffe7a0', Math.round(50 * bondMul), 360, 1.1, 5);
  hitCircle && hitCircle(P.x, P.y - P.h / 2, rad, 3.2 * bondMul, { skill: true, heavy: true, kb: 280, col: '#ffcf6a', st: ['brk', 0.8] });
  for (const r of roster) if (r.alive) { const n = Math.round(r.s.hp * 0.12 * bondMul); r.hp = Math.min(r.s.hp, r.hp + n); }
  heal && heal(C().s.hp * 0.08 * bondMul, true);
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
  if (st.dreamSeen && st.awakeSeen) sc += 1;
  if ((st.resoUsed || 0) >= 1) sc += 1;
  if ((st.eyeMarks || 0) >= 5) sc += 1;
  return sc;
}

/** 绘制：灯芯光域 + 烛瞳弱点 + 梦层色调 */
export function drawHooks(g, ctx, camHelpers){
  const { P, st, foes, U, VW, GY, VH } = ctx;
  const { sx, sy, L, R } = camHelpers;
  const Rlamp = st._lampR || LAMP_BASE;
  // 灯芯光域
  g.save();
  const grd = g.createRadialGradient(P.x, P.y - 20, 8, P.x, P.y - 20, Rlamp);
  grd.addColorStop(0, st.dream ? 'rgba(120,200,255,0.22)' : 'rgba(255,200,100,0.28)');
  grd.addColorStop(0.55, st.dream ? 'rgba(80,140,220,0.08)' : 'rgba(255,170,60,0.08)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(P.x, P.y - 20, Rlamp, 0, 6.283); g.fill();
  // 灯芯边缘一圈细线
  g.strokeStyle = st.dream ? 'rgba(160,220,255,0.35)' : 'rgba(255,210,120,0.4)';
  g.lineWidth = 1.2; g.beginPath(); g.arc(P.x, P.y - 20, Rlamp * (0.92 + 0.04 * Math.sin(st.t * 3)), 0, 6.283); g.stroke();
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
        g.strokeStyle = '#ffd0d0'; g.lineWidth = 1; g.beginPath(); g.arc(f.x, y, 7 + a * 3, 0, 6.283); g.stroke();
        if (f.weakMark >= 1) { g.fillStyle = '#ffe08a'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText('弱点', f.x, y - 10); }
      }
    }
    g.restore();
  }
  // 隐身敌人：灯外几乎透明
  for (const f of foes) {
    if (f.dead || !(f.def_.stealth || f.stealth)) continue;
    f._alphaMul = f.reveal || st.eyeOn ? 1 : 0.15;
  }

  // 秘径 / 秘箱 / 梦门：灯照或烛瞳才显形；烛瞳画金线轮廓
  const secrets = st.secrets || [];
  for (const s of secrets) {
    if (s.taken) continue;
    const d = Math.hypot(s.x - P.x, s.y - (P.y - 26));
    const lit = d < Rlamp || st.eyeOn;
    s.revealed = lit;
    if (!lit && !st.eyeOn) continue;
    g.save();
    if (st.eyeOn) {
      g.strokeStyle = 'rgba(255,210,100,0.85)'; g.lineWidth = 1.5; g.setLineDash([4, 3]);
      g.strokeRect(s.x - s.w / 2 - 2, s.y - s.h - 2, s.w + 4, s.h + 4);
      g.setLineDash([]);
      g.fillStyle = '#ffe08a'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center';
      g.fillText(s.kind === 'chest' ? '秘匣' : s.kind === 'gate' ? '梦门' : '秘径', s.x, s.y - s.h - 8);
    }
    if (lit) {
      g.globalAlpha = st.eyeOn ? 1 : 0.75;
      if (s.kind === 'chest') {
        g.fillStyle = '#c9a227'; g.fillRect(s.x - 8, s.y - 14, 16, 12);
        g.fillStyle = '#ffe08a'; g.fillRect(s.x - 8, s.y - 14, 16, 3);
      } else if (s.kind === 'gate') {
        g.strokeStyle = st.dream ? '#7ec8ff' : '#ffcf6a'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(s.x, s.y - 20, 12, 22, 0, 0, 6.283); g.stroke();
      } else {
        g.fillStyle = 'rgba(255,200,100,0.35)'; g.fillRect(s.x - s.w / 2, s.y - 4, s.w, 4);
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
}

export function sGoals(stage, st){
  const par = 50 + (stage.arenas?.length || 2) * 35 + (stage.boss ? 60 : 0);
  return [
    { k: 'time',  label: `速通 < ${Math.ceil(par)}s`, ok: st.t > 0 && st.t < par },
    { k: 'hits',  label: '受伤 ≤ 3', ok: st.hitsTaken <= 3 },
    { k: 'dream', label: '两层皆历', ok: !!(st.dreamSeen && st.awakeSeen) },
    { k: 'reso',  label: '共鸣 ≥ 1', ok: (st.resoUsed || 0) >= 1 },
  ];
}


/** 关卡开局埋藏秘匣 / 秘径 / 梦门 */
export function seedSecrets(arenas, stage){
  const out = [];
  for (const a of arenas) {
    const mid = (a.x0 + a.x1) / 2;
    out.push({ kind: 'chest', x: mid + 80, y: 232, w: 20, h: 14, taken: false, reward: a.i });
    out.push({ kind: 'path', x: a.x0 + 40, y: 180, w: 48, h: 6, taken: false, arena: a.i });
    if (stage.dream || a.i % 2 === 1) out.push({ kind: 'gate', x: a.x1 - 60, y: 232, w: 24, h: 40, taken: false, arena: a.i });
  }
  return out;
}

/** 拾取秘匣（灯照或烛瞳显形后走近） */
export function trySecretPickup(ctx){
  const { st, P, say, sfx, part } = ctx;
  if (!st.secrets) return null;
  for (const s of st.secrets) {
    if (s.taken || !s.revealed) continue;
    if (Math.abs(s.x - P.x) > 22 || Math.abs(s.y - P.y) > 40) continue;
    s.taken = true;
    if (s.kind === 'chest') {
      say('秘匣 · 灯下现形', 1.2); sfx && sfx('secret');
      part && part(s.x, s.y - 10, '#ffd24a', 16, 160, 0.6, 3);
      st.secretChests = (st.secretChests || 0) + 1;
      return { kind: 'chest', gold: 40 + Math.round(Math.random() * 60), dust: st.dream ? 2 : 0 };
    }
    if (s.kind === 'gate') {
      say(st.dream ? '梦门共鸣' : '梦门微亮 · 闭目可入', 1.4); sfx && sfx('portal');
      if (!st.dream) { /* 提示玩家可切换 */ }
      st.secretGates = (st.secretGates || 0) + 1;
      return { kind: 'gate' };
    }
    if (s.kind === 'path') {
      say('秘径显形', 1); sfx && sfx('bell');
      st.secretPaths = (st.secretPaths || 0) + 1;
      return { kind: 'path' };
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
