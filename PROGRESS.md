# progress notes (for agent continuity)

## Premium Fix 返工 · 2026-10-25 ~13:40 Asia/Shanghai

用户否定 polish3（17312ad / t27u「你做的什么东西啊」）。本轮按可上架横屏手游观感返工，不辩解。

### A. 主角形象统一半身精品
- `pose.js`：`hubPose` → `idle`（`yangui_idle.webp`）；`lamp` 改名 `lamp_chibi` 并注明仅小尺寸；VN 灯相关用 `lamp_por`；title/result 半身
- 标题 / 枢纽左侧 / VN / 结算立绘同一画风，**禁止 hub 主展示 Q 版**

### B. 战斗特效收敛（质量 > 糊屏）
- `settings.fx` 默认 **1（中档）**；`fxCap`/`fxMul`/`ring`/`shock` 上限下调
- 粒子改圆形；`fxBurst` 仅短刀光+局部火花；砍多层同心金环、满屏方块、长白闪
- `hooks.js` 灯光环透明度/描边大幅减弱（此前糊屏主因）；瞳/梦/共鸣克制
- `.ak-msg` / phase 字幕缩短、不挡中心过久；combo 里程中档仅文字

### C. 枢纽高级填图
- 磁贴改 `htile-art` + `htile-shade` DOM（规避 CSS `!important` 吃掉 inline 背景）
- 5 主入口用不透明 stagecard/bg 裁切；「更多」行加 `hm-art` 小图
- 左侧半身立绘 cover 铺满；减弱金描边/glow

### 验收
- `npm run build` OK；boot→hub `errs:[]`；hubPor=`yangui_idle.webp`
- 截图 `docs/premium_fix/`：01_title 02_hub 03_hub_more 04_vn 05_action 06_action_vfx 07_result
- 自检：枢纽立绘半身精品非 Q 版；06 VFX 角色轮廓可读（脚底柔光+火花，无金环糊屏）
- 本地 commit；**未 push**；无 APK；未耗 MiniMax

### 诚实缺口
- 战斗内角色仍是侧视小体型精灵（玩法层），与半身立绘是两套资源——符合动作手游惯例，未强行换成半身进战场
- 结算页右侧立绘偏靠边裁切，主体完整度不如枢纽；更多面板第 6 行（菜单）可能被裁
- fx 高档（2）仍可再压；个别旧 gold UI 未本轮全清

---

## Genshin-like Title + De-AI Polish · 2026-10-25 ~13:20 Asia/Shanghai

覆盖上一轮「多按钮漆金」方向。按用户三点：标题像原神点屏进入、枢纽少而精、去 AI 味。

### 1. 标题（原神式）
- 移除「新的旅程」大漆金钮、山海闯关等并列入口、底部档/忆/成/设圆形按键排
- 整屏可点进入（有档继续 / 无档新开）；底栏半透明长条「轻触屏幕开始/继续」，呼吸低对比，非按钮形态
- 角落仅极小「档」「设」图标；Logo 去掉金箔立体堆叠，改为克制光晕

### 2. 枢纽精简
- 主入口 5 个：闯关 / 剧情 / 伙伴 / 试炼 / 更多；异兽、铁坊、建设、秘境、探索收进「更多」面板
- 去掉 hub-hooks 灯芯/烛瞳等芯片条；磁贴文案极短；立绘区更大更干净；留白

### 3. 去 AI 味（字体 / 特效 / 层级）
- `premium.css` 重写为克制奢华；theme/hub 减弱 letter-spacing、金渐变字、glow 描边
- 烬粒默认更少更淡（fx dust 10 / ambient 28）；转场更短更干净；VN 对话框去装饰噪音
- 战斗 HUD 保留可用性，ready-pulse / 闪白更克制

### 验收
- `npm run build` OK；boot→hub `errs:[]`；磁贴 `[闯关,剧情,伙伴,试炼,更多]`
- 截图 `docs/premium_polish2/`：01_title / 02_hub / 03_action / 04_vn（844×390@2x）
- 本地 commit（genshin-like title + de-AI polish）；**未 push**；无 APK；未耗 MiniMax

