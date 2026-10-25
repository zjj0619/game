import { S, settings, healAll, addItem, addGold, affAdd, ach, applyEffects } from '../engine/state.js';
import { CHARS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { REGIONS } from '../data/regions.js';
import { LORE } from '../data/lore.js';
import { h, btn, asset, toast, panel, sleep } from '../engine/ui.js';
import { sfx, playBgm, playVoice } from '../engine/audio.js';
import { aiReady, campfireTalk, fortune, FORTUNE_BUFFS, dream, paint, translatePrompt, tts, idbGet, idbSet } from '../engine/ai.js';
import { game } from '../main.js';
import { openMenu, openSaves, openSettings } from './menu.js';
import { nextBond } from '../data/bonds.js';
import { runSub, vnScreen, restoreScene } from '../engine/vn.js';
import { show } from '../main.js';
import { lampPanel, lampReady, freePoints } from './progress.js';
import { LAMP } from '../data/progress.js';

const needAI = () => { if (aiReady()) return true; toast('请先在“设置 → 灵感（MiniMax AI）”中启用并填写你的 API Key', 'bad'); return false; };
const companions = () => S.members.filter(m=>m!=='yangui' && CHARS[m] && ['baiji','xianwei','qi','ali','kualing','fuli'].includes(m));

export function openCamp(rid){
  playBgm('warm');
  document.querySelectorAll('.panel-wrap.camp').forEach(x=>x.remove());
  const p = panel('营火 · '+REGIONS[rid].nodes.find(n=>n.type==='camp').name, { cls:'camp' });
  const render = () => {
    const ai = aiReady(); const comp = companions();
    const bondAny = comp.some(m=>nextBond(S,m)); const pts = S.members.reduce((a,m)=>a+Math.max(0,freePoints(m)),0);
    const L = LAMP[S.lamp||1], nx = LAMP[(S.lamp||1)+1];
    const row = (glyph, title, sub, fn, cls='') => h('button.cmr'+(cls?'.'+cls:''), { onclick:()=>{ sfx('click'); fn(); } }, h('span.cmr-g', {}, glyph), h('span.cmr-t', {}, h('b', {}, title), h('small', {}, sub)));
    const seats = comp.slice(0,6).map((m,i) => { const lb = nextBond(S,m);
      return h('div.seat'+(lb?'.bond':''), { style:{ left:(14+i*(72/Math.max(1,comp.length-1||1)))+'%' }, onclick:()=>{ sfx('click'); if (lb) { p.close(); playBond(lb, rid); } else if (ai) talk(m); else toast(CHARS[m].name+'望着火光出神。（启用灵感 AI 后可以自由交谈）'); } },
        h('div.seat-face', { style:{backgroundImage:`url(${asset('por/'+m)})`} }), h('div.seat-n', {}, CHARS[m].name), h('div.seat-h', {}, '♥'+S.aff[m]), lb ? h('div.seat-b', {}, '心事') : ai ? h('div.seat-b.ai', {}, '谈') : null); });
    p.body.replaceChildren(h('div.camp2', {},
      h('div.camp-stage', { style:{backgroundImage:`url(${asset('bg/campfire')})`} }, h('div.camp-glow'), h('div.camp-fire'), h('div.seats', {}, seats),
        h('div.camp-cap', {}, comp.length ? (bondAny ? '有同伴想和你说说心事——点一点亮着「心事」的人。' : ai ? '点一位同伴，和她/他自由交谈。' : '火光噼啪作响，大家都累了。') : '火边只有你一个人。')),
      h('div.camp-side', {},
        row('☾', '休息', '恢复全队气血与灵力', ()=>{ healAll(); sfx('heal'); toast('全队气血与灵力已完全恢复', 'good'); }),
        row('🏮', '灯阶 · '+L.name, nx ? (lampReady() ? '可以点亮：'+nx.name : '下一阶：'+nx.name) : '灯火长明', ()=>lampPanel(render), lampReady()?'hot':''),
        row('★', '星命', pts>0 ? `有 ${pts} 点星命未分配` : '为同伴点亮天赋', ()=>openMenu('party'), pts>0?'hot':''),
        row('⚒', '炼制 · 精炼', '丹药、装备与精炼词条', ()=>openMenu('craft')),
        row('❦', '羁绊夜话', bondAny ? '有新的心事' : '暂无新的心事', ()=>{ p.close(); openBonds(rid); }, bondAny?'hot':''),
        row('✎', '存档', '记录此刻', ()=>openSaves('save')),
        h('div.camp-aih', {}, '灵感 · AI', h('small', {}, ai ? ' 已连接' : ' 未启用')),
        h('div.camp-ai2', {},
          aiTile('梦', '梦境异闻', ()=>needAI() && doDream(rid)), aiTile('签', '白泽卜筮', ()=>needAI() && doFortune()),
          aiTile('谈', '营火夜谈', ()=>needAI() && pickCompanion()), aiTile('画', '画境', ()=>needAI() && doPaint(rid))),
        !ai ? btn('启用灵感（填写 MiniMax Key）', ()=>openSettings(), 'sm') : null)));
  };
  render();
}
const aiTile = (g, n, fn) => h('button.ait', { onclick:()=>{ sfx('click'); fn(); } }, h('span', {}, g), h('b', {}, n));
// —— 羁绊夜话（固定剧本，无需 AI）——
function openBonds(rid){
  const comp = companions();
  const p = panel('羁绊夜话', { cls:'small' });
  const avail = comp.filter(m=>nextBond(S,m));
  if (!avail.length) p.body.append(h('p', {}, '今夜大家都很安静。继续推进旅程，会有新的心事想对你说。'));
  p.body.append(h('div.pickc', {}, comp.map(m => { const lb = nextBond(S,m); return h('div.pc'+(lb?'':'.dim'), { onclick:()=>{ if(!lb){ toast(CHARS[m].name+'暂时没有新的话想说。'); return; } p.close(); playBond(lb, rid); } }, h('div.a-face', {style:{backgroundImage:`url(${asset('por/'+m)})`}}), h('b', {}, CHARS[m].name), h('small', {}, lb?'有话想说 ●':'好感 '+S.aff[m])); })));
  p.onClose = ()=>{};
}
function playBond(label, rid){
  show(vnScreen()); S.shown = {}; S.cg = null; restoreScene();
  runSub(label, () => { ach('bond'); if (Object.keys(S.flags).filter(f=>/^bond_[a-z]+_\d$/.test(f)).length>=22) ach('bond_all'); game.region(S.region); });
}
const aiCard = (t, d, on) => h('div.aicard', { onclick:()=>{ sfx('click'); on(); } }, h('b', {}, t), h('small', {}, d));

// —— 营火夜谈 ——
function pickCompanion(){
  const comp = companions();
  if (!comp.length) { toast('火边只有你一个人。'); return; }
  const p = panel('和谁说说话？', { cls:'small' });
  p.body.append(h('div.pickc', {}, comp.map(m => h('div.pc', { onclick:()=>{ p.close(); talk(m); } }, h('div.a-face', {style:{backgroundImage:`url(${asset('por/'+m)})`}}), h('b', {}, CHARS[m].name), h('small', {}, '好感 '+S.aff[m])))));
}
const OPENERS = { baiji:'（白霁把尾巴卷到膝上，侧头看你）呆子，睡不着？', xianwei:'（衔微往火里添了一根枯枝）……你也听见海了？', qi:'（戚胸前的双目映着火光）某在守夜。坐。', ali:'（阿篱的赤豹伏在一旁，她轻轻哼着歌）你来啦……我刚才在等谁来着？', kualing:'（夸铃灌了一大口水）晏归哥！我还不困，咱们聊聊！', fuli:'（浮黎看着火，很久没有开口）……你长高了。' };
const QUICK = ['你还好吗？','聊聊你的过去吧','明天会怎样？','谢谢你一直在','（安静地陪着）'];
function talk(id){
  S.chats = S.chats || {}; const hist = S.chats[id] = S.chats[id] || [];
  S.aiAff = S.aiAff || {}; const capKey = id+':'+S.chapterN;
  ach('ai_chat');
  const p = panel('营火夜谈 · '+CHARS[id].name, { cls:'chat' });
  const log = h('div.chatlog');
  const line = (role, text) => { const el = h('div.cl.'+role, {}, role==='ai'?h('div.a-face.sm', {style:{backgroundImage:`url(${asset('por/'+id)})`}}):null, h('div.bubble', {}, text)); log.append(el); log.scrollTop = log.scrollHeight; return el; };
  line('ai', OPENERS[id] || '……');
  for (const m of hist.slice(-8)) line(m.role==='user'?'me':'ai', m.text);
  const inp = h('input.input', { placeholder:'说点什么……', maxlength:120, onkeydown:(e)=>{ if (e.key==='Enter') send(); } });
  let busy = false;
  async function send(txt){
    const t = (txt ?? inp.value).trim(); if (!t || busy) return; busy = true; inp.value='';
    line('me', t); const wait = line('ai', '……'); wait.classList.add('typing');
    try {
      const r = await campfireTalk(id, hist, t);
      wait.remove(); const el = line('ai', r.text);
      hist.push({role:'user',text:t},{role:'assistant',text:r.text}); while (hist.length>24) hist.shift();
      const used = S.aiAff[capKey]||0;
      if (r.delta>0 && used<6) { const d=Math.min(r.delta, 6-used); S.aiAff[capKey]=used+d; affAdd(id,d); toast(`${CHARS[id].name} 好感 +${d}`, 'good'); sfx('heal'); }
      else if (r.delta<0) { affAdd(id, r.delta); toast(`${CHARS[id].name} 好感 ${r.delta}`, 'bad'); }
      if (settings.aiVoice) el.append(btn('🔊', async (e)=>{ try { e.target.textContent='…'; playVoice(await tts(r.text.replace(/（[^）]*）|\([^)]*\)/g,''), id)); e.target.textContent='🔊'; } catch(err){ toast(err.message,'bad'); } }, 'sm voicebtn'));
    } catch(e) { wait.remove(); line('sys', '（火光摇曳，话没能说出口：'+e.message+'）'); }
    busy = false;
  }
  p.body.append(h('div.chat2', {}, h('div.chat-por', { style:{backgroundImage:`url(${asset('por/'+id)})`} }, h('div.chat-pn', {}, CHARS[id].name, h('small', {}, ' ♥'+S.aff[id]))),
    h('div.chat-col', {}, log, h('div.quick', {}, QUICK.map(q=>btn(q, ()=>send(q), 'sm'))), h('div.chatin', {}, inp, btn('说', ()=>send(), 'gold')),
    h('p.tiny', {}, `本章夜谈可得好感：${6-(S.aiAff[capKey]||0)}`))));
}

