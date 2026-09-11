# T-005 小型命盘人工回归

- 状态：已完成候选参数回归；不建议把 `personal-need-v0.1-candidate` 或 `matching-engine-v0.1-candidate` 升级为正式 MVP 参数
- 日期：2026-09-11
- 城市输入：锁定的 `data/cities.csv`，`city-elements-v0.2.1-scheme-c-candidate`
- 匹配输入：未修改的 `personal-need-v0.1-candidate`、`matching-engine-v0.1-candidate`、`matching-index-calibration-v0.1-candidate`
- 完整逐案例结果：`data/matching_manual_regression_cases.json`
- 结果 SHA-256：`E322022D2A344124B4DF7CA594521A6601FAA09443EB45A5C4EDB8C76E2E01CD`
- 复算程序：`analysis/t005_manual_chart_regression.py`
- 四柱校验：`analysis/t005_verify_manual_case_pillars.js`

## 1. 结论

本轮支持保留 Personal Need 的**五档结构、主/辅助方案、置信度、版本链以及组合匹配方向**，但不支持锁定现有数值参数。

主要问题不在城市事实，也不能通过反改命盘解释来处理。问题分属三个数字层：

1. `base_need_vector` 把五档正锚点归一化后，主喜常达到 39%–53%，强忌只剩 1%–5%；该向量可以表达相对次序，却不宜机械等同于城市五行的理想占比。
2. `preferred_ranges` 由上述归一化目标直接产生，强忌上限多在 5.8%–8.9%。15 个案例中，没有一个案例能在现有 100 城里找到五项全部落入区间的城市。
3. 匹配函数的强忌过量分母使用 `1-high`，惩罚过缓。强忌超过上限 10 个百分点以上时，局部契合度最低仍有 `0.690883`；分位标定随后仍可把这些结果显示为 80–93 分。

因此本轮结论是：**接口可保留，数字必须继续校准；当前候选不能升级为正式 MVP 参数。**

## 2. 案例与证据边界

项目没有收到经授权的真实用户出生资料。本轮使用 15 个**人工构造压力测试输入**，不把任何案例冒充真实人物。日期与时刻取自锁定候选库测试或项目已有边界案例附近，出生城市只用于方位审计。

四柱全部由 `lunar-javascript@1.7.7`、commit `4c45a59f79b856125516f31aefa8295035c16afd`、`EightChar.setSect(1)` 复算，15/15 与保存值一致。该验证证明案例四柱没有手工编造；它不把候选库变成独立历法金标。人工命理解读按 BR-004 的月令/格局、旺衰扶抑、调候、生克制化四块记录，仍属于候选解释，不进入 `knowledge/bazi_rules_v1.md`。

覆盖情况：木主喜 3 例、火 4 例、土 1 例、金 3 例、水 4 例；高/中/低置信度为 7/4/4；10 例带明显寒暖燥湿需求；4 例保存辅助命理方案。

## 3. 15 个案例结果总览

向量顺序固定为 `[木,火,土,金,水]`。下表的 Top 10 使用大运轻修正后、方位默认关闭的结果。完整 `preferred_ranges`、大运前后 Top 10、Top 3 逐元素解释、冲突点、辅助方案及版本链保存在 JSON。

