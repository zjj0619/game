// v2.0 烬城枢纽：闯关地图、关卡详情与出战、结算、伙伴、异兽、铁坊、烬城建设、试炼、每日
import { idbGet, idbSet } from '../engine/ai.js';
import { S, save, AUTO, stats, addItem, addGold, expNeed, ach, has } from '../engine/state.js';
import { CHARS, EL_COLOR } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { REGIONS, REGION_ORDER } from '../data/regions.js';
import { h, btn, asset, icon, toast, panel, confirmBox, tutorial, haptic } from '../engine/ui.js';
import { playBgm, sfx } from '../engine/audio.js';
import { setAmbient } from '../engine/fx.js';
import { ACHARS, ASKILLS, WEAPON, ACTION_ROSTER, SKINS, UNLOCK_LV, ULT_LV, SKILL_MAX, TYPE_NAME, skillPow, skillCd } from '../action/data.js';
import { AFOES, ABOSSES, AI_NAME, foeStats } from '../action/foes.js';
import { STAGES, REGION_STAGES, towerStage, rushStage, DAILY, dailyStage, KEY_SECRET_IDS } from '../action/stages.js';
import { GEAR, RARITY, GAFF, fxName, rarOf } from '../action/gear.js';
import { runStage } from '../action/engine.js';
import * as AP from '../action/progress.js';
import { game, show } from '../main.js';
import { openMenu } from './menu.js';
import { portrait as posePor, hubPose, resultPose } from '../engine/pose.js';

