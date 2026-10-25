// v1.1 战斗规则数据：弱点、相生反应、灯焰消耗
import { EL } from './characters.js';
export const GEN = { wood:'fire', fire:'earth', earth:'metal', metal:'water', water:'wood' }; // 相生：前者印记 → 后者触发
export const REACT = {
  'wood>fire':  { name:'燎原', desc:'伤害 +60%，灼烧扩散至全体敌人', color:'#ff7a3a' },
  'fire>earth': { name:'熔岩', desc:'韧性削减翻倍并破甲', color:'#ffb347' },
  'earth>metal':{ name:'淬锋', desc:'必定暴击，回复 1 点灯焰', color:'#f3e6b0' },
  'metal>water':{ name:'寒潮', desc:'冰封目标（首领改为行动延后）', color:'#8fd4ff' },
  'water>wood': { name:'滋生', desc:'全队回复 8% 气血', color:'#8ff0a4' },
  'light>dark': { name:'晦明', desc:'伤害 +50%，行动延后', color:'#fff1b8' },
  'dark>light': { name:'晦明', desc:'伤害 +50%，行动延后', color:'#d9b8ff' },
};
const BEATEN_BY = { wood:'metal', earth:'wood', water:'earth', fire:'water', metal:'fire' };
const ELS = ['metal','wood','water','fire','earth'];
function hash(s){ let x=7; for (const c of s) x=(x*31+c.charCodeAt(0))>>>0; return x; }
// 敌人弱点：克制其属性的元素 + 一个由 id 决定的额外弱点
export function weaknesses(id, el){
  const w = [];
  if (BEATEN_BY[el]) w.push(BEATEN_BY[el]);
  if (el==='light') w.push('dark'); if (el==='dark') w.push('light');
  const h = hash(id); let extra = ELS[h%5]; if (w.includes(extra) || extra===el) extra = ELS[(h>>3)%5];
  if (!w.includes(extra) && extra!==el) w.push(extra);
  if (w.length<2 && el==='none') w.push(ELS[(h>>5)%5]===w[0]?'light':ELS[(h>>5)%5]);
  return w.slice(0, 3);
}
// 灯焰消耗：普攻 +1；战技按灵力消耗换算为 1 或 2 点
export function spCost(s){ if (!s || s.ult || !s.mp) return 0; return s.mp>=16 ? 2 : 1; }
export const SP_MAX = 5;
export const elName = e => EL[e]||'';