| ID | 四柱 | 五档结构 | `base_need_vector` | Top 10 |
|---|---|---|---|---|
| MR-01 | 戊辰 甲寅 庚子 丁亥 | 土主、金次、水中、火忌、木强忌 | `[2.83,7.29,42.51,29.15,18.22]` | Lhasa、Hohhot、Xining、Lanzhou、Denver、Urumqi、Xi'an、Madrid、Santiago、Kashgar |
| MR-02 | 乙酉 戊子 辛巳 壬辰 | 火主、木次、土中、金忌、水强忌 | `[28.31,45.96,16.54,6.62,2.57]` | Honolulu、Cape Town、Perth、Miami、Bangkok、Nairobi、Lima、Singapore、Rio de Janeiro、Sanya |
| MR-03 | 己卯 庚午 庚寅 辛巳 | 水主、土次、金中、木忌、火强忌 | `[6.62,2.57,26.47,18.38,45.96]` | Wuhan、Ushuaia、Kyoto、Oslo、Reykjavik、Chicago、Zurich、Murmansk、Toronto、Sapporo |
| MR-04 | 乙亥 戊子 癸未 丁巳 | 火主、土次、木中、金忌、水强忌 | `[18.38,45.96,26.47,6.62,2.57]` | Nairobi、Mexico City、Lima、Santiago、Honolulu、Los Angeles、Johannesburg、Cape Town、New Delhi、Perth |
| MR-05 | 戊寅 戊午 己丑 丙寅 | 水主、木次、金中、土忌、火强忌 | `[25.00,1.47,4.41,15.81,53.31]` | Belfast、Helsinki、Ushuaia、Dublin、St Petersburg、Amsterdam、Reykjavik、Edinburgh、Vancouver、Seattle |
| MR-06 | 甲戌 乙亥 丙寅 己丑 | 火主、木次、土中、金忌、水强忌 | `[28.31,45.96,16.54,6.62,2.57]` | Honolulu、Cape Town、Miami、Perth、Bangkok、Singapore、Nairobi、Sanya、Lima、Rio de Janeiro |
| MR-07 | 庚午 戊子 庚戌 己卯 | 火主、土次、木中、金忌、水强忌 | `[21.13,38.73,26.41,9.51,4.23]` | Nairobi、Mexico City、Lima、Honolulu、Santiago、Johannesburg、Los Angeles、Cape Town、Perth、New Delhi |
| MR-08 | 癸酉 丁巳 甲辰 丙寅 | 水主、木次、土中、火忌、金强忌 | `[30.15,6.62,16.54,2.57,44.12]` | Belfast、Glasgow、Manchester、Dublin、Reykjavik、Ushuaia、Edinburgh、Amsterdam、Seattle、Cambridge |
| MR-09 | 甲辰 丙寅 戊戌 庚申 | 金主、水次、木中、火忌、土强忌 | `[18.22,7.29,2.83,42.51,29.15]` | Harbin、Astana、Moscow、Yakutsk、St Petersburg、Helsinki、Chicago、Dalian、Toronto、Boston |
| MR-10 | 甲辰 丁卯 戊辰 丁巳 | 木主、水次、金中、火忌、土强忌 | `[42.51,7.29,2.83,18.22,29.15]` | Glasgow、Edinburgh、Manchester、Belfast、Cambridge、Reykjavik、Oxford、Dublin、Amsterdam、Stockholm |
| MR-11 | 壬寅 癸卯 辛酉 戊戌 | 金主、土次、水中、木忌、火强忌 | `[10.42,4.63,28.96,34.75,21.24]` | Hohhot、Xining、Lanzhou、Denver、Xi'an、Urumqi、Madrid、Astana、Kashgar、Harbin |
| MR-12 | 甲辰 庚午 庚戌 辛巳 | 水主、金次、木中、土忌、火强忌 | `[13.97,1.47,4.41,26.84,53.31]` | St Petersburg、Helsinki、Murmansk、Stockholm、Oslo、Ushuaia、Reykjavik、Yakutsk、Moscow、Boston |
| MR-13 | 甲辰 甲戌 辛未 壬辰 | 木主、水次、火中、土忌、金强忌 | `[42.28,16.54,6.62,2.57,31.99]` | Hanoi、Kuala Lumpur、Singapore、Manila、Guangzhou、Taipei、New Orleans、Shenzhen、Sanya、Belfast |
| MR-14 | 己亥 丁卯 癸亥 癸丑 | 木主、火次、土中、金忌、水强忌 | `[40.44,33.82,16.54,6.62,2.57]` | Kuala Lumpur、Sanya、Singapore、Manila、Rio de Janeiro、Bangkok、Shenzhen、Hanoi、Hong Kong、Miami |
| MR-15 | 己亥 丁卯 癸卯 丙辰 | 金主、水次、土中、木忌、火强忌 | `[7.29,2.83,18.22,42.51,29.15]` | Astana、Moscow、Beijing、Harbin、Yakutsk、Hohhot、St Petersburg、Dalian、Xining、Chicago |

## 4. 逐案例人工检查

### MR-01 春令弱金

- 判断：庚金失令，水木成势，戊辰能生身但不足以判强；土主喜、金次喜。
- Top 3：Lhasa、Hohhot、Xining。Lhasa 的土 36.5、金 24.4 同时落入候选区间，是本轮最清楚的组合匹配之一。
- 冲突：Lhasa 的火高于忌神上限；Hohhot、Xining 的土低于主喜下限。结果可解释但并非无冲突。

### MR-02 冬令有根辛金

- 判断：酉根与戊辰使辛金能任泄耗，子水寒湿突出；火主喜、木次喜、水强忌。
- Top 3：Honolulu、Cape Town、Perth。主喜火和次喜木都接近但多低于下限。
- 冲突：Cape Town、Perth 的水超过强忌上限 11.1、11.9 点；Honolulu 仍超 8.3 点。说明强忌未充分进入总分。

### MR-03 午月庚金，轨道冲突

- 判断：主方案以水调候，辅助方案以土金扶身；属于低置信度。
- Top 3：Wuhan、Ushuaia、Kyoto。水主喜最高的城市在本案仅排第 41，证明算法没有退化为单元素最大值。
- 辅助方案：Top 10 与主方案 Jaccard 为 `0.000`，没有共同城市。该案对命理解读层极敏感，必须显示双方案。

