# 五行城市（bazi_rules）

本仓库是“五行城市”项目的**单一事实来源（Single Source of Truth）**，保存经确认的项目状态、决策、任务、命理规则、城市方法、产品方案、数据与设计规范。聊天记录和 Work 临时输出都不是正式版本；只有合并到本仓库的内容才算项目记忆。

## 三端分工

- **当前 Chat**：产品讨论、策略、决策、审核；不以聊天记录代替仓库文件。
- **“五行城市产品工作空间” Work**：研究、批量任务、开发、测试；按本仓库状态执行并回写结果。
- **GitHub `hongshenqi1009-web/bazi_rules`**：单一事实来源和持久项目记忆。

标准闭环：`Chat 决策/派工 → Work 读取仓库并执行 → Work 更新并提交 GitHub → Chat 重新读取 GitHub 后审核/决策`。

## 每次从这里开始

1. 先读 [`PROJECT_STATUS.md`](PROJECT_STATUS.md) 获取当前阶段、最近完成和下一步。
2. 再读 [`TASKS.md`](TASKS.md) 确认 Backlog、In Progress、Done 和验收条件。
3. 如需理解决策依据，读 [`DECISIONS.md`](DECISIONS.md)。
4. 执行者必须遵守 [`WORKFLOW.md`](WORKFLOW.md) 和 [`AGENTS.md`](AGENTS.md)。

## 文件导航

- `knowledge/bazi_rules_v1.md`：**仅收录已确认的正式命理算法口径**；未确认内容不得写成结论。
- `knowledge/github_bazi_audit.md`：外部代码/算法候选的审计记录，不自动升级为正式规则。
- `knowledge/city_element_methodology.md`：城市五行方法论、证据和版本规范。
- `knowledge/matching_engine_methodology.md`：个人需要向量、城市匹配、指数标定、大运/方位修正及覆盖审计。
- `knowledge/matching_manual_regression.md`：T-005 的 15 例人工命盘回归、分层问题归因与参数锁定结论。
- `product/PRD.md`：产品范围、目标和验收框架。
- `product/user_flow.md`：用户流程框架。
- `product/monetisation.md`：商业化假设与验证框架。
- `data/cities.csv`：城市数据结构。
- `data/test_cases.json`：可重复验证的测试案例。
- `data/matching_simulation_results.json`：T-005 三种匹配方法、3,000 组模拟和全部 100 城推荐次数。
- `data/matching_manual_regression_cases.json`：15 个构造命盘案例的完整解释、需要向量、区间、大运前后、Top 10、Top 3 解释、冲突及辅助方案。
- `analysis/t005_matching_simulation.py`：T-005 可重复模拟与集中度审计程序，不是前端应用代码。
- `analysis/t005_manual_chart_regression.py`：人工案例匹配回归程序；`analysis/t005_verify_manual_case_pillars.js` 用锁定候选库复算四柱。
- `design/design_system.md`：视觉与文案规范。

## 状态标签

- `已确认`：已经 Chat 审核，可进入正式文件。
- `候选/待审核`：可以研究、比较和测试，但不得作为正式结论。
- `假设`：产品或商业假设，需验证。
- `阻塞`：缺少明确决策、证据或外部条件。

## Chat 端读取最新状态

在 ChatGPT 中连接并授权 GitHub 仓库后，使用如下提示：

> 读取 GitHub 仓库 `hongshenqi1009-web/bazi_rules` 的最新 `PROJECT_STATUS.md`、`TASKS.md` 和 `DECISIONS.md`。先告诉我当前阶段、最近完成、进行中、下一步和待我决定事项；如涉及某个领域，再读取对应正式文件。不要使用旧聊天内容覆盖仓库最新版本。

仓库刚创建或刚提交后若暂时搜不到，稍候再试，并确认 GitHub 连接已授权该仓库。

## 当前边界

当前已完成 T-004 城市自然模型及 T-005 设计、模拟与人工案例回归。T-005 的五档结构、大运和方位闸门可保留，但数值锚点、preferred ranges、强忌过量曲线和指数标定尚未通过锁定。仓库暂不开发前端、不扩展商业化，也不把候选匹配参数写成正式命理规则；具体状态以 `PROJECT_STATUS.md` 与 `TASKS.md` 为准。
