# TASKS

任务状态只在本文件维护；详细成果写入对应领域文件。任务移动状态时保留 ID、负责人、验收条件和结果链接。

## Backlog

### T-005 个人需要向量与城市向量匹配引擎设计

- 类型：产品/算法/测试
- 负责人：Chat/Work
- 状态：Backlog（等待 Chat 确认任务范围）
- 前置：T-003、T-004 已完成；City Engine 当前候选为 `city-elements-v0.2.1-scheme-c-candidate`
- 工作文件：待建立 Matching Engine 方法论与测试文件
- 验收：固定五行顺序和版本链；基于完整连续向量计算；大运、相对方位、现实筛选与 `City Profile` 边界清楚；匹配百分比经过独立标定且不冒充概率；同一输入可重复。

## In Progress

暂无。

## Done

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