### MR-04 子月旺水

- 判断：水得子亥根而偏强，火暖、土制形成组合。
- Top 3：Nairobi、Mexico City、Lima。Nairobi 的土在区间内，但火仍低于主喜下限。
- 冲突：Cape Town、Perth 的强忌水超过上限约 11 点却仍在 Top 10；指数对冲突表达偏乐观。

### MR-05 午月燥土

- 判断：火土旺而燥，水主喜、木次喜。
- Top 3：Belfast、Helsinki、Ushuaia。三城木接近合适，但水仍低于主喜下限约 9–10 点。
- 观察：最高水城市排第一，但推荐群并非只取水值，木与火土暴露仍参与排序；候选下限可能过高。

### MR-06 亥月丙火

- 判断：丙火失令而有甲乙寅生源，木火组合优先。
- Top 3：Honolulu、Cape Town、Miami。与 MR-02 同为火主木次，Top 10 城市集合一致；内部次序因大运信号略有变化，符合当前候选规则。
- 冲突：Cape Town、Miami 的强忌水明显超限，显示同一数字问题重复出现。

### MR-07 子月庚金

- 判断：庚金有印比承载，寒水仍需火暖、土承；强度采用 soft。
- Top 3：Nairobi、Mexico City、Lima。与火主木次组的 Top 10 Jaccard 为 `0.333`，次喜改变产生明显差异。
- 冲突：soft 锚点减弱集中度，但 Perth 的强忌水仍超上限 10.3 点并显示 80.1。

### MR-08 巳月甲木

- 判断：甲木中和偏弱且燥，水主喜、木次喜、金强忌。
- Top 3：Belfast、Glasgow、Manchester，三城首位差仅 `0.021`，应按同梯队表达。
- 冲突：三城金均约 15.5–16.5，高于强忌上限约 9 点，但指数仍超过 92，属于明显标定问题。

### MR-09 立春节界敏感

- 判断：立春后主方案为金泄、水润；输入距候选节气时刻约 53 秒，保留节前辅助盘。
- Top 3：Harbin、Astana、Moscow，金水组合均较接近目标。
- 冲突：三城土强忌均超限；主辅 Top 10 Jaccard `0.333`，Top 1 不稳定。该案应提示输入时间敏感。

### MR-10 卯月根厚戊土

- 判断：两辰、双丁和巳火使土不弱，木制为主、水辅。
- Top 3：Glasgow、Edinburgh、Manchester，差距很小，适合同梯队。
- 冲突：三城土约 14.2–16.0，高于强忌上限 7.1，却都显示约 92.7–92.9。

### MR-11 卯月辛金，金土主次分歧

- 判断：酉根与戊戌生扶对抗卯月失令和食伤生财；主方案金先，辅助方案土先。
- Top 3：Hohhot、Xining、Lanzhou，金土组合符合主方案。
- 辅助方案：Top 10 Jaccard `0.538`，四个低置信度案例中相对最稳定，但 Top 1 仍改变。

### MR-12 午月庚金

- 判断：热燥突出，水主、金次，火强忌。
- Top 3：St Petersburg、Helsinki、Murmansk。金在区间内，水却比主喜下限低约 10 点。
- 观察：最高水城市只排第 26，组合匹配有效；但 87 分仍可能高估“主喜显著不足”的绝对契合度。

### MR-13 戌月土厚辛金

- 判断：土厚，木疏、水润，金强忌。
- Top 3：Hanoi、Kuala Lumpur、Singapore。Hanoi 的木水均进入区间，是较自然的复合结果。
- 冲突：金略超强忌上限，程度小于多数案例；这是本轮相对稳定的城市解释样本。

### MR-14 卯月旺水

- 判断：两亥与癸比使水偏强，木泄、火承；水强忌。
- Top 3：Kuala Lumpur、Sanya、Singapore，木火较接近需要。
- 冲突：三城水约 25.7–27.0，比强忌上限高约 19–20 点，仍显示 81–83；这是本轮最反直觉结果。

### MR-15 卯月癸水，金水主次分歧

- 判断：双卯泄身、丙丁耗身而有亥根，主方案金先水后，辅助方案水先金后。
- Top 3：Astana、Moscow、Beijing。主方案重金水组合，最高金城市排第 3，并非单元素直排。
- 辅助方案：Top 10 Jaccard `0.250`，Top 1 改变；低置信度必须并列显示两套解释。

## 5. 专项检查结果

