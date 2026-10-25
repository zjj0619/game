# 素材署名 / ATTRIBUTION

## 音乐（BGM）

全部主题曲为《烛龙纪·长夜山海》**原创 MIDI 编曲**（`tools/gen/compose_music.py`），
经 FluidSynth 渲染，使用发行版自带的 **FluidR3_GM** 音色库（FluidSynth / Creative SoundFont，LGPL）。

- 生成：`python tools/gen/compose_music.py`（需 fluidsynth、ffmpeg、mido）
- 产物：`app/public/assets/music/theme_*.{mp3,ogg}`；MIDI 源备份于 `art_raw/music_midi/`
- **未使用** MiniMax Music API（Token Plan 返回 HTTP 410，已放弃）
- **未使用** 第三方商用曲包；无版权采样拼接

主题列表：title / hub / battle / boss / dream / win / ending / sad / final /
jincheng / qingqiu / donghai / kunlun / beihai / guixu

运行时若解码失败，回退到引擎内五声程序化垫乐（`src/engine/audio.js`）。

## 音效

程序化 WebAudio（`src/engine/audio.js` 内 sfx），无外部采样。

## 美术

见 `ASSETS_COUNT.md`：原画为 GenerateImage 原创；动画帧/特效/视差等为程序派生。
造梦西游仅作玩法参考，未使用其任何素材。