### 诚实缺口
- 战斗技能钮仍偏密（玩法需要），未做大改布局
- 标题/枢纽去味到位；全局个别旧 gold 按钮/结算字距仍可再压一轮
- VN/action 截图为编排/战斗中态以保证可读

---

## Premium Juice Pass · 2026-10-25 ~13:10 Asia/Shanghai

对标正式横屏手游观感，做了一轮 **Premium Juice Pass**（不推翻玩法、不删 17 手摆关、不 APK、不 push）。

### A. 全局视觉与转场
- 新增 `app/src/premium.css`；`main.js` `show()` 统一 **fade / gold 金纹擦除 / ink / slide**（按 screen 类），禁止硬切
- `#zlj-dust` DOM 烬粒层（`fx.ensureDust`，随 `settings.fx` 可关）+ 既有 canvas ambient
- 标题：漆金主按钮、次级入口收成 **档/忆/成/设** 图标行、灯芯呼吸点、标题呼吸光；触控 ≥44px

### B. 枢纽 / 菜单 / 卡片
- hub 磁贴圆角/内阴影/按下光边；`t-adv` 流光；红点脉冲
- 资源条 `bumpRes` count-up + `.pop`
- 结算：称号砸入、★ 星级弹出、`.rs-react` 入场；奖励弹窗物品飞出 + `ui_reward` 音效

### C. 战斗手感与 HUD
- 伤害数字分色：普攻/暴击/火/冰/技能/治疗/破灯；暴击更大 + 闪白 + 震屏
- 技能 CD 扫光 + `ready-pulse`；摇杆/键位手游皮肤描边
- 受击闪白、精英/Boss 击杀慢镜、Boss 阶段 **砸屏字幕** `.ak-phase`

### D. VN
- 对话框材质/金线、名牌左边线、◆ 呼吸、立绘微呼吸；选项按压与 `.picked`

### E. 音效与反馈
- `ui_open` / `ui_close` / `ui_reward` / `clear`；面板打开 haptic light；结算 success/warn；Capacitor 失败静默

### 验收
- `npm run build` OK；冒烟 hub `errs:[]`
- 截图 `docs/premium_polish/`：01_title / 02_hub / 03_action / 04_result / 05_vn（844×390@2x）
- 本地 commit；**未 push**；**无 APK**；未消耗 MiniMax

### 仍存诚实缺口
- 动作场景仍叠在 hub DOM 上（launch 未先 clearScreens），观感依赖 z-index；可再统一挂 `show()`
- 非手摆关视觉密度、部分 VFX 仍网格形变；无真机触控/震动实机验收
- 结算/VN 截图为编排态以保证可读（星级与对白框样式与实机 CSS 一致）

---

## 中后期关卡 / 手感 / 进度抛光 · 2026-10-25 ~12:45 Asia/Shanghai

### 1. 手写招牌关（青丘→归墟）
- 新增 `app/src/action/handStages.js`：`HAND` 覆盖 **17** 个 signature 关（`SIGNATURE_IDS`）
  - 青丘 `qingqiu_5` 狐冢 / `qingqiu_7` 月下竹海
  - 东海 `donghai_4` 发鸠山道 / `donghai_9` 九婴潮穴
  - 常羊 `changyang_6` 夔鼓之台 / `changyang_10` 常羊山巅
  - 昆仑 `kunlun_5` 悬圃 / `kunlun_8`
  - 混沌 `hundun_6` / `hundun_10`
  - 羽谷 `yugu_5` / `yugu_9`
  - 北海 `beihai_5` / `beihai_9`
  - 归墟 `guixu_3` / `guixu_8` / `guixu_10`
- 每关含 `platsLayout`（相对坐标平台）、hazard、dreamWaves、护灯/限时/精英房、多阶段首领（`_handBossInArenas`）
- `stages.js`：中后期程序关加密度；塔楼精英/梦层/护灯特殊层；首领连战喘息波；秘境 platsLayout；`applyHandStages`

