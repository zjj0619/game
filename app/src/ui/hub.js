// v2.0 烬城枢纽：闯关地图、关卡详情与出战、结算、伙伴、异兽、铁坊、烬城建设、试炼、每日
import { S, save, AUTO, stats, addItem, addGold, expNeed, ach, has } from '../engine/state.js';
import { CHARS, EL_COLOR } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { REGIONS, REGION_ORDER } from '../data/regions.js';
import { h, btn, asset, icon, toast, panel, confirmBox } from '../engine/ui.js';
import { playBgm, sfx } from '../engine/audio.js';
import { setAmbient } from '../engine/fx.js';
import { ACHARS, ASKILLS, WEAPON, ACTION_ROSTER, UNLOCK_LV, ULT_LV, SKILL_MAX, TYPE_NAME, skillPow, skillCd } from '../action/data.js';
import { AFOES, ABOSSES, AI_NAME, foeStats } from '../action/foes.js';
import { STAGES, REGION_STAGES, towerStage, rushStage, DAILY, dailyStage } from '../action/stages.js';
import { GEAR, RARITY, GAFF, fxName, rarOf } from '../action/gear.js';
import { runStage } from '../action/engine.js';
import * as AP from '../action/progress.js';
import { game, show } from '../main.js';
import { openMenu } from './menu.js';

const EL_NAME = { fire:'火', water:'水', wood:'木', metal:'金', earth:'土', light:'光', dark:'暗', none:'无' };
const OBJ_NAME = { clear:'歼灭全部敌人', timed:'限时内抵达终点', guard:'护住长明灯不灭' };
const RCOL = r => RARITY[r]?.col || '#ccc';
const portrait = id => asset('por/' + id);
const gearName = id => ITEMS[id]?.name || id;
const fmt = n => n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n);
function power(id){ const s = AP.actStats(id); return Math.round(s.hp * 0.25 + (s.atk + s.mag) * 2.2 + s.def * 2 + (s.crit || 0) * 300); }
const teamPower = team => team.reduce((a, id) => a + power(id), 0);
function rec(stage){ return Math.round((stage.lv || 1) * 40 + 120); }
function bar(){ return h('div.hb-top', {},
  h('span.hb-gold', {}, '✦ ' + fmt(S.gold)), h('span.hb-star', {}, '★ ' + AP.totalStars()), h('span.hb-tw', {}, '塔 ' + S.act.tower)); }
function header(title, back, extra){ return h('div.hub-head', {}, btn('‹ 返回', back || (() => game.hub()), 'sm hb-back'), h('div.hub-title', {}, title), h('div.hub-hr', {}, extra || null, bar())); }
function screen(cls, bg, ...kids){ return h('div.screen.hubs.' + cls, {}, h('div.hub-bg', { style:{ backgroundImage:`url(${asset(bg)})` } }), h('div.hub-shade'), ...kids); }
function chip(text, cls = ''){ return h('span.chip' + (cls ? '.' + cls : ''), {}, text); }
function elChip(el){ return el ? h('span.elc', { style:{ background: EL_COLOR?.[el] || '#888' } }, EL_NAME[el] || el) : null; }
function saveNow(){ try { save(AUTO); } catch (e) {} }
function dot(on){ return on ? h('i.rdot') : null; }
export function hubBadges(){ const m = AP.MISSIONS.filter(x => !S.daily.claimed[x.id] && (S.daily.prog[x.id] || 0) >= x.need).length; const pets = Object.keys(AP.PETS).filter(b => !S.act.pets[b] && (S.act.souls[b] || 0) >= AP.SOUL_NEED).length;
  const sp = AP.actRoster().some(id => AP.spFree(id) > 0 && ACHARS[id].skills.some(k => { const l = AP.skillLv(id, k); return l && l < SKILL_MAX; })); return { m, pets, sp }; }

