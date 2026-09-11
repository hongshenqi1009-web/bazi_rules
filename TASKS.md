# TASKS

任务状态只在本文件维护；详细成果写入对应领域文件。任务移动状态时保留 ID、负责人、验收条件和结果链接。

## Backlog

暂无。

## In Progress

### T-007 免费娱乐传播版 MVP 产品定义与接口整理

- 类型：产品/设计/接口
- 负责人：Chat/Work
- 状态：In Progress
- 开始日期：2026-09-11
- 前置：T-003 至 T-006 已完成；Chat 已批准 R2 `preferred-exposure-r2-balanced-candidate` 作为免费娱乐版 MVP 当前采用的 preferred exposure 方案
- 工作文件：`product/PRD.md`、`product/user_flow.md`、`design/design_system.md`、后续免费结果与接口文档；本次阶段切换先更新 `PROJECT_STATUS.md`、`TASKS.md`、`DECISIONS.md`
- 验收：定义免费版结果结构、Top 3–5 城市展示、轻量个人五行画像、城市适配解释、基础 City Profile 标签、当前阶段提示、分享卡结构、免费用户流程、免责声明及前端所需接口；保留专业解释接口，但不开发付费版、不继续复杂参数研究、不在本任务直接开发前端。
- 本轮进展：已启动项目阶段切换；详细产品定义与接口整理留在 T-007 后续提交完成。

## Done

### T-006 Personal Need 语义解耦与 preferred ranges 专项校准

- 类型：产品/算法/测试
- 负责人：Chat/Work
- 状态：Done（三套候选完成审计；Chat 已批准 R2 用于免费娱乐版 MVP）
- 开始日期：2026-09-11
- 完成日期：2026-09-11
- 前置：T-005 已完成结构设计、3,000 组合成审计和 15 例人工回归；Chat 已批准保留结构方向并只校准城市暴露区间
- 工作文件：`knowledge/matching_engine_methodology.md`、`knowledge/preferred_ranges_calibration.md`、`data/preferred_ranges_calibration_results.json`、`analysis/t006_preferred_ranges_calibration.py`
- 验收：明确区分 `need_strength` 与 `preferred_city_exposure`；提出三套 ranges 候选；基于锁定 100 城验证五维联合可行性，并复跑 3,000 组合成需求和 15 个构造命盘压力案例；未修改命理解释、强忌曲线、指数标定、大运、方位、City Profile 或前端。
- 结果：R1 合成联合可行率 84.23%、人工 12/15；R2 为 99.50%、人工 15/15；R3 为 100%、人工 15/15，但平均每个合成需求有 28.63 城全合格，选择性过弱。
- 推荐：`preferred-exposure-r2-balanced-candidate`。R2 主喜目标为 19.9%–33.8%；100 城全部进入过 Top 10；Top 5 HHI 从旧 ranges 的 167.35 降至 146.92，同主喜不同次喜/忌的 Top 10 平均 Jaccard 为 0.222。
- 强忌暴露：R2 合成 Top 10 超上限由 24,660/30,000 降至 3,814/30,000，超 10 点从 7,863 降至 0；人工集由 134/150 降至 13/150，且无一超 5 点。本轮未改过量曲线。
- 后续决定：Chat 于 2026-09-11 批准 `preferred-exposure-r2-balanced-candidate` 作为免费娱乐版 MVP 当前采用方案。保留该版本标识、全部研究证据及剩余风险；除非发现明显反直觉 bug，当前阶段不继续强忌曲线或数学参数专项校准。

### T-005 个人需要向量与城市向量匹配引擎设计

- 类型：产品/算法/测试
- 负责人：Chat/Work
- 状态：Done（设计、模拟审计和 15 例人工回归完成；具体数值参数未通过锁定闸门）
- 开始日期：2026-09-11
- 完成日期：2026-09-11
- 前置：T-003、T-004 已完成；City Engine 当前候选为 `city-elements-v0.2.1-scheme-c-candidate`
- 工作文件：`knowledge/matching_engine_methodology.md`、`knowledge/matching_manual_regression.md`、`data/matching_simulation_results.json`、`data/matching_manual_regression_cases.json`、`analysis/t005_matching_simulation.py`、`analysis/t005_manual_chart_regression.py`、`analysis/t005_verify_manual_case_pillars.js`
- 验收：固定五行顺序和版本链；基于完整连续向量计算；大运、相对方位、现实筛选与 `City Profile` 边界清楚；匹配指数经过独立标定且不冒充概率；同一输入可重复；用 1,000–5,000 组模拟需求完成 100 城推荐覆盖与集中度审计。
- 结果：形成 `personal-need-v0.1-candidate` 与 `matching-engine-v0.1-candidate`。比较非对称理想区间、满足度 + 过量惩罚及 Jensen–Shannon 三种方案后，推荐非对称理想区间法。
- 模拟证据：固定种子 3,000 组、100 城、300,000 个组合。推荐方案下 100 城均进入过 Top 5/Top 10；Top 5 最高单城占 3.14%，前十城占 27.09%，HHI 167.35。水主喜 600 组产生 40 个不同 Top 1，Top 10 合集覆盖 79 城。
- 修正闸门：大运单维最多 3 点、L1 最多 8 点且不翻转主喜/强忌；方位默认关闭，候选上限 `±1.0` 点，只在相同 1.0 点基础契合梯队内重排。
- 人工回归：15 个构造压力案例覆盖五种主喜、高/中/低置信度、10 个明显调候案例和 4 个辅助方案；四柱由锁定候选库复算 15/15 通过。主喜元素最高城市在 11/15 案例不是 Top 1，证明组合排序有效。
- 回归缺陷：150 个 Top 10 席位中 134 个强忌超候选上限，36 个超 10 点，17 个在超 10 点时指数仍至少 80；15/15 没有城市五项全部落入 preferred ranges。当前 ranges、过量曲线和指数标定不得锁定。
- 回归通过项：大运最大 L1 变化 4.440 点、前后 Top 10 平均 Jaccard 0.939，无主喜/强忌翻转；方位未跨越 1 点以上基础差距。五档语义、主辅方案、置信度、版本链及大运/方位闸门可保留。
- 剩余审核：先决定是否把 `need_strength` 与 `preferred_city_exposure` 解耦，再分层校准 ranges、强忌过量曲线与指数；`personal-need-v0.1-candidate` 和 `matching-engine-v0.1-candidate` 保持候选名。

