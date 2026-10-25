// v1.1 成长界面：星命 · 精炼 · 套装 · 灯阶
import { S, stats, addItem, addGold, ach } from '../engine/state.js';
import { CHARS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { TALENTS, talentPoints, SETS, setOf, AFFIXES, refineCost, LAMP } from '../data/progress.js';
import { h, btn, icon, toast, panel, confirmBox, rewardPop } from '../engine/ui.js';
import { sfx } from '../engine/audio.js';

const have = (need) => Object.entries(need||{}).every(([k,n]) => (S.inv[k]||0) >= n);
const needRow = (gold, need) => h('div.need', {}, gold ? h('span.'+(S.gold>=gold?'have':'lack'), {}, `✦ ${gold}`) : null,
  ...Object.entries(need||{}).map(([k,n]) => h('span.'+((S.inv[k]||0)>=n?'have':'lack'), {}, icon(ITEMS[k].icon,'xs'), `${ITEMS[k].name} ${S.inv[k]||0}/${n}`)));
const pay = (gold, need) => { addGold(-(gold||0)); for (const [k,n] of Object.entries(need||{})) addItem(k, -n); };

// —— 星命 ——
export function freePoints(m){ const p = S.party[m]; return talentPoints(p.lv) - (p.talents||[]).length; }
export function talentView(m, rerender){
  const tl = TALENTS[m]; if (!tl) return null; const p = S.party[m]; p.talents ??= [];
  const pts = freePoints(m);
  const nodes = tl.map((t,i) => { const on = p.talents.includes(t.id); const next = !on && i===p.talents.length; const can = next && pts>0;
    return h('div.tn'+(on?'.on':'')+(can?'.can':'')+(t.id==='t5'?'.sig':''), { onclick:async ()=>{ sfx('click');
      if (on) { toast(`「${t.name}」已点亮：${t.desc}`); return; }
      if (!next) { toast('星命需按顺序点亮'); return; }
      if (pts<=0) { toast(`星命点不足（每 4 级获得 1 点，下一点：Lv ${(talentPoints(p.lv)+1)*4}）`); return; }
      p.talents.push(t.id); ach('talent'); sfx('level'); toast(`${CHARS[m].name} 点亮星命「${t.name}」`, 'good'); rerender(); } },
      h('div.tn-dot', {}, on ? '★' : String(i+1)), h('div.tn-n', {}, t.name), h('div.tn-d', {}, t.desc)); });
  return h('div.talents', {}, h('div.tl-head', {}, h('b', {}, '星命'), h('span', {}, pts>0 ? h('em', {}, `可用 ${pts} 点`) : `下一点：Lv ${(talentPoints(p.lv)+1)*4}`)), h('div.tl-row', {}, nodes));
}

// —— 套装 ——
export function setView(m){
  const eq = Object.values(S.party[m].equip).filter(Boolean); const cnt = {};
  for (const i of eq) { const s = setOf(i); if (s) cnt[s.id] = (cnt[s.id]||0)+1; }
  const act = SETS.filter(s=>cnt[s.id]);
  if (!act.length) return h('div.sets.tiny', {}, '套装：同系列兵器 / 衣甲 / 灵佩凑齐 2 件、3 件可激活额外效果。');
  return h('div.sets', {}, act.map(s => h('div.set-l', {}, h('b', {}, `${s.name} ${cnt[s.id]}/3`),
    h('span'+(cnt[s.id]>=2?'.on':''), {}, '2件：'+s.b2.desc), h('span'+(cnt[s.id]>=3?'.on':''), {}, '3件：'+s.b3.desc))));
}
export const refineLv = (iid) => S.refine?.[iid]?.lv || 0;

// —— 精炼 ——
export function refinePanel(iid, after){
  const it = ITEMS[iid]; if (!it) return;
  const p = panel('精炼 · '+it.name, { cls:'small refine' });
  const render = () => {
    const R = S.refine[iid] ||= { lv:0, aff:[] }; const lv = R.lv; const set = setOf(iid);
    const base = ['atk','mag','def','hp','mp'].filter(k=>it[k]).map(k=>({atk:'攻击',mag:'术法',def:'防御',hp:'气血',mp:'灵力'})[k]+' '+it[k]+(lv?` → ${it[k]+Math.round(it[k]*0.1*lv)}`:'')).join('　');
    p.body.replaceChildren(
      h('div.rf-top', {}, icon(it.icon,'lg'), h('div', {}, h('div.rf-name', {}, it.name, lv?h('em', {}, ` +${lv}`):null), h('div.rf-stars', {}, [1,2,3,4,5].map(i=>h('i'+(i<=lv?'.on':'')+((i===3||i===5)?'.aff':''), {}, '◆'))), h('div.tiny', {}, base),
        set ? h('div.tiny', {}, `套装「${set.name}」`) : null)),
      h('div.rf-aff', {}, (R.aff||[]).length ? R.aff.map(a=>{ const A=AFFIXES.find(x=>x.k===a); return h('span.af', {}, A.name+' · '+A.desc); }) : h('span.tiny', {}, '+3 与 +5 时会随机获得一条词条')),
      lv>=5 ? h('p.center', {}, '已精炼至极致。') : (()=>{ const c = refineCost(it, lv+1); const ok = S.gold>=c.gold && have(c.need);
        return h('div', {}, h('div.tiny', {}, `精炼至 +${lv+1}：基础属性 +10%`+((lv+1===3||lv+1===5)?'，并获得随机词条':'')), needRow(c.gold, c.need),
          h('div.row.center', {}, btn('精炼', async ()=>{ if (!ok) { toast('材料或星砂不足', 'bad'); return; }
            pay(c.gold, c.need); R.lv++; let got = null;
            if (R.lv===3 || R.lv===5) { const pool = AFFIXES.filter(a=>!R.aff.includes(a.k)); got = pool[Math.floor(Math.random()*pool.length)]; R.aff.push(got.k); }
            sfx('ult'); render(); after && after();
            await rewardPop(`精炼 +${R.lv}`, [{ icon:it.icon, name:it.name, n:null }, ...(got?[{ glyph:'✧', name:got.name+'：'+got.desc }]:[])]); }, ok?'gold':'')) ); })());
  };
  render(); return p;
}

// —— 灯阶 ——
export function lampPanel(after){
  const p = panel('灯阶 · 守灯人之灯', { cls:'small lamp' });
  const render = () => {
    const cur = S.lamp||1; const nx = LAMP[cur+1];
    p.body.replaceChildren(
      h('div.lp-row', {}, LAMP.slice(1).map((L,i)=>h('div.lp'+(i+1<=cur?'.on':'')+(i+1===cur+1?'.next':''), {}, h('div.lp-ic', {}, ['','微','棘','雾','影','明'][i+1]), h('div.lp-n', {}, L.name.split('·')[1])))),
      h('div.lp-cur', {}, h('b', {}, LAMP[cur].name), h('div', {}, LAMP[cur].desc)),
      nx ? h('div.lp-next', {}, h('div', {}, '下一阶：', h('b', {}, nx.name)), h('div.tiny', {}, nx.desc), needRow(nx.cost.gold, nx.cost.need),
        h('div.row.center', {}, btn('点亮', async ()=>{ const ok = S.gold>=nx.cost.gold && have(nx.cost.need); if (!ok) { toast('星砂或材料不足——星髓晶可在宝箱、精英与首领处获得', 'bad'); return; }
          pay(nx.cost.gold, nx.cost.need); S.lamp = cur+1; if (S.lamp>=5) ach('lamp5'); sfx('ult'); render(); after && after();
          await rewardPop('灯火更盛', [{ glyph:'🏮', name:nx.name }]); toast(nx.desc, 'good'); }, (S.gold>=nx.cost.gold && have(nx.cost.need))?'gold':'')))
         : h('p.center', {}, '灯火已至长明。'));
  };
  render(); return p;
}
export const lampReady = () => { const nx = LAMP[(S.lamp||1)+1]; return !!nx && S.gold>=nx.cost.gold && have(nx.cost.need); };
