/**
 * 主线（VN）与闯关（动作）共用的「定局账本」：同一个剧情抉择只做一次。
 * - 在任一模式中做出抉择 → 写入 S.canon[key]
 * - 另一模式再遇到同一抉择时，只呈现与定局一致的选项（标注「已定」），并只补上旗帜/物品类效果，
 *   不重复叠加好感 / 灯心 / 变量，避免数值翻倍或剧情互相矛盾（例如闯关里放了魃、主线里又封印她）。
 * 纯函数模块：不依赖 DOM，测试与 validate 模拟器直接复用。
 */
export const CANON = {
  qq_trial:   { region: 'qingqiu',  ch: 1,  name: '青丘问罪', vn: { c1_expose: 'expose', c1_protect: 'protect', c1_save: 'save' } },
  xw_stone:   { region: 'donghai',  ch: 2,  name: '衔微之石', vn: { br_ch4_fill: 'fill', br_ch4_smash: 'nofill', br_ch4_take: 'nofill' } },
  baize_page: { region: 'kunlun',   ch: 4,  name: '白泽之页', vn: { c4_read: 'read', c4_noread: 'noread' } },
  dj_holes:   { region: 'hundun',   ch: 6,  name: '混沌七窍', vn: { c6_no: 'no', c6_yes: 'yes', c6_self: 'self' } },
  ba_fate:    { region: 'yugu',     ch: 8,  name: '魃的去留', vn: { c8_free: 'free', c8_seal: 'seal' } },
  xl_fate:    { region: 'beihai',   ch: 9,  name: '相柳生死', vn: { br_ch9_spare: 'spare', br_ch9_kill: 'kill', br_ch9_tear: 'spare' } },
  fuli_fate:  { region: 'guixu',    ch: 10, name: '浮黎之罪', vn: { c10_give: 'forgive', c10_forgive: 'forgive', c10_kill: 'kill' } },
};
/** VN 跳转标签 → 定局键 */
export const VN_LABEL = {};
for (const [k, d] of Object.entries(CANON)) for (const lb of Object.keys(d.vn)) VN_LABEL[lb] = k;

/** 区域 ↔ 主线章节（闯关区域覆盖的主线章节区间） */
export const REGION_CH = {
  jincheng: [0, 0], qingqiu: [1, 1], donghai: [2, 2], changyang: [3, 3], kunlun: [4, 5],
  hundun: [6, 6], yugu: [7, 8], beihai: [9, 9], guixu: [10, 11],
};

/** 旧存档：由已有旗帜推断定局 */
const INFER = {
  ba_fate: f => f.ba_freed ? 'free' : f.ba_sealed ? 'seal' : null,
  fuli_fate: f => f.fuli_killed ? 'kill' : f.fuli_forgiven ? 'forgive' : null,
  xl_fate: f => f.xiangliu_slain ? 'kill' : f.xiangliu_spared ? 'spare' : null,
  dj_holes: f => f.dj_open ? 'yes' : f.dj_whole ? 'no' : null,
  baize_page: f => f.read_self ? 'read' : null,
  xw_stone: f => f.xw_sea_oath ? 'fill' : f.xw_pragmatic ? 'nofill' : null,
};
export function canonOf(S, key){
  const v = S?.canon?.[key]?.v; if (v) return v;
  const inf = INFER[key]; return inf ? inf(S?.flags || {}) : null;
}
export function setCanon(S, key, v, from){
  if (!S || !key || !v) return;
  S.canon ||= {}; if (S.canon[key]?.v) return; S.canon[key] = { v, from, at: Date.now() };
}
/** 只保留「事实」效果（旗帜/物品/图鉴/同伴变化），去掉会重复叠加的数值 */
export const factOnly = list => (list || []).filter(e => !/^(aff:|hope|var:|gold|exp)/.test(e));

/** VN 抉择：根据定局过滤可选项；返回 { opts, locked, key } */
export function vnFilter(S, opts){
  const keys = [...new Set(opts.map(o => VN_LABEL[o.to]).filter(Boolean))];
  if (!keys.length) return { opts, locked: false };
  const key = keys[0]; const v = canonOf(S, key);
  if (!v) return { opts, locked: false, key };
  const map = CANON[key].vn;
  const ok = opts.filter(o => !map[o.to] || map[o.to] === v);
  // 定局在主线里没有对应项（例如闯关里的「先走完这一程」）→ 不锁
  if (!ok.some(o => map[o.to])) return { opts, locked: false, key };
  return { opts: ok, locked: true, key, v };
}
/** VN 选中某项后：写账本；若该键早已由闯关决定，则只补事实效果 */
export function vnApply(S, o){
  const key = VN_LABEL[o.to]; if (!key) return o.eff;
  const v = CANON[key].vn[o.to]; const prior = canonOf(S, key);
  if (prior && S.canon?.[key]?.from === 'act' && prior === v) return factOnly(o.eff);
  setCanon(S, key, v, 'vn'); return o.eff;
}

/** 闯关抉择：choice = { key, opts:[{t, fx, canon, vnOnly}] } → 呈现用的选项（附原下标） */
export function actOptions(S, choice){
  const all = (choice?.opts || []).map((o, i) => ({ ...o, i }));
  const key = choice?.key; const v = key ? canonOf(S, key) : null;
  if (!v) return { opts: all.filter(o => !o.vnOnly), locked: false };
  const ok = all.filter(o => o.canon === v);
  if (!ok.length) return { opts: all.filter(o => !o.vnOnly), locked: false };
  return { opts: ok.map(o => ({ ...o, t: o.t + '（主线已定）' })), locked: true, v };
}
export function actApply(S, choice, o){
  const key = choice?.key; if (!key || !o?.canon) return o?.fx || [];
  const prior = canonOf(S, key);
  if (prior && prior === o.canon) return factOnly(o.fx);
  setCanon(S, key, o.canon, 'act'); return o.fx || [];
}

/** 主线进度（读到的最远章节） */
export const vnProgress = S => Math.max(S?.chapterN || 0, S?.vnMax || 0);
/** 闯关进度：已通关的区域（以终首领关为准） */
export function actRegions(S, order){
  return order.filter(r => S?.act?.cleared?.[r + '_10']);
}