### 2. 手感（engine.js）
- coyote 0.1s；jump/dash/atk 缓冲 0.14/0.12/0.1
- 冲刺窗口与 CD 微调；hit-stop / shake 分层（普攻/暴击/重击/连击里程碑/首领击杀）
- 首领 tele 预警加长 + 绘制脉冲更显眼
- 连击里程碑反馈 10/25/50/100；PLATS 布局 0–9；`platsLayout` 优先

### 3. 中后期进度
- `foes.js` late / bossLate 曲线；`gear.js` midBoost（lv≥14）；中期掉装倍率
- `data.js`：皮肤解锁提前（8/18/30/tower15/48/tower40）；技能 UNLOCK_LV `[1,1,3,5,7,10,14,18]`
- 塔楼有意义层、秘境更难、rush 喘息节奏

### 4. 内容密度
- 新增 `midEvents.js`：同伴 REACT、关间 SIDE、midClearGifts（金币/材料/软 flag）
- `progress.js` 通关后挂反应与关间事件；`hub.js` result 显示 `.rs-react`

### 5. UX / 截图
- `action.css`：烛瞳/闭目/共鸣手机横屏可读；连击 pop
- `style.css`：`.rs-react` / `.rs-rline`
- `docs/polish_mid/`：01_hub / 02_qingqiu_map / 03_signature_detail / 04_action_fox_tomb / 05_eye_ux / 06_dream_ux / 07_result_reactions（844×390@2x）
- `__zlj` 暴露 `launch` / `STAGES` / `SIGNATURE_IDS`（便于截图与调试）

### 校验
- `npm run build` OK；`boot2` → `{"mode":"hub","errs":[]}`
- **无 APK**；**未 push**（除非再要求）

### 仍缺口
- 非 signature 中后期关仍偏程序密度；手写关内视觉 QA（hazard/梦翻台）未逐关人工打通
- 中后期 VN 剧情厚度仍靠既有章节 + 软 flag，未大段新写
- 塔楼/秘境/rush 可再加专属字幕与掉落表

---

## 完整向实质 Pass · 2026-10-25 ~12:40 Asia/Shanghai

### 做了什么
1. **Stub 审计**：枢纽异兽/铁坊/烬城/试炼/信物秘境均为完整闭环；去掉 `S.city.tower` 死字段；无「敬请期待」空按钮。
2. **前 30 分钟手感**：烬城前三关短波次、无精英/无 hazard、目标清场；`foeStats` 低等级系数；招牌教程弹窗（灯芯/烛瞳/闭目/共鸣）；`STAGE_FLAVOR` 关内字幕。
3. **系统变实**：首通送锻材/夜鬼灵魄×3/建设材料；异兽 `petTrait` 助战说明；铁坊/镇妖塔文案；烬城升级早期更便宜；每日任务 +闭目/烛瞳。
4. **README**：明确 **不提供 APK**，完整自建 Web → cap sync → gradlew 步骤。
5. **文档**：ASSETS_COUNT 音乐 15 主题；CREATIVE_HOOKS 教学段；ENDINGS 保持 15；本段 PROGRESS。
6. **截图**：`docs/final_shots/` 手机视口 844×390@2x ×6：01_title / 02_hub / 03_adventure / 04_secret / 05_pets / 06_clearcard。
7. **杂项**：标题脚注结局数 0/6 → **/15**。

### 校验
- `npm run build` + boot 冒烟；**无 APK**

### 诚实缺口（见最终汇报）
- 中后期关卡仍偏程序生成密度；部分动画为网格形变非手绘；AI 功能需玩家自填 Key；无官方上架包。

---

## 免费音乐管线 + 混音接线 · 2026-10-25 ~12:30 Asia/Shanghai

