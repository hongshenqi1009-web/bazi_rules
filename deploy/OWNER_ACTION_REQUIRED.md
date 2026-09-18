# T-009 Owner Action Required（2026-09-18）

本清单只列需要域名/云/AI 账户所有者完成的动作。不要把密钥、登录密码或付款资料粘贴到聊天、GitHub Issue 或仓库。完成每项后只反馈“已完成”、控制台名称及非敏感的公网 IP/记录截图；Work 再做实际核验。

## 0. 先核对域名订单：当前是最高优先级阻塞

2026-09-18 11:28 UTC，公开 Google DNS 对 `mydestinycity.com` 的 NS/A/AAAA/CNAME 查询均返回 `Status: 3`（NXDOMAIN），`.com` 注册局 RDAP `https://rdap.verisign.com/com/v1/domain/mydestinycity.com` 返回 404。**这与先前“已注册”的项目记录不一致**，不能据此断言订单一定失败，但在注册局可查询、DNS 已委派前无法签发证书或绑定域名。

请在购买域名的平台注册账户中：

1. 打开“域名 / My Domains / Domain Portfolio”，搜索完整拼写 `mydestinycity.com`，确认订单状态为 `Active / Registered`，而非购物车、待付款、待验证或退款；核对订单回执上的域名逐字相同。
2. 打开该域名的“Nameservers / DNS 服务器”，确认已有 2 个以上权威 NS；如显示“等待邮箱验证”，先完成验证。若域名列表不存在，联系注册商核对订单，不要自行购买一个拼写相近的域名。
3. 反馈：注册商名称、订单状态、权威 NS 名称和域名管理页截图（遮盖个人及付款资料）。**不要发送注册商密码。**

Work 随后会重新查询注册局 RDAP 和公网 DNS；只有从 NXDOMAIN 转为可委派域名，才继续 DNS 与证书验收。

## 1. 开通香港运行环境并提供可部署入口

当前环境没有香港云账号凭据、SSH 入口或 Docker；因此无法替你购买/创建服务器，也不能编造公网 IP。现有 Compose 为单机 Caddy + Node。若同时保留受控 staging 和 production，建议使用**两台独立的香港实例**：`shanhe-staging-hk` 和 `shanhe-prod-hk`；两份 Compose 都绑定 80/443，不能在同一台机器上原样并行启动。

可执行的阿里云 ECS 路径（若你使用其他云商，提供控制台名称与同等规格即可）：

1. 阿里云控制台 → **Elastic Compute Service / ECS** → **Instances** → **Create Instance**。
2. **Region** 选 **China (Hong Kong)**；镜像选受支持的 Ubuntu LTS（例如 24.04）；首发最低建议 2 vCPU / 4 GiB RAM / 40 GiB 系统盘。选择付款方式前由所有者确认实际报价。
3. **Assign Public IPv4 Address** 打开；不要只创建私网 IP。分别记下 production 与 staging 的 **Public IPv4**。
4. 安全组入站：TCP `80`、`443` 来源 `0.0.0.0/0`；TCP `22` 只允许你的管理 IP；不要向公网开放 `4173`。出站允许 DNS、HTTPS 与容器镜像/AI API 访问。
5. 在两台实例安装 Docker Engine 与 Compose 插件，使用仅有该仓库部署权限的 SSH 身份。不要把云主账号密码或 OpenAI key 交给 Work；可由所有者在服务器安全地配置，或使用受控的部署身份。

反馈：云商、地域、两台实例的非敏感公网 IPv4、SSH 部署方式是否已就绪。若只愿先支付一台，先建立 staging 并完成受控验收；production 仍不可标记为已部署。

## 2. 在权威 DNS 控制台逐项填写

域名注册/委派恢复后，进入**当前权威 DNS 服务商**的“DNS / 解析记录 / Public Zone → Add Record”。若在阿里云 DNS，路径为 **Public Zone → `mydestinycity.com` → Settings → Add Record**。阿里云免费 DNS 的最小 TTL 为 600 秒，因此本清单统一填写 `600`。

| Record type | Host / Name | Value / Target | TTL |
|---|---|---|---:|
| `A` | `@` | **第 1 项复制的 production 香港公网 IPv4**（实际数字，不能填占位文本） | `600` |
| `CNAME` | `www` | `mydestinycity.com.` | `600` |
| `A` | `staging` | **第 1 项复制的 staging 香港公网 IPv4**（实际数字） | `600` |

