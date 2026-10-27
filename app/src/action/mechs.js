// 各区域第 7 关的秘境机关：每区一种独立解法，解开即得「秘境残图」并引出一段支线。
import { S } from '../engine/state.js';

const G = 232;
/** 机关定义：hint 用于关卡选择锁定提示；found 是解开时的支线旁白 */
export const MECHS = {
  jincheng: { kind: 'wall', name: '裂墙', hint: '在第 7 关找到可击碎的裂墙（重击）', found: ['裂墙后，是一条孩子们画满太阳的灯道。'] },
  qingqiu: { kind: 'ledge', name: '狐窝高枝', hint: '第 7 关高处有一截狐窝枝——二段跳的最高点才够得着', found: ['枝头的狐窝里有一撮白毛，和白姬的尾巴一个颜色。'] },
  donghai: { kind: 'lure', name: '潮汐石板', hint: '第 7 关的潮汐石板只认更重的东西——把敌人引上去压住', found: ['石板沉下去，海水退开一条缝，露出一块刻字的石头。'] },
  changyang: { kind: 'drum', name: '残阵军鼓', hint: '第 7 关的军鼓要按行军节拍连敲三记重击（不快不慢）', found: ['鼓声停了一下，又自己敲了一声——像在回应。'] },
  kunlun: { kind: 'lanterns', name: '书斋三灯', hint: '第 7 关的三盏书灯须在六息之内全部点亮（攻击点灯）', found: ['三灯同明，书架后的暗格弹开了。'] },
  hundun: { kind: 'shadow', name: '影阶', hint: '第 7 关有一道只在烛瞳下才踩得实的影阶', found: ['影阶尽头是一棵老树，树皮上刻满了等人的痕。'] },
  yugu: { kind: 'tree', name: '焦骨壳', hint: '第 7 关的焦骨壳比铁还硬——让敌人的蛮力替你砸开', found: ['骨壳裂开，里面透出一点暗红的余温。'] },
  beihai: { kind: 'ice', name: '薄冰', hint: '第 7 关的薄冰要从高处下坠猛踩（空中按下快速下落）', found: ['冰面碎开，冰下有鳞片在发光。'] },
  guixu: { kind: 'dream', name: '梦中石阶', hint: '第 7 关的石阶只存在于梦里——闭目再走', found: ['梦阶尽头，一张空座位上放着一盏没点的灯。'] },
};
export function mechHint(region){ return MECHS[region]?.hint || '在第 7 关寻找秘境机关'; }

/** 只在各区第 7 关（idx 6）生成；金城仍用裂墙 */
export function seedMech(stage, arenas){
  if (!stage || stage.hidden || stage.kind !== 'normal' || stage.idx !== 6 || !stage.region) return null;
  const M = MECHS[stage.region]; if (!M || M.kind === 'wall') return null;
  const normal = arenas.map((a, i) => ({ a, i })).filter(o => !o.a.boss); if (!normal.length) return null;
  const { a, i } = normal[normal.length - 1]; const X = f => a.x0 + f * (a.x1 - a.x0);
  const m = { kind: M.kind, region: stage.region, ai: i, solved: false, t: 0, plats: [], relic: null };
  switch (M.kind) {
    case 'ledge': m.plats = [{ x: X(0.74), y: G - 168, w: 38, solid: 'always' }]; m.relic = { x: X(0.74) + 19, y: G - 168 }; break;
    case 'lure': m.plate = { x: X(0.5), w: 46, load: 0 }; break;
    case 'drum': m.drum = { x: X(0.78), beats: [], last: -9 }; break;
    case 'lanterns': m.lamps = [{ x: X(0.3), y: G - 40 }, { x: X(0.55), y: G - 112 }, { x: X(0.8), y: G - 150 }].map(o => ({ ...o, lit: 0 })); m.plats = [{ x: X(0.8) - 30, y: G - 70, w: 60, solid: 'always' }]; break;
    case 'shadow': m.plats = [0, 1, 2].map(k => ({ x: X(0.5 + k * 0.1), y: G - 62 - k * 56, w: 44, solid: 'eye' })); m.relic = { x: X(0.7) + 22, y: G - 174 }; break;
    case 'tree': m.tree = { x: X(0.62), hp: 2, hitAt: -9 }; break;
    case 'ice': m.ice = { x: X(0.55), w: 60 }; m.plats = [{ x: X(0.55) - 110, y: G - 120, w: 50, solid: 'always' }]; break;
    case 'dream': m.plats = [0, 1, 2].map(k => ({ x: X(0.48 + k * 0.11), y: G - 58 - k * 52, w: 46, solid: 'dream' })); m.relic = { x: X(0.7) + 23, y: G - 162 }; break;
  }
  return m;
}

