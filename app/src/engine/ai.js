// 运行时 AI（MiniMax Token Plan）。Key 由玩家在“设置”中填写，仅保存在本机 localStorage，永不打包进 APK。
import { settings, S } from './state.js';
import { CHARS } from '../data/characters.js';

export function aiReady(){ return settings.aiEnabled && !!settings.apiKey; }
const base = () => (settings.aiBase || 'https://api.minimax.cn').replace(/\/+$/,'');

async function post(path, body, timeout=90000){
  if (!settings.apiKey) throw new Error('未填写 MiniMax API Key（设置 → 灵感）');
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), timeout);
  try {
    const res = await fetch(base()+path, { method:'POST', signal:ctrl.signal, headers:{
      'Content-Type':'application/json', 'Authorization':'Bearer '+settings.apiKey, 'x-api-key':settings.apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify(body) });
    const raw = await res.text(); let j=null; try { j=JSON.parse(raw); } catch(e){}
    if (!res.ok) throw new Error(`HTTP ${res.status}：${j?.error?.message || j?.base_resp?.status_msg || raw.slice(0,120)}`);
    if (j?.base_resp && j.base_resp.status_code!==0) throw new Error(`MiniMax ${j.base_resp.status_code}：${j.base_resp.status_msg}`);
    return j;
  } catch(e) { if (e.name==='AbortError') throw new Error('请求超时'); throw e; }
  finally { clearTimeout(t); }
}