// —— 白泽卜筮 ——
async function doFortune(){
  const today = new Date().toDateString();
  const p = panel('白泽卜筮', { cls:'fortune' });
  const show = f => { p.body.replaceChildren(h('div.lot', {}, h('div.lot-sign', {}, f.sign||'中'), h('div.lot-title', {}, f.title||''), h('div.lot-poem', {}, (f.poem||'').split(/\n|，|。/).filter(Boolean).map(l=>h('div', {}, l))), h('p', {}, '白泽曰：'+(f.read||'')), h('div.lot-buff', {}, `今日祝福【${FORTUNE_BUFFS[f.buff].name}】${FORTUNE_BUFFS[f.buff].desc}`))); };
  if (S.fortune && S.fortune.day===today) { show(S.fortune); p.body.append(h('p.tiny.center', {}, '今日已求过签。明日再来。')); return; }
  p.body.append(h('div.loading-lot', {}, h('div.spin'), '白泽正在翻阅万物之图……'));
  try { const f = await fortune(); S.fortune = f; ach('ai_fortune'); sfx('bell'); show(f); }
  catch(e){ p.body.replaceChildren(h('p', {}, '签筒没有回应：'+e.message)); }
}

// —— 梦境异闻 ——
async function doDream(rid){
  S.dreamCount = S.dreamCount || {}; const k = 'c'+S.chapterN;
  if ((S.dreamCount[k]||0) >= 3) { toast('今夜已经做了太多梦。推进主线后再来吧。'); return; }
  const p = panel('梦境异闻', { cls:'dream' });
  p.body.append(h('div.loading-lot', {}, h('div.spin'), '火光渐暗，你沉入梦中……'));
  let d; try { d = await dream(); } catch(e){ p.body.replaceChildren(h('p', {}, '梦碎了：'+e.message)); return; }
  S.dreamCount[k] = (S.dreamCount[k]||0)+1; ach('ai_dream');
  p.body.replaceChildren(h('div.dream-scene', {}, h('h2', {}, d.title), h('p', {}, d.scene), h('p.dline', {}, h('b', {}, (d.speaker||'梦中人')+'：'), d.line||'')),
    h('div.dchoices', {}, d.choices.map(c => h('button.choice', { onclick: async ()=>{ sfx('click'); await resolveDream(p, d, c, rid); } }, c.text))));
}
async function resolveDream(p, d, c, rid){
  const L = Math.max(...S.members.map(m=>S.party[m].lv));
  const res = []; let fight = false;
  const mats = Object.keys(ITEMS).filter(k=>ITEMS[k].type==='mat');
  const pills = ['u_redpill','u_gourd','u_antidote','u_lingzhi','u_goldpill'].filter(k=>ITEMS[k]);
  switch (c.outcome) {
    case 'reward_item': { const a = mats[Math.floor(Math.random()*mats.length)], b = pills[Math.floor(Math.random()*pills.length)]; addItem(a,2); addItem(b,1); res.push(`获得 ${ITEMS[a].name}×2、${ITEMS[b].name}×1`); break; }
    case 'reward_gold': { const g = 60+L*25; addGold(g); res.push(`获得星砂 ${g}`); break; }
    case 'affection': if (c.companion) { affAdd(c.companion, 3); res.push(`${CHARS[c.companion].name} 好感 +3`); } else { addGold(50); res.push('获得星砂 50'); } break;
    case 'hope_up': S.hope=Math.min(100,S.hope+3); res.push('灯心 +3'); break;
    case 'hope_down': S.hope=Math.max(0,S.hope-2); addGold(120+L*20); res.push(`灯心 -2，却在梦醒时握着星砂 ${120+L*20}`); break;
    case 'codex': { const locked = Object.keys(LORE).filter(k=>!S.codex[k]); if (locked.length) { S.codex[locked[0]] = true; res.push('白泽图新增：'+LORE[locked[0]].name); } else { addGold(100); res.push('获得星砂 100'); } break; }
    case 'battle': fight = true; res.push('梦中的影子向你扑来！'); break;
  }
  S.dreams.push({ title:d.title, choice:c.text, outcome:c.outcome, ch:S.chapterN });
  p.body.replaceChildren(h('div.dream-scene', {}, h('h2', {}, d.title), h('p', {}, c.result), h('p.lot-buff', {}, res.join('；'))), h('div.row.center', {}, btn(fight?'迎战':'醒来', async ()=>{ p.close();
    if (fight) { const nodes = REGIONS[rid].nodes.filter(n=>n.type==='battle'); const enc = nodes[0].enc[Math.floor(Math.random()*nodes[0].enc.length)]; const r = await game.battle(enc, { bg:'dream' }); if (r.win) { addItem('m_starmarrow',2); toast('梦醒时，掌心多了两枚星髓晶', 'good'); } if (r.load) { openMenu('load'); return; } game.region(rid); }
  }, 'gold')));
}