/** 当前可踩的机关平台（供 onPlat 碰撞） */
export function mechPlats(st){
  const m = st.mech; if (!m) return [];
  return m.plats.filter(p => p.solid === 'always' || (p.solid === 'eye' && st.eyeOn) || (p.solid === 'dream' && st.dream));
}

function solve(ctx, m, line){
  if (m.solved) return; m.solved = true;
  const { st, say, sfx, part, shake } = ctx;
  if (S.act) { S.act.hkeys = S.act.hkeys || {}; S.act.hkeys[m.region] = true; }
  st.foundKey = true; st.secretWalls = (st.secretWalls || 0) + 1;
  sfx && sfx('secret'); shake && shake(3);
  const p = m.relic || m.plate || m.drum || m.tree || m.ice || m.lamps?.[2]; part && part(p.x, (p.y || G) - 16, '#ffd24a', 18, 200, 0.6, 3);
  say((line || MECHS[m.region].found[0]) + ' · 得「秘境残图」', 3);
}

export function tickMech(ctx, dt){
  const { st, P, foes, say, sfx, part } = ctx; const m = st.mech; if (!m || m.solved) return;
  m.t += dt; const hint = (s, d = 1.8) => { if (st.t > (m.hintAt || 0)) { say(s, d); m.hintAt = st.t + 6; } };
  if (m.relic) {
    const r = m.relic; const onIt = P.ground && Math.abs(P.x - r.x) < 20 && Math.abs(P.y - r.y) < 4;
    if (onIt) { m.stand = (m.stand || 0) + dt; if (m.stand > 0.25) solve(ctx, m); } else m.stand = 0;
    if (m.kind === 'shadow' && !st.eyeOn && Math.abs(P.x - m.plats[0].x) < 60 && P.ground) hint('脚下有影子在晃——睁开烛瞳看看');
    if (m.kind === 'dream' && !st.dream && Math.abs(P.x - m.plats[0].x) < 60 && P.ground) hint('这里的风像梦里的——闭目试试');
  }
  if (m.kind === 'lure') {
    const pl = m.plate; let on = false;
    for (const f of foes) if (!f.dead && !f.def_?.fly && Math.abs(f.x - pl.x) < pl.w / 2 && (f.y == null || f.y >= G - 2)) on = true;
    pl.load = on ? pl.load + dt : Math.max(0, pl.load - dt * 0.5);
    if (P.ground && P.y >= G - 1 && Math.abs(P.x - pl.x) < pl.w / 2 && !on) hint('石板一动不动——它只认更重的东西');
    if (pl.load >= 0.6) solve(ctx, m);
  }
  if (m.kind === 'lanterns') {
    if (m.lamps.every(l => l.lit > 0)) { solve(ctx, m); return; }
    const had = m.lamps.some(l => l.lit > 0); for (const l of m.lamps) if (l.lit > 0) l.lit -= dt;
    if (had && !m.lamps.some(l => l.lit > 0)) hint('灯又灭了——要在六息之内点齐三盏', 1.4);
  }
  if (m.kind === 'tree') {
    const tr = m.tree;
    for (const f of foes) {
      if (f.dead) { continue; }
      const near = Math.abs(f.x - tr.x) < (f.w || 30) / 2 + 34 && Math.sign(tr.x - f.x || 1) === Math.sign(f.face || 1);
      if (f.state === 'atk' && near && !f._treeHit) { f._treeHit = true; tr.hp--; tr.hitAt = st.t; sfx && sfx('heavy'); part && part(tr.x, G - 40, '#c98a52', 10, 160, 0.4, 3);
        if (tr.hp <= 0) solve(ctx, m); else say('焦骨壳裂了一道缝', 1); }
      if (f.state !== 'atk') f._treeHit = false;
    }
  }
}

