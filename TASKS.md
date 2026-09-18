# TASKS

任务状态只在本文件维护；详细成果写入对应领域文件。任务移动状态时保留 ID、负责人、验收条件和结果链接。

## Backlog

暂无。

## In Progress

### T-009 真实服务接入与首批内容发布准备

- 类型：开发/数据/测试/部署
- 负责人：Work
- 状态：In Progress
- 开始日期：2026-09-15
- 前置：T-008 已完成移动端纵向切片
- 工作文件：服务端适配器、地点服务、首批 City Profile、媒体清单、隐私与部署文档
- 验收：按 `product/frontend_interface_contract.md` 接入真实 BaZi / Interpretation / Personal Need R2 / Matching 任务；地点搜索返回标准 ID、时区与经纬度；先完成 8 城 City Profile 事实/许可审核；真实服务失败可恢复且不得回退成未标识样板结果；AI 文案失败不影响核心结果；明确出生数据保留、二维码入口与境内外部署方案。
- 边界：不在浏览器复制命理或匹配算法；不因发布准备重启复杂参数研究；默认不建立账户或长期保存出生资料；未授权 Logo/城市图片不得进入正式构建。
- 当前阶段：优先打通并回归“真实出生输入 → 地点解析 → 四柱/解释 → R2 个人需要 → 100 城匹配 → Top 3 → 可降级城市文案 → 分享入口”。
- 阶段成果（2026-09-15）：已实现`service/`真实编排；基于 GeoNames `cities15000`快照建立 34,135 条中英文地点索引；以锁定`lunar-javascript 1.7.7`封装四柱/晚子时/大运，用三轨解释候选、R2 和锁定 100 城完成 Top 3；没有前端算法复制或真实模式 demo 回退。
- 内容与隐私：完成 London、Vancouver、Tokyo、Singapore、New York、Barcelona、Shanghai、Kyoto 8 城 City Profile 事实/来源/许可边界；AI 只接收展示级五行与核验事实，失败独立降级；原始出生输入不落盘，派生结果仅内存 15 分钟，分享与二维码不含出生资料。
- 验证：`service` 12/12、`app` 14/14 自动测试通过；390 × 844 浏览器真实链复验通过。正式域名配置测试覆盖生产/staging 锁定、根域名 HTTPS、`www`与 HTTP 的 308、canonical 响应头，以及二维码拒绝临时地址。
- 发布实现：新增单容器入口、生产 HTTPS/公开 URL 校验及香港`.com`部署方案；关键静态资产保持自托管边界。
- 视觉素材（2026-09-15）：按 D-027 整理完整 Logo 与简化 icon；生成 London、Vancouver、Tokyo、Singapore、New York、Barcelona、Shanghai、Kyoto 8 张统一 1536 × 1024 城市意象候选图，记录提示、地标、替代文本、焦点与 SHA-256，并接通服务端媒体字段、城市详情、榜单和分享卡预览。未引入来源不明的外部图片。
- 域名与部署（2026-09-15）：正式主域名确认为`https://mydestinycity.com/`；生产配置、二维码、canonical 与 OG URL 已统一，`www`采用 308 到根域名。新增香港 Caddy/Compose 生产与受控 staging 配置，以及 DNS、证书和上线验收清单。
- 2026-09-18 工程收尾：完成 8 城三场景 WebP 压缩裁切与 1200 × 630 OG JPEG，母版保留；API 分别返回榜单、详情、分享媒体。修复缺图 404 导致进程退出的问题；本地完整计算链、媒体 MIME、缺图恢复与 AI 401/429/5xx/超时/畸形输出回归通过，`service` 17/17、`app` 14/14。
- 2026-09-18 公网核验：Google DNS 对正式域名返回 NXDOMAIN，`.com` 注册局 RDAP 返回 404；本环境无香港云或生产 AI 凭据，无法真实部署或调用。已写`deploy/OWNER_ACTION_REQUIRED.md`、`deploy/verify-production.mjs`和 8 城 AI 验收脚本，严格区分本地模拟与公网实测。
- 尚未满足的完成闸门：确认注册商订单/NS并完成香港生产与独立 staging 的实际 DNS、证书和服务部署；生产 AI 真实上游/成本验收；8 城候选图、Logo/OG 的品牌方/适用条款与真机裁切签收；海外 iPhone/Android 与大陆移动/联通/电信网络实测及完整用户链 QA。T-009 保持 In Progress，不把“配置就绪”误写为“已经可公开发布”。
- 结果链接：`service/`、`data/city_profiles_mvp.json`、`data/CITY_PROFILE_SOURCES.md`、`design/assets/`、`app/assets/`、`deploy/OWNER_ACTION_REQUIRED.md`、`deploy/verify-production.mjs`、`product/frontend_interface_contract.md`、`product/t009_release_and_privacy.md`、`app/QA.md`

## Done

### T-008 免费版 MVP 前端与服务编排实现

- 类型：开发/测试/设计
- 负责人：Work
- 状态：Done
- 开始日期：2026-09-12
- 完成日期：2026-09-13
- 前置：T-007 已完成；参考图、Logo 源文件和城市图片授权不阻塞结构与功能实现
- 工作文件：`app/`、`app/README.md`、`app/QA.md`
- 验收：已打通首页、两步输入、状态驱动推演、结果一、Top 3、城市详情和分享预览的移动端纵向切片；前端未复制底层算法；样板结果与城市内容均有醒目标识。
- 结果：完成零依赖 ES Modules 应用、移动优先设计系统落地、标准输入校验、可替换读取服务、1080 × 1440 SVG 分享卡和 9 项单元测试。390 × 844 浏览器走查覆盖全流程，控制台 0 error、无横向溢出、分享卡无出生资料。
- 边界：当前不是可公开发布的真实测算服务。BaZi / Matching 版本仍显示 `not-connected`；地点库、City Profile、Logo、城市图片和二维码均为受控样板或占位，须由 T-009 接入和审核。

### T-007 免费娱乐传播版 MVP 产品定义与接口整理

- 类型：产品/设计/接口
- 负责人：Chat/Work
- 状态：Done
- 开始日期：2026-09-11
- 完成日期：2026-09-12
- 前置：T-003 至 T-006 已完成；R2 已获批用于免费 MVP
- 工作文件：`product/PRD.md`、`product/user_flow.md`、`product/free_result_and_share_spec.md`、`product/city_profile_mvp.md`、`product/frontend_interface_contract.md`、`design/design_system.md`、`design/references/`
- 验收：品牌、首页、两步输入、真实状态推演、结果一、Top 3、城市详情、分享卡、免责声明、City Profile 字段、AI 边界和前端接口均形成可实施规格；参考图六类目录与使用/禁用原则已建立；未开发前端、付费版或新算法。
- 结果：正式品牌为“山河有应”；新增 D-020 至 D-023。免费版不显示个人五行百分比或独立当前阶段模块；Top 3 按真实分数排序并显示`契合指数 N`；City Profile 不改核心分数；分享卡默认不含出生资料。
- 未阻塞后续的待补：参考原图及许可、Logo 源文件、城市图片授权、部署与数据保留期限。以上不阻塞 T-008 结构和组件开发，但必须在视觉/上线验收前完成。

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