// —— 画境 ——
async function doPaint(rid){
  const p = panel('画境', { cls:'paint' });
  const presets = [
    ['此地风景', `${REGIONS[rid].name}的风景：${REGIONS[rid].desc}`],
    ['营火合影', `夜晚的营火边，${S.members.map(m=>CHARS[m].name+'（'+CHARS[m].title+'）').join('、')}围坐在一起，星空下的温暖时刻`],
    ['守灯人自画像', '十九岁的少年守灯人晏归，左眼燃着金色的烛瞳，手提灯刃，站在长夜里的灯塔下'],
  ];
  const ta = h('textarea.input', { rows:3, maxlength:200, placeholder:'用中文描述你想画的画面，例如：月下的九尾狐在桃花林里回头' });
  const out = h('div.paint-out');
  const go = async (title, zh) => {
    out.replaceChildren(h('div.loading-lot', {}, h('div.spin'), '研墨、铺纸……（约 10-40 秒）'));
    try {
      let en = zh; try { en = await translatePrompt(zh); } catch(e){}
      const url = await paint(en, '16:9');
      let data = url; if (!url.startsWith('data:')) { const b = await (await fetch(url)).blob(); data = await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(b); }); }
      const id = Date.now().toString(36); const list = (await idbGet('gallery'))||[]; list.push({ id, title, zh, time:Date.now() });
      await idbSet('img:'+id, data); await idbSet('gallery', list.slice(-60)); ach('ai_paint'); sfx('ach');
      out.replaceChildren(h('img.painted', { src:data }), h('div.tiny.center', {}, '已收入“回忆 · 画廊”'));
    } catch(e) { out.replaceChildren(h('p', {}, '画作没能完成：'+e.message)); }
  };
  p.body.append(h('div.row', {}, presets.map(([t,z])=>btn(t, ()=>go(t,z), 'sm'))), ta, h('div.row', {}, btn('落笔', ()=>{ const z=ta.value.trim(); if (!z) { toast('先描述画面'); return; } go(z.slice(0,12), z); }, 'gold')), out);
}
