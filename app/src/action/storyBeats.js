/**
 * 动作关卡剧情节拍：把 VN 主线（STORY_BIBLE / ENDINGS / story/*.txt）织进关卡。
 * 每区：开篇章节卡 + 对白（第 1 关）、中首领战前/战后（第 5 关）、终首领战前/战后 + 抉择（第 10 关）、
 * 关内触发的随行对白（进入某段场地时，不打断操作）、隐藏关支线前后。
 * 抉择只写入既有旗帜/变量（var:mercy / var:ruthless / aff / hope / 角色旗），从不写 weary，从不删旗，保证 15 个结局都可达。
 * 行格式："说话人|台词"；说话人：角色 id、boss（本关首领）、n（旁白）；前缀 "?条件 " 表示满足 cond() 才显示。
 */
import { S, cond } from '../engine/state.js';
import { STAGE_BEATS, KNOWN_INTRO } from './stageBeats.js';
import { REGION_CH, vnProgress } from '../engine/canon.js';

export const REGION_STORY = {
  jincheng: {
    chapter: '序章 · 灯尽', sub: '长夜纪三百年 · 烬城', next: '青丘',
    intro: ['n|烛龙闭眼三百年。烬城的灯油，只够再烧七夜。', 'yangui|师父走前说过：灯不灭，城就在。', 'yangui|可他已经三十天没回来了。', 'n|城墙外，夜鬼开始成群地试探光的边界。', 'yangui|……先把城外的夜鬼清干净。再去找他。'],
    barks: { 1: 'yangui|夜鬼怕光。逼进灯圈里再打。', 3: 'yangui|这些爪痕是新的……它们在往城门聚。' },
    mid: { pre: ['n|一头獠牙如戟的巨豕撞断了灯柱。', 'boss|（低吼）灯……灭……', 'yangui|封豨。它是被谁放进来的？'], post: ['yangui|它的獠牙上缠着黑色的丝——是梦丝。有人在背后驱使夜鬼。'] },
    boss: { pre: ['n|城门洞里，夜鬼之王披着一身熄灭的灯笼。', 'boss|守灯人的小崽子。你师父的灯，就是我吹灭的。', 'yangui|——你说什么？', 'boss|想知道？赢了我，再问。'],
      post: ['boss|浮黎……往南去了……他要找……七片……', 'n|夜鬼王的身体像烧尽的纸灰，一点点散开。'],
      choice: { q: '夜鬼王的残魂在灯下颤抖。', opts: [
        { t: '把残魂送进灯火，超度它', fx: ['var:mercy+1', 'hope+3'], after: 'yangui|你也曾是怕黑的人吧。走吧。' },
        { t: '斩尽，不留后患', fx: ['var:ruthless+1'], after: 'yangui|烬城不会再给你第二次机会。' } ] } },
    hidden: { pre: ['n|裂墙后是一条废弃的灯道，墙上全是孩子们画的太阳。', 'yangui|师父以前带我来过这里……他说，这是城里最后一盏没人知道的灯。'], post: ['n|灯道尽头，一枚包在油纸里的种子。纸上写着：「给想看日出的孩子们」。', 'yangui|师父，你到底准备了多少东西……'] },
  },
  qingqiu: {
    chapter: '第一章 · 青丘狐梦', sub: '有兽焉，其状如狐而九尾', next: '东海',
    intro: ['n|罗盘的指针一直指着东方。第八天，林子里亮起了幽蓝的狐火。', 'baiji|哎呀，有个人类迷路了。', 'yangui|林子里的狐火在变暗。是因为你拿走了它？', 'baiji|……借，是借！跟我来，林子深处出事了。'],
    barks: { 1: 'baiji|狐火怕风。别让那些风妖靠近幼狐的窝。', 3: '?flag:baiji_protected baiji|上次……谢谢你替我说话。这次换我挡在前面。' },
    mid: { pre: ['n|狂风卷起满山落叶，一只巨鸟的影子遮住了狐火。', 'baiji|是大风！它一扇翅膀，整片林子的火都要灭了！'], post: ['baiji|它的羽毛里也缠着梦丝……跟烬城那头一样。'] },
    boss: { pre: ['n|青丘的梦境深处，九尾的影子层层叠叠。', 'boss|白霁，回来吧。在梦里，你从来没有闯过祸。', 'baiji|……那不是真的我。', 'yangui|闭目看清楚——它在梦层里还有一条尾巴。'],
      post: ['n|狐梦碎裂，林中幼狐一只只睁开了眼。', 'baiji|族里的长老们……要来问罪了。狐火是我偷的。'],
      choice: { key: 'qq_trial', q: '青丘长老质问：狐火失窃，谁来担？', opts: [
        { t: '「是我让她带着狐火的，要罚就罚我。」', canon: 'protect', fx: ['flag:baiji_protected', 'aff:baiji+8', 'hope+2'], after: 'baiji|……笨蛋人类。' },
        { t: '「先救幼狐，罪之后再算。」', canon: 'save', fx: ['aff:baiji+4', 'hope+3', 'var:mercy+1'], after: 'baiji|嗯。先救它们。' },
        { t: '「狐火是她拿的。」', canon: 'expose', vnOnly: true, fx: ['aff:baiji-6', 'var:ruthless+1'], after: 'baiji|……嗯。是我拿的。我认。' } ] } },
    hidden: { pre: ['baiji|这里是……我小时候藏起来的狐窝。', 'baiji|里面住着一个不肯醒的梦。'], post: ['baiji|它梦见青丘一直有太阳。我把它叫醒了……对吗？', '?flag:baiji_protected yangui|你是在替它难过。这就够了。'] },
  },
  donghai: {
    chapter: '第二章 · 衔石填海', sub: '有鸟焉，其状如乌，名曰精卫', next: '常羊',
    intro: ['n|东海没有尽头。浪声里，一只小鸟一遍一遍地衔石、投海。', 'xianwei|别挡道。我还有九千九百块石头要扔。', 'yangui|海是填不平的。', 'xianwei|我知道。可我只会这一件事。'],
    barks: { 1: 'xianwei|潮里有毒，别站在浪尖上。', 3: 'xianwei|……你刚才那一跳，好像我还是人的时候。' },
    mid: { pre: ['n|九个婴孩的哭声从水下同时响起。', 'xianwei|九婴！它一张嘴，海就会烧起来！'], post: ['xianwei|它守着的那片礁石下面……有我三千年前扔下的第一块石头。'] },
    boss: { pre: ['n|毒潮翻涌，一条巨蛟从黑水里抬起头。', 'boss|小鸟，你填了三千年，海还是我的。', 'xianwei|那就再填三千年。'],
      post: ['n|毒潮退去，海面第一次平静得像一面镜子。', 'xianwei|……我累了。可我不知道停下来以后，我是谁。'],
      choice: { key: 'xw_stone', q: '衔微望着海面。', opts: [
        { t: '「继续填吧。我陪你。」', canon: 'fill', fx: ['flag:xw_sea_oath', 'aff:xianwei+8'], after: 'xianwei|……一言为定。等天亮了，我们一起扔最后一块。' },
        { t: '「你已经飞了三千年，够了。」', canon: 'nofill', fx: ['aff:xianwei+3', 'hope+3', 'var:mercy+1'], after: 'xianwei|够了……原来可以说「够了」。' } ] } },
    hidden: { pre: ['n|海底的石堆里，有一块刻着字的石头。', 'xianwei|那是……我当年写给父亲的话。'], post: ['xianwei|「海很大，女儿不怕。」——原来我写的是这个。', 'yangui|你从来都不怕。'] },
  },
  changyang: {
    chapter: '第三章 · 无首之舞', sub: '刑天与帝至此争神', next: '昆仑',
    intro: ['n|常羊山上，一个无头的巨人在跳战舞。干戚相击，声如雷鸣。', 'qi|（以胸为目，以脐为口）……你们，来抢我的头？', 'yangui|我们帮你找头。', 'qi|……找到了，又如何。'],
    barks: { 1: 'qi|跟着我的节拍。鼓点落，再出手。', 3: 'qi|这些战魂……都还记得为什么而战。只有我忘了。' },
    mid: { pre: ['n|凿齿的长牙从山岩里钻出。', 'qi|它啃了我三百年的坟。'], post: ['qi|坟里没有头。只有一封没寄出的战书。'] },
    boss: { pre: ['n|千万战魂列阵，阵首是一张熟悉的、无首的轮廓。', 'boss|刑天！再战一次！', 'qi|……我不想再为你们而战了。', 'yangui|那就为你自己。'],
      post: ['n|战魂散尽，山顶只剩一个落满灰的头颅。', 'qi|那是我的头。我不确定还想不想要它。'],
      choice: { q: '戚望着自己的头颅。', opts: [
        { t: '「放回去吧。你都是你。」', fx: ['flag:qi_oath', 'aff:qi+8', 'hope+2'], after: 'qi|……那我立誓：这把干戚，此后只护人，不争神。' },
        { t: '「封起来。现在的你，有新的理由。」', fx: ['aff:qi+5', 'var:mercy+1'], after: 'qi|新的理由。好。' } ] } },
    hidden: { pre: ['qi|山腹里有鼓声。是我当年的军鼓。', 'qi|它还在为一支死去的军队敲。'], post: ['qi|我让它停了。……这比砍下任何一颗头都难。'] },
  },
  kunlun: {
    chapter: '第四章 · 白泽之书 / 第五章 · 昆仑天门', sub: '能言，达于万物之情', next: '混沌',
    intro: ['n|昆仑之下，白泽守着一本记尽万物的书。', 'baize|守灯人。你师父来过这里，借走了一页。', 'yangui|哪一页？', 'baize|关于你的那一页。'],
    barks: { 1: 'baize|天门的守卫只认问题的答案，不认刀。', 3: 'yangui|师父在这里留下过灯油的味道……他走得很急。' },
    mid: { pre: ['n|穷奇的双翼遮天，它最爱吃说真话的人。', 'baize|小心，它会把你最想听的话说给你听。'], post: ['yangui|它说师父是骗子。……我不信。'] },
    boss: { pre: ['n|天门之前，虎身九尾的神兽缓缓起身。', 'boss|昆仑不渡迷途之人。你为何而来？', 'yangui|为了让天亮——也为了问清楚一个人。'],
      post: ['boss|……你可以过去了。西王母在等你。', 'n|白泽把那一页书递了过来。纸上的字迹，是浮黎的。'],
      choice: { key: 'baize_page', q: '浮黎写下的、关于你的那一页。', opts: [
        { t: '读', canon: 'read', fx: ['flag:read_self', 'aff:fuli+3'], after: 'yangui|……原来我是被他从灯里捡回来的。' },
        { t: '不读，等他亲口告诉我', canon: 'noread', fx: ['hope+3', 'aff:fuli+2', 'var:mercy+1'], after: 'baize|好孩子。有些字，要听人说才算数。' } ] } },
    hidden: { pre: ['n|昆仑书斋的暗格里，有一封火漆未拆的信。', 'baize|那是浮黎留给你的。要不要拆，由你。'], post: ['yangui|我先收着。等找到他，当面拆。'] },
  },
  hundun: {
    chapter: '第六章 · 帝江之乐', sub: '浑敦无面目，是识歌舞', next: '禺谷',
    intro: ['n|混沌之地没有方向，只有一阵若有若无的歌。', 'ali|你们……也是来听帝江跳舞的吗？', 'ali|我在等一个人。他说听完这支舞就回来。'],
    barks: { 1: 'ali|书里的字会咬人，别靠近那些飘着的纸页。', 3: 'ali|下一句歌词是什么来着……我又忘了。' },
    mid: { pre: ['n|书页翻飞，聚成一张没有五官的脸。', 'ali|书魇！它吃掉了好多人的名字！'], post: ['ali|它吐出来一个名字……可惜不是他。'] },
    boss: { pre: ['n|混沌巨大的身形在歌声里起伏，没有眼，也没有口。', 'dijiang|（无声地跳着舞）', 'yangui|它不是在攻击——它只是在跳舞。可舞步碾过之处，什么都不剩。'],
      post: ['n|混沌停下了舞步。帝江的影子在它身上一闪而过。', 'ali|它在等你回答：要不要为它凿开七窍？'],
      choice: { key: 'dj_holes', q: '凿开七窍，混沌会看见世界，也会因此死去。', opts: [
        { t: '「不要凿。现在这样就很好。」', canon: 'no', fx: ['flag:dj_whole', 'aff:ali+6', 'hope+3'], after: 'ali|嗯……那我陪它把这支舞跳完。我会在这里等。' },
        { t: '「这得它自己决定。」', canon: 'self', fx: ['aff:ali+3', 'flag:ali_wait'], after: 'ali|那我就在这里等它决定。也等他。' },
        { t: '凿开七窍', canon: 'yes', vnOnly: true, fx: ['flag:dj_open', 'aff:ali-4', 'var:ruthless+1'], after: 'ali|……它看见了。然后，它不跳了。' } ] } },
    hidden: { pre: ['ali|这是我等他的地方。树上刻了三百道痕。'], post: ['ali|他不会来了吧。……但我还是想等。', 'yangui|等也是一盏灯。'] },
  },
  yugu: {
    chapter: '第七章 · 逐日 / 第八章 · 赤水旱魃', sub: '夸父与日逐走，入日', next: '北海',
    intro: ['n|禺谷是太阳落下的地方。如今只剩一具冰冷的日骸。', 'kualing|站住！再往前一步，下一箭就射你的眼睛！', 'yangui|我们不是来偷的，是来让它重新升起来的。', 'kualing|……先过了我祖先这一关。'],
    barks: { 1: 'kualing|地面会烫脚，别在一个地方站太久。', 3: '?flag:ba_water ba|……水。好久没人给过我水了。' },
    mid: { pre: ['n|巨人的残影迈着追日的步子，大地随之开裂。', 'kualing|祖先……你还在追？'], post: ['kualing|他终于停下了。我替他追下去。'] },
    boss: { pre: ['n|赤水干涸，青衣女子立在龟裂的河床中央。', 'boss|你们也是来封印我的？', 'yangui|我们是来问你——你恨他们吗？'],
      post: ['boss|……我只是太热了。三千年，没有一个人问我渴不渴。'],
      choice: { key: 'ba_fate', q: '魃跪在干涸的赤水边。', opts: [
        { t: '解开封印，放她走', canon: 'free', fx: ['flag:ba_freed', 'var:mercy+1', 'hope+2'], after: 'ba|……谢谢。我会去北方。那里冷，我就不会再烧着谁。' },
        { t: '重新封印，保赤水平安', canon: 'seal', fx: ['flag:ba_sealed', 'var:ruthless+1', 'flag:kl_chase'], after: 'kualing|这样……赤水的人就能活。走，我们继续追。' } ] } },
    hidden: { pre: ['kualing|日骸的心口还有一点余温。', 'kualing|我想替祖先摸一摸。'], post: ['kualing|还是热的。……太阳没死，它只是睡着了。'] },
  },
  beihai: {
    chapter: '第九章 · 北海断后', sub: '共工之臣曰相柳氏，九首', next: '归墟',
    intro: ['n|北海终年冰封。九首的大蛇盘踞在海眼之上。', 'xiangliu|守灯人。你身上有烛龙的味道。', 'yangui|你在为谁守这片海？', 'xiangliu|为一个早就不在的主人。'],
    barks: { 1: 'yangui|冰面下有东西在游。别在裂冰上久站。', 3: '?flag:xiangliu_spared xiangliu|（远处，九个头同时低下）……小心应龙。' },
    mid: { pre: ['n|应龙振翼，雷雨倾盆而下。', 'boss|涿鹿的旧账，今日了结。'], post: ['yangui|它说……相柳是在替共工断后，三千年没有退过一步。'] },
    boss: { pre: ['n|九首齐鸣，北海的冰一寸寸碎裂。', 'boss|来吧。让我看看，烛龙选中的人有几斤几两。'],
      post: ['boss|……够了。你赢了。', 'n|相柳的九个头一个个垂下，冰面上落下一滴泪。'],
      choice: { key: 'xl_fate', q: '相柳伏在冰上，不再抵抗。', opts: [
        { t: '放过它', canon: 'spare', fx: ['flag:xiangliu_spared', 'var:mercy+1', 'hope+2'], after: 'xiangliu|……我欠你一次。若你去归墟，我会在海眼替你断后。' },
        { t: '斩下最后一首', canon: 'kill', fx: ['flag:xiangliu_slain', 'var:ruthless+1'], after: 'n|北海安静了。安静得让人发冷。' } ] } },
    hidden: { pre: ['n|海眼深处，梦层里漂着一封鳞片包着的信。', '?flag:xiangliu_spared xiangliu|那是共工写给我的最后一道命令。我从没敢拆。'], post: ['?flag:xiangliu_spared xiangliu|「活下去。」……原来只有这三个字。', 'n|冰面下，有什么东西轻轻发着光。'] },
  },
  guixu: {
    chapter: '第十一章 · 归墟', sub: '其下无底，名曰归墟', next: '终章',
    intro: ['n|归墟。万水归处，长夜的尽头。', 'yangui|师父的灯油味……就在下面。', '?flag:xiangliu_spared xiangliu|去吧。海眼我替你守着。', 'yangui|七片烛瞳，快齐了。'],
    barks: { 1: 'yangui|这里的梦层和现实几乎重叠了……闭目时要小心。', 3: 'xuanming|（远处）守灯人。你确定你想要的是天亮吗？' },
    mid: { pre: ['?!flag:fuli_killed n|归墟的漩涡中心，站着一个提灯的人。', '?flag:fuli_killed n|归墟的漩涡中心，只剩一盏无人提的灯。灯下守着浮黎留下的梦影。', 'fuli|归儿。你不该来的。', '?!flag:fuli_killed yangui|师父——为什么？', '?flag:fuli_killed yangui|……连你的影子，也要拦我吗。'], post: ['fuli|我想替你扛下这一切。……可我错了。', '?flag:fuli_killed n|梦影散了。灯还亮着。'],
      choice: { key: 'fuli_fate', q: '浮黎放下了灯。', opts: [
        { t: '「我原谅你。回家吧，师父。」', canon: 'forgive', fx: ['flag:fuli_forgiven', 'aff:fuli+10', 'hope+3'], after: 'fuli|……你长大了。' },
        { t: '「先跟我走完这一程，再说原不原谅。」', fx: ['aff:fuli+4', 'var:mercy+1'], after: 'fuli|好。这一程，我跟着你。' },
        { t: '「你欠的，要还。」', canon: 'kill', vnOnly: true, fx: ['hope+1'], after: 'n|灯芯轻轻一跳，熄了。你没有回头。' } ] } },
    boss: { pre: ['n|长夜之神玄冥从黑水中升起，衣袍上满是熄灭的星。', 'boss|烛龙睁眼，万物会被灼伤。闭眼，万物会在梦里安睡。', 'boss|你要替所有人选吗？', 'yangui|不。我要把灯分给所有人，让他们自己选。'],
      post: ['boss|……那就让我看看，你分出去的灯能亮多久。', 'n|最后一片烛瞳落进晏归的掌心。远方，烛龙的眼皮微微颤动。'],
      choice: { q: '七瞳齐聚。烛龙的眼皮在颤动。', opts: [
        { t: '把七瞳收好，回主城', fx: ['hope+2'], after: ['?ch>=11 n|主线的终章，已经在前面等你。', '?!ch>=11 n|天亮之前，还有最后一段路——主线里，你还没走到这里。'] },
        { t: '再看一眼长夜', fx: ['var:mercy+1'], after: 'n|长夜也很美。只是不该永远。' } ] } },
    hidden: { pre: ['n|归墟最深处，有一张空着的座位，座位上放着一盏灯。', 'fuli|那是给你留的。三百年前就留好了。'], post: ['?flag:fuli_forgiven fuli|归儿，这盏灯……以后你来守。', 'yangui|不。我们一起守。'] },
  },
};

