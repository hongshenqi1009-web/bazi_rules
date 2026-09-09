# WORKFLOW：Chat → Work → GitHub → Chat

## 1. 原则

- GitHub 是唯一正式项目记忆；聊天摘要和 Work 临时目录均可丢失或过时。
- 先读后做、完成必回写、决策必留痕。
- 事实、候选、假设和已确认结论必须明确区分。
- 未经 Chat 审核，不得改变正式命理算法口径。

## 2. Chat：讨论、决策、派工

Chat 负责：

1. 从 GitHub 读取最新 `PROJECT_STATUS.md`、`TASKS.md`、`DECISIONS.md`；
2. 讨论产品方向、取舍、验收标准和风险；
3. 将明确任务写成包含目标、范围、输入、输出、验收和禁区的 Work 指令；
4. 审核 Work 提交的证据与变更；
5. 明确批准后，才把候选结论升级为正式规则或产品决策。

Chat 不应仅凭旧聊天记忆宣称项目当前状态。

## 3. Work：任务开始协议

Work 每次开始必须按顺序读取：

1. `PROJECT_STATUS.md`；
2. `TASKS.md`；
3. `WORKFLOW.md` 与根目录 `AGENTS.md`；
4. 与任务相关的领域文件；
5. 必要时读取 `DECISIONS.md` 确认不可违背的既有决策。

随后必须：

- 核对任务是否仍有效、是否已有其他进行中成果；
- 把目标任务移入 `In Progress`；
- 若范围或决策不清会改变结果，停止并在状态文件记录阻塞，交回 Chat 决定；
- 不以“研究方便”为由擅自扩大正式规则范围。

## 4. Work：执行与证据

- 研究结果写入研究/审计文件，必须标明来源、日期、版本、方法和限制。
- 开发与测试必须引用对应需求、决策和任务 ID。
- 临时笔记可放 Work 环境，但不能作为最终交付。
- 正式命理规则只接受 Chat 已明确批准的内容；未批准内容保留在候选层。

## 5. Work：任务完成协议

任务完成前，Work 必须在同一次提交中更新：

1. 对应的正式文件或研究文件；
2. `PROJECT_STATUS.md`；
3. `TASKS.md`；
4. 如有经确认的新决策，再更新 `DECISIONS.md`；
5. 如文件导航或使用方式变化，再更新 `README.md`。

提交说明建议包含任务 ID，例如：`T-002: audit candidate bazi libraries`。

完成定义：成果已写入 GitHub、状态已同步、任务有验收结果和关联文件；只在 Work 聊天中说“完成”不算完成。

## 6. GitHub：持久化与审核

- 每次提交应聚焦一个任务或一组不可分割的变更。
- 不覆盖无关改动；出现冲突时先保留双方内容并交回 Chat 判断。
- 候选研究与正式规则分文件保存。
- 如果采用 Pull Request，PR 描述应列出任务 ID、改动文件、验证结果、未决问题和是否触及正式算法。

## 7. Chat：回读与审核

Work 提交后，Chat 必须从 GitHub 重新读取状态文件和变更涉及的领域文件，再输出：

- 当前阶段；
- 本轮已完成及证据；
- 未完成/阻塞；
- 对正式规则或产品范围的影响；
- 需要用户决定的事项；
- 建议的下一条 Work 指令。

若仓库与旧聊天说法冲突，以仓库最新提交为准；发现仓库内部矛盾时，不自行猜测，应提出明确修复建议。

## 8. 可复制提示词

### 给 Work

> 先读取 `hongshenqi1009-web/bazi_rules` 的 `PROJECT_STATUS.md`、`TASKS.md`、`WORKFLOW.md`、`AGENTS.md` 和本任务相关文件。执行任务前把对应任务标为 In Progress。完成后更新成果文件、`PROJECT_STATUS.md`、`TASKS.md`；只有产生经 Chat 已确认的新决策时才更新 `DECISIONS.md`。未经明确批准，不要改动 `knowledge/bazi_rules_v1.md` 中的正式命理算法结论。提交后汇报文件、验证结果、提交链接和待审核事项。

### 给 Chat

> 读取 GitHub 仓库 `hongshenqi1009-web/bazi_rules` 的最新 `PROJECT_STATUS.md`、`TASKS.md`、`DECISIONS.md` 以及本轮变更相关文件。以 GitHub 为准总结当前状态，区分已确认、候选、假设和阻塞；不要用旧聊天内容覆盖最新提交。

