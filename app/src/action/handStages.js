/**
 * 手写招牌关：每区至少一关「被设计过」的 arena 序列。
 * arenas: { waves, dreamWaves?, platsLayout?: [[fx,y,w],...], plat?: number, hazard?, obj?, boss?, note? }
 * platsLayout 用相对坐标 fx∈[0,1]（相对 arena 宽）；引擎 layoutArenas 优先用 plats。
 */
function A(waves, o = {}) {
  const dreamWaves = o.dreamWaves || waves.map(g => g.map(id => {
    const b = String(id).replace(/_[ev]$/, '');
    return o.dreamElite ? b + '_e' : (b.includes('meng') || b.includes('ye') || b.includes('hei') ? b : b + '_e');
  }));
  return { waves, dreamWaves, plat: o.plat ?? 2, platsLayout: o.plats || null, hazard: o.hazard || null, boss: o.boss || null, note: o.note || '' };
}

/** 签名关：id → 覆盖字段 */
export const HAND = {
  // —— 青丘：狐火叠灯 + 梦层竹台 ——
  qingqiu_5: {
    signature: true,
    name: '狐冢',
    obj: 'guard',
    desc: '招牌·狐冢：护灯于狐火之间。闭目后竹台改道，冢中狐梦现身。',
    arenas: [
      A([['humei', 'humei'], ['humei_e', 'dengyan']], { plats: [[0.22, 168, 100], [0.55, 140, 120], [0.82, 168, 90]], hazard: null, note: '入口林' }),
      A([['humei', 'gudiao', 'yegui'], ['humei_e', 'humei']], {
        plats: [[0.15, 175, 80], [0.4, 145, 100], [0.7, 120, 110]],
        dreamWaves: [['mengmo', 'humei_e'], ['humei_e', 'humei_e', 'yegui']],
        hazard: 'poison', note: '梦层竹台',
      }),
      A([['humei_e', 'humei_e']], { plat: 0, boss: 'ab_dafeng', note: '大风降临' }),
    ],
  },
  qingqiu_7: {
    signature: true,
    desc: '月下竹海：三层平台连跳。烛瞳可见藏在竹影里的秘匣金线。',
    arenas: [
      A([['humei', 'yuanqin'], ['gudiao', 'humei']], { plats: [[0.2, 175, 70], [0.45, 145, 70], [0.7, 115, 90], [0.88, 155, 60]] }),
      A([['humei_e', 'gudiao'], ['humei', 'humei', 'dengyan']], { plats: [[0.3, 160, 140], [0.7, 130, 100]], hazard: null }),
    ],
  },
  // —— 东海：潮汐平台 + 限时穿场 ——
  donghai_4: {
    signature: true,
    name: '发鸠山道',
    obj: 'timed',
    time: 110,
    desc: '招牌·发鸠山道：限时冲浪。冰雾平台会在闭目时下沉——睁眼再跳。',
    arenas: [
      A([['chiru', 'haiyuan'], ['jiaoren', 'jellyfish']], { plats: [[0.25, 170, 110], [0.6, 150, 130]], hazard: 'ice' }),
      A([['jiaoren_e', 'chiru'], ['haiyuan', 'yuanqin', 'jellyfish']], {
        plats: [[0.18, 160, 80], [0.5, 130, 100], [0.8, 160, 80]],
        dreamWaves: [['haiyuan_e'], ['jiaoren', 'mengmo']],
        hazard: 'ice',
      }),
      A([['chiru_e', 'jiaoren_e']], { plats: [[0.4, 155, 160]], hazard: 'ice' }),
    ],
  },
  donghai_9: {
    signature: true,
    desc: '九婴潮穴：三波潮涌后首领。护灯段夹在第二场。',
    obj: 'clear',
    arenas: [
      A([['chiru', 'haiyuan', 'jellyfish'], ['jiaoren_e', 'chiru']], { plats: [[0.3, 165, 120], [0.7, 145, 100]], hazard: 'ice' }),
      A([['jiaoren', 'jiaoren', 'haiyuan_e']], { plats: [[0.2, 170, 90], [0.5, 140, 110], [0.78, 170, 90]], hazard: 'poison' }),
      A([['chiru_e']], { plat: 0, boss: 'ab_jiuying' }),
    ],
  },
  // —— 常羊：无首战场阶梯 + 精英房 ——
  changyang_6: {
    signature: true,
    name: '夔鼓之台',
    desc: '招牌·夔鼓之台：精英房。骨鼓节奏——红圈拉长，冲刺窗口更宽。',
    arenas: [
      A([['wushou', 'wushou'], ['gugukui', 'toulou']], { plats: [[0.35, 160, 180]], hazard: 'spike' }),
      A([['wushou_e', 'zheng'], ['gugukui_e', 'kui']], { plats: [[0.2, 175, 70], [0.5, 145, 90], [0.8, 175, 70]], hazard: 'spike', note: '精英房' }),
      A([['wushou_e', 'wushou_e', 'gugukui']], { plats: [[0.4, 150, 200]], hazard: 'spike' }),
    ],
  },
  changyang_10: {
    signature: true,
    desc: '常羊山巅：战魂多阶段。平台退至边缘，逼你用灯芯控场。',
    arenas: [
      A([['wushou_e', 'zheng', 'kui'], ['gugukui_e']], { plats: [[0.15, 170, 80], [0.85, 170, 80]], hazard: 'spike' }),
      A([['wushou_e']], { plat: 0, boss: 'ab_zhanhun' }),
    ],
  },
  // —— 昆仑：玉阶九重垂直感 ——
  kunlun_5: {
    signature: true,
    name: '悬圃',
    obj: 'guard',
    desc: '招牌·悬圃：护灯于玉阶。穷奇未至，先有狻猊试灯。',
    arenas: [
      A([['suanni', 'yingzhao'], ['qinyuan', 'yuchan']], { plats: [[0.25, 175, 90], [0.5, 145, 100], [0.75, 115, 90]] }),
      A([['suanni_e', 'qinyuan'], ['yingzhao_e', 'kui']], {
        plats: [[0.3, 160, 110], [0.65, 130, 120]],
        dreamWaves: [['mengmo', 'suanni_e'], ['qinyuan_e']],
        hazard: 'ice',
      }),
      A([['suanni_e']], { plat: 0, boss: 'ab_qiongqi' }),
    ],
  },
  kunlun_8: {
    signature: true,
    desc: '玉山雪原：冰雾 + 高台。闭目可见钦原毒巢暗线。',
    arenas: [
      A([['qinyuan', 'yuchan', 'yingzhao'], ['suanni', 'qinyuan_e']], { plats: [[0.2, 165, 100], [0.55, 135, 130], [0.85, 165, 70]], hazard: 'ice' }),
      A([['suanni_e', 'kui'], ['qinyuan_e', 'yingzhao']], { plats: [[0.4, 150, 180]], hazard: 'ice' }),
    ],
  },
  // —— 混沌：乱序回廊 · 梦层必切 ——
  hundun_6: {
    signature: true,
    name: '乱序回廊',
    desc: '招牌·乱序回廊：睁眼与闭目平台完全错位。不切梦过不了第三场。',
    arenas: [
      A([['hundunyy', 'huan'], ['fei', 'mengmo']], { plats: [[0.2, 170, 100], [0.6, 150, 120]] }),
      A([['mengmo', 'huan_e'], ['fei_e', 'hundunyy']], {
        plats: [[0.15, 180, 60], [0.45, 140, 80], [0.8, 110, 90]],
        dreamWaves: [['mengmo_e', 'mengmo'], ['huan', 'fei', 'mengmo_e']],
        hazard: 'poison', note: '梦层必经',
      }),
      A([['hundunyy_e', 'mengmo_e']], { plats: [[0.5, 155, 160]], hazard: 'poison' }),
    ],
  },
  hundun_10: {
    signature: true,
    desc: '混沌之宫：无面多阶段。红圈加长，破韧窗口更明显。',
    arenas: [
      A([['hundunyy_e', 'fei_e', 'mengmo'], ['huan_e']], { plats: [[0.25, 165, 90], [0.75, 165, 90]], hazard: 'poison' }),
      A([['hundunyy_e']], { plat: 0, boss: 'ab_hundun' }),
    ],
  },
  // —— 禺谷：烈日与沙 ——
  yugu_5: {
    signature: true,
    name: '旱奴营',
    obj: 'guard',
    desc: '招牌·旱奴营：火雾护灯。灯芯被烤干更快——别走远。',
    arenas: [
      A([['hannu', 'huoshu'], ['jiaoshi', 'shamang']], { plats: [[0.3, 170, 120], [0.7, 150, 100]], hazard: 'fire' }),
      A([['bifang', 'hannu_e'], ['huoshu_e', 'shamang']], {
        plats: [[0.2, 160, 80], [0.5, 135, 110], [0.8, 160, 80]],
        hazard: 'fire',
      }),
      A([['hannu_e']], { plat: 0, boss: 'ab_kuafu' }),
    ],
  },
  yugu_9: {
    signature: true,
    desc: '夸父之路：长廊冲刺波。火柱预警加长，留给冲刺的黄金帧。',
    arenas: [
      A([['bifang', 'jiaoshi', 'huoshu'], ['shamang_e', 'hannu']], { plats: [[0.35, 155, 200]], hazard: 'fire' }),
      A([['bifang_e', 'hannu_e'], ['huoshu', 'jiaoshi_e']], { plats: [[0.15, 170, 70], [0.5, 140, 100], [0.85, 170, 70]], hazard: 'fire' }),
      A([['bifang_e']], { plat: 0, boss: 'ab_ba' }),
    ],
  },
  // —— 北海：冰河与九首 ——
  beihai_5: {
    signature: true,
    name: '梦蝶雪谷',
    desc: '招牌·梦蝶雪谷：闭目才见真正的敌人。睁眼几乎空谷。',
    arenas: [
      A([['bingjiao'], ['heishe']], {
        plats: [[0.3, 165, 130], [0.7, 145, 110]],
        dreamWaves: [['mengdie', 'mengdie_e'], ['heishe_e', 'mengmo', 'mengdie']],
        hazard: 'ice', note: '梦谷',
      }),
      A([['kun'], ['bingjiao_e']], {
        plats: [[0.2, 175, 80], [0.5, 140, 120], [0.8, 175, 80]],
        dreamWaves: [['mengdie_e', 'tubo'], ['heishe_e', 'mengdie_e']],
        hazard: 'ice',
      }),
      A([['bingjiao_e']], { plat: 0, boss: 'ab_yinglong' }),
    ],
  },
  beihai_9: {
    signature: true,
    desc: '九首之沼：相柳前哨。多平台+毒雾，破头要靠烛瞳弱点。',
    arenas: [
      A([['heishe_e', 'bingjiao', 'tubo'], ['kun', 'mengdie']], { plats: [[0.18, 170, 80], [0.4, 140, 90], [0.65, 160, 90], [0.88, 130, 70]], hazard: 'poison' }),
      A([['heishe_e', 'heishe_e']], { plat: 0, boss: 'ab_xiangliu' }),
    ],
  },
  // —— 归墟：终局叠层 ——
  guixu_3: {
    signature: true,
    name: '渊瞳之海',
    desc: '招牌·渊瞳之海：睁眼星砂，闭目梦屑。两层都要清一波才给 S。',
    arenas: [
      A([['xinghai', 'yecha'], ['yuantong', 'mengmo']], {
        plats: [[0.25, 160, 110], [0.6, 135, 130]],
        dreamWaves: [['mengmo_e', 'mengdie'], ['yuantong_e', 'yecha']],
      }),
      A([['xinghai_e', 'yecha'], ['yuantong', 'mengmo_e']], {
        plats: [[0.2, 175, 70], [0.5, 145, 100], [0.8, 120, 90]],
        dreamWaves: [['mengdie_e', 'yecha_e'], ['yuantong_e', 'mengmo_e', 'xinghai']],
        hazard: 'poison',
      }),
    ],
  },
  guixu_8: {
    signature: true,
    desc: '浮黎之誓：师徒战前奏。平台对称，逼你用共鸣合击破防。',
    arenas: [
      A([['xinghai_e', 'yecha_e'], ['yuantong_e', 'mengmo']], { plats: [[0.2, 165, 90], [0.5, 140, 120], [0.8, 165, 90]] }),
      A([['xinghai_e']], { plat: 0, boss: 'ab_fuli' }),
    ],
  },
  guixu_10: {
    signature: true,
    desc: '钟山之下：终焉。玄冥多阶段，预警全面加长。',
    arenas: [
      A([['yuantong_e', 'yecha_e', 'xinghai_e'], ['mengmo_e']], { plats: [[0.15, 170, 70], [0.85, 170, 70]], hazard: 'poison' }),
      A([['yuantong_e']], { plat: 0, boss: 'ab_xuanming' }),
    ],
  },
};

/** 把 HAND 写进 STAGES（可重复调用） */
export function applyHandStages(STAGES) {
  for (const [id, h] of Object.entries(HAND)) {
    const st = STAGES[id];
    if (!st) continue;
    if (h.name) st.name = h.name;
    if (h.obj) st.obj = h.obj;
    if (h.time != null) st.time = h.time;
    if (h.desc) st.desc = h.desc;
    if (h.arenas) {
      st.arenas = h.arenas.map(a => ({ ...a }));
      const hasBossArena = h.arenas.some(a => a.boss);
      if (hasBossArena) {
        st.boss = h.arenas.find(a => a.boss)?.boss || st.boss;
        st._handBossInArenas = true;
      }
    }
    st.signature = !!h.signature;
    st.kind = st.boss ? 'boss' : st.kind;
  }
}