### 音乐（MiniMax 禁止重试）
- Token Plan `POST /v1/music_generation` → **HTTP 410**；**未再调用** MiniMax 音乐
- **免费管线**：原创 MIDI（`tools/gen/compose_music.py` + mido）→ FluidSynth + FluidR3_GM.sf2 → ffmpeg 精确时长 + afade → 可循环 **mp3 + ogg**
- 产物 **15 主题** ×2：`app/public/assets/music/theme_{title,hub,battle,boss,dream,win,ending,sad,final,jincheng,qingqiu,donghai,kunlun,beihai,guixu}.{mp3,ogg}`（~7.8MB mp3 + ~11MB ogg）
- MIDI 备份：`art_raw/music_midi/`；署名：`ATTRIBUTION.md`
- **接线**：`src/engine/audio.js` `THEME_BANK` + 别名 soft→dream / epic→final / tense→boss / changyang|yugu|hundun|youdu 区域复用；`MediaElementSource` → `musicBus`；音量走 `applyVolumes`；文件失败回退程序化五声垫乐
- 运行时抽测（Chrome）：title/hub/battle/boss/dream/ending/jincheng 均可 `Audio.play()`，时长约 27–69s
- 区域闯关 / 信物秘境页切入对应 BGM（jincheng / dream 等）

### 页面抛光
- 信物秘境 / 通关札 CSS 签名感（紫辉卡片、通关札入场、下一关脉冲）
- 截图（强）：
  - `docs/polish_shots/hub.png` — 烬城枢纽
  - `docs/polish_shots/secret.png` — 信物秘境（含已解锁 3 关）
  - `docs/polish_shots/clearcard.png` — 通关札 S 卡
  - `docs/polish_shots/adventure.png` — 山海闯关路径

### 校验
- `npm run build` OK；`boot2` mode=action（偶发 ogg 中止请求已改为优先 mp3）
- **无 APK**

### 未做
- HF MusicGen / Spaces（本机无 GPU、无 HF token；MIDI 管线已交付可循环成品）
- 勿再试 MiniMax music




## 信物秘境 + 手感/音乐/美术 · 2026-10-25 12:19 CST

### 里程碑
1. **信物秘境 8 关**（KEY_SECRETS / hub「信物秘境」）：诅咒残灯、密信、假日、梦/墨/金鳞、相柳泪、狐火穗；需道具+旗帜+区第5关；首次通关额外星砂/经验/星髓/梦屑 + 成就 keysecret1/4/8
2. **隐藏后日谈** 72_key_quests.txt 8 段 → 画廊后日谈；story 43 files / ~154k 字
3. **音乐**：Token Plan POST /v1/music_generation → **HTTP 410**（新用户不可用）；保留五声程序化 + theme_*.mp3 免费叠层
4. **SFX**：新增 forge/lamp/pet/tower/ui_open/ui_close/star；铁坊/烬城/异兽/镇妖塔接入
5. **系统判定**：异兽/铁坊/烬城/镇妖塔已是完整可玩闭环 → 只抛光 UX，未另起炉灶
6. **关键美术**：cg/key_secret_realm.webp、cg/key_false_dawn_premium.webp；秘境页用前者作底
7. **build + boot2**：OK，mode=action errs=[]；无 APK

### 未做/后续
- 程序化主题可再补区域特色旋律；若日后开放 MiniMax Audio 再试
- 结局 CG G–O 已齐；可择优重绘个别帧

## 结局扩展 · 2026-10-25 12:14 CST

- **结局数：15（A–O）** — 原 6 + 同伴专属 G–J、师徒 K、噩梦 L、假日 M、密信 N、相柳 O
- **隐藏场景：≥9**（`70_hidden_web.txt`：夜札 / 密信 / 假日种子 / 相柳泪 / 五信物交付）
- **关卡分支：11 段**（`71_branch_choices.txt`）接入序章–第十二章，设 flag / 关键道具 / 好感偏移
- 终章选择树扩至 15 路；画廊锁定剪影 + 解锁提示；成就 end_g…end_o、`all_endings`=15
- 校验：`node tools/validate.mjs` 随机+策略均命中 A–O；`boot2` mode=action errs=[]
- 新增 CG：`end_g.webp`…`end_o.webp`；关键道具见 `items.js`（鳞·金/墨/梦、密信、诅咒残灯、假日之种、五信物、夜札、相柳泪）
- 文档：`ENDINGS.md`、`STORY_BIBLE.md` 已同步
- 无 APK；build 通过（story ~153k 字 / 42 files / 8522 cmds）