/** 条件：在 cond() 之上增加 ch>=N（主线进度）与 act:区域（闯关已通该区） */
function bcond(c){
  return c.split('|').some(or => or.split('&').every(a0 => {
    let a = a0.trim(), neg = false; if (a.startsWith('!')) { neg = true; a = a.slice(1); }
    let r; const m = a.match(/^ch(>=|<=|<|>|==)(\d+)$/);
    if (m) { const v = vnProgress(S), n = +m[2]; r = m[1] === '>=' ? v >= n : m[1] === '<=' ? v <= n : m[1] === '<' ? v < n : m[1] === '>' ? v > n : v === n; }
    else if (a.startsWith('act:')) r = !!S?.act?.cleared?.[a.slice(4) + '_10'];
    else r = cond(a);
    return neg ? !r : r;
  }));
}
/** 说话人已不在（主线中失去 / 浮黎已被斩）时，这句台词不再出现 */
function absent(who){
  if (!S || !who || who === 'n' || who === 'boss' || who === 'yangui') return false;
  if ((S.lost || []).includes(who)) return true;
  return who === 'fuli' && !!S.flags?.fuli_killed;
}
/** 解析一行；不满足条件返回 null */
export function parseLine(raw){
  let s = String(raw), c = null;
  if (s.startsWith('?')) { const sp = s.indexOf(' '); c = s.slice(1, sp); s = s.slice(sp + 1); }
  if (c) { try { if (!bcond(c)) return null; } catch (e) { return null; } }
  const i = s.indexOf('|');
  const ln = { who: s.slice(0, i), text: s.slice(i + 1) };
  return absent(ln.who) ? null : ln;
}
export const lines = arr => (arr || []).map(parseLine).filter(Boolean);

