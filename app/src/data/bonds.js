// 羁绊事件：营火处的固定剧本对话（不依赖 AI）。每个同伴按章节逐步解锁。
export const BONDS = {
  baiji:   ['ch1_done','ch3_done','ch6_done','ch9_done'],
  xianwei: ['ch2_done','ch4_done','ch7_done','ch10_done'],
  qi:      ['ch3_done','ch5_done','ch8_done','ch10_done'],
  ali:     ['ch6_done','ch7_done','ch9_done','ch11_done'],
  kualing: ['ch7_done','ch8_done','ch10_done','ch11_done'],
  fuli:    ['ch10_done','ch11_done'],
};
/** 长夜残卷：非同伴座位也能触发的夜话（相柳残响 / 玄冥 / 烛龙 / 阿婆） */
export const EXTRA_BONDS = [
  { id: 'xiangliu', label: 'bond_xiangliu_1', need: 'ch9_done', name: '相柳残响·其一', por: 'xiangliu' },
  { id: 'xiangliu', label: 'bond_xiangliu_2', need: 'bond_xiangliu_1', name: '相柳残响·其二', por: 'xiangliu' },
  { id: 'xuanming', label: 'bond_xuanming_1', need: 'ch10_done', name: '玄冥·其三百年', por: 'xuanming' },
  { id: 'xuanming', label: 'bond_xuanming_2', need: 'bond_xuanming_1', name: '玄冥·还可以改', por: 'xuanming' },
  { id: 'zhulong',  label: 'bond_zhulong_1',  need: 'ch11_done', name: '烛龙·梦见白天', por: 'zhulong' },
  { id: 'apo',      label: 'bond_apo_1',      need: 'ch10_done', name: '阿婆·真的馒头', por: 'yangui' },
];
export const bondLabel = (id,k) => `bond_${id}_${k+1}`;
export function nextBond(S, id){
  const arr = BONDS[id]; if (!arr) return null;
  for (let k=0;k<arr.length;k++){ const lb = bondLabel(id,k); if (S.flags[lb]) continue; return S.flags[arr[k]] ? lb : null; }
  return null;
}
export function nextExtraBonds(S){
  return EXTRA_BONDS.filter(b => S.flags[b.need] && !S.flags[b.label]);
}
