// 羁绊事件：营火处的固定剧本对话（不依赖 AI）。每个同伴按章节逐步解锁。
export const BONDS = {
  baiji:   ['ch1_done','ch3_done','ch6_done','ch9_done'],
  xianwei: ['ch2_done','ch4_done','ch7_done','ch10_done'],
  qi:      ['ch3_done','ch5_done','ch8_done','ch10_done'],
  ali:     ['ch6_done','ch7_done','ch9_done','ch11_done'],
  kualing: ['ch7_done','ch8_done','ch10_done','ch11_done'],
  fuli:    ['ch10_done','ch11_done'],
};
export const bondLabel = (id,k) => `bond_${id}_${k+1}`;
export function nextBond(S, id){
  const arr = BONDS[id]; if (!arr) return null;
  for (let k=0;k<arr.length;k++){ const lb = bondLabel(id,k); if (S.flags[lb]) continue; return S.flags[arr[k]] ? lb : null; }
  return null;
}
