# GitHub 命理算法候选审计

- 状态：T-002 与 T-003 已完成；D-005 至 D-012 已获 Chat 批准
- 审计日期：2026-09-09
- 最后更新：2026-09-10
- 性质：研究/候选，不是正式算法
- 关联任务：T-002、T-003
- 审计基线：`bazi_rules@0a6e64845578a813379494167af19d149776241f`

> T-002 的源码、测试、License 与算法差异审计已经完成。D-005 至 D-012 批准的工程和产品边界已同步进入正式规则。本文早期章节保留审计时的候选结论；第 10–12 节的 T-003 收尾结论覆盖其中已解决的待决项。

## 1. 范围、方法与判定标准

### 固定候选

1. [`6tail/lunar-javascript`](https://github.com/6tail/lunar-javascript)
2. [`AmsonntagChow/zhiji-bazi`](https://github.com/AmsonntagChow/zhiji-bazi)
3. [`Zijian-Ni/tianji`](https://github.com/Zijian-Ni/tianji)

### 固定模块

- 年/月/日/时柱
- 节气换月与立春换年
- 晚子时
- 真太阳时
- 藏干与十神
- 大运起运与顺逆
- 身强弱
- 喜用神、调候与格局

### 分层

| 层级 | 本轮模块 | 验收含义 |
|---|---|---|
| 确定性计算层 | 四柱、节气/立春边界、时间与时区预处理、晚子时策略执行、真太阳时公式执行、藏干表、十神映射、大运干支序列与按既定口径折算 | 必须能定位源码、声明输入时区/范围/边界策略，并以分钟级边界和已知样例复现。所谓“确定性”是“口径确定后可重复”，不代表晚子时、真太阳时或起运口径没有流派选择。 |
| 流派判断层 | 身强弱、喜用神、调候、格局；以及“应选择哪种”晚子时/真太阳时/起运口径 | 必须公开假设、阈值和证据，允许多方案与置信度，不把单一实现称为唯一古法。 |

### 建议等级

- **直接复用**：接口、范围、口径和测试均足以原样进入候选实现。
- **封装后复用**：核心可用，但必须加范围守卫、统一输入、显式策略、交叉测试或合规包装。
- **仅参考**：可帮助理解或交叉检查，不宜成为生产结果来源。
- **不采用**：缺失、精度不符、实现存在结构性错误，或证据不足以承担该模块。

## 2. 审计摘要

1. **首选确定性底座候选：`lunar-javascript`，但只能封装后复用。** 它的四柱、精确节气和大运能力最完整，且测试量最大；风险是单文件体量大、输入时区语义不够显式、没有真太阳时，默认晚子时组合存在“日柱不换但时干按次日取”的兼容行为。
2. **最佳策略参考层：`zhiji-bazi`。** 它把晚子时三种方案显式命名，并提供真太阳时、身强弱、格局与喜用神代码；但它依赖 `lunar-javascript@^1.7.7`，并不是完全独立的历法交叉源。1900–2100 之外会静默退化为近似算法，判断层大量阈值没有直接古籍或回归测试支撑。
3. **`tianji` 只适合辅助阅读，不适合作为计算底座。** 节气函数明示为近似日期、没有分钟时刻；在 2024 对照中把立春和惊蛰都算早一天。其“精确起运”说明与源码的整日取整不一致；Python 核心与 Web 端还是两套不同实现。
4. **三个候选都不能直接给出产品级“唯一喜用神”。** `lunar-javascript` 不做判断；`zhiji-bazi` 是多套现代启发式；`tianji` 是更简化的打分。古籍能证明月令、旺衰、调候等不同观察入口存在，但不能证明仓库里的数字阈值就是古籍原意。

## 3. 逐库审计

### 3.1 6tail/lunar-javascript

- 仓库：<https://github.com/6tail/lunar-javascript>
- 审计提交：[`4c45a59f79b856125516f31aefa8295035c16afd`](https://github.com/6tail/lunar-javascript/commit/4c45a59f79b856125516f31aefa8295035c16afd)
- 包版本：`1.7.7`
- 维护快照：审计提交日期为 2025-11-05；本轮只判断该固定提交，不据此承诺未来维护频率。
- 许可证：MIT（仓库 `LICENSE`）。允许商业使用、修改、分发和再许可；分发副本或重要部分时需保留版权与许可声明，且软件按“原样”提供、无担保。
- 审查对象：[`README.md`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/README.md)、[`LICENSE`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/LICENSE)、[`lunar.js`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/lunar.js)、[`__tests__`](https://github.com/6tail/lunar-javascript/tree/4c45a59f79b856125516f31aefa8295035c16afd/__tests__)

#### 关键算法入口与口径

| 模块 | 入口/证据 | 实现口径 | 风险与建议 |
|---|---|---|---|
| 四柱 | [`Lunar` 与 `EightChar`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/lunar.js#L5647-L5715) | 年/月用精确节气；日柱有 `sect=1/2` 两种；时支按两小时分段。 | **封装后复用**。统一时区、秒/毫秒、有效年份和晚子时策略；禁止业务层直接依赖默认值。 |
| 节气/立春 | [`getYearInGanZhiExact`、`getMonthInGanZhiExact`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/lunar.js#L936-L954) | 立春精确时刻换年；逐个“节”精确时刻换月。2024 算得立春 `02-04 16:27:07`、惊蛰 `03-05 10:22:45`。 | **封装后复用**。建立官方历书金标和边界前后 1 分钟测试。 |
| 晚子时 | [`EightChar.getDay/getTime`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/lunar.js#L5696-L5715)、[`EightChar.test.js`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/__tests__/EightChar.test.js#L14-L33) | 默认 `sect=2`：23:00 后日柱仍用当日，但时干仍按进位后的日干；`sect=1`：日柱与时干都按次日。 | **仅参考**。默认组合内部口径不一致；只有经过显式适配与金标验证后才能选用其中一种。 |
| 真太阳时 | README、源码全库搜索 | 未实现。 | **不采用**。 |
| 藏干/十神 | [`LunarUtil` 表与 `EightChar` 接口](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/lunar.js#L5650-L5761)、[测试](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/__tests__/EightChar.test.js#L65-L93) | 固定藏干序列；十神按日干与其余干支阴阳生克映射。 | **封装后复用**。藏干集合可用；次序/权重另立规则，不能从数组顺序推导数值强度。 |
| 大运 | [`Yun`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/lunar.js#L5772-L5834)、[`Yun.test.js`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/__tests__/Yun.test.js) | 阳年男/阴年女顺行，反之逆行；取前/后“节”。提供两种折算：传统离散时辰法与分钟级折算法；大运柱从月柱顺/逆推。 | **封装后复用**。必须锁定折算 `sect` 并输出原始节气差、起运年月日时，避免只给整数岁。 |
| 身强弱 | 全库接口与源码搜索 | 未实现。 | **不采用**。 |
| 喜用神/调候/格局 | 全库接口与源码搜索 | 未实现。 | **不采用**。 |

#### 测试证据

- 在官方 Node.js 20.19.5 上运行仓库测试：**23 个测试套件、296 个测试全部通过，0 失败**。
- 相关覆盖包括四柱、藏干/十神和大运样例；仍缺本项目所需的时区/DST、真太阳时、边界前后 1 分钟和多来源金标。

### 3.2 AmsonntagChow/zhiji-bazi

- 仓库：<https://github.com/AmsonntagChow/zhiji-bazi>
- 审计提交：[`588283d3bf2ef969839109aaa7a37915b4b4d9bb`](https://github.com/AmsonntagChow/zhiji-bazi/commit/588283d3bf2ef969839109aaa7a37915b4b4d9bb)
- 包版本：`0.2.1`
- 维护快照：审计提交日期为 2026-08-14；README 保留已知限制并可见近期修订，但成熟度仍需结合版本升级持续复审。
- 许可证：Apache-2.0；仓库另有 `NOTICE`。可商业使用、修改和分发；再分发时需保留许可证、相关 NOTICE/版权/归属声明，并对修改过的文件作显著说明。包含专利许可及专利诉讼终止条款，不授予商标权。上线前仍应由法务复核。
- 依赖关系：运行时直接依赖 `lunar-javascript ^1.7.7`，因此它可验证“封装和判断层”，**不能作为独立历法实现**来增加两份独立证据。
- 审查对象：[`README.md`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/README.md)、[`LICENSE`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/LICENSE)、[`NOTICE`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/NOTICE)、[`src/core`](https://github.com/AmsonntagChow/zhiji-bazi/tree/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core)、[`test/calendar.test.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/test/calendar.test.ts)

#### 关键算法入口与口径

| 模块 | 入口/证据 | 实现口径 | 风险与建议 |
|---|---|---|---|
| 四柱 | [`ganzhi-calendar.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core/ganzhi-calendar.ts#L174-L273) | 默认 `Asia/Shanghai`；四柱接口允许三种晚子时规则。 | **封装后复用**。仅在明确时区和 1900–2100 守卫内使用；保留对底层依赖版本的锁定。 |
| 节气/立春 | [`solar-term-data.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core/solar-term-data.ts)、[`ganzhi-calendar.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core/ganzhi-calendar.ts#L102-L166) | 1900–2100 用北京时间分钟表；超范围后静默退化为公历月份近似和约 2 月 4 日换年。2024 算得立春 `16:27`、惊蛰 `10:23`。 | **封装后复用**。超范围必须报错，不能静默近似；数据表要与官方历书抽样核验。 |
| 晚子时 | [`ZishiRule`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core/ganzhi-calendar.ts#L25-L56) | `sameDay`（默认、日柱和时干均不换）、`nextDay`（二者均换）、`legacyCompat`（复现 lunar 的混合行为）。 | **封装后复用**。接口设计最清楚；生产只暴露 Chat 批准的策略，`legacyCompat` 仅用于兼容验证。 |
| 真太阳时 | [`true-solar-time.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core/true-solar-time.ts#L21-L62) | 法定标准时 + 经度修正 + 均时差；调用者提供经度和去除 DST 后的标准 UTC 偏移。 | **封装后复用**。其均时差是简化近似式；需改为/校验 NOAA 或 NREL 算法，处理 IANA 时区、历史标准时、日期跨界，并明确是否默认启用。 |
| 藏干/十神 | [`dizhi.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/models/dizhi.ts#L30-L42)、[`bazi-tables.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core/bazi-tables.ts#L16-L30)、[`shishen.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/models/shishen.ts) | 藏干集合和十神映射为固定表；另加 5/2/1、5/3 等数值权重。`巳`在展示表为丙/戊/庚，与另两库丙/庚/戊次序不同。 | 藏干集合与十神 **封装后复用**；数值权重 **仅参考**。注释声称“子平真诠口径”，但本轮未找到古籍对这些固定数值的直接支持。 |
| 大运 | README 与源码全库搜索 | README 明示大运/流年“不在这个仓库里”。 | **不采用**。 |
| 身强弱 | [`strength.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core/strength.ts#L76-L350) | 综合得令、得地、得势、五行分数与多轮边界修正；如根气 `>=2.0`、帮扶 `>=2.5` 等。 | **仅参考**。README 自述阈值经案例调试；没有独立验证集和直接单元测试，多个补丁式阈值有过拟合风险。 |
| 喜用神/调候/格局 | [`yongshen.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core/yongshen.ts)、[`yongshen-multi.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/core/yongshen-multi.ts)、[`qiongtong-baojian.ts`](https://github.com/AmsonntagChow/zhiji-bazi/blob/588283d3bf2ef969839109aaa7a37915b4b4d9bb/src/data/qiongtong-baojian.ts) | 混合扶抑、格局、调候、病药、通关等候选并排序；调候只在冷热极端条件触发；格局以月令藏干透出等启发式判断。 | **仅参考**。方法覆盖广但组合优先级、阈值和古籍释义是现代假设；README 也承认格局误报和跨实现不保证一致。 |

#### 测试证据

- 使用仓库锁定依赖运行：`bun test` **15 通过、0 失败**；`bun run typecheck` 通过。
- 测试覆盖历法基本值、立春前后、晚子时三策略、均时差和经度修正等，但没有对身强弱、格局、喜用神的直接单元测试或专家盲测；节气测试没有覆盖精确边界前后一分钟。

### 3.3 Zijian-Ni/tianji

- 仓库：<https://github.com/Zijian-Ni/tianji>
- 审计提交：[`a48cf098bbb4f45ca7848a304ca8d90f50697473`](https://github.com/Zijian-Ni/tianji/commit/a48cf098bbb4f45ca7848a304ca8d90f50697473)
- 包版本：`pyproject.toml` 为 `0.3.0`，但 [`src/tianji/__init__.py`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/src/tianji/__init__.py#L13) 仍为 `0.2.0`，版本元数据不一致。
- 维护快照：审计提交日期为 2026-08-20；近期有更新，但版本漂移、双实现和文档/源码不一致提高了升级风险。
- 许可证：MIT；商业注意点同 lunar-javascript，分发时保留版权与许可证声明。
- 架构风险：Python 包和 Web 端存在两套算法；Python 暴露身强弱/大运，Web 另有简化格局/喜用神，结果不应视为同一引擎。
- 审查对象：[`README.md`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/README.md)、[`LICENSE`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/LICENSE)、[`src/tianji`](https://github.com/Zijian-Ni/tianji/tree/a48cf098bbb4f45ca7848a304ca8d90f50697473/src/tianji)、[`web`](https://github.com/Zijian-Ni/tianji/tree/a48cf098bbb4f45ca7848a304ca8d90f50697473/web)、[`tests`](https://github.com/Zijian-Ni/tianji/tree/a48cf098bbb4f45ca7848a304ca8d90f50697473/tests)

#### 关键算法入口与口径

| 模块 | 入口/证据 | 实现口径 | 风险与建议 |
|---|---|---|---|
| 四柱 | [`chart.py`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/src/tianji/bazi/chart.py) | 接收无时区 `datetime`；年/月取节气“日期”，日柱按公历日期，时柱按本日日干。 | **仅参考**。普通非边界样例可交叉检查；无法满足分钟边界、时区/DST和晚子时策略要求。 |
| 节气/立春 | [`solar_terms.py`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/src/tianji/calendar/solar_terms.py#L1-L123) | 源码明确写“approximate date”，用平均太阳运动估算后只返回 `date`，立春还钳制到 2 月 3–5 日。 | **不采用**。2024 算得立春 `02-03`、惊蛰 `03-04`，比官方日期和另两库都早一天。 |
| 晚子时 | [`chart.py`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/src/tianji/bazi/chart.py) | 23:00–00:59 时支为子，但日柱和时干均按公历当日；无策略参数。 | **仅参考**。相当于隐式 `sameDay`，不能表达流派选择。 |
| 真太阳时 | 全库源码搜索 | 未实现。 | **不采用**。 |
| 藏干/十神 | [`constants.py`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/src/tianji/bazi/constants.py)、[`ten_gods.py`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/src/tianji/bazi/ten_gods.py) | 固定藏干集合、十神映射；五行计分另用 1.0/0.6/0.4 序位权重，便捷输出只显示每支主藏干对应十神。 | **仅参考**。基础映射可作第三方检查，但权重与 zhiji 不同且未给出处。 |
| 大运 | [`luck_pillars.py`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/src/tianji/bazi/luck_pillars.py#L65-L180) | 顺逆同“阳男阴女顺”；找前/后节气时只用日期差，`3天=1岁`整除，余数计算后未使用，0 岁强制为 1 岁，起运日期只加整数年。 | **不采用**。与 README “精确起运”表述不符，且建立在近似节气上。 |
| 身强弱 | [`day_master.py`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/src/tianji/bazi/day_master.py#L74-L153) | 月令、其余地支、天干分别加减固定分；用固定阈值分五档。`1.5–3.0` 区间会出现 `level=中和` 但 `is_strong=true` 的语义不一致。 | **仅参考**。无直接测试、无古籍到数值的推导。 |
| 喜用神/调候/格局 | [`web/js/bazi.js`](https://github.com/Zijian-Ni/tianji/blob/a48cf098bbb4f45ca7848a304ca8d90f50697473/web/js/bazi.js)；Python 包无对应模块 | Web 格局主要取月支主藏干及是否透干；喜用神按“身强取官食财、身弱取印比”概括；无调候。 | **不采用**。过度简化且与 Python 核心分离，不能承担产品结论。 |

#### 测试证据

- 在 Python 环境运行：**140 个测试全部通过，0 失败**。
- 通过数量不能抵消覆盖缺口：本轮检查未发现针对大运、身强弱、Web 格局/喜用神或真太阳时的测试；节气测试验证的是该近似实现自身，并非分钟级官方金标。

## 4. 跨库可复现对照

### 4.1 四柱与边界

所有时间按各库默认/北京时间语义输入；这组样例用于暴露实现差异，不是完整金标集。

| 输入 | lunar-javascript | zhiji-bazi | tianji | 结论 |
|---|---|---|---|---|
| 2000-01-01 12:00 | 己卯 丙子 戊午 戊午 | 同左 | 同左 | 非边界普通样例一致。 |
| 1988-02-15 23:30 | 默认：戊辰 甲寅 **庚子 戊子**；sect1：… **辛丑 戊子** | sameDay：… **庚子 丙子**；nextDay：… **辛丑 戊子**；legacyCompat：… **庚子 戊子** | … **庚子 丙子** | 子时策略真实改变日柱/时柱；lunar 默认等同 zhiji 的兼容模式。 |
| 2024-02-04 15:00（立春前） | 癸卯 乙丑 戊戌 庚申 | 同左 | **甲辰 丙寅** 戊戌 庚申 | tianji 提前换年换月。 |
| 2024-02-04 17:00（立春后） | 甲辰 丙寅 戊戌 辛酉 | 同左 | 同左 | 立春后重新一致。 |
| 2024-03-05 09:00（惊蛰前） | 甲辰 **丙寅** 戊辰 丁巳 | 同左 | 甲辰 **丁卯** 戊辰 丁巳 | tianji 提前换月。 |
| 2024-03-05 11:00（惊蛰后） | 甲辰 丁卯 戊辰 戊午 | 同左 | 同左 | 惊蛰后重新一致。 |

外部核对：香港天文台 2024 年历列立春为 **2 月 4 日**、惊蛰为 **3 月 5 日 10:23（香港时间）**；lunar/zhiji 的日期及分钟与其一致，tianji 的日期不一致。参见[香港天文台 2024 年历](https://www.hko.gov.hk/tc/gts/astron2024/files/HKO_almanac_2024.pdf)与[公历农历对照表说明](https://www.hko.gov.hk/sc/gts/time/conversion.htm)。跨年份扩样已列为发布前加固项，不阻塞娱乐型 MVP。

### 4.2 大运对照

样例：1981-01-29 23:37，女。

| 项目 | 顺逆 | 起运 | 第一大运 | 说明 |
|---|---:|---|---|---|
| lunar-javascript（分钟法） | 逆 | 8年0月27日2时；起运公历 1989-02-26 01:37 | 戊子 | 使用精确节气时刻和分钟折算。 |
| tianji | 逆 | 8整岁；起运公历 1989-01-29 | 戊子 | 只保留整日与整岁，余数丢失。 |
| zhiji-bazi | — | — | — | 未实现大运。 |

三库对顺逆和第一柱并未形成三份独立实现；起运时刻存在一个月左右的实质差异。古籍《三命通会》要求按出生到前/后节气的“实历过日时”折算，并明确指出只用约法会失真，见[《钦定古今图书集成》所录《三命通会·论大运》](https://zh.wikisource.org/zh-hans/%E6%AC%BD%E5%AE%9A%E5%8F%A4%E4%BB%8A%E5%9C%96%E6%9B%B8%E9%9B%86%E6%88%90/%E5%8D%9A%E7%89%A9%E5%BD%99%E7%B7%A8/%E8%97%9D%E8%A1%93%E5%85%B8/%E7%AC%AC598%E5%8D%B7)。因此本轮不采用 tianji 的整岁实现。

### 4.3 身强弱、喜用神与格局

| 输入 | zhiji-bazi | tianji Python | 冲突含义 |
|---|---|---|---|
| 2000-01-01 12:00 | 身强；正财格；用金 | 身强（3.3）；无 Python 格局/用神 | 身强方向一致，但只有 zhiji 给判断层结论。 |
| 1988-02-15 23:30（sameDay） | 身弱；偏财格；用土 | 身弱（0.0）；无 Python 格局/用神 | 身强方向一致，不构成喜用神交叉验证。 |
| 2024-02-04 17:00 | 偏强；七杀格；用金 | 中和（1.0）；无 Python 格局/用神 | 同一命盘的强弱等级直接冲突。 |
| 2024-03-05 11:00 | 身强；七杀格；用火 | 中和（2.5，但源码 `is_strong=true`）；无 Python 格局/用神 | 分类阈值与内部语义均不同。 |

这部分没有“多数票”：lunar 不实现，tianji Python 不实现喜用神/格局，zhiji 是唯一完整候选。产品不能把唯一实现误写成三库共识。

## 5. 古籍原意、流派差异与现代实现假设

只针对本轮分歧查证，未通读或泛引整部古籍。

| 分歧点 | 古籍原意/可确认文本 | 流派差异 | 现代实现假设 |
|---|---|---|---|
| 晚子时 | 《三命通会·论时刻》说子时上半在夜半前属昨日、下半在夜半后属今日，见[四库本卷二](https://zh.wikisource.org/zh-hans/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B702)。 | 如何把古代“昨日/今日”和现代民用时钟、日柱、五鼠遁时干逐项对应，现代实践并不统一。 | `sameDay`、`nextDay`、`legacyCompat` 是软件策略；尤其混合模式只是兼容既有代码，不能追认为古籍唯一规则。 |
| 藏干次序/权重 | 传统歌诀可支持藏干**集合**，如“巳中庚金有丙戊”，参见[《增删卜易·地支循藏歌》](https://zh.wikisource.org/zh/%E5%A2%9E%E5%88%AA%E5%8D%9C%E6%98%93)。 | 主气、中气、余气的排序与月令司事讨论可因体系而异。 | zhiji 的 5/2/1 与 tianji 的 1.0/0.6/0.4 是量化模型；本轮未找到古籍给出这两套固定权重。 |
| 起运 | 《三命通会·论大运》载阳男阴女顺、阴男阳女逆，并要求数至未来/过去节气的日时，以三日折一年且处理余数。 | 仍有按年干阴阳或日干阴阳、折算细粒度等差异。 | lunar 的两个 `sect` 与 tianji 的整岁取整是实现选择；后者丢弃余数，不符合所引文本的精细折算精神。 |
| 身强弱 | 《滴天髓·衰旺论》强调旺衰有真机，甚至“旺中有衰、衰中有旺”，见[原文](https://zh.wikisource.org/wiki/%E6%BB%B4%E5%A4%A9%E9%AB%93/12)。 | 月令、通根、透干、合冲刑化的权重和从格条件不同。 | `>=2.0` 根气、`>=2.5` 帮扶或 tianji 固定加减分均是程序阈值，不是古籍直接公式。 |
| 用神/格局/调候 | 《子平真诠·论用神》以月令为纲、由月令与日干生克定格，见[原文](https://donglishuzhai.net/chapter/3721.html)；《滴天髓》更强调旺衰变化。 | “月令格局用神”“扶抑喜用”“调候优先”等术语和优先级并不等价。 | zhiji 把多种体系放进统一候选排序，是产品工程方案，不等同于任何单部古籍原意；tianji Web 的强/弱二分更是简化模型。 |

## 6. 模块级功能矩阵（D-005 至 D-008 审核后）

| 模块 | lunar-javascript | zhiji-bazi | tianji | 当前候选结论 |
|---|---|---|---|---|
| 年/月/日/时柱 | **封装后复用** | **封装后复用**（底层非独立） | **仅参考** | 以 lunar 为主底座；zhiji 作为显式策略适配层；tianji 仅做非边界抽查。 |
| 节气换月、立春换年 | **封装后复用** | **封装后复用**（1900–2100） | **不采用** | 分钟级边界为硬要求；超范围报错，不允许静默近似。 |
| 晚子时 | **封装后复用 `sect=1`** | **仅参考** | **仅参考** | D-009 已固定 23:00 换日；适配器显式设置并禁用混合模式。 |
| 真太阳时 | **不采用** | **仅参考** | **不采用** | 产品自行实现 USNO 均时差，并使用 GeoNames WGS84 经度与 IANA 历史时区。 |
| 藏干与十神 | **封装后复用** | **封装后复用**（权重仅参考） | **仅参考** | 先固化集合和十神关系；权重单独审议，不继承任一库的数字。 |
| 大运起运与顺逆 | **封装后复用 `sect=1`** | **不采用** | **不采用** | D-010 已固定传统离散时辰法；保存精确前/后节、折算分量与起运时刻。 |
| 身强弱 | **不采用** | **仅参考** | **仅参考** | 不直接复用；先设计可解释特征、专家标注集和不确定性输出。 |
| 喜用神/调候/格局 | **不采用** | **仅参考** | **不采用** | zhiji 只作为方案目录和测试素材；不输出唯一答案。 |

本轮没有任何模块建议“直接复用”。原因不是三库没有价值，而是产品尚未固定时区、晚子时、真太阳时、起运和流派策略，也没有自己的金标回归集。

## 7. 可复现步骤与证据留存

审计在三个固定提交的源码快照上执行，未使用浮动 `main/master`：

```text
lunar-javascript@4c45a59f...  Node.js 20.19.5: 23 suites / 296 tests passed
zhiji-bazi@588283d3...        Bun: 15 passed; TypeScript typecheck passed
tianji@a48cf098...            Python: 140 tests passed
```

同输入对照脚本使用各仓库公开 API，输入与实际输出已完整列在第 4 节。复核时应重新下载相同 commit，安装 lockfile 指定依赖，再执行原测试与六个对照输入。后续若升级 commit，必须作为新审计版本重跑，不得沿用本报告结论。

## 8. 给非命理专业产品负责人的审核包（历史记录）

> 本节记录 T-002 当时提交给 Chat 的审核问题；D-005 至 D-008 已解决其中的底座分工、混合晚子时排除、真太阳时默认行为、大运存储/展示及争议解释结构。未决项以第 9 节为准。

### 审核问题 1：产品的四柱计算底座选谁？

- **问题是什么**：需要一个稳定引擎把出生时间变成年、月、日、时四柱。
- **用白话解释**：这像“日历发动机”。大部分时间大家算得一样，但出生在立春、惊蛰或午夜附近时，差一分钟可能换一柱。
- **各方案差异**：lunar 精度和测试最好；zhiji 提供更清楚的策略接口但历法底层依赖 lunar；tianji 只算节气日期近似。
- **证据**：普通样例三库一致；2024 立春前和惊蛰前，tianji 提前换柱，lunar/zhiji 与香港天文台日期和分钟一致。
- **风险**：直接使用默认值会隐藏时区和午夜规则；把 zhiji 当独立验证会产生“伪双重证据”。
- **推荐方案**：批准“lunar 封装后作为候选底座，zhiji 只作为策略适配/交叉检查，tianji 不参与边界计算”。
- **需要用户决定什么**：是否接受这一主从关系，并批准进入 T-003 金标测试，而不是现在写成正式规则。

### 审核问题 2：23:00–23:59 出生的人算当天还是次日？

- **问题是什么**：晚子时会改变日柱，也可能改变时干。
- **用白话解释**：同一个 23:30，三种软件策略能算出三组结果；这不是普通程序 bug，而是古今计时换算与流派选择叠加。
- **各方案差异**：`sameDay` 日柱/时干都按当天；`nextDay` 都按次日；`legacyCompat` 日柱按当天、时干按次日，仅复现 lunar 默认行为。
- **证据**：1988-02-15 23:30 对照产生“庚子丙子”“辛丑戊子”“庚子戊子”三种组合；《三命通会》又区分子时夜半前后所属日。
- **风险**：偷偷采用默认值会让结果不可解释；兼容混合模式内部口径不一致。
- **推荐方案**：新产品不采用 `legacyCompat`；先以 `sameDay` 和 `nextDay` 两个自洽方案进入专家/案例评审，结果中保存所用策略版本。
- **需要用户决定什么**：选择单一默认，或允许高级用户切换并看到差异。审计本身不替你决定流派。

### 审核问题 3：是否默认使用真太阳时？

- **问题是什么**：是否根据出生地经度和均时差，把钟表时间校正成当地太阳时间后再排盘。
- **用白话解释**：同一时区很宽，城市钟表中午不一定是太阳真正走到最高点的时刻；校正可能把边界附近的人推入相邻时辰或日期。
- **各方案差异**：lunar/tianji 没有；zhiji 有“经度修正 + 均时差”的简化实现，但未自动处理完整历史时区。
- **证据**：NOAA 给出的真太阳时公式包含均时差、经度和时区三部分，见[官方计算说明](https://gml.noaa.gov/grad/solcalc/solareqns.PDF)；zhiji 结构相似但均时差公式更简化。
- **风险**：出生地经度、历史标准时、夏令时或日期处理错误，都可能比“不校正”更糟；命理层是否应使用也属于口径选择。
- **推荐方案**：先做可选高级模式；底层用权威算法与 IANA 历史时区重算，默认关闭并显示校正前后时间。
- **需要用户决定什么**：产品定位是“默认简洁”还是“默认专业校正”；是否愿意要求用户提供准确出生地。

### 审核问题 4：大运起运显示整数岁还是精确到年月日时？

- **问题是什么**：三库对顺逆较接近，但对起运时间精度不同。
- **用白话解释**：同一人可以都从“8岁左右”起运，但一个结果是生日当天，另一个晚近一个月；遇到事件时间线时差异很重要。
- **各方案差异**：lunar 可按节气分钟折算；tianji 只取整日/整岁；zhiji 没有该模块。
- **证据**：1981 女命样例的第一大运柱都为戊子，但起运日期分别为 1989-02-26 与 1989-01-29；《三命通会》要求使用实历日时并处理余数。
- **风险**：只显示整数岁掩盖差异；显示到小时又可能制造超出史料/出生时间精度的虚假精确。
- **推荐方案**：计算保留分钟级中间值，界面先显示“约 8 岁 1 个月起运”并可展开精确值和口径。
- **需要用户决定什么**：界面要“易懂约数”还是“专业精确值”，以及是否同时显示方法说明。

### 审核问题 5：身强弱、喜用神和格局要不要现在自动给唯一答案？

- **问题是什么**：这是决定产品建议内容的判断层，也是目前证据最弱的部分。
- **用白话解释**：历法像测量，喜用神更像基于一套学派规则做诊断；同一数据换一套权重，就可能从“偏强”变“中和”。
- **各方案差异**：zhiji 混合得令/得地/得势、格局、调候等多套规则；tianji 主要固定加减分；lunar 不判断。
- **证据**：同一 2024-02-04 17:00 命盘，zhiji 判偏强、tianji 判中和；《子平真诠》以月令格局为纲，《滴天髓》强调复杂旺衰，两者都没有给出仓库中的数字阈值。
- **风险**：把启发式输出成唯一事实，会把流派差异和程序过拟合转嫁给用户；当前也没有专家标注集、盲测准确率或校准置信度。
- **已批准方案**：不直接复用任何候选的最终结论；按月令/格局、旺衰扶抑、调候三轨生成“主结果 + 辅助结果 + 置信度 + 简短依据”，具体权重在实现期版本化回归，不继续无限扩大流派研究。
- **需要用户决定什么**：产品更偏娱乐简洁还是专业严谨；免费版是否只显示一个主结果，高级版是否展示不同流派与置信度。

## 9. 待 Chat 决策清单

上述审核问题已由 D-009 至 D-012 关闭：晚子时采用 23:00 换日；大运采用传统离散时辰法；真太阳时采用 USNO + GeoNames + IANA；争议解释采用稳定多轨框架。

## 10. T-003 第一阶段验证记录

### 10.1 节气与立春边界

香港天文台《2024 年年历》给出 2024 年立春为香港时间 `2024-02-04 16:27`；其二十四节气资料说明节气是太阳到达指定黄经的时刻。以分钟精度抽样：

- `lunar-javascript@1.7.7` 在 `16:26` 仍返回立春前的候选四柱 `癸卯 乙丑 戊戌 庚申`；
- 在 `16:28` 返回立春后的候选四柱 `甲辰 丙寅 戊戌 庚申`；
- 因此库的节气切换时刻在本样本上通过 HKO 分钟级事件边界核验。

收尾阶段补充惊蛰边界：HKO 给出 `2024-03-05 10:23`（香港时间），候选库在 `10:22` 返回丙寅月、`10:24` 返回丁卯月。至此同时覆盖立春年/月界与普通月令节界；事件时刻通过，命理映射按产品口径管理。

限制：HKO 能验证立春事件时刻，但其官方农历干支年以正月初一换年，并明确指出命理使用者常以立春换年。因此“事件时刻正确”不等于“子平年柱口径已获得官方历法证明”。年柱切换仍按候选实现记录。

来源：

- [香港天文台年历 2024](https://www.hko.gov.hk/en/gts/astron2024/files/HKO_almanac_2024.pdf)
- [香港天文台：二十四节气](https://www.hko.gov.hk/en/gts/time/24solarterms.htm)
- [香港天文台：What year is it today?](https://www.hko.gov.hk/en/education/astronomy-and-time/time-service/00506-what-year-is-it-today.html)

### 10.2 时区与 DST

- IANA Time Zone Database 用于历史 UTC offset 与 DST 规则，当前测试数据固定声明 `tzdb-2026b` 为证据基线。
- 英国政府确认英国在三月最后一个星期日 `01:00` 前拨一小时，并在十月最后一个星期日 `02:00` 后拨一小时；2024 年伦敦 gap/fold 案例与此规则及 IANA 转换一致。
- NIST 确认美国 2007 年后在三月第二个星期日 `02:00` 开始 DST、十一月第一个星期日 `02:00` 结束；2024 年纽约案例覆盖海外出生及 spring-forward 缺失本地小时。
- Node `24.19.0`、ICU `78.3`、tz `2026b` 的独立运行观察与测试预期一致；运行环境版本已写入 `data/test_cases.json`，不得把运行时结果冒充来源本身。

来源：

- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [GOV.UK：When do the clocks change?](https://www.gov.uk/when-do-the-clocks-change)
- [NIST：Daylight Saving Time Rules](https://www.nist.gov/pml/time-and-frequency-division/popular-links/daylight-saving-time-dst)

### 10.3 晚子时

`1988-02-15 23:30` 的库行为暴露了适配器必须拦截的差异：

- `sect=1`：`戊辰 甲寅 辛丑 戊子`，日柱与时干均按次日来源，结构一致；
- 默认 `sect=2`：`戊辰 甲寅 庚子 戊子`，日柱不换而时干沿用次日，属于已排除的混合兼容模式；
- `22:59` 的产品回归结果为 `庚子 丁亥`，`23:00` 与 `23:30` 均为 `辛丑 戊子`。

结论：D-009 已固定 23:00 子初换日，对应显式 `sect=1`。这是产品口径金标，不宣称解决所有流派；默认 `sect=2` 永远不得穿透产品。

### 10.4 真太阳时

生产方案采用 USNO “Computing Approximate Solar Coordinates”：从 UTC instant 求 Julian Date、太阳视黄经与赤经，再计算均时差；真太阳时按 `UTC 时分 + 4 × 东经度 + 均时差` 得出。USNO 说明该算法在 2000 年前后各两个世纪约有 1 角分精度，因此 MVP 明确支持 1800–2200。

地点经度采用带导入日期的 GeoNames WGS84 快照并保存 GeoNames ID；历史 offset/DST 采用锁定的 IANA tzdb。GeoNames 的当年 offset 字段不能代替历史时区规则。

已通过四个回归：重庆 `01:20 → 00:25:45`（丑→子）、北京 `10:00 → 09:45:06`（巳→巳）、上海 `08:50 → 09:12:20`（辰→巳）、伦敦 DST `13:00 → 11:58:52`（未→午）。只有时支改变时提示用户。

来源：

- [USNO：Computing Approximate Solar Coordinates](https://aa.usno.navy.mil/faq/sun_approx)
- [USNO：The Equation of Time](https://aa.usno.navy.mil/faq/eqtime)
- [GeoNames Data Export](https://www.geonames.org/export/)
- [IANA Time Zone Database](https://www.iana.org/time-zones)

### 10.5 大运起运

D-010 选定单一口径：阳年男/阴年女顺，阴年男/阳年女逆；顺行取下一个节、逆行取上一个节；按“三日一岁、一日四月、一时辰十日”折算。该规则与《三命通会·论大运》所述方向、前后节和实历日时折算一致，并对应 `lunar-javascript@1.7.7` 的 `getYun(gender, 1)`。

`2022-03-09 20:51 Asia/Shanghai` 阳年男命参数的集成回归为：顺行，目标节 `2022-04-05 03:20:14`，起运分量 `8年9月10日0时`，精确起运 `2030-12-19 20:51`。`sect=2` 的 `2030-12-12 06:51` 明确不采用。

选择 `sect=1` 的理由是：传统来源清楚、单位可手工复算、与候选库默认传统路径稳定对接。它是产品口径金标，不宣称所有流派统一。

## 11. T-003 收尾证据等级

| 能力 | 第一阶段状态 | 说明 |
|---|---|---|
| 节气事件分钟边界 | MVP 通过 | 覆盖 2024 立春与惊蛰前后 1 分钟；后续扩年属于加固，不阻塞 MVP |
| IANA 时区、DST gap/fold | 通过 | 可作为输入标准化层金标 |
| 海外与非整点时区 | 通过 | 已覆盖纽约、伦敦、加德满都 |
| 真太阳时跨时辰提示 | 通过 | USNO 算法、GeoNames 经度、IANA 时区已固定；4 个回归通过 |
| 立春换年/月柱 | 产品口径通过 | 事件独立验证；子平映射按固定产品口径 |
| 晚子时日界 | 产品口径通过 | 23:00 换日；22:59/23:00 边界通过；混合模式禁用 |
| 大运顺逆与精确起运 | 产品口径通过 | 传统来源 + sect=1；方向矩阵和精确起运回归通过 |
| 身强弱/格局/喜用神 | 框架通过 | 多轨输出契约已定；具体权重需在实现期版本化测试 |

## 12. T-003 结论与剩余风险

T-003 可标记 Done。15 个案例中 8 个为独立事件/时间金标，7 个为已批准产品口径金标，全部通过或部分通过；没有剩余阻塞项。确定性底座已经足够支撑娱乐型 MVP，并可开始 T-004 城市五行方法论调研。

剩余风险不阻塞 MVP：

1. 六十甲子纪日锚点仍缺第二个独立权威来源；库升级必须保留旧版对照并扩大跨年代样本。
2. 当前节气分钟边界只覆盖 2024 的立春与惊蛰，发布前应扩大年份与节气覆盖。
3. GeoNames 数据“按现状”提供，地点重名或坐标异常需要用户确认与人工纠错通道，并履行 CC BY 4.0 署名。
4. 真太阳时在时辰边界 60 秒内应降置信度、保留两盘；1800–2200 外不自动计算。
5. 大运与 23:00 日界属于产品口径金标，不是普遍学术真理；说明页必须保留流派差异提示。
6. 身强弱、格局与喜用神的具体权重尚未做专家校准；框架可进入实现，但发布前必须有版本化回归与人工抽查。
