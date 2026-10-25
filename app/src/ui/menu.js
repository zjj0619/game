import { S, settings, saveSettings, meta, saveMeta, save, load, slotInfo, SAVE_SLOTS, AUTO, stats, skillsOf, expNeed, addItem, addGold, ach, exportCode, importCode, healAll } from '../engine/state.js';
import { CHARS, SKILLS, EL, EL_COLOR, PLAYABLE, COMPANIONS } from '../data/characters.js';
import { ITEMS, RECIPES, SHOPS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { REGIONS, REGION_ORDER } from '../data/regions.js';
import { QUESTS } from '../data/quests.js';
import { LORE } from '../data/lore.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { h, btn, asset, icon, toast, panel, confirmBox, promptBox, fmtTime } from '../engine/ui.js';
import { applyVolumes, sfx } from '../engine/audio.js';
import { aiReady, quota, chat, idbGet, idbSet } from '../engine/ai.js';
import { inSub, runSub, vnScreen, restoreScene } from '../engine/vn.js';
import { show } from '../main.js';
import { game } from '../main.js';
import { questState, questProgress } from './screens.js';
import { talentView, setView, refinePanel, refineLv, freePoints } from './progress.js';

const TABS = [['party','队伍'],['bag','行囊'],['craft','炼制'],['quest','任务'],['codex','图鉴'],['ach','成就'],['save','存档'],['load','读档'],['settings','设置'],['title','标题']];
export function openMenu(tab='party'){
  document.querySelectorAll('.panel-wrap.mainmenu').forEach(p=>p.remove());
  const tabs = h('div.tabs');
  const p = panel('行囊', { cls:'mainmenu', tabs });
  const go = (k) => {
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.k===k);
    p.body.replaceChildren(); p.body.scrollTop=0;
    ({party:tabParty, bag:tabBag, craft:tabCraft, quest:tabQuest, codex:tabCodex, ach:(b)=>achList(b), save:(b)=>saveList(b,'save'), load:(b)=>saveList(b,'load'), settings:(b)=>settingsBody(b), title:tabTitle})[k](p.body, p);
  };
  for (const [k,n] of TABS) tabs.append(h('button.tab', { 'data-k':k, onclick:(e)=>{ e.stopPropagation(); sfx('click'); go(k); } }, n));
  go(tab); return p;
}

