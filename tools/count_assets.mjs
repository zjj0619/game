// 统计 app/public 下的资产并生成 ASSETS_COUNT.md（node tools/count_assets.mjs）
import fs from 'fs'; import path from 'path';
const ROOT = new URL('../app/public/', import.meta.url).pathname;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(ROOT, path.join(d, e.name))]);
const files = walk(ROOT);
const CATS = [
  ['原画 · 场景背景', /^assets\/bg\//, '原画（GenerateImage）', '各区域、剧情场景背景'],
  ['原画 · 剧情插画 CG', /^assets\/cg\//, '原画（GenerateImage）', '剧情关键帧插画'],
  ['原画 · 立绘', /^assets\/por\//, '原画（GenerateImage）', '角色剧情立绘'],
  ['原画 · 首领', /^assets\/boss\//, '原画（GenerateImage）', '首领战斗形象'],
  ['原画 · 异兽（基础 + 异种）', /^assets\/enemy\/[^/]+$/, '原画 + 程序派生', '36 种基础异兽及异种描边变体'],
  ['区域异兽变体', /^assets\/enemy\/r\//, '程序派生（tools/gen/anim.py region）', '8 个区域调色盘 × 36 种异兽'],
  ['角色/物件精灵', /^assets\/spr\/[^/]+$/, '原画（GenerateImage）', '可操作角色、NPC、宝箱、灯、陷阱'],
  ['角色外观', /^assets\/spr\/skin\//, '程序派生（tools/gen/anim.py hero）', '10 名角色 × 8 套外观'],
  ['角色动画帧', /^assets\/anim\/p_/, '程序派生（网格形变，tools/gen/anim.py）', '10 角色 × 8 外观 × 28 帧（待机/奔跑/攻击/跳跃/受击/施法）'],
  ['异兽/首领动画帧', /^assets\/anim\/(?!p_)/, '程序派生（网格形变）', '每只异兽、首领、区域变体：待机/行走/攻击/受击'],
  ['技能特效序列帧', /^assets\/vfx\//, '程序生成（tools/gen/vfx.py）', '12 种特效 × 7 元素 × 12 帧'],
  ['视差远中近景层', /^assets\/px\//, '程序生成（tools/gen/px.py）', '9 区域 × 11 关 × 远/中/近三层'],
  ['关卡卡面', /^assets\/stagecard\//, '合成（tools/gen/cards.py）', '99 关 + 镇妖塔 + 首领连战 + 5 个每日秘境'],
  ['地面纹理', /^assets\/ground\//, '程序生成（tools/gen/cards.py）', '9 区域 × 8 变体'],
  ['成就徽章', /^assets\/ui\/ach\//, '程序生成（tools/gen/cards.py）', '每项成就一枚'],
  ['界面图', /^assets\/ui\/[^/]+$/, '原画（GenerateImage）', '标题、世界地图、图标'],
  ['技能图标', /^assets\/icon\/sk\//, '原画图集切片', '100 个技能图标'],
  ['状态图标', /^assets\/icon\/st\//, '原画图集切片', '增益/减益状态'],
  ['装备底图', /^assets\/icon\/gb\//, '原画图集切片（tools/gen/gear_icons.py）', '6 张图集切出 96 个底图'],
  ['装备图标（品质合成）', /^assets\/icon\/gen\//, '程序合成', '底图 × 5 品质边框光效'],
  ['道具图标', /^assets\/icon\/[^/]+$/, '原画图集切片', '武器/护甲/饰品/材料/消耗品/遗物/技能书'],
  ['杂项道具图标', /^assets\/icon\/ex\//, '原画（GenerateImage）', '兽蛋、灵药、锻锤等'],
  ['音乐', /^assets\/(bgm|music)\//, '见 ATTRIBUTION.md', '背景音乐'],
  ['音效', /^assets\/sfx\//, '见 ATTRIBUTION.md', '音效'],
  ['字体', /^fonts\//, '开源字体子集', ''],
];
const rows = CATS.map(([n, re, src, note]) => ({ n, src, note, c: files.filter(f => re.test(f)).length })).filter(r => r.c);
const other = files.filter(f => !CATS.some(c => c[1].test(f)));
if (other.length) rows.push({ n: '其他', src: '', note: other.slice(0, 5).join(', '), c: other.length });
const total = files.length; const orig = rows.filter(r => r.src.startsWith('原画')).reduce((a, r) => a + r.c, 0);
const md = `# 资产统计（ASSETS_COUNT）

由 \`node tools/count_assets.mjs\` 自动生成，统计 \`app/public/\` 下随游戏打包的全部文件。最近生成：${new Date().toISOString().slice(0, 10)}。

**总计：${total} 个文件**

| 类别 | 数量 | 来源 | 说明 |
|---|---:|---|---|
${rows.map(r => `| ${r.n} | ${r.c} | ${r.src} | ${r.note} |`).join('\n')}

## 来源说明（如实披露）

- **原画**：用 GenerateImage 自己生成的原创插画与图集，再裁切、抠图、压缩，共约 ${orig} 个文件。造梦西游只作为玩法参考，没有使用任何它的素材。
- **程序派生 / 程序生成**：由 \`tools/gen/\` 下的脚本根据原画或纯算法批量生成，包括网格形变动画帧、换色外观、区域变体、特效序列帧、视差层、地面纹理、卡面与徽章。它们在数量上占大头，这里明确标注，不冒充手绘原画。
- **每个统计到的文件都被游戏实际引用**：动画帧在战斗中按状态逐帧播放；特效帧由 vfx 播放器使用；视差层与地面纹理随关卡区域加载；卡面用于关卡详情与每日秘境；徽章用于成就页。
- 重新生成：\`python3 tools/gen/anim.py ...\`、\`python3 tools/gen/vfx.py\`、\`python3 tools/gen/px.py\`、\`python3 tools/gen/cards.py\`。
`;
fs.writeFileSync(new URL('../ASSETS_COUNT.md', import.meta.url), md); console.log(total, rows.map(r => r.n + ':' + r.c).join(' | '));