export function extractJson(text){
  let s=String(text||'').replace(/<think>[\s\S]*?<\/think>/g,'').trim();
  const f=s.match(/```(?:json)?\s*([\s\S]*?)```/i); if (f) s=f[1].trim();
  const a=s.indexOf('{'), b=s.lastIndexOf('}'); if (a>=0&&b>a) s=s.slice(a,b+1);
  try { return JSON.parse(s); } catch(e) { return JSON.parse(s.replace(/,\s*([}\]])/g,'$1')); }
}
export async function chat(system, messages, maxTokens=700){
  const j = await post('/anthropic/v1/messages', { model:'MiniMax-M3', max_tokens:maxTokens, system, messages:messages.map(m=>({role:m.role, content:[{type:'text',text:m.text}]})) });
  return (j.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').replace(/<think>[\s\S]*?<\/think>/g,'').trim();
}

// —— 世界状态摘要（注入提示词）——
export function worldBrief(){
  const flags = Object.keys(S.flags).filter(f=>!f.startsWith('reg_')&&!f.startsWith('n_')).slice(-30).join('、');
  const party = S.members.map(m=>`${CHARS[m].name}(Lv${S.party[m].lv}${m!=='yangui'?'，好感'+S.aff[m]:''})`).join('、');
  return `当前进度：${S.chapter}；所在地区：${S.region}；队伍：${party}；灯心：${S.hope}/100；已失去的同伴：${S.lost.map(x=>CHARS[x].name).join('、')||'无'}；关键抉择旗标：${flags||'无'}。`;
}
const WORLD = `世界观：《烛龙纪·长夜山海》。烛龙闭目三百年，九州沉入长夜，人族靠燃烧坠星凝成的“星髓”点灯。主角晏归是烬城守灯人，左眼嵌着烛龙之眼碎片“烛瞳”。北方夜神玄冥让烛龙沉睡，认为长夜之梦是慈悲。师父浮黎背叛出走。风格：山海经、古典、含蓄、诗意，简体中文。`;

// —— 1. 营火夜谈 ——
export const PERSONA = {
  baiji:'白霁：青丘九尾狐公主，偷了狐火只想看一次日出。爱笑、嘴硬、俏皮，偶尔撒娇，内心极怕孤独。称晏归为“呆子”或“小守灯”。',
  xianwei:'衔微：精卫转世的渔家少女，执拗、寡言、坚韧，说话短促，常提到海和石头。称晏归为“晏归”。',
  qi:'戚：刑天残魂，无头的战士，以乳为目以脐为口，说话如擂鼓，豪迈直率，常用“某”自称，偶尔流露对战争的厌倦。',
  ali:'阿篱：山鬼，乘赤豹，温柔、健忘、带着楚辞般的语气，总在等一个不会来的人，喜欢草木和歌。',
  kualing:'夸铃：夸父后裔，少年弓手，嗓门大，热血直爽，总是口渴，崇拜太阳，偶尔说出很朴素的道理。',
  fuli:'浮黎：晏归的师父，守灯人之长，沉稳克制，说话简短而含义深远，满怀愧疚，对晏归极其关爱但不善表达。',
};
export async function campfireTalk(id, history, userText){
  const sys = `${WORLD}\n你现在扮演 ${PERSONA[id]}\n${worldBrief()}\n你对晏归的好感是 ${S.aff[id]}/100（越高越亲近）。\n规则：始终保持角色，不要跳出设定，不要提及AI或模型；回复 1-4 句中文口语，可带动作描写（用括号）。在回复最后一行单独输出形如 [好感+1] 或 [好感+0] 或 [好感-1] 的标记，表示这次对话让你对晏归的好感变化（范围 -2 到 +2，真诚关心时加，冒犯时减）。`;
  const msgs = history.concat([{role:'user', text:userText}]).slice(-12);
  const out = await chat(sys, msgs, 500);
  const m = out.match(/\[好感([+-]\d)\]/); const delta = m ? Math.max(-2,Math.min(2,+m[1])) : 0;
  return { text: out.replace(/\[好感[+-]?\d\]/g,'').trim(), delta };
}

// —— 2. 白泽卜筮（结构化，从预设增益池中选择）——
export const FORTUNE_BUFFS = {
  exp:{name:'文昌',desc:'今日战斗经验 +30%'}, gold:{name:'天禄',desc:'今日星砂 +30%'}, gauge:{name:'灯明',desc:'战斗开始时灯火 +30'},
  crit:{name:'破军',desc:'今日暴击率 +10%'}, heal:{name:'天医',desc:'战斗胜利后全队恢复 20% 气血'}, drop:{name:'禄存',desc:'材料掉落率 +30%'},
};
export async function fortune(){
  const sys = `${WORLD}\n你是神兽白泽，通晓万物之情。为旅人求一支签。只输出 JSON：{"sign":"上上/上/中/下 之一","title":"四字签名","poem":"四句七言签诗，用换行分隔","read":"40字以内白泽口吻解读，结合旅人处境","buff":"exp|gold|gauge|crit|heal|drop 之一"}`;
  const out = await chat(sys, [{role:'user', text:`旅人处境：${worldBrief()} 请赐签。`}], 600);
  const j = extractJson(out);
  if (!FORTUNE_BUFFS[j.buff]) j.buff = 'exp';
  j.day = new Date().toDateString();
  return j;
}

// —— 3. 梦境异闻（AI 生成支线奇遇，结果映射到规则池）——
export const DREAM_OUTCOMES = ['reward_item','reward_gold','battle','affection','hope_up','hope_down','codex'];
export async function dream(){
  const comp = S.members.filter(m=>m!=='yangui');
  const sys = `${WORLD}\n你是梦境的编织者，要为晏归在营火边写一段“梦境异闻”——一段短小的山海经风格奇遇，必须与当前地区、同伴和过去的抉择相呼应。只输出 JSON：
{"title":"不超过8字的标题","scene":"120-200字的梦境叙述，第二人称","speaker":"梦中出现的异兽或人物名","line":"他说的一句话","choices":[{"text":"选项文字(12字内)","result":"该选项的结果叙述(40-80字)","outcome":"reward_item|reward_gold|battle|affection|hope_up|hope_down|codex","companion":"若outcome为affection，填同伴id：${comp.join('/')||'无'}"}]}
choices 恰好 3 个，outcome 尽量不同，其中最多一个 battle。`;
  const out = await chat(sys, [{role:'user', text:`${worldBrief()} 已有梦境：${S.dreams.slice(-5).map(d=>d.title).join('、')||'无'}。请编织一个新的梦。`}], 1200);
  const j = extractJson(out);
  if (!Array.isArray(j.choices) || j.choices.length<2) throw new Error('梦境格式不完整');
  j.choices = j.choices.slice(0,3).map(c=>({ text:String(c.text||'……').slice(0,20), result:String(c.result||''), outcome: DREAM_OUTCOMES.includes(c.outcome)?c.outcome:'reward_gold', companion: comp.includes(c.companion)?c.companion:comp[0] }));
  return j;
}

// —— 4. 画境（image-01）——
export const ART_STYLE = 'Chinese ink-wash painting merged with deep indigo starry cosmos, fine gold line work, gold leaf highlights, mysterious and gorgeous, Shan Hai Jing mythology, no text';
export async function paint(prompt, aspect='16:9'){
  const j = await post('/v1/image_generation', { model:'image-01', prompt:(prompt+'. Style: '+ART_STYLE).slice(0,1400), aspect_ratio:aspect, response_format:'base64', n:1, prompt_optimizer:true }, 120000);
  const b64 = j?.data?.image_base64?.[0];
  if (b64) return 'data:image/jpeg;base64,'+b64;
  if (j?.data?.image_urls?.[0]) return j.data.image_urls[0];
  throw new Error('画作未通过审核或生成失败，请换个描述');
}
export async function translatePrompt(zh){
  const out = await chat('把用户的中文画面描述改写成一段简洁生动的英文绘画提示词（不超过60词），只输出提示词本身。', [{role:'user',text:zh}], 300);
  return out.replace(/^["']|["']$/g,'').trim();
}

// —— 5. AI 配音（T2A，带缓存）——
const VOICE_OK = new Set(['male-qn-qingse','male-qn-jingying','male-qn-badao','male-qn-daxuesheng','female-shaonv','female-yujie','female-chengshu','female-tianmei','presenter_male','presenter_female','audiobook_male_1','audiobook_female_1']);
export async function tts(text, charId){
  const voice = VOICE_OK.has(CHARS[charId]?.voice) ? CHARS[charId].voice : 'audiobook_male_1';
  const key = 'v:'+voice+':'+hash(text);
  const hit = await idbGet(key); if (hit) return URL.createObjectURL(hit);
  const j = await post('/v1/t2a_v2', { model:'speech-2.8-hd', text:text.slice(0,500), stream:false,
    voice_setting:{voice_id:voice, speed:1, vol:1, pitch:0}, audio_setting:{sample_rate:32000,bitrate:128000,format:'mp3',channel:1}, language_boost:'Chinese', output_format:'hex' }, 60000);
  const hex = j?.data?.audio; if (!hex) throw new Error('配音失败');
  const bytes = new Uint8Array(hex.length/2); for (let i=0;i<bytes.length;i++) bytes[i]=parseInt(hex.substr(i*2,2),16);
  const blob = new Blob([bytes],{type:'audio/mpeg'}); idbSet(key, blob);
  return URL.createObjectURL(blob);
}
export async function quota(){
  const r = await fetch(base()+'/v1/api/openplatform/coding_plan/remains', { headers:{ 'Authorization':'Bearer '+settings.apiKey } });
  return r.json();
}
function hash(s){ let h=2166136261; for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(36); }

// —— IndexedDB 小仓库（画廊、配音缓存）——
let dbp=null;
function db(){ if (!dbp) dbp=new Promise((res,rej)=>{ const r=indexedDB.open('zlj',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); return dbp; }
export async function idbGet(k){ try { const d=await db(); return await new Promise(res=>{ const q=d.transaction('kv').objectStore('kv').get(k); q.onsuccess=()=>res(q.result); q.onerror=()=>res(null); }); } catch(e){ return null; } }
export async function idbSet(k,v){ try { const d=await db(); d.transaction('kv','readwrite').objectStore('kv').put(v,k); } catch(e){} }
export async function idbDel(k){ try { const d=await db(); d.transaction('kv','readwrite').objectStore('kv').delete(k); } catch(e){} }