/** 玩家攻击命中区域（x0..x1），power 1 为重击 */
export function mechOnHit(ctx, x0, x1, power){
  const { st, P, say, sfx, part, num } = ctx; const m = st.mech; if (!m || m.solved) return;
  if (m.kind === 'drum') {
    const d = m.drum; if (d.x < x0 - 10 || d.x > x1 + 10 || st.t - (d.hitT || -9) < 0.15) return; d.hitT = st.t;
    if (!power) { if (st.t > (m.hintAt || 0)) { say('鼓面只回应重击', 1.2); m.hintAt = st.t + 4; } return; }
    const gap = st.t - d.last; d.last = st.t; d.pulse = 0.3; sfx && sfx('heavy');
    if (d.beats.length && (gap < 0.6 || gap > 1.2)) { d.beats = []; say(gap < 0.6 ? '太急了——行军的鼓不催' : '太慢了——鼓点断了', 1.2); sfx && sfx('warn'); }
    d.beats.push(st.t); num && num(d.x, G - 64, '咚'.repeat(d.beats.length), '#e6d3a8');
    if (d.beats.length >= 3) solve(ctx, m);
  }
  if (m.kind === 'lanterns') {
    for (const l of m.lamps) { if (l.x < x0 - 8 || l.x > x1 + 8 || Math.abs((P.y - 30) - l.y) > 46 || l.lit > 0) continue;
      l.lit = 6; sfx && sfx('bell'); part && part(l.x, l.y, '#ffcf6a', 8, 100, 0.4, 2); }
  }
  if (m.kind === 'tree') { const tr = m.tree; if (tr.x >= x0 - 10 && tr.x <= x1 + 10 && st.t > (m.hintAt || 0)) { say('焦骨壳比铁还硬——让敌人的蛮力替你砸开', 1.6); m.hintAt = st.t + 5; } }
}

/** 落地回调：vy 为落地前竖直速度 */
export function mechOnLand(ctx, x, vy){
  const { st, say, shake } = ctx; const m = st.mech; if (!m || m.solved || m.kind !== 'ice') return;
  if (Math.abs(x - m.ice.x) > m.ice.w / 2) return;
  if (vy >= 900) { shake && shake(5); solve(ctx, m); }
  else if (st.t > (m.hintAt || 0)) { say(vy > 400 ? '冰面咔地响了一声——再高一点，用力往下砸' : '冰面很薄……从高处往下砸也许能破开', 1.6); m.hintAt = st.t + 4; }
}