| 检查项 | 结果 | 判断 |
|---|---:|---|
| 主喜元素最高城市不是 Top 1 | 11/15 | 通过；推荐确实使用组合而非单元素最大值 |
| 强忌超过上限的 Top 10 席位 | 134/150 | 不通过；区间与城市分布不相容 |
| 强忌超过上限 5/10/15 点 | 84/36/20 | 不通过；并非只有微小越界 |
| 强忌超 10 点且指数仍 ≥80 | 17 | 不通过；匹配惩罚与指数标定共同偏乐观 |
| 任一案例存在五项全在区间的城市 | 0/15 | 不通过；preferred ranges 缺乏可实现性 |
| 大运 L1 平均/最大变化 | 2.824/4.440 点 | 通过；低于 8 点闸门 |
| 大运前后 Top 10 平均 Jaccard | 0.939 | 通过；阶段修正温和 |
| 大运改变 Top 1 | 2/15 | 可接受；未翻转主喜或强忌 |
| 方位跨越 >1 点基础差距 | 0 | 通过；最大被超越差距 0.962 |
| 低置信度主辅 Top 10 平均 Jaccard | 0.280 | 证明敏感；必须保留辅助方案 |
| 15 例 Top 5/Top 10 涉及城市数 | 42/62 | 未见少数城市垄断；样本太小，不替代 3,000 组覆盖测试 |

同一主喜仍能分化：水主喜 4 例产生 3 个不同 Top 1、Top 10 合集覆盖 25 城，组内平均 Jaccard `0.229`；木主喜 3 例产生 3 个不同 Top 1。火主喜组平均 Jaccard `0.556`，其中输入五档完全相同的 MR-02/MR-06 Top 10 相同，火主木次与火主土次之间 Jaccard 仅 `0.333`，符合“相同需要应稳定、次喜改变应分化”的预期。

## 6. 问题归因

| 层级 | 本轮判断 | 后续动作 |
|---|---|---|
| 命理解释层 | 15 例可按四轨说明；4 例低置信度主辅差异显著。尚无真人专家金标。 | 保留主/辅与置信度，不以城市结果反改解释；后续补 5–10 例经授权匿名真人案例。 |
| 五档标签 | 主喜、次喜、中性、忌、强忌能承载解释差异。 | 结构保留。 |
| 五档数值锚点 | 排序方向可用，但归一化后主喜过高、强忌过低；不能直接视作城市理想构成。 | 把“需要强度”与“目标城市占比”解耦后再测；当前锚点不锁定。 |
| `preferred_ranges` | 15/15 没有全维可行城市，强忌上限尤其窄。 | 结合 100 城各元素经验分布设计暴露阈值；忌/强忌不再由低目标值机械加固定百分点。 |
| 匹配函数 | 能做组合排序，但强忌过量的衰减过缓。 | 单独测试更局部的过量尺度或风险项；不与区间修改混成一次调整。 |
| 指数标定 | 相对排名不变，但明显冲突仍显示高分。 | 先修区间与匹配，再重建绝对解释锚点；考虑冲突等级或显示上限，但不得拍脑袋设分。 |
| 大运修正 | 幅度、排序保护和推荐稳定性均通过。 | 保持候选不变，等待真实大运案例补证。 |
| 方位修正 | 默认关闭、`±1.0` 及同梯队闸门足够保守。 | 保持候选不变，不扩大影响。 |

## 7. 未应用的参数调整建议

本轮没有修改任何候选公式。下一轮应按层分开做 A/B 测试：

1. 保留五档标签与证据，但把 `need_strength` 和 `preferred_city_exposure` 分成两个接口，避免把正锚点归一化后直接当城市目标占比。
2. 先只重做 `preferred_ranges`：用 100 城元素分布定义可解释的主喜饱和区、忌与强忌暴露阈值，并检查五维联合可行性。
3. 固定新 ranges 后，再单独校准超量曲线；强忌超过阈值 10 点时不应仍保留约 0.7–0.8 的局部契合。
4. 匹配函数稳定后再重做指数标定；不能继续只依赖合成总体分位把相对名次映射为高分。
5. 每层只改一组参数并复跑本轮 15 例与原 3,000 组，防止用小样本修好解释却破坏整体覆盖。

## 8. 给 Chat 的审核结论

- 当前 Personal Need **结构**获得支持，当前**数值锚点及其直接目标化方式**未获得支持。
- `preferred_ranges` 必须调整，尤其是忌/强忌上限及五维联合可行性。
- Matching Engine 的组合方向正确，但强忌超量惩罚需加强；指数标定须在函数修正后重建。
- 大运和方位候选暂不需要改。
- 现在不应把两个候选版本升级为正式 MVP 参数。下一步应先做“Personal Need 语义解耦 + ranges 专项校准”，再用本轮冻结案例回归。