### T-004 城市五行方法论调研

- 类型：研究/数据/测试
- 负责人：Work
- 状态：Done
- 开始日期：2026-09-10
- 完成日期：2026-09-11
- 前置：Chat 已通过 D-014 固定 100 城范围与证据标准、D-015 自然原型方向，并通过 D-016 批准土属性方案 C
- 工作文件：`knowledge/city_element_methodology.md`、`data/cities.csv`、`DECISIONS.md`
- 验收：事实数据与解释映射分离，所有评分可追溯，不把主观映射伪装为客观事实；100 城事实、原型权重和历史基线可复核。
- 结果：锁定 100/100 城事实与 12 个可重叠自然原型。方案 C 只调整四个原型响应，主输出升级为 `city-elements-v0.2.1-scheme-c-candidate`；分布为木 26、火 11、土 4、金 26、水 33，土主为 Lhasa、Cusco、Mexico City、Kunming。
- 回归：全体 L1 均值 37.981629，14 个极端城市 L1 均值 53.291834；最干四分位仅 Lhasa 土主，最高海拔四分位 4 城土主，没有恢复 v0.1 的干燥/高海拔重复抬土。
- 数据完整性：CSV 为 100 行、271 列；整数向量合计、原型权重合计、唯一 ID 和原始 v0.2 基线保存均无错误。事实子集哈希重算前后均为 `958EFA3C0D6852475543902EFB01E26A0618D1C6D8DC35EB6F87D33F120571B4`。
- 历史保留：`*_v0_1` 列继续保存 v0.1；新增 `*_v0_2_0`、`dominant_element_v0_2_0` 和 `mapping_version_v0_2_0` 保存原始 v0.2。当前输出没有按城市人工修分。
- 剩余风险：Mexico City、Kunming 的土领先幅度分别为 1.648078、1.204281，弱于 Lhasa、Cusco；前台应表达为复合型。NASA POWER 网格和年平均季节性限制保留，但不阻塞娱乐型 MVP。
- 结果链接：`knowledge/city_element_methodology.md`、`data/cities.csv`、`DECISIONS.md`

### T-003 建立命理金标测试框架

- 类型：研究/测试
- 负责人：Work
- 状态：Done
- 开始日期：2026-09-09
- 完成日期：2026-09-10
- 前置：Chat 已确认第一阶段范围与验证原则
- 工作文件：`data/test_cases.json`、`knowledge/github_bazi_audit.md`
- 验收：案例可重复、来源可追溯、预期结果与规则版本绑定；候选实现不得自证；证据不足时标记“尚未形成金标”。
- 结果：共 15 个案例；8 个独立事件/时间金标、7 个已批准产品口径金标，全部通过或部分通过。覆盖立春与惊蛰前后 1 分钟、IANA 时区、英国/美国 DST gap/fold、非整点时区、海外出生、23:00 晚子时、传统大运方向/精确起运，以及四个真太阳时边界。
- 正式口径：晚子时 `23:00` 换日；大运 `sect=1` 传统离散时辰法；真太阳时采用 USNO + GeoNames WGS84 经度 + IANA tzdb；争议解释采用三轨结构化框架。
- 剩余风险：六十甲子纪日第二独立来源、跨年份节气扩样、GeoNames 数据质量、临界 60 秒双盘、解释层权重校准。均不阻塞娱乐型 MVP 或 T-004 方法论调研。
- 结果链接：`data/test_cases.json`、`knowledge/bazi_rules_v1.md`、`knowledge/github_bazi_audit.md`、`DECISIONS.md`

### T-002 GitHub 命理算法候选审计

- 类型：研究
- 负责人：Work
- 完成日期：2026-09-09
- 状态：Done（研究完成；D-005 至 D-008 已由 Chat 审核批准）
- 前置：Chat 已确认 3 个候选、8 个重点模块及审计验收要求
- 工作文件：`knowledge/github_bazi_audit.md`
- 结果：审计三个固定提交的 README、许可证、核心源码、测试与算法入口；完成四柱/节气、晚子时、大运、身强弱及喜用神/格局跨库对照，并给出逐模块复用边界与产品审核包。
- 验收：已记录来源、版本、许可证、覆盖能力、关键口径、测试证据、风险和可复用边界；经 Chat 批准的工程与产品边界已进入正式规则，未批准的算法结论仍留在候选研究中。

### T-001 建立三端协作基础

- 类型：项目管理
- 负责人：Chat/Work
- 完成日期：2026-09-09
- 状态：Done
- 结果：建立 `PROJECT_STATUS.md`、`DECISIONS.md`、`TASKS.md`、`WORKFLOW.md`、`AGENTS.md` 和项目骨架；README 加入协作说明。
- 验收：角色、单一事实来源、任务前读取与完成后回写要求均已写入仓库。

## 任务模板

### T-XXX 标题

- 类型：研究/产品/开发/测试/设计
- 负责人：
- 状态：Backlog/In Progress/Done/Blocked
- 前置：
- 工作文件：
- 验收：
- 结果：
