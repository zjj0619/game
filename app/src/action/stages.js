// v2.0 关卡：九大区域 × 10 主线关 + 每区 1 隐藏关；镇妖塔 100 层；首领连战；每日秘境
import { REGIONS, REGION_ORDER } from '../data/regions.js';
import { AFOES, ABOSSES } from './foes.js';
export const POOLS = {
  jincheng:['yegui','dengyan','yuanqin'], qingqiu:['humei','dengyan','gudiao','yegui'], donghai:['chiru','jellyfish','jiaoren','haiyuan','yuanqin'],
  changyang:['wushou','gugukui','toulou','kui','zheng'], kunlun:['qinyuan','yingzhao','suanni','yuchan','kui'], hundun:['hundunyy','huan','fei','mengmo','qinyuan'],
  yugu:['bifang','haiwu','jiaoshi','shamang','hannu','huoshu'], beihai:['bingjiao','heishe','kun','mengdie','tubo'], guixu:['xinghai','yuantong','yecha','mengmo','mengdie'],
};
const BOSS = { jincheng:['ab_fengxi','ab_yeguiwang'], qingqiu:['ab_dafeng','ab_humeng'], donghai:['ab_jiuying','ab_duchao'], changyang:['ab_zaochi','ab_zhanhun'],
  kunlun:['ab_qiongqi','ab_luwu'], hundun:['ab_shuyan','ab_hundun'], yugu:['ab_kuafu','ab_ba'], beihai:['ab_yinglong','ab_xiangliu'], guixu:['ab_fuli','ab_xuanming'] };