- Android SDK: /home/box/android/{jdk17,sdk}; emulator + android-30 x86_64 image installed; /dev/kvm present
- Art raw images in /workspace/game/art_raw (MANIFEST.txt). copy helper tools/cpimg.sh
- Done: title_keyart, 16 portraits (p_*)
- MiniMax key: runtime only! (user changed mind). Only tiny test calls allowed.
- Done: icon sheets 4x4: weapons armor charms consum mats relics skills (order as in prompts)
## icon sheet orders (row-major, 0..15)
weapons: lantern-blade, jade spear, black iron saber, golden longbow, bronze axe, fox-fire fan, bone dagger, star-iron sword(blue), vine whip, feather spear, sun-disc bow, obsidian greatsword, thunder halberd, crimson flame blade, frost crystal sword, dragon-scale glaive
armor: lampkeeper robe, white fox cloak, feather robe, bronze scale armor, leaf cloak, orange runner robe, jade plate, crimson silk robe, snake-scale armor, cloud taoist robe, tiger vest, star night cloak, bronze armor(was shield), frost silver robe, sun-gold armor, dragon-scale imperial robe
charms: jade bi, fox-tail, red bell, gold sun amulet, east sea pearl, bronze mirror, star crystal ring, phoenix feather hairpin, tiger tally, black snake bracelet, peach-wood talisman, moon jade ring, incense pouch, dragon eye gem, silver frost locket, bronze coin
consum: red pill, blue gourd, gold pill, jade bottle, lingzhi, peach, bun, tea, incense, antidote herb, talisman, wine jar, lamp oil jar, purple vial, smoke bomb, gold cauldron
mats: star-marrow crystal, fur tuft, salt crystals, white feather, bronze ore, raw jade, snake scale, fang/claw, herb roots, ink stone, cinnabar, silk thread, bone, ember coal, frost crystal, gold sand
relics: dragon scale, eye shard, fox fire orb, jingwei pebble(black egg), xingtian mask, kunlun jade token, sun ember ring, drought chain, serpent fangs, night pearl, baize scroll, dijiang bell, kuafu staff, orchid, abyss vial, star compass
skills: metal, wood, water, fire, earth, light, dark, heal lotus, shield, poison, ice, lightning, fox illusion, arrow volley, roar(dragon), lantern ult
## enemy sheets 3x3 (row-major)
a: shadow ghoul(夜鬼), lantern wraith(灯魇), blue fox phantom(狐魅), gudiao(蛊雕), chiru(赤鱬), poison jellyfish(毒水母), jiaoren(鲛人), sea wraith(海怨), storm bird(怨禽)
b: headless soldier(无首兵), bone drum golem(骨鼓傀), kui(夔), toulou(土蝼), qinyuan(钦原), yingzhao(英招), jade lion(玉狻猊), jade toad(玉蟾), zheng(狰)
c: chaos blob(混沌残影), huan(讙), bifang(毕方), sun crow skeleton(骸乌), scorched walker(焦尸), sand python(沙蟒), drought servant(旱奴), fire rat(火鼠), fei(蜚)
d: ice jiao(冰蛟), nightmare mo(梦貘), tubo(土伯), black serpent guard(黑蛇卫), kun(鲲), dream butterfly(梦蝶), star golem(星骸), abyss eye(渊瞳), yaksha(夜叉)
- ART DONE (74 gen calls): + end_a..f, cg_* (dengjin jingwei xingtian kuafu xiwangmu dijiang ba baiji xiangliu fuli baize duijue)
- worldmap layout: snow mtn top-left(昆仑), ice top band(北海/幽都 top-right-ish), dark mtn center(不周/烬城), red desert left(禺谷/赤水), forest east of center(青丘), grey swirl lower-left/center(混沌), coast+islands bottom-right(东海), whirlpool far right(归墟)
- NEXT: slice sheets -> public/assets webp; scaffold vite
## 2026-10-25 session (resumed)
- DONE: engine (state/audio/ai/ui/fx/battle/vn), data, main.js, ui/{screens,menu,camp,ending}.js, style.css, vite.config.js, capacitor.config.json, icon (assets/ui/icon.webp from bg/zhulong_eye)
- DONE: portraits background-removed via rembg (venv /home/box/rembg-venv); RGB originals in art_raw/por_rgb; luwu/qi/xiangliu use soft ellipse alpha
- Build OK with stub story; smoke test (test/smoke.mjs, playwright-core + /usr/bin/google-chrome, vite preview :4173) works
- Story DSL: '>' narration, '名字：' dialogue, '? [cond] text -> label | effects', must have label 'start'
- NOW: writing src/story/00_prologue.txt .. 13_finale.txt + side.txt (check ls src/story for which exist)
- THEN: validate.mjs, playwright playthrough+screenshots, cap android, keystore, signed apk, emulator, README
- [done] Story chapters 06–12, 13_finale, side quests (20_side_a, 21_side_b) written; `npm run story` compiles: 16 files, 2042 cmds, 247 labels, ~26k chars.
- [next] build, tools/validate.mjs, playthrough screenshots, android.
- [done] FIX: quests.js Q() lacked `id` (S.quests[q.id] was 'undefined' → quest completion broken). Fixed.
- [done] 羁绊夜话 system: data/bonds.js + story/30_bonds_a.txt, 31_bonds_b.txt (22 scripted campfire scenes, non-AI), camp button, ach bond/bond_all.
- [done] Ending D explicit option [hope<50]. Validator: random dist A/B/C ~870 each, E~200, F~140, D~30; greedy hits A,B,C,E,F. 2400 cmds, 29k chars.
- [next] Playwright playthrough + screenshots, then android.
- [done] mainnode placement fix (mainPos avoids overlapping nodes). window.__zlj test hook. test/play.mjs full playthrough bot (auto battle, quests, bonds, screenshots).
- [done] Android: `npx cap add android`, sensorLandscape, minSdk 23, immersive MainActivity, icons/splash from art_raw/icon512.png & bg zhulong_eye. Keystore /workspace/game/keystore/zhulongji.jks + keystore.properties (passwords there; build.gradle reads it). assembleRelease OK (36MB, signed, key-free verified).
- [next] finish playthrough, review shots, copy APK to dist/lingjing-game.apk, emulator test, README.