const EL_NAME = { fire:'火', water:'水', wood:'木', metal:'金', earth:'土', light:'光', dark:'暗', none:'无' };
const OBJ_NAME = { clear:'歼灭全部敌人', timed:'限时内抵达终点', guard:'护住长明灯不灭' };
const RCOL = r => RARITY[r]?.col || '#ccc';
const portrait = (id, pose) => posePor(id, pose);
const gearName = id => ITEMS[id]?.name || id;
const fmt = n => n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n);
function power(id){ const s = AP.actStats(id); return Math.round(s.hp * 0.25 + (s.atk + s.mag) * 2.2 + s.def * 2 + (s.crit || 0) * 300); }
const teamPower = team => team.reduce((a, id) => a + power(id), 0);
function rec(stage){ return Math.round((stage.lv || 1) * 40 + 120); }
function bar(){
  const el = h('div.hb-top', {},
    h('span.hb-gold', {'data-v': String(S.gold)}, '✦ ' + fmt(S.gold)),
    h('span.hb-star', {'data-v': String(AP.totalStars())}, '★ ' + AP.totalStars()),
    h('span.hb-tw', {'data-v': String(S.act.tower)}, '塔 ' + S.act.tower));
  return el;
}
function bumpRes(sel, next, fmtFn){
  const n = document.querySelector(sel); if (!n) return;
  const prev = +n.getAttribute('data-v') || 0;
  if (next === prev) return;
  n.setAttribute('data-v', String(next));
  n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop');
  const t0 = performance.now(), dur = 420;
  const tick = now => {
    const k = Math.min(1, (now - t0) / dur);
    const v = Math.round(prev + (next - prev) * (1 - Math.pow(1 - k, 3)));
    n.textContent = fmtFn(v);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
export function refreshHubBar(){
  bumpRes('.hb-gold', S.gold, v => '✦ ' + fmt(v));
  bumpRes('.hb-star', AP.totalStars(), v => '★ ' + v);
  bumpRes('.hb-tw', S.act.tower, v => '塔 ' + v);
}
function header(title, back, extra){ return h('div.hub-head', {}, btn('‹ 返回', back || (() => game.hub()), 'sm hb-back'), h('div.hub-title', {}, title), h('div.hub-hr', {}, extra || null, bar())); }
function screen(cls, bg, ...kids){ return h('div.screen.hubs.' + cls, {}, h('div.hub-bg', { style:{ backgroundImage:`url(${asset(bg)})` } }), h('div.hub-shade'), ...kids); }
function chip(text, cls = ''){ return h('span.chip' + (cls ? '.' + cls : ''), {}, text); }
function elChip(el){ return el ? h('span.elc', { style:{ background: EL_COLOR?.[el] || '#888' } }, EL_NAME[el] || el) : null; }
function saveNow(){ try { save(AUTO); } catch (e) {} }
function dot(on){ return on ? h('i.rdot') : null; }
export function hubBadges(){ const m = AP.MISSIONS.filter(x => !S.daily.claimed[x.id] && (S.daily.prog[x.id] || 0) >= x.need).length; const pets = Object.keys(AP.PETS).filter(b => !S.act.pets[b] && (S.act.souls[b] || 0) >= AP.SOUL_NEED).length; const secrets = KEY_SECRET_IDS.filter(id => AP.stageUnlocked(id) && !S.act.cleared[id]).length;
  const sp = AP.actRoster().some(id => AP.spFree(id) > 0 && ACHARS[id].skills.some(k => { const l = AP.skillLv(id, k); return l && l < SKILL_MAX; })); return { m, pets, sp, secrets }; }

// —— 枢纽 ——
export function hubScreen(){
  AP.ensureAct(); const lead = S.act.team[0] || 'yangui'; const b = hubBadges();
  const nextStage = (() => { for (const rid of REGION_ORDER) for (const id of REGION_STAGES[rid].slice(0, 10)) if (!S.act.cleared[id]) return AP.stageUnlocked(id) ? STAGES[id] : null; return null; })();
  const tile = (cls, name, sub, on, badge, bg) => h('div.htile.' + cls, { onclick: () => { sfx('click'); on(); } },
    bg ? h('div.htile-art', { style: { backgroundImage: `url(${asset(bg)})` } }) : null,
    h('div.htile-shade'), h('b', {}, name), sub ? h('small', {}, sub) : null, dot(badge));
  const MORE_ROWS = [
    ['山海异兽', () => show(petScreen()), b.pets > 0, 'bg/qingqiu_forest'],
    ['铸灯铁坊', () => show(forgeScreen()), false, 'bg/yaochi'],
    ['烬城建设', () => show(cityScreen()), false, 'stagecard/jincheng_5'],
    ['信物秘境', () => show(secretStagesScreen()), b.secrets > 0, 'cg/key_secret_realm'],
    ['九州探索', () => game.world(), false, 'bg/kunlun_gate'],
    ['菜单', () => openMenu(), false, 'cg/key_candle_eye'],
  ];
  const more = () => {
    const p = panel('更多', { cls: 'hub-more filled' });
    const row = (name, on, badge, bg) => h('button.hm-row', { onclick: () => { p.close(); sfx('click'); on(); } },
      bg ? h('div.hm-art', { style: { backgroundImage: `url(${asset(bg)})` } }) : null,
      h('div.hm-shade'), h('b', {}, name), badge ? h('i.rdot') : null);
    p.body.append(...MORE_ROWS.map(([n, on, badge, bg]) => row(n, on, badge, bg)));
  };
  const nextSub = nextStage ? nextStage.name : '已通';
  const advBg = nextStage ? ('stagecard/' + nextStage.id) : 'bg/kunlun_gate';
  const root = screen('hub.clean', 'cg/key_hub_sanctuary',
    h('div.hub-head', {}, h('div.hub-logo', {}, '烬城'), h('div.hub-hr', {}, bar(), btn('菜单', () => openMenu(), 'sm ghost'))),
    h('div.hub-main', {},
      h('div.hub-hero', { onclick: () => show(heroesScreen(lead)) },
        h('img.hh-por', { src: hubPose(lead) }),
        h('div.hh-info', {}, h('b', {}, CHARS[lead].name), h('span', {}, `Lv ${S.party[lead].lv}`))),
      h('div.hub-grid.slim', {},
        tile('t-adv', '闯关', nextSub, () => show(adventureScreen(nextStage?.region)), false, advBg),
        tile('t-story', '剧情', S.chapter ? S.chapter.split('·')[0].trim() : '序章', () => game.story(), false, 'bg/yaochi'),
        tile('t-hero', '伙伴', null, () => show(heroesScreen()), b.sp, 'bg/yuetai'),
        tile('t-trial', '试炼', null, () => show(trialScreen()), b.m > 0, 'stagecard/beihai_3'),
        tile('t-more', '更多', null, more, b.pets > 0 || b.secrets > 0, 'bg/qingqiu_forest'))));
  return root;
}

// —— 山海闯关：区域 × 关卡路径 ——
const NODE_POS = [[7,58],[16,36],[25,56],[34,31],[43,52],[52,27],[61,48],[70,25],[79,44],[90,22],[90,62]];
export function adventureScreen(rid){
  AP.ensureAct(); rid = rid && AP.regionUnlocked(rid) ? rid : (REGION_ORDER.filter(r => AP.regionUnlocked(r)).pop() || 'jincheng');
  const R = REGIONS[rid]; try { playBgm(R.bgm || rid); } catch(e) {} const ids = REGION_STAGES[rid];
  const tabs = h('div.adv-tabs', {}, ...REGION_ORDER.map((r, i) => { const un = AP.regionUnlocked(r);
    return h('div.adv-tab' + (r === rid ? '.on' : '') + (un ? '' : '.lock'), { onclick: () => { if (!un) { toast(`通关「${REGIONS[REGION_ORDER[i - 1]].name.split('·')[0]}」第 10 关后开放`); return; } sfx('page'); show(adventureScreen(r)); } },
      h('b', {}, R && REGIONS[r].name.split('·')[0]), h('small', {}, un ? `★${AP.regionStars(r)}/33` : '未开放')); }));
  const path = h('svg', {}); const nodes = ids.map((id, i) => { const st = STAGES[id]; const un = AP.stageUnlocked(id); const best = S.act.best[id]; const [x, y] = NODE_POS[i];
    return h('div.snode' + (st.boss ? '.boss' : '') + (st.hidden ? '.hidden' : '') + (un ? '' : '.lock') + (S.act.cleared[id] ? '.done' : '') + (un && !S.act.cleared[id] ? '.next' : ''), { style:{ left: x + '%', top: y + '%' }, onclick: () => { if (!un) { toast(st.kind==='keysecret' ? ('需要：'+(ITEMS[st.needItem]?.name||'关键道具')) : st.hidden ? '本区十关全部通关后开放' : '先通关上一关'); return; } sfx('click'); stageDetail(st); } },
      h('div.sn-c', {}, st.boss ? h('img', { src: asset(ABOSSES[st.boss]?.img || 'enemy/a0') }) : h('span', {}, st.hidden ? '秘' : i + 1)),
      h('div.sn-n', {}, st.name), h('div.sn-s', {}, best ? '★'.repeat(AP.stars(best)) + '☆'.repeat(3 - AP.stars(best)) : un ? 'Lv ' + st.lv : '🔒'), S.act.hard[id] ? h('i.sn-h', {}, '难') : null); });
  const svgNS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('adv-path');
  const pts = NODE_POS.slice(0, 10).map(([x, y]) => `${x},${y}`).join(' '); const pl = document.createElementNS(svgNS, 'polyline'); pl.setAttribute('points', pts); svg.append(pl);
  const hl = document.createElementNS(svgNS, 'polyline'); hl.setAttribute('points', `${NODE_POS[9][0]},${NODE_POS[9][1]} ${NODE_POS[10][0]},${NODE_POS[10][1]}`); hl.classList.add('dash'); svg.append(hl);
  return screen('adv', 'bg/' + (STAGES[ids[0]].bg), header('山海闯关 · ' + R.name, null, null), tabs,
    h('div.adv-map', {}, svg, ...nodes, h('div.adv-lore', {}, h('b', {}, R.name), h('p', {}, R.desc || ''))));
}
function foeChips(stage){ const seen = new Set(); for (const a of stage.arenas) for (const w of a.waves || []) for (const f of w) seen.add(f); return [...seen].slice(0, 9).map(f => AFOES[f]).filter(Boolean); }
export function stageCard(stage){ const k = stage.kind === 'tower' ? 'tower' : stage.kind === 'rush' ? 'rush' : stage.kind === 'daily' ? stage.id : stage.id; return asset('stagecard/' + k); }
export function stageDetail(stage, opts = {}){
  AP.ensureAct(); const p = panel(stage.name, { cls: 'sdetail' }); let hard = false; let team = S.act.team.filter(id => S.party[id]).slice(0, 3); if (!team.length) team = ['yangui'];
  const boss = stage.boss ? ABOSSES[stage.boss] : null; const best = S.act.best[stage.id];
  const render = () => { p.body.replaceChildren(
    h('div.sd-wrap', {},
      h('div.sd-l', {},
        h('div.sd-card', { style: { backgroundImage: `url(${stageCard(stage)})` } }, h('b', {}, stage.name), stage.desc ? h('small', {}, stage.desc) : null),
        h('div.sd-meta', {}, chip('推荐等级 ' + (stage.lv + (hard ? 8 : 0))), chip(OBJ_NAME[stage.obj] + (stage.time ? ` · ${stage.time}秒` : ''), 'obj'), best ? chip('最佳 ' + best, 'best') : chip('首通奖励 ✦' + (80 + stage.lv * 25), 'first'), chip('约 2–4 分钟', 'time'), chip('评价：速通·少伤；巧战额外加分', 's')),
        boss ? h('div.sd-boss', {}, h('img', { src: asset(boss.img) }), h('div', {}, h('b', {}, '首领 · ' + boss.name), h('small', {}, `${elChip(boss.el)?.textContent || ''}属性 · ${boss.pat.length} 阶段`), h('p', {}, '留意地面的红色预警，在它出招之前闪开。冲刺时短暂无敌。'))) : null,
        h('div.sd-foes', {}, h('div.sd-h', {}, '出没异兽'), h('div.sd-fl', {}, ...foeChips(stage).map(f => h('div.sd-f', { title: f.desc || '' }, h('img', { src: asset(f.img), style: f.tint ? { filter: 'drop-shadow(0 0 3px ' + f.tint + ')' } : null }), h('span', {}, f.name), h('small', {}, AI_NAME[f.ai] + (f.tier === 1 ? '·精英' : ''))))))
      ),
      h('div.sd-r', {},
        h('div.sd-h', {}, `出战队伍（最多 3 人，战斗中可换人） · 战力 ${teamPower(team)} / 推荐 ${rec(stage) * team.length}`),
        h('div.sd-team', {}, ...AP.actRoster().map(id => { const i = team.indexOf(id);
          return h('div.sd-c' + (i >= 0 ? '.on' : ''), { onclick: () => { sfx('click'); if (i >= 0) { if (team.length > 1) team.splice(i, 1); } else if (team.length < 3) team.push(id); else { team[2] = id; } render(); } },
            h('img', { src: portrait(id) }), h('b', {}, CHARS[id].name), h('small', {}, 'Lv ' + S.party[id].lv), i >= 0 ? h('i', {}, i + 1) : null); })),
        h('div.sd-btns', {},
          S.act.cleared[stage.id] && stage.kind !== 'daily' && stage.kind !== 'tower' ? h('label.sd-hard' + (hard ? '.on' : ''), { onclick: () => { hard = !hard; render(); } }, hard ? '◆ 困难（敌人 +8 级，奖励 ×2）' : '◇ 困难模式') : null,
          btn('出 战', () => { S.act.team = team.slice(); p.close(); launch(stage, { team, hard, ...opts }); }, 'gold big')))));
  }; render();
}
export async function launch(stage, opts = {}){
  AP.ensureAct(); if (!S.act.tut.controls) { await controlsGuide(true); S.act.tut.controls = true; if(stage.id==='jincheng_1') S.act.tut.lamp=true; }
  await signatureTutorials(stage);
  const prev = S.mode; S.mode = 'action'; const res = await runStage(stage, opts); if(res.abandoned) return; S.mode = 'hub';
  if (res.quit) { opts.back ? opts.back() : show(adventureScreen(stage.region)); return; }
  if (res.retry) return launch(stage, opts);
  if (opts.hard && res.win) { res.gold *= 2; res.exp *= 2; }
  if (res.win && opts.onWin) opts.onWin();
  const out = AP.applyResult(stage, res); saveNow(); resultScreen(stage, res, out, opts);
}

/** 前三十分钟招牌教学：灯芯 / 烛瞳 / 闭目，各只弹一次 */
async function signatureTutorials(stage){
  const T = S.act.tut; const id = stage.id || '';
  const tip = async (key, title, rows) => {
    if (T[key]) return;
    await new Promise(res => {
      const p = panel(title, { modal: true, cls: 'guide sig-tut', onclose: () => { T[key] = true; res(); } });
      p.body.append(
        h('div.gd', {}, ...rows.map(([g, tt, d]) => h('div.gd-r', {}, h('span.gd-g', {}, g), h('div', {}, h('b', {}, tt), h('p', {}, d))))),
        h('p.gd-tip', {}, '战斗中也可随时暂停查看操作说明。'),
        h('div.row.center', {}, btn('明白了，出战', () => p.close(), 'gold'))
      );
    });
  };
  if ((id === 'jincheng_1' || (stage.region === 'jincheng' && stage.idx === 0)) && !T.lamp) {
    await tip('lamp', '招牌 · 灯芯', [
      ['◎', '脚下的光', '你永远带着一圈灯芯光域。夜鬼走进光里会虚弱、变慢，甚至被灼烧。'],
      ['⚔', '用光作战', '别无脑追砍——把敌人逼进光域，再连击。护灯关里灯本身也要守住。'],
    ]);
  }
  if ((id === 'jincheng_2' || id === 'jincheng_3') && !T.eye) {
    await tip('eye', '招牌 · 烛瞳', [
      ['瞳', '看见弱点', '点右下「瞳」（键 E）开启烛瞳：敌人浮出红点弱点，下一击必暴并破甲。'],
      ['金线', '看见隐藏', '烛瞳可看见秘匣、秘径的金线，并强化首领预警轮廓。耗蓝，可随时关掉。'],
    ]);
  }
  if ((id === 'jincheng_3' || id === 'jincheng_5') && !T.dream) {
    await tip('dream', '招牌 · 闭目 / 睁眼', [
      ['梦', '切换叠层', '点「梦」（键 R）在睁眼层与闭目层之间切换。闭目掉梦屑与异兽灵魄，部分平台会换。'],
      ['S', '双层清波', '在两层实际交战并清波，可获得额外评价。普通通关无需强制切层。'],
    ]);
  }
  if ((id === 'jincheng_6' || stage.boss) && !T.reso && (S.act.team || []).length >= 1) {
    await tip('reso', '招牌 · 灯火共鸣', [
      ['灯', '同伴合击', '看破弱点、精准闪避与终结后换人可积攒共鸣；槽满点「灯」（键 T）发动伙伴合击。'],
      ['心', '好感加成', '剧情里对同伴好感越高，共鸣字幕与伤害越华丽。'],
    ]);
  }
}

export function controlsGuide(quick=false){ return new Promise(res => { const p = panel(quick?'先守住这盏灯':'操作指南', { modal: true, cls: 'guide', onclose: res });
  const row = (g, t, d) => h('div.gd-r', {}, h('span.gd-g', {}, g), h('div', {}, h('b', {}, t), h('p', {}, d)));
  if(quick) {
    p.body.append(h('p',{},'城外的灯熄了，夜鬼正向烬城靠近。晏归，提灯走一趟。'),h('div.gd',{},
      row('◎','移动与跳跃','左摇杆移动，上推或点跳跃。键盘使用方向键、K。'),
      row('⚔','挥刀与闪避','按住攻击出连击，点冲刺躲避。键盘使用 J、L。'),
      row('灯','把敌人引入光里','脚下灯域会削弱夜鬼，靠近后再挥刀。')),
      h('p.gd-tip',{},'这次先学会守灯，其余能力会在后续关卡逐步介绍。'),h('div.row.center',{},btn('提灯出发',()=>p.close(),'gold')));
    return;
  }
  p.body.append(h('div.gd', {},
    row('◎', '左摇杆', '左右移动；向上推跳跃，向下推可从平台落下。'), row('⚔', '攻击', '连按打出四段连击；空中攻击可让敌人浮空。按住持续攻击。'),
    row('⤒', '跳跃', '可二段跳。部分角色的被动可三段跳。'), row('➤', '冲刺', '短距离冲刺，冲刺过程无敌——闪避首领红色预警的关键。'),
    row('技', '自选技能', '消耗法力，冷却后可再次使用。在「伙伴 · 技能」里升级并更换技能。'), row('龍', '变身', `连击与受击积攒怒气，满后变身：大幅强化并获得专属攻击（${ULT_LV} 级解锁）。`),
    row('⇄', '换人 / 灵药', '随时切换出战伙伴；灵药回复气血与法力，每关数量有限。'),
    row('瞳 E', '烛瞳', '耗蓝开启视野：弱点浮出、秘匣/秘径金线显形，首领预警提前显现。'),
    row('梦 R', '闭目·睁眼', '切换梦境叠层：闭目掉梦屑与异兽之卵，两层的平台和敌人组合不同，清场后可闭目进入梦门挑战。'),
    row('灯 T', '灯火共鸣', '共鸣槽满后触发同伴合击；好感越高威力与字幕越华丽。'),
    h('p.gd-tip', {}, '评价按用时、受击和连击计算；双层清波、精准闪避和看破弱点额外加分：S 评价额外技能点与丰厚赏赐。')), h('div.row.center', {}, btn('明白了', () => p.close(), 'gold')));
}); }
function resultScreen(stage, res, out, opts){
  const win = res.win; const lvl = Object.entries(out.ups);
  sfx(win ? 'win' : 'lose'); playBgm(win ? 'warm' : 'sad'); haptic(win ? 'success' : 'warn');
  const items = out.items.map(it => it.soul ? h('div.rs-it.soul', {}, h('img', { src: asset(AFOES[it.soul]?.img || 'enemy/a0') }), h('span', {}, (AFOES[it.soul]?.name || '') + '灵魄 ×' + it.n))
    : h('div.rs-it', { style: { borderColor: RCOL(rarOf(it.id)) } }, icon(ITEMS[it.id]?.icon || 'item', 'sm'), h('span', { style: { color: RCOL(rarOf(it.id)) } }, gearName(it.id) + (it.n > 1 ? ' ×' + it.n : ''))));
  const next = (() => { if (stage.kind === 'tower') return towerStage(stage.floor + 1); if (!REGION_STAGES[stage.region] || stage.kind !== 'normal' && stage.kind !== 'boss') return null; const ids = REGION_STAGES[stage.region]; const nx = ids[stage.idx + 1] || REGION_STAGES[REGION_ORDER[stage.ri + 1]]?.[0]; return nx && AP.stageUnlocked(nx) && !STAGES[nx].hidden ? STAGES[nx] : null; })();
  const back = () => opts.back ? opts.back() : show(adventureScreen(stage.region));
  const root = screen('result' + (win ? '.win' : '.lose'), 'bg/' + (stage.bg || 'jincheng'),
    h('img.rs-hero', { src: resultPose(win), alt: '' }),
    h('div.rs-box', {},
      h('div.rs-l', {}, h('div.rs-title', {}, win ? '闯 关 成 功' : res.why === '时间耗尽' ? '时 间 耗 尽' : res.why === '灯火熄灭' ? '长 明 灯 灭' : '败 退'),
        win ? h('div.rs-rank.r' + res.rating, {}, res.rating) : h('div.rs-rank.rF', {}, '败'),
        win ? h('div.rs-stars', {}, ...[0,1,2].map(i => h('i' + (i < AP.stars(res.rating) ? '.on' : ''), { style: 'animation-delay:' + (0.15 + i * 0.12) + 's' }, '★'))) : null,
        h('div.rs-name', {}, stage.name + (res.hard ? ' · 困难' : '')),
        h('div.rs-stats', {}, h('span', {}, '用时 ' + Math.floor(res.time / 60) + ':' + String(res.time % 60).padStart(2, '0')), h('span', {}, '最高连击 ' + res.combo), h('span', {}, '击败 ' + res.kills), h('span', {}, '受击 ' + res.hits)),
        win ? h('div.rs-card', { id: 'clear-card' },
          h('img.rs-card-bg', { src: asset('cg/key_clearcard'), alt: '' }),
          h('div.rs-card-t', {}, '通 关 札'),
          h('div.rs-card-rank', {}, res.rating),
          h('div.rs-card-name', {}, stage.name + (res.hard ? ' · 困难' : '')),
          h('div.rs-card-row', {}, h('em', {}, '用时'), h('b', {}, Math.floor(res.time / 60) + ':' + String(res.time % 60).padStart(2, '0'))),
          h('div.rs-card-row', {}, h('em', {}, '最高连击'), h('b', {}, String(res.combo))),
          h('div.rs-card-row', {}, h('em', {}, '梦层切换'), h('b', {}, String(res.dreamFlips || 0) + ' 次')),
          h('div.rs-card-row', {}, h('em', {}, '灯火共鸣'), h('b', {}, String(res.resoUsed || 0) + ' 次')),
          h('div.rs-card-row', {}, h('em', {}, '烛瞳破弱点'), h('b', {}, String(res.eyeMarks || 0) + ' 处')),
          h('div.rs-card-row', {}, h('em', {}, '秘匣'), h('b', {}, String(res.secrets || 0) + ' 个')),
          h('div.rs-card-row', {}, h('em', {}, '梦屑'), h('b', {}, String(res.dust || 0))),
          h('div.rs-card-row', {}, h('em', {}, '双层清波'), h('b', {}, res.layerClears?.every(n=>n>0) ? '✓' : '—')),
          h('div.rs-card-s', {}, '《烛龙纪·长夜山海》'),
          h('button.rs-share', { type: 'button', onclick: (e) => { e.stopPropagation(); shareClearCard(stage, res); } }, '✦ 收进画廊')) : null,
        !win ? h('p.rs-tip', {}, tipFor(stage, res)) : null),
      h('div.rs-r', {},
        win ? h('img.rs-reward', { src: asset('cg/key_reward_popup'), alt: '' }) : null,
        h('div.rs-gain', {}, h('b', {}, '✦ ' + out.gold), h('b', {}, '经验 +' + out.exp), (res.dust||out.dust) ? h('b.dust', {}, '梦屑 +' + (out.dust || res.dust || 0)) : null, out.sp ? h('b.sp', {}, '技能点 +1') : null, res.rating === 'S' && win ? h('em.sbonus', {}, 'S · 丰厚赏赐') : null, out.first ? h('em', {}, '首次通关') : null, out.newBest && win ? h('em', {}, '新纪录') : null),
        lvl.length ? h('div.rs-ups', {}, ...lvl.map(([id, l]) => h('div', {}, h('img', { src: portrait(id) }), `${CHARS[id].name} 升至 Lv ${l[l.length - 1]}`))) : null,
        out.unlocks.length ? h('div.rs-unl', {}, ...out.unlocks.map(u => h('div', {}, '✧ ' + u))) : null,
        (out.reactions && out.reactions.length) ? h('div.rs-react', {}, ...out.reactions.map(r => h('div.rs-rline', {}, h('b', {}, r.name + '：'), r.line))) : null,
        win ? h('div.rs-next', {}, nextUnlockTeaser(stage, out)) : null,
        h('div.rs-items', {}, ...(items.length ? items : [h('div.rs-none', {}, win ? '本关没有掉落' : '失败时不保留掉落，仅获得部分星砂与经验')])),
        h('div.rs-btns', {}, btn('返回', back, ''), btn(win ? '再战一次' : '重新挑战', () => launch(stage, opts), ''), next && win ? btn('下一关 ▶', () => stageDetail(next, opts), 'gold') : null))));
  show(root);
}


async function shareClearCard(stage, res){
  try {
    const el = document.getElementById('clear-card');
    if (!el) { toast('札未就绪'); return; }
    const w = 720, hgt = 960;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt;
    const g = cv.getContext('2d');
    const bg = new Image(); bg.crossOrigin = 'anonymous'; bg.src = asset('cg/key_clearcard');
    await new Promise(r => { bg.onload = r; bg.onerror = r; setTimeout(r, 800); });
    g.fillStyle = '#1a1208'; g.fillRect(0, 0, w, hgt);
    try { g.globalAlpha = 0.55; g.drawImage(bg, 0, 0, w, hgt); g.globalAlpha = 1; } catch(e) {}
    const grad = g.createLinearGradient(0, 0, 0, hgt);
    grad.addColorStop(0, 'rgba(40,24,8,.7)'); grad.addColorStop(1, 'rgba(8,6,4,.92)');
    g.fillStyle = grad; g.fillRect(0, 0, w, hgt);
    g.strokeStyle = 'rgba(255,200,100,.45)'; g.lineWidth = 4; g.strokeRect(18, 18, w - 36, hgt - 36);
    g.fillStyle = '#ffe08a'; g.font = 'bold 42px serif'; g.textAlign = 'center';
    g.fillText('通 关 札', w / 2, 90);
    g.fillStyle = '#ffd84a'; g.font = 'bold 160px Georgia,serif';
    g.fillText(res.rating || 'A', w / 2, 280);
    g.fillStyle = '#fff6d8'; g.font = '28px sans-serif';
    g.fillText(stage.name + (res.hard ? ' · 困难' : ''), w / 2, 340);
    const rows = [
      ['用时', Math.floor(res.time / 60) + ':' + String(res.time % 60).padStart(2, '0')],
      ['最高连击', String(res.combo)],
      ['梦层切换', (res.dreamFlips || 0) + ' 次'],
      ['灯火共鸣', (res.resoUsed || 0) + ' 次'],
      ['烛瞳破弱点', (res.eyeMarks || 0) + ' 处'],
      ['秘匣', (res.secrets || 0) + ' 个'],
      ['梦屑', String(res.dust || 0)],
      ['双层清波', res.layerClears?.every(n=>n>0) ? '✓' : '—'],
    ];
    g.font = '24px sans-serif'; g.textAlign = 'left';
    rows.forEach((r, i) => {
      const y = 400 + i * 42;
      g.fillStyle = '#cbb892'; g.fillText(r[0], 80, y);
      g.fillStyle = '#ffe7a0'; g.textAlign = 'right'; g.fillText(r[1], w - 80, y); g.textAlign = 'left';
    });
    g.fillStyle = '#8a7a55'; g.font = '18px sans-serif'; g.textAlign = 'center';
    g.fillText('《烛龙纪·长夜山海》', w / 2, hgt - 48);
    const data = cv.toDataURL('image/jpeg', 0.88);
    const id = 'clear_' + stage.id + '_' + Date.now();
    const list = (await idbGet('gallery')) || [];
    list.push({ id, title: '通关札 · ' + stage.name + ' · ' + (res.rating || ''), t: Date.now() });
    await idbSet('gallery', list);
    await idbSet('img:' + id, data);
    sfx('ach'); toast('通关札已收进画廊');
  } catch (e) { console.warn(e); toast('保存失败'); }
}

function nextUnlockTeaser(stage, out){
  const a = S.act || {};
  const cleared = Object.keys(a.cleared || {}).length;
  const teasers = [
    [3, '灯阶升级'],
    [5, '异兽孵化'],
    [10, '镇妖塔'],
    [20, '首领连战 · 十殿'],
    [30, '外观「长夜锦」'],
  ];
  for (const [n, name] of teasers) {
    if (cleared < n) {
      const left = n - cleared;
      return left === 1 ? `再通 1 关解锁「${name}」` : `再通 ${left} 关解锁「${name}」`;
    }
  }
  if (out.unlocks?.length) return '新解锁：' + out.unlocks[0];
  return '下一把，灯芯会更亮一点。';
}
function tipFor(stage, res){ const lv = Math.max(...res.team.map(id => S.party[id].lv)); if (lv < stage.lv - 2) return `队伍等级偏低（推荐 Lv ${stage.lv}）。去前面的关卡或每日「悟道秘境」历练，或在「伙伴」中升级技能、更换装备。`;
  if (res.why === '灯火熄灭') return '护灯关卡：优先击倒靠近长明灯的敌人，远程敌人会直接攻击灯。';
  if (res.why === '时间耗尽') return '限时关卡：清掉挡路的敌人即可，不必全歼，多用冲刺赶路。';
  return '首领出招前地面会出现红色预警，看到后立刻冲刺穿过去（冲刺无敌）。怒气满了记得变身。'; }

// —— 伙伴：属性 / 技能 / 装备 ——
const STATN = { hp:'气血', mp:'法力', atk:'攻击', mag:'法术', def:'防御', spd:'身法' };
export function heroesScreen(sel, tab = 'skill'){
  AP.ensureAct(); const roster = AP.actRoster(); sel = sel && S.party[sel] ? sel : roster[0];
  const list = h('div.hr-list', {}, ...ACTION_ROSTER.map(id => { const own = !!S.party[id]; const b = own && AP.spFree(id) > 0 && ACHARS[id].skills.some(k => { const l = AP.skillLv(id, k); return l && l < SKILL_MAX; });
    return h('div.hr-it' + (id === sel ? '.on' : '') + (own ? '' : '.lock'), { onclick: () => { if (!own) { toast(AP.heroUnlockHint(id)); return; } sfx('page'); show(heroesScreen(id, tab)); } },
      h('img', { src: portrait(id) }), h('div', {}, h('b', {}, CHARS[id].name), h('small', {}, own ? `Lv ${S.party[id].lv} · ${ACHARS[id].role}` : '未加入')), dot(b)); }));
  const c = CHARS[sel], A = ACHARS[sel], p = S.party[sel];
  const tabs = h('div.hr-tabs', {}, ...[['skill', '技能'], ['lamp','灯道'], ['stat', '属性'], ['gear', '装备'], ['skin', '外观']].map(([k, n]) => h('div.tab' + (k === tab ? '.on' : ''), { onclick: () => show(heroesScreen(sel, k)) }, n)));
  const body = h('div.hr-body'); if (tab === 'skill') skillTab(body, sel); else if (tab==='lamp') lampPathTab(body,sel); else if (tab === 'stat') statTab(body, sel); else if (tab === 'skin') skinTab(body, sel); else gearTab(body, sel);
  const inTeam = S.act.team.includes(sel);
  return screen('heroes', 'bg/dengta', header('伙伴'), h('div.hr-wrap', {}, list,
    h('div.hr-card', {}, h('img.hr-por', { src: portrait(sel, sel==='yangui' ? 'battle' : null) }), h('div.hr-name', {}, h('b', {}, c.name), h('small', {}, c.title)),
      h('div.hr-tags', {}, elChip(c.el), c.el2 ? elChip(c.el2) : null, chip(WEAPON[A.wpn].name), chip(A.role)),
      h('div.hr-lv', {}, `Lv ${p.lv}`, h('div.hr-exp', {}, h('i', { style: { width: (p.lv >= 40 ? 100 : p.exp / expNeed(p.lv) * 100) + '%' } })), h('small', {}, `战力 ${power(sel)}`)),
      btn(inTeam ? (S.act.team[0] === sel ? '队长' : '已在队伍') : '设为队长', () => { S.act.team = [sel, ...S.act.team.filter(x => x !== sel)].slice(0, 3); saveNow(); show(heroesScreen(sel, tab)); }, inTeam && S.act.team[0] === sel ? 'sm disabled' : 'sm gold')),
    h('div.hr-main', {}, tabs, body)));
}
function lampPathTab(body,id) {
  body.append(h('h3',{},'提灯之道'),h('p',{},'出战前可免费切换，作用于整支队伍。'));
  for(const [key,path] of Object.entries(AP.LAMP_PATHS)) {
    const selected=S.act.lampPath===key, unlocked=key==='keeper'||S.act.cleared.jincheng_3;
    body.append(h('div.lamp-path'+(selected?'.selected':''),{},h('h3',{},path.name),h('p',{},path.desc),
      btn(selected?'当前灯道':unlocked?'选择此道':'通关坠星坑后开放',()=>{if(AP.chooseLampPath(key)){saveNow();show(heroesScreen(id,'lamp'));}},selected||!unlocked?'sm disabled':'sm gold')));
  }
}
function skillDesc(sk, lv){ const bits = []; if (sk.pow) bits.push(`威力 ${Math.round(sk.pow * skillPow(lv) * 100)}%`); if (sk.mp) bits.push(`法力 ${sk.mp}`); if (sk.cd) bits.push(`冷却 ${(sk.cd * skillCd(lv)).toFixed(1)}秒`); if (sk.dur) bits.push(`持续 ${sk.dur}秒`); return bits.join(' · '); }
function skillTab(body, id){
  const A = ACHARS[id]; const slots = AP.slotsOf(id); let pick = null;
  const render = () => { body.replaceChildren(
    h('div.sk-top', {}, h('div.sk-slots', {}, h('span.sk-lab', {}, '技能槽'), ...[0, 1, 2, 3, 4].map(i => { const k = AP.slotsOf(id)[i]; return h('div.sk-slot' + (pick ? '.pick' : ''), { onclick: () => { if (!pick) return; AP.setSlot(id, i, pick); pick = null; saveNow(); sfx('item'); render(); } }, k ? h('img', { src: asset('icon/sk/' + k) }) : h('span', {}, '空'), h('small', {}, k ? ASKILLS[k].name : '')); })),
      h('div.sk-sp', {}, h('b', {}, AP.spFree(id)), h('small', {}, '技能点'))),
    pick ? h('div.sk-hint', {}, `点击上方技能槽装配「${ASKILLS[pick].name}」`) : null,
    h('div.sk-list', {},
      ...[A.passive, A.ult].map((k, j) => { const sk = ASKILLS[k]; const un = j === 0 || AP.ultOk(id); return h('div.sk-it.sp' + (un ? '' : '.lock'), {}, h('img', { src: asset('icon/sk/' + k) }), h('div.sk-d', {}, h('b', {}, (j ? '变身 · ' : '被动 · ') + sk.name), h('p', {}, sk.desc), !un ? h('small', {}, ULT_LV + ' 级解锁') : null)); }),
      ...A.skills.map((k, i) => { const sk = ASKILLS[k]; const lv = AP.skillLv(id, k); const un = !!lv; const inSlot = AP.slotsOf(id).includes(k); const cost = AP.skillUpCost(lv || 1);
        return h('div.sk-it' + (un ? '' : '.lock') + (inSlot ? '.eq' : '') + (pick === k ? '.pk' : ''), {},
          h('img', { src: asset('icon/sk/' + k) }),
          h('div.sk-d', {}, h('b', {}, sk.name, h('em', {}, ' ' + (TYPE_NAME[sk.type] || '') + (un ? ` · Lv ${lv}/${SKILL_MAX}` : ''))), h('p', {}, sk.desc), h('small', {}, un ? skillDesc(sk, lv) : `Lv ${UNLOCK_LV[i]} 解锁`)),
          un ? h('div.sk-b', {}, lv < SKILL_MAX ? btn(`升级 ✦${cost.gold}`, () => { const e = AP.skillUp(id, k); if (e) toast(e); else { sfx('level'); saveNow(); render(); } }, 'sm' + (AP.spFree(id) < 1 || S.gold < cost.gold ? ' dim' : '')) : chip('满级', 'best'), inSlot ? chip('已装配') : btn('装配', () => { pick = k; render(); }, 'sm')) : null); })));
  }; render();
}
function skinTab(body, id){
  const cur = S.act.skin[id] || 0; let pick = cur;
  const big = h('img.sk-big', { src: asset('spr/skin/p_' + id + '_s' + cur) }); const info = h('div.sk-info');
  const draw = () => { const k = pick, own = AP.skinOwned(id, k), s = SKINS[k]; big.src = asset('spr/skin/p_' + id + '_s' + k); info.replaceChildren(
    h('b', {}, s.n), h('p', {}, s.d), h('small', {}, own ? (k === cur ? '当前穿戴' : '已拥有') : `解锁：${AP.skinReqText(k)}${AP.skinReqOk(k) ? '（已达成）' : ''} · ${fmt(s.gold)} 金铢`),
    own ? btn(k === cur ? '穿戴中' : '穿戴', () => { S.act.skin[id] = k; saveNow(); sfx('equip'); show(heroesScreen(id, 'skin')); }, k === cur ? 'sm disabled' : 'sm gold')
        : btn('购买', () => { const e = AP.buySkin(id, k); if (e) { toast(e); return; } saveNow(); sfx('item'); toast('获得外观「' + s.n + '」'); show(heroesScreen(id, 'skin')); }, AP.skinReqOk(k) ? 'sm gold' : 'sm disabled')); };
  const grid = h('div.sk-grid', {}, ...SKINS.map((s, k) => h('div.sk-it' + (k === cur ? '.on' : '') + (AP.skinOwned(id, k) ? '' : '.lock'), { onclick: ev => { pick = k; grid.querySelectorAll('.sk-it').forEach(x => x.classList.remove('sel')); ev.currentTarget.classList.add('sel'); draw(); } },
    h('img', { src: asset('spr/skin/p_' + id + '_s' + k), loading: 'lazy' }), h('span', {}, s.n))));
  draw(); const ns = Math.max(0, (S.act.skins[id] || [0]).length - 1);
  body.append(h('div.sk-wrap', {}, h('div.sk-l', {}, big, info), h('div.sk-r', {}, grid, h('p.gr-tip', {}, `外观收藏加成：气血 / 攻击 / 法术 +${ns}%（每拥有一套非初始外观 +1%）。外观会同步到闯关中的形象与动作。`))));
}
function statTab(body, id){
  const s = AP.actStats(id); const A = ACHARS[id];
  const rows = ['hp', 'mp', 'atk', 'mag', 'def', 'spd'].map(k => h('div.st-r', {}, h('span', {}, STATN[k]), h('b', {}, s[k])));
  const ex = [['暴击率', Math.round((s.crit || 0) * 100) + '%'], ['暴击伤害', Math.round((1.6 + (s.critDmg || 0)) * 100) + '%'], ['冷却缩减', Math.round((s.cdr || 0) * 100) + '%'], ['技能增伤', Math.round((s.skillDmg || 0) * 100) + '%'], ['首领增伤', Math.round((s.bossDmg || 0) * 100) + '%'], ['吸血', Math.round((s.lifesteal || 0) * 100) + '%']].map(([n, v]) => h('div.st-r.sm', {}, h('span', {}, n), h('b', {}, v)));
  const W = WEAPON[A.wpn];
  body.append(h('div.st-wrap', {}, h('div.st-col', {}, h('div.sd-h', {}, '基础属性（闯关中气血 ×1.6）'), ...rows, ...ex),
    h('div.st-col', {}, h('div.sd-h', {}, '战斗风格'), h('p.st-p', {}, `武器：${W.name}（${W.combo.length} 段连击${W.shot ? '，远程射击' : ''}）。主属性：${A.stat === 'atk' ? '攻击' : '法术'}。冲刺：${A.dash}。`),
      h('p.st-p', {}, CHARS[id].bio || ''), S.act.pet ? h('p.st-p', {}, `助战异兽：${AP.PETS[S.act.pet]?.name}（${Object.entries(AP.petBonus(S.act.pets[S.act.pet])).map(([k, v]) => STATN[k] + ' +' + Math.round(v * 100) + '%').join('')}）`) : null)));
}
function gearTab(body, id){
  const p = S.party[id];
  const slotEl = (slot, name) => { const k = p.equip[slot]; const it = ITEMS[k];
    return h('div.gr-slot', { onclick: () => gearPick(id, slot, body) }, h('span.gr-sn', {}, name), it ? icon(it.icon, 'md') : h('span.gr-none', {}, '＋'), h('div', {}, h('b', { style: { color: it ? RCOL(rarOf(k)) : '' } }, it ? it.name : '未装备'), it ? h('small', {}, itemLine(it)) : h('small', {}, '点击选择'))); };
  body.append(h('div.gr-wrap', {}, slotEl('weapon', '兵器'), slotEl('armor', '护甲'), slotEl('charm', '饰物'),
    h('p.gr-tip', {}, '装备来自闯关掉落与铸灯铁坊。珍品以上同阶装备可凑成套装。')));
}
function itemLine(it){ const a = []; for (const k of ['atk', 'mag', 'def', 'hp', 'mp', 'spd']) if (it[k]) a.push(STATN[k] + '+' + it[k]); if (it.crit) a.push('暴击+' + Math.round(it.crit * 100) + '%'); for (const f of it.affix || []) if (!['crit', 'spd', 'goldBonus'].includes(f.k)) a.push(f.name + '·' + fxName(f.k, f.v)); return a.join('  '); }
function gearPick(id, slot, body){
  const p = S.party[id]; const cur = p.equip[slot]; const pp = panel('选择' + ({ weapon: '兵器', armor: '护甲', charm: '饰物' })[slot], { cls: 'gpick' });
  const opts = Object.keys(S.inv).filter(k => ITEMS[k]?.type === slot && S.inv[k] > 0).sort((a, b) => (ITEMS[b].tier ?? 0) - (ITEMS[a].tier ?? 0) || rarOf(b) - rarOf(a));
  const sc = k => { const it = ITEMS[k]; return (it.atk || 0) + (it.mag || 0) + (it.def || 0) * 1.5 + (it.hp || 0) * 0.2 + (it.mp || 0) * 0.5; };
  pp.body.append(h('div.gp-list', {}, cur ? h('div.gp-it', { onclick: () => { addItem(cur, 1); p.equip[slot] = null; saveNow(); pp.close(); body.replaceChildren(); gearTab(body, id); } }, h('span.gr-none', {}, '✕'), h('b', {}, '卸下 ' + ITEMS[cur].name)) : null,
    ...(opts.length ? opts.map(k => { const it = ITEMS[k]; const d = cur ? Math.round(sc(k) - sc(cur)) : Math.round(sc(k));
      return h('div.gp-it', { onclick: () => { sfx('item'); if (cur) addItem(cur, 1); addItem(k, -1); p.equip[slot] = k; saveNow(); pp.close(); body.replaceChildren(); gearTab(body, id); } },
        icon(it.icon, 'md'), h('div', {}, h('b', { style: { color: RCOL(rarOf(k)) } }, it.name + (S.inv[k] > 1 ? ' ×' + S.inv[k] : '')), h('small', {}, itemLine(it))), h('em.' + (d >= 0 ? 'up' : 'dn'), {}, (d >= 0 ? '▲' : '▼') + Math.abs(d))); }) : [h('p.gr-tip', {}, '背包里没有可用的装备。去闯关或铸灯铁坊获取。')])));
}

// —— 山海异兽 ——
export function petScreen(sel){
  AP.ensureAct(); const all = Object.values(AP.PETS); sel = sel || S.act.pet || all.find(p => (S.act.souls[p.id] || 0) > 0)?.id || all[0].id;
  const grid = h('div.pt-grid', {}, ...all.map(P => { const own = S.act.pets[P.id]; const n = S.act.souls[P.id] || 0; const seen = own || n > 0 || S.kills[P.id];
    return h('div.pt-c' + (P.id === sel ? '.on' : '') + (own ? '.own' : '') + (seen ? '' : '.unk'), { onclick: () => { sfx('click'); show(petScreen(P.id)); } },
      h('img', { src: asset(P.img) }), h('small', {}, seen ? P.name : '？？'), own ? h('i', {}, 'Lv' + own.lv) : n ? h('em', {}, n + '/' + AP.SOUL_NEED) : null,
      S.act.pet === P.id ? h('b.pt-on', {}, '助战') : null, !own && n >= AP.SOUL_NEED ? h('i.rdot') : null); }));
  const P = AP.PETS[sel]; const pd = S.act.pets[sel]; const n = S.act.souls[sel] || 0; const d = AFOES[sel];
  const feedEff = 1 + ((S.city.beast || 1) - 1) * 0.2;
  const detail = h('div.pt-d', {}, h('div.pt-img' + (pd ? '' : '.egg'), {}, h('img', { src: asset(P.img) }), pd ? null : h('img.pt-egg', { src: asset('icon/ex/egg_' + ({ fire: 'bird', water: 'dragon', wood: 'fox', metal: 'beast', earth: 'beast', dark: 'spirit', light: 'spirit' }[P.el] || 'beast')) })), h('div.pt-n', {}, h('b', {}, P.name), elChip(P.el), chip(AI_NAME[P.ai])),
    h('p.pt-desc', {}, P.desc || ''),
    h('p.pt-trait', {}, AP.petTrait(sel)),
    pd ? h('div.pt-st', {}, h('div', {}, `等级 ${pd.lv}/50`, h('div.hr-exp', {}, h('i', { style: { width: (pd.exp / AP.petExpNeed(pd.lv) * 100) + '%' } }))), h('div', {}, '星级 ' + '★'.repeat(pd.star || 0) + '☆'.repeat(5 - (pd.star || 0))),
      h('div', {}, `助战威力 ${AP.petPower(pd)}`), h('div', {}, '队伍加成 ' + Object.entries(AP.petBonus(pd)).map(([k, v]) => STATN[k] + ' +' + (v * 100).toFixed(1) + '%').join(''))) : h('div.pt-st', {}, `灵魄 ${n}/${AP.SOUL_NEED}：击败该异兽（精英、异种更容易）有几率掉落灵魄。每日「异兽秘境」掉率×4。`),
    h('div.pt-btns', {}, pd ? [
      btn(S.act.pet === sel ? '助战中' : '设为助战', () => { S.act.pet = sel; saveNow(); show(petScreen(sel)); }, S.act.pet === sel ? 'sm disabled' : 'sm gold'),
      btn('喂养 ✦200', () => { if (!AP.petFeed(sel, 200)) return toast(pd.lv >= 50 ? '已满级' : '星砂不足'); if (feedEff > 1) pd.exp += Math.round(40 * (feedEff - 1)); sfx('heal'); saveNow(); show(petScreen(sel)); }, 'sm'),
      btn('喂养 ✦1000', () => { if (!AP.petFeed(sel, 1000)) return toast(pd.lv >= 50 ? '已满级' : '星砂不足'); if (feedEff > 1) pd.exp += Math.round(200 * (feedEff - 1)); sfx('heal'); saveNow(); show(petScreen(sel)); }, 'sm'),
      btn(`升星（灵魄 ${n}/${AP.SOUL_NEED * ((pd.star || 0) + 1)}）`, () => { if (!AP.petStar(sel)) return toast('灵魄不足或已满星'); sfx('level'); saveNow(); show(petScreen(sel)); }, 'sm')]
      : btn('孵 化', () => { if (!AP.hatch(sel)) return toast('灵魄不足'); sfx('pet'); toast(P.name + ' 破卵而出！'); saveNow(); show(petScreen(sel)); }, n >= AP.SOUL_NEED ? 'gold' : 'disabled')));
  return screen('pets', 'bg/qingqiu_forest', header('山海异兽', null, h('span.hb-n', {}, `已拥有 ${Object.keys(S.act.pets).length}/${all.length}`)), h('div.pt-wrap', {}, grid, detail));
}
// —— 铸灯铁坊 ——
const SLOTN = { weapon:'兵器', armor:'护甲', charm:'饰物' };
export function forgeScreen(tab = 'forge', t0){
  AP.ensureAct(); const max = AP.forgeMaxTier(); let t = Math.min(max, t0 ?? max);
  const tabs = h('div.hr-tabs', {}, ...[['forge', '锻造'], ['salv', '分解']].map(([k, n]) => h('div.tab' + (k === tab ? '.on' : ''), { onclick: () => show(forgeScreen(k, t)) }, n)));
  const body = h('div.fg-body');
  if (tab === 'forge') {
    const c = AP.forgeCost(t); const m = AP.TIER_MAT[t];
    body.append(h('div.fg-tiers', {}, ...AP.TIER_NAME.map((n, i) => h('div.fg-t' + (i === t ? '.on' : '') + (i > max ? '.lock' : ''), { onclick: () => { if (i > max) return toast((S.city.forge || 1) * 2 - 1 < i ? '升级「铸灯铁坊」解锁' : '推进闯关区域解锁'); show(forgeScreen(tab, i)); } }, n + '阶'))),
      h('div.fg-cost', {}, h('img.fg-ham', { src: asset('icon/ex/hammer') }), `每次锻造：✦${c.gold} · ${ITEMS[m].name} ×${c.mat}（持有 ${S.inv[m] || 0}）` + (t >= 4 ? ` · 星髓晶 ×${c.mat2}（持有 ${S.inv.m_starmarrow || 0}）` : ''), h('small', {}, '品质随机：良品 50% · 精品 30% · 珍品 15% · 神品 5%。分解低品装备可回材料；烬城建设「铸灯铁坊」升级可开更高阶。')),
      h('div.fg-grid', {}, ...['weapon', 'armor', 'charm'].flatMap(slot => [0, 1, 2].map(k => { const id = `g_${slot[0]}${t}${k}2`; const it = ITEMS[id];
        return h('div.fg-it', {}, icon(it.icon, 'md'), h('b', {}, it.name.replace(/·.$/, '')), h('small', {}, SLOTN[slot] + ' · ' + itemLine({ ...it, affix: [] })), btn('锻造', () => { sfx('forge'); const r = AP.forge(t, slot, k); if (r.err) return toast(r.err); sfx('fire'); saveNow(); forgeReveal(r.id, () => show(forgeScreen(tab, t))); }, 'sm')); }))));
  } else {
    const gear = Object.keys(S.inv).filter(k => ITEMS[k]?.gen && S.inv[k] > 0).sort((a, b) => rarOf(a) - rarOf(b) || ITEMS[a].tier - ITEMS[b].tier);
    body.append(h('div.fg-cost', {}, '分解闯关装备，获得星砂与对应阶的锻造材料。', gear.length ? btn('一键分解凡品与良品', async () => { const low = gear.filter(k => rarOf(k) <= 1); if (!low.length) return toast('没有可分解的凡品/良品'); if (!(await confirmBox(`分解 ${low.reduce((a, k) => a + S.inv[k], 0)} 件凡品/良品装备？`))) return; let g = 0; for (const k of low) while (S.inv[k] > 0) g += AP.salvage(k).gold; toast('获得 ✦' + g); saveNow(); show(forgeScreen('salv')); }, 'sm') : null),
      h('div.gp-list', {}, ...(gear.length ? gear.map(k => { const it = ITEMS[k]; return h('div.gp-it', {}, icon(it.icon, 'md'), h('div', {}, h('b', { style: { color: RCOL(rarOf(k)) } }, it.name + (S.inv[k] > 1 ? ' ×' + S.inv[k] : '')), h('small', {}, itemLine(it))), btn('分解', () => { const r = AP.salvage(k); if (r) toast(`✦${r.gold} · ${ITEMS[r.mat].name}×${r.n}`); sfx('break'); saveNow(); show(forgeScreen('salv')); }, 'sm')); }) : [h('p.gr-tip', {}, '没有可分解的装备。')])));
  }
  return screen('forge', 'bg/yugu', header('铸灯铁坊 · Lv ' + (S.city.forge || 1)), h('div.fg-wrap', {}, tabs, body));
}
function forgeReveal(id, done){ const it = ITEMS[id]; const r = rarOf(id); const p = panel('锻造完成', { modal: true, cls: 'small reveal', onclose: done });
  p.body.append(h('div.fr', { style: '--rc:' + RCOL(r) }, h('div.fr-glow'), icon(it.icon, 'lg'), h('b', { style: { color: RCOL(r) } }, it.name), h('small', {}, RARITY[r].name), h('p', {}, itemLine(it))), h('div.row.center', {}, btn('收下', () => p.close(), 'gold'))); if (r >= 3) sfx('ach'); }

// —— 信物秘境：关键道具开启的隐藏战场 ——
export function secretStagesScreen(){
  AP.ensureAct(); try { playBgm('dream'); } catch(e) {}
  const cards = KEY_SECRET_IDS.map(id => {
    const st = STAGES[id]; const un = AP.stageUnlocked(id); const best = S.act.best[id];
    const need = ITEMS[st.needItem]; const have = (S.inv[st.needItem] || 0) > 0;
    const flagOk = !st.needFlag || !!S.flags[st.needFlag];
    return h('div.sec-c' + (un ? '' : '.lock') + (S.act.cleared[id] ? '.done' : ''), {
      onclick: () => {
        if (!un) {
          const tips = [];
          if (!have) tips.push('持有「' + (need?.name || st.needItem) + '」');
          if (!flagOk) tips.push('完成对应剧情旗帜');
          if (have && flagOk) tips.push('先通关该区第 5 关');
          toast(tips.join(' · ') || '尚未解锁'); return;
        }
        sfx('secret'); stageDetail(st, { back: () => show(secretStagesScreen()) });
      }
    },
      h('div.sec-bg', { style: { backgroundImage: `url(${asset('bg/' + st.bg)})` } }),
      h('b', {}, st.name),
      h('small', {}, un ? (`Lv ${st.lv}` + (best ? ' · ' + '★'.repeat(AP.stars(best)) : ' · 可挑战')) : ('🔒 ' + (need?.name || '关键道具'))),
      h('p', {}, st.desc || ''),
      S.act.cleared[id] ? chip('已踏破') : (un ? chip('信物共鸣') : null));
  });
  try { playBgm('dream'); sfx('ui_open'); } catch(e) {}
  return screen('secrets', 'cg/key_secret_realm', header('信物秘境', null, h('span.hb-n', {}, '关键道具开启的隐藏战场')),
    h('div.sec-intro', {}, h('p', {}, '主线与关卡选择会掉落信物。持有对应信物并满足旗帜后，此处会出现不写在地图上的战场——通关可获梦屑、稀有材料与隐藏剧情线索。')),
    h('div.sec-grid', {}, ...cards));
}
// —— 烬城建设 ——
export function cityScreen(){
  AP.ensureAct();
  const cards = AP.CITY.map(b => { const lv = S.city[b.id] || 1; const max = lv >= b.max; const c = AP.cityCost(lv);
    return h('div.ct-c' + (max ? '.max' : ''), {}, h('div.ct-h', {}, h('b', {}, b.name), h('span', {}, 'Lv ' + lv + '/' + b.max)), h('p', {}, '当前：' + b.desc(lv)), !max ? h('p.nx', {}, '升级后：' + b.desc(lv + 1)) : h('p.nx', {}, '已满级'),
      !max ? h('div.ct-cost', {}, `✦${c.gold}`, h('span', {}, `${ITEMS[b.mats[0]].name} ${S.inv[b.mats[0]] || 0}/${c.mat}`), h('span', {}, `${ITEMS[b.mats[1]].name} ${S.inv[b.mats[1]] || 0}/${Math.ceil(c.mat * 0.6)}`)) : null,
      !max ? btn('升 级', () => { const e = AP.cityUp(b.id); if (e) return toast(e); sfx('lamp'); toast(b.name + ' 升至 Lv ' + (lv + 1)); saveNow(); show(cityScreen()); }, 'gold sm') : null); });
  const lit = AP.CITY.reduce((a, b) => a + (S.city[b.id] || 1), 0);
  return screen('city', 'bg/jincheng', header('烬城建设'), h('div.ct-wrap', {}, h('div.ct-intro', {}, h('b', {}, `城中灯火 ${lit}/${AP.CITY.reduce((a, b) => a + b.max, 0)}`), h('p', {}, '长夜之下，烬城是最后一座有灯的城。把闯关带回的材料交给城里的匠人，一点点把它重新点亮。')), h('div.ct-grid', {}, ...cards)));
}
// —— 试炼：镇妖塔 / 首领连战 / 每日秘境 / 每日委托 ——
export function trialScreen(tab = 'tower'){
  AP.ensureAct(); AP.rollDaily();
  const tabs = h('div.hr-tabs', {}, ...[['tower', '镇妖塔'], ['daily', '每日秘境'], ['rush', '首领连战'], ['mission', '每日委托']].map(([k, n]) => h('div.tab' + (k === tab ? '.on' : ''), { onclick: () => show(trialScreen(k)) }, n, k === 'mission' && hubBadges().m ? h('i.rdot') : null)));
  const body = h('div.tr-body'); const back = () => show(trialScreen(tab)); const lv = Math.max(...AP.actRoster().map(id => S.party[id].lv));
  if (tab === 'tower') { const f = S.act.tower + 1; const floors = [];
    const TW_BG = ['bg/dengta','bg/youdu','bg/hundun','bg/guixu','bg/zhulong_eye'];
    for (let i = Math.min(100, f + 3); i >= Math.max(1, f - 2); i--) { const s = towerStage(i); const bg = TW_BG[i % TW_BG.length]; floors.push(h('div.tw-f' + (i < f ? '.done' : i === f ? '.cur' : '.lock') + (s.boss ? '.boss' : ''), { style: { backgroundImage: `linear-gradient(90deg,rgba(5,6,14,.82),rgba(5,6,14,.45)),url(${asset(bg)})` } }, h('b', {}, s.name), h('small', {}, `Lv ${s.lv}` + (s.boss ? ' · 首领 ' + ABOSSES[s.boss].name : '') + (s.obj === 'timed' ? ' · 限时' : '')), i === f ? btn('挑战', () => { sfx('tower'); stageDetail(s, { back }); }, 'gold sm') : i < f ? chip('已通过') : null)); }
    if (!S.act.tut.tower) { S.act.tut.tower = true; toast('镇妖塔：失败可无限重试，适合练招牌与刷材料'); }
    body.append(h('div.tw-wrap', {}, h('div.tw-l', {}, h('b', {}, `最高 第 ${S.act.tower} 层`), h('p', {}, '镇妖塔共一百层，层层递进。每十层镇守一名首领。每层只能向上，失败可无限重试。前五层偏教学难度。'), h('p', {}, '奖励：首次登顶每层获得星砂与经验，首领层必掉装备。通关外观「塔影袍」需爬到指定层。')), h('div.tw-list', {}, ...floors))); }
  if (tab === 'daily') { body.append(h('div.dl-grid', {}, ...DAILY.map(d => { const used = S.daily.done[d.id] || 0; const left = AP.DAILY_TRIES - used; const s = dailyStage(d, lv);
    return h('div.dl-c' + (left <= 0 ? '.used' : ''), { style: { backgroundImage: `linear-gradient(180deg,rgba(10,10,18,.2),rgba(10,10,18,.92)),url(${asset('stagecard/' + d.id)})` } }, h('b', {}, d.name), h('p', {}, d.desc), h('small', {}, `Lv ${s.lv} · 今日剩余 ${left}/${AP.DAILY_TRIES}`),
      btn(left > 0 ? '进入' : '明日再来', () => { if (left <= 0) return; stageDetail(s, { back, onWin: () => { S.daily.done[d.id] = used + 1; } }); }, left > 0 ? 'gold sm' : 'sm disabled')); }))); }
  if (tab === 'rush') { const ok = !!S.act.cleared.kunlun_10; const s = rushStage(); s.lv = Math.max(10, lv);
    body.append(h('div.rush', {}, h('b', {}, '首领连战 · 十殿'), h('p', {}, '连续挑战十名首领，中途不能补给灵药之外的东西。气血在首领之间不会恢复。'), h('div.rush-l', {}, ...s.rush.map(b => h('div', {}, h('img', { src: asset(ABOSSES[b].img) }), h('small', {}, ABOSSES[b].name)))),
      h('p', {}, `已完成 ${S.act.rush || 0} 次 · 推荐 Lv ${s.lv}`), ok ? btn('开 战', () => stageDetail(s, { back }), 'gold') : h('p.lock', {}, '通关「帝之下都」（昆仑第 10 关）后开放'))); }
  if (tab === 'mission') { body.append(h('div.ms-list', {}, ...AP.MISSIONS.map(m => { const pr = Math.min(m.need, S.daily.prog[m.id] || 0); const done = pr >= m.need; const cl = S.daily.claimed[m.id];
    return h('div.ms-it' + (cl ? '.cl' : done ? '.ok' : ''), {}, h('b', {}, m.name), h('div.hr-exp', {}, h('i', { style: { width: pr / m.need * 100 + '%' } })), h('small', {}, `${pr}/${m.need} · ✦${m.gold}`), cl ? chip('已领取') : btn('领取', () => { if (!AP.claimMission(m.id)) return toast('尚未完成'); sfx('coin'); saveNow(); show(trialScreen('mission')); }, done ? 'gold sm' : 'sm disabled')); }), h('p.gr-tip', {}, '每日 0 点刷新。'))); }
  return screen('trial', 'bg/dengta', header('试炼'), h('div.fg-wrap', {}, tabs, body));
}
