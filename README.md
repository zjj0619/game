# 《烛龙纪·长夜山海》

> 烛龙闭目三百年，九州沉入长夜。你是左眼嵌着「烛瞳」碎片的守灯人晏归，提着一盏将熄的灯，走过青丘、东海、常羊、昆仑、混沌、禺谷、幽都，直至归墟——去决定这个世界是重新睁眼，还是永远做梦。

取材自《山海经》《楚辞》的东方玄幻叙事手游（原创玩法，造梦西游仅作灵感参考）：**视觉小说主线 + 横版动作闯关 + 养成**。横屏 · 简体中文 · 完全离线可玩；可选接入 MiniMax 实时 AI（玩家自填 Key）。

> **不提供预编译 APK。** 请按下方「自己构建 Android APK」在本机打包安装。仓库里若有历史 `dist/*.apk`，仅作参考，不保证与当前源码一致，请以自行构建为准。

## 目录

| 路径 | 说明 |
|---|---|
| `app/` | 源码（Vite + 原生 JS + Capacitor 6） |
| `app/src/story/*.txt` | 剧情脚本（自研 DSL → `src/gen/story.json`） |
| `app/src/action/` | 横版动作闯关引擎、关卡、异兽、铁坊、镇妖塔 |
| `app/public/assets/` | 美术 / 音乐 / 字体（随 Web 包进 APK） |
| `docs/final_shots/` | 手机视口精选截图（给展示用） |
| `docs/polish_shots/` | 抛光阶段截图 |
| `DESIGN.md` / `PROGRESS.md` / `ENDINGS.md` / `CREATIVE_HOOKS.md` / `ASSETS_COUNT.md` | 设计、进度、结局、创意钩子、资产统计 |
| `ATTRIBUTION.md` | 字体与音乐署名 |
| `keystore/` | 可选：本机签名用（**勿提交私钥到公开仓库**） |
| `test/play.mjs` | Playwright 自动通关（可选） |

## 内容规模（当前）

- **主线**：序章 + 12 章 + 终章；**15 个具名结局（A–O）**（见 `ENDINGS.md`）
- **闯关**：9 大区 × 11 关（含秘境）+ 8 个信物秘境 + 镇妖塔 100 层 + 每日秘境 + 首领连战
- **招牌玩法**：灯芯半径 · 烛瞳 · 闭目/睁眼叠层 · 灯火共鸣（见 `CREATIVE_HOOKS.md`；前 30 分钟有分关教学）
- **养成**：伙伴技能/装备/外观 · 山海异兽孵化助战 · 铸灯铁坊 · 烬城建设 · 每日任务
- **美术**：见 `ASSETS_COUNT.md`（原画 + 程序派生动画/视差/卡面等）
- **音乐**：15 首可循环主题（mp3 优先，ogg 备选；MIDI+FluidSynth 免费管线，见 `ATTRIBUTION.md`）
- **AI（可选）**：营火夜谈 / 卜筮 / 梦境异闻 / 画境 / 配音——不填 Key 也可完整通关

## 自己构建 Android APK（必读）

目标机建议：**横屏约 20:9**（如 OPPO Find X9s Pro）。需本机具备：

- Node.js 18+、JDK 17、Android SDK（含 `platform-tools`、目标 SDK 与 build-tools）
- 可选：本仓库 `keystore/` 下的签名配置；没有则用 debug 包试玩

### 1. Web 包

```bash
cd app
npm install
npm run build          # 编译剧情 + Vite 打包 → app/dist
# 可选：npm run validate
```

浏览器试玩（无需 APK）：

```bash
npx vite preview --port 4173
# 浏览器打开 http://127.0.0.1:4173 ，建议横屏或开发者工具手机横屏尺寸
```

### 2. Capacitor 同步到 Android 工程

```bash
# 若尚无 android/ 目录：npx cap add android
npx cap sync android
```

### 3. 打 release / debug 包

```bash
cd android
./gradlew assembleDebug      # 产出 app/build/outputs/apk/debug/app-debug.apk
# 或（需配置签名）：
# ./gradlew assembleRelease  # app/build/outputs/apk/release/app-release.apk
```

签名（可选）：在 `keystore/keystore.properties` 配置 `storeFile` / `storePassword` / `keyAlias` / `keyPassword`，并由 `android/app/build.gradle` 读取。**切勿把含真实密码的 properties 或 `.jks` 推到公开远端。**

### 4. 安装到手机

1. 打开手机「允许安装未知来源应用」
2. `adb install -r path/to/app-debug.apk`，或用文件管理器直接点开 APK
3. 打开「烛龙纪」，**横屏**游玩；存档在本机

minSdk 约 23（Android 6.0+）。横屏方向在 Capacitor / Manifest 中已设为 sensorLandscape。

## 实时 AI（「灵感」，可选）

标题或菜单 → **设置 → 灵感（MiniMax AI）** → 启用 → 填入你自己的 MiniMax API Key → 保存。  
Key **只存本机**，不随源码分发；不填也能完整通关。

## 招牌操作速查（动作关）

| 触控 | 键 | 作用 |
|---|---|---|
| 左摇杆 | WASD/方向 | 移动 / 跳 / 落平台 |
| 攻 | J | 连击 |
| 跳 / 冲 | K / L | 二段跳 / 无敌冲刺 |
| 瞳 | E | 烛瞳（弱点、金线、预警） |
| 梦 | R | 闭目 ↔ 睁眼叠层 |
| 灯 | T | 灯火共鸣合击 |

烬城前三关偏教学难度，并会各弹一次招牌说明（灯芯 / 烛瞳 / 闭目）。

## 开发校验

```bash
cd app && npm run build
# 无头冒烟（仓库内既有 boot 脚本时）：
# timeout 90s node ../test/boot2.mjs   # 或 app 内对应脚本
```

**本仓库维护者不向用户分发 APK；请始终自行 `npm run build` + `gradlew` 打包。**
