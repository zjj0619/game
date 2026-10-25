# 手机更新与版本发布

## 玩家怎样更新

第一次从 `https://github.com/zjj0619/game/releases/latest` 下载正式 APK 安装。以后游戏在启动或回到前台时最多每六小时自动检查一次；标题右上「更」或设置中的「检查 GitHub 更新」可随时手动检查。

发现正式新版后，显示版本、大小和发布说明。玩家选择下载，安装包在应用私有目录缓存，可暂停并继续。游戏验证大小、SHA-256、应用包名、递增的 Android 版本号和当前应用签名，随后打开系统安装页面。第一次可能需要在系统设置允许本游戏安装更新；授权后回到游戏点「继续安装」。

Android 的安装确认需要玩家操作。下载不会清除存档，覆盖安装沿用 `com.jiaqi.zhulongji` 的本机数据。不要先卸载旧版。浏览器版提供 GitHub 下载页入口；本更新器针对仓库直接分发的 Android APK，不适用于 iOS 或 Google Play 内更新。

## 第一次配置发布

1. 在 `app/` 安装依赖。若没有签名，运行 `npm run signing:init`。
2. 私下备份根目录的整个 `keystore/` 文件夹。**以后每个正式 APK 必须沿用这一签名。** 此目录被 Git 忽略，禁止提交或作为 Release 附件上传。
3. 安装 GitHub CLI 并完成 `gh auth login`，确认对 `zjj0619/game` 有代码与 Actions secrets 管理权限。
4. 在 `app/` 运行 `npm run github:setup`。它从本机签名配置读取信息，以标准输入设置下面四个 GitHub Actions secrets，不打印密码：
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_STORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
5. 将代码推送到 GitHub，通过 Game checks（Web 检查与 Android debug 构建）。
6. 在 Actions 手动运行 **Android release**，会准备一个草稿 Release；确认附件齐全后发布。也可以给通过检查的提交推送 `v2.1.0` 标签，流程会自动构建并正式发布。

APK、`update.json` 与 `SHA256SUMS.txt` 必须属于同一个 Release。标签发布先创建草稿、上传完毕再公开，避免手机看见上传到一半的版本。

## 后续每次更新

```bash
cd app
npm run release:bump -- 2.1.1
npm test
npm run build
npm run validate
```

编辑根目录 CHANGELOG.md，检查变更后提交。向 GitHub 推送提交和与版本一致的 `v2.1.1` 标签，就会触发正式 Android release。`release:bump` 同时更新 `version.json`、package.json 和锁文件，并递增 Android versionCode。Gradle、标题页和更新器都读取同一版本配置。

不要重复使用已公开的版本号、Android versionCode 或替换已发布的 APK。修复问题时发布新版本，手机只接受版本和 versionCode 都递增的安装包。

## 本机打包

需要 Node 18+、JDK 17、Android SDK 34 和 build-tools 34.0.0。

```bash
cd app
npm ci
npm run android:release
```

产物：`app/android/app/build/outputs/apk/release/app-release.apk`。正式构建缺少签名时会明确失败；debug 包不能覆盖正式签名包。GitHub Actions 已配置相同的构建环境。

## 安全和失败处理

- 应用不内置 GitHub token 或签名私钥，公开 Release 检查无需登录。
- 只接受固定仓库的稳定版，忽略草稿和预发布版。
- 下载只跟随 GitHub 官方 HTTPS 下载域名；校验不通过时不会调用安装器。
- 断网、限流、尚无 Release 都会给出可重试提示，不会误报“已经是最新版”。
- 在战斗中完成下载会等待玩家回到标题或设置继续安装，自动检查提示也会避开战斗和剧情。
- 已安装版本的 APK 缓存会在新版本启动后清理，过期的未完成下载也会清理。
- 签名文件丢失意味着无法对原应用继续覆盖升级，务必私下长期备份。
