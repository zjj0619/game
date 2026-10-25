// 24 条支线。need: kill{敌人:数量} / item{物品:数量} / win:遭遇 / none
// start/done 为 story/side.txt 中的标签；unlock 为解锁旗标
const Q=(id,name,region,giver,x,y,unlock,desc,need,reward)=>[id,{id,name,region,giver,x,y,unlock,desc,need,reward,start:id+'_s',done:id+'_d'}];
export const QUESTS = Object.fromEntries([
  Q('sq01','卖馒头的阿婆','jincheng','阿婆',66,44,'reg_jincheng','阿婆的儿子出城取星髓，三天没回来。坠星坑附近有夜鬼出没。',{kill:{yegui:4}},{gold:120,items:{u_bun:5},exp:60}),
  Q('sq02','熄灭的路灯','jincheng','老灯匠',40,82,'ch1_done','烬城东街的灯一盏接一盏熄灭。老灯匠需要星髓晶修灯。',{item:{m_starmarrow:3}},{gold:200,items:{c_redbell:1},exp:150,aff:{}}),
  Q('sq03','狐狸娶亲','qingqiu','小狐狸',56,74,'reg_qingqiu','一只小狐狸要出嫁，可是迎亲的路上全是狐魅。',{kill:{humei:5}},{gold:300,items:{c_foxtail:1},exp:200,aff:{baiji:5}}),
  Q('sq04','九尾的鳞','qingqiu','狐族长老',30,48,'ch1_done','长老说：青丘禁地里埋着一枚“会发热的鳞”。去取它，需要先击败迷踪林里的怪物。',{kill:{huan:3}},{items:{k_scale3:1},exp:300}),
  Q('sq05','涂山的信','qingqiu','狐族信使',12,30,'ch2_done','涂山娇想托你把一封信带给白霁。只是，信要你亲手交。',{none:1},{items:{u_jadebottle:1},aff:{baiji:8},exp:200}),
  Q('sq06','衔石','donghai','老渔夫',50,56,'reg_donghai','老渔夫说，礁石滩的赤鱬吞了他亡妻的发簪。',{kill:{chiru:4}},{gold:400,items:{c_pearl:1},exp:300,aff:{xianwei:5}}),
  Q('sq07','鲛人之泪','donghai','鲛人少女',72,48,'ch2_done','鲛人少女的姐姐被毒潮污染，变成了海怨。',{kill:{haiyuan:2}},{gold:500,items:{a_featherrobe:1},exp:400}),
  Q('sq08','海盐与草药','donghai','渔村郎中',25,30,'reg_donghai','毒潮让村里的孩子病倒了。郎中需要海盐晶和草根。',{item:{m_salt:4,m_herb:4}},{gold:300,items:{u_lingzhi:2},exp:300,aff:{xianwei:3}}),
  Q('sq09','断戟','changyang','老兵魂',28,30,'reg_changyang','一个老兵的魂魄在找他的戟。它被骨鼓傀吞进了肚子里。',{kill:{gugukui:3}},{gold:600,items:{w_bronzeaxe:1},exp:500,aff:{qi:5}}),
  Q('sq10','狰之巢','changyang','猎户',72,28,'ch3_done','两只狰在山顶筑巢，猎户不敢上山。',{win:'sq_elite1'},{gold:900,items:{c_tigertally:1},exp:800}),
  Q('sq11','无名之碑','changyang','守墓人',88,72,'ch3_done','守墓人为十万战魂立了一块无字碑。他想请戚为碑题一个字。',{none:1},{items:{u_cauldron:1},aff:{qi:8},exp:300}),
  Q('sq12','白泽的作业','kunlun','书童',70,22,'ch4_done','白泽的书童要抄写一部异兽志，却缺墨石。',{item:{m_ink:5}},{gold:700,items:{c_starring:1},exp:700}),
  Q('sq13','陆吾的第四试','kunlun','陆吾',88,64,'ch5_done','陆吾说，三试之外还有一试：击败雪坡上的十只异兽，他就告诉你一个秘密。',{kill:{yingzhao:3,qinyuan:3,suanni:2,yuchan:2}},{items:{k_scale4:1,a_tigervest:1},exp:1200}),
  Q('sq14','瑶池的桃','kunlun','青鸟',22,30,'ch5_done','西王母的青鸟丢了三只蟠桃，似乎被玉蟾偷走了。',{kill:{yuchan:3}},{items:{u_peach:2},exp:900}),
  Q('sq15','七窍','hundun','帝江的乐师',62,30,'ch6_done','混沌之宫的乐师想知道：如果给每一个残影都凿一窍，它们会变成什么？',{kill:{hundunyy:6}},{gold:1200,items:{k_bell:1},exp:1300,aff:{ali:6}}),
  Q('sq16','等的人','hundun','阿篱的回忆',86,70,'ch6_done','阿篱在等的人留下了一株兰花，也许在混沌深处还能找到更多。',{item:{m_cinnabar:3,m_ink:3}},{items:{k_orchid:1,c_incense:1},aff:{ali:10},exp:1000}),
  Q('sq17','渴','yugu','焦渴的旅人',28,26,'ch7_done','一个旅人在沙海里渴了三百年。他要的不是水，是一个答案。',{none:1},{gold:800,items:{u_goldpill:2},aff:{kualing:6},exp:1200}),
  Q('sq18','邓林','yugu','夸铃',12,40,'ch7_done','夸铃想在邓林的残桩上种出一棵桃树，需要余烬炭和金沙作肥。',{item:{m_ember:4,m_goldsand:4}},{items:{k_scale5:1,k_staff:1},aff:{kualing:10},exp:1500}),
  Q('sq19','旱奴营','yugu','逃奴',70,88,'ch8_done','旱奴营里关着一些还没被烤干的人。',{win:'sq_elite2'},{gold:2000,items:{a_crimsonsilk:1},exp:2400}),
  Q('sq20','冰下的梦','beihai','冰洞老妪',26,80,'ch9_done','老妪说，她的孙子被梦貘吃掉了梦，从此再没醒来。',{kill:{mengmo:3}},{gold:1600,items:{c_moonjade:1},exp:2400}),
  Q('sq21','玄蛇之鳞','beihai','玄鸟',72,18,'ch9_done','玄鸟说，烛龙的一枚鳞片被黑蛇卫藏在冰原下。',{kill:{heishe:5,bingjiao:2}},{items:{k_scale6:1},exp:2800}),
  Q('sq22','幽都的门牌','beihai','土伯之子',92,62,'ch10_done','土伯的孩子想离开幽都看看外面，却需要一颗夜明珠作通行证。',{item:{m_frost:4,m_silk:3}},{items:{k_nightpearl:1,u_peach:1},exp:2600}),
  Q('sq23','星骸墓场','guixu','守墓的星',88,58,'ch11_done','三颗死去的星在墓场里争吵不休，谁也不肯先睡。',{win:'sq_elite3'},{gold:4000,items:{k_scale7:1},exp:4000}),
  Q('sq24','最后的灯','guixu','无名守灯人',30,86,'ch11_done','归墟里有一盏灯，守着它的人已经守了三百年。他在等一个能接替他的人。',{item:{m_starmarrow:6}},{items:{u_cauldron:2,c_dragoneye:1},exp:3500}),
]);
