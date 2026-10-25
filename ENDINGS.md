# 《烛龙纪·长夜山海》结局与隐藏线总表

共 **15** 个具名结局（A–O）。条件在终章 `fin_start` 与隐藏线入口求值；沿途旗帜 / 关键道具 / 好感 / 梦层记录会改写权重。

| ID | 名称 | 类型 | 核心解锁条件（摘要） |
|----|------|------|----------------------|
| A | 长明 | 正统 | 终章选「点燃烛龙」；hope≥30 |
| B | 长夜 | 悲剧 | 终章选「接受长夜」 |
| C | 新烛 | 正统变体 | 终章选「成为新烛龙」 |
| D | 归墟同眠 | 悲剧 | hope&lt;50 或 `flag:weary`（沿途疲惫/冷酷选项） |
| E | 狐梦千年 | 角色线 | 白霁好感≥80 + `flag:baiji_protected` + 未失去白霁 |
| F | 昼夜双瞳 | 真结局 | `ba_freed` + `fuli_forgiven` + scales≥5 + lost==0 + 五位好感≥60 |
| G | 衔石填海 | 角色线 | 衔微好感≥85 + `item:k_keepsake_xianwei` + `flag:xw_sea_oath` |
| H | 无头之誓 | 角色线 | 戚好感≥85 + `item:k_keepsake_qi` + `flag:qi_oath` |
| I | 山鬼待君 | 角色线 | 阿篱好感≥85 + `item:k_keepsake_ali` + `flag:ali_wait` |
| J | 逐日余烬 | 角色线 | 夸铃好感≥85 + `item:k_keepsake_kualing` + `flag:kl_chase` |
| K | 师徒共灯 | 真+变体 | `fuli_forgiven` + `item:k_letter_sealed` + 浮黎在队 + 好感≥70 + scales≥6 |
| L | 噩梦永昼 | 噩梦 | `item:k_lamp_cursed` + `flag:dream_addict` + `var:dream_flips`≥5 |
| M | 假日将尽 | 玩笑 | `item:k_false_dawn` + `flag:kids_lamp` + hope≥70（孩子们偷走终焉之灯） |
| N | 鳞下密信 | 秘密 | `item:k_letter_sealed` + `item:k_scale_black` + `flag:read_sealed`（不开战，只读信） |
| O | 相柳之泪 | 隐藏同伴 | `flag:xiangliu_spared` + `item:k_scale_dream` + `flag:xl_bond` |

## 关键道具（选项 / 隐藏场景解锁）

| ID | 名称 | 如何获得 | 解锁 |
|----|------|----------|------|
| k_scale_gold | 烛龙鳞·金 | 主线高灯心选择 | 加重 A/F/K |
| k_scale_black | 烛龙鳞·墨 | 接受黑暗选项 / 赤水封印 | N、L 线 |
| k_scale_dream | 烛龙鳞·梦 | 闭目层隐藏首领 / 梦门 | O、L 线 |
| k_letter_sealed | 浮黎密信 | 昆仑书斋特定对话 | K、N |
| k_lamp_cursed | 诅咒残灯 | 幽都夜札隐藏选项 | L |
| k_false_dawn | 假日之种 | 烬城孩子们支线 | M |
| k_keepsake_* | 同伴信物 | 羁绊终章选项 | G–J |
| k_night_note | 玄冥夜札 | 北海/幽都隐藏 | 隐藏夜谈 |
| k_xiangliu_tear | 相柳之泪 | 放生相柳后梦层 | O |

## 沿途旗帜（章节选择写入，影响终章权重）

- `mercy` / `ruthless` 计数（`var:mercy` / `var:ruthless`）
- `dream_addict`：多次闭目成瘾对话
- `baiji_protected` / `xw_sea_oath` / `qi_oath` / `ali_wait` / `kl_chase`
- `fuli_forgiven` / `ba_freed` / `xiangliu_spared` / `read_sealed` / `kids_lamp` / `xl_bond` / `weary` / `dream_addict`

## 隐藏剧情入口（不剧透主线）

画廊「夜札残页」与营火「未点名的座位」在对应 flag/item 满足后点亮；否则只显示剪影与模糊提示。

详见 `app/src/story/70_hidden_web.txt`、`71_branch_choices.txt`、`13_finale.txt`。


## 关联玩法

- 8 个信物秘境（`KEY_SECRETS`）与结局道具/旗帜互通；通关后写 `sec_cleared_*` 旗，画廊后日谈见 `72_key_quests.txt`。