/** 主线是否已经走过该区域（用于选择「重逢」开场） */
export function vnPast(region){
  const r = REGION_CH[region]; return !!r && region !== 'jincheng' && vnProgress(S) > r[1];
}

/** 关卡对应的剧情片段 */
export function beatsFor(stage){
  const R = stage && REGION_STORY[stage.region];
  if (!R || !stage || (stage.kind !== 'normal' && stage.kind !== 'boss' && stage.kind !== 'hidden')) return null;
  const out = { region: stage.region, R, key: stage.id };
  if (stage.hidden) { out.intro = R.hidden?.pre; out.outro = R.hidden?.post; return out; }
  if (stage.idx === 0) { out.card = { t: R.chapter, s: R.sub }; out.intro = vnPast(stage.region) && KNOWN_INTRO[stage.region] ? KNOWN_INTRO[stage.region] : R.intro; }
  if (stage.idx === 4) { out.bossPre = R.mid?.pre; out.outro = R.mid?.post; out.choice = R.mid?.choice; }
  if (stage.idx === 9) { out.bossPre = R.boss?.pre; out.outro = R.boss?.post; out.choice = R.boss?.choice; out.nextCard = R.next ? { t: '下一程 · ' + R.next, s: '主线推进' } : null; }
  const SB = STAGE_BEATS[stage.region]?.[stage.idx];
  if (SB) out.intro = SB.in;
  const barks = {};
  if (R.barks && (stage.idx % 3 === 1 || stage.idx === 0)) Object.assign(barks, R.barks);
  if (SB?.lore) barks[1] = SB.lore;
  out.barks = Object.keys(barks).length ? barks : null;
  return out;
}

/** 抉择对后续关卡的影响：仁（mercy）与狠（ruthless） */
export function storyMods(){
  const v = S?.vars || {}; const m = v.mercy || 0, r = v.ruthless || 0;
  const mods = { atk: 1, foeHp: 1, hp: 1, tag: [] };
  if (m >= 2) { mods.hp = 1 + Math.min(0.15, 0.04 * m); mods.tag.push(`仁心 · 生命 +${Math.round((mods.hp - 1) * 100)}%`); }
  if (r >= 1) { mods.atk = 1 + Math.min(0.15, 0.05 * r); mods.foeHp = 1 + Math.min(0.2, 0.06 * r); mods.tag.push(`狠决 · 攻击 +${Math.round((mods.atk - 1) * 100)}%，敌人更凶`); }
  return mods;
}