// —— 队伍 ——
let selChar = 'yangui', pdSub = 'attr';
function tabParty(body){
  if (!S.members.includes(selChar)) selChar='yangui';
  const list = h('div.plist', {}, S.members.map(m => h('div.pcard'+(m===selChar?'.on':'')+(S.formation.includes(m)?'.inform':''), { onclick:()=>{ selChar=m; sfx('click'); body.replaceChildren(); tabParty(body); } },
    h('div.a-face', {style:{backgroundImage:`url(${asset('por/'+m)})`}}), h('div', {}, h('b', {}, CHARS[m].name), h('small', {}, ' Lv'+S.party[m].lv), h('div.tiny', {}, S.formation.includes(m)?'出战':'后备', freePoints(m)>0?h('em.dot', {}, ' ★'):null)))));
  if (S.lost.length) list.append(h('div.lost', {}, '已失去：'+S.lost.map(x=>CHARS[x].name).join('、')));
  const m = selChar, c = CHARS[m], p = S.party[m], st = stats(m);
  const statRow = (k,n) => h('div.stat', {}, h('span', {}, n), h('b', {}, st[k]));
  const rr = () => { body.replaceChildren(); tabParty(body); };
  const slot = (s, n) => { const k = p.equip[s], it = ITEMS[k]; const rl = k ? refineLv(k) : 0;
    return h('div.eslot', {}, h('div.es-main', { onclick:()=>equipPick(m, s, body) }, h('span.sl', {}, n), it?icon(it.icon,'sm'):h('span.none', {}, '—'), h('span.es-n', {}, it?it.name:'未装备', rl?h('em', {}, ' +'+rl):null)),
      it ? h('button.es-rf', { onclick:(e)=>{ e.stopPropagation(); sfx('click'); refinePanel(k, rr); } }, '精炼') : null); };
  const affBar = COMPANIONS.includes(m)||m==='fuli' ? h('div.aff', {}, h('span', {}, '好感'), h('div.bar.aff', {}, h('i', {style:{width:S.aff[m]+'%'}})), h('b', {}, S.aff[m]), h('small', {}, S.aff[m]>=90?' 生死之交':S.aff[m]>=60?' 信赖':S.aff[m]>=40?' 友善':' 生疏')) : null;
  const fp = freePoints(m);
  const sub = {
    attr: () => [h('div.stats', {}, h('div.stat', {}, h('span', {}, '气血'), h('b', {}, `${p.hp}/${st.hp}`)), h('div.stat', {}, h('span', {}, '灵力'), h('b', {}, `${p.mp}/${st.mp}`)), statRow('atk','攻击'), statRow('mag','术法'), statRow('def','防御'), statRow('spd','速度'), h('div.stat', {}, h('span', {}, '暴击'), h('b', {}, Math.round(st.crit*100)+'%'))),
      affBar, h('div.eslots', {}, slot('weapon','兵器'), slot('armor','衣甲'), slot('charm','灵佩')), setView(m),
      m!=='yangui' ? btn(S.formation.includes(m)?'设为后备':'设为出战', ()=>{ if (S.formation.includes(m)) S.formation=S.formation.filter(x=>x!==m); else { if (S.formation.length>=4) { toast('出战最多 4 人'); return; } S.formation.push(m); } rr(); }, 'sm') : null],
    star: () => [talentView(m, rr)],
    skill: () => [h('div.skills', {}, [...c.skills, c.ult].map(k => { const s=SKILLS[k]; const ok = s.ult || s.lv<=p.lv;
        return h('div.sk'+(ok?'':'.locked')+(s.ult?'.ult':''), {}, h('b', {style:{color:EL_COLOR[s.el]}}, EL[s.el]), h('span.sn', {}, s.name), h('span.mp', {}, s.ult?'灯火100':ok?s.mp+'灵':'Lv'+s.lv), h('span.sd', {}, s.desc)); })), h('p.bio', {}, c.bio)],
  };
  const subTabs = h('div.pd-tabs', {}, [['attr','属性 · 装备'],['star','星命'+(fp>0?' ●':'')],['skill','技艺 · 传记']].map(([k,n]) => h('button'+(pdSub===k?'.on':''), { onclick:()=>{ pdSub=k; sfx('click'); rr(); } }, n)));
  const detail = h('div.pdetail', {},
    h('div.pd-por', {style:{backgroundImage:`url(${asset('por/'+m)})`}}),
    h('div.pd-main', {},
      h('div.pd-name', {}, c.name, h('small', {}, ' '+c.title), h('b.el', {style:{color:EL_COLOR[c.el]}}, ' '+EL[c.el]+(c.el2?'·'+EL[c.el2]:''))),
      h('div.pd-lv', {}, `Lv ${p.lv}  经验 ${p.exp}/${expNeed(p.lv)}`), h('div.bar.exp', {}, h('i', {style:{width:(p.exp/expNeed(p.lv)*100)+'%'}})),
      subTabs, ...sub[pdSub]()));
  body.append(h('div.party', {}, list, detail));
}
function equipPick(m, slot, body){
  const type = slot;
  const p = panel('选择'+({weapon:'兵器',armor:'衣甲',charm:'灵佩'})[slot], { cls:'small' });
  const cur = S.party[m].equip[slot];
  const opts = Object.keys(S.inv).filter(k=>ITEMS[k]?.type===type && S.inv[k]>0);
  const fmt = it => ['atk','mag','def','hp','mp','spd'].filter(k=>it[k]).map(k=>({atk:'攻',mag:'术',def:'防',hp:'血',mp:'灵',spd:'速'})[k]+'+'+it[k]).join(' ');
  p.body.append(h('div.ilist', {},
    cur ? h('div.irow', { onclick:()=>{ addItem(cur,1); S.party[m].equip[slot]=null; p.close(); body.replaceChildren(); tabParty(body); } }, h('span.none', {}, '✕'), h('span', {}, '卸下 '+ITEMS[cur].name)) : null,
    opts.length ? opts.map(k => h('div.irow', { onclick:()=>{ sfx('item'); if (cur) addItem(cur,1); addItem(k,-1); S.party[m].equip[slot]=k; const st=stats(m); S.party[m].hp=Math.min(S.party[m].hp,st.hp); S.party[m].mp=Math.min(S.party[m].mp,st.mp); p.close(); body.replaceChildren(); tabParty(body); } },
      icon(ITEMS[k].icon,'sm'), h('span', {}, ITEMS[k].name+' ×'+S.inv[k]), h('small', {}, fmt(ITEMS[k])+' '+ITEMS[k].desc))) : h('div.empty', {}, '行囊里没有可装备的物品')));
}
// —— 行囊 ——
let bagCat = 'use';
function tabBag(body){
  const cats = [['use','丹药'],['weapon','兵器'],['armor','衣甲'],['charm','灵佩'],['mat','材料'],['key','珍物']];
  const keys = Object.keys(S.inv).filter(k=>ITEMS[k] && S.inv[k]>0 && ITEMS[k].type===bagCat);
  const detail = h('div.idetail', {}, h('div.empty', {}, '选择一件物品查看'));
  const show = k => { const it=ITEMS[k];
    detail.replaceChildren(icon(it.icon,'lg'), h('h3', {}, it.name), h('p', {}, it.desc), h('p.tiny', {}, '持有 '+S.inv[k]+(it.price?' · 价值 '+it.price:'')),
      it.type==='use' && (it.heal||it.mpheal||it.revive||it.perm||it.cleanse) ? h('div.row', {}, S.members.map(m=>btn(CHARS[m].name, ()=>fieldUse(k, m, body), 'sm'))) : null);
  };
  body.append(h('div.bagtabs', {}, cats.map(([k,n])=>h('button.tab.sm'+(k===bagCat?'.on':''), { onclick:(e)=>{ e.stopPropagation(); bagCat=k; body.replaceChildren(); tabBag(body); } }, n)), h('span.gold', {}, '✦ 星砂 '+S.gold)),
    h('div.bag', {}, h('div.igrid', {}, keys.length ? keys.map(k=>h('div.icell', { onclick:()=>{ sfx('click'); show(k); } }, icon(ITEMS[k].icon), h('span.cnt', {}, S.inv[k]), h('span.in', {}, ITEMS[k].name))) : h('div.empty', {}, '空空如也')), detail));
}
function fieldUse(k, m, body){
  const it = ITEMS[k]; const st = stats(m); const p = S.party[m];
  const targets = it.tgt==='allies' ? S.members : [m];
  for (const t of targets) { const s2=stats(t), q=S.party[t];
    if (it.heal) q.hp = Math.min(s2.hp, q.hp+it.heal); if (it.revive) q.hp = Math.max(q.hp, Math.round(s2.hp*it.revive)); if (it.mpheal) q.mp=Math.min(s2.mp, q.mp+it.mpheal);
    if (it.perm) for (const [a,v] of Object.entries(it.perm)) q.perm[a]=(q.perm[a]||0)+v; }
  addItem(k,-1); sfx('heal'); toast(`${CHARS[m].name} 使用了 ${it.name}`); body.replaceChildren(); tabBag(body);
}
// —— 炼制 ——
function tabCraft(body){
  const rows = RECIPES.map(r => { const out=ITEMS[r.out];
    const ok = Object.entries(r.need).every(([k,n])=>(S.inv[k]||0)>=n) && S.gold>=r.gold;
    return h('div.recipe'+(ok?'':'.no'), {}, h('span.kind', {}, r.kind), icon(out.icon,'sm'), h('div.r-out', {}, h('b', {}, out.name+(r.n>1?' ×'+r.n:'')), h('small', {}, out.desc)),
      h('div.r-need', {}, Object.entries(r.need).map(([k,n])=>h('span'+((S.inv[k]||0)>=n?'.have':'.lack'), {}, `${ITEMS[k].name} ${S.inv[k]||0}/${n}`)), r.gold?h('span'+(S.gold>=r.gold?'.have':'.lack'), {}, `星砂 ${r.gold}`):null),
      btn('炼制', ()=>{ if (!ok) { toast('材料不足'); return; } for (const [k,n] of Object.entries(r.need)) if (ITEMS[k].type!=='key') addItem(k,-n); addGold(-r.gold); addItem(r.out, r.n); S.stats.crafts=(S.stats.crafts||0)+1; ach('craft1'); if (S.stats.crafts>=20) ach('craft20'); sfx('ach'); toast('炼成：'+out.name, 'good'); body.replaceChildren(); tabCraft(body); }, 'sm'+(ok?' gold':'')));
  });
  body.append(h('p.tiny', {}, '“丹”为丹药，“器”为装备。以烛龙鳞炼制神兵时，鳞片不会消耗。'), h('div.recipes', {}, rows));
}
// —— 任务 ——
function tabQuest(body){
  const main = h('div.qmain', {}, h('h3', {}, '主线 · '+(S.chapter||'')), h('p', {}, S.explore ? `前往【${REGIONS[S.explore.region].name}】的“${S.explore.name}”继续故事。` : '故事正在进行。'), h('p.tiny', {}, `烛龙鳞 ${Object.keys(S.inv).filter(k=>ITEMS[k]?.scale).length}/7 · 灯心 ${S.hope}/100 · 支线完成 ${Object.values(S.quests).filter(x=>x==='done').length}/24`));
  const qs = Object.values(QUESTS).filter(q=>S.flags[q.unlock]);
  const row = q => { const st=questState(q); return h('div.qrow.'+st, {}, h('b', {}, q.name), h('span.qr', {}, REGIONS[q.region].name.split('·')[0]+' · '+q.giver), h('small', {}, q.desc), st!=='done'&&st!=='new'?h('small.prog', {}, '进度：'+questProgress(q)):null, h('span.qs', {}, {new:'可接取',active:'进行中',ready:'可交付',done:'已完成'}[st])); };
  body.append(main, h('div.qlist', {}, qs.length ? qs.sort((a,b)=>({ready:0,active:1,new:2,done:3})[questState(a)]-({ready:0,active:1,new:2,done:3})[questState(b)]).map(row) : h('div.empty', {}, '暂无支线')));
}
// —— 图鉴 ——
let codexCat = 'c';
export function codexEntries(){
  return {
    c: Object.entries(CHARS).map(([k,v])=>({id:'c_'+k, name:v.name, sub:v.title, text:v.bio, img:'por/'+k})),
    e: Object.entries(ENEMIES).map(([k,v])=>({id:'e_'+k, name:v.name, sub:EL[v.el]+'属性'+(k.startsWith('B_')?' · 首领':''), text:v.desc+(S.kills[k]?`\n\n已击败 ${S.kills[k]} 次。`:''), img:v.img, el:v.el})),
    i: Object.entries(ITEMS).filter(([k,v])=>v.type==='key').map(([k,v])=>({id:'i_'+k, name:v.name, sub:'珍物', text:v.desc, icon:v.icon})),
    r: REGION_ORDER.map(k=>({id:'r_'+k, name:REGIONS[k].name, sub:'推荐等级 '+REGIONS[k].lv, text:REGIONS[k].desc, img:'bg/'+REGIONS[k].bg})),
    l: Object.entries(LORE).map(([k,v])=>({id:k, name:v.name, sub:'传说', text:v.text})),
  };
}
function tabCodex(body){
  for (const r of REGION_ORDER) if (S.visited[r] || S.flags['reg_'+r]) S.codex['r_'+r]=true;
  const all = codexEntries(); const tot = Object.values(all).flat(); const got = tot.filter(e=>S.codex[e.id]).length;
  if (got>=tot.length) ach('codex_all');
  const cats = [['c','人物'],['e','异兽'],['i','珍物'],['r','山川'],['l','传说']];
  const list = all[codexCat]; const detail = h('div.cdetail', {}, h('div.empty', {}, '白泽说：凡有所见，皆可记之。'));
  const showE = e => detail.replaceChildren(e.img ? h('div.cd-img'+(e.img.startsWith('bg/')?'.wide':''), {style:{backgroundImage:`url(${asset(e.img)})`}}) : e.icon ? icon(e.icon,'lg') : null, h('h3', {}, e.name), h('div.tiny', {}, e.sub), ...e.text.split('\n').map(t=>h('p', {}, t)));
  body.append(h('div.bagtabs', {}, cats.map(([k,n])=>h('button.tab.sm'+(k===codexCat?'.on':''), { onclick:(e)=>{ e.stopPropagation(); codexCat=k; body.replaceChildren(); tabCodex(body); } }, `${n} ${all[k].filter(e=>S.codex[e.id]).length}/${all[k].length}`)), h('span.gold', {}, `白泽图 ${got}/${tot.length}`)),
    h('div.codex', {}, h('div.clist', {}, list.map(e => S.codex[e.id] ? h('div.centry', { onclick:()=>{ sfx('page'); showE(e); } }, e.name) : h('div.centry.locked', {}, '？？？'))), detail));
}
// —— 成就 ——
export function openAchievements(){ const p=panel('成就'); achList(p.body); }
function achList(body){
  const n = Object.keys(meta.ach).length;
  body.append(h('p.tiny', {}, `已达成 ${n}/${Object.keys(ACHIEVEMENTS).length}`), h('div.achs', {}, Object.entries(ACHIEVEMENTS).map(([k,a]) => h('div.achv'+(meta.ach[k]?'.got':''), {}, h('img.ach-ic', { src: asset('ui/ach/' + k), alt: '' }), h('div', {}, h('b', {}, a.name), h('small', {}, a.desc))))));
}
// —— 存读档 ——
export function openSaves(mode){ const p = panel(mode==='save'?'存档':'读档', { cls:'saves' }); saveList(p.body, mode, p); }
function saveList(body, mode, pp){
  if (mode==='save' && (!S || S.mode==='title')) { body.append(h('div.empty', {}, '尚未开始旅程')); return; }
  if (mode==='save' && inSub()) { body.append(h('div.empty', {}, '支线剧情进行中，无法存档。请在剧情结束后再存。')); return; }
  const slots = [AUTO, ...Array.from({length:SAVE_SLOTS},(_,i)=>i)];
  body.append(h('div.slots', {}, slots.map(i => { const s = slotInfo(i);
    return h('div.slot'+(s?'':'.empty'), { onclick: async ()=>{
      if (mode==='save') { if (i===AUTO) { toast('自动存档栏位由系统使用'); return; } if (s && !(await confirmBox('覆盖这个存档？'))) return; save(i); sfx('ach'); toast('已存档'); body.replaceChildren(); saveList(body, mode, pp); }
      else { if (!s) return; document.querySelectorAll('.panel-wrap').forEach(p=>p.remove()); game.loadSlot(i); }
    } }, h('div.s-no', {}, i===AUTO?'自动':'存档 '+(i+1)),
      s ? h('div.s-info', {}, h('b', {}, s.chapter||''), h('span', {}, `Lv${s.lv} · ${REGIONS[s.region]?.name.split('·')[0]||''} · ${fmtTime(s.playtime||0)}`), h('small', {}, new Date(s.time).toLocaleString('zh-CN'))) : h('div.s-info', {}, '— 空 —'));
  })),
  h('div.row.center', {},
    mode==='save' ? btn('导出存档码', async ()=>{ const c=exportCode(); try { await navigator.clipboard.writeText(c); toast('存档码已复制到剪贴板'); } catch(e){ promptBox('复制下面的存档码', '', c, true); } }, 'sm') : null,
    btn('导入存档码', async ()=>{ const c = await promptBox('粘贴存档码', '', '', true); if (!c) return; try { importCode(c); document.querySelectorAll('.panel-wrap').forEach(p=>p.remove()); game.resume(); toast('导入成功'); } catch(e){ toast('存档码无效'); } }, 'sm')));
}
function tabTitle(body){
  body.append(h('p.confirm-text', {}, '返回标题画面？未保存的进度将会丢失（自动存档会保留最近的章节开头）。'), h('div.row.center', {}, btn('返回标题', ()=>{ document.querySelectorAll('.panel-wrap').forEach(p=>p.remove()); game.title(); }, 'gold')));
}
// —— 设置 ——
export function openSettings(){ const p = panel('设置', { cls:'settings' }); settingsBody(p.body); }
function settingsBody(body){
  const slider = (k, n, min, max, step=0.05, fmt=v=>Math.round(v*100)+'%') => { const val = h('b', {}, fmt(settings[k]));
    const inp = h('input', { type:'range', min, max, step, value:settings[k], oninput:(e)=>{ settings[k]=+e.target.value; val.textContent=fmt(settings[k]); applyVolumes(); saveSettings(); } });
    return h('div.set', {}, h('span', {}, n), inp, val); };
  const toggle = (k, n, desc) => h('div.set', {}, h('span', {}, n), h('label.sw', {}, h('input', { type:'checkbox', checked:settings[k]?true:null, onchange:(e)=>{ settings[k]=e.target.checked; saveSettings(); } }), h('i')), desc?h('small', {}, desc):null);
  const keyInp = h('input.input', { type:'password', placeholder:'在此粘贴你的 MiniMax API Key', value:settings.apiKey||'', autocomplete:'off' });
  const baseInp = h('input.input', { value:settings.aiBase||'https://api.minimax.cn' });
  const status = h('div.tiny', {}, settings.apiKey ? 'Key 已保存在本机（仅存于此设备）' : '未填写 Key：AI 功能将不可用，其余内容完全可玩。');
  body.append(
    h('h3', {}, '声音'), slider('master','主音量',0,1), slider('music','音乐',0,1), slider('sfx','音效',0,1), slider('voice','配音',0,1),
    h('h3', {}, '文字'), slider('textSpeed','文字速度',10,100,5,v=>v>=100?'瞬间':v+'字/秒'), slider('autoDelay','自动间隔',600,4000,100,v=>(v/1000).toFixed(1)+'秒'), toggle('skipAll','快进未读文本'),
    h('h3', {}, '画面与战斗'), slider('fx','粒子特效',0,2,1,v=>['关','简','全'][v]), slider('battleSpeed','战斗速度',1,3,1,v=>'×'+v), toggle('autoBattle','默认自动战斗'),
    h('h3', {}, '灵感（MiniMax AI）'),
    h('p.tiny', {}, '填写你自己的 MiniMax Token Plan API Key 后，可在营火处与同伴 AI 夜谈、求白泽卜筮、进入 AI 生成的梦境异闻、以“画境”绘制场景与自画像，并为对白生成配音。Key 只保存在本机，不会上传到除 MiniMax 官方接口以外的任何地方。'),
    toggle('aiEnabled','启用 AI 功能'),
    h('div.set.col', {}, h('span', {}, 'API Key'), keyInp),
    h('div.set.col', {}, h('span', {}, '接口地址'), baseInp),
    toggle('aiVoice','AI 配音按钮', '对白框显示“配音”按钮（按需生成，消耗额度）'), toggle('autoVoice','自动配音', '每句角色台词自动配音（消耗较多额度）'),
    status,
    h('div.row', {},
      btn('保存 Key', ()=>{ settings.apiKey = keyInp.value.trim(); settings.aiBase = baseInp.value.trim()||'https://api.minimax.cn'; saveSettings(); status.textContent = settings.apiKey?'已保存在本机':'已清除'; toast('已保存'); }, 'sm gold'),
      btn('测试连接', async ()=>{ settings.apiKey = keyInp.value.trim(); saveSettings(); status.textContent='测试中……'; try { const t = await chat('只回复两个字：灯在', [{role:'user',text:'测试'}], 30); status.textContent='连接成功：'+t.slice(0,20); } catch(e){ status.textContent='失败：'+e.message; } }, 'sm'),
      btn('查询额度', async ()=>{ try { const q = await quota(); const m = (q.model_remains||[]).map(x=>`${x.model_name}: 剩余 ${x.current_interval_total_count-x.current_interval_usage_count}/${x.current_interval_total_count}`).join('\n'); status.textContent = m || JSON.stringify(q).slice(0,200); } catch(e){ status.textContent='查询失败：'+e.message; } }, 'sm'),
      btn('清除 Key', ()=>{ settings.apiKey=''; keyInp.value=''; saveSettings(); status.textContent='已清除'; }, 'sm')),
    h('h3', {}, '数据'),
    h('div.row', {}, btn('清除全部数据', async ()=>{ if (!(await confirmBox('将删除所有存档、成就与设置，确定吗？'))) return; localStorage.clear(); location.reload(); }, 'sm danger')),
    h('p.tiny', {}, '烛龙纪·长夜山海 v1.0 · 美术：AI 生成并经后期处理 · 音乐：程序化生成（WebAudio） · 故事：原创，取材自《山海经》《楚辞》等'));
}
// —— 画廊 ——
export async function openGallery(){
  const p = panel('回忆 · 画廊', { cls:'gallery' });
  const ENDN = { a:'长明', b:'长夜', c:'新烛', d:'归墟同眠', e:'狐梦千年', f:'昼夜双瞳' };
  const view = src => { const v = h('div.viewer', { onclick:()=>v.remove() }, h('img', { src })); document.getElementById('app').append(v); };
  const cgs = ['cg_dengjin','cg_jingwei','cg_xingtian','cg_xiwangmu','cg_baize','cg_dijiang','cg_kuafu','cg_ba','cg_baiji','cg_xiangliu','cg_fuli','cg_duijue'];
  const keys = ['key_dream_layers','key_resonance','key_clearcard','key_lamp_radius','key_candle_eye','key_hub_sanctuary'];
  const epis = [
    ['epi_dawn_common','天亮第七日', !!meta.endings.length],
    ['epi_letter_fuli','浮黎的信', meta.endings.length>0],
    ['epi_beihai_thaw','北海解冻', meta.endings.includes('A')||meta.endings.includes('F')||meta.endings.includes('B')],
    ['epi_kids_lamp','孩子们的灯', meta.endings.length>0],
    ['epi_dream_layer','闭目练习', meta.endings.length>0],
  ];
  const playEpi = lb => { p.close(); show(vnScreen()); S.shown = {}; S.cg = null; restoreScene(); runSub(lb, () => { try { game.hub ? game.hub() : location.reload(); } catch(e) { location.reload(); } }); };
  p.body.append(h('h3', {}, `结局 ${meta.endings.length}/6`), h('div.gal', {}, Object.entries(ENDN).map(([k,n]) => meta.endings.includes(k.toUpperCase()) ? h('div.gcell', { onclick:()=>view(asset('cg/end_'+k)) }, h('img', {src:asset('cg/end_'+k)}), h('span', {}, '结局'+k.toUpperCase()+' · '+n)) : h('div.gcell.locked', {}, h('span', {}, '结局'+k.toUpperCase()+' · ？？？')))),
    h('h3', {}, '招牌画'), h('div.gal', {}, ...keys.map(c => h('div.gcell', { onclick:()=>view(asset('cg/'+c)) }, h('img', {src:asset('cg/'+c)}), h('span', {}, c.replace('key_',''))))),
    h('h3', {}, '灯下回想'), h('div.gal', {}, ...Array.from({length:14},(_,i)=>h('div.gcell',{onclick:()=>playEpi('recall_'+i+'_1')}, h('span', {}, '回想·'+i)))),
    h('h3', {}, '章末夜记'), h('div.gal', {}, ...Array.from({length:13},(_,i)=>h('div.gcell',{onclick:()=>playEpi('night_'+i)}, h('span', {}, '夜记·'+i)))),
    h('h3', {}, '营火手记'), h('div.gal', {}, ...[['yangui','晏归'],['baiji','白霁'],['xianwei','衔微'],['qi','戚'],['ali','阿篱'],['kualing','夸铃'],['fuli','浮黎'],['xuanming','玄冥']].map(([id,n]) => h('div.gcell', { onclick:()=>playEpi('journal_'+id) }, h('span', {}, n)))),
    h('h3', {}, '九州长夜志'), h('div.gal', {}, ...['jincheng','qingqiu','donghai','changyang','baize','kunlun','hundun','yugu','chishui','beihai','youdu','guixu'].map(id => h('div.gcell', { onclick:()=>playEpi('lore_'+id) }, h('span', {}, ({jincheng:'烬城',qingqiu:'青丘',donghai:'东海',changyang:'长羊',baize:'白泽',kunlun:'昆仑',hundun:'混沌',yugu:'禺谷',chishui:'赤水',beihai:'北海',youdu:'幽都',guixu:'归墟'})[id])))),
    h('h3', {}, '灯典'), h('div.gal', {}, ...[['lamp_codex_intro','序'],['lamp_core','灯芯'],['lamp_eye','烛瞳'],['lamp_dream','闭目'],['lamp_reso','共鸣'],['lamp_loop','两分钟']].map(([lb,n]) => h('div.gcell', { onclick:()=>playEpi(lb) }, h('span', {}, n)))),
    h('h3', {}, '同伴书简'), h('div.gal', {}, ...[['letter_baiji_01','白霁'],['letter_xianwei_01','衔微'],['letter_qi_01','戚'],['letter_ali_01','阿篱'],['letter_kualing_01','夸铃'],['letter_fuli_01','浮黎'],['letter_xuanming_01','玄冥'],['letter_zhulong_01','烛龙'],['letter_popo_01','阿婆'],['letter_kids_01','孩子们']].map(([lb,n]) => h('div.gcell', { onclick:()=>playEpi(lb) }, h('span', {}, n)))),
    h('h3', {}, '九州夜祭'), h('div.gal', {}, ...[['fest_jincheng','烬城'],['fest_qingqiu','青丘'],['fest_donghai','东海'],['fest_changyang','长羊'],['fest_kunlun','昆仑'],['fest_yugu','禺谷'],['fest_chishui','赤水'],['fest_beihai','北海'],['fest_youdu','幽都'],['fest_guixu','归墟']].map(([lb,n]) => h('div.gcell', { onclick:()=>playEpi(lb) }, h('span', {}, n)))),
    h('h3', {}, '梦境日记'), h('div.gal', {}, ...Array.from({length:15},(_,i)=>h('div.gcell',{onclick:()=>playEpi('dream_diary_'+(i+1))}, h('span', {}, '第'+(i+1)+'夜')))),
    h('h3', {}, '后日谈'), h('div.gal', {}, ...epis.map(([lb,n,ok]) => ok ? h('div.gcell', { onclick:()=>playEpi(lb) }, h('span', {}, n)) : h('div.gcell.locked', {}, h('span', {}, '？？？ · '+n)))),
    h('h3', {}, `剧情 CG ${cgs.filter(c=>meta.cgs.includes(c)).length}/${cgs.length}`), h('div.gal', {}, cgs.map(c => meta.cgs.includes(c) ? h('div.gcell', { onclick:()=>view(asset('cg/'+c)) }, h('img', {src:asset('cg/'+c)})) : h('div.gcell.locked', {}, h('span', {}, '？？？')))));
  const list = (await idbGet('gallery')) || [];
  const ai = h('div.gal');
  for (const g of list.slice().reverse()) { const src = await idbGet('img:'+g.id); if (src) ai.append(h('div.gcell', { onclick:()=>view(src) }, h('img', {src}), h('span', {}, g.title))); }
  p.body.append(h('h3', {}, `画境（AI 画作） ${list.length}`), list.length ? ai : h('p.tiny', {}, '在营火处使用“画境”，你的画作会保存在这里。'));
}
// —— 商店 ——
export function openShop(rid){
  const p = panel('商店 · '+REGIONS[rid].name.split('·')[0], { cls:'shop' });
  let mode='buy';
  const render = () => {
    p.body.replaceChildren();
    const tabs = h('div.bagtabs', {}, h('button.tab.sm'+(mode==='buy'?'.on':''), {onclick:(e)=>{e.stopPropagation(); mode='buy'; render();}}, '购买'), h('button.tab.sm'+(mode==='sell'?'.on':''), {onclick:(e)=>{e.stopPropagation(); mode='sell'; render();}}, '出售'), h('span.gold', {}, '✦ 星砂 '+S.gold));
    const list = mode==='buy' ? SHOPS[rid] : Object.keys(S.inv).filter(k=>ITEMS[k] && ITEMS[k].type!=='key' && ITEMS[k].price>0 && S.inv[k]>0);
    p.body.append(tabs, h('div.ilist', {}, list.length ? list.map(k => { const it=ITEMS[k]; const price = mode==='buy'?it.price:Math.floor(it.price/2);
      return h('div.irow', {}, icon(it.icon,'sm'), h('div.grow', {}, h('b', {}, it.name), h('small', {}, it.desc)), h('span.tiny', {}, '持有 '+(S.inv[k]||0)), h('span.price', {}, '✦'+price),
        btn(mode==='buy'?'买':'卖', ()=>{ if (mode==='buy') { if (S.gold<price) { toast('星砂不足'); return; } addGold(-price); addItem(k,1); } else { addItem(k,-1); addGold(price); } sfx('item'); render(); }, 'sm')); }) : h('div.empty', {}, '没有可出售的物品')));
  };
  render();
}