export function drawMech(g, st){
  const m = st.mech; if (!m) return; const t = st.t;
  g.save();
  for (const p of m.plats) {
    const on = p.solid === 'always' || (p.solid === 'eye' && st.eyeOn) || (p.solid === 'dream' && st.dream);
    if (p.solid === 'always') { g.globalAlpha = 1; g.fillStyle = 'rgba(52,42,30,.95)'; g.fillRect(p.x, p.y, p.w, 6); g.fillStyle = 'rgba(255,210,140,.4)'; g.fillRect(p.x, p.y, p.w, 1.2); continue; }
    g.globalAlpha = on ? 0.85 : (p.solid === 'eye' ? 0.08 + 0.05 * Math.sin(t * 3 + p.x) : 0.04);
    g.fillStyle = p.solid === 'eye' ? '#6a5a8a' : '#7fa8d8'; g.fillRect(p.x, p.y, p.w, 6);
    g.fillStyle = on ? 'rgba(220,210,255,.6)' : 'rgba(200,200,255,.2)'; g.fillRect(p.x, p.y, p.w, 1);
  }
  g.globalAlpha = 1;
  if (m.relic && !m.solved) { const r = m.relic; const vis = m.kind === 'ledge' || (m.kind === 'shadow' ? st.eyeOn : st.dream);
    g.globalAlpha = vis ? 0.9 : 0.15; g.fillStyle = '#e8c87a'; g.beginPath(); g.arc(r.x, r.y - 9 + Math.sin(t * 2) * 1.5, 3.5, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(232,200,122,.35)'; g.beginPath(); g.arc(r.x, r.y - 9, 7, 0, 6.283); g.stroke(); g.globalAlpha = 1; }
  if (m.plate) { const pl = m.plate; const d = Math.min(1, pl.load / 0.6); g.fillStyle = m.solved ? '#3a5a68' : '#4a4a52'; g.fillRect(pl.x - pl.w / 2, G - 3 + d * 2, pl.w, 3);
    g.fillStyle = `rgba(140,200,230,${0.25 + 0.4 * d})`; g.fillRect(pl.x - pl.w / 2, G - 3 + d * 2, pl.w, 1); }
  if (m.drum) { const d = m.drum; const s = 1 + (d.pulse > 0 ? (d.pulse -= 1 / 60) : 0) * 0.3; g.save(); g.translate(d.x, G - 22); g.scale(s, s);
    g.fillStyle = '#5a3424'; g.fillRect(-14, -20, 28, 40); g.fillStyle = '#c9b08a'; g.beginPath(); g.ellipse(0, -20, 14, 4, 0, 0, 6.283); g.fill(); g.restore();
    if (!m.solved) for (let k = 0; k < 3; k++) { g.fillStyle = k < d.beats.length ? '#e6c06a' : 'rgba(230,200,140,.25)'; g.fillRect(d.x - 10 + k * 8, G - 52, 4, 4); } }
  if (m.lamps) for (const l of m.lamps) { const on = m.solved || l.lit > 0; g.fillStyle = '#3a3026'; g.fillRect(l.x - 1, l.y - 18, 2, 8);
    g.fillStyle = on ? '#ffd27a' : '#5a5046'; g.fillRect(l.x - 5, l.y - 10, 10, 13);
    if (on) { g.globalAlpha = 0.25; g.fillStyle = '#ffcf6a'; g.beginPath(); g.arc(l.x, l.y - 4, 16, 0, 6.283); g.fill(); g.globalAlpha = 1;
      if (!m.solved) { g.fillStyle = 'rgba(255,220,140,.8)'; g.fillRect(l.x - 6, l.y + 6, 12 * (l.lit / 6), 1.5); } } }
  if (m.tree) { const tr = m.tree; const k = tr.hp; const sh = st.t - tr.hitAt < 0.2 ? Math.sin(t * 80) * 2 : 0;
    if (!m.solved) { g.fillStyle = '#3c2a20'; g.beginPath(); g.ellipse(tr.x + sh, G - 26, 20, 26, 0, 0, 6.283); g.fill();
      g.strokeStyle = '#8a4a2a'; g.lineWidth = 1.5; if (k < 2) { g.beginPath(); g.moveTo(tr.x - 6, G - 46); g.lineTo(tr.x + 2, G - 28); g.lineTo(tr.x - 3, G - 10); g.stroke(); } }
    else { g.fillStyle = 'rgba(200,90,40,.35)'; g.beginPath(); g.arc(tr.x, G - 12, 10, 0, 6.283); g.fill(); } }
  if (m.ice) { const ic = m.ice; g.fillStyle = m.solved ? 'rgba(20,40,60,.9)' : 'rgba(170,215,240,.55)'; g.fillRect(ic.x - ic.w / 2, G - 2, ic.w, 4);
    if (!m.solved) { g.strokeStyle = 'rgba(230,245,255,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(ic.x - 12, G); g.lineTo(ic.x, G - 1); g.lineTo(ic.x + 10, G + 1); g.stroke(); }
    else { g.fillStyle = 'rgba(140,220,255,.5)'; g.beginPath(); g.arc(ic.x, G + 2, 4 + Math.sin(t * 3), 0, 6.283); g.fill(); } }
  g.restore();
}