// —— 枢纽 ——
export function hubScreen(){
  AP.ensureAct(); const lead = S.act.team[0] || 'yangui'; const b = hubBadges();
  const nextStage = (() => { for (const rid of REGION_ORDER) for (const id of REGION_STAGES[rid].slice(0, 10)) if (!S.act.cleared[id]) return AP.stageUnlocked(id) ? STAGES[id] : null; return null; })();
  const tile = (cls, name, sub, on, badge) => h('div.htile.' + cls, { onclick: () => { sfx('click'); on(); } }, h('b', {}, name), h('small', {}, sub), dot(badge));
  const root = screen('hub', 'bg/jincheng',
    h('div.hub-head', {}, h('div.hub-logo', {}, '烬 城'), h('div.hub-hr', {}, btn('菜单', () => openMenu(), 'sm'), bar())),
    h('div.hub-main', {},
      h('div.hub-hero', { onclick: () => show(heroesScreen(lead)) },
        h('img.hh-por', { src: portrait(lead) }),
        h('div.hh-info', {}, h('b', {}, CHARS[lead].name), h('small', {}, CHARS[lead].title), h('span', {}, `Lv ${S.party[lead].lv} · 战力 ${power(lead)}`),
          h('div.hh-team', {}, ...S.act.team.map(id => h('img', { src: portrait(id) }))))),
      h('div.hub-grid', {},
        tile('t-adv', '山海闯关', nextStage ? `下一关 · ${REGIONS[nextStage.region].name.split('·')[0]} ${nextStage.idx + 1}「${nextStage.name}」` : `九州 99 关 · ★${AP.totalStars()}`, () => show(adventureScreen(nextStage?.region))),
        tile('t-story', '主线剧情', S.chapter || '序章', () => game.story()),
        tile('t-trial', '试炼', `镇妖塔 ${S.act.tower}/100 · 每日秘境`, () => show(trialScreen()), b.m > 0),
        tile('t-hero', '伙伴', `${AP.actRoster().length}/${ACTION_ROSTER.length} 名 · 技能与装备`, () => show(heroesScreen()), b.sp),
        tile('t-pet', '山海异兽', `${Object.keys(S.act.pets).length} 只 · 灵魄孵化`, () => show(petScreen()), b.pets > 0),
        tile('t-forge', '铸灯铁坊', '锻造 · 分解', () => show(forgeScreen())),
        tile('t-city', '烬城建设', '升级建筑获得加成', () => show(cityScreen())),
        tile('t-world', '九州探索', '地图 · 支线 · 采集', () => game.world()))));
  return root;
}