## 2026-10-25 02:50 (UTC+8) 收尾阶段
- 全局修复：ui.js 顶部补丁让 append/prepend/replaceChildren 忽略 null/false（修 camp/menu 的 "null" 文本）
- 通关机器人第 1 轮：688 秒打完全流程，结局 B，无 JS 错误；支线仅完成 1 条（机器人未刷怪），已给 play.mjs 加刷支线逻辑、对白/CG 截图降速、截图前清 toast，正在跑第 2 轮
- APK 已重建并复制到 dist/lingjing-game.apk（35MB，release 签名，已验证不含 Key/keystore）；dist/web 已复制；README.md 已写
- 模拟器：KVM 在此机器上 vcpu 创建触发内核 fault（嵌套虚拟化不可用），改用 -accel off（TCG）启动 AVD zlj，启动很慢
- 03:00 运行时 AI 实测（直接调用游戏 src/engine/ai.js）：文本 MiniMax-M3 ✔(2.2s) / 画境 image-01 ✔(30s，样图 screenshots/ai_paint_test.jpg) / 配音 speech-2.8-hd ✔(1.6s) / 额度查询 ✔。累计调用：3 次早期测试 + 本次 3 次生成 + 1 次额度查询
- 02:50 模拟器 TCG 启动成功（boot_completed=1 于 02:43），正在 adb install；通关机器人第 2 轮进行中，02_dialogue/05_combat/11_cg 已复核良好
- 03:00 模拟器：TCG 冷启动 ~5 分钟，APK 安装成功（Success），应用进程启动、横屏沉浸式、WebView 已绘制标题粒子层；但 TCG 太慢（系统多次 ANR），标题图文未在时限内绘完。已停止模拟器。截图 screenshots/emulator.png
- 03:06 通关机器人第 2 轮：1235 秒，结局 A，完成 8 条支线 + 19 段羁绊，战败 2 次（均自动重试获胜），0 个 JS 错误；全部截图已复核，无需再改代码，APK 无需重建。✅ 交付完成
- 03:10 精简版 APK：splash 由 11 张 PNG(~14MB) 转 WebP q78(1.4MB，原图备份于 art_raw/splash_backup)；游戏资源/代码未改动。dist/zhulongji-lite.apk 20,622,758 字节（≈19.7MiB），同一 keystore 签名（SHA-256 273e7cc7…），不含 Key/keystore；Web 冒烟测试通过（序章自动推进至区域地图，0 错误）