const HIDDEN = { jincheng:'ab_taotie', qingqiu:'ab_xiushe', donghai:'ab_yinglong', changyang:'ab_taowu', kunlun:'ab_qiongqi', hundun:'ab_taotie', yugu:'ab_jinwu', beihai:'ab_guixu', guixu:'ab_zhulong' };
const NAMES = {
  jincheng:['城墙外的雪','灯市夜巡','坠星坑','断桥灯影','废弃烽台','夜鬼巷','不周山麓','守灯人旧哨','灯油库','封豨之林'],
  qingqiu:['狐火残林','幽蓝溪谷','九尾石阶','迷途之径','狐冢','涂山外苑','月下竹海','镜湖','大风栖处','狐梦深处'],
  donghai:['腐潮海岸','死鱼礁','渔村废墟','发鸠山道','鲛人暗礁','毒雾滩','沉船湾','精卫石崖','九婴潮穴','毒潮之心'],
  changyang:['无首战场','骨鼓阵','断戈坡','常羊古道','血锈峡','夔鼓之台','凿齿营地','刑天祭坛前','战魂长阶','常羊山巅'],
  kunlun:['昆仑墟门','玉阶九重','狻猊守关','钦原毒巢','悬圃','开明兽道','瑶池外堤','玉山雪原','穷奇之谷','帝之下都'],
  hundun:['混沌之野','无面之原','讙鸣荒丘','梦貘洞','倒悬之林','乱序回廊','帝江歌台','书魇书阁','空白之海','混沌之宫'],
  yugu:['赤水之畔','焦尸原','毕方火林','沙蟒之丘','旱奴营','禺谷日墟','金乌坠处','邓林枯木','夸父之路','系昆之山'],
  beihai:['北海冰原','黑蛇冰河','鲲之脊','幽都门外','梦蝶雪谷','土伯冥道','玄冥冰宫外','应龙冰渊','九首之沼','北海之极'],
  guixu:['归墟入口','星骸之河','渊瞳之海','夜叉回廊','长夜碎片','无底之谷','灯烬之桥','浮黎之誓','玄冥之门','钟山之下'],
};
const THEME = { jincheng:'jincheng', qingqiu:'qingqiu_forest', donghai:'donghai', changyang:'changyang', kunlun:'kunlun_gate', hundun:'hundun', yugu:'yugu', beihai:'beihai', guixu:'guixu' };
const ALTBG = { jincheng:'buzhou', qingqiu:'qingqiu_palace', donghai:'haidi', changyang:'changyang_altar', kunlun:'yaochi', hundun:'shuge', yugu:'chishui', beihai:'youdu', guixu:'zhulong_eye' };
// 关卡目标：clear 歼灭 / timed 限时 / guard 护灯 / nohit 无伤（额外评级）
const OBJ = ['clear','clear','timed','clear','guard','clear','timed','clear','guard','clear'];
function rng(seed){ let s=seed||1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return ((s>>>0)%100000)/100000; }; }
export const STAGES = {};
export const REGION_STAGES = {};
REGION_ORDER.forEach((rid, ri) => {
  const R = REGIONS[rid]; const [l0, l1] = R.lv.split('-').map(Number); const pool = POOLS[rid]; const list = [];
  for (let i = 0; i < 11; i++) {
    const hidden = i === 10; const r = rng((ri+1)*1000 + i*37 + 11);
    const lv = hidden ? l1 + 2 : Math.round(l0 + (l1 - l0) * i / 9);
    const boss = hidden ? HIDDEN[rid] : i === 9 ? BOSS[rid][1] : i === 4 ? BOSS[rid][0] : null;
    const nAr = hidden ? 4 : 2 + Math.min(3, Math.floor(i / 3)) + (r() < 0.4 ? 1 : 0);
    const arenas = [];
    for (let a = 0; a < nAr; a++) {
      const waves = []; const nW = 1 + (a > 0 && r() < 0.5 ? 1 : 0) + (i >= 6 ? 1 : 0);
      for (let w = 0; w < nW; w++) {
        const grp = []; const n = 2 + Math.floor(r() * (2 + i / 3));
        for (let k = 0; k < n; k++) {
          const b = pool[Math.floor(r() * Math.min(pool.length, 2 + Math.floor(i / 2)))];
          const roll = r(); const id = (i >= 3 && roll < 0.08 + i * 0.012) ? b + '_e' : (i >= 5 && roll > 0.9) ? b + '_v' : b;
          grp.push(id);
        }
        waves.push(grp);
      }
      // 梦层波次：同结构但偏暗属/精英，闭目叠层时使用
      const dreamWaves = waves.map(grp => grp.map(id => {
        const base = id.replace(/_[ev]$/, '');
        const dark = pool.find(x => x !== base && (x.includes('ye') || x.includes('meng') || x.includes('hei') || x.includes('yuan'))) || pool[pool.length - 1];
        return r() < 0.55 ? (dark + (r() < 0.3 ? '_e' : '')) : (base + '_e');
      }));
      arenas.push({ waves, dreamWaves, plat: Math.floor(r() * 6), hazard: i >= 3 && r() < 0.35 ? (['spike','fire','ice','poison'][ri % 4]) : null });
    }
    const id = `${rid}_${i+1}`;
    const st = { id, region:rid, ri, idx:i, name: hidden ? '秘境·' + (ABOSSES[boss]?.name||'') : NAMES[rid][i], lv, boss, arenas, hidden,
      obj: hidden ? 'clear' : OBJ[i], bg: (i % 3 === 2 || hidden) ? ALTBG[rid] : THEME[rid], time: OBJ[i]==='timed' ? 90 + nAr*20 : 0,
      kind: hidden ? 'hidden' : boss ? 'boss' : 'normal', story: !hidden && (i === 0 || i === 4 || i === 9) };
    STAGES[id] = st; list.push(id);
  }
  REGION_STAGES[rid] = list;
});
// 镇妖塔：100 层，每 10 层首领
const ALLPOOL = Object.values(POOLS).flat();
const ALLBOSS = Object.keys(ABOSSES);
export function towerStage(f){
  const r = rng(f*7919+3); const lv = Math.min(80, 3 + Math.round(f*0.75)); const boss = f % 10 === 0 ? ALLBOSS[(f/10 - 1) % ALLBOSS.length] : null;
  const ri = Math.min(8, Math.floor(f/12)); const rid = REGION_ORDER[ri];
  const waves = []; for (let w=0; w<(boss?1:2+(f>30?1:0)); w++){ const g=[]; const n=3+Math.floor(r()*3)+Math.floor(f/25); for (let k=0;k<n;k++){ const b=ALLPOOL[Math.floor(r()*ALLPOOL.length)]; g.push(r()<0.1+f*0.004? b+'_e' : r()<0.15? b+'_v' : b); } waves.push(g); }
  return { id:'tower_'+f, region:rid, ri, idx:f, name:`镇妖塔·第 ${f} 层`, lv, boss, arenas:[{waves, plat:f%6, hazard: f%7===0?'fire':null}], obj: f%5===3 ? 'timed' : 'clear', time:70, bg: f%2? 'dengta':'buzhou', kind:'tower', floor:f };
}
export function rushStage(){ // 首领连战：每段一个首领
  const ids = ['ab_yeguiwang','ab_humeng','ab_duchao','ab_zhanhun','ab_luwu','ab_shuyan','ab_hundun','ab_ba','ab_xiangliu','ab_xuanming'];
  return { id:'rush', region:'guixu', ri:8, name:'首领连战·十殿', lv:0, rush:ids, arenas: ids.map(b=>({waves:[], boss:b, plat:0})), obj:'clear', bg:'zhulong_eye', kind:'rush' };
}
export const DAILY = [
  { id:'d_gold', name:'聚宝秘境', desc:'金钱大量掉落', reward:'gold', bg:'jincheng' },
  { id:'d_exp', name:'悟道秘境', desc:'大量经验', reward:'exp', bg:'shuge' },
  { id:'d_mat', name:'百炼秘境', desc:'锻造材料', reward:'mat', bg:'yugu' },
  { id:'d_pet', name:'异兽秘境', desc:'异兽之卵掉落率提升', reward:'pet', bg:'qingqiu_forest' },
  { id:'d_gear', name:'神兵秘境', desc:'稀有装备掉落率提升', reward:'gear', bg:'kunlun_gate' },
];
export function dailyStage(d, lv){
  const r = rng(lv*31 + d.id.length*97); const waves = [];
  for (let w=0; w<3; w++){ const g=[]; for (let k=0;k<4;k++) g.push(ALLPOOL[Math.floor(r()*ALLPOOL.length)]); waves.push(g); }
  return { id:d.id, region:'jincheng', ri:0, name:d.name, lv, arenas:[{waves:waves.slice(0,2), plat:2},{waves:waves.slice(2), plat:4}], obj:'timed', time:120, bg:d.bg, kind:'daily', reward:d.reward };
}
export const STAGE_COUNT = Object.keys(STAGES).length;
