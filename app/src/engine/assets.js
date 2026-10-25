export const ASSET_ALIASES = {
  'bg/qingqiu': 'bg/qingqiu_forest', 'bg/xingtian_land': 'bg/changyang',
  'bg/kunlun': 'bg/kunlun_gate', 'bg/camp': 'bg/campfire', 'bg/baize': 'bg/shuge',
};
export const assetPath = path => ASSET_ALIASES[path] || path;