## v1.1 改版（2026-10-25）
- 拍了 915×412@3x 的 v1 全界面截图（screenshots_v1crit/），写出 CRITIQUE.md：界面网页感、无探索、自动战斗即最优、成长空洞。
- [状态补记 10:25 UTC+8] 已完成（未 git，靠文件）：
  - 设计系统 theme.css（按钮/面板花框/toast/教程环/奖励弹窗/标题/电影式 VN/墨晕转场）
  - 横版行走探索 engine/explore.js + explore.css（摇杆、攻击/互动键、小地图、目标追踪、跟随队友、宝箱/采集/谜题/石灯阵/精英/灯斩先手）；test/ex.mjs 0 错误
  - 战斗：灯斩眩晕、击破/反应成就、新音效（slash/fire/break）；进度数据 data/progress.js（星命/套装/精炼词条/灯阶）已接入 state.stats()
  - 新 ui/progress.js：星命面板、精炼面板（+1..+5，+3/+5 词条）、套装显示、灯阶面板；menu.js 队伍页子标签（属性·装备/星命/技艺）
  - 营地重做（左火堆舞台+同伴座位可点谈/心事，右侧功能列表+AI 四格）；夜谈加大立绘
  - test/ui.mjs 覆盖以上，0 JS 错误。截图 screenshots_v2/（30 张，915 宽）
  - 待修：营地右侧 .cr 按钮被全局 .btn 样式撑成居中大块；星命节点名字颜色过暗
- 待办：修上述 → 1000×450 截图 → 完整通关 play.mjs → 性能 → 版本号 → APK → 报告
- [10:30] 修：营地 .cr 与片尾字幕类名冲突→改 .cmr；星命名字颜色
- [10:40] 成长 UI 完成并复核（营地/星命/精炼/套装/灯阶，915+1000 两种视口，ui.mjs 0 错误）
- [10:55] 新写 test/play2.mjs（横版探索通关机器人），开始首轮通关
- [10:57] 版本号：versionCode 2 / versionName 1.1 / package.json 1.1.0
- [11:20] play2 修：evaluate 不再等待 act 的 Promise（会挂起）；羁绊分支防死循环

## 新范围（10:41 UTC+8）：v2.0 大扩展（造梦西游式动作闯关、多角色多技能、异兽、家园、塔、日常…资产 1 万+，体积不限，git 管理）
- [10:45] git init（/workspace/game，.gitignore 排除 keystore/密钥/node_modules/构建产物/art_raw/大截图），已验证暂存区不含 Key
- [10:43] ✅ v1.1 检查点 APK：dist/zhulongji-v1.1.apk 22,768,876 字节，versionCode 2/1.1，同证书 273e7cc7…，不含 Key。play2 探索通关机器人仍有挂起问题（待在 v2 测试中修）
- 2026-10-25 11:07 v2.0: action engine (engine.js), data modules (data/foes/stages/gear/progress), state migrate S.act/city/daily, gear affixes in stats, 3 new heroes, new sfx, 19 achievements. User steering: no APK/testing needed; focus on content+assets.
- 2026-10-25 11:18 hub.js + hub.css 完成并接入主菜单/山海图；异种敌人 36 张；build OK，headless 启动与进关无报错
- 2026-10-25 11:31 提交：动画帧(英雄8外观×28帧/敌人与首领16帧/区域异色敌人)、外观系统、技能/状态/装备图标、3名角色立绘
- 2026-10-25 11:35 提交：1008 帧序列特效与播放器、99 关×3 视差层、增益状态栏
- 2026-10-25 11:38 提交：106 张关卡卡面、64 枚成就徽章、72 张区域地面纹理，均已接入界面与战斗场景
- 2026-10-25 11:39 提交：兽蛋/灵药/锻锤图标接入；新增 ASSETS_COUNT.md（11220 个文件，按类别与来源）