不要同时为 `www` 保留冲突的旧 A/AAAA/CNAME；当前没有真实 IPv6 时不要新增 `AAAA`。若 DNS 控制台不接受末尾句点，`www` 的 Value 填 `mydestinycity.com`。Caddy 负责 `www` → 根域名 308 和 HTTP → HTTPS，DNS 本身不做网页跳转。**目前缺少真实公网 IPv4，不能安全地提供一个虚构的 Value。**

## 3. 生产 AI 项目、模型与密钥

1. 打开 [OpenAI Platform](https://platform.openai.com/) → 选择用于该产品的 **Project** → **Billing / Limits**，确认 API 账单可用并设置费用提醒/限额。
2. 进入 **API keys**，创建仅供服务端使用、可轮换的项目密钥；不要放入前端、GitHub 或聊天。将密钥以服务器私有环境变量/密钥管理服务注入 `OPENAI_API_KEY`。
3. 设置 `OPENAI_CONTENT_MODEL`。当前技术验收建议先用 `gpt-5.6-luna`，因为官方列明支持 Responses 与 Structured Outputs；**模型是否达标仍以 8 城真实文案验收为准**。如果生产项目已选定其他模型，填真实模型 ID 并据其官方价格记录成本，不要在代码中伪装成 Luna。
4. staging 与 production 尽量使用不同 API Project/密钥与费用限额。完成后仅反馈“密钥已在香港服务器配置”和模型 ID，**不要回传密钥本身**。

当前 AI 行为：每城一次 Responses 请求，`store:false`、`background:false`、最多 850 输出 token、超时 18 秒、**自动重试 0 次**；429/5xx/超时允许用户手动单城重试，401/403 或未配置不提供无效重试。失败只隐藏详情三段文案，真实 Top 3、指数与标签仍在，不回退 demo。`service/scripts/smoke-ai.mjs` 会输出每城真实 token、三段文案及按所填费率估算的费用。以 2026-09-18 官方 Luna 标价（输入 $0.20/百万 token、输出 $1.20/百万 token）举例，若单城实际使用 1,000 输入 + 500 输出 token，约 **$0.0008/城**；这是示例，不是已发生的生产调用成本。

## 4. 品牌与法律验收（只需明确确认或指出需重做项）

请在仓库 `design/assets/` 查看三张 8 城裁切总览，以及 `app/assets/brand/logo-full.svg`、`logo-symbol.svg` 与 `og-city.jpg`。逐张确认：城市地标/真实城市辨识度、移动裁切、榜单/详情/分享图、品牌颜色与是否允许公开商用。需要更换的城市请逐名指出；未确认项目仍为 candidate，不进入“正式素材验收通过”。

图像是项目从零生成的城市意象，不是授权摄影作品或地理事实证据；Logo 是仓库内的原创 SVG。未使用外部图片，但所有者仍须核对其实际生成账户适用条款、可能的商标/地标问题、公开 AI 素材披露及发布法域要求。官方服务条款把输出使用与第三方权利分开；不能把“AI 生成”自动等同于“无任何法律风险”。

请同时确认公开隐私说明/娱乐免责声明与实际部署日志政策，尤其不得记录请求体中的出生资料。若需要法律意见，请由熟悉发布法域的专业人员审查。

## 5. 真机网络验收安排

只有正式域名与 TLS 正常后才能执行。请安排至少：海外网络 iPhone Safari、海外网络 Android Chrome、中国大陆移动/联通/电信网络的真实设备。可以由你或受托测试者执行；不要上传测试者真实出生资料。每台使用合成测试输入，按 `app/QA.md` 的完整项目逐项记录：设备/系统/浏览器/运营商/城市/时间、首屏、地点搜索、提交、真实计算、Top 3、详情、AI、分享卡、二维码、字体/图片、HTTPS、横向溢出、控制台错误、弱网/AI 失败提示。

**无法实际覆盖大陆三网时，在 QA 中逐项保持“未验收”；VPN、模拟器、桌面浏览器不冒充当地真机。**

## Work 收到动作完成通知后的继续验证

1. 在实际香港环境启动 staging / production Compose，核对 `/healthz`、容器健康、证书续期及服务端错误日志不含出生输入。
2. 执行 `node deploy/verify-production.mjs --full-chain`；该脚本核验 DNS、TLS、308、canonical/OG、资源 MIME、二维码以及合成出生输入的真实计算链。
3. 在生产容器执行 `node service/scripts/smoke-ai.mjs`，逐城核对 8 个 City Profile 的文案与真实 token/费用；注入故障测试只在受控环境做，不向真实用户伪造文案。
4. 整理设备/网络报告。只有所有必需闸门通过后才把 T-009 改为 Done。