// —— 山海闯关：区域 × 关卡路径 ——
const NODE_POS = [[7,58],[16,36],[25,56],[34,31],[43,52],[52,27],[61,48],[70,25],[79,44],[90,22],[90,62]];
export function adventureScreen(rid){
  AP.ensureAct(); rid = rid && AP.regionUnlocked(rid) ? rid : (REGION_ORDER.filter(r => AP.regionUnlocked(r)).pop() || 'jincheng');
  const R = REGIONS[rid]; const ids = REGION_STAGES[rid];
  const tabs = h('div.adv-tabs', {}, ...REGION_ORDER.map((r, i) => { const un = AP.regionUnlocked(r);
    return h('div.adv-tab' + (r === rid ? '.on' : '') + (un ? '' : '.lock'), { onclick: () => { if (!un) { toast(`通关「${REGIONS[REGION_ORDER[i - 1]].name.split('·')[0]}」第 10 关后开放`); return; } sfx('page'); show(adventureScreen(r)); } },
      h('b', {}, R && REGIONS[r].name.split('·')[0]), h('small', {}, un ? `★${AP.regionStars(r)}/33` : '未开放')); }));
  const path = h('svg', {}); const nodes = ids.map((id, i) => { const st = STAGES[id]; const un = AP.stageUnlocked(id); const best = S.act.best[id]; const [x, y] = NODE_POS[i];
    return h('div.snode' + (st.boss ? '.boss' : '') + (st.hidden ? '.hidden' : '') + (un ? '' : '.lock') + (S.act.cleared[id] ? '.done' : '') + (un && !S.act.cleared[id] ? '.next' : ''), { style:{ left: x + '%', top: y + '%' }, onclick: () => { if (!un) { toast(st.hidden ? '本区十关全部通关后开放' : '先通关上一关'); return; } sfx('click'); stageDetail(st); } },
      h('div.sn-c', {}, st.boss ? h('img', { src: asset(ABOSSES[st.boss]?.img || 'enemy/a0') }) : h('span', {}, st.hidden ? '秘' : i + 1)),
      h('div.sn-n', {}, st.name), h('div.sn-s', {}, best ? '★'.repeat(AP.stars(best)) + '☆'.repeat(3 - AP.stars(best)) : un ? 'Lv ' + st.lv : '🔒'), S.act.hard[id] ? h('i.sn-h', {}, '难') : null); });
  const svgNS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('adv-path');
  const pts = NODE_POS.slice(0, 10).map(([x, y]) => `${x},${y}`).join(' '); const pl = document.createElementNS(svgNS, 'polyline'); pl.setAttribute('points', pts); svg.append(pl);
  const hl = document.createElementNS(svgNS, 'polyline'); hl.setAttribute('points', `${NODE_POS[9][0]},${NODE_POS[9][1]} ${NODE_POS[10][0]},${NODE_POS[10][1]}`); hl.classList.add('dash'); svg.append(hl);
  return screen('adv', 'bg/' + (STAGES[ids[0]].bg), header('山海闯关 · ' + R.name, null, null), tabs,
    h('div.adv-map', {}, svg, ...nodes, h('div.adv-lore', {}, h('b', {}, R.name), h('p', {}, R.desc || ''))));
}
function foeChips(stage){ const seen = new Set(); for (const a of stage.arenas) for (const w of a.waves || []) for (const f of w) seen.add(f); return [...seen].slice(0, 9).map(f => AFOES[f]).filter(Boolean); }
export function stageDetail(stage, opts = {}){
  AP.ensureAct(); const p = panel(stage.name, { cls: 'sdetail' }); let hard = false; let team = S.act.team.filter(id => S.party[id]).slice(0, 3); if (!team.length) team = ['yangui'];
  const boss = stage.boss ? ABOSSES[stage.boss] : null; const best = S.act.best[stage.id];
  const render = () => { p.body.replaceChildren(
    h('div.sd-wrap', {},
      h('div.sd-l', {},
        h('div.sd-meta', {}, chip('推荐等级 ' + (stage.lv + (hard ? 8 : 0))), chip(OBJ_NAME[stage.obj] + (stage.time ? ` · ${stage.time}秒` : ''), 'obj'), best ? chip('最佳 ' + best, 'best') : chip('首通奖励 ✦' + (80 + stage.lv * 25), 'first')),
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
export async function launch(stage, opts){
  AP.ensureAct(); if (!S.act.tut.controls) { await controlsGuide(); S.act.tut.controls = true; }
  const prev = S.mode; S.mode = 'action'; const res = await runStage(stage, opts); S.mode = 'hub';
  if (res.quit) { opts.back ? opts.back() : show(adventureScreen(stage.region)); return; }
  if (res.retry) return launch(stage, opts);
  if (opts.hard && res.win) { res.gold *= 2; res.exp *= 2; }
  if (res.win && opts.onWin) opts.onWin();
  const out = AP.applyResult(stage, res); saveNow(); resultScreen(stage, res, out, opts);
}
export function controlsGuide(){ return new Promise(res => { const p = panel('操作指南', { modal: true, cls: 'guide', onclose: res });
  const row = (g, t, d) => h('div.gd-r', {}, h('span.gd-g', {}, g), h('div', {}, h('b', {}, t), h('p', {}, d)));
  p.body.append(h('div.gd', {},
    row('◎', '左摇杆', '左右移动；向上推跳跃，向下推可从平台落下。'), row('⚔', '攻击', '连按打出四段连击；空中攻击可让敌人浮空。按住持续攻击。'),
    row('⤒', '跳跃', '可二段跳。部分角色的被动可三段跳。'), row('➤', '冲刺', '短距离冲刺，冲刺过程无敌——闪避首领红色预警的关键。'),
    row('技', '技能 ×5', '消耗法力，冷却后可再次使用。在「伙伴 · 技能」里升级并更换技能。'), row('龍', '变身', `连击与受击积攒怒气，满后变身：大幅强化并获得专属攻击（${ULT_LV} 级解锁）。`),
    row('⇄', '换人 / 灵药', '随时切换出战伙伴；灵药回复气血与法力，每关数量有限。'),
    h('p.gd-tip', {}, '评价按用时、受击次数与连击计算：S 评价可获得额外技能点。')), h('div.row.center', {}, btn('明白了', () => p.close(), 'gold')));
}); }
function resultScreen(stage, res, out, opts){
  const win = res.win; const lvl = Object.entries(out.ups);
  sfx(win ? 'win' : 'lose'); playBgm(win ? 'warm' : 'sad');
  const items = out.items.map(it => it.soul ? h('div.rs-it.soul', {}, h('img', { src: asset(AFOES[it.soul]?.img || 'enemy/a0') }), h('span', {}, (AFOES[it.soul]?.name || '') + '灵魄 ×' + it.n))
    : h('div.rs-it', { style: { borderColor: RCOL(rarOf(it.id)) } }, icon(ITEMS[it.id]?.icon || 'item', 'sm'), h('span', { style: { color: RCOL(rarOf(it.id)) } }, gearName(it.id) + (it.n > 1 ? ' ×' + it.n : ''))));
  const next = (() => { if (stage.kind === 'tower') return towerStage(stage.floor + 1); if (!REGION_STAGES[stage.region] || stage.kind !== 'normal' && stage.kind !== 'boss') return null; const ids = REGION_STAGES[stage.region]; const nx = ids[stage.idx + 1] || REGION_STAGES[REGION_ORDER[stage.ri + 1]]?.[0]; return nx && AP.stageUnlocked(nx) && !STAGES[nx].hidden ? STAGES[nx] : null; })();
  const back = () => opts.back ? opts.back() : show(adventureScreen(stage.region));
  const root = screen('result' + (win ? '.win' : '.lose'), 'bg/' + (stage.bg || 'jincheng'),
    h('div.rs-box', {},
      h('div.rs-l', {}, h('div.rs-title', {}, win ? '闯 关 成 功' : res.why === '时间耗尽' ? '时 间 耗 尽' : res.why === '灯火熄灭' ? '长 明 灯 灭' : '败 退'),
        win ? h('div.rs-rank.r' + res.rating, {}, res.rating) : h('div.rs-rank.rF', {}, '败'),
        h('div.rs-name', {}, stage.name + (res.hard ? ' · 困难' : '')),
        h('div.rs-stats', {}, h('span', {}, '用时 ' + Math.floor(res.time / 60) + ':' + String(res.time % 60).padStart(2, '0')), h('span', {}, '最高连击 ' + res.combo), h('span', {}, '击败 ' + res.kills), h('span', {}, '受击 ' + res.hits)),
        !win ? h('p.rs-tip', {}, tipFor(stage, res)) : null),
      h('div.rs-r', {},
        h('div.rs-gain', {}, h('b', {}, '✦ ' + out.gold), h('b', {}, '经验 +' + out.exp), out.sp ? h('b.sp', {}, '技能点 +1') : null, out.first ? h('em', {}, '首次通关') : null, out.newBest && win ? h('em', {}, '新纪录') : null),
        lvl.length ? h('div.rs-ups', {}, ...lvl.map(([id, l]) => h('div', {}, h('img', { src: portrait(id) }), `${CHARS[id].name} 升至 Lv ${l[l.length - 1]}`))) : null,
        out.unlocks.length ? h('div.rs-unl', {}, ...out.unlocks.map(u => h('div', {}, '✧ ' + u))) : null,
        h('div.rs-items', {}, ...(items.length ? items : [h('div.rs-none', {}, win ? '本关没有掉落' : '失败时不保留掉落，仅获得部分星砂与经验')])),
        h('div.rs-btns', {}, btn('返回', back, ''), btn(win ? '再战一次' : '重新挑战', () => launch(stage, opts), ''), next && win ? btn('下一关 ▶', () => stageDetail(next, opts), 'gold') : null))));
  show(root);
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
  const tabs = h('div.hr-tabs', {}, ...[['skill', '技能'], ['stat', '属性'], ['gear', '装备']].map(([k, n]) => h('div.tab' + (k === tab ? '.on' : ''), { onclick: () => show(heroesScreen(sel, k)) }, n)));
  const body = h('div.hr-body'); if (tab === 'skill') skillTab(body, sel); else if (tab === 'stat') statTab(body, sel); else gearTab(body, sel);
  const inTeam = S.act.team.includes(sel);
  return screen('heroes', 'bg/dengta', header('伙伴'), h('div.hr-wrap', {}, list,
    h('div.hr-card', {}, h('img.hr-por', { src: portrait(sel) }), h('div.hr-name', {}, h('b', {}, c.name), h('small', {}, c.title)),
      h('div.hr-tags', {}, elChip(c.el), c.el2 ? elChip(c.el2) : null, chip(WEAPON[A.wpn].name), chip(A.role)),
      h('div.hr-lv', {}, `Lv ${p.lv}`, h('div.hr-exp', {}, h('i', { style: { width: (p.lv >= 40 ? 100 : p.exp / expNeed(p.lv) * 100) + '%' } })), h('small', {}, `战力 ${power(sel)}`)),
      btn(inTeam ? (S.act.team[0] === sel ? '队长' : '已在队伍') : '设为队长', () => { S.act.team = [sel, ...S.act.team.filter(x => x !== sel)].slice(0, 3); saveNow(); show(heroesScreen(sel, tab)); }, inTeam && S.act.team[0] === sel ? 'sm disabled' : 'sm gold')),
    h('div.hr-main', {}, tabs, body)));
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
  const detail = h('div.pt-d', {}, h('div.pt-img', {}, h('img', { src: asset(P.img) })), h('div.pt-n', {}, h('b', {}, P.name), elChip(P.el), chip(AI_NAME[P.ai])),
    h('p.pt-desc', {}, P.desc || ''),
    pd ? h('div.pt-st', {}, h('div', {}, `等级 ${pd.lv}/50`, h('div.hr-exp', {}, h('i', { style: { width: (pd.exp / AP.petExpNeed(pd.lv) * 100) + '%' } }))), h('div', {}, '星级 ' + '★'.repeat(pd.star || 0) + '☆'.repeat(5 - (pd.star || 0))),
      h('div', {}, `助战威力 ${AP.petPower(pd)}`), h('div', {}, '队伍加成 ' + Object.entries(AP.petBonus(pd)).map(([k, v]) => STATN[k] + ' +' + (v * 100).toFixed(1) + '%').join(''))) : h('div.pt-st', {}, `灵魄 ${n}/${AP.SOUL_NEED}：击败该异兽（精英、异种更容易）有几率掉落灵魄。每日「异兽秘境」掉率×4。`),
    h('div.pt-btns', {}, pd ? [
      btn(S.act.pet === sel ? '助战中' : '设为助战', () => { S.act.pet = sel; saveNow(); show(petScreen(sel)); }, S.act.pet === sel ? 'sm disabled' : 'sm gold'),
      btn('喂养 ✦200', () => { if (!AP.petFeed(sel, 200)) return toast(pd.lv >= 50 ? '已满级' : '星砂不足'); if (feedEff > 1) pd.exp += Math.round(40 * (feedEff - 1)); sfx('heal'); saveNow(); show(petScreen(sel)); }, 'sm'),
      btn('喂养 ✦1000', () => { if (!AP.petFeed(sel, 1000)) return toast(pd.lv >= 50 ? '已满级' : '星砂不足'); if (feedEff > 1) pd.exp += Math.round(200 * (feedEff - 1)); sfx('heal'); saveNow(); show(petScreen(sel)); }, 'sm'),
      btn(`升星（灵魄 ${n}/${AP.SOUL_NEED * ((pd.star || 0) + 1)}）`, () => { if (!AP.petStar(sel)) return toast('灵魄不足或已满星'); sfx('level'); saveNow(); show(petScreen(sel)); }, 'sm')]
      : btn('孵 化', () => { if (!AP.hatch(sel)) return toast('灵魄不足'); sfx('ach'); toast(P.name + ' 破卵而出！'); saveNow(); show(petScreen(sel)); }, n >= AP.SOUL_NEED ? 'gold' : 'disabled')));
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
      h('div.fg-cost', {}, `每次锻造：✦${c.gold} · ${ITEMS[m].name} ×${c.mat}（持有 ${S.inv[m] || 0}）` + (t >= 4 ? ` · 星髓晶 ×${c.mat2}（持有 ${S.inv.m_starmarrow || 0}）` : ''), h('small', {}, '品质随机：良品 50% · 精品 30% · 珍品 15% · 神品 5%')),
      h('div.fg-grid', {}, ...['weapon', 'armor', 'charm'].flatMap(slot => [0, 1, 2].map(k => { const id = `g_${slot[0]}${t}${k}2`; const it = ITEMS[id];
        return h('div.fg-it', {}, icon(it.icon, 'md'), h('b', {}, it.name.replace(/·.$/, '')), h('small', {}, SLOTN[slot] + ' · ' + itemLine({ ...it, affix: [] })), btn('锻造', () => { const r = AP.forge(t, slot, k); if (r.err) return toast(r.err); sfx('fire'); saveNow(); forgeReveal(r.id, () => show(forgeScreen(tab, t))); }, 'sm')); }))));
  } else {
    const gear = Object.keys(S.inv).filter(k => ITEMS[k]?.gen && S.inv[k] > 0).sort((a, b) => rarOf(a) - rarOf(b) || ITEMS[a].tier - ITEMS[b].tier);
    body.append(h('div.fg-cost', {}, '分解闯关装备，获得星砂与对应阶的锻造材料。', gear.length ? btn('一键分解凡品与良品', async () => { const low = gear.filter(k => rarOf(k) <= 1); if (!low.length) return toast('没有可分解的凡品/良品'); if (!(await confirmBox(`分解 ${low.reduce((a, k) => a + S.inv[k], 0)} 件凡品/良品装备？`))) return; let g = 0; for (const k of low) while (S.inv[k] > 0) g += AP.salvage(k).gold; toast('获得 ✦' + g); saveNow(); show(forgeScreen('salv')); }, 'sm') : null),
      h('div.gp-list', {}, ...(gear.length ? gear.map(k => { const it = ITEMS[k]; return h('div.gp-it', {}, icon(it.icon, 'md'), h('div', {}, h('b', { style: { color: RCOL(rarOf(k)) } }, it.name + (S.inv[k] > 1 ? ' ×' + S.inv[k] : '')), h('small', {}, itemLine(it))), btn('分解', () => { const r = AP.salvage(k); if (r) toast(`✦${r.gold} · ${ITEMS[r.mat].name}×${r.n}`); sfx('break'); saveNow(); show(forgeScreen('salv')); }, 'sm')); }) : [h('p.gr-tip', {}, '没有可分解的装备。')])));
  }
  return screen('forge', 'bg/yugu', header('铸灯铁坊 · Lv ' + (S.city.forge || 1)), h('div.fg-wrap', {}, tabs, body));
}
function forgeReveal(id, done){ const it = ITEMS[id]; const r = rarOf(id); const p = panel('锻造完成', { modal: true, cls: 'small reveal', onclose: done });
  p.body.append(h('div.fr', { style: '--rc:' + RCOL(r) }, h('div.fr-glow'), icon(it.icon, 'lg'), h('b', { style: { color: RCOL(r) } }, it.name), h('small', {}, RARITY[r].name), h('p', {}, itemLine(it))), h('div.row.center', {}, btn('收下', () => p.close(), 'gold'))); if (r >= 3) sfx('ach'); }
// —— 烬城建设 ——
export function cityScreen(){
  AP.ensureAct();
  const cards = AP.CITY.map(b => { const lv = S.city[b.id] || 1; const max = lv >= b.max; const c = AP.cityCost(lv);
    return h('div.ct-c' + (max ? '.max' : ''), {}, h('div.ct-h', {}, h('b', {}, b.name), h('span', {}, 'Lv ' + lv + '/' + b.max)), h('p', {}, '当前：' + b.desc(lv)), !max ? h('p.nx', {}, '升级后：' + b.desc(lv + 1)) : h('p.nx', {}, '已满级'),
      !max ? h('div.ct-cost', {}, `✦${c.gold}`, h('span', {}, `${ITEMS[b.mats[0]].name} ${S.inv[b.mats[0]] || 0}/${c.mat}`), h('span', {}, `${ITEMS[b.mats[1]].name} ${S.inv[b.mats[1]] || 0}/${Math.ceil(c.mat * 0.6)}`)) : null,
      !max ? btn('升 级', () => { const e = AP.cityUp(b.id); if (e) return toast(e); sfx('level'); toast(b.name + ' 升至 Lv ' + (lv + 1)); saveNow(); show(cityScreen()); }, 'gold sm') : null); });
  const lit = AP.CITY.reduce((a, b) => a + (S.city[b.id] || 1), 0);
  return screen('city', 'bg/jincheng', header('烬城建设'), h('div.ct-wrap', {}, h('div.ct-intro', {}, h('b', {}, `城中灯火 ${lit}/${AP.CITY.reduce((a, b) => a + b.max, 0)}`), h('p', {}, '长夜之下，烬城是最后一座有灯的城。把闯关带回的材料交给城里的匠人，一点点把它重新点亮。')), h('div.ct-grid', {}, ...cards)));
}
// —— 试炼：镇妖塔 / 首领连战 / 每日秘境 / 每日委托 ——
export function trialScreen(tab = 'tower'){
  AP.ensureAct(); AP.rollDaily();
  const tabs = h('div.hr-tabs', {}, ...[['tower', '镇妖塔'], ['daily', '每日秘境'], ['rush', '首领连战'], ['mission', '每日委托']].map(([k, n]) => h('div.tab' + (k === tab ? '.on' : ''), { onclick: () => show(trialScreen(k)) }, n, k === 'mission' && hubBadges().m ? h('i.rdot') : null)));
  const body = h('div.tr-body'); const back = () => show(trialScreen(tab)); const lv = Math.max(...AP.actRoster().map(id => S.party[id].lv));
  if (tab === 'tower') { const f = S.act.tower + 1; const floors = [];
    for (let i = Math.min(100, f + 3); i >= Math.max(1, f - 2); i--) { const s = towerStage(i); floors.push(h('div.tw-f' + (i < f ? '.done' : i === f ? '.cur' : '.lock') + (s.boss ? '.boss' : ''), {}, h('b', {}, s.name), h('small', {}, `Lv ${s.lv}` + (s.boss ? ' · 首领 ' + ABOSSES[s.boss].name : '') + (s.obj === 'timed' ? ' · 限时' : '')), i === f ? btn('挑战', () => stageDetail(s, { back }), 'gold sm') : i < f ? chip('已通过') : null)); }
    body.append(h('div.tw-wrap', {}, h('div.tw-l', {}, h('b', {}, `最高 第 ${S.act.tower} 层`), h('p', {}, '镇妖塔共一百层，层层递进。每十层镇守一名首领。每层只能向上，失败可无限重试。'), h('p', {}, '奖励：首次登顶每层获得星砂与经验，首领层必掉装备。')), h('div.tw-list', {}, ...floors))); }
  if (tab === 'daily') { body.append(h('div.dl-grid', {}, ...DAILY.map(d => { const used = S.daily.done[d.id] || 0; const left = AP.DAILY_TRIES - used; const s = dailyStage(d, lv);
    return h('div.dl-c' + (left <= 0 ? '.used' : ''), { style: { backgroundImage: `linear-gradient(180deg,rgba(10,10,18,.2),rgba(10,10,18,.92)),url(${asset('bg/' + d.bg)})` } }, h('b', {}, d.name), h('p', {}, d.desc), h('small', {}, `Lv ${s.lv} · 今日剩余 ${left}/${AP.DAILY_TRIES}`),
      btn(left > 0 ? '进入' : '明日再来', () => { if (left <= 0) return; stageDetail(s, { back, onWin: () => { S.daily.done[d.id] = used + 1; } }); }, left > 0 ? 'gold sm' : 'sm disabled')); }))); }
  if (tab === 'rush') { const ok = !!S.act.cleared.kunlun_10; const s = rushStage(); s.lv = Math.max(10, lv);
    body.append(h('div.rush', {}, h('b', {}, '首领连战 · 十殿'), h('p', {}, '连续挑战十名首领，中途不能补给灵药之外的东西。气血在首领之间不会恢复。'), h('div.rush-l', {}, ...s.rush.map(b => h('div', {}, h('img', { src: asset(ABOSSES[b].img) }), h('small', {}, ABOSSES[b].name)))),
      h('p', {}, `已完成 ${S.act.rush || 0} 次 · 推荐 Lv ${s.lv}`), ok ? btn('开 战', () => stageDetail(s, { back }), 'gold') : h('p.lock', {}, '通关「帝之下都」（昆仑第 10 关）后开放'))); }
  if (tab === 'mission') { body.append(h('div.ms-list', {}, ...AP.MISSIONS.map(m => { const pr = Math.min(m.need, S.daily.prog[m.id] || 0); const done = pr >= m.need; const cl = S.daily.claimed[m.id];
    return h('div.ms-it' + (cl ? '.cl' : done ? '.ok' : ''), {}, h('b', {}, m.name), h('div.hr-exp', {}, h('i', { style: { width: pr / m.need * 100 + '%' } })), h('small', {}, `${pr}/${m.need} · ✦${m.gold}`), cl ? chip('已领取') : btn('领取', () => { if (!AP.claimMission(m.id)) return toast('尚未完成'); sfx('coin'); saveNow(); show(trialScreen('mission')); }, done ? 'gold sm' : 'sm disabled')); }), h('p.gr-tip', {}, '每日 0 点刷新。'))); }
  return screen('trial', 'bg/dengta', header('试炼'), h('div.fg-wrap', {}, tabs, body));
}