## 2026-10-25 创意钩子（用户反馈：要新意、要爆款）
- 写成 CREATIVE_HOOKS.md：灯芯半径 / 烛瞳 / 闭目睁眼 / 灯火共鸣 / 一局两分钟
- 实现 `app/src/action/hooks.js` 并接入 engine（非 stub）：灯域虚弱夜鬼、隐身显形、烛瞳弱点必暴、梦层平台与敌人变形、共鸣槽+换人加成+合击切镜、S 评价加成、HUD 目标条
- stages 每场附 dreamWaves；通关札 + 下一解锁预告；HUD/CSS 精修

## 2026-10-25 创意钩子后续
- 幕间 i9–i12（42_interlude_c）+ 章节跳转接线；故事编译 ~49k 字 / 22 文件 / 473 labels
- 羁绊残卷 32_bonds_c（相柳/玄冥/烛龙/阿婆）+ 营火「长夜残卷」入口
- 关键艺术三张接入标题/枢纽/通关札；关卡 flavor desc + S 条件 chip
- build + boot2 通过（action mode, 0 errs）

## 继续内容（同日）
- 50_epilogues 后日谈 + 画廊入口；51 九州长夜志；52 营火手记
- cond 支持 ending:X；故事编译约 57k 字 / 25 文件 / 505 labels（持续朝 150k 推进）
- STORY_BIBLE.md

## 2026-10-25 创意深化（续）
- 故事扩至 ~100k+ 字：灯典/书简/民俗加厚/支线丙/梦境日记/营火长谈/夜祭/华彩/路人夜谈
- 新关键艺术：key_lamp_radius、key_candle_eye、key_hub_sanctuary（枢纽背景换圣所）
- 画廊接入灯典、书简、梦日记、夜祭；通关札 CSS 光泽动画
- build + boot2 OK；持续朝 150k 推进
- 故事编译约 14.8万字 / 38+ 文件 / 849+ labels（逼近 150k）

## 里程碑
- 故事编译 **150516 chars** / 40 files / 8198 cmds / 912 labels（达标 ~150k）
- 招牌系统可玩 + CREATIVE_HOOKS.md；关键艺术 6 张招牌画
- 无 remote，push 待配置；无 APK；boot2 清洁

## 2026-10-25 Premium Polish3 · 多姿态主角 + 填图 + combat VFX（Asia/Shanghai）
- 晏归多姿态：`tools/gen/yangui_poses.py` → `app/public/assets/por/pose/yangui_{idle,lamp,lamp_por,battle,think,smile,hurt,cast,title}.webp`；`app/src/engine/pose.js` 按 hub/VN mood/result/title 切换
- 枢纽填图：5 主磁贴 +「更多」行均挂 stagecard/场景底图；通关札 `rs-hero` 笑/伤姿态；标题 `t-hero-fig` 用 title 姿
- **战斗 VFX 大幅加强**（`action/engine.js` + `hooks.js` + CSS）：
  - `settings.fx` 0/1/2 预算（关/简/全），粒子 cap 可降
  - 普攻双层刀光 + 火花 + 终结冲击波/裂痕/速度线；暴击 shock+闪白；击杀碎裂/残影/消散
  - 技能元素色：火环/雷弧/灯金/梦青/瞳红；nova/quake/dash 强化
  - 连击里程碑全屏 `.ak-mile`；Boss 预警圈脉冲、砸地 shock+crack、阶段字幕+粒子爆发
  - 灯芯内焰、烛瞳弱点光环、闭目梦尘、共鸣冲击与裂地
  - 残影/速度线（冲刺）；受击闪白+火花
- 截图 `docs/premium_polish3/`：01_title 02_hub 03_hub_more 04_vn 05_action **06_action_vfx** 07_result；shot 脚本 errs:[]
- 禁止 MiniMax / 不 APK / 不 push；本轮并入同一 commit
